import {
  EXCEPTION_WORDS,
  PHASE_WORDS,
  type MissionException,
  type MissionPhase,
} from '@/lib/mission-phase'
import { cn } from '@/lib/utils'
import { StatusGlyph } from './StatusBadge'

type PhaseShape = 'filled' | 'hollow' | 'half' | 'square' | 'ringed'

/**
 * Shape and tone for each ordinary Mission phase.
 *
 * Colour never carries a phase on its own — every entry has a written label and a distinct
 * shape as well (ADR-0004). Mount on Control strips once a Mission is running; Integrator
 * wires ControlScreen. Does not reorder strips (DELIBERATE-POSITIONS 1).
 */
const PHASE_PRESENTATION: Readonly<
  Record<MissionPhase, { readonly shape: PhaseShape; readonly className: string }>
> = {
  standby: { shape: 'hollow', className: 'text-ink-muted' },
  'pre-flight': { shape: 'half', className: 'text-ink-subtle' },
  'awaiting-clearance': { shape: 'square', className: 'text-status-not-ready' },
  cleared: { shape: 'filled', className: 'text-ink' },
  takeoff: { shape: 'ringed', className: 'text-ink' },
  stabilising: { shape: 'half', className: 'text-ink' },
  'in-mission': { shape: 'filled', className: 'text-ink' },
  'checkpoint-progress': { shape: 'ringed', className: 'text-ink' },
  'task-complete': { shape: 'filled', className: 'text-ink-subtle' },
  returning: { shape: 'hollow', className: 'text-ink-subtle' },
  landing: { shape: 'half', className: 'text-ink-subtle' },
  finished: { shape: 'hollow', className: 'text-ink-muted' },
}

const EXCEPTION_COLOUR: Readonly<Record<MissionException, string>> = {
  paused: 'text-ink-subtle',
  'new-target': 'text-ink-subtle',
  reprioritised: 'text-ink-subtle',
  avoiding: 'text-status-not-ready',
  'low-battery': 'text-status-not-ready',
  'no-fly': 'text-status-fault',
  'lost-link': 'text-status-fault',
  recovering: 'text-status-not-ready',
  failed: 'text-status-fault',
}

/**
 * Mission phase on a flight strip — word, shape and colour together.
 */
export function MissionPhaseBadge({
  phase,
  exception = null,
  className,
}: {
  readonly phase: MissionPhase
  readonly exception?: MissionException | null
  readonly className?: string
}) {
  const presentation = PHASE_PRESENTATION[phase]
  const label = PHASE_WORDS[phase]
  const tone = exception === null ? presentation.className : EXCEPTION_COLOUR[exception]

  return (
    <span
      className={cn('inline-flex items-center gap-2 text-body', tone, className)}
      data-phase={phase}
      data-exception={exception ?? undefined}
      aria-label={
        exception === null ? label : `${label}. ${EXCEPTION_WORDS[exception]}`
      }
    >
      <StatusGlyph shape={presentation.shape} />
      <span className="font-medium">{label}</span>
      {exception !== null && (
        <span className="font-medium" aria-hidden="true">
          · {EXCEPTION_WORDS[exception]}
        </span>
      )}
    </span>
  )
}
