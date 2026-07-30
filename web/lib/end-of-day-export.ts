/** End-of-day export — JSON blob download (ZIP when a zip lib is added later). */
export function buildEndOfDayPayload(lessons: readonly { id: string; label: string; startedAt: number; endedAt: number | null }[]): string {
  const dayStart = new Date()
  dayStart.setHours(0, 0, 0, 0)
  const startMs = dayStart.getTime()
  const todays = lessons.filter((l) => l.startedAt >= startMs)
  return JSON.stringify(
    {
      exportedAt: Date.now(),
      count: todays.length,
      lessons: todays,
    },
    null,
    2,
  )
}

export function downloadEndOfDayExport(payload: string, filename = 'techtechflight-eod.json'): void {
  const blob = new Blob([payload], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}
