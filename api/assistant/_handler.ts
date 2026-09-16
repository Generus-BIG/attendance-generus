import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAssistantRequest } from '../../src/mastra/http.js'
import { models } from '../../src/mastra/models.js'
import {
  authenticate,
  conversationAdapter,
  streamAdapter,
} from '../../src/mastra/adapters.js'

const BODY_LIMIT = 256 * 1024

export async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  let size = 0
  for await (const chunk of req) {
    size += chunk.length
    if (size > BODY_LIMIT) throw new Error('PAYLOAD_TOO_LARGE')
    chunks.push(chunk as Uint8Array)
  }
  const body = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) {
    body.set(chunk, offset)
    offset += chunk.length
  }
  return body
}

export async function handleNodeRequest(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const host = req.headers.host ?? 'localhost'
  const headers = new Headers()
  for (const [key, value] of Object.entries(req.headers)) {
    if (Array.isArray(value)) value.forEach((v) => headers.append(key, v))
    else if (value !== undefined) headers.set(key, value)
  }
  const noBody = req.method === 'GET' || req.method === 'HEAD' || !req.method
  const controller = new AbortController()
  const abort = () => controller.abort()
  req.once('aborted', abort)
  res.once('close', () => {
    if (!res.writableEnded) abort()
  })
  let body: Uint8Array | null = null
  try {
    body = noBody ? null : await readBody(req)
  } catch (error) {
    if (error instanceof Error && error.message === 'PAYLOAD_TOO_LARGE') {
      res.writeHead(413, { 'content-type': 'application/json' })
      res.end(JSON.stringify({ error: 'PAYLOAD_TOO_LARGE' }))
      return
    }
    throw error
  }
  const request = new Request(`https://${host}${req.url ?? '/'}`, {
    method: req.method ?? 'GET',
    headers,
    body: body ? Buffer.from(body) : null,
    signal: controller.signal,
  })
  const response = await handleAssistantRequest(request, {
    authenticate,
    models,
    stream: streamAdapter,
    conversations: conversationAdapter,
  })
  res.writeHead(
    response.status,
    Object.fromEntries(response.headers.entries())
  )
  if (response.body) {
    const reader = response.body.getReader()
    for (;;) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(value)
    }
  }
  res.end()
}
