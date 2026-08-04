/**
 * Turn the 350-feature dataset into GitHub issues — 17 epics and 350 children.
 *
 * Resumable on purpose. GitHub secondary-rate-limits sustained content creation, so this
 * paces itself and, before writing anything, reads every existing issue title. A re-run
 * after a pause skips what already exists rather than duplicating it, which means the safe
 * response to any failure is simply to run it again.
 *
 * Usage: node scripts/create-feature-issues.mjs [--dry-run] [--limit N]
 */
import { readFileSync, writeFileSync } from 'node:fs'
import { execFileSync } from 'node:child_process'

const REPO = 'ReyAdhitya/techtechflight'
const PACE_MS = 1500

const SECTIONS = {
  1: 'Before the bell — prep, charge, the room',
  2: 'The first five minutes — assign and brief',
  3: 'While they are flying — the live surface',
  4: 'When it goes wrong',
  5: 'Cameras and what the drone sees',
  6: 'The Scope — where everything is',
  7: 'Landing and packing down',
  8: 'Replay',
  9: 'Reports and records',
  10: 'Pupils across the term',
  11: 'Looking after the fleet',
  12: 'The screen at the front of the room',
  13: 'The paperwork a school actually demands',
  14: 'Handing over to someone else',
  15: 'Setting it up and keeping it alive',
  16: 'Real conditions — the states nobody demos',
  17: 'The path to real drones',
  18: 'Mission scenarios, airspace and scoring',
}

const MILESTONE = {
  1: 'Wave 1 — quick wins',
  2: 'Wave 2 — replay spine',
  3: 'Wave 3 — shared screens',
  4: 'Wave 4+ — the long tail',
  5: 'Wave M1 — mission foundations',
  6: 'Wave M2 — Search and Rescue',
  7: 'Wave M3 — vision check',
  8: 'Wave M4 — the other scenarios',
  9: 'Wave M5 — emergencies',
  10: 'Wave M6 — scale and polish',
}

const dryRun = process.argv.includes('--dry-run')
const limitFlag = process.argv.indexOf('--limit')
const limit = limitFlag === -1 ? Infinity : Number(process.argv[limitFlag + 1])

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms))

function gh(args, input) {
  return execFileSync('gh', args, {
    encoding: 'utf8',
    input,
    maxBuffer: 64 * 1024 * 1024,
  }).trim()
}

function readFeatures() {
  // \r?\n, not \n: core.autocrlf is true here, so a checked-out TSV is CRLF and a bare \n
  // split would glue \r onto the acceptance column and put it in every issue body.
  const rows = readFileSync(new URL('../docs/agents/cursor/features.tsv', import.meta.url), 'utf8')
    .trim()
    .split(/\r?\n/)
  rows.shift()
  return rows.map((line) => {
    const [num, section, title, size, wave, files, acceptance] = line.split('\t')
    return {
      num: Number(num),
      section: Number(section),
      title,
      size,
      wave: Number(wave),
      files: files.split('|').filter(Boolean),
      acceptance,
    }
  })
}

/** Every issue title already on the repo, so a re-run never duplicates. */
function existingIssues() {
  const raw = gh([
    'issue',
    'list',
    '--repo',
    REPO,
    '--state',
    'all',
    '--limit',
    '1000',
    '--json',
    'number,title',
  ])
  const byTitle = new Map()
  for (const issue of JSON.parse(raw)) byTitle.set(issue.title, issue.number)
  return byTitle
}

function epicTitle(section) {
  return `epic [${section}] ${SECTIONS[section]}`
}

function childTitle(feature) {
  return `[${feature.section}] ${feature.num} · ${feature.title}`
}

function epicBody(section, features) {
  const rows = features
    .map((f) => `| ${f.num} | ${f.title} | ${f.size} | ${f.wave} |`)
    .join('\n')
  return `Part of the feature map — see \`docs/BACKLOG.md\` and \`docs/agents/cursor/features.tsv\`.

Section **${section} · ${SECTIONS[section]}** — ${features.length} features.

| # | Feature | Size | Wave |
|---|---|---|---|
${rows}

Sizes: XS under 30 min · S about an hour · M about half a day · L multi-day.
Waves are conflict classes, not priorities — see \`docs/agents/cursor/WAVES.md\`.
`
}

function childBody(feature, epicNumber) {
  const files = feature.files.map((f) => `- \`${f}\``).join('\n')
  return `**What a Teacher gets:** ${feature.title}.

**Acceptance:** ${feature.acceptance}

## Files this ticket owns

An agent working this ticket may create or edit **only** these files. Anything else is
another ticket's, and touching it is how a parallel wave corrupts itself.

${files}

Plus its own fragment at \`docs/changelog.d/<issue>.md\`. Do **not** edit
\`docs/CHANGELOG.md\` or \`docs/DECISIONS.md\` — they are merged serially at the end of the
wave (see \`docs/agents/cursor/AGENT-BRIEF.md\`).

## Constraints

- Read \`CLAUDE.md\`, \`docs/PLAYBOOK.md\`, \`docs/DESIGN-TOKENS.md\` and
  \`docs/DELIBERATE-POSITIONS.md\` first. They override default habits.
- Markup uses the **semantic** colour layer — \`bg-canvas\`, \`text-ink-subtle\`,
  \`border-hairline\`. Every size in \`rem\` (ADR-0008).
- Colour is never the sole carrier of meaning (ADR-0004).
- Tiles and Control strips never reorder on status change (DELIBERATE-POSITIONS 1).
- Commands reach the simulated Fleet only (ADR-0011).
- **The gate:** \`npm test\` and \`npm run typecheck\` must both pass. There is no lint.
  If you cannot make them pass, stop and report — never weaken a test to go green.
- jsdom cannot catch a layout bug. When the invariant is a layout one, assert on the
  stylesheet (see \`SiteHeader.test.tsx\`), and look at a screenshot before believing a
  visual fix.

**Size** ${feature.size} · **Wave** ${MILESTONE[feature.wave]} · **Feature** ${feature.num} of ${features.length}

Part of #${epicNumber}
`
}

const features = readFeatures()
const bySection = new Map()
for (const feature of features) {
  if (!bySection.has(feature.section)) bySection.set(feature.section, [])
  bySection.get(feature.section).push(feature)
}

console.log(`Reading existing issues from ${REPO}…`)
const existing = dryRun ? new Map() : existingIssues()
console.log(`${existing.size} issues already on the repo.`)

let created = 0
let skipped = 0
const epicNumbers = new Map()

// --- Epics first: children reference them. -----------------------------------------
for (const section of [...bySection.keys()].sort((a, b) => a - b)) {
  const title = epicTitle(section)
  if (existing.has(title)) {
    epicNumbers.set(section, existing.get(title))
    skipped += 1
    continue
  }
  if (dryRun) {
    epicNumbers.set(section, 9000 + section)
    console.log(`[dry-run] epic: ${title}`)
    continue
  }
  const url = gh(
    [
      'issue',
      'create',
      '--repo',
      REPO,
      '--title',
      title,
      '--label',
      'enhancement',
      '--body-file',
      '-',
    ],
    epicBody(section, bySection.get(section)),
  )
  const number = Number(url.split('/').pop())
  epicNumbers.set(section, number)
  created += 1
  console.log(`epic #${number} — ${title}`)
  await sleep(PACE_MS)
}

// --- Then the 350 children. ---------------------------------------------------------
const map = []
for (const feature of features) {
  const title = childTitle(feature)
  const epic = epicNumbers.get(feature.section)

  if (existing.has(title)) {
    map.push({ ...feature, issue: existing.get(title) })
    skipped += 1
    continue
  }
  if (created >= limit) {
    map.push({ ...feature, issue: null })
    continue
  }
  if (dryRun) {
    console.log(`[dry-run] ${title}`)
    map.push({ ...feature, issue: null })
    continue
  }

  const url = gh(
    [
      'issue',
      'create',
      '--repo',
      REPO,
      '--title',
      title,
      '--label',
      'feature',
      '--label',
      'ready-for-agent',
      '--milestone',
      MILESTONE[feature.wave],
      '--body-file',
      '-',
    ],
    childBody(feature, epic),
  )
  const number = Number(url.split('/').pop())
  map.push({ ...feature, issue: number })
  created += 1
  if (created % 25 === 0) console.log(`  … ${created} created`)
  await sleep(PACE_MS)
}

console.log(`\nCreated ${created}, skipped ${skipped} that already existed.`)

// --- The map, committed so the tracker and the plan cannot drift apart. --------------
const lines = map
  .map(
    (f) =>
      `| ${f.num} | ${f.issue ? `#${f.issue}` : '—'} | ${f.section} | ${f.title} | ${f.size} | ${f.wave} |`,
  )
  .join('\n')

const unmapped = map.filter((f) => f.issue === null).length
const backlog = `# Backlog — the ${map.length}-feature map

Generated by \`scripts/create-feature-issues.mjs\` from
\`docs/agents/cursor/features.tsv\`. Do not edit by hand; edit the dataset and re-run.

Every feature and the issue that tracks it. ${map.length - unmapped} of ${map.length} have
an issue${unmapped > 0 ? `; ${unmapped} are not yet created — re-run the script` : ''}.

Waves are **conflict classes, not priorities**: a wave is a set of tickets whose owned
files do not overlap, so its agents can run at the same time. See
\`docs/agents/cursor/WAVES.md\`.

| # | Issue | Section | Feature | Size | Wave |
|---|---|---|---|---|---|
${lines}
`

if (!dryRun) {
  writeFileSync(new URL('../docs/BACKLOG.md', import.meta.url), backlog)
  console.log('Wrote docs/BACKLOG.md')
}
