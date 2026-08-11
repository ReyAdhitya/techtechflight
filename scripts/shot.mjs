/**
 * Screenshot a route of the built board, for looking at rather than testing.
 *
 *   node scripts/shot.mjs <label> <route> <width> [height]
 *
 * The whole test suite is jsdom, which has no layout engine: a broken flex axis, a wrong
 * aspect ratio and a strip whose columns are sized per-row all pass green. Every layout
 * defect this board has had was found by looking at it. This is how you look at it.
 *
 * Serves `web/out` rather than running `next dev`, so what is photographed is the artifact
 * a School is actually served — static export included. Build first.
 *
 * `height` is optional and clips from the top; omit it for the whole page. It is worth
 * omitting: a fixed 320px crop photographs the header and calls it the screen, which is
 * how a broken layout below the fold survives being "checked".
 *
 * Windows: Git Bash rewrites a bare `/route` into a path, so pass routes from PowerShell,
 * or without the leading slash.
 *
 * The board asks who is using the device before it renders anything (`RequireRole`), and a
 * fresh browser profile has never answered. Without a seeded role every shot of every
 * Teacher screen is a photograph of that door, which looks enough like a screen to be
 * mistaken for one. So the role is seeded, and `TTF_SHOT_ROLE=student` seeds the other one.
 *
 * `TTF_SHOT_THEME=dark` photographs the other theme. It both seeds the preference and stamps
 * the attribute back on after hydration, which is not belt and braces: hydration drops it.
 */
import { createServer } from 'node:http'
import { readdir, readFile, stat } from 'node:fs/promises'
import { homedir } from 'node:os'
import { extname, join, resolve } from 'node:path'
import { chromium } from 'playwright-core'

const OUT = resolve(process.cwd(), 'web/out')
const [, , label = 'shot', route = '/demo', width = '1280', height] = process.argv

/*
 * Resolved by hand because only `playwright-core` is installed — there is no bundled
 * browser download, and no `playwright` package to ask. Honours the same environment
 * variable Playwright itself does, so a machine that has moved its browsers still works.
 */
async function findChromium() {
  const root =
    process.env.PLAYWRIGHT_BROWSERS_PATH ||
    (process.platform === 'win32'
      ? join(homedir(), 'AppData', 'Local', 'ms-playwright')
      : process.platform === 'darwin'
        ? join(homedir(), 'Library', 'Caches', 'ms-playwright')
        : join(homedir(), '.cache', 'ms-playwright'))
  const candidates = [
    join('chrome-win', 'chrome.exe'),
    join('chrome-linux', 'chrome'),
    join('chrome-mac', 'Chromium.app', 'Contents', 'MacOS', 'Chromium'),
  ]
  for (const entry of (await readdir(root).catch(() => [])).sort().reverse()) {
    for (const s of candidates) {
      const p = join(root, entry, s)
      if (await stat(p).then(() => true, () => false)) return p
    }
  }
  return null
}

async function resolveFile(t, r) {
  const f = await stat(t).catch(() => null)
  if (f?.isFile()) return t
  if (t !== r) {
    const p = await stat(`${t}.html`).catch(() => null)
    if (p?.isFile()) return `${t}.html`
  }
  const i = join(f?.isDirectory() ? t : r, 'index.html')
  return (await stat(i).catch(() => null))?.isFile() ? i : null
}

// Said plainly rather than failing inside Playwright, because both of these are things a
// reader can fix in one command and neither is obvious from the stack trace it would throw.
if (!(await stat(OUT).catch(() => null))?.isDirectory()) {
  console.error(`No built board at ${OUT}.\nRun: npm run build --workspace=web`)
  process.exit(1)
}
const executablePath = await findChromium()
if (!executablePath) {
  console.error('No Chromium found.\nRun: npx playwright install chromium')
  process.exit(1)
}

const MIME = { '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2', '.png': 'image/png', '.txt': 'text/plain' }
const server = createServer(async (rq, rs) => {
  const p = new URL(rq.url ?? '/', 'http://x').pathname
  const f = await resolveFile(resolve(join(OUT, p)), OUT)
  if (!f) return rs.writeHead(404).end('nf')
  rs.writeHead(200, { 'content-type': MIME[extname(f)] ?? 'application/octet-stream' }).end(await readFile(f))
})
await new Promise((d) => server.listen(0, d))
const port = server.address().port

const browser = await chromium.launch({ executablePath })
const page = await browser.newPage({ viewport: { width: Number(width), height: 900 } })
// Answered before the first script runs, or the board redirects to the door and stays there.
const role = process.env.TTF_SHOT_ROLE ?? 'teacher'
const theme = process.env.TTF_SHOT_THEME ?? 'light'
await page.addInitScript(
  (chosen) => {
    window.localStorage.setItem('techtechflight:board-role', chosen.role)
    window.localStorage.setItem('theme', chosen.theme)
  },
  { role, theme },
)
await page.goto(`http://localhost:${port}${route}`, { waitUntil: 'networkidle' })
/*
 * Stamped again after hydration, because a saved theme does not survive it: the boot script
 * in `layout.tsx` sets `data-theme` before paint and React drops the attribute on the way
 * past. The toggle works, so the theme itself is fine — but a dark shot taken without this
 * is a photograph of the light board, which is worse than no shot at all.
 */
await page.evaluate((chosen) => {
  document.documentElement.dataset.theme = chosen
}, theme)
// The board settles: fonts land, the first Fleet State arrives, ages start counting.
await page.waitForTimeout(2500)
const path = resolve(process.cwd(), `scripts/shots/${label}.png`)
await page.screenshot({
  path,
  ...(height ? { clip: { x: 0, y: 0, width: Number(width), height: Number(height) } } : { fullPage: true }),
})
await browser.close()
server.close()
console.log(path)
