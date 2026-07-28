/**
 * Recorded MAVLink v2 frames from a craft at system id 1, component 1.
 *
 * Frozen as hex so the suite does not regenerate them from `node-mavlink` on every run —
 * the parser under test must accept the same bytes an ArduPilot craft would emit. Built
 * once with `new MavLinkProtocolV2(1, 1).serialize(message, seq)`. Trailing-zero payload
 * truncation is part of the v2 wire format and is left as the serializer produced it.
 */

function bytes(hex: string): Buffer {
  return Buffer.from(hex, 'hex')
}

/** HEARTBEAT — quadrotor, ArduPilot, armed, ACTIVE. */
export const FRAME_HEARTBEAT_ARMED = bytes('fd0900000101010000000000000002038004033474')

/** SYS_STATUS — 84% remaining, 12.1 V. */
export const FRAME_SYS_STATUS_84 = bytes(
  'fd1f0000020101010000000000000000000000000000f401442f780000000000000000000000000054394b',
)

/** SYS_STATUS — 71% remaining (same craft, later reading). */
export const FRAME_SYS_STATUS_71 = bytes(
  'fd1f0000030101010000000000000000000000000000f401442f780000000000000000000000000047085e',
)

/** LOCAL_POSITION_NED — 1.1 m north, 2.4 m east, 1.7 m up (z = −1.7). */
export const FRAME_LOCAL_POSITION = bytes(
  'fd100000040101200000e02e0000cdcc8c3f9a9919409a99d9bf0433',
)

/** ATTITUDE — roll / pitch / yaw in radians. */
export const FRAME_ATTITUDE = bytes(
  'fd1000000501011e0000e02e0000cdcccc3dcdcc4cbdf90fc93f39db',
)

/** HEARTBEAT — same craft, CRITICAL. */
export const FRAME_HEARTBEAT_CRITICAL = bytes('fd090000060101000000000000000203800503ab9c')
