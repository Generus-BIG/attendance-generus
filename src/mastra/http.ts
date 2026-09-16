import { z } from 'zod'

const textPart = z
  .object({
    type: z.literal('text'),
    text: z.string().max(16000),
    state: z.enum(['streaming', 'done']).optional(),
  })
  .strict()
  .catchall(z.unknown())
const toolPart = z
  .object({
    type: z.string().regex(/^(tool-|dynamic-tool)/),
    toolCallId: z.string().min(1).max(128),
    toolName: z.string().min(1).max(128),
    input: z.record(z.string(), z.unknown()).optional(),
    output: z.unknown().optional(),
    errorText: z.string().max(2000).optional(),
    state: z
      .enum([
        'input-streaming',
        'input-available',
        'approval-requested',
        'approval-responded',
        'output-available',
        'output-error',
        'output-denied',
      ])
      .optional(),
  })
  .strict()
  .catchall(z.unknown())
const messageSchema = z
  .object({
    id: z.string().min(1).max(128),
    role: z.enum(['user', 'assistant']),
    metadata: z.unknown().optional(),
    parts: z
      .array(z.union([textPart, toolPart, z.looseObject({})]))
      .min(1)
      .max(20),
  })
  .strict()
  .catchall(z.unknown())
const requestSchema = z
  .object({
    id: z.string().min(1).max(128).optional(),
    threadId: z.string().min(1).max(128).optional(),
    runId: z.string().min(1).max(128).optional(),
    workspace: z.enum(['absensi', 'lupg']),
    modelId: z.string().min(1).max(64),
    messages: z.array(messageSchema).min(1).max(100),
  })
  .strict()
  .refine(
    (body) => body.messages[body.messages.length - 1]?.role === 'user',
    'A user prompt is required'
  )
export type AssistantChatRequest = z.infer<typeof requestSchema>
export type AssistantRequestContext = {
  userId: string
  role: 'super_admin' | 'admin'
  accessToken: string
  workspace: 'absensi' | 'lupg'
  modelId: string
}

// Normalizes validated browser history to AI SDK v7 UI messages: text parts
// pass through, assistant tool activity becomes dynamic-tool parts (the tool
// result itself is re-derived server-side), other metadata is dropped.
// Unknown part kinds are dropped; messages left empty are dropped by the
// caller contract (last message is always a user text prompt).
export function normalizeHistory(messages: AssistantChatRequest['messages']) {
  type NormalizedPart =
    | { type: 'text'; text: string }
    | {
        type: 'dynamic-tool'
        toolName: string
        toolCallId: string
        state: 'input-available'
        input: Record<string, unknown>
      }
    | {
        type: 'dynamic-tool'
        toolName: string
        toolCallId: string
        state: 'output-available'
        input: Record<string, unknown>
        output: unknown
      }
    | {
        type: 'dynamic-tool'
        toolName: string
        toolCallId: string
        state: 'output-error'
        input: Record<string, unknown>
        errorText: string
      }
  return messages
    .map((message) => ({
      id: message.id,
      role: message.role as 'user' | 'assistant',
      parts: message.parts.flatMap((part): NormalizedPart[] => {
        if ('text' in part && part.type === 'text')
          return [{ type: 'text' as const, text: part.text as string }]
        const tool = part as {
          type?: string
          toolName?: string
          toolCallId?: string
          input?: Record<string, unknown>
          output?: unknown
          errorText?: string
          state?: string
        }
        if (typeof tool.toolName !== 'string' || !tool.toolName) return []
        if (typeof tool.toolCallId !== 'string' || !tool.toolCallId) return []
        if (tool.state === 'output-error' || tool.errorText !== undefined)
          return [
            {
              type: 'dynamic-tool' as const,
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              state: 'output-error' as const,
              input: tool.input ?? {},
              errorText: tool.errorText ?? 'Tool failed',
            },
          ]
        if (tool.state === 'output-available' || tool.output !== undefined)
          return [
            {
              type: 'dynamic-tool' as const,
              toolName: tool.toolName,
              toolCallId: tool.toolCallId,
              state: 'output-available' as const,
              input: tool.input ?? {},
              output: tool.output ?? null,
            },
          ]
        return [
          {
            type: 'dynamic-tool' as const,
            toolName: tool.toolName,
            toolCallId: tool.toolCallId,
            state: 'input-available' as const,
            input: tool.input ?? {},
          },
        ]
      }),
    }))
    .filter((message) => message.parts.length > 0)
}
export type AssistantModelOption = {
  id: string
  label: string
  enabled: boolean
  disabledReason?: string
}
type Adapters = {
  authenticate: (token: string) => Promise<{ id: string; role: string } | null>
  models: readonly AssistantModelOption[]
  conversations?: (
    operation: string,
    input: Record<string, unknown>,
    context: AssistantRequestContext
  ) => Promise<unknown>
  stream: (
    body: AssistantChatRequest,
    context: AssistantRequestContext,
    signal: AbortSignal
  ) => Promise<Response>
}
const messages = {
  UNAUTHORIZED: ['Please sign in again.', 'Silakan masuk kembali.'],
  FORBIDDEN: [
    'Administrator access is required.',
    'Akses administrator diperlukan.',
  ],
  INVALID_REQUEST: [
    'Invalid assistant request.',
    'Permintaan asisten tidak valid.',
  ],
  MODEL_UNAVAILABLE: [
    'This model is unavailable. Select another model.',
    'Model tidak tersedia. Pilih model lain.',
  ],
  PROVIDER_ERROR: [
    'The model could not respond. Please retry.',
    'Model belum dapat merespons. Silakan coba lagi.',
  ],
  CANCELLED: ['Response cancelled.', 'Respons dibatalkan.'],
  PAYLOAD_TOO_LARGE: [
    'The conversation is too long.',
    'Percakapan terlalu panjang.',
  ],
  METHOD_NOT_ALLOWED: ['Method not allowed.', 'Metode tidak diizinkan.'],
  UNSUPPORTED_MEDIA_TYPE: ['Send JSON content.', 'Kirim konten JSON.'],
  NOT_FOUND: ['Not found.', 'Tidak ditemukan.'],
  STORAGE_UNAVAILABLE: [
    'Conversation storage is unavailable.',
    'Penyimpanan percakapan tidak tersedia.',
  ],
} as const
const BODY_LIMIT = 256 * 1024

export async function handleAssistantRequest(
  request: Request,
  adapters: Adapters
): Promise<Response> {
  const english = request.headers.get('accept-language')?.startsWith('en')
  const fail = (status: number, code: keyof typeof messages) =>
    Response.json(
      { code, message: messages[code][english ? 0 : 1] },
      { status, headers: { 'cache-control': 'no-store' } }
    )
  // ponytail: one coarse availability map; split codes only when clients need finer retry distinctions.
  const storageUnavailable = (error: unknown) => {
    if (!(error instanceof Error)) return false
    const cause = (
      error as Error & { cause?: { code?: unknown; message?: string } }
    ).cause
    return /ASSISTANT_STORAGE_MISSING|ENOTFOUND|EAI_AGAIN|ECONN|ETIMEDOUT|fetch failed|timeout|too many clients|57P01|57P03|53300/i.test(
      `${(error as Error & { code?: unknown }).code ?? ''} ${error.message} ${cause?.code ?? ''} ${cause?.message ?? ''}`
    )
  }
  const conversationFailure = (error: unknown) => {
    if (!(error instanceof Error)) return fail(503, 'STORAGE_UNAVAILABLE')
    if (error.message === 'NOT_FOUND') return fail(404, 'NOT_FOUND')
    if (error.message === 'FORBIDDEN') return fail(403, 'FORBIDDEN')
    if (error.message === 'DUPLICATE') return fail(409, 'INVALID_REQUEST')
    if (error.message === 'INVALID_REQUEST') return fail(400, 'INVALID_REQUEST')
    if (error.message === 'CANCELLED') return fail(499, 'CANCELLED')
    return fail(503, 'STORAGE_UNAVAILABLE')
  }
  // Accepts both /api/assistant/* (Vercel + direct) and /assistant/*
  // (Mastra dev server mount, after the Vite proxy rewrite).
  const url = new URL(request.url)
  const suffix = url.pathname.replace(/^\/(api\/assistant|assistant)/, '')
  const threadMatch = /^\/threads\/([^/]+)$/.exec(suffix)
  const messagesMatch = /^\/threads\/([^/]+)\/messages$/.exec(suffix)
  const messageMatch = /^\/threads\/([^/]+)\/messages\/([^/]+)$/.exec(suffix)
  const cancelMatch = /^\/runs\/([^/]+)\/cancel$/.exec(suffix)
  const route =
    suffix === '/models'
      ? 'models'
      : suffix === '/chat'
        ? 'chat'
        : suffix === '/threads'
          ? 'listThreads'
          : messagesMatch
            ? 'listMessages'
            : messageMatch
              ? 'deleteMessage'
              : cancelMatch
                ? 'cancelRun'
                : threadMatch && request.method === 'PATCH'
                  ? 'renameThread'
                  : threadMatch && request.method === 'DELETE'
                    ? 'deleteThread'
                    : undefined
  if (!route) return fail(404, 'NOT_FOUND')
  const method =
    route === 'models' || route === 'listThreads' || route === 'listMessages'
      ? 'GET'
      : route === 'renameThread'
        ? 'PATCH'
        : route === 'deleteThread' || route === 'deleteMessage'
          ? 'DELETE'
          : 'POST'
  if (request.method !== method) return fail(405, 'METHOD_NOT_ALLOWED')
  const token = /^Bearer ([^\s]+)$/i.exec(
    request.headers.get('authorization') ?? ''
  )?.[1]
  if (!token) return fail(401, 'UNAUTHORIZED')
  let user
  try {
    user = await adapters.authenticate(token)
  } catch (error) {
    return storageUnavailable(error)
      ? fail(503, 'STORAGE_UNAVAILABLE')
      : fail(401, 'UNAUTHORIZED')
  }
  if (!user) return fail(401, 'UNAUTHORIZED')
  if (user.role !== 'admin' && user.role !== 'super_admin')
    return fail(403, 'FORBIDDEN')
  const context = {
    userId: user.id,
    role: user.role as AssistantRequestContext['role'],
    accessToken: token,
    workspace: 'absensi' as const,
    modelId: '',
  }
  if (route === 'models')
    return Response.json(
      {
        models: adapters.models.map(
          ({ id, label, enabled, disabledReason }) => ({
            id,
            label,
            enabled,
            ...(disabledReason ? { disabledReason } : {}),
          })
        ),
      },
      { headers: { 'cache-control': 'no-store' } }
    )
  if (route === 'listThreads' || route === 'listMessages') {
    if (!adapters.conversations) return fail(404, 'NOT_FOUND')
    try {
      const before = url.searchParams.get('before') ?? undefined
      const page = Number(url.searchParams.get('page') ?? 0)
      if (!Number.isInteger(page) || page < 0)
        return fail(400, 'INVALID_REQUEST')
      const workspace = url.searchParams.get('workspace')
      if (workspace !== 'absensi' && workspace !== 'lupg')
        return fail(400, 'INVALID_REQUEST')
      return Response.json(
        await adapters.conversations(
          route,
          {
            ...(messagesMatch
              ? {
                  threadId: decodeURIComponent(messagesMatch[1]),
                  workspace: url.searchParams.get('workspace') ?? undefined,
                }
              : {}),
            ...(route === 'listThreads' ? { workspace } : {}),
            ...(before ? { before } : {}),
            page,
          },
          context
        ),
        { headers: { 'cache-control': 'no-store' } }
      )
    } catch (error) {
      return conversationFailure(error)
    }
  }
  if (
    method !== 'DELETE' &&
    request.headers.get('content-type')?.split(';')[0].trim() !==
      'application/json'
  )
    return fail(415, 'UNSUPPORTED_MEDIA_TYPE')
  if (Number(request.headers.get('content-length')) > BODY_LIMIT)
    return fail(413, 'PAYLOAD_TOO_LARGE')
  let rawBody: unknown = {}
  try {
    if (method === 'DELETE') {
      rawBody = {}
    } else {
      const reader = request.body?.getReader()
      if (!reader) return fail(400, 'INVALID_REQUEST')
      const chunks: Uint8Array[] = []
      let size = 0
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        size += value.byteLength
        if (size > BODY_LIMIT) {
          await reader.cancel()
          return fail(413, 'PAYLOAD_TOO_LARGE')
        }
        chunks.push(value)
      }
      const bytes = new Uint8Array(size)
      let offset = 0
      for (const chunk of chunks) {
        bytes.set(chunk, offset)
        offset += chunk.length
      }
      rawBody = JSON.parse(
        new TextDecoder('utf-8', { fatal: true }).decode(bytes)
      )
    }
  } catch {
    return fail(
      request.signal.aborted ? 499 : 400,
      request.signal.aborted ? 'CANCELLED' : 'INVALID_REQUEST'
    )
  }
  if (route !== 'chat') {
    if (!adapters.conversations) return fail(404, 'NOT_FOUND')
    try {
      const title =
        route === 'renameThread'
          ? z.object({ title: z.string().trim().min(1).max(80) }).parse(rawBody)
              .title
          : undefined
      const workspace = url.searchParams.get('workspace')
      if (
        route !== 'cancelRun' &&
        workspace !== 'absensi' &&
        workspace !== 'lupg'
      )
        return fail(400, 'INVALID_REQUEST')
      const input = {
        ...(threadMatch
          ? {
              threadId: decodeURIComponent(threadMatch[1]),
              workspace,
            }
          : {}),
        ...(messageMatch
          ? {
              threadId: decodeURIComponent(messageMatch[1]),
              messageId: decodeURIComponent(messageMatch[2]),
              workspace,
            }
          : {}),
        ...(cancelMatch ? { runId: decodeURIComponent(cancelMatch[1]) } : {}),
        ...(title ? { title } : {}),
      }
      return Response.json(
        await adapters.conversations(route, input, context),
        {
          headers: { 'cache-control': 'no-store' },
        }
      )
    } catch (error) {
      return conversationFailure(error)
    }
  }
  let body: AssistantChatRequest
  try {
    body = requestSchema
      .catchall(z.unknown())
      .transform(({ id, threadId, runId, workspace, modelId, messages }) => ({
        threadId: threadId ?? id,
        runId,
        workspace,
        modelId,
        messages: [messages[messages.length - 1]],
      }))
      .parse(rawBody)
  } catch {
    return fail(400, 'INVALID_REQUEST')
  }
  const model = adapters.models.find((option) => option.id === body.modelId)
  if (!model) return fail(400, 'INVALID_REQUEST')
  if (!model.enabled) return fail(409, 'MODEL_UNAVAILABLE')
  if (request.signal.aborted) return fail(499, 'CANCELLED')
  try {
    return await adapters.stream(
      body,
      {
        userId: user.id,
        role: user.role,
        accessToken: token,
        workspace: body.workspace,
        modelId: model.id,
      },
      request.signal
    )
  } catch (error) {
    if (storageUnavailable(error)) return fail(503, 'STORAGE_UNAVAILABLE')
    return fail(
      request.signal.aborted ? 499 : 502,
      request.signal.aborted ? 'CANCELLED' : 'PROVIDER_ERROR'
    )
  }
}
