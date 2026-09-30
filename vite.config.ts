import path from 'path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
import tailwindcss from '@tailwindcss/vite'
import { tanstackRouter } from '@tanstack/router-plugin/vite'

// https://vite.dev/config/
export default defineConfig({
  plugins: [
    tanstackRouter({
      target: 'react',
      autoCodeSplitting: true,
    }),
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  build: {
    target: 'baseline-widely-available',
    sourcemap: false,
    // ExcelJS is one lazy-loaded prebuilt module. The bundle regression check
    // keeps every other chunk under 500 kB and ExcelJS under 1,000 kB.
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (
            id.includes('commonjsHelpers') ||
            /\/node_modules\/tslib\//.test(id)
          )
            return 'vendor-runtime'
          const packagePath = id.split('/node_modules/').pop()
          if (!id.includes('/node_modules/') || !packagePath) return
          if (
            /^(react|react-dom|scheduler|use-sync-external-store)\//.test(
              packagePath
            )
          )
            return 'vendor-react'
          if (packagePath.startsWith('zod/')) return 'vendor-zod'
          if (packagePath.startsWith('@supabase/')) return 'vendor-supabase'
          if (/^(@assistant-ui\/|assistant-stream\/)/.test(packagePath))
            return 'vendor-assistant'
          if (
            /^(react-markdown|remark-[^/]+|rehype-[^/]+|micromark[^/]*|mdast-util-[^/]+|hast-util-[^/]+|unist-util-[^/]+|unified)\//.test(
              packagePath
            )
          )
            return 'vendor-markdown'
        },
      },
    },
  },
  server: {
    proxy: {
      '/api/assistant': {
        target: `http://localhost:${process.env.ASSISTANT_PORT ?? 4111}`,
        rewrite: (path) => path.replace(/^\/api\/assistant/, '/assistant'),
      },
    },
  },
})
