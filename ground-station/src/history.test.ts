import { describe, expect, it } from 'vitest'
import { aDroneState, aFleetState, aTelemetry } from '@techtechflight/contract/fixtures'
import type { DroneState, FleetState, Status } from '@techtechflight/contract'
import { FleetHistoryRecorder, deriveEvents } from './history.ts'

const AT = 1_000_000

function fleet(drones: readonly DroneState[], generatedAt = AT): FleetState {
  return aFleetState(drones, generatedAt)
}

function drone(status: Status, overrides: Partial<DroneState> = {}): DroneState {
  return aDroneState({ id: 'a', name: 'Drone 1', status, lastContact: AT, ...overrides })
}

describe('what a Teacher is told happened', () => {
  it('says nothing at all about the first Fleet State it ever sees', () => {
    // A ground station starting up next to a cupboard of switched-off Drones has not
    // just watched six Drones go offline.
    expect(deriveEvents(null, fleet([drone('Offline')]))).toEqual([])
  })

  it('says nothing when nothing changed', () => {
    const before = fleet([drone('Ready')])
    expect(deriveEvents(before, fleet([drone('Ready')]))).toEqual([])
  })

  it('reports a Drone being heard from for the first time', () => {
    const before = fleet([drone('Offline', { lastContact: null, telemetry: null })])
    const [event] = deriveEvents(before, fleet([drone('Ready')]))

    // Not a Status change: a Drone never heard from is already Offline, so this moment
    // would otherwise be silent unless it happened to arrive charged.
    expect(event?.kind).toBe('first-contact')
  })

  it('calls a Drone leaving contact a dropout rather than a fault', () => {
    const before = fleet([drone('Ready')])
    const [event] = deriveEvents(before, fleet([drone('Offline')]))

    expect(event?.kind).toBe('contact-lost')
    // Offline is the normal resting state. A timeline that shouted every switch-off
    // would train a Teacher to skim past the entries that matter.
    expect(event?.severity).toBe('routine')
  })

  it('carries the fault description so a Teacher can read it out', () => {
    const faulted = drone('Fault', {
      telemetry: aTelemetry({
        fault: { code: 'IMU_CALIBRATION', description: 'Motion sensor needs recalibrating' },
      }),
    })
    const [event] = deriveEvents(fleet([drone('Ready')]), fleet([faulted]))

    expect(event?.kind).toBe('fault-raised')
    expect(event?.severity).toBe('fault')
    expect(event?.detail).toBe('Motion sensor needs recalibrating')
  })

  it('treats a flat battery as something the Teacher can put right', () => {
    const [event] = deriveEvents(fleet([drone('Ready')]), fleet([drone('Not Ready')]))

    expect(event?.kind).toBe('charge-low')
    expect(event?.severity).toBe('attention')
  })

  it('reports a Drone that lands with a fault as having faulted', () => {
    // The fault is the news. "Landed" is trivia beside it, and emitting both would turn
    // a timeline into a log.
    const [event, ...rest] = deriveEvents(fleet([drone('Flying')]), fleet([drone('Fault')]))

    expect(event?.kind).toBe('fault-raised')
    expect(rest).toEqual([])
  })

  it('emits exactly one event per Drone per transition', () => {
    const before = fleet([drone('Flying'), aDroneState({ id: 'b', name: 'Drone 2', status: 'Ready' })])
    const after = fleet([drone('Ready'), aDroneState({ id: 'b', name: 'Drone 2', status: 'Fault' })])

    expect(deriveEvents(before, after)).toHaveLength(2)
  })

  it('gives the same two snapshots the same event ids every time', () => {
    // Derived rather than random, so a reconnect that replays history cannot show a
    // Teacher this morning's fault twice.
    const before = fleet([drone('Ready')])
    const after = fleet([drone('Fault')])

    expect(deriveEvents(before, after)[0]?.id).toBe(deriveEvents(before, after)[0]?.id)
  })

  it('keeps the Drone name on the event so a removed Drone stays readable', () => {
    const [event] = deriveEvents(fleet([drone('Ready')]), fleet([drone('Fault')]))
    expect(event?.droneName).toBe('Drone 1')
  })
})

describe('the record the ground station keeps', () => {
  it('seeds from the first Fleet State without announcing it', () => {
    const recorder = new FleetHistoryRecorder()
    recorder.observe(fleet([drone('Ready')]))

    expect(recorder.history().events).toEqual([])
  })

  it('reports how far back it can honestly answer', () => {
    const recorder = new FleetHistoryRecorder()
    recorder.observe(fleet([drone('Ready')], AT))

    expect(recorder.history().since).toBe(AT)
  })

  it('samples a battery against Last Contact, not against the moment it ran', () => {
    // A Drone that has fallen silent must draw a line that stops, not a flat one that
    // carries on to the present.
    const recorder = new FleetHistoryRecorder()
    recorder.observe(fleet([drone('Ready', { lastContact: AT })], AT))

    const [history] = recorder.history().batteries
    expect(history?.samples[0]?.at).toBe(AT)
  })

  it('does not record a second reading when nothing new has been heard', () => {
    const recorder = new FleetHistoryRecorder()
    const standing = drone('Ready', { lastContact: AT })
    recorder.observe(fleet([standing], AT))
    recorder.observe(fleet([standing], AT + 30_000))

    expect(recorder.history().batteries[0]?.samples).toHaveLength(1)
  })

  it('records a reading immediately when the charge moves sharply', () => {
    const recorder = new FleetHistoryRecorder()
    recorder.observe(
      fleet([drone('Ready', { telemetry: aTelemetry({ batteryFraction: 0.9 }) })], AT),
    )
    recorder.observe(
      fleet(
        [
          drone('Ready', {
            lastContact: AT + 1_000,
            telemetry: aTelemetry({ batteryFraction: 0.5 }),
          }),
        ],
        AT + 1_000,
      ),
    )

    // A second apart — well inside the thinning interval — but a 40-point drop is
    // exactly what a chart must not smooth away.
    expect(recorder.history().batteries[0]?.samples).toHaveLength(2)
  })

  it('lets go of the oldest events rather than growing without limit', () => {
    const recorder = new FleetHistoryRecorder({ maxEvents: 2 })
    recorder.observe(fleet([drone('Ready')], AT))

    const statuses: readonly Status[] = ['Fault', 'Ready', 'Fault', 'Ready']
    statuses.forEach((status, index) => {
      recorder.observe(fleet([drone(status, { lastContact: AT + index + 1 })], AT + index + 1))
    })

    const history = recorder.history()
    expect(history.events).toHaveLength(2)
    // And it says so: the window moves forward rather than pretending to cover it all.
    expect(history.since).toBeGreaterThan(AT)
  })

  it('tells subscribers as things happen', () => {
    const recorder = new FleetHistoryRecorder()
    const heard: string[] = []
    recorder.onEvents((events) => heard.push(...events.map((event) => event.kind)))

    recorder.observe(fleet([drone('Ready')], AT))
    recorder.observe(fleet([drone('Fault', { lastContact: AT + 1 })], AT + 1))

    expect(heard).toEqual(['fault-raised'])
  })
})
