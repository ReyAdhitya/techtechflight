/**
 * Validate the 350-feature dataset before it becomes 350 GitHub issues.
 *
 * The load-bearing check is the last one: two tickets in the same wave must never own the
 * same file. That single rule is what lets a wave of agents run at the same time without
 * overwriting each other, so it is checked by a machine rather than by eye.
 */
import { readFileSync } from 'node:fs'

const SIZES = new Set(['XS', 'S', 'M', 'L'])
// Split on \r?\n: core.autocrlf is true on the Windows machine this repo is developed on,
// so a checked-out TSV arrives CRLF and a bare \n split leaves \r glued to the last column.
const rows = readFileSync(new URL('../docs/agents/cursor/features.tsv', import.meta.url), 'utf8')
  .trim()
  .split(/\r?\n/)

const header = rows.shift().split('\t')
const EXPECTED = ['num', 'section', 'title', 'size', 'wave', 'files', 'acceptance']
if (header.join(',') !== EXPECTED.join(',')) {
  throw new Error(`header is ${header.join(',')}, expected ${EXPECTED.join(',')}`)
}

const problems = []
const features = rows.map((line, index) => {
  const cell = line.split('\t')
  if (cell.length !== 7) problems.push(`row ${index + 2}: ${cell.length} columns, expected 7`)
  const [num, section, title, size, wave, files, acceptance] = cell
  if (!SIZES.has(size)) problems.push(`#${num}: size "${size}" is not XS/S/M/L`)
  if (!title || !acceptance) problems.push(`#${num}: missing title or acceptance`)
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

// Every number from 1 to 350, exactly once.
const seen = new Set(features.map((f) => f.num))
for (let n = 1; n <= 350; n += 1) if (!seen.has(n)) problems.push(`feature ${n} is missing`)
if (seen.size !== features.length) problems.push('duplicate feature numbers')
if (features.length !== 350) problems.push(`${features.length} features, expected 350`)

// The rule everything else rests on: one owner per file per wave.
const ownerOf = new Map()
for (const feature of features) {
  for (const file of feature.files) {
    const key = `${feature.wave}::${file}`
    const already = ownerOf.get(key)
    if (already) problems.push(`wave ${feature.wave}: ${file} owned by #${already} and #${feature.num}`)
    else ownerOf.set(key, feature.num)
  }
}

const byWave = {}
for (const feature of features) byWave[feature.wave] = (byWave[feature.wave] ?? 0) + 1

if (problems.length > 0) {
  console.error(`${problems.length} problem(s):`)
  for (const problem of problems) console.error(`  - ${problem}`)
  process.exit(1)
}

console.log(`OK — ${features.length} features, ${ownerOf.size} owned files, no collisions.`)
console.log(
  Object.keys(byWave)
    .sort()
    .map((wave) => `  wave ${wave}: ${byWave[wave]}`)
    .join('\n'),
)
