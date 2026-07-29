import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  CAMERA_STREAM_MAP_KEY,
  clearStoredCameraStreamMap,
  parseCameraStreamMapJson,
  readEnvCameraStreamMap,
  resolveCameraStreamMap,
  sanitizeStreamUrl,
  streamUrlFor,
  writeCameraStreamMap,
} from './camera-stream-map'

describe('school camera stream map', () => {
  beforeEach(() => {
    window.localStorage.clear()
    clearStoredCameraStreamMap()
    vi.unstubAllEnvs()
  })

  afterEach(() => {
    clearStoredCameraStreamMap()
    vi.unstubAllEnvs()
  })

  it('keeps only absolute http(s) URLs without credentials', () => {
    expect(sanitizeStreamUrl('https://cam.school.example/drone1.m3u8')).toBe(
      'https://cam.school.example/drone1.m3u8',
    )
    expect(sanitizeStreamUrl('http://10.0.0.5:8080/stream')).toBe(
      'http://10.0.0.5:8080/stream',
    )
    expect(sanitizeStreamUrl('javascript:alert(1)')).toBeNull()
    expect(sanitizeStreamUrl('data:text/html,<script>')).toBeNull()
    expect(sanitizeStreamUrl('/relative/path')).toBeNull()
    expect(sanitizeStreamUrl('https://user:pass@cam.school.example/x')).toBeNull()
    expect(sanitizeStreamUrl('  ')).toBeNull()
  })

  it('drops bad entries from a JSON map rather than throwing', () => {
    const map = parseCameraStreamMapJson(
      JSON.stringify({
        'ttf-0001': 'https://cam.school.example/1',
        'ttf-0002': 'javascript:alert(1)',
        '': 'https://cam.school.example/empty-id',
        bad: 12,
      }),
    )

    expect(map).toEqual({ 'ttf-0001': 'https://cam.school.example/1' })
    expect(parseCameraStreamMapJson('not-json')).toEqual({})
    expect(parseCameraStreamMapJson('[]')).toEqual({})
  })

  it('resolves Settings storage over the env seed, and env when storage is absent', () => {
    vi.stubEnv(
      'NEXT_PUBLIC_CAMERA_STREAM_MAP',
      JSON.stringify({ 'ttf-0001': 'https://env.example/1' }),
    )

    expect(resolveCameraStreamMap()).toEqual({ 'ttf-0001': 'https://env.example/1' })
    expect(streamUrlFor('ttf-0001')).toBe('https://env.example/1')
    expect(streamUrlFor('ttf-0099')).toBeNull()

    writeCameraStreamMap({ 'ttf-0002': 'https://local.example/2' })
    expect(resolveCameraStreamMap()).toEqual({ 'ttf-0002': 'https://local.example/2' })
    expect(window.localStorage.getItem(CAMERA_STREAM_MAP_KEY)).toContain('ttf-0002')

    clearStoredCameraStreamMap()
    expect(resolveCameraStreamMap()).toEqual({ 'ttf-0001': 'https://env.example/1' })
  })

  it('reads an empty env as an empty map', () => {
    vi.stubEnv('NEXT_PUBLIC_CAMERA_STREAM_MAP', '')
    expect(readEnvCameraStreamMap()).toEqual({})
  })
})
