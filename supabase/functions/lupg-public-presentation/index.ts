import { createClient } from '@supabase/supabase-js'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Cache-Control': 'no-store',
}

interface EdgeRuntime {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const edgeRuntime = (
  globalThis as typeof globalThis & { Deno: EdgeRuntime }
).Deno

type PublicPhoto = {
  id: string
  caption: string | null
  storagePath: string
}

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
      // Legacy projects do not expose the key manifest.
    }
  }
  return edgeRuntime.env.get(legacyName)
}

edgeRuntime.serve(async (request) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders })
  }
  if (request.method !== 'POST') {
    return json({ status: 'unavailable' }, 405)
  }

  const body = await request.json().catch(() => null)
  const token =
    body && typeof body === 'object' && 'token' in body
      ? (body as { token?: unknown }).token
      : null

  if (typeof token !== 'string' || !/^[0-9a-f]{32}$/.test(token)) {
    return json({ status: 'unavailable' })
  }

  const supabaseUrl = edgeRuntime.env.get('SUPABASE_URL')
  const publishableKey = getProjectKey(
    'SUPABASE_PUBLISHABLE_KEYS',
    'SUPABASE_ANON_KEY'
  )
  if (!supabaseUrl || !publishableKey) {
    return json({ status: 'error' }, 500)
  }

  const publicClient = createClient(supabaseUrl, publishableKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: payload, error: payloadError } = await publicClient.rpc(
    'get_public_lupg_presentation_payload',
    { p_token: token }
  )

  if (payloadError) {
    return json({ status: 'error' }, 502)
  }
  if (
    !payload ||
    typeof payload !== 'object' ||
    !('status' in payload) ||
    payload.status !== 'ok'
  ) {
    return json({ status: 'unavailable' })
  }
  if (!('data' in payload) || !payload.data || typeof payload.data !== 'object') {
    return json({ status: 'error' }, 502)
  }

  const data = payload.data as Record<string, unknown>
  const photos = Array.isArray(data.activityPhotos)
    ? (data.activityPhotos as PublicPhoto[]).filter(
        (photo) =>
          photo &&
          typeof photo.id === 'string' &&
          typeof photo.storagePath === 'string'
      )
    : []

  if (photos.length === 0) {
    return json(payload)
  }

  const secretKey = getProjectKey(
    'SUPABASE_SECRET_KEYS',
    'SUPABASE_SERVICE_ROLE_KEY'
  )
  if (!secretKey) {
    return json({ status: 'error' }, 500)
  }

  const secretClient = createClient(supabaseUrl, secretKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })
  const { data: signedRows, error: signingError } = await secretClient.storage
    .from('lupg-activity-photos')
    .createSignedUrls(
      photos.map((photo) => photo.storagePath),
      3600
    )

  if (signingError || !signedRows) {
    return json({ status: 'error' }, 502)
  }

  const signedByPath = new Map(
    signedRows
      .filter((row) => row.path && row.signedUrl)
      .map((row) => [row.path, row.signedUrl])
  )
  if (photos.some((photo) => !signedByPath.has(photo.storagePath))) {
    return json({ status: 'error' }, 502)
  }

  return json({
    ...payload,
    data: {
      ...data,
      activityPhotos: photos.map((photo) => ({
        id: photo.id,
        caption: photo.caption,
        signedUrl: signedByPath.get(photo.storagePath),
      })),
    },
  })
})
