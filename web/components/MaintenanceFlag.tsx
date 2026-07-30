'use client'
export function MaintenanceFlag({ active }: { active: boolean }) {
  if (!active) return null
  return (
    <span className="label rounded-pill border border-status-not-ready px-2 py-0.5 text-status-not-ready">
      Maintenance
    </span>
  )
}
