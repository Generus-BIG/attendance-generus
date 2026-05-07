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
  const slug = url.pathname.split('/')[2] ?? ''

  let title = 'Attendance Check-In'
  let description = "Mark your attendance for today's session."

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
        .eq('is_active', true)
        .maybeSingle()

      if (data?.title) {
        const formTitle = data.title as string
        title = `${formTitle} — Attendance`
        description = `Mark your attendance for ${formTitle}.`
      }
    } catch (_e) {
      // fall through to defaults
    }
  }

  const canonicalUrl = `${origin}/absensi/${slug}`

  try {
    const baseHtml = await fetchBaseHtml(origin)
    sendHtml(res, injectOgTags(baseHtml, title, description, canonicalUrl))
  } catch (_e) {
    res.writeHead(500)
    res.end('Internal error')
  }
}
