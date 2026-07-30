/** YOLO lesson score from detection counts — classroom glance metric. */
export function yoloLessonScore(detectionCounts: readonly number[]): number {
  if (detectionCounts.length === 0) return 0
  const total = detectionCounts.reduce((a, b) => a + b, 0)
  return Math.round(total / detectionCounts.length)
}

export function formatYoloScore(score: number): string {
  return `${score} detections / craft`
}
