import type { IncomingMessage, ServerResponse } from 'node:http'
import { createClient } from '@supabase/supabase-js'
import {
  fetchBaseHtml,
  getOrigin,
  injectOgTags,
  sendHtml,
} from '../_og.js'

export default async function handler(
  req: IncomingMessage,
  res: ServerResponse,
): Promise<void> {
  const origin = getOrigin(req)
  const url = new URL(req.url ?? '/', origin)
  const slug = url.searchParams.get('slug') ?? ''

  let title = 'Join as a Participant'
  let description = 'Register to join the program.'

  if (slug) {
    try {
      const supabase = createClient(
        process.env.VITE_SUPABASE_URL ?? '',
        process.env.VITE_SUPABASE_ANON_KEY ?? '',
      )
      const { data } = await supabase
        .from('attendance_forms')
        .select('title')
        .eq('slug', slug)
        .maybeSingle()

      if (data?.title) {
        const formTitle = data.title as string
        title = `${formTitle} — Join`
        description = `Register to join ${formTitle}.`
      }
    } catch (_e) {
      // fall through to defaults
    }
  }

  const canonicalUrl = `${origin}/register/add-participant${slug ? `?slug=${slug}` : ''}`

  try {
    const baseHtml = await fetchBaseHtml(origin)
    sendHtml(res, injectOgTags(baseHtml, title, description, canonicalUrl))
  } catch (_e) {
    res.writeHead(500)
    res.end('Internal error')
  }
}
