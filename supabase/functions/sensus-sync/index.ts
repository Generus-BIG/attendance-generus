import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { parseTableRows } from './parse.ts'
import {
  keepRow,
  mapKategori,
  matchRow,
  normalizeKelompok,
  parseTanggalLahir,
  type SourceRow,
} from './logic.ts'

interface EdgeRuntime {
  env: { get(name: string): string | undefined }
  serve(handler: (request: Request) => Response | Promise<Response>): void
}

const edgeRuntime = (globalThis as typeof globalThis & { Deno: EdgeRuntime }).Deno

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}
const sourceUrl = 'https://desabig.my.id/data_sensus_generus.php'

const jsonResponse = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

interface RequestBody {
  action?: unknown
  item_ids?: unknown
}

edgeRuntime.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') return new Response(null, { status: 204, headers: corsHeaders })

  let admin: SupabaseClient | undefined
  let runId: string | undefined
  try {
    const supabaseUrl = edgeRuntime.env.get('SUPABASE_URL')
    const serviceRoleKey = edgeRuntime.env.get('SUPABASE_SERVICE_ROLE_KEY')
    if (!supabaseUrl || !serviceRoleKey) {
      return jsonResponse({ error: 'Server misconfigured' }, 500)
    }

    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return jsonResponse({ error: 'Unauthorized' }, 401)

    const token = authHeader.slice('Bearer '.length)
    admin = createClient(supabaseUrl, serviceRoleKey)
    // Scheduled runs arrive from pg_cron via pg_net with a service role key
    // stored in Supabase Vault as the bearer. The vault string may differ from
    // this env key (legacy JWT vs new sb_secret format), so the vault match is
    // evaluated by a service_role-only RPC where the secret lives.
    // ponytail: plain === compare (no timing-safe primitive in this runtime)
    let isCron = token === serviceRoleKey
    if (!isCron) {
      const { data: vaultMatch } = await admin.rpc('sensus_sync_is_cron_bearer', {
        p_token: token,
      })
      isCron = vaultMatch === true
    }
    let callerUserId: string | null = null
    if (!isCron) {
      const { data: authData, error: authError } = await admin.auth.getUser(token)
      if (authError || !authData.user) return jsonResponse({ error: 'Unauthorized' }, 401)

      const role = authData.user.app_metadata?.role as string | undefined
      if (role !== 'super_admin' && role !== 'admin') {
        return jsonResponse({ error: 'Forbidden' }, 403)
      }
      callerUserId = authData.user.id
    }

    let body: RequestBody
    try {
      body = (await req.json()) as RequestBody
    } catch {
      return jsonResponse({ error: 'Invalid JSON body' }, 400)
    }

    if (body.action === 'apply') {
      if (isCron) return jsonResponse({ error: 'Forbidden' }, 403)
      if (!callerUserId) return jsonResponse({ error: 'Unauthorized' }, 401)
      if (
        !Array.isArray(body.item_ids) ||
        body.item_ids.length === 0 ||
        !body.item_ids.every((id): id is string => typeof id === 'string' && id.length > 0)
      ) {
        return jsonResponse({ error: 'item_ids required' }, 400)
      }
      const anonKey = edgeRuntime.env.get('SUPABASE_ANON_KEY')
      if (!anonKey) return jsonResponse({ error: 'Server misconfigured' }, 500)
      const caller = createClient(supabaseUrl, anonKey, {
        global: { headers: { Authorization: `Bearer ${token}` } },
      })
      const { data, error } = await caller.rpc('apply_sensus_sync_items', {
        p_item_ids: body.item_ids,
      })
      if (error) throw error
      return jsonResponse({ result: data })
    }
    if (body.action !== 'stage') return jsonResponse({ error: 'Invalid action' }, 400)

    const { data: run, error: runError } = await admin
      .from('sensus_sync_runs')
      .insert({ mode: isCron ? 'cron' : 'manual', triggered_by: callerUserId })
      .select('id')
      .single()
    if (runError) throw runError
    runId = run.id
    const currentRunId: string = run.id

    const response = await fetch(sourceUrl)
    if (!response.ok) throw new Error(`Source fetch failed: ${response.status}`)
    const rows = parseTableRows(await response.text())

    const normalized = rows.flatMap((cols) => {
      const kelompok = normalizeKelompok(cols[1])
      const kategori = mapKategori(cols[7])
      const keep = keepRow(cols[9])
      const gender = cols[4].trim().toUpperCase()
      const name = cols[3].trim()
      if (!kelompok || !kategori || !keep || !name || (gender !== 'L' && gender !== 'P')) return []
      return [{ name, kelompok, gender, birth: parseTanggalLahir(cols[5]), kategori, keep }]
    })
    const sourceRows: SourceRow[] = normalized.map(({ name, kelompok, gender }) => ({
      name,
      kelompok,
      gender,
    }))

    const { data: participants, error: participantsError } = await admin
      .from('participants')
      .select(
        'id, name, gender, birth_date, is_khusus, group:lookup_values!participants_group_id_fkey(value), category:lookup_values!participants_category_id_fkey(value)'
      )
    if (participantsError) throw participantsError
    const existing = (
      participants as unknown as Array<{
        id: string
        name: string
        gender: string | null
        birth_date: string | null
        is_khusus: boolean | null
        group: { value: string } | { value: string }[] | null
        category: { value: string } | { value: string }[] | null
      }>
    ).map((participant) => {
      const group = Array.isArray(participant.group) ? participant.group[0] : participant.group
      const category = Array.isArray(participant.category) ? participant.category[0] : participant.category
      return {
        id: participant.id,
        name: participant.name,
        kelompok: group?.value ?? '',
        gender: participant.gender ?? '',
        birth_date: participant.birth_date,
        category: category?.value ?? null,
        is_khusus: participant.is_khusus ?? false,
      }
    })

    const items = normalized.map((row) => {
      const matched = matchRow(row, existing, sourceRows)
      const current = matched.participantId
        ? existing.find((candidate) => candidate.id === matched.participantId) ?? null
        : null
      return {
        run_id: currentRunId,
        source_name: row.name,
        source_kelompok: row.kelompok,
        source_gender: row.gender,
        source_birth_date: row.birth,
        source_kategori: row.kategori,
        source_khusus: row.keep === 'khusus',
        matched_participant_id:
          matched.confidence === 'similar' ? null : matched.participantId,
        confidence: matched.confidence,
        patch: {
          birth_date: row.birth,
          kategori: row.kategori,
          khusus: row.keep === 'khusus',
          current: current
            ? {
                id: current.id,
                name: current.name,
                birth_date: current.birth_date,
                kategori: current.category,
                khusus: current.is_khusus,
              }
            : null,
          candidates: (matched.candidates ?? []).map((candidate) => ({
            id: candidate.id,
            name: candidate.name,
            kelompok: candidate.kelompok,
            gender: candidate.gender,
            birth_date: candidate.birth_date ?? null,
            category: candidate.category ?? null,
            is_khusus: candidate.is_khusus ?? false,
          })),
        },
      }
    })
    if (items.length > 0) {
      const { error } = await admin.from('sensus_sync_items').insert(items)
      if (error) throw error
    }
    const { error: updateError } = await admin
      .from('sensus_sync_runs')
      .update({ row_count: items.length })
      .eq('id', runId)
    if (updateError) throw updateError

    // Auto-apply pure-new rows (confidence 'none', no match, zero candidates)
    // when the admin toggle is on. Candidate-bearing rows stay in review —
    // the DB constraint already blocks applying them unresolved.
    let autoApplied = 0
    const { data: settings } = await admin
      .from('sensus_sync_settings')
      .select('auto_apply_new')
      .eq('id', 1)
      .maybeSingle()
    if (settings?.auto_apply_new) {
      const { data: newItems, error: newItemsError } = await admin
        .from('sensus_sync_items')
        .select('id, patch')
        .eq('run_id', currentRunId)
        .eq('status', 'pending')
        .eq('confidence', 'none')
        .is('matched_participant_id', null)
      if (newItemsError) throw newItemsError
      const newIds = (newItems ?? [])
        .filter((item) => ((item.patch as { candidates?: unknown[] })?.candidates?.length ?? 0) === 0)
        .map((item) => item.id)
      if (newIds.length > 0) {
        const { data: appliedResult, error: applyError } = await admin.rpc(
          'apply_sensus_sync_items',
          { p_item_ids: newIds },
        )
        if (applyError) throw applyError
        autoApplied = (appliedResult as { applied?: number } | null)?.applied ?? 0
      }
    }

    return jsonResponse({ run_id: runId, staged: items.length, auto_applied: autoApplied })
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Internal server error'
    if (admin && runId) {
      await admin.from('sensus_sync_runs').update({ status: 'failed', error: message }).eq('id', runId)
    }
    return jsonResponse({ error: message, ...(runId ? { run_id: runId } : {}) }, 500)
  }
})
