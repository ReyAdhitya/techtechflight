'use client'

import { useMemo } from 'react'
import { classAverageStats } from '@/lib/class-average'
import type { DroneVitals } from '@/lib/vitals'

/**
 * Glanceable class averages above the scope — mean airborne height and readiness share.
 */
export function ClassAverageStrip({ vitals }: { readonly vitals: readonly DroneVitals[] }) {
  const stats = useMemo(() => classAverageStats(vitals), [vitals])

  if (stats.total === 0) return null

  const readinessPct = Math.round((stats.readyCount / stats.total) * 100)

  return (
    <section
      aria-label="Class averages"
      className="flex flex-wrap items-baseline gap-x-6 gap-y-1 rounded-surface border border-hairline bg-surface-1 px-4 py-2"
    >
      <span className="label">Class average</span>
      <span className="tnum text-value text-ink">
        {stats.meanHeightM === null
          ? 'No airborne height'
          : `${stats.meanHeightM.toFixed(1)} m mean height`}
      </span>
      <span className="tnum text-value text-ink-subtle">
        {readinessPct}% ready ({stats.readyCount} of {stats.total})
      </span>
    </section>
  )
}
