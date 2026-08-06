'use client'
export function SpareInventory({ grounded, total }: { grounded: number; total: number }) {
  const spare = Math.max(0, grounded)
  return (
    <p className="m-0 text-body text-ink-subtle" role="status" aria-label="Spare inventory">
      <span className="tnum font-medium text-ink">{spare}</span> grounded spare, {total} in set
    </p>
  )
}
