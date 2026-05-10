import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { fetchBaseHtml, getOrigin, injectOgTags } from '../_og.js'

const FORMS_DESCRIPTION =
  'Tap, fill, and submit your attendance easily to stay connected with Generus BIG activities.'
const FALLBACK_TITLE = 'Generus BIG — Attendance Form'
const ADMIN_ORIGIN = 'https://generusbig.my.id'

function getSlug(req: IncomingMessage): string {
  const path = (req.url ?? '').split(/[?#]/)[0]
  const apiMatch = path.match(/\/forms\/([^/?#]+)/)
  const rootMatch = path.match(/^\/([^/?#]+)$/)
  const slug = apiMatch?.[1] ?? rootMatch?.[1] ?? ''

  return slug ? decodeURIComponent(slug) : ''
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const origin = getOrigin(req)
  const slug = getSlug(req)
  let title = FALLBACK_TITLE

  if (slug) {
    const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
    const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''

    if (supabaseUrl && supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey)
      const { data } = await supabase
        .from('attendance_forms')
        .select('title')
        .eq('slug', slug)
        .eq('is_active', true)
        .maybeSingle()

      if (data?.title) {
        title = `${data.title as string} — Attendance Form`
      }
    }
  }

  try {
    const canonicalUrl = `${origin}/${encodeURIComponent(slug)}`
    const baseHtml = await fetchBaseHtml(ADMIN_ORIGIN)
    const html = injectOgTags(baseHtml, title, FORMS_DESCRIPTION, canonicalUrl)

    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
    })
    res.end(html)
  } catch {
    res.writeHead(500)
    res.end('Internal error')
  }
}
