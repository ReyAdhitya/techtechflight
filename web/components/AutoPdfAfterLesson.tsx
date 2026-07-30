'use client'

import { useState } from 'react'
import { downloadReportsPdf, type ReportsPdfInput } from '@/lib/reports-pdf'

/** Offer auto PDF download after a lesson ends — Teacher confirms. */
export function AutoPdfAfterLesson({
  open,
  input,
  onClose,
}: {
  open: boolean
  input: ReportsPdfInput | null
  onClose: () => void
}) {
  if (!open || !input) return null
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
      role="dialog"
      aria-labelledby="auto-pdf-title"
    >
      <div className="flex max-w-md flex-col gap-4 rounded-surface border border-hairline bg-canvas p-6">
        <h2 id="auto-pdf-title" className="m-0 font-display text-summary font-medium text-ink">
          Lesson report ready
        </h2>
        <p className="m-0 text-body text-ink-subtle">
          Download the PDF report for this lesson now, or dismiss and export later from Reports.
        </p>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            className="min-h-11 rounded-pill border-0 bg-ink px-4 py-1.5 text-caption text-canvas"
            onClick={() => {
              downloadReportsPdf(input)
              onClose()
            }}
          >
            Download PDF
          </button>
          <button
            type="button"
            className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink"
            onClick={onClose}
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}

/** Hook-friendly flag for lesson-just-ended — parent owns timing. */
export function useAutoPdfPrompt() {
  const [open, setOpen] = useState(false)
  return { open, openPrompt: () => setOpen(true), closePrompt: () => setOpen(false) }
}
