import type { Status } from '@techtechflight/contract'
import { STATUS_PRESENTATION } from '@/lib/status-presentation'
import { cn } from '@/lib/utils'

type StatusShape = (typeof STATUS_PRESENTATION)[Status]['shape']

/**
 * Shape is the affordance that survives a projector, a photocopier, and a colour-blind
 * Teacher. Colour is the third signal, never the only one.
 *
 * Each shape is drawn from the current text colour, so the badge inherits whatever the
 * Status colour is on the tile rather than restating it here.
 */
const SHAPES: Record<StatusShape, string> = {
  filled: 'rounded-full bg-current',
  hollow: 'rounded-full border-2 border-current',
  half: 'rounded-full border-2 border-current bg-[linear-gradient(90deg,currentColor_50%,transparent_50%)]',
  square: 'bg-current',
  /*
   * A ring, drawn with outline rather than a shadow — the system has no shadow tier.
   * In rem for the reason given below: 0.09375rem and 0.15625rem are exactly the 1.5px
   * and 2.5px this was drawn at, expressed so they follow the scale.
   */
  ringed:
    'rounded-full bg-current outline-[0.09375rem] outline-current outline-offset-[0.15625rem]',
}

export function StatusGlyph({
  shape,
  className,
}: {
  readonly shape: StatusShape
  readonly className?: string
}) {
  return (
    <span
      className={cn('size-[0.6875rem] flex-none', SHAPES[shape], className)}
      data-shape={shape}
      aria-hidden="true"
    />
  )
}

const STATUS_COLOUR: Record<Status, string> = {
  Ready: 'text-status-ready',
  Flying: 'text-status-flying',
  Offline: 'text-status-offline',
  'Not Ready': 'text-status-not-ready',
  Fault: 'text-status-fault',
}

export function StatusBadge({ status }: { status: Status }) {
  const presentation = STATUS_PRESENTATION[status]

  return (
    <span
      // The shape is drawn in currentColor, so badge and glyph resolve together.
      className={cn('inline-flex items-center gap-2 text-body', STATUS_COLOUR[status])}
      data-status={status}
    >
      {/*
       * In rem, not px. 0.6875rem is exactly the 11px this was drawn at, but px made the
       * shape the one element on the board that ignored the Teacher's own font size: turn
       * the browser up and every size around it grew while this stayed at 11px, falling
       * from 46% of the tile name beside it to 23%. The shape is the signal that carries
       * Status without colour, and a Teacher who has asked for bigger type is exactly the
       * one who needs it — so it was shrinking, relatively, for the reader who asked.
       */}
      <StatusGlyph shape={presentation.shape} />
      <span className="font-medium">{presentation.label}</span>
    </span>
  )
}
