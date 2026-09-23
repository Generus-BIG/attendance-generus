import { createServer } from 'vite'
import React from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

test('shared overview keeps attendance, grouped recap and unavailable photos without admin links', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { DesaOverviewDashboard } = await vite.ssrLoadModule(
      '/src/features/lupg/programs/components/desa-overview/desa-overview-dashboard.tsx'
    )
    const categories = ['ACR', 'APR', 'AR', 'GPN A', 'GPN B'].map(
      (name, index) => ({
        code: name,
        name,
        pct: index ? null : 76,
        trend: 'none',
      })
    )
    const data = {
      year: 2026,
      monthKey: '2026-09',
      kelompoks: [{ id: 'group-1', name: 'BIG 1' }],
      summary: {
        desaAvg: 80,
        sensusActive: 20,
        kehadiranAvg: 76,
        programOkCount: 1,
        sarprasOkCount: 0,
        shodaqohMtd: 500000,
        deltaDesaAvg: null,
        deltaSensus: null,
        deltaKehadiran: null,
        deltaShodaqoh: null,
      },
      attendance: {
        generus: { categories, average: 76, previousAverage: null },
        piket: {
          categories: categories.map((row) => ({ ...row, pct: 100 })),
          average: 100,
          previousAverage: 100,
        },
      },
      trendRataDesa: Array.from({ length: 12 }, (_, index) => ({
        monthKey: `2026-${String(index + 1).padStart(2, '0')}`,
        value: index === 8 ? 80 : null,
      })),
      sensusByCategory: [{ category: 'ACR', count: 20, pct: 100 }],
      programRanked: [{ code: 'TURBA', name: 'Turba', pct: 80 }],
      programKelompokMatrix: [
        { code: 'TURBA', name: 'Turba', byKelompok: { 'group-1': null } },
      ],
      programTrendLines: [
        { code: 'TURBA', name: 'Turba', monthly: Array(12).fill(null) },
      ],
      sarprasCompleteness: [
        {
          kelompokId: 'group-1',
          kelompokName: 'BIG 1',
          items: [true, false],
          okCount: 1,
          total: 2,
        },
      ],
      shodaqohPerKelompok: [
        { kelompokId: 'group-1', kelompokName: 'BIG 1', nominal: 500000 },
      ],
      mustinNotes: [
        {
          id: 'note-1',
          kelompokName: 'BIG 1',
          pokokMasalah: 'Kehadiran perlu ditingkatkan',
          keputusanRencana: 'Diskusi bersama orang tua',
          status: 'open',
          sortOrder: 0,
        },
        {
          id: 'note-2',
          kelompokName: 'BIG 1',
          pokokMasalah: 'Hafalan tertinggal',
          keputusanRencana: 'Jadwal murajaah tambahan',
          status: 'done',
          sortOrder: 1,
        },
        {
          id: 'note-3',
          kelompokName: 'BIG 2',
          pokokMasalah: 'Sarpras kurang',
          keputusanRencana: 'Koordinasi lintas kelompok',
          status: 'in_progress',
          sortOrder: 0,
        },
      ],
      documentation: [
        {
          id: 'photo-1',
          kelompokName: 'BIG 1',
          caption: 'Kegiatan belajar pagi',
          signedUrl: 'https://example.com/photo-1.jpg',
        },
        {
          id: 'photo-2',
          kelompokName: 'BIG 1',
          caption: 'Kegiatan belajar sore',
          signedUrl: 'https://example.com/photo-2.jpg',
        },
        {
          id: 'photo-3',
          kelompokName: 'BIG 2',
          caption: 'Kerja bakti',
          signedUrl: null,
        },
      ],
    }
    const html = renderToStaticMarkup(
      React.createElement(DesaOverviewDashboard, {
        data,
        year: 2026,
        monthKey: '2026-09',
        readOnly: true,
      })
    )
    assert.match(html, /Kehadiran Average Generus/)
    assert.match(html, /role="tab"[^>]*>Kehadiran/)
    assert.match(html, /role="tab"[^>]*>Piket LUPG/)
    assert.match(html, /Foto tidak tersedia/)
    assert.match(html, /Diskusi bersama orang tua/)
    assert.match(html, /Jadwal murajaah tambahan/)
    assert.match(html, /Koordinasi lintas kelompok/)
    assert.strictEqual(html.match(/<details/g)?.length ?? 0, 2)
    assert.doesNotMatch(html, /Open/)
    assert.doesNotMatch(html, /Dalam Proses/)
    assert.doesNotMatch(html, /Selesai/)
    assert.doesNotMatch(html, /In Progress/)
    assert.doesNotMatch(html, /Done/)
    const docsHtml = html.slice(html.indexOf('Dokumentasi Kegiatan'))
    assert.strictEqual(docsHtml.match(/>BIG 1</g)?.length ?? 0, 1)
    assert.strictEqual(docsHtml.match(/>BIG 2</g)?.length ?? 0, 1)
    assert.match(html, /<table/)
    assert.match(html, /—/)
    assert.doesNotMatch(html, /href="[^\"]*\/admin\/lupg\//)
    assert.doesNotMatch(html, /\bPIC\b|Deadline|Tenggat/)
  } finally {
    await vite.close()
  }
})
