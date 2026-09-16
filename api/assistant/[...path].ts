import type { IncomingMessage, ServerResponse } from 'node:http'
import { handleNodeRequest } from './_handler.js'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  await handleNodeRequest(req, res)
}
