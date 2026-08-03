import { afterEach, describe, expect, it } from 'vitest'
import {
  CAMERA_ORIENTATION_KEY,
  getCameraOrientationMap,
  orientationFor,
  orientationTransform,
  parseOrientationMap,
  resetCameraOrientationForTests,
  rotateCamera,
  setCameraOrientation,
  toggleMirror,
} from './camera-orientation'

describe('camera orientation per craft', () => {
  afterEach(() => {
    resetCameraOrientationForTests()
  })

  it('defaults to no mirror and no rotation', () => {
    expect(orientationFor('ttf-0001')).toEqual({ mirror: false, rotation: 0 })
    expect(orientationTransform(orientationFor('ttf-0001'))).toBe('none')
  })

  it('persists mirror and rotation per craft', () => {
    setCameraOrientation('ttf-0001', { mirror: true, rotation: 90 })
    expect(orientationFor('ttf-0001')).toEqual({ mirror: true, rotation: 90 })
    expect(getCameraOrientationMap()['ttf-0001']).toEqual({
      mirror: true,
      rotation: 90,
    })
    const raw = window.localStorage.getItem(CAMERA_ORIENTATION_KEY)
    expect(raw).toContain('ttf-0001')
    expect(parseOrientationMap(raw ?? '{}')['ttf-0001']).toEqual({
      mirror: true,
      rotation: 90,
    })
  })

  it('builds a CSS transform for the pane', () => {
    expect(orientationTransform({ mirror: true, rotation: 0 })).toBe('scaleX(-1)')
    expect(orientationTransform({ mirror: false, rotation: 180 })).toBe(
      'rotate(180deg)',
    )
    expect(orientationTransform({ mirror: true, rotation: 270 })).toBe(
      'scaleX(-1) rotate(270deg)',
    )
  })

  it('toggles mirror and steps rotation without touching other crafts', () => {
    setCameraOrientation('ttf-0002', { mirror: false, rotation: 180 })
    toggleMirror('ttf-0001')
    rotateCamera('ttf-0001', 90)
    rotateCamera('ttf-0001', 90)

    expect(orientationFor('ttf-0001')).toEqual({ mirror: true, rotation: 180 })
    expect(orientationFor('ttf-0002')).toEqual({ mirror: false, rotation: 180 })
  })

  it('drops a craft from storage when reset to default', () => {
    setCameraOrientation('ttf-0001', { mirror: true, rotation: 90 })
    setCameraOrientation('ttf-0001', { mirror: false, rotation: 0 })
    expect(getCameraOrientationMap()['ttf-0001']).toBeUndefined()
    expect(window.localStorage.getItem(CAMERA_ORIENTATION_KEY)).toBeNull()
  })
})
