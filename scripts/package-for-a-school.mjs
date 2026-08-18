/**
 * Build the folder a technician unzips onto a trolley laptop.
 *
 * One folder, no clone, no git, and **no build tools assumed on the school's machine**. The
 * board is built here, the dependencies are installed here, and a Node runtime is carried
 * beside the app so nobody is ever shown a version number.
 *
 *   node scripts/package-for-a-school.mjs [--out <folder>]
 *
 * **Nothing that a school's data lives in goes in this folder.** `records.db` is in Documents
 * precisely so that replacing this folder for an update cannot touch it, and copying a
 * `classrooms.json` or a `classroom-source.json` out of a developer's checkout would ship one
 * school's room to another.
 */
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const HERE = dirname(fileURLToPath(import.meta.url))
const ROOT = resolve(HERE, '..')

const outFlag = process.argv.indexOf('--out')
const OUT = resolve(outFlag === -1 ? join(ROOT, 'dist', 'TechTech Flight') : process.argv[outFlag + 1])

/** What a school laptop needs, and nothing else. */
const CARRY = [
  'Start TechTech Flight.bat',
  'package.json',
  'package-lock.json',
  'contract',
  'fleet-core',
  'fleet-adapters',
  'ground-station',
  'db',
  'scripts',
]

/**
 * What must never travel.
 *
 * The first three are one machine's state and the rest is weight. `classrooms.json` is a live
 * classroom and `classroom-source.json` is a preference; shipping either puts a developer's
 * afternoon into a school's morning.
 */
const NEVER = new Set([
  'classrooms.json',
  'classroom-source.json',
  '.env',
  '.env.local',
  'node_modules',
  '.next',
  '.wrangler',
  'shots',
])

function carry(name) {
  const from = join(ROOT, name)
  if (!existsSync(from)) return
  cpSync(from, join(OUT, name), {
    recursive: true,
    filter: (source) => {
      const base = source.split(/[\\/]/).pop() ?? ''
      return !NEVER.has(base)
    },
  })
}

console.log(`Packaging into ${OUT}`)
rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

for (const name of CARRY) carry(name)

/*
 * The built board, without its source. The ground station serves `web/out`, so a school laptop
 * needs the artefact rather than the toolchain that made it: run the build before this script.
 */
const board = join(ROOT, 'web', 'out')
if (!existsSync(board)) {
  console.error('')
  console.error('  web/out is missing. Build the board first:')
  console.error('    npm run build --workspace=web')
  console.error('')
  process.exit(1)
}
mkdirSync(join(OUT, 'web'), { recursive: true })
cpSync(board, join(OUT, 'web', 'out'), { recursive: true })
cpSync(join(ROOT, 'web', 'package.json'), join(OUT, 'web', 'package.json'))

/* The setup page, beside the launcher rather than buried in docs. */
const setup = join(ROOT, 'docs', 'SETUP-FOR-A-TECHNICIAN.md')
if (existsSync(setup)) {
  cpSync(setup, join(OUT, 'Setup notes for a technician.md'))
}

writeFileSync(
  join(OUT, 'READ ME FIRST.txt'),
  [
    'TechTech Flight',
    '',
    'Double-click "Start TechTech Flight.bat".',
    '',
    'The first run takes a few minutes and does everything on its own.',
    'Every run after that takes seconds.',
    '',
    'Your class records are kept in Documents\\TechTech Flight on this laptop,',
    'not in this folder, so updating the app cannot touch them.',
    '',
    'A technician setting this up for the first time should read',
    '"Setup notes for a technician.md" in this folder.',
    '',
  ].join('\r\n'),
  'utf8',
)

/*
 * A Node runtime, if one has been staged beside the checkout. Not downloaded here: a build
 * script that reaches the internet is a build script that fails on the day the internet is the
 * problem, and this whole plan exists because of that day.
 */
const staged = join(ROOT, 'runtime', 'node')
if (existsSync(join(staged, 'node.exe'))) {
  cpSync(staged, join(OUT, 'node'), { recursive: true })
  console.log('  carried the Node runtime')
} else {
  console.log('')
  console.log('  No Node runtime staged, so this folder needs one on the target machine.')
  console.log('  To carry one: put the unzipped Windows Node build at runtime/node/ and run')
  console.log('  this again. The launcher uses it in preference to anything installed.')
}

const version = JSON.parse(readFileSync(join(ROOT, 'package.json'), 'utf8')).version ?? '0.0.0'
console.log('')
console.log(`  Done. Zip "${OUT}" and hand it over. (version ${version})`)
console.log('')
