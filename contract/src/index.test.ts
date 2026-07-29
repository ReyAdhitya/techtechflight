import { describe, expect, it } from 'vitest'
import {
  isCommandable,
  type CameraState,
  type DroneCommand,
  type TelemetrySource,
} from './index.ts'

/**
 * The seam that decides whether a Command can reach a Fleet at all.
 *
 * ADR-0011 rests on this being a property of the Telemetry Source rather than a setting.
 * A hardware adapter must not be able to accept a Command by forgetting to guard against
 * one — only by someone deliberately writing the interface's name.
 */

const reporting: TelemetrySource = {
  connect() {},
  disconnect() {},
  onObservation: () => () => {},
}

describe('a Telemetry Source that only reports', () => {
  it('is not commandable', () => {
    expect(isCommandable(reporting)).toBe(false)
  })
})

describe('a Telemetry Source that accepts Commands', () => {
  it('is recognised as commandable', () => {
    const commandable = { ...reporting, command: (_: DroneCommand) => {} }

    expect(isCommandable(commandable)).toBe(true)
  })

  it('is not recognised by a property that merely has the right name', () => {
    // A source carrying a `command` field of some other kind is not a source that can
    // carry out a Command, and the guard has to be able to tell.
    const impostor = { ...reporting, command: 'land' } as unknown as TelemetrySource

    expect(isCommandable(impostor)).toBe(false)
  })
})

describe('camera on Telemetry', () => {
  it('carries only whether it is streaming — never a URL', () => {
    const camera: CameraState = { streaming: false }
    expect(Object.keys(camera)).toEqual(['streaming'])
    expect('url' in camera).toBe(false)
  })
})
