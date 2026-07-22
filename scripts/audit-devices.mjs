/**
 * Every screen, on the devices a Teacher actually holds.
 *
 * Two things are checked and neither can be read off a stylesheet. Tap targets are
 * **hit-tested** — `elementFromPoint` at the centre of each control — because a rule that
 * says 44px means nothing if something else is painted over it, which is exactly the bug
 * this found on a tablet once already. And the page is checked for horizontal overflow,
 * because a board that scrolls sideways on a phone has lost the layout it was designed in.
 *
 * Run against a built board:
 *   npm run build --workspace=web
 *   node scripts/audit-devices.mjs
 */
import { createServer } from 'node:http'
import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { chromium, devices } from 'playwright-core'

/**
 * Whichever Chromium this machine already has.
 *
 * playwright-core ships no browser and expects the exact build it was released against;
 * an audit that demands a 150MB download before it will run is an audit nobody runs.
 */
async function findChromium() {
  const root = join(homedir(), 'AppData', 'Local', 'ms-playwright')
  const candidates = await readdir(root).catch(() => [])
  for (const entry of candidates.sort().reverse()) {
    for (const suffix of [
      join('chrome-win', 'chrome.exe'),
      join('chrome-linux', 'chrome'),
      join('chrome-headless-shell-win64', 'chrome-headless-shell.exe'),
    ]) {
      const path = join(root, entry, suffix)
      if (await stat(path).then(() => true, () => false)) return path
    }
  }
  return null
}

const OUT = resolve(process.cwd(), 'web/out')
const ROUTES = ['/demo', '/control', '/lesson', '/students', '/reports', '/settings']

/** The smallest a finger reliably hits. Everything on a touch screen has to clear it. */
const MIN_TAP = 44

const PROFILES = [
  { name: 'iPhone SE', device: devices['iPhone SE'] },
  { name: 'iPhone 12', device: devices['iPhone 12'] },
  { name: 'iPhone 14 Pro Max', device: devices['iPhone 14 Pro Max'] },
  { name: 'Pixel 7', device: devices['Pixel 7'] },
  { name: 'Galaxy S9+', device: devices['Galaxy S9+'] },
  { name: 'Galaxy Tab S4', device: devices['Galaxy Tab S4'] },
  { name: 'iPad Mini', device: devices['iPad Mini'] },
  { name: 'iPad Pro 11', device: devices['iPad Pro 11'] },
]

const WIDTHS = [
  { name: 'laptop 1280', viewport: { width: 1280, height: 800 } },
  { name: 'desktop 1680', viewport: { width: 1680, height: 1050 } },
  { name: 'projector 1920', viewport: { width: 1920, height: 1080 } },
]

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.woff2': 'font/woff2',
  '.png': 'image/png',
  '.txt': 'text/plain; charset=utf-8',
}

/** The same clean-URL rule the ground station serves the board with. */
async function resolveFile(target, root) {
  const asFile = await stat(target).catch(() => null)
  if (asFile?.isFile()) return target
  if (target !== root) {
    const asPage = await stat(`${target}.html`).catch(() => null)
    if (asPage?.isFile()) return `${target}.html`
  }
  const index = join(asFile?.isDirectory() ? target : root, 'index.html')
  const asIndex = await stat(index).catch(() => null)
  return asIndex?.isFile() ? index : null
}

async function serve() {
  const server = createServer(async (request, response) => {
    const path = new URL(request.url ?? '/', 'http://localhost').pathname
    const file = await resolveFile(resolve(join(OUT, path)), OUT)
    if (!file) return response.writeHead(404).end('not found')
    response
      .writeHead(200, { 'content-type': MIME[extname(file)] ?? 'application/octet-stream' })
      .end(await readFile(file))
  })
  await new Promise((done) => server.listen(0, done))
  return { server, port: server.address().port }
}

/**
 * What is wrong with this page, from the page's own point of view.
 *
 * Runs in the browser so it can measure what was actually laid out rather than what the
 * CSS asked for.
 */
const inspect = ({ minTap }) => {
  const problems = []

  const doc = document.documentElement
  if (doc.scrollWidth > doc.clientWidth + 1) {
    problems.push({
      kind: 'overflow',
      detail: `page scrolls sideways by ${doc.scrollWidth - doc.clientWidth}px`,
    })
  }

  const controls = [...document.querySelectorAll('a[href], button, input, select, [tabindex]')]
  for (const control of controls) {
    const box = control.getBoundingClientRect()
    if (box.width === 0 || box.height === 0) continue
    const label = (control.getAttribute('aria-label') || control.textContent || control.tagName)
      .trim()
      .slice(0, 40)

    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    if (x < 0 || y < 0 || x > window.innerWidth || y > window.innerHeight) continue

    /*
     * Hit-tested before it is measured, and that order is the whole point.
     *
     * A small control inside a tile whose overlay covers the tile is not a small target —
     * the tile is the target, and a Teacher taps anywhere on it. Measuring the button's
     * own box would report a problem that does not exist. Conversely a control of exactly
     * the right size with something painted over it is a target that cannot be hit at all,
     * and no measurement of its box would ever say so.
     */
    const hit = document.elementFromPoint(x, y)
    if (!hit) continue

    let effective = control
    if (hit !== control && !control.contains(hit)) {
      if (hit.contains(control)) {
        // An ancestor owns the tap. That ancestor is the real target.
        effective = hit
      } else {
        problems.push({
          kind: 'covered',
          detail: `${label} is covered by <${hit.tagName.toLowerCase()}>`,
        })
        continue
      }
    }

    /*
     * Probed rather than measured, which is the only honest version of this question.
     *
     * A control's box says nothing about the area that responds to a tap. Several here
     * deliberately expand theirs with an absolutely positioned `::after` — the whole tile
     * is the Details button — and a pseudo-element appears in no rectangle the DOM will
     * hand you. So the question asked is the one that matters: if a finger lands anywhere
     * within 44px centred on this control, does it reach it?
     */
    const reach = minTap / 2 - 1
    const owns = (px, py) => {
      if (px < 0 || py < 0 || px > window.innerWidth || py > window.innerHeight) return true
      const at = document.elementFromPoint(px, py)
      return at === control || control.contains(at) || (effective !== control && at === effective)
    }
    const missed = [
      [x - reach, y],
      [x + reach, y],
      [x, y - reach],
      [x, y + reach],
    ].filter(([px, py]) => !owns(px, py))

    if (missed.length > 0) {
      const target = effective.getBoundingClientRect()
      problems.push({
        kind: 'small',
        detail: `${label} is ${Math.round(target.width)}×${Math.round(target.height)}, missing ${missed.length} of 4 edges`,
      })
    }
  }

  return problems
}

const { server, port } = await serve()
const executablePath = await findChromium()
if (!executablePath) {
  console.error('No Chromium found. Run `npx playwright install chromium`.')
  process.exit(2)
}
const browser = await chromium.launch({ executablePath })
let failures = 0

for (const profile of [...PROFILES, ...WIDTHS]) {
  const context = await browser.newContext(profile.device ?? { viewport: profile.viewport })
  for (const route of ROUTES) {
    const page = await context.newPage()
    const consoleErrors = []
    page.on('pageerror', (error) => consoleErrors.push(String(error)))
    await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' })
    // Let the simulated Fleet report at least once, so nothing is measured mid-empty.
    await page.waitForTimeout(1500)

    const problems = await page.evaluate(inspect, { minTap: MIN_TAP })
    const all = [...problems, ...consoleErrors.map((detail) => ({ kind: 'error', detail }))]
    if (all.length > 0) {
      failures += all.length
      console.log(`\n✗ ${profile.name} ${route}`)
      for (const problem of all) console.log(`    ${problem.kind}: ${problem.detail}`)
    }
    await page.close()
  }
  await context.close()
  console.log(`${failures === 0 ? '✓' : '·'} ${profile.name}`)
}

await browser.close()
server.close()

console.log(
  failures === 0
    ? `\nClean across ${PROFILES.length} devices and ${WIDTHS.length} widths, ${ROUTES.length} routes each.`
    : `\n${failures} problems.`,
)
process.exit(failures === 0 ? 0 : 1)
