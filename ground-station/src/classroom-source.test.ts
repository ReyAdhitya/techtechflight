import { describe, expect, it } from 'vitest'
import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import {
  readPreferredClassroomSource,
  resolveActiveClassroomSource,
  writePreferredClassroomSource,
} from './classroom-source.ts'

describe('classroom telemetry source preference', () => {
  it('defaults to the Simulator when no preference file exists', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ttf-src-')), 'missing.json')
    expect(readPreferredClassroomSource(path)).toBe('simulator')
  })

  it('round-trips a Radio preference for the next launch', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ttf-src-')), 'classroom-source.json')
    writePreferredClassroomSource('mavlink', path)
    expect(readPreferredClassroomSource(path)).toBe('mavlink')
  })

  it('round-trips School drones (Wi-Fi) for the next launch', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ttf-src-')), 'classroom-source.json')
    writePreferredClassroomSource('esp', path)
    expect(readPreferredClassroomSource(path)).toBe('esp')
  })

  it('lets TELEMETRY_SOURCE override the preference file', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ttf-src-')), 'classroom-source.json')
    writePreferredClassroomSource('mavlink', path)
    expect(resolveActiveClassroomSource({ TELEMETRY_SOURCE: 'simulator' }, 'mavlink')).toBe(
      'simulator',
    )
    expect(resolveActiveClassroomSource({}, readPreferredClassroomSource(path))).toBe('mavlink')
    expect(resolveActiveClassroomSource({ TELEMETRY_SOURCE: 'esp' }, 'simulator')).toBe('esp')
  })

  it('treats a corrupt preference file as Simulator', () => {
    const path = join(mkdtempSync(join(tmpdir(), 'ttf-src-')), 'classroom-source.json')
    writeFileSync(path, '{not-json', 'utf8')
    expect(readPreferredClassroomSource(path)).toBe('simulator')
  })
})
