'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useDrones } from './FleetProvider'
import { DESTINATIONS } from './SiteNav'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'

interface Command {
  readonly id: string
  readonly label: string
  readonly hint: string
  readonly href: string
}

/**
 * Every Drone and every screen, one keystroke away.
 *
 * A Teacher at a podium with a class in front of them is the opposite of a user with a
 * free hand and time to aim. `Ctrl`/`⌘` + `K` and three letters of a Drone's name gets
 * them there without looking for a target. Deliberately navigation only — it moves a
 * Teacher around the board and never touches a Drone, because the board sends nothing to
 * the Fleet and a palette is exactly where that rule would quietly get broken.
 */
export function CommandPalette() {
  const router = useRouter()
  const drones = useDrones()
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [highlighted, setHighlighted] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  const commands = useMemo<Command[]>(
    () => [
      /*
       * The Mission run leads, and it is the first entry of `DESTINATIONS` now rather than a
       * separate one bolted on here. It used to be reachable only through this palette, which
       * is `Ctrl` + `K` and does not exist on a tablet: a Teacher on Walls with an iPad was
       * stranded there.
       */
      ...DESTINATIONS.map((destination) => ({
        id: `go:${destination.href}`,
        label: destination.label,
        hint: destination.hint,
        href: destination.href,
      })),
      ...drones.map((drone) => ({
        id: `drone:${drone.id}`,
        label: drone.name,
        hint: STATUS_PRESENTATION[drone.status].label,
        href: `/drone?id=${encodeURIComponent(drone.id)}`,
      })),
    ],
    [drones],
  )

  const matches = useMemo(() => {
    const needle = query.trim().toLowerCase()
    if (!needle) return commands
    return commands.filter((command) =>
      `${command.label} ${command.hint}`.toLowerCase().includes(needle),
    )
  }, [commands, query])

  useEffect(() => {
    const onKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
        event.preventDefault()
        setOpen((wasOpen) => !wasOpen)
        return
      }
      if (event.key === 'Escape') setOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [])

  useEffect(() => {
    if (open) {
      setQuery('')
      setHighlighted(0)
      // Focus after the element exists, so the first keystroke is not lost.
      const frame = requestAnimationFrame(() => inputRef.current?.focus())
      return () => cancelAnimationFrame(frame)
    }
    return undefined
  }, [open])

  if (!open) return null

  const go = (command: Command | undefined) => {
    if (!command) return
    setOpen(false)
    router.push(command.href)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center bg-black/60 p-4 pt-[12vh]"
      onClick={() => setOpen(false)}
      role="presentation"
    >
      <div
        className="flex w-full max-w-lg flex-col overflow-hidden rounded-surface border border-hairline bg-surface-1"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-label="Go to"
      >
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            setQuery(event.target.value)
            setHighlighted(0)
          }}
          onKeyDown={(event) => {
            if (event.key === 'ArrowDown') {
              event.preventDefault()
              setHighlighted((index) => Math.min(index + 1, matches.length - 1))
            } else if (event.key === 'ArrowUp') {
              event.preventDefault()
              setHighlighted((index) => Math.max(index - 1, 0))
            } else if (event.key === 'Enter') {
              event.preventDefault()
              go(matches[highlighted])
            }
          }}
          className="border-0 border-b border-hairline bg-transparent px-4 py-3 text-body text-ink outline-none"
          placeholder="Go to a Drone or a screen…"
          aria-label="Search Drones and screens"
        />

        {/* `relative` so nothing absolute inside can escape the clip. See
            `web/scroll-containers.test.ts`. */}
        <ul className="relative m-0 max-h-80 list-none overflow-y-auto p-0">
          {matches.length === 0 && (
            <li className="px-4 py-3 text-value text-ink-subtle">No match.</li>
          )}
          {matches.map((command, index) => (
            <li key={command.id}>
              <button
                type="button"
                className={cn(
                  'flex w-full cursor-pointer items-baseline gap-3 border-0 bg-transparent px-4 py-2.5 text-left',
                  index === highlighted && 'bg-muted',
                )}
                onMouseEnter={() => setHighlighted(index)}
                onClick={() => go(command)}
              >
                <span className="font-display text-body font-medium text-ink">
                  {command.label}
                </span>
                <span className="text-value text-ink-subtle">{command.hint}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
