import type { Status } from '@techtechflight/contract'
import { STATUS_PRESENTATION } from '../status-presentation.ts'

/**
 * Status as a shape and a word. The colour is the third signal, never the only one.
 */
export function StatusBadge({ status }: { status: Status }) {
  const presentation = STATUS_PRESENTATION[status]
  return (
    <span className="status-badge" data-status={status}>
      <span className="status-badge__shape" data-shape={presentation.shape} aria-hidden="true" />
      <span className="status-badge__label">{presentation.label}</span>
    </span>
  )
}
