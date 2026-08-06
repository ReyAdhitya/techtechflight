import type { Detection, DetectionBox } from './object-detection'

/**
 * Whether Search and Rescue's find-the-target criterion is met.
 *
 * A person recognised above a confidence threshold inside the search area satisfies it.
 * The Teacher can overrule — found or not found — and that answer stands.
 */

/** Default confidence for COCO "person" on a classroom board. */
export const DEFAULT_TARGET_CONFIDENCE = 0.5

export interface NormalizedArea {
  readonly x: number
  readonly y: number
  readonly width: number
  readonly height: number
}

export type TeacherTargetOverrule = 'found' | 'not-found' | null

export interface TargetFoundInput {
  readonly detections: readonly Detection[]
  readonly searchArea: NormalizedArea
  readonly label: string
  readonly confidenceThreshold: number
  readonly teacherOverrule: TeacherTargetOverrule
}

export interface TargetFoundResult {
  readonly satisfied: boolean | null
  readonly decidedBy: 'detection' | 'teacher' | null
  readonly words: string
}

export function targetFoundVerdict(input: TargetFoundInput): TargetFoundResult {
  const { teacherOverrule } = input

  if (teacherOverrule === 'found') {
    return {
      satisfied: true,
      decidedBy: 'teacher',
      words: 'Target found. Marked by the Teacher.',
    }
  }

  if (teacherOverrule === 'not-found') {
    return {
      satisfied: false,
      decidedBy: 'teacher',
      words: 'Target not found. Marked by the Teacher.',
    }
  }

  const match = findMatchingDetection(input)
  if (match !== null) {
    return {
      satisfied: true,
      decidedBy: 'detection',
      words: `Target found, ${match.label} recognised in the search area.`,
    }
  }

  return {
    satisfied: false,
    decidedBy: 'detection',
    words: 'Target not yet found in the search area.',
  }
}

function findMatchingDetection(input: TargetFoundInput): Detection | null {
  const label = input.label.trim().toLowerCase()
  for (const detection of input.detections) {
    if (detection.confidence < input.confidenceThreshold) continue
    if (detection.label.trim().toLowerCase() !== label) continue
    if (!boxCenterInArea(detection.box, input.searchArea)) continue
    return detection
  }
  return null
}

/** Whether the centre of a normalised box lies inside the search area. */
export function boxCenterInArea(box: DetectionBox, area: NormalizedArea): boolean {
  const centerX = box.x + box.width / 2
  const centerY = box.y + box.height / 2
  return (
    centerX >= area.x &&
    centerX <= area.x + area.width &&
    centerY >= area.y &&
    centerY <= area.y + area.height
  )
}
