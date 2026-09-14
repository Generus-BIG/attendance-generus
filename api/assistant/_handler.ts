import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleAssistantRequest } from '../../src/mastra/http.js'
import { models } from '../../src/mastra/models.js'
import { authenticate, streamAdapter } from '../../src/mastra/adapters.js'

async function readBody(req: IncomingMessage): Promise<Uint8Array> {
  const chunks: Uint8Array[] = []
  for await (const chunk of req) chunks.push(chunk as Uint8Array)
  const size = chunks.reduce((sum, chunk) => sum + chunk.length, 0)
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
  const request = new Request(`https://${host}${req.url ?? '/'}`, {
    method: req.method ?? 'GET',
    headers,
    body: noBody ? null : await readBody(req),
  })
  const response = await handleAssistantRequest(request, {
    authenticate,
    models,
    stream: streamAdapter,
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
