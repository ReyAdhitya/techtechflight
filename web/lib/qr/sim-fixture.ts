/**
 * Static landing-pad QR used while #50 (school stream map / real pixels) is open.
 *
 * The simulated camera feed has no aircraft frames yet, so the board scans this
 * fixture when the sim says streaming — honest demo pixels, labeled as such on
 * the CameraPane. Swap the picture source when a real stream map lands.
 */

export const SIM_LANDING_QR_PAYLOAD = 'ttf-land:pad-A;east=2;north=1'

/** Served from `web/public` — same origin as the static export. */
export const SIM_LANDING_QR_URL = '/qr/landing-pad-a.png'
