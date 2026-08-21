export { MavlinkTelemetrySource } from './mavlink-source.ts'
export type { MavlinkSourceOptions } from './mavlink-source.ts'

/**
 * The door the school's own drones knock on: small JSON over UDP, no protocol to agree on.
 * MAVLink above stays for anyone who ever wants it; this is the path the school is on.
 */
export { EspTelemetrySource, type EspSourceOptions } from './esp-source.ts'
