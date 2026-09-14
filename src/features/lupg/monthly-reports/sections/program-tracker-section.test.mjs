import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('report programs retain inactive GMSU and exclude other inactive definitions', async () => {
  const vite = await createServer({
    appType: 'custom',
    optimizeDeps: { noDiscovery: true, include: [] },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { selectReportPrograms } = await vite.ssrLoadModule(
      '/src/features/lupg/monthly-reports/sections/program-tracker-section.tsx'
    )
    const programs = [
      { code: 'CUSTOM', active: true },
      { code: 'SHOLAT_ACR', active: false },
      { code: 'GMKM', active: true },
      { code: 'GOMA', active: false },
      { code: 'PHQ', active: true },
    ]

    assert.deepEqual(
      selectReportPrograms(programs).map((program) => program.code),
      ['PHQ', 'GMKM', 'SHOLAT_ACR', 'CUSTOM']
    )
  } finally {
    await vite.close()
  }
})
