import { fileURLToPath } from 'node:url'
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// One runner across Node and JSX, per the spec's Testing Decisions. Each seam gets its
// own environment: the Fleet core and the ground station are pure Node, the board needs
// a DOM.
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
        test: {
          name: 'fleet-core',
          environment: 'node',
          include: ['fleet-core/**/*.test.ts'],
        },
      },
      {
        test: {
          name: 'fleet-adapters',
          environment: 'node',
          include: ['fleet-adapters/**/*.test.ts'],
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
