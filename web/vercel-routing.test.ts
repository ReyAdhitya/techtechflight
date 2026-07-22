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
  it('routes the root to the Readyboard demo instead of the maximalist experiment', () => {
    expect(config.redirects ?? []).toContainEqual({
      source: '/',
      destination: '/demo',
      permanent: false,
    })
    expect(config.redirects ?? []).not.toContainEqual(
      expect.objectContaining({ source: '/', destination: '/showcase' }),
    )
  })
})
