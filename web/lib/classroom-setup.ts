/**
 * Where the board talks HTTP to the ground station for Classroom setup.
 *
 * Socket Fleet traffic uses the same host:port. When Next serves the board on :3000,
 * setup still hits :4321. When the `.bat` serves everything from the ground station,
 * same-origin is enough.
 */
export function groundStationHttpOrigin(location: {
  protocol: string
  hostname: string
  port: string
}): string {
  if (location.port === '4321' || location.port === '') {
    return `${location.protocol}//${location.hostname}${location.port ? `:${location.port}` : ''}`
  }
  return `${location.protocol}//${location.hostname}:4321`
}

export type ClassroomTelemetrySource = 'simulator' | 'esp' | 'mavlink'

export interface ClassroomSetupStatus {
  readonly active: ClassroomTelemetrySource
  readonly preferred: ClassroomTelemetrySource
  readonly restartRequired: boolean
  readonly commands: 'available' | 'monitoring-only'
}

export async function fetchClassroomSetup(
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<ClassroomSetupStatus | null> {
  try {
    const response = await fetchImpl(`${origin}/api/classroom-setup`)
    if (!response.ok) return null
    return (await response.json()) as ClassroomSetupStatus
  } catch {
    return null
  }
}

export async function putClassroomSetup(
  origin: string,
  source: ClassroomTelemetrySource,
  fetchImpl: typeof fetch = fetch,
): Promise<ClassroomSetupStatus | null> {
  try {
    const response = await fetchImpl(`${origin}/api/classroom-setup`, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ source }),
    })
    if (!response.ok) return null
    return (await response.json()) as ClassroomSetupStatus
  } catch {
    return null
  }
}

export async function fetchIpadUrl(
  origin: string,
  fetchImpl: typeof fetch = fetch,
): Promise<string | null> {
  try {
    const response = await fetchImpl(`${origin}/api/classroom-address`)
    if (!response.ok) return null
    const body = (await response.json()) as { url?: unknown }
    return typeof body.url === 'string' && body.url !== '' ? body.url : null
  } catch {
    return null
  }
}
