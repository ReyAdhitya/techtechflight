'use client'

/**
 * One tap assigns the next roster name to a Drone.
 *
 * Target is the selected unassigned craft when one is lit; otherwise the first unassigned
 * Drone in board order — the same walk a Teacher does down the class list.
 */
export function AssignNextButton({
  nextName,
  targetDroneId,
  onAssign,
}: {
  nextName: string | null
  targetDroneId: string | null
  onAssign: () => void
}) {
  if (nextName === null || targetDroneId === null) return null

  return (
    <button
      type="button"
      onClick={onAssign}
      className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink hover:border-ink"
    >
      Assign {nextName}
    </button>
  )
}
