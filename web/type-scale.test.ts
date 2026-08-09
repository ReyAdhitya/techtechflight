import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { readdirSync, statSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * Every `text-*` a component asks for exists as a token.
 *
 * `text-caption` had twenty callers and no rule behind it for months. Nothing failed: an
 * unknown Tailwind utility emits no CSS, so every one of those elements quietly inherited
 * whatever its parent was and the board looked fine. A missing size is invisible in a way a
 * missing colour is not, which is exactly why it needs asserting rather than looking at.
 *
 * Read from source, the same idea as `page-frame.test.ts`: jsdom has no cascade to check
 * this against, and a render would only prove the element mounted.
 */

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function tsxFiles(dir: string): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'out') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) found.push(...tsxFiles(full))
    else if (full.endsWith('.tsx') && !full.endsWith('.test.tsx')) found.push(full)
  }
  return found
}

/**
 * Everything Tailwind ships under the `text-` prefix that this board is allowed to use
 * without a token: the sizes, and the alignment, wrapping and keyword colours that share
 * the prefix. Anything else has to exist in this stylesheet.
 */
const BUILT_IN = new Set([
  'xs', 'sm', 'base', 'lg', 'xl', '2xl', '3xl', '4xl', '5xl', '6xl',
  'left', 'center', 'right', 'justify', 'start', 'end',
  'balance', 'pretty', 'wrap', 'nowrap', 'ellipsis', 'clip',
  'inherit', 'current', 'transparent',
])

describe('the type scale', () => {
  it('defines a token for every text size a component asks for', () => {
    const asked = new Set<string>()
    for (const file of tsxFiles(resolve(process.cwd(), 'web'))) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/\btext-([a-z][a-z0-9-]*)\b/g)) {
        const name = match[1]!
        asked.add(name)
      }
    }

    const missing = [...asked].filter((name) => {
      if (BUILT_IN.has(name)) return false
      // Colours are `--color-*`; sizes are `--text-*`. Either one is a real token.
      return !CSS.includes(`--text-${name}:`) && !CSS.includes(`--color-${name}:`)
    })

    expect(missing, `no token behind: ${missing.join(', ')}`).toEqual([])
  })

  /*
   * ADR-0008. The scale follows the Teacher's own browser font size, so a `px` here
   * overrides an accessibility setting they chose on purpose.
   */
  it('states every size in rem', () => {
    for (const match of CSS.matchAll(/--text-[a-z-]+:\s*([^;]+);/g)) {
      const value = match[1]!.trim()
      if (value.startsWith('var(') || value.startsWith('calc(')) continue
      expect(value, match[0]).toMatch(/rem$|^1$/)
    }
  })

  /* Small print is refused on this surface. Data and captions are body-sized. */
  it('keeps data and captions no smaller than body', () => {
    expect(CSS).toContain('--text-value: 1rem;')
    expect(CSS).toContain('--text-caption: 1rem;')
    expect(CSS).toContain('--text-body: 1rem;')
  })
})
