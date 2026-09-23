import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

interface EdgeRuntime {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const edgeRuntime = (globalThis as typeof globalThis & { Deno: EdgeRuntime }).Deno

type PhotoMetadata = {
  kelompokKey: string
  monthKey: string
  caption: string | null
  sortOrder: number
}

type PhotoPath = PhotoMetadata & { storagePath: string }

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}

function getProjectKey(manifestName: string, legacyName: string) {
  const manifest = edgeRuntime.env.get(manifestName)
  if (manifest) {
    try {
      const key = (JSON.parse(manifest) as { default?: unknown }).default
      if (typeof key === 'string' && key) return key
    } catch {
      // Fall back for projects that do not expose the key manifest.
    }
  }
  return edgeRuntime.env.get(legacyName)
}

edgeRuntime.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') return json({ status: 'unavailable' }, 405)

  const body = await request.json().catch(() => null)
  const token = body && typeof body === 'object' && 'token' in body
    ? (body as { token?: unknown }).token
    : null
  const requestedMonth = body && typeof body === 'object' && 'month' in body
    ? (body as { month?: unknown }).month
    : null
  const month = typeof requestedMonth === 'string' && /^\d{4}-(0[1-9]|1[0-2])$/.test(requestedMonth)
    ? requestedMonth
    : null
  if (typeof token !== 'string' || !/^[0-9a-f]{32}$/.test(token)) {
    return json({ status: 'unavailable' })
  }

  const supabaseUrl = edgeRuntime.env.get('SUPABASE_URL')
  const publishableKey = getProjectKey('SUPABASE_PUBLISHABLE_KEYS', 'SUPABASE_ANON_KEY')
  if (!supabaseUrl || !publishableKey) return json({ status: 'error' }, 500)

  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: payload, error: payloadError } = await publicClient.rpc(
    'get_public_lupg_program_analytics_payload',
    { p_token: token, p_month: month }
  )
  if (payloadError) return json({ status: 'error' }, 502)
  if (!payload || typeof payload !== 'object' || !('status' in payload)) {
    return json({ status: 'unavailable' })
  }
  if (payload.status !== 'ok') return json({ status: 'unavailable' })
  if (!('data' in payload) || !payload.data || typeof payload.data !== 'object') {
    return json({ status: 'error' }, 502)
  }
  if (!('share' in payload) || !payload.share || typeof payload.share !== 'object') {
    return json({ status: 'error' }, 502)
  }

  const data = payload.data as Record<string, unknown>
  const selectedMonthKey = (payload.share as { selectedMonthKey?: unknown }).selectedMonthKey
  if (typeof selectedMonthKey !== 'string' || !/^\d{4}-(0[1-9]|1[0-2])$/.test(selectedMonthKey)) {
    return json({ status: 'error' }, 502)
  }
  const documentation = Array.isArray(data.documentation) ? data.documentation : []
  const metadata = (documentation as PhotoMetadata[]).filter((row) =>
        row && typeof row.kelompokKey === 'string' &&
        row.monthKey === selectedMonthKey &&
        (row.caption == null || typeof row.caption === 'string') &&
        typeof row.sortOrder === 'number'
      )
  if (metadata.length !== documentation.length) return json({ status: 'error' }, 502)
  if (!metadata.length) return json(payload)

  const secretKey = getProjectKey('SUPABASE_SECRET_KEYS', 'SUPABASE_SERVICE_ROLE_KEY')
  if (!secretKey) return json({ status: 'error' }, 500)
  const secretClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: photoData, error: photoError } = await secretClient.rpc(
    'get_public_lupg_program_analytics_photo_paths',
    { p_token: token, p_month: month }
  )
  if (photoError || !Array.isArray(photoData)) return json({ status: 'error' }, 502)

  const paths = (photoData as PhotoPath[]).filter(
    (row) => row && row.monthKey === selectedMonthKey &&
      typeof row.storagePath === 'string' && row.storagePath.length > 0
  )
  if (paths.length !== metadata.length) return json({ status: 'error' }, 502)
  if (paths.some((row, index) => {
    const photo = metadata[index]
    return row.kelompokKey !== photo.kelompokKey ||
      row.monthKey !== photo.monthKey ||
      row.caption !== photo.caption ||
      row.sortOrder !== photo.sortOrder
  })) return json({ status: 'error' }, 502)
  const { data: signedRows, error: signingError } = await secretClient.storage
    .from('lupg-activity-photos')
    .createSignedUrls(paths.map((row) => row.storagePath), 3600)
  if (signingError || !signedRows || signedRows.length !== metadata.length) {
    return json({ status: 'error' }, 502)
  }

  return json({
    ...payload,
    data: {
      ...data,
      documentation: metadata.map((photo, index) => ({
        ...photo,
        id: `photo-${index + 1}`,
        signedUrl: signedRows[index]?.signedUrl ?? null,
      })),
    },
  })
})
