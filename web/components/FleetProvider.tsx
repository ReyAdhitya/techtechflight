'use client'

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from 'react'
import { usePathname } from 'next/navigation'
import type { Clock, CommandKind, DroneId, DroneState } from '@techtechflight/contract'
import { SystemClock } from '@techtechflight/contract/testing'
import { FleetConnection, browserSocket } from '@/lib/fleet-connection'
import type { FleetLink, FleetSnapshot, ScenarioControls } from '@/lib/fleet-link'
import { LocalFleetLink } from '@/lib/local-fleet-link'
import { AcknowledgementTracker } from '@/lib/acknowledgement'
import { CommandTracker, type TrackedCommand } from '@/lib/command-tracker'
import {
  AlertTracker,
  AltitudeTracker,
  fleetVitals,
  type DroneVitals,
  type VitalsAlert,
} from '@/lib/vitals'

/**
 * One connection to the ground station, shared by every screen.
 *
 * Before this, the board was the only screen and owned its own socket. With a timeline,
 * a lesson, and a per-Drone view all reading the same Fleet, a socket per page would
 * mean the ground station serving four copies of the same thing to one Teacher — and,
 * worse, four screens that could disagree during a reconnect.
 */

export interface FleetView {
  readonly snapshot: FleetSnapshot
  /** The browser's clock, ticking, so ages stay honest between snapshots. */
  readonly now: number
  /** True when the Fleet on screen is a stand-in rather than one a ground station sent. */
  readonly demo: boolean
  /**
   * Everything derived about every Drone.
   *
   * Held here rather than on the screen that reads it because two of the inputs are
   * accumulated across snapshots — how fast a Drone is climbing, and when each condition
   * first appeared — and a screen loses both the moment a Teacher navigates away from it.
   */
  readonly vitals: readonly DroneVitals[]
  /** Take an Alert off the queue. Changes what the Teacher sees and nothing else. */
  readonly acknowledge: (droneId: DroneId, alert: VitalsAlert) => void
  readonly isAcknowledged: (droneId: DroneId, alert: VitalsAlert) => boolean
  /** When it was taken, for saying so quietly on the Drone's own strip. */
  readonly acknowledgedAt: (droneId: DroneId, alert: VitalsAlert) => number | null
  /**
   * Ask a Drone to do something. Every Command takes energy out of the aircraft.
   *
   * Nothing on screen changes because of this call. What the Drone did is read from the
   * Telemetry that follows, which is what `commandFor` reports on.
   */
  readonly command: (droneId: DroneId, kind: CommandKind) => void
  readonly commandFor: (droneId: DroneId) => TrackedCommand | null
  /**
   * Ways to make the world misbehave, for a demonstration. Null on a real Fleet.
   *
   * Never a Command, and never on the same screen as one (requirement C9).
   */
  readonly scenarios: ScenarioControls | null
}

const FleetContext = createContext<FleetView | null>(null)

export function useFleet(): FleetView {
  const view = useContext(FleetContext)
  if (!view) throw new Error('useFleet must be used inside a FleetProvider')
  return view
}

/** The Drones on screen, or an empty Fleet before the first Fleet State arrives. */
export function useDrones(): readonly DroneState[] {
  return useFleet().snapshot.state?.drones ?? []
}

const NOT_YET_CONNECTED: FleetSnapshot = {
  connection: 'connecting',
  state: null,
  receivedAt: null,
  history: null,
}

/**
 * True when this build has no ground station to reach at all.
 *
 * Set at build time for the standalone deploy (see `vercel.json`). A build served by the
 * ground station itself never sets it, so the copy that goes to a school is untouched
 * and still waits honestly for real Telemetry.
 */
function builtForDemoOnly(): boolean {
  return process.env.NEXT_PUBLIC_DEMO_ONLY === '1'
}

/**
 * The one place in the product that knows whether a Fleet is simulated.
 *
 * Everything downstream reads a FleetSnapshot and cannot tell, which is the point of the
 * seam. `demo` travels on the view for one reason only: so the header can say so in
 * words. No screen may branch on it to behave differently.
 */
export function FleetProvider({ children }: { children: ReactNode }) {
  const pathname = usePathname()
  const demo = builtForDemoOnly() || pathname.startsWith('/demo')
  const clock = useMemo(() => new SystemClock(), [])

  /*
   * Built lazily rather than at module scope. `browserSocket` closes over `WebSocket`,
   * which does not exist while these pages are being prerendered into static HTML — and
   * a local Fleet must not start ticking during a build either. Neither does anything
   * until `start`, below, which only ever runs on a client.
   */
  const link = useMemo<FleetLink>(
    () =>
      demo
        ? new LocalFleetLink({ clock })
        : new FleetConnection({ url: fleetUrl(), clock, createSocket: browserSocket }),
    [clock, demo],
  )

  const snapshot = useSyncExternalStore(
    (onChange) => link.subscribe(onChange),
    () => link.snapshot,
    () => NOT_YET_CONNECTED,
  )
  const now = useNow(clock)

  useEffect(() => {
    link.start()
    return () => link.stop()
  }, [link])

  const vitals = useVitals(snapshot, now)
  const acknowledgements = useAcknowledgements(vitals, now)
  const commands = useCommands(link, vitals, now)

  const view = useMemo<FleetView>(
    () => ({ snapshot, now, demo, vitals, scenarios: link.scenarios, ...acknowledgements, ...commands }),
    [snapshot, now, demo, vitals, link, acknowledgements, commands],
  )
  return <FleetContext.Provider value={view}>{children}</FleetContext.Provider>
}

/**
 * What the Teacher has already dealt with.
 *
 * Held in memory rather than written down. An acknowledgement says "I have seen this and I
 * am on it" — a statement about this sitting at this screen, not a record of the lesson.
 * After a reload the Teacher has lost their place, and being shown the queue again is
 * right rather than irritating; it also keeps ephemera out of a Logbook that already
 * carries more of a Teacher's work than one browser ought to.
 */
function useAcknowledgements(vitals: readonly DroneVitals[], now: number) {
  const taken = useRef<AcknowledgementTracker | null>(null)
  taken.current ??= new AcknowledgementTracker()
  // A tracker is a ref, so nothing re-renders when it changes. This is what makes taking
  // an Alert visible immediately rather than at the next Telemetry tick.
  const [, setTaken] = useState(0)

  // Conditions that have stopped happening are forgotten, so their return is new news.
  useEffect(() => {
    taken.current?.observe(vitals)
  }, [vitals])

  return useMemo(
    () => ({
      acknowledge: (droneId: DroneId, alert: VitalsAlert) => {
        taken.current?.acknowledge(droneId, alert, now)
        setTaken((count) => count + 1)
      },
      isAcknowledged: (droneId: DroneId, alert: VitalsAlert) =>
        taken.current?.isTaken(droneId, alert) ?? false,
      acknowledgedAt: (droneId: DroneId, alert: VitalsAlert) =>
        taken.current?.takenAt(droneId, alert) ?? null,
    }),
    [now],
  )
}

/**
 * What has been asked for, and what has come of it.
 *
 * Deliberately not folded into the snapshot. An outcome is news about a request; a
 * snapshot is what the Fleet is doing. Keeping them apart is what stops a button press
 * from ever reading as an aircraft having moved.
 */
function useCommands(link: FleetLink, vitals: readonly DroneVitals[], now: number) {
  const tracker = useRef<CommandTracker | null>(null)
  tracker.current ??= new CommandTracker()
  const [, setIssued] = useState(0)
  const bump = () => setIssued((count) => count + 1)

  useEffect(() => {
    return link.onCommandOutcome((outcome) => {
      tracker.current?.record(outcome)
      bump()
    })
  }, [link])

  // Evidence, read from the Fleet rather than assumed from having asked.
  useEffect(() => {
    if (vitals.length > 0) tracker.current?.observe(vitals, now)
  }, [vitals, now])

  return useMemo(
    () => ({
      command: (droneId: DroneId, kind: CommandKind) => {
        const command = {
          // Unique enough to match an outcome to its request, and derived rather than
          // random so nothing here depends on a source of entropy during a render.
          id: `${droneId}:${kind}:${now}`,
          droneId,
          kind,
          issuedAt: now,
        }
        tracker.current?.issue(command)
        link.send(command)
        bump()
      },
      commandFor: (droneId: DroneId) => tracker.current?.latestFor(droneId) ?? null,
    }),
    [link, now],
  )
}

/**
 * What the Fleet is doing, derived once for every screen.
 *
 * Two of the inputs cannot come from a single snapshot. Altitude only becomes a rate when
 * it is remembered across several, and an Alert only knows how long it has been waiting if
 * something recorded when it first appeared. Both were kept on the tower screen, which
 * meant a Teacher who glanced at another screen and came back had thrown away every
 * vertical rate and reset every Alert to "just now" in the middle of a lesson.
 *
 * They live here instead, beside the connection, for the same reason it does.
 */
function useVitals(snapshot: FleetSnapshot, now: number): readonly DroneVitals[] {
  const altitudes = useRef<AltitudeTracker | null>(null)
  altitudes.current ??= new AltitudeTracker()
  const alerts = useRef<AlertTracker | null>(null)
  alerts.current ??= new AlertTracker()

  const state = snapshot.state

  /*
   * Observed during the effect rather than during render, so a re-render cannot record a
   * reading twice. The tracker rejects repeats of the same contact moment anyway, but two
   * sources of truth about when a sample was taken is a bug waiting to be written.
   */
  useEffect(() => {
    if (state) altitudes.current?.observe(state)
  }, [state])

  const vitals = useMemo(() => {
    if (!state || snapshot.receivedAt === null) return []
    return fleetVitals({
      state,
      receivedAt: snapshot.receivedAt,
      now,
      batteries: snapshot.history?.batteries ?? [],
      rates: altitudes.current?.rates() ?? new Map(),
      firstSeen: alerts.current?.firstSeen ?? new Map(),
    })
  }, [state, snapshot.receivedAt, snapshot.history, now])

  /*
   * Recorded after the vitals are built, not before: a condition nobody has seen yet is
   * stamped with the moment it first appears, and one that has cleared forgets when it
   * began so its return reads as new news.
   */
  useEffect(() => {
    if (vitals.length > 0) alerts.current?.observe(vitals, now)
  }, [vitals, now])

  return vitals
}

/**
 * Same host as the page by default, so the board follows wherever the ground station is
 * served from. Overridable for a board pointed at a ground station elsewhere.
 */
function fleetUrl(): string {
  const configured = process.env.NEXT_PUBLIC_FLEET_URL
  if (configured) return configured
  if (typeof location === 'undefined') return ''
  const protocol = location.protocol === 'https:' ? 'wss' : 'ws'
  return `${protocol}://${location.hostname}:4321/fleet`
}

/**
 * A ticking clock reading, so ages keep counting up between snapshots rather than
 * freezing at whatever the last message said.
 *
 * Starts at zero rather than at `clock.now()`: reading the real clock during render
 * would make the server's HTML and the client's first paint disagree.
 */
function useNow(clock: Clock, intervalMs = 1_000): number {
  const [now, setNow] = useState(0)

  useEffect(() => {
    setNow(clock.now())
    return clock.setInterval(() => setNow(clock.now()), intervalMs)
  }, [clock, intervalMs])

  return now
}
