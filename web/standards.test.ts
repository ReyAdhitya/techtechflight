import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative, resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * The four standards nobody checked, pinned so that nobody has to check them again.
 *
 * The front-end review of PR #655 stalled on its Standards axis and produced no output for
 * it, so px font-sizes, raw colour literals, the PIN's storage model and the Drone limit went
 * unexamined by anybody. **A missing pass reads exactly like a clean one**, which is how a
 * defect survives a review that found two others.
 *
 * Three of the four were clean when run by hand. This file is what stops that being a fact
 * about one afternoon.
 */

const WEB = resolve(process.cwd(), 'web')
const CSS = readFileSync(join(WEB, 'app/globals.css'), 'utf8')
const SHOWCASE_CSS = readFileSync(join(WEB, 'app/showcase/showcase.css'), 'utf8')

function sourceFiles(dir: string, ...extensions: string[]): string[] {
  const found: string[] = []
  for (const entry of readdirSync(dir)) {
    if (entry === 'node_modules' || entry === '.next' || entry === 'out') continue
    const full = join(dir, entry)
    if (statSync(full).isDirectory()) {
      found.push(...sourceFiles(full, ...extensions))
      continue
    }
    if (full.endsWith('.test.ts') || full.endsWith('.test.tsx')) continue
    if (extensions.some((extension) => full.endsWith(extension))) found.push(full)
  }
  return found
}

const at = (file: string) => relative(process.cwd(), file).replace(/\\/g, '/')

/**
 * ADR-0008: the scale is `rem` so it follows the Teacher's own browser font size. A `px`
 * font-size overrides an accessibility setting somebody chose on purpose.
 */
describe('no px font-size anywhere', () => {
  it('holds in both stylesheets', () => {
    for (const [name, css] of [['globals.css', CSS], ['showcase.css', SHOWCASE_CSS]] as const) {
      const offenders = [...css.matchAll(/font-size:\s*([^;]+);/g)]
        .map((match) => match[1]!.trim())
        .filter((value) => /\d(\.\d+)?px/.test(value))
      expect(offenders, `${name}: ${offenders.join(', ')}`).toEqual([])
    }
  })

  it('holds in the markup', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(WEB, '.ts', '.tsx')) {
      const source = readFileSync(file, 'utf8')
      for (const match of source.matchAll(/\btext-\[[^\]]*?\d(?:\.\d+)?px[^\]]*\]/g)) {
        offenders.push(`${at(file)}: ${match[0]}`)
      }
      for (const match of source.matchAll(/fontSize:\s*['"`][^'"`]*px/g)) {
        offenders.push(`${at(file)}: ${match[0]}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })
})

/**
 * Semantic tokens only. A hex in markup is a colour that cannot follow the theme, cannot be
 * re-checked for contrast, and will be light-on-white the first time somebody prints it.
 *
 * Three exemptions, and each is a place CSS custom properties genuinely cannot reach:
 *
 * - **`<canvas>`**, which takes strings and knows nothing about a stylesheet. The detection
 *   palette, the detector self-test image and the photo watermark are all canvas.
 * - **The `themeColor` meta**, read by the browser chrome before any CSS exists. Pinned below
 *   against the tokens it has to match, because nothing else could catch it drifting.
 * - **Print stylesheets injected as strings**, which are paper values by definition and are
 *   the same two the `@media print` block in `globals.css` already hardcodes for the same
 *   reason.
 */
describe('no raw colour in markup', () => {
  const CANVAS_ONLY = ['lib/detection-palette.ts', 'lib/detector-selftest.ts', 'lib/photo-evidence.ts', 'lib/yolo-onnx-detector.ts']
  const PAPER = ['components/LessonOnePager.tsx', 'components/MissionReport.tsx', 'components/TeamBriefPrint.tsx']
  const META = ['app/layout.tsx']
  const exempt = (file: string) =>
    [...CANVAS_ONLY, ...PAPER, ...META].some((allowed) => at(file).endsWith(allowed))

  it('holds everywhere a Teacher or a Student looks', () => {
    const offenders: string[] = []
    for (const file of sourceFiles(WEB, '.ts', '.tsx')) {
      if (exempt(file)) continue
      const source = readFileSync(file, 'utf8')
        // Comments carry issue numbers, and `#628` looks exactly like a colour.
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/^\s*\/\/.*$/gm, '')
      for (const match of source.matchAll(/#[0-9a-fA-F]{3}(?:[0-9a-fA-F]{3})?\b|\brgb\(|\bhsl\(/g)) {
        offenders.push(`${at(file)}: ${match[0]}`)
      }
    }
    expect(offenders, offenders.join('\n')).toEqual([])
  })

  /* The browser chrome colour is HTML, not CSS, so only this can keep it honest. */
  it('keeps the browser chrome colour equal to the canvas it sits above', () => {
    const layout = readFileSync(join(WEB, 'app/layout.tsx'), 'utf8')
    const light = /--background:\s*(#[0-9a-f]{6});/.exec(CSS)?.[1]
    const dark = /\[data-theme="dark"\]\s*\{[\s\S]*?--background:\s*(#[0-9a-f]{6});/.exec(CSS)?.[1]

    expect(light).toBeDefined()
    expect(dark).toBeDefined()
    expect(layout, 'light themeColor drifted from --background').toContain(light!)
    expect(layout, 'dark themeColor drifted from --background').toContain(dark!)
  })
})

/**
 * The PIN never leaves the Teacher's own browser.
 *
 * It is a weak digest on purpose — `teacher-pin.ts` says exactly how weak and why — and the
 * whole of what makes that acceptable is that it is never transmitted, never synced and never
 * readable from the Student side. A future hand adding it to the classroom session or the
 * Blob push would turn a page lock into a broadcast.
 */
describe('the Teacher PIN stays on the Teacher device', () => {
  it('is never written into anything that syncs or is shared', () => {
    const shared = [
      'lib/classroom-session.ts',
      'lib/logbook.ts',
      'lib/logbook-sync.ts',
      'components/StudentMissionScreen.tsx',
      'components/StudentStepRail.tsx',
    ]
    for (const file of shared) {
      const source = readFileSync(join(WEB, file), 'utf8')
      expect(source, `${file} mentions the PIN`).not.toMatch(/teacher-pin|TeacherPin/)
    }
  })

  it('stores a digest rather than the digits', () => {
    const source = readFileSync(join(WEB, 'lib/teacher-pin.ts'), 'utf8')
    // The only `setItem` in the module writes `digest(pin)`, never `pin`.
    expect(source).toMatch(/setItem\(TEACHER_PIN_KEY, digest\(pin\)\)/)
    expect(source).not.toMatch(/setItem\(TEACHER_PIN_KEY, pin/)
  })
})

/**
 * There is no Drone limit, and the board says what it can show instead.
 *
 * The cap was removed in the last wave; nobody checked what happens at the sizes the plan
 * names. The arithmetic is checked here and the rendering was measured in a browser: 50 and
 * 200 Drones both settle in about five seconds, which is in the PR.
 */
describe('the Drone count has no ceiling', () => {
  it('keeps every id distinct well past the sizes anyone named', async () => {
    const { classroomFleet } = await import('@techtechflight/fleet-core/simulator')
    for (const size of [50, 200, 1_000]) {
      const fleet = classroomFleet(size)
      expect(fleet).toHaveLength(size)
      expect(new Set(fleet.map((drone) => drone.id)).size, `${size} has a duplicate id`).toBe(size)
      expect(new Set(fleet.map((drone) => drone.boardOrder)).size).toBe(size)
    }
  })

  it('has no maximum written down anywhere', () => {
    for (const file of sourceFiles(WEB, '.ts', '.tsx')) {
      expect(readFileSync(file, 'utf8'), at(file)).not.toMatch(/MAX_CLASSROOM_FLEET_SIZE/)
    }
    const core = readFileSync(
      resolve(process.cwd(), 'fleet-core/src/simulator/classroom-fleet.ts'),
      'utf8',
    )
    expect(core).not.toMatch(/MAX_CLASSROOM_FLEET_SIZE/)
  })
})
