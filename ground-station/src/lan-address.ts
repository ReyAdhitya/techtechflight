import { networkInterfaces, type NetworkInterfaceInfo } from 'node:os'

/**
 * Adapters an iPad on the classroom router cannot use.
 *
 * Docker, WSL and Hyper-V all hand out RFC1918 addresses, so a "prefer private" rule
 * prints them first on a developer laptop. A phone pointed at that QR never reaches the
 * board. Skip the name rather than the 172.16/12 range: a travel router may itself be 172.16.
 */
const VIRTUAL = /vethernet|wsl|hyper-v|docker|vbox|vmware|virtualbox|loopback|bluetooth|virtual/i

export interface LanCandidate {
  readonly family: string | number
  readonly internal: boolean
  readonly address: string
}

/**
 * The address a device on the same router can reach, or null.
 *
 * IPv4, not internal, not a virtual adapter, preferring 192.168 then 10. then other
 * private. Same rule as `scripts/classroom-address.mjs`, so the words on Settings and the
 * square in the launcher name the same place.
 */
export function pickLanAddress(
  nics: Readonly<Record<string, readonly LanCandidate[] | undefined>>,
): string | null {
  const candidates: { name: string; address: string }[] = []
  for (const [name, addresses] of Object.entries(nics)) {
    if (VIRTUAL.test(name)) continue
    for (const entry of addresses ?? []) {
      if (!isIpv4(entry.family) || entry.internal) continue
      candidates.push({ name, address: entry.address })
    }
  }
  candidates.sort((left, right) => rankPrivate(left.address) - rankPrivate(right.address))
  return candidates[0]?.address ?? null
}

function isIpv4(family: string | number): boolean {
  return family === 'IPv4' || family === 4
}

function rankPrivate(address: string): number {
  if (address.startsWith('192.168.')) return 0
  if (address.startsWith('10.')) return 1
  if (/^172\.(1[6-9]|2\d|3[01])\./.test(address)) return 2
  return 3
}

export function lanAddress(): string | null {
  return pickLanAddress(networkInterfaces() as Record<string, NetworkInterfaceInfo[] | undefined>)
}

/** The URL an iPad types. `/student` is the Student door; the Teacher board stays on localhost. */
export function ipadUrl(port: number): string | null {
  const address = lanAddress()
  return address === null ? null : `http://${address}:${port}/student`
}
