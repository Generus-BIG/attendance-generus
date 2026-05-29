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
    rollupOptions: {
      output: {
        manualChunks(id) {
          const normalizedId = id.replace(/\\/g, '/')
          if (!normalizedId.includes('/node_modules/')) return

          if (normalizedId.includes('/node_modules/exceljs/')) return 'exceljs'
          if (normalizedId.includes('/node_modules/recharts/')) return 'charts'
          if (normalizedId.includes('/node_modules/@radix-ui/')) return 'radix-ui'
          if (normalizedId.includes('/node_modules/@tanstack/')) return 'tanstack'
          if (normalizedId.includes('/node_modules/@supabase/')) return 'supabase'
          if (
            normalizedId.includes('/node_modules/react/') ||
            normalizedId.includes('/node_modules/react-dom/') ||
            normalizedId.includes('/node_modules/scheduler/')
          ) {
            return 'react'
          }
        },
      },
    },
  },
})
