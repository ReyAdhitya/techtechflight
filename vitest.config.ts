import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

// One runner across Node and JSX, per the spec's Testing Decisions. Each seam gets
// its own environment: the ground station is pure Node, the dashboard needs a DOM.
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
    ],
  },
})
