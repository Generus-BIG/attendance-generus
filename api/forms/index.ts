import type { IncomingMessage, ServerResponse } from 'node:http'
import { fetchBaseHtml, getOrigin, injectOgTags } from '../_og.js'

const FORMS_DESCRIPTION =
  'Tap, fill, and submit your attendance easily to stay connected with Generus BIG activities.'
const FALLBACK_TITLE = 'Attendance Form - Generus BIG'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const origin = getOrigin(req)
  const canonicalUrl = `${origin}/`

  try {
    const baseHtml = await fetchBaseHtml(origin)
    const html = injectOgTags(
      baseHtml,
      FALLBACK_TITLE,
      FORMS_DESCRIPTION,
      canonicalUrl
    )
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
      'X-OG-Debug': 'root-fallback',
    })
    res.end(html)
  } catch (e) {
    res.writeHead(500, {
      'X-OG-Debug': `fetch-failed:${(e as Error).message.slice(0, 60)}`,
    })
    res.end('Internal error')
  }
}
