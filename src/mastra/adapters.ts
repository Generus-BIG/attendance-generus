import { handleChatStream } from '@mastra/ai-sdk'
import { RequestContext } from '@mastra/core/request-context'
import { createClient } from '@supabase/supabase-js'
import { createUIMessageStreamResponse } from 'ai'
import {
  type AssistantChatRequest,
  type AssistantRequestContext,
  normalizeHistory,
} from './http.js'
import { getConversationStorage } from './storage.js'

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

const retryableAuthError = (error: unknown) => {
  if (!(error instanceof Error)) return false
  const code = String((error as Error & { code?: unknown }).code ?? '')
  const status = String((error as Error & { status?: unknown }).status ?? '')
  const cause = (
    error as Error & { cause?: { code?: unknown; message?: string } }
  ).cause
  return /ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|fetch failed|timeout|AuthRetryableFetchError/i.test(
    `${code} ${status} ${error.name} ${error.message} ${cause?.code ?? ''} ${cause?.message ?? ''}`
  )
}

export async function retryAuthRequest<T>(
  operation: (signal: AbortSignal) => Promise<T>,
  options: {
    delayMs?: number
    signal?: AbortSignal
    delays?: readonly number[]
  } = {}
) {
  // ponytail: bounded two retries/exponential backoff only; add jitter only if concurrent auth storms are measured.
  const delays = options.delays ?? [
    options.delayMs ?? 200,
    (options.delayMs ?? 200) * 2,
  ]
  let attempt = 0
  for (;;) {
    const controller = new AbortController()
    const aborted = () => controller.abort()
    options.signal?.addEventListener('abort', aborted, { once: true })
    try {
      const result = await operation(controller.signal)
      options.signal?.removeEventListener('abort', aborted)
      return result
    } catch (error) {
      options.signal?.removeEventListener('abort', aborted)
      const retryable =
        !options.signal?.aborted &&
        retryableAuthError(error) &&
        attempt < delays.length
      if (!retryable) throw error
      await new Promise<void>((resolve, reject) => {
        const abort = () => {
          clearTimeout(timeout)
          reject(new DOMException('Aborted', 'AbortError'))
        }
        const timeout = setTimeout(() => {
          options.signal?.removeEventListener('abort', abort)
          resolve()
        }, delays[attempt])
        options.signal?.addEventListener('abort', abort, { once: true })
      })
      attempt++
    }
  }
}

export async function authenticate(token: string) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  // ponytail: retry only DNS/network transport; real invalid-token replies are returned immediately.
  const { data, error } = await retryAuthRequest(
    async (_signal) => {
      const response = await client.auth.getUser(token)
      if (response.error && retryableAuthError(response.error))
        throw response.error
      return response
    },
    { delayMs: 300 }
  )
  if (error || !data.user) return null
  const role = (data.user.app_metadata as { role?: string })?.role ?? ''
  return { id: data.user.id, role }
}

export const conversationAdapter = (
  operation: string,
  input: Record<string, unknown>,
  context: AssistantRequestContext
) => getConversationStorage().conversations(operation, input, context)

export async function streamAdapter(
  body: AssistantChatRequest,
  context: AssistantRequestContext,
  signal: AbortSignal
) {
  const prompt = body.messages[0].parts
    .filter((part) => part.type === 'text')
    .map((part) => part.text)
    .join('\n')
  const storage = getConversationStorage()
  const run = await storage.beginRun(
    {
      threadId: body.threadId,
      runId: body.runId,
      messageId: body.messages[0].id,
      prompt,
      workspace: context.workspace,
      modelId: context.modelId,
    },
    context
  )
  const abort = () => run.controller.abort()
  signal.addEventListener('abort', abort, { once: true })
  let finished = false
  const finish = async (status: 'saved' | 'cancelled' | 'failed') => {
    if (finished) return
    finished = true
    signal.removeEventListener('abort', abort)
    await storage.finishRun(run, status)
  }
  try {
    const { mastra } = await import('./index.js')
    const stream = await handleChatStream({
      mastra,
      agentId: 'assistant',
      version: 'v7',
      params: {
        messages: normalizeHistory(body.messages),
        memory: { thread: run.threadId, resource: context.userId },
        requestContext: new RequestContext(
          Object.entries({
            ...context,
            threadId: run.threadId,
            runId: run.runId,
          })
        ),
        abortSignal: run.controller.signal,
        maxSteps: 10,
      },
      messageMetadata: () => ({ modelId: context.modelId, runId: run.runId }),
      onError: () => 'PROVIDER_ERROR',
    })
    const reader = stream.getReader()
    const guarded = new ReadableStream({
      async pull(controller) {
        try {
          const { done, value } = await reader.read()
          if (done) {
            await finish(run.controller.signal.aborted ? 'cancelled' : 'saved')
            controller.close()
          } else controller.enqueue(value)
        } catch (error) {
          await finish(run.controller.signal.aborted ? 'cancelled' : 'failed')
          controller.error(error)
        }
      },
      async cancel(reason) {
        run.controller.abort()
        try {
          await reader.cancel(reason)
        } finally {
          await finish('cancelled')
        }
      },
    })
    return createUIMessageStreamResponse({
      // Nominal skew only: @mastra/ai-sdk 1.10.1 vendors a v7 chunk snapshot
      // whose finish reason includes 'unknown'; the runtime stream is identical.
      stream: guarded as unknown as ReadableStream<import('ai').UIMessageChunk>,
      headers: {
        'x-assistant-thread-id': run.threadId,
        'x-assistant-run-id': run.runId,
      },
    })
  } catch (error) {
    await finish(run.controller.signal.aborted ? 'cancelled' : 'failed')
    throw error
  }
}
