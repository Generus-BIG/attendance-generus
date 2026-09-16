import { type MastraDBMessage } from '@mastra/core/agent'
import { Memory } from '@mastra/memory'
import { MemoryPG, PostgresStore } from '@mastra/pg'
import { createHash, randomUUID } from 'node:crypto'
import { Pool, type PoolClient } from 'pg'
import {
  deletionIds,
  rebuildWorkingMemory,
  sanitizeMessages,
} from './conversation-content.js'

export type RunScope = {
  threadId: string
  userId: string
  runId: string
  modelId: string
}

type ConversationContext = { userId: string }
type ConversationInput = {
  threadId?: string
  messageId?: string
  runId?: string
  workspace?: 'absensi' | 'lupg'
  modelId?: string
  prompt?: string
  title?: string
  page?: number
  before?: string
}

type MessageCursor = { createdAt: string; id: string }
const encodeCursor = (cursor: MessageCursor) =>
  `c.${Buffer.from(JSON.stringify(cursor)).toString('base64url')}`
const decodeCursor = (cursor: string): MessageCursor => {
  const parsed = JSON.parse(
    Buffer.from(cursor.slice(2), 'base64url').toString()
  ) as MessageCursor
  if (!parsed.createdAt || !parsed.id) throw new Error('INVALID_REQUEST')
  return parsed
}

class ConversationMemoryPG extends MemoryPG {
  constructor(
    private readonly pool: Pool,
    private readonly scope: RunScope
  ) {
    super({ pool, schemaName: 'assistant' })
  }

  override async saveMessages({ messages }: { messages: MastraDBMessage[] }) {
    const { rows } = await this.pool.query(
      'SELECT status,cancel_requested FROM assistant.conversation_runs WHERE id=$1 AND thread_id=$2 AND resource_id=$3',
      [this.scope.runId, this.scope.threadId, this.scope.userId]
    )
    if (rows[0]?.status !== 'running' || rows[0]?.cancel_requested)
      throw new Error('CANCELLED')
    if (
      messages.some(
        (message) =>
          message.threadId !== this.scope.threadId ||
          message.resourceId !== this.scope.userId
      )
    )
      throw new Error('FORBIDDEN')
    const ids = messages.map((message) => message.id)
    if (ids.length) {
      const existing = await this.pool.query(
        'SELECT id,thread_id,"resourceId" FROM assistant.mastra_messages WHERE id=ANY($1::text[])',
        [ids]
      )
      if (
        existing.rows.some(
          (message) =>
            message.thread_id !== this.scope.threadId ||
            message.resourceId !== this.scope.userId
        )
      )
        throw new Error('FORBIDDEN')
    }
    return super.saveMessages({
      messages: sanitizeMessages(messages, this.scope),
    })
  }
}

const activeRuns = new Map<string, AbortController>()
const titleFromPrompt = (prompt: string) =>
  prompt.replace(/\s+/g, ' ').trim().slice(0, 80) || 'New conversation'

export function createConversationStorage(connectionString: string) {
  if (!connectionString.trim()) throw new Error('ASSISTANT_STORAGE_MISSING')
  const options = {
    connectionString,
    connectionTimeoutMillis: 5000,
    idleTimeoutMillis: 10000,
  }
  const pool = new Pool({ ...options, max: 3 })
  const locks = new Pool({ ...options, max: 2 })
  // Prevent idle-client errors from becoming uncaught process events; each query still rejects normally.
  pool.on('error', () => {})
  locks.on('error', () => {})
  const store = new PostgresStore({
    id: 'assistant-history',
    pool,
    schemaName: 'assistant',
    disableInit: true,
  })
  const domain = store.stores.memory!
  store.stores = { memory: domain }

  const memoryForRun = (scope: RunScope) => {
    const runStore = new PostgresStore({
      id: `assistant-${scope.runId}`,
      pool,
      schemaName: 'assistant',
      disableInit: true,
    })
    runStore.stores = { memory: new ConversationMemoryPG(pool, scope) }
    return new Memory({
      storage: runStore,
      options: {
        lastMessages: 20,
        semanticRecall: false,
        generateTitle: false,
        workingMemory: {
          enabled: true,
          scope: 'thread',
          template:
            '# Conversation\n- Topic:\n- Resolved kelompok (clear for all groups):\n- Period:\n- Open question:\nUse only this thread; numeric results must be queried again.',
        },
      },
    })
  }

  const ownedThread = async (
    threadId: string,
    userId: string,
    workspace?: ConversationInput['workspace']
  ) => {
    const thread = await domain.getThreadById({ threadId })
    if (
      !thread ||
      thread.resourceId !== userId ||
      (workspace && thread.metadata?.workspace !== workspace)
    )
      throw new Error('NOT_FOUND')
    return thread
  }

  const withThreadLock = async <T>(
    threadId: string,
    work: () => Promise<T>
  ) => {
    const client = await locks.connect()
    try {
      await client.query('SELECT pg_advisory_lock(hashtext($1))', [threadId])
      return await work()
    } finally {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [threadId])
      client.release()
    }
  }

  const beginRun = async (
    input: ConversationInput,
    context: ConversationContext
  ) => {
    const threadId = input.threadId ?? randomUUID()
    const runId = input.runId ?? randomUUID()
    const messageId = input.messageId!
    const prompt = input.prompt!
    const client = await locks.connect()
    const lock = await client.query<{ locked: boolean }>(
      'SELECT pg_try_advisory_lock(hashtext($1)) AS locked',
      [threadId]
    )
    if (!lock.rows[0]?.locked) {
      client.release()
      throw new Error('DUPLICATE')
    }
    try {
      const deleted = await pool.query(
        'SELECT 1 FROM assistant.deleted_threads WHERE id=$1',
        [threadId]
      )
      if (deleted.rowCount) throw new Error('NOT_FOUND')
      const existingThread = await domain.getThreadById({ threadId })
      if (
        existingThread &&
        (existingThread.resourceId !== context.userId ||
          existingThread.metadata?.workspace !== input.workspace)
      )
        throw new Error('NOT_FOUND')
      const thread = existingThread
      if (!thread) {
        await domain.saveThread({
          thread: {
            id: threadId,
            resourceId: context.userId,
            title: titleFromPrompt(prompt),
            metadata: { workspace: input.workspace },
            createdAt: new Date(),
            updatedAt: new Date(),
          },
        })
      }
      const inserted = await pool.query(
        `INSERT INTO assistant.conversation_runs(id,thread_id,resource_id,message_id,prompt_hash,model_id,status)
         VALUES($1,$2,$3,$4,$5,$6,'running')
         ON CONFLICT(message_id) DO UPDATE SET
           id=EXCLUDED.id,prompt_hash=EXCLUDED.prompt_hash,model_id=EXCLUDED.model_id,
           status='running',cancel_requested=false,updated_at=now()
         WHERE conversation_runs.thread_id=EXCLUDED.thread_id
           AND conversation_runs.resource_id=EXCLUDED.resource_id
           AND conversation_runs.status IN ('saved','cancelled','failed')
         RETURNING id`,
        [
          runId,
          threadId,
          context.userId,
          messageId,
          createHash('sha256').update(prompt).digest('hex'),
          input.modelId,
        ]
      )
      if (!inserted.rowCount) throw new Error('DUPLICATE')
      const controller = new AbortController()
      activeRuns.set(runId, controller)
      return { threadId, runId, controller, lock: client }
    } catch (error) {
      await client.query('SELECT pg_advisory_unlock(hashtext($1))', [threadId])
      client.release()
      throw error
    }
  }

  const finishRun = async (
    run: { threadId: string; runId: string; lock: PoolClient },
    status: 'saved' | 'cancelled' | 'failed'
  ) => {
    try {
      await pool.query(
        `UPDATE assistant.conversation_runs SET status=$2,updated_at=now()
         WHERE id=$1 AND status='running'`,
        [run.runId, status]
      )
      if (status === 'saved')
        await pool.query(
          'UPDATE assistant.mastra_threads SET "updatedAt"=now(),"updatedAtZ"=now() WHERE id=$1',
          [run.threadId]
        )
    } finally {
      activeRuns.delete(run.runId)
      await run.lock.query('SELECT pg_advisory_unlock(hashtext($1))', [
        run.threadId,
      ])
      run.lock.release()
    }
  }

  const cancelThreadRuns = async (threadId: string, userId: string) => {
    const cancelled = await pool.query(
      `UPDATE assistant.conversation_runs SET cancel_requested=true,status='cancelled',updated_at=now()
       WHERE thread_id=$1 AND resource_id=$2 AND status='running' RETURNING id`,
      [threadId, userId]
    )
    for (const { id } of cancelled.rows) activeRuns.get(id)?.abort()
  }

  const conversations = async (
    operation: string,
    input: ConversationInput,
    context: ConversationContext
  ) => {
    if (operation === 'listThreads') {
      const { rows } = await pool.query(
        `SELECT id,title,metadata->>'workspace' AS workspace,
                COALESCE("updatedAtZ","updatedAt") AS "updatedAt"
         FROM assistant.mastra_threads
         WHERE "resourceId"=$1 AND metadata->>'workspace'=$2
         ORDER BY COALESCE("updatedAtZ","updatedAt") DESC,id DESC LIMIT 20`,
        [context.userId, input.workspace]
      )
      return { threads: rows }
    }
    if (operation === 'cancelRun') {
      const result = await pool.query(
        `UPDATE assistant.conversation_runs SET cancel_requested=true,status='cancelled',updated_at=now()
         WHERE id=$1 AND resource_id=$2 AND status='running' RETURNING id`,
        [input.runId, context.userId]
      )
      if (!result.rowCount) throw new Error('NOT_FOUND')
      activeRuns.get(input.runId!)?.abort()
      return { cancelled: true }
    }
    const threadId = input.threadId!
    await ownedThread(threadId, context.userId, input.workspace)
    if (operation === 'listMessages') {
      const cursor = input.before
        ? input.before.startsWith('c.')
          ? decodeCursor(input.before)
          : await (async () => {
              const { rows } = await pool.query(
                `SELECT COALESCE("createdAtZ","createdAt") AS "createdAt",id
                 FROM assistant.mastra_messages
                 WHERE id=$1 AND thread_id=$2 AND "resourceId"=$3`,
                [input.before, threadId, context.userId]
              )
              if (!rows[0]) throw new Error('NOT_FOUND')
              return rows[0] as MessageCursor
            })()
        : undefined
      const { rows } = await pool.query(
        `SELECT id,content,role,COALESCE("createdAtZ","createdAt") AS "createdAt"
         FROM assistant.mastra_messages
         WHERE thread_id=$1 AND "resourceId"=$2
           AND ($3::timestamptz IS NULL OR (COALESCE("createdAtZ","createdAt"),id) < ($3,$4))
         ORDER BY COALESCE("createdAtZ","createdAt") DESC,id DESC LIMIT 21`,
        [
          threadId,
          context.userId,
          cursor?.createdAt ?? null,
          cursor?.id ?? null,
        ]
      )
      const page = rows.slice(0, 20) as Array<{
        id: string
        content: string
        role: string
        createdAt: string
      }>
      const oldest = page[page.length - 1]
      return {
        messages: page.reverse().map((message) => {
          const content = JSON.parse(
            message.content
          ) as MastraDBMessage['content']
          return {
            id: message.id,
            role: message.role,
            parts: content.parts.flatMap((part): Record<string, unknown>[] => {
              if (part.type === 'text')
                return [{ type: 'text', text: part.text }]
              if (part.type !== 'tool-invocation') return []
              return [
                {
                  type: `tool-${part.toolInvocation.toolName}`,
                  toolName: part.toolInvocation.toolName,
                  toolCallId: part.toolInvocation.toolCallId,
                  state: 'output-available',
                  input: {},
                  output: part.toolInvocation.result,
                },
              ]
            }),
            metadata: content.metadata,
          }
        }),
        hasEarlier: rows.length > 20,
        nextCursor:
          rows.length > 20 && oldest
            ? encodeCursor({ createdAt: oldest.createdAt, id: oldest.id })
            : undefined,
      }
    }
    if (operation === 'renameThread')
      return domain.updateThread({ id: threadId, title: input.title })
    if (operation === 'deleteThread') {
      await cancelThreadRuns(threadId, context.userId)
      return withThreadLock(threadId, async () => {
        await pool.query(
          'INSERT INTO assistant.deleted_threads(id,resource_id) VALUES($1,$2) ON CONFLICT(id) DO NOTHING',
          [threadId, context.userId]
        )
        await pool.query(
          'DELETE FROM assistant.conversation_runs WHERE thread_id=$1 AND resource_id=$2',
          [threadId, context.userId]
        )
        await domain.deleteThread({ threadId })
        return { deleted: true }
      })
    }
    if (operation === 'deleteMessage') {
      await cancelThreadRuns(threadId, context.userId)
      return withThreadLock(threadId, async () => {
        const listed = await domain.listMessages({
          threadId,
          resourceId: context.userId,
          perPage: false,
          orderBy: { field: 'createdAt', direction: 'ASC' },
        })
        const ids = deletionIds(listed.messages, input.messageId!)
        await domain.deleteMessages(ids)
        const survivors = listed.messages.filter(
          (message) => !ids.includes(message.id)
        )
        await domain.updateThread({
          id: threadId,
          metadata: {
            ...(await ownedThread(threadId, context.userId)).metadata,
            workingMemory: rebuildWorkingMemory(survivors),
          },
        })
        return { deletedIds: ids }
      })
    }
    throw new Error('NOT_FOUND')
  }

  return {
    pool,
    locks,
    store,
    domain,
    memoryForRun,
    beginRun,
    finishRun,
    conversations,
    close: async () => {
      await locks.end()
      await pool.end()
    },
  }
}

export type ConversationStorage = ReturnType<typeof createConversationStorage>
let storage: ConversationStorage | undefined
export function getConversationStorage() {
  return (storage ??= createConversationStorage(
    process.env.ASSISTANT_DATABASE_URL ?? ''
  ))
}
