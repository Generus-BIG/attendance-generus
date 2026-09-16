import { createServer } from 'vite'
import { createElement } from 'react'
import {
  createMemoryHistory,
  createRootRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

test('UtilityHeader renders search with shortcut and right utility controls', async () => {
  const vite = await createServer({
    configFile: false,
    resolve: { alias: { '@': new URL('../../', import.meta.url).pathname } },
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { UtilityHeader } = await vite.ssrLoadModule(
      '/src/components/layout/utility-header.tsx'
    )
    const { SearchProvider } = await vite.ssrLoadModule(
      '/src/context/search-provider.tsx'
    )
    const { ThemeProvider } = await vite.ssrLoadModule(
      '/src/context/theme-provider.tsx'
    )
    const { LayoutProvider } = await vite.ssrLoadModule(
      '/src/context/layout-provider.tsx'
    )
    const { DirectionProvider } = await vite.ssrLoadModule(
      '/src/context/direction-provider.tsx'
    )
    const { PaletteProvider } = await vite.ssrLoadModule(
      '/src/context/palette-provider.tsx'
    )
    const { SidebarProvider } = await vite.ssrLoadModule(
      '/src/components/ui/sidebar.tsx'
    )

    const wrapWithProviders = (children) =>
      createElement(
        ThemeProvider,
        { defaultTheme: 'light', storageKey: 'vite-ui-theme-test' },
        createElement(
          DirectionProvider,
          null,
          createElement(
            PaletteProvider,
            null,
            createElement(
              LayoutProvider,
              null,
              createElement(
                SidebarProvider,
                null,
                createElement(SearchProvider, null, children)
              )
            )
          )
        )
      )

    const rootRoute = createRootRoute({
      component: () =>
        wrapWithProviders(createElement(UtilityHeader, { fixed: true })),
    })
    const router = createRouter({
      routeTree: rootRoute,
      history: createMemoryHistory({
        initialEntries: ['/admin/absensi/assistant'],
      }),
    })

    await router.load()
    const html = renderToStaticMarkup(createElement(RouterProvider, { router }))

    // Check search button and keyboard shortcut
    assert.match(html, /Search/, 'renders Search placeholder/text')
    assert.match(html, /⌘<\/span>K/, 'renders ⌘K keyboard shortcut')

    // Check utility controls
    assert.match(html, /Toggle theme/, 'renders theme switch sr-only label')
    assert.match(html, /Open theme settings/, 'renders settings drawer button')
    assert.match(
      html,
      /ms-auto flex items-center space-x-4/,
      'renders right-aligned controls container'
    )

    // Check fixed header styling
    assert.match(
      html,
      /header-fixed peer\/header sticky top-0/,
      'preserves fixed header positioning'
    )

    const customRouter = createRouter({
      routeTree: createRootRoute({
        component: () =>
          wrapWithProviders(
            createElement(UtilityHeader, {
              leftSlot: createElement('span', null, 'Custom Left'),
              rightSlot: createElement('span', null, 'Custom Right'),
            })
          ),
      }),
      history: createMemoryHistory({ initialEntries: ['/'] }),
    })
    await customRouter.load()
    const customHtml = renderToStaticMarkup(
      createElement(RouterProvider, { router: customRouter })
    )
    assert.match(customHtml, /Custom Left/, 'renders custom leftSlot')
    assert.match(customHtml, /Custom Right/, 'renders custom rightSlot')
  } finally {
    await vite.close()
  }
})

test('assistant-page integrates UtilityHeader and preserves chat viewport layout', async () => {
  const fs = await import('node:fs/promises')
  const content = await fs.readFile(
    new URL('./assistant-page.tsx', import.meta.url),
    'utf-8'
  )
  assert.match(
    content,
    /import \{ UtilityHeader \} from '@\/components\/layout\/utility-header'/
  )
  assert.match(content, /<UtilityHeader fixed \/>/)
  assert.doesNotMatch(
    content,
    /<Header fixed>\s*<span className='text-sm font-medium'>/
  )
  assert.match(content, /<Main fixed fluid className='min-h-0 p-0'>/)
  assert.match(content, /activeThread \?\? crypto\.randomUUID\(\)/)
  assert.match(content, /id: threadId/)
  assert.match(content, /key=\{renameTarget\?\.id \?\? 'closed'\}/)
  assert.doesNotMatch(content, /MessageDeleteContext|Delete response/)
})

test('assistant history recovery exposes retry actions', async () => {
  const fs = await import('node:fs/promises')
  const content = await fs.readFile(
    new URL('./assistant-page.tsx', import.meta.url),
    'utf-8'
  )
  assert.match(content, /threadsQuery\.refetch\(\)/)
  assert.match(content, /historyQuery\.refetch\(\)/)
  assert.match(content, /Could not restore this conversation\. Try again\./)
})
