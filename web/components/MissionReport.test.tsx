import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import type { LessonRecord } from '@/lib/logbook'
import { emptyMission, type MissionOutcome } from '@/lib/mission'
import { scenarioById } from '@/lib/mission-scenarios'
import { ALERT_LOG_KEY, alertLogForLesson, writeAlertLog } from '@/lib/alert-log'
import {
  categoryFromIncidentText,
  groupAlertsByCategory,
  groupIncidentsByCategory,
  incidentNoteBody,
  MISSION_REPORT_PRINT_CSS,
  MissionReport,
} from './MissionReport'

/**
 * Mission log, score and debrief in Reports (#552) — paper tokens under @media print,
 * same idea as ReportsScreen.test.tsx (jsdom cannot see layout; assert the stylesheet).
 */

const CSS = readFileSync(resolve(process.cwd(), 'web/app/globals.css'), 'utf8')

function printBlock(): string {
  const at = CSS.indexOf('Printing a Lesson report.')
  expect(at, 'print comment missing from globals.css').toBeGreaterThan(-1)
  return CSS.slice(at)
}

const sealedOutcome = (): MissionOutcome => ({
  endedAt: 1_800_000,
  criteria: {
    'tasks-completed': true,
    'safe-route': true,
    'no-collisions': false,
    'no-no-fly-violations': true,
    'procedures-followed': null,
  },
  failures: [],
  score: 0.75,
  debrief: 'No collisions or incidents not met.',
})

const lesson = (): LessonRecord => ({
  id: 'lesson-1',
  label: 'Period 3 SAR',
  startedAt: 1_000_000,
  endedAt: 1_900_000,
  fleetSize: 6,
  readyAtStart: 5,
  incidents: [
    {
      at: 1_200_000,
      text: 'Collision / near miss: Prop clipped the desk',
      severity: 'fault',
      droneName: 'Drone 1',
    },
    {
      at: 1_300_000,
      text: 'Battery felt low on the pad',
      severity: 'attention',
    },
  ],
  missions: [
    {
      ...emptyMission('m1', 'search-rescue', 'Find the casualty'),
      startedAt: 1_050_000,
      droneIds: ['ttf-0001'],
      outcome: sealedOutcome(),
    },
  ],
})

beforeEach(() => {
  window.localStorage.removeItem(ALERT_LOG_KEY)
})

describe('incident grouping', () => {
  it('parses fixed category prefixes from stored notes', () => {
    expect(categoryFromIncidentText('Collision / near miss: Prop clipped the desk')).toBe(
      'Collision / near miss',
    )
    expect(incidentNoteBody('Collision / near miss: Prop clipped the desk')).toBe(
      'Prop clipped the desk',
    )
    expect(categoryFromIncidentText('Battery felt low on the pad')).toBe('Uncategorised')
  })

  it('groups Teacher incidents by category in fixed order', () => {
    const groups = groupIncidentsByCategory(lesson().incidents)
    expect(groups.map((group) => group.category)).toEqual([
      'Collision / near miss',
      'Uncategorised',
    ])
    expect(groups[0]?.incidents).toHaveLength(1)
  })

  it('groups alert log rows by playbook title', () => {
    writeAlertLog({
      lessonId: 'lesson-1',
      records: [
        {
          id: 'ttf-0001:obstacle',
          droneId: 'ttf-0001',
          droneName: 'Drone 1',
          kind: 'obstacle',
          text: 'Move away from the obstacle.',
          raisedAt: 1_100_000,
          clearedAt: 1_150_000,
          teacherAction: 'Recalled the craft',
        },
      ],
    })

    const groups = groupAlertsByCategory(alertLogForLesson('lesson-1'))
    expect(groups).toHaveLength(1)
    expect(groups[0]?.category).toBe('Something is close to a Drone')
    expect(groups[0]?.alerts[0]?.teacherAction).toBe('Recalled the craft')
  })
})

describe('MissionReport', () => {
  it('shows the mission log, criteria breakdown, debrief and incidents by category', () => {
    writeAlertLog({
      lessonId: 'lesson-1',
      records: [
        {
          id: 'ttf-0001:low-endurance',
          droneId: 'ttf-0001',
          droneName: 'Drone 1',
          kind: 'low-endurance',
          text: 'Land soon.',
          raisedAt: 1_400_000,
          clearedAt: null,
          teacherAction: null,
        },
      ],
    })

    render(<MissionReport lesson={lesson()} />)

    expect(screen.getByRole('article', { name: 'Mission report: Period 3 SAR' })).toBeTruthy()
    expect(screen.getByText('Find the casualty')).toBeTruthy()
    expect(screen.getByText(/Score/)).toBeTruthy()
    expect(screen.getByText('75')).toBeTruthy()
    expect(screen.getByText('Required tasks completed')).toBeTruthy()
    expect(screen.getByText('No collisions or incidents')).toBeTruthy()
    expect(screen.getByText('Not met')).toBeTruthy()
    expect(screen.getByText(/Debrief/)).toBeTruthy()
    expect(screen.getByText('No collisions or incidents not met.')).toBeTruthy()
    expect(screen.getByText('Incidents by category')).toBeTruthy()
    expect(screen.getByText('Collision / near miss')).toBeTruthy()
    expect(screen.getByText(/Prop clipped the desk/)).toBeTruthy()
    expect(screen.getByText('Uncategorised')).toBeTruthy()
    expect(screen.getByText(/Battery felt low/)).toBeTruthy()

    const scenario = scenarioById('search-rescue')!
    for (const line of scenario.successCriteria) {
      expect(screen.getByText(new RegExp(line.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeTruthy()
    }
  })

  it('shows only judged criteria from the Scenario', () => {
    render(<MissionReport lesson={lesson()} />)

    expect(screen.getByText('Safe route followed')).toBeTruthy()
    expect(screen.queryByText('Correct procedures followed')).toBeNull()
  })

  it('returns null when the Lesson has no Missions', () => {
    const { container } = render(
      <MissionReport
        lesson={{
          ...lesson(),
          missions: [],
        }}
      />,
    )
    expect(container.firstChild).toBeNull()
  })

  it('keeps each report together under print', () => {
    expect(MISSION_REPORT_PRINT_CSS).toMatch(/@media print/)
    expect(MISSION_REPORT_PRINT_CSS).toMatch(/\.mission-report\s*\{[^}]*break-inside:\s*avoid/s)
    expect(MISSION_REPORT_PRINT_CSS).toMatch(/page-break-inside:\s*avoid/)
  })

  it('forces paper colour tokens when printing, including dark theme', () => {
    const block = printBlock()
    expect(block).toMatch(/\[data-theme='dark'\]/)
    expect(block).toMatch(/--foreground:\s*#1b1815/)
    expect(block).toMatch(/--background:\s*#ffffff/)
    expect(block).toMatch(/color-scheme:\s*light/)

    expect(MISSION_REPORT_PRINT_CSS).toMatch(/background:\s*#ffffff/)
    expect(MISSION_REPORT_PRINT_CSS).toMatch(/color:\s*#1b1815/)
    expect(MISSION_REPORT_PRINT_CSS).toMatch(/color-scheme:\s*light/)
  })
})
