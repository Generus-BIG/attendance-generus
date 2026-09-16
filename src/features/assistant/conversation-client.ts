import type { UIMessage } from 'ai'

export type AssistantWorkspace = 'absensi' | 'lupg'

export type AssistantThread = {
  id: string
  title: string
  workspace: AssistantWorkspace
  updatedAt: string
}

export type AssistantHistory = {
  messages: UIMessage[]
  hasEarlier: boolean
  nextCursor?: string
}

export const ASSISTANT_THREAD_TITLE_MAX = 80

export function prepareAssistantChatRequest(
  rawBody: BodyInit | null | undefined,
  context: {
    threadId: string
    runId: string
    workspace: AssistantWorkspace
    modelId: string
  }
) {
  const body = JSON.parse(String(rawBody ?? '{}')) as { messages?: unknown[] }
  return {
    ...body,
    messages: body.messages?.slice(-1),
    threadId: context.threadId,
    runId: context.runId,
    workspace: context.workspace,
    model: context.modelId,
    modelId: context.modelId,
  }
}

export function mergeAssistantHistory(
  earlier: UIMessage[],
  current: UIMessage[]
) {
  return [
    ...new Map(
      [...earlier, ...current].map((item) => [item.id, item])
    ).values(),
  ]
}

export function assistantApiPath(...segments: string[]) {
  return `/api/assistant/${segments.map(encodeURIComponent).join('/')}`
}

async function assistantApiFetch<T>(
  path: string,
  accessToken: string | null,
  init: RequestInit = {}
): Promise<T> {
  const response = await fetch(path, {
    ...init,
    headers: {
      ...(init.headers ?? {}),
      authorization: `Bearer ${accessToken ?? ''}`,
      'content-type': 'application/json',
    },
  })
  if (!response.ok) {
    const error = new Error(
      (await response.text()) || `ASSISTANT_${response.status}`
    ) as Error & { status: number }
    error.status = response.status
    throw error
  }
  return (await response.json()) as T
}

export const listAssistantThreads = (
  token: string | null,
  workspace: AssistantWorkspace
) =>
  assistantApiFetch<{ threads: AssistantThread[] }>(
    `${assistantApiPath('threads')}?workspace=${workspace}&limit=20`,
    token
  )

export const getAssistantHistory = (
  token: string | null,
  threadId: string,
  workspace: AssistantWorkspace,
  before?: string
) =>
  assistantApiFetch<AssistantHistory>(
    `${assistantApiPath('threads', threadId, 'messages')}?workspace=${workspace}&limit=20${before ? `&before=${encodeURIComponent(before)}` : ''}`,
    token
  )

export const renameAssistantThread = (
  token: string | null,
  threadId: string,
  workspace: AssistantWorkspace,
  title: string
) =>
  assistantApiFetch<{ thread: AssistantThread }>(
    `${assistantApiPath('threads', threadId)}?workspace=${workspace}`,
    token,
    {
      method: 'PATCH',
      body: JSON.stringify({ title }),
    }
  )

export const deleteAssistantThread = (
  token: string | null,
  threadId: string,
  workspace: AssistantWorkspace
) =>
  assistantApiFetch<void>(
    `${assistantApiPath('threads', threadId)}?workspace=${workspace}`,
    token,
    { method: 'DELETE' }
  )

export const cancelAssistantRun = (token: string | null, runId: string) =>
  assistantApiFetch<{ cancelled: true }>(
    assistantApiPath('runs', runId, 'cancel'),
    token,
    { method: 'POST', body: '{}' }
  )

export const deleteAssistantMessage = (
  token: string | null,
  threadId: string,
  messageId: string,
  workspace: AssistantWorkspace
) =>
  assistantApiFetch<void>(
    `${assistantApiPath('threads', threadId, 'messages', messageId)}?workspace=${workspace}`,
    token,
    {
      method: 'DELETE',
    }
  )
