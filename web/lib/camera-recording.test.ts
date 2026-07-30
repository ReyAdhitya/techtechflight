import { afterEach, describe, expect, it } from 'vitest'
import {
  getCameraRecordingSnapshot,
  isRecording,
  recordingCount,
  resetCameraRecordingForTests,
  startRecording,
  startRecordingAll,
  stopRecording,
  stopRecordingAll,
} from './camera-recording'

describe('camera recording marks', () => {
  afterEach(() => {
    resetCameraRecordingForTests()
  })

  it('starts and stops one Drone', () => {
    startRecording('ttf-0001', 1_000)
    expect(isRecording('ttf-0001')).toBe(true)
    expect(getCameraRecordingSnapshot()['ttf-0001']).toBe(1_000)

    stopRecording('ttf-0001')
    expect(isRecording('ttf-0001')).toBe(false)
  })

  it('starts every id and can stop them all', () => {
    startRecordingAll(['ttf-0001', 'ttf-0002'], 2_000)
    expect(recordingCount()).toBe(2)

    stopRecordingAll(['ttf-0001', 'ttf-0002'])
    expect(recordingCount()).toBe(0)
  })
})
