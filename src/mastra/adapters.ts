import { handleChatStream } from '@mastra/ai-sdk'
import { RequestContext } from '@mastra/core/request-context'
import { createClient } from '@supabase/supabase-js'
import { createUIMessageStreamResponse } from 'ai'
import {
  type AssistantChatRequest,
  type AssistantRequestContext,
  normalizeHistory,
} from './http'

const supabaseUrl =
  process.env.SUPABASE_URL ?? process.env.VITE_SUPABASE_URL ?? ''
const supabaseKey =
  process.env.SUPABASE_ANON_KEY ?? process.env.VITE_SUPABASE_ANON_KEY ?? ''

export async function authenticate(token: string) {
  const client = createClient(supabaseUrl, supabaseKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
  })
  const { data, error } = await client.auth.getUser(token)
  if (error || !data.user) return null
  const role = (data.user.app_metadata as { role?: string })?.role ?? ''
  return { id: data.user.id, role }
}

export async function streamAdapter(
  body: AssistantChatRequest,
  context: AssistantRequestContext,
  signal: AbortSignal
) {
  const { mastra } = await import('./index')
  const stream = await handleChatStream({
    mastra,
    agentId: 'assistant',
    version: 'v7',
    params: {
      messages: normalizeHistory(body.messages),
      requestContext: new RequestContext(Object.entries(context)),
      abortSignal: signal,
      maxSteps: 10,
    },
    messageMetadata: () => ({ modelId: context.modelId }),
    onError: () => 'PROVIDER_ERROR',
  })
  return createUIMessageStreamResponse({
    // Nominal skew only: @mastra/ai-sdk 1.10.1 vendors a v7 chunk snapshot
    // whose finish reason includes 'unknown'; the runtime stream is identical.
    stream: stream as unknown as ReadableStream<import('ai').UIMessageChunk>,
  })
}
