/**
 * Whether a Drone's link reads as live on the Last Contact wall.
 *
 * Responding and not Stale is alive; never responded or Stale is not.
 */
export function isHeartbeatAlive(stale: boolean, lastContact: number | null): boolean {
  return lastContact !== null && !stale
}

export function heartbeatWallSummary(
  drones: readonly { readonly stale: boolean; readonly lastContact: number | null }[],
): number {
  return drones.filter((drone) => !isHeartbeatAlive(drone.stale, drone.lastContact)).length
}
