import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { fetchBaseHtml, getOrigin, injectOgTags } from '../_og.js'

const FORMS_DESCRIPTION =
  'Tap, fill, and submit your attendance easily to stay connected with Generus BIG activities.'
const FALLBACK_TITLE = 'Attendance Form - Generus BIG'

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
  let formTitle = ''
  let debugNote = slug ? 'slug-found' : 'slug-missing'

  if (slug) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''
      if (!supabaseUrl || !supabaseKey) {
        debugNote = 'env-missing'
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data, error } = await supabase
          .from('attendance_forms')
          .select('title')
          .eq('slug', slug)
          .eq('is_active', true)
          .maybeSingle()

        if (error) {
          debugNote = `query-error:${error.code ?? 'unknown'}`
        } else if (data?.title) {
          formTitle = data.title as string
          title = `${formTitle} - Attendance Form`
          debugNote = 'form-found'
        } else {
          debugNote = 'form-not-found'
        }
      }
    } catch (e) {
      debugNote = `exception:${(e as Error).message.slice(0, 40)}`
    }
  }

  const canonicalUrl = `${origin}/${encodeURIComponent(slug)}`

  try {
    const baseHtml = await fetchBaseHtml(origin)
    const html = injectOgTags(baseHtml, title, FORMS_DESCRIPTION, canonicalUrl)
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
      'X-OG-Slug': slug || '(empty)',
      'X-OG-Form-Title': formTitle || '(default)',
      'X-OG-Debug': debugNote,
    })
    res.end(html)
  } catch (e) {
    res.writeHead(500, {
      'X-OG-Debug': `fetch-failed:${(e as Error).message.slice(0, 60)}`,
    })
    res.end('Internal error')
  }
}
