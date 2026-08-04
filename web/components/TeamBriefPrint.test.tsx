import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { Mission } from '@/lib/mission'
import type { Team } from '@/lib/teams'
import {
  TEAM_BRIEF_PRINT_CSS,
  TEAM_BRIEF_WHAT_IF,
  TeamBriefPrint,
} from './TeamBriefPrint'

/**
 * Printable team brief (#540) — paper tokens under @media print, same idea as
 * ReportsScreen.test.tsx (jsdom cannot see layout; assert the stylesheet).
 */

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function printBlock(): string {
  const at = CSS.indexOf('Printing a Lesson report.')
  expect(at, 'print comment missing from globals.css').toBeGreaterThan(-1)
  return CSS.slice(at)
}

const team: Team = {
  id: 'team-1',
  name: 'Red Team',
  studentIds: ['ada'],
  droneId: 'drone-1',
}

const mission: Mission = {
  id: 'mission-1',
  scenarioId: 'search-rescue',
  name: 'Period 3 SAR',
  startedAt: null,
  limitMinutes: 8,
  zones: [
    {
      id: 'zone-m',
      kind: 'mission',
      name: 'Mission Zone',
      points: [
        { eastM: 2, northM: 2 },
        { eastM: 12, northM: 2 },
        { eastM: 12, northM: 12 },
        { eastM: 2, northM: 12 },
      ],
    },
    {
      id: 'zone-nf',
      kind: 'no-fly',
      name: 'No-fly Zone 1',
      points: [
        { eastM: 14, northM: 14 },
        { eastM: 18, northM: 14 },
        { eastM: 18, northM: 18 },
      ],
    },
  ],
  checkpoints: [
    {
      id: 'cp-1',
      name: 'Search start',
      at: { eastM: 4, northM: 4 },
      radiusM: 1.5,
      required: true,
    },
    {
      id: 'cp-2',
      name: 'Target area',
      at: { eastM: 10, northM: 8 },
      radiusM: 2,
      required: true,
    },
  ],
  targets: [],
  droneIds: ['drone-1'],
  outcome: null,
}

describe('TeamBriefPrint', () => {
  it('carries objective, map, checkpoints, time limit and four what-if responses', () => {
    render(<TeamBriefPrint team={team} mission={mission} />)

    expect(screen.getByRole('article', { name: 'Team brief: Red Team' })).toBeTruthy()
    expect(screen.getByText('Red Team')).toBeTruthy()
    expect(screen.getByText(/Craft:/)).toHaveTextContent('drone-1')
    expect(screen.getByText(/Locate a target/)).toBeTruthy()
    expect(screen.getByText('8 minutes')).toBeTruthy()
    expect(screen.getByRole('img', { name: 'Mission area map' })).toBeTruthy()
    expect(screen.getByText('Search start')).toBeTruthy()
    expect(screen.getByText('Target area')).toBeTruthy()

    for (const item of TEAM_BRIEF_WHAT_IF) {
      expect(screen.getByText(item.question)).toBeTruthy()
      expect(screen.getByText(item.answer)).toBeTruthy()
    }
  })

  it('labels map zones in words, not colour alone', () => {
    render(<TeamBriefPrint team={team} mission={mission} />)

    expect(screen.getByText(/Mission Zone — solid outline/)).toBeTruthy()
    expect(screen.getByText(/No-fly Zone — hatched/)).toBeTruthy()
    expect(screen.getByText(/Checkpoints — numbered circles/)).toBeTruthy()
  })

  it('keeps each team sheet on one page under print', () => {
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/@media print/)
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/\.team-brief-print\s*\{[^}]*break-inside:\s*avoid/s)
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/page-break-inside:\s*avoid/)
  })

  it('forces paper colour tokens when printing, including dark theme', () => {
    const block = printBlock()
    expect(block).toMatch(/\[data-theme='dark'\]/)
    expect(block).toMatch(/--foreground:\s*#1b1815/)
    expect(block).toMatch(/--background:\s*#ffffff/)
    expect(block).toMatch(/color-scheme:\s*light/)

    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/background:\s*#ffffff/)
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/color:\s*#1b1815/)
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/color-scheme:\s*light/)
    expect(TEAM_BRIEF_PRINT_CSS).toMatch(/stroke:\s*#1b1815/)
  })
})
