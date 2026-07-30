/** Who the tile names — Logbook assignment when present, otherwise the Drone callsign. */
export function cameraTileLabel(droneName: string, student: string | null): string {
  return student ?? droneName
}
