import '@testing-library/jest-dom/vitest'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'

// These tests run without Vitest globals, so Testing Library's own auto-cleanup never
// registers. Without this, each render lands in a DOM still holding the previous test.
afterEach(cleanup)

// jsdom implements no layout, so it ships no ResizeObserver. Radix's dialog and tooltip
// observe their trigger to position themselves; a no-op is enough, because none of these
// tests assert on where a popover physically lands.
if (!('ResizeObserver' in globalThis)) {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
}
