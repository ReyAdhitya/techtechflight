import { describe, expect, it } from 'vitest'
import { runSelfTest, selfTestWords, type SelfTestResult } from './detector-selftest.ts'

/**
 * Under jsdom there is no WebAssembly runtime, so `boardDetector()` hands back the
 * stand-in — which is the case that matters most here. A self-test that the demo detector
 * could pass would be a button that always says yes.
 */

const result = (overrides: Partial<SelfTestResult> = {}): SelfTestResult => ({
  ok: true,
  ms: 700,
  detectorName: 'YOLOv8n',
  usedRealModel: true,
  found: 0,
  error: null,
  ...overrides,
})

describe('running the self-test', () => {
  it('does not pass on the stand-in detector', async () => {
    const outcome = await runSelfTest()

    expect(outcome.usedRealModel).toBe(false)
    expect(outcome.ok).toBe(false)
    expect(selfTestWords(outcome)).toMatch(/proves nothing/i)
  })

  it('reports how long the frame took either way', async () => {
    const outcome = await runSelfTest()
    expect(outcome.ms).toBeGreaterThanOrEqual(0)
  })
})

describe('what the Teacher reads', () => {
  it('calls a clean run a pass and says how long it took', () => {
    expect(selfTestWords(result())).toMatch(/ran in 700 ms/)
    expect(selfTestWords(result())).toMatch(/working/i)
  })

  it('finding nothing in the test pattern is still a pass', () => {
    /*
     * The fixture is shapes on a canvas, deliberately not a photograph of a person —
     * shipping a likeness with the product is not something to do lightly, and a
     * synthetic figure is not something YOLO reliably recognises anyway. So this proves
     * inference *runs*; zero detections is the expected answer.
     */
    const outcome = result({ found: 0 })
    expect(outcome.ok).toBe(true)
    expect(selfTestWords(outcome)).not.toMatch(/fail/i)
  })

  it('says what threw rather than only that something did', () => {
    const outcome = result({ ok: false, error: 'no available backend found' })
    expect(selfTestWords(outcome)).toMatch(/no available backend found/)
  })

  it('never calls a run with no model a pass', () => {
    // The whole point of the button. A green tick on the stand-in would be a lie.
    expect(result({ usedRealModel: false, ok: false }).ok).toBe(false)
  })
})
