import type { IncomingMessage, ServerResponse } from 'node:http'

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/"/g, '&quot;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

/** Replace OG/Twitter title, description, and canonical URL in a built index.html. */
export function injectOgTags(
  html: string,
  title: string,
  description: string,
  canonicalUrl: string,
): string {
  const t = escapeHtml(title)
  const d = escapeHtml(description)

  return html
    .replace(/<title>[^<]*<\/title>/, `<title>${t}</title>`)
    .replace(/<meta[\s\S]*?\/>/g, (tag) => {
      if (tag.includes('name="title"'))
        return tag.replace(/content="[^"]*"/, `content="${t}"`)
      if (tag.includes('name="description"'))
        return tag.replace(/content="[^"]*"/, `content="${d}"`)
      if (tag.includes('property="og:url"'))
        return tag.replace(/content="[^"]*"/, `content="${canonicalUrl}"`)
      if (tag.includes('property="og:title"'))
        return tag.replace(/content="[^"]*"/, `content="${t}"`)
      if (tag.includes('property="og:description"'))
        return tag.replace(/content="[^"]*"/, `content="${d}"`)
      if (tag.includes('property="twitter:url"'))
        return tag.replace(/content="[^"]*"/, `content="${canonicalUrl}"`)
      if (tag.includes('property="twitter:title"'))
        return tag.replace(/content="[^"]*"/, `content="${t}"`)
      if (tag.includes('property="twitter:description"'))
        return tag.replace(/content="[^"]*"/, `content="${d}"`)
      return tag
    })
}

export function getOrigin(req: IncomingMessage): string {
  const proto =
    (req.headers['x-forwarded-proto'] as string | undefined) ?? 'https'
  const host = req.headers.host ?? 'generus-big.vercel.app'
  return `${proto}://${host}`
}

export async function fetchBaseHtml(origin: string): Promise<string> {
  const res = await fetch(`${origin}/index.html`)
  if (!res.ok) {
    throw new Error(`fetchBaseHtml ${res.status}`)
  }
  return res.text()
}

export function sendHtml(
  res: ServerResponse,
  html: string,
  status = 200,
): void {
  res.writeHead(status, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
  })
  res.end(html)
}
