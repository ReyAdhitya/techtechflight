import { LandingPadWorkflowSim } from '../LandingPadWorkflowSim'
'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import type { CameraState, DroneState } from '@techtechflight/contract'
import { useFleet } from '@/components/FleetProvider'
import type { ScenarioControls } from '@/lib/fleet-link'
import { createJsQrDecoder } from '@/lib/qr/decoder'
import { type LandingTarget } from '@/lib/qr/landing-target'
import {
  createUrlScanner,
  type LandingTargetScanner,
} from '@/lib/qr/scan-landing-target'
import { SIM_LANDING_QR_URL } from '@/lib/qr/sim-fixture'
import { cn } from '@/lib/utils'
import type { DroneVitals } from '@/lib/vitals'
import {
  padWallCanScan,
  padWallReadout,
  padWallSummary,
  type PadWallScanState,
} from './pad-wall'
import { WallGrid, WallTile } from './WallGrid'

const defaultQrDecoder = createJsQrDecoder()

/**
 * Landing-pad QR at a glance â€” one tile per Drone in board order.
 *
 * Read-only; reuses the camera landing-target presentation. Never writes Telemetry.
 * Tap a tile for Drone detail.
 */
export function PadWall({
  emptyLabel = 'Waiting for the Fleet.',
  landingScannerForDrone,
}: {
  emptyLabel?: string
  /**
   * Injected in tests. When omitted, sim + streaming scans the static landing-pad
   * fixture â€” same path as `CameraPane`.
   */
  landingScannerForDrone?: (
    droneId: string,
  ) => LandingTargetScanner | null | undefined
}) {
  const { snapshot, vitals, scenarios } = useFleet()
  const drones = snapshot.state?.drones
  const [statesByDrone, setStatesByDrone] = useState<Record<string, PadWallScanState>>({})

  if (!drones || drones.length === 0) {
    return <p className="m-0 text-body text-ink-muted">{emptyLabel}</p>
  }

  const seenCount = padWallSummary(Object.values(statesByDrone))

  return (
    <div className="flex flex-col gap-4">
      <p className="m-0 font-display text-summary font-medium text-ink">
        <span className="tnum">{seenCount}</span>
        {' seen'}
      </p>
      <WallGrid>
        {vitals.map((entry) => {
          const drone = drones.find((d) => d.id === entry.droneId)
          const camera = drone?.telemetry?.camera
          const canScan = padWallCanScan(camera, scenarios)

          return (
            <PadWallTile
              key={entry.droneId}
              entry={entry}
              drone={drone}
              camera={camera}
              canScan={canScan}
              landingScanner={landingScannerForDrone?.(entry.droneId)}
              onStateChange={(state) =>
                setStatesByDrone((prev) =>
                  prev[entry.droneId] === state ? prev : { ...prev, [entry.droneId]: state },
                )
              }
            />
          )
        })}
      </WallGrid>
    </div>
  )
}

function PadWallTile({
  entry,
  drone,
  camera,
  canScan,
  landingScanner,
  onStateChange,
}: {
  entry: DroneVitals
  drone: DroneState | undefined
  camera: CameraState | undefined
  canScan: boolean
  landingScanner: LandingTargetScanner | null | undefined
  onStateChange: (state: PadWallScanState) => void
}) {
  const target = useLandingTargetScan({
    hasPicture: canScan,
    landingScanner,
  })
  const readout = padWallReadout(canScan, target)

  useEffect(() => {
    onStateChange(readout.state)
  }, [onStateChange, readout.state])

  const noCamera = camera === undefined && drone?.telemetry

  return (
    <WallTile
      className={cn('relative p-0', readout.state === 'seen' && 'border-hairline')}
      data-pad-seen={readout.state === 'seen' || undefined}
      data-pad-state={readout.state}
    >
      <Link
        href={`/drone?id=${encodeURIComponent(entry.droneId)}`}
        prefetch={false}
        aria-label={`${entry.callsign}, ${readout.headline}`}
        className="flex min-h-[6rem] flex-col gap-2 rounded-sm p-3 text-inherit no-underline hover:text-inherit focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-ink"
      >
        <p className="m-0 font-display text-body font-medium text-ink">{entry.callsign}</p>

        {noCamera ? (
          <p className="m-0 text-value text-ink-subtle">No camera fitted</p>
        ) : null}

        <p
          className={cn(
            'm-0 text-value',
            readout.state === 'seen'
              ? 'text-ink'
              : readout.state === 'not-seen'
                ? 'text-ink-subtle'
                : 'tnum text-ink-subtle',
          )}
        >
          {readout.headline}
        </p>

        {readout.detail ? (
          <p className="m-0 text-value text-ink-subtle">{readout.detail}</p>
        ) : null}
      </Link>
    </WallTile>
  )
}

function useLandingTargetScan({
  hasPicture,
  landingScanner,
}: {
  hasPicture: boolean
  landingScanner: LandingTargetScanner | null | undefined
}): LandingTarget | null {
  const [target, setTarget] = useState<LandingTarget | null>(null)

  useEffect(() => {
    if (!hasPicture) {
      setTarget(null)
      return
    }

    const scanner =
      landingScanner !== undefined
        ? landingScanner
        : createUrlScanner(SIM_LANDING_QR_URL, defaultQrDecoder)

    if (!scanner) {
      setTarget(null)
      return
    }

    let cancelled = false
    void scanner.scan().then((found) => {
      if (!cancelled) setTarget(found)
    })

    return () => {
      cancelled = true
    }
  }, [hasPicture, landingScanner])

  return target
}
