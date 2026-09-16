import { createServer } from 'vite'
import assert from 'node:assert/strict'
import test from 'node:test'

test('assistant navigation exposes both routes to admins only', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    optimizeDeps: { noDiscovery: true, include: [] },
    appType: 'custom',
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { ROUTE_ACCESS, ROLES } = await vite.ssrLoadModule('/src/lib/rbac.ts')
    const routes = ['/admin/absensi/assistant', '/admin/lupg/assistant']
    for (const route of routes) {
      assert.deepEqual(ROUTE_ACCESS[route], ['super_admin', 'admin'])
      for (const role of ROLES) {
        let best = null
        for (const path of Object.keys(ROUTE_ACCESS)) {
          if (
            route.startsWith(path) &&
            (best === null || path.length > best.length)
          )
            best = path
        }
        const allowed =
          best !== null &&
          ROUTE_ACCESS[best].includes(role) &&
          !(
            role === 'mt' &&
            route !== '/admin' &&
            route !== '/admin/' &&
            route !== '/admin/403' &&
            (best === null || !ROUTE_ACCESS[best].includes(role))
          )
        assert.equal(
          allowed,
          role === 'super_admin' || role === 'admin',
          `${route} for ${role}`
        )
      }
    }
    const { getAbsensiNavGroups } = await vite.ssrLoadModule(
      '/src/components/layout/data/sidebar-data-absensi.ts'
    )
    const { getLupgNavGroups } = await vite.ssrLoadModule(
      '/src/components/layout/data/sidebar-data-lupg.ts'
    )
    const flatten = (groups) =>
      groups.flatMap((group) =>
        group.items.flatMap((item) =>
          item.url ? [item.url] : (item.items ?? []).map((child) => child.url)
        )
      )
    for (const role of ROLES) {
      const absensi = flatten(getAbsensiNavGroups(role))
      const lupg = flatten(getLupgNavGroups(role))
      if (role === 'super_admin' || role === 'admin') {
        assert.ok(
          absensi.includes('/admin/absensi/assistant'),
          `absensi sidebar for ${role}`
        )
        assert.ok(
          lupg.includes('/admin/lupg/assistant'),
          `lupg sidebar for ${role}`
        )
      } else {
        assert.ok(!absensi.includes('/admin/absensi/assistant'))
        assert.ok(!lupg.includes('/admin/lupg/assistant'))
      }
    }
  } finally {
    await vite.close()
  }
})
