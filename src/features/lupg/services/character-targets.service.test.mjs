import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('target item reads exclude blank details', async (t) => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')
    const { listActiveCharacterTargetItemsForMonth } = await vite.ssrLoadModule(
      '/src/features/lupg/services/character-targets.service.ts'
    )
    const rows = [
      { id: 'null', detail_label: null },
      { id: 'empty', detail_label: '' },
      { id: 'spaces', detail_label: '   ' },
      { id: 'valid', detail_label: 'Al-Lail' },
    ]
    t.mock.method(supabase, 'from', (table) => {
      const query = {
        select: () => query,
        eq: () => query,
        in: () => query,
        order: () => query,
        then(resolve) {
          return Promise.resolve({
            data:
              table === 'lupg_character_target_templates'
                ? [{ id: 't' }]
                : rows,
            error: null,
          }).then(resolve)
        },
      }
      return query
    })

    const result = await listActiveCharacterTargetItemsForMonth(2026, 9)
    assert.deepEqual(
      result.items.map((item) => item.id),
      ['valid']
    )
  } finally {
    await vite.close()
  }
})

test('single target report payload preserves omitted fields', async (t) => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { supabase } = await vite.ssrLoadModule('/src/lib/supabase.ts')
    const { upsertCharacterTargetReport } = await vite.ssrLoadModule(
      '/src/features/lupg/services/character-targets.service.ts'
    )
    let payload
    t.mock.method(supabase, 'from', () => {
      const query = {
        upsert(next) {
          payload = next
          return query
        },
        select: () => query,
        single: async () => ({ data: payload, error: null }),
      }
      return query
    })

    await upsertCharacterTargetReport({
      monthly_report_id: 'report',
      target_item_id: 'item',
      realization_percent: 75,
    })
    assert.deepEqual(payload, {
      monthly_report_id: 'report',
      target_item_id: 'item',
      realization_percent: 75,
    })

    await upsertCharacterTargetReport({
      monthly_report_id: 'report',
      target_item_id: 'item',
      notes: null,
    })
    assert.equal(payload.notes, null)
    assert.equal('discussion_flag' in payload, false)
    assert.equal('realization_percent' in payload, false)
  } finally {
    await vite.close()
  }
})
