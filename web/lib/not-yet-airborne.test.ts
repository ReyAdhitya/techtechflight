import { describe, expect, it } from 'vitest'
import {
  notYetAirborne,
  notYetAirborneSentence,
  type NotYetAirborneInput,
} from './not-yet-airborne'

function craft(
  partial: Partial<NotYetAirborneInput> & Pick<NotYetAirborneInput, 'droneId'>,
): NotYetAirborneInput {
  return {
    callsign: partial.callsign ?? partial.droneId,
    airborne: partial.airborne ?? false,
    studentName: partial.studentName ?? null,
    ...partial,
  }
}

describe('notYetAirborne', () => {
  it('names grounded craft with an assigned Student after the Lesson starts', () => {
    const waiting = notYetAirborne(
      [
        craft({ droneId: 'a', callsign: 'Drone 1', studentName: 'Priya', airborne: false }),
        craft({ droneId: 'b', callsign: 'Drone 2', studentName: 'Sam', airborne: true }),
        craft({ droneId: 'c', callsign: 'Drone 3', studentName: 'Lee', airborne: false }),
      ],
      true,
    )
    expect(waiting.map((entry) => entry.callsign)).toEqual(['Drone 1', 'Drone 3'])
    expect(waiting[0]?.studentName).toBe('Priya')
  })

  it('is silent before the Lesson starts', () => {
    expect(
      notYetAirborne(
        [craft({ droneId: 'a', studentName: 'Priya', airborne: false })],
        false,
      ),
    ).toEqual([])
  })

  it('skips grounded craft with nobody assigned, and keeps board order', () => {
    const waiting = notYetAirborne(
      [
        craft({ droneId: 'a', callsign: 'Drone 1', studentName: null, airborne: false }),
        craft({ droneId: 'b', callsign: 'Drone 2', studentName: 'Sam', airborne: false }),
        craft({ droneId: 'c', callsign: 'Drone 3', studentName: '  ', airborne: false }),
      ],
      true,
    )
    expect(waiting.map((entry) => entry.callsign)).toEqual(['Drone 2'])
  })
})

describe('notYetAirborneSentence', () => {
  it('names a single waiting craft, and lists several', () => {
    expect(
      notYetAirborneSentence([
        { droneId: 'a', callsign: 'Drone 1', studentName: 'Priya' },
      ]),
    ).toBe('Drone 1 (Priya) has not taken off yet')
    expect(
      notYetAirborneSentence([
        { droneId: 'a', callsign: 'Drone 1', studentName: 'Priya' },
        { droneId: 'b', callsign: 'Drone 2', studentName: 'Sam' },
      ]),
    ).toBe('Not yet airborne: Drone 1 (Priya), Drone 2 (Sam)')
  })

  it('returns null when nobody is waiting', () => {
    expect(notYetAirborneSentence([])).toBeNull()
  })
})
