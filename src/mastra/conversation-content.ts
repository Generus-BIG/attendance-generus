import {
  type MastraDBMessage,
  type MastraMessagePart,
} from '@mastra/core/agent'
import { dataViewSchema } from '../features/assistant/data-view'

// Persist the approved public result envelope, never provider metadata or reasoning.
export function sanitizeMessages(
  messages: MastraDBMessage[],
  metadata: { modelId: string; runId: string }
): MastraDBMessage[] {
  return messages
    .filter((m) => m.role === 'user' || m.role === 'assistant')
    .map((message) => ({
      id: message.id,
      role: message.role,
      threadId: message.threadId,
      resourceId: message.resourceId,
      createdAt: message.createdAt,
      type: 'text',
      content: {
        format: 2,
        metadata,
        parts: message.content.parts.flatMap((part): MastraMessagePart[] => {
          if (part.type === 'text') return [{ type: 'text', text: part.text }]
          if (part.type !== 'tool-invocation') return []
          const tool = part.toolInvocation
          const result = dataViewSchema.safeParse(tool.result)
          if (!result.success) return []
          return [
            {
              type: 'tool-invocation',
              toolInvocation: {
                toolCallId: tool.toolCallId,
                toolName: tool.toolName,
                state: 'result',
                args: {},
                result: result.data,
              },
            },
          ]
        }),
      },
    }))
}

export function deletionIds(messages: MastraDBMessage[], messageId: string) {
  const index = messages.findIndex((message) => message.id === messageId)
  if (index < 0) throw new Error('NOT_FOUND')
  const target = messages[index]
  if (target.role === 'assistant') return [target.id]
  if (target.role !== 'user') throw new Error('INVALID_REQUEST')
  const next = messages.findIndex(
    (message, i) => i > index && message.role === 'user'
  )
  return messages
    .slice(index, next < 0 ? undefined : next)
    .map((message) => message.id)
}

export function rebuildWorkingMemory(messages: MastraDBMessage[]) {
  // Reconstruct only from retained evidence. Older references require history retrieval.
  const prompts = messages
    .filter((m) => m.role === 'user')
    .slice(-10)
    .map((m) =>
      m.content.parts
        .filter((p) => p.type === 'text')
        .map((p) => p.text)
        .join('\n')
        .slice(0, 1000)
    )
  return `# Conversation context\nReconstructed from surviving user prompts, oldest first. Resolve scope and period again; do not reuse numeric answers. Ask if an older reference is unclear.\n${prompts.map((p) => `- ${p}`).join('\n')}`
}
