import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

interface VercelRoute {
  readonly source: string
  readonly destination: string
}

interface VercelConfig {
  readonly redirects?: readonly VercelRoute[]
  readonly rewrites?: readonly VercelRoute[]
}

const config = JSON.parse(
  readFileSync(resolve(process.cwd(), 'vercel.json'), 'utf8'),
) as VercelConfig

describe('the standalone Vercel deployment', () => {
  /**
   * The root is the board, and gets there without a hop.
   *
   * It used to redirect to `/demo`, because that was once the only route that knew to use
   * fixtures rather than a socket. The build sets `NEXT_PUBLIC_DEMO_ONLY`, so every route
   * on this deployment now runs the Fleet in the browser and the root is already the
   * board — leaving the redirect as a bounce that put `/demo` in the address bar and made
   * the Fleet link in the navigation flicker on its way to where it already was.
   */
  it('serves the board at the root, without a redirect to get there', () => {
    expect(config.redirects ?? []).not.toContainEqual(
      expect.objectContaining({ source: '/' }),
    )
  })

  /**
   * The part of the original assertion worth keeping. `/showcase` is a design comparison
   * rather than the product, and whatever the mechanism, the root must never be it.
   */
  it('never routes the root to the maximalist experiment', () => {
    for (const route of [...(config.redirects ?? []), ...(config.rewrites ?? [])]) {
      expect(route).not.toEqual(
        expect.objectContaining({ source: '/', destination: '/showcase' }),
      )
    }
  })
})
