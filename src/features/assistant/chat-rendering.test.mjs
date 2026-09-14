import { createServer } from 'vite'
import { createElement } from 'react'
import assert from 'node:assert/strict'
import test from 'node:test'
import { renderToStaticMarkup } from 'react-dom/server'

test('assistant Markdown renders semantic blocks and rejects executable HTML', async () => {
  const vite = await createServer({
    configFile: false,
    optimizeDeps: { noDiscovery: true },
    server: { middlewareMode: true, hmr: false, watch: null },
  })
  try {
    const { AssistantMarkdown } = await vite.ssrLoadModule(
      '/src/features/assistant/assistant-markdown.tsx'
    )
    const html = renderToStaticMarkup(
      createElement(AssistantMarkdown, {
        text: '# Sensus\n\n- **GPN A**\n- `GPN B`\n\n| Kategori | Total |\n| --- | ---: |\n| A | 62 |\n\n```js\nconst total = 62\n```\n\n<script>alert(1)</script>\n\n[bad](javascript:alert%281%29)',
      })
    )
    for (const tag of [
      'h1',
      'ul',
      'li',
      'strong',
      'table',
      'th',
      'td',
      'pre',
      'code',
    ])
      assert.match(html, new RegExp(`<${tag}[ >]`))
    assert.match(html, /overflow-x-auto/)
    assert.doesNotMatch(html, /<script|href="javascript:/)
    const partial = renderToStaticMarkup(
      createElement(AssistantMarkdown, { text: '```js\nconst total =' })
    )
    assert.match(partial, /<pre/)
  } finally {
    await vite.close()
  }
})
