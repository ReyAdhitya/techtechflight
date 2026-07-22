import { beforeEach, describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  addIncident,
  clearLogbook,
  endLesson,
  recordCommand,
  startLesson,
} from '@/lib/logbook'
import { LessonReports } from './LessonReports'

/**
 * The record of a Lesson, read after the fact.
 *
 * Everything here is written as the Lesson closes rather than recomputed from the ground
 * station, because the ground station's history is bounded and by next week those events
 * are gone. The property worth testing is exactly that: a report still reads correctly
 * when nothing that produced it is in memory any more.
 */

beforeEach(() => {
  clearLogbook()
})

const aFinishedLesson = () => {
  const id = startLesson('Year 8, period 3', 5, 6, 1_000, [
    { id: 'e1', name: 'Hover', minutes: 5 },
    { id: 'e2', name: 'Fly a square' },
  ])
  addIncident(id, {
    at: 2_000,
    text: 'Drone 3 stopped responding',
    severity: 'fault',
    droneId: 'ttf-0003',
    droneName: 'Drone 3',
  })
  recordCommand(id, { at: 3_000, droneId: 'ttf-0003', droneName: 'Drone 3', kind: 'land' })
  endLesson(id, 9_000, { 'ttf-0003': { faults: 1, dropouts: 1, flights: 2 } })
  return id
}

describe('a Lesson that has finished', () => {
  it('says so when none have', () => {
    render(<LessonReports />)

    expect(screen.getByText(/None finished yet/i)).toBeInTheDocument()
  })

  it('names it, and when it ran', () => {
    aFinishedLesson()
    render(<LessonReports />)

    expect(screen.getByText('Year 8, period 3')).toBeInTheDocument()
    expect(screen.getByText(/5 of 6 ready at the start/i)).toBeInTheDocument()
  })

  it('lists the Exercises it planned', () => {
    aFinishedLesson()
    render(<LessonReports />)

    expect(screen.getByText(/Hover · Fly a square/)).toBeInTheDocument()
  })

  it('lists what went wrong, with the Drone that did it', () => {
    aFinishedLesson()
    render(<LessonReports />)

    expect(screen.getByText(/Drone 3 stopped responding/)).toBeInTheDocument()
  })

  it('carries the counts, which are the numbers taken to a supplier', () => {
    aFinishedLesson()
    render(<LessonReports />)

    expect(screen.getByText(/Drone 3: 2 flights, 1 faults, 1 dropouts/)).toBeInTheDocument()
  })

  it('records what the Teacher asked for, whether or not it worked', () => {
    aFinishedLesson()
    render(<LessonReports />)

    // A Command that produced nothing is still a thing that happened, and arguably the
    // more interesting one.
    expect(screen.getByText(/Drone 3 — land/)).toBeInTheDocument()
  })

  it('still reads correctly with nothing left in the ground station', () => {
    aFinishedLesson()
    // Nothing is passed in: everything on screen came from the record written at close.
    render(<LessonReports />)

    expect(screen.getByText(/Drone 3 stopped responding/)).toBeInTheDocument()
    expect(screen.getByText(/1 incident$/)).toBeInTheDocument()
  })
})
