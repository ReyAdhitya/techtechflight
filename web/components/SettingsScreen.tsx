'use client'

import { useRef, useState, useSyncExternalStore } from 'react'
import {
  clearLogbook,
  readLogbook,
  readServerLogbook,
  replaceLogbook,
  subscribeLogbook,
  type Logbook,
} from '@/lib/logbook'
import { useFleet } from './FleetProvider'

/**
 * The things a Teacher can change, and the honest account of where their records live.
 *
 * Thresholds are read-only here on purpose. What counts as a usable charge, and how long
 * silence lasts before Telemetry stops being trusted, are the ground station's decisions
 * — they are properties of the room and the radio, and a second copy of them in the
 * browser would drift the moment either changed.
 */
export function SettingsScreen() {
  const { snapshot, demo } = useFleet()
  const book = useSyncExternalStore(subscribeLogbook, readLogbook, readServerLogbook)
  const [message, setMessage] = useState<string | null>(null)
  const fileRef = useRef<HTMLInputElement>(null)

  const notes = Object.keys(book.notes).length
  const decisions = Object.keys(book.service).length

  return (
    <main
      id="content"
      tabIndex={-1}
      className="mx-auto flex w-full max-w-3xl flex-col gap-8 p-4 min-[26rem]:p-8"
    >
      <h1 className="m-0 font-display text-summary font-medium">Settings</h1>

      <Panel title="The ground station">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="label self-center">Connection</dt>
          <dd className="m-0 text-value">
            {demo
              ? 'Demonstration Fleet — no ground station is being contacted'
              : snapshot.connection === 'live'
                ? 'Connected'
                : snapshot.connection === 'connecting'
                  ? 'Connecting'
                  : 'Cannot be reached — retrying'}
          </dd>
          <dt className="label self-center">Drones registered</dt>
          <dd className="tnum m-0 text-value">{snapshot.state?.drones.length ?? 0}</dd>
          <dt className="label self-center">History kept</dt>
          <dd className="tnum m-0 text-value">
            {snapshot.history ? `${snapshot.history.events.length} events` : 'None sent'}
          </dd>
        </dl>
        <p className="m-0 text-value text-ink-subtle">
          The board follows whatever host it is served from and looks for a ground station
          on port 4321. Charge and timing thresholds are set on the ground station, not
          here, so both halves can never disagree about them.
        </p>
      </Panel>

      <Panel title="Your records">
        <p className="m-0 text-value text-ink">
          {notes === 0 && decisions === 0 && book.lessons.length === 0
            ? 'Nothing saved yet.'
            : `${book.lessons.length} lessons, ${notes} notes, ${decisions} service decisions.`}
        </p>
        <p className="m-0 text-value text-ink-subtle">
          Notes, service decisions and lesson records are kept in this browser only. The
          board sends nothing to the ground station, so there is nowhere else to put them
          — which means they do not follow you to another laptop, and clearing site data
          clears them. Export them if they matter.
        </p>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
            onClick={() => {
              const blob = new Blob([JSON.stringify(book, null, 2)], {
                type: 'application/json',
              })
              const url = URL.createObjectURL(blob)
              const link = document.createElement('a')
              link.href = url
              link.download = 'techtechflight-logbook.json'
              link.click()
              URL.revokeObjectURL(url)
              setMessage('Exported.')
            }}
          >
            Export
          </button>

          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
            onClick={() => fileRef.current?.click()}
          >
            Import
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="application/json"
            className="hidden"
            onChange={async (event) => {
              const file = event.target.files?.[0]
              if (!file) return
              try {
                // Every field defaulted rather than trusted: a logbook exported by an
                // older build has none of the newer ones, and a Teacher importing last
                // term's records should get them back, not an error.
                const parsed = JSON.parse(await file.text()) as Partial<Logbook>
                replaceLogbook({
                  notes: parsed.notes ?? {},
                  service: parsed.service ?? {},
                  lessons: parsed.lessons ?? [],
                  pilots: parsed.pilots ?? {},
                })
                setMessage('Imported.')
              } catch {
                setMessage('That file could not be read as a logbook.')
              }
              event.target.value = ''
            }}
          />

          <button
            type="button"
            className="min-h-11 cursor-pointer rounded-pill border border-status-fault bg-transparent px-4 py-1.5 text-value text-status-fault"
            onClick={() => {
              // Deliberately confirmed. Everything else on this board is reversible;
              // this is the one control that destroys something a Teacher wrote.
              if (window.confirm('Delete every note, service decision and lesson record?')) {
                clearLogbook()
                setMessage('Cleared.')
              }
            }}
          >
            Clear everything
          </button>
        </div>

        {message && (
          <p className="m-0 text-value text-ink-muted" role="status">
            {message}
          </p>
        )}
      </Panel>

      <Panel title="Keyboard">
        <dl className="m-0 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2">
          <dt className="label self-center">Ctrl / ⌘ + K</dt>
          <dd className="m-0 text-value">Jump to any Drone or screen</dd>
          <dt className="label self-center">Esc</dt>
          <dd className="m-0 text-value">Close whatever is open</dd>
        </dl>
      </Panel>
    </main>
  )
}

function Panel({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5">
      <h2 className="label m-0">{title}</h2>
      {children}
    </section>
  )
}
