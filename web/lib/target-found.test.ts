import { describe, expect, it } from 'vitest'
import type { Detection } from './object-detection'
import { boxCenterInArea, targetFoundVerdict } from './target-found'

const personInArea: Detection = {
  id: 'p1',
  label: 'person',
  confidence: 0.82,
  box: { x: 0.4, y: 0.3, width: 0.2, height: 0.35 },
}

const searchArea = { x: 0.25, y: 0.2, width: 0.5, height: 0.6 }

describe('targetFoundVerdict', () => {
  it('satisfies the criterion when a person is above confidence inside the search area', () => {
    const result = targetFoundVerdict({
      detections: [personInArea],
      searchArea,
      label: 'person',
      confidenceThreshold: 0.5,
      teacherOverrule: null,
    })

    expect(result.satisfied).toBe(true)
    expect(result.decidedBy).toBe('detection')
    expect(result.words).toMatch(/recognised in the search area/i)
  })

  it('does not count a low-confidence person', () => {
    const result = targetFoundVerdict({
      detections: [{ ...personInArea, confidence: 0.2 }],
      searchArea,
      label: 'person',
      confidenceThreshold: 0.5,
      teacherOverrule: null,
    })

    expect(result.satisfied).toBe(false)
  })

  it('does not count a person outside the search area', () => {
    const result = targetFoundVerdict({
      detections: [
        {
          ...personInArea,
          box: { x: 0.02, y: 0.02, width: 0.1, height: 0.1 },
        },
      ],
      searchArea,
      label: 'person',
      confidenceThreshold: 0.5,
      teacherOverrule: null,
    })

    expect(result.satisfied).toBe(false)
    expect(boxCenterInArea(personInArea.box, searchArea)).toBe(true)
  })

  it('lets the Teacher overrule detection either way', () => {
    const notSeen = targetFoundVerdict({
      detections: [personInArea],
      searchArea,
      label: 'person',
      confidenceThreshold: 0.5,
      teacherOverrule: 'not-found',
    })
    expect(notSeen.satisfied).toBe(false)
    expect(notSeen.decidedBy).toBe('teacher')

    const marked = targetFoundVerdict({
      detections: [],
      searchArea,
      label: 'person',
      confidenceThreshold: 0.5,
      teacherOverrule: 'found',
    })
    expect(marked.satisfied).toBe(true)
    expect(marked.decidedBy).toBe('teacher')
  })
})
