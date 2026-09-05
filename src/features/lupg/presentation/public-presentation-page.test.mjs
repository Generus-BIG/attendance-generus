import { createServer } from 'vite'
import React from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

test('presentation loading state is shared, accessible, and English-only', async () => {
  const vite = await createServer({
    appType: 'custom',
    server: { middlewareMode: true },
  })

  try {
    const { PresentationLoadingState } = await vite.ssrLoadModule(
      '/src/features/lupg/presentation/presentation-loading-state.tsx'
    )
    const { PublicPresentationPage } = await vite.ssrLoadModule(
      '/src/features/lupg/presentation/public-presentation-page.tsx'
    )
    const { PresentationPlayer } = await vite.ssrLoadModule(
      '/src/features/lupg/recap/presentation/player.tsx'
    )
    const queryClient = new QueryClient({
      defaultOptions: { queries: { retry: false } },
    })
    const sharedHtml = renderToStaticMarkup(
      React.createElement(PresentationLoadingState)
    )
    const publicHtml = renderToStaticMarkup(
      React.createElement(
        QueryClientProvider,
        { client: queryClient },
        React.createElement(PublicPresentationPage, { token: 'invalid' })
      )
    )
    const adminHtml = renderToStaticMarkup(
      React.createElement(PresentationPlayer, {
        monthKey: '2026-09',
        slides: [],
        isLoading: true,
      })
    )

    for (const html of [sharedHtml, publicHtml, adminHtml]) {
      assert.match(html, /data-presentation-loading="true"/)
      assert.match(html, /role="status"/)
      assert.match(html, /aria-busy="true"/)
      assert.match(html, /aspect-video/)
      assert.match(html, /data-logo-variant="2d"/)
      assert.match(html, /data-loading-percent="true"/)
      assert.match(html, /role="progressbar"/)
      assert.match(html, /aria-valuenow="\d+"/)
      assert.match(html, /\d+%/)
      assert.match(html, /tabular-nums/)
      assert.match(html, /presentation-loader-mark-2d\.png/)
      assert.match(html, /Preparing presentation/)
      assert.match(html, /Loading report data and latest documentation\./)
      assert.doesNotMatch(html, /animate-spin/)
      assert.doesNotMatch(html, /presentation-loader-mark-3d\.png/)
      assert.doesNotMatch(
        html,
        /Menyiapkan presentasi|Memuat data|Sedang memuat|Tayangan publik/
      )
    }
  } finally {
    await vite.close()
  }
})
