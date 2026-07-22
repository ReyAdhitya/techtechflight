import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// One runner across Node and JSX, per the spec's Testing Decisions. Each seam gets
// its own environment: the ground station is pure Node, the boards need a DOM.
//
// There are two boards while the Next.js one is being brought up to the Vite one. Both
// run the same suite against the same Fleet State fixtures, which is what makes the
// comparison between them a fair one.
export default defineConfig({
  test: {
    projects: [
      {
        test: {
          name: 'ground-station',
          environment: 'node',
          include: ['ground-station/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'contract',
          environment: 'node',
          include: ['contract/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        test: {
          name: 'dashboard',
          environment: 'jsdom',
          setupFiles: ['./dashboard/src/test-setup.ts'],
          include: ['dashboard/**/*.test.tsx', 'dashboard/**/*.test.ts'],
        },
      },
      {
        plugins: [react()],
        resolve: {
          alias: {
            '@': fileURLToPath(new URL('./web', import.meta.url)),
          },
        },
        test: {
          name: 'web',
          environment: 'jsdom',
          setupFiles: ['./web/test-setup.ts'],
          include: ['web/**/*.test.tsx', 'web/**/*.test.ts'],
        },
      },
    ],
  },
})
