import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import { fetchBaseHtml, getOrigin, injectOgTags } from '../../_og.js'

const FALLBACK_TITLE = 'Dashboard Overview - Generus BIG'
const FALLBACK_DESCRIPTION =
  'Dashboard overview untuk rekap absensi bulanan Generus BIG.'

function getToken(req: IncomingMessage): string {
  const path = (req.url ?? '').split(/[?#]/)[0]
  const match = path.match(/\/share\/dashboard\/([^/?#]+)/)
  return match?.[1] ? decodeURIComponent(match[1]) : ''
}

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse
): Promise<void> {
  const origin = getOrigin(req)
  const token = getToken(req)

  let title = FALLBACK_TITLE
  let description = FALLBACK_DESCRIPTION
  let shareName = ''

  if (token) {
    try {
      const supabaseUrl = process.env.VITE_SUPABASE_URL ?? ''
      const supabaseKey = process.env.VITE_SUPABASE_ANON_KEY ?? ''
      if (!supabaseUrl || !supabaseKey) {
        // env not configured — keep fallback title/description
      } else {
        const supabase = createClient(supabaseUrl, supabaseKey)
        const { data, error } = await supabase.rpc(
          'get_public_dashboard_payload',
          {
            p_token: token,
            p_month: null,
          }
        )

        const payload = data as {
          status?: string
          share?: { name?: string; displayMode?: 'monthly' | 'forms' }
        } | null

        if (error) {
          // query failed — keep fallback title/description
        } else if (payload?.status === 'ok' && payload.share?.name) {
          shareName = payload.share.name
          title = `${shareName} - Dashboard Overview`
          description =
            payload.share.displayMode === 'forms'
              ? `Dashboard overview ${shareName} untuk rekap form terpilih.`
              : `Dashboard overview ${shareName} untuk rekap absensi bulanan.`
        } else {
          // share not found — keep fallback title/description
        }
      }
    } catch {
      // query failed — keep fallback title/description
    }
  }

  const canonicalUrl = `${origin}/share/dashboard/${encodeURIComponent(token)}`

  try {
    const baseHtml = await fetchBaseHtml(origin)
    const html = injectOgTags(baseHtml, title, description, canonicalUrl)
    res.writeHead(200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 's-maxage=300, stale-while-revalidate=3600',
    })
    res.end(html)
  } catch {
    res.writeHead(500, {
      'Content-Type': 'text/html; charset=utf-8',
    })
    res.end('Internal error')
  }
}
