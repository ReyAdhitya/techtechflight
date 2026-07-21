import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    // Everything is bundled and served locally — no CDN, no internet (ADR-0002).
    assetsInlineLimit: 0,
  },
})
