'use client'

import { useId, useRef } from 'react'
import * as Dialog from '@radix-ui/react-dialog'
import type { CameraState } from '@techtechflight/contract'
import type { ScenarioControls } from '@/lib/fleet-link'
import { CameraPane } from './CameraPane'

/**
 * A large centered popup that hosts the existing CameraPane for one Drone.
 *
 * Teaching surface entry point — Teachers open this from Control (or Fleet), not
 * from Settings. Settings still owns the stream map. Telemetry never carries a
 * URL; Start/Stop stay ScenarioControls inside CameraPane (C9).
 *
 * Centered and wide on purpose (#67): a right-hand rail felt too small for the feed.
 * Name stays `CameraSlide` for the call sites from #59.
 */
export function CameraSlide({
  droneId,
  droneName,
  camera,
  scenarios,
  onClose,
}: {
  droneId: string
  droneName: string
  camera: CameraState | undefined
  scenarios: ScenarioControls | null
  onClose: () => void
}) {
  const contentRef = useRef<HTMLDivElement>(null)
  const titleId = useId()

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-40 bg-black/50" />
        <Dialog.Content
          ref={contentRef}
          aria-labelledby={titleId}
          className="fixed left-1/2 top-1/2 z-50 flex w-[min(42rem,92vw)] max-h-[calc(100vh-2rem)] -translate-x-1/2 -translate-y-1/2 flex-col gap-4 overflow-y-auto rounded-surface border border-hairline bg-canvas p-4 shadow-none min-[26rem]:p-6"
          /*
           * Focus the dialog, not the first Camera control — Start would otherwise
           * steal focus and Escape could feel like a Command cancel.
           */
          onOpenAutoFocus={(event) => {
            event.preventDefault()
            contentRef.current?.focus()
          }}
          tabIndex={-1}
        >
          <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2">
            <Dialog.Title
              id={titleId}
              className="m-0 font-display text-summary font-medium text-ink"
            >
              {droneName} camera
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
              >
                Close
              </button>
            </Dialog.Close>
          </div>

          <CameraPane
            droneId={droneId}
            droneName={droneName}
            camera={camera}
            scenarios={scenarios}
          />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  )
}
