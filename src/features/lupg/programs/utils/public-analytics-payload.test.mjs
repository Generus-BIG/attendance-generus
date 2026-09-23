import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('public payload mapping keeps submitted recap and strips identities and private Mustin fields', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { mapPublicAnalyticsPayload } = await vite.ssrLoadModule(
      '/src/features/lupg/programs/utils/public-analytics-payload.ts'
    )
    const payload = {
      status: 'ok',
      share: { monthKey: '2026-09' },
      data: {
        kelompoks: [
          { key: 'group-1', name: 'BIG 1', id: 'private-group-uuid' },
        ],
        reports: [
          {
            kelompokKey: 'group-1',
            monthKey: '2026-09',
            status: 'submitted',
            submitted_by: 'private-user-uuid',
          },
          { kelompokKey: 'group-1', monthKey: '2026-08', status: 'draft' },
        ],
        programs: [{ code: 'TURBA', name: 'Turba' }],
        programValues: [
          {
            kelompokKey: 'group-1',
            monthKey: '2026-09',
            code: 'TURBA',
            count: 8,
            denominator: 10,
          },
        ],
        trendProgramValues: [
          {
            monthKey: '2026-08',
            code: 'TURBA',
            count: 10,
            denominator: 10,
          },
          {
            monthKey: '2026-09',
            code: 'TURBA',
            count: 8,
            denominator: 10,
          },
        ],
        metricValues: [],
        sarprasItems: [],
        sarprasValues: [],
        shodaqohValues: [],
        sensus: [{ category: 'ACR', count: 20 }],
        mustinNotes: [
          {
            kelompokKey: 'group-1',
            monthKey: '2026-09',
            pokokMasalah: 'Ringkasan lengkap yang sudah disubmit',
            keputusanRencana: 'Rencana tindak lanjut lengkap',
            status: 'open',
            sortOrder: 1,
            pic: 'Rahasia',
            deadline: '2026-09-30',
            id: 'private-note-uuid',
          },
          {
            kelompokKey: 'group-1',
            pokokMasalah: 'DRAFT RAHASIA',
            keputusanRencana: 'Draft',
            status: 'open',
            sortOrder: 2,
            reportMonthKey: '2026-08',
          },
        ],
        documentation: [
          {
            kelompokKey: 'group-1',
            monthKey: '2026-09',
            caption: 'Foto terkirim',
            signedUrl: 'https://signed.test/photo',
            storagePath: 'private/path.jpg',
            id: 'private-photo-uuid',
          },
        ],
      },
    }
    const result = mapPublicAnalyticsPayload(payload)
    assert.ok(result)
    assert.equal(result.data.mustinNotes.length, 1)
    assert.equal(
      result.data.mustinNotes[0].pokokMasalah,
      'Ringkasan lengkap yang sudah disubmit'
    )
    assert.equal(
      result.data.documentation[0].signedUrl,
      'https://signed.test/photo'
    )
    assert.equal(
      result.data.trendRataDesa.find((point) => point.monthKey === '2026-08')
        ?.value,
      100
    )
    const serialized = JSON.stringify(result)
    for (const forbidden of [
      'private-group-uuid',
      'private-user-uuid',
      'private-note-uuid',
      'private-photo-uuid',
      'Rahasia',
      'deadline',
      'storagePath',
      'DRAFT RAHASIA',
    ]) {
      assert.doesNotMatch(serialized, new RegExp(forbidden, 'i'))
    }
  } finally {
    await vite.close()
  }
})

test('public payload maps selected month with rolling 12-month trend and omits Mustin status', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { mapPublicAnalyticsPayload } = await vite.ssrLoadModule(
      '/src/features/lupg/programs/utils/public-analytics-payload.ts'
    )
    const months2025 = Array.from(
      { length: 12 },
      (_, i) => `2025-${String(i + 1).padStart(2, '0')}`
    )
    const payload = {
      status: 'ok',
      share: {
        initialMonthKey: '2026-09',
        selectedMonthKey: '2025-12',
        availableMonthKeys: ['2025-12', '2026-09'],
      },
      data: {
        kelompoks: [{ key: 'group-1', name: 'BIG 1' }],
        reports: months2025.map((monthKey) => ({
          kelompokKey: 'group-1',
          monthKey,
          status: 'submitted',
        })),
        programs: [{ code: 'TURBA', name: 'Turba' }],
        programValues: months2025.map((monthKey) => ({
          kelompokKey: 'group-1',
          monthKey,
          code: 'TURBA',
          count: 8,
          denominator: 10,
        })),
        metricValues: [],
        sarprasItems: [],
        sarprasValues: [],
        shodaqohValues: [],
        sensus: [{ category: 'ACR', count: 20 }],
        mustinNotes: [
          {
            kelompokKey: 'group-1',
            monthKey: '2025-12',
            pokokMasalah: 'Masalah Desember',
            keputusanRencana: 'Rencana Desember',
            status: 'done',
            sortOrder: 1,
          },
        ],
        documentation: [],
      },
    }
    const result = mapPublicAnalyticsPayload(payload)
    assert.ok(result)
    assert.equal(result.data.monthKey, '2025-12')
    assert.deepEqual(
      result.data.trendRataDesa.map((point) => point.monthKey),
      [
        '2025-01',
        '2025-02',
        '2025-03',
        '2025-04',
        '2025-05',
        '2025-06',
        '2025-07',
        '2025-08',
        '2025-09',
        '2025-10',
        '2025-11',
        '2025-12',
      ]
    )
    assert.deepEqual(result.availableMonthKeys, ['2025-12', '2026-09'])
    assert.doesNotMatch(JSON.stringify(result), /"status"/)
  } finally {
    await vite.close()
  }
})
