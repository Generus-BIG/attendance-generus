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
