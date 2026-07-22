import { readFileSync, readdirSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The lines the architecture draws, checked rather than agreed.
 *
 * Rules that live only in a document get broken by the next person in a hurry, and the
 * breakage is invisible — nothing fails, the screens still work, and a seam quietly stops
 * being one. These are cheap to check and expensive to lose.
 *
 * The remaining boundary, that the Fleet core may never reach for Node, is enforced by
 * `fleet-core/tsconfig.json` instead: it fails the build rather than a test, which is
 * stronger, so it is deliberately not repeated here.
 */

const WEB = resolve(process.cwd(), 'web')

function sourcesUnder(directory: string): readonly string[] {
  const found: string[] = []
  for (const entry of readdirSync(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === '.next' || entry.name === 'out') continue
      found.push(...sourcesUnder(path))
    } else if (/\.tsx?$/.test(entry.name) && !/\.test\.tsx?$/.test(entry.name)) {
      found.push(path)
    }
  }
  return found
}

/** Every module a file pulls in, however it spells the import. */
function importsOf(file: string): readonly string[] {
  const source = readFileSync(file, 'utf8')
  return [...source.matchAll(/from\s+'([^']+)'|import\s+'([^']+)'/g)].map(
    (match) => match[1] ?? match[2] ?? '',
  )
}

const offenders = (directories: readonly string[], forbidden: (specifier: string) => boolean) =>
  directories
    .flatMap((directory) => sourcesUnder(join(WEB, directory)))
    .filter((file) => importsOf(file).some(forbidden))
    .map((file) => relative(WEB, file).replaceAll('\\', '/'))

describe('what a screen is allowed to know', () => {
  it('never reaches for the simulator', () => {
    /*
     * The simulator has its own entry point so this is a rule about one specifier rather
     * than about a directory. A screen that imported it would be a screen that behaves
     * differently in a demonstration than in a School, which is the whole failure the
     * FleetLink seam exists to prevent.
     */
    expect(
      offenders(['components', 'app'], (specifier) => specifier.includes('fleet-core/simulator')),
    ).toEqual([])
  })

  it('reads a Fleet through the seam, never from the Fleet core itself', () => {
    // Status is derived by whatever owns the Fleet and never by a board. A component
    // holding a GroundStation would be a second opinion about what a Drone is doing.
    expect(
      offenders(['components', 'app'], (specifier) => specifier === '@techtechflight/fleet-core'),
    ).toEqual([])
  })
})

describe('what the logic layer is allowed to know', () => {
  it('never reaches back into the screens', () => {
    // Keeps everything derived testable without a DOM, which is why vitals has 44 tests
    // and the screens that draw it need none to cover the same ground.
    expect(
      offenders(['lib'], (specifier) => /^(@\/)?components\//.test(specifier.replace('@/', ''))),
    ).toEqual([])
  })
})
