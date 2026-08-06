import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { landingTargetPresentation, type LandingTarget } from '@/lib/qr/landing-target'

/** Whether the wall can attempt a landing-pad scan for this Drone. */
export type PadWallScanState = 'no-signal' | 'not-seen' | 'seen'

/**
 * Same picture gate as `CameraPane` — simulated feed with `camera.streaming` only.
 *
 * Hardware streams and idle cameras have no easy scan surface on the wall yet; those
 * tiles show an em dash until a school-frame scan path lands (#50 follow-up).
 */
export function padWallCanScan(
  camera: CameraState | undefined,
  scenarios: ScenarioControls | null,
): boolean {
  if (scenarios === null) return false
  if (camera === undefined) return false
  return camera.streaming === true
}

export function padWallReadout(
  canScan: boolean,
  target: LandingTarget | null,
): {
  readonly state: PadWallScanState
  readonly headline: string
  readonly detail: string | null
} {
  if (!canScan) {
    return { state: 'no-signal', headline: '·', detail: null }
  }
  if (target === null) {
    return { state: 'not-seen', headline: 'Not seen', detail: null }
  }
  const { title, meaning } = landingTargetPresentation(target)
  return { state: 'seen', headline: title, detail: meaning }
}

export function padWallSummary(states: readonly PadWallScanState[]): number {
  return states.filter((state) => state === 'seen').length
}
