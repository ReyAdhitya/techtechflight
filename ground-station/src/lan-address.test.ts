import { describe, expect, it } from 'vitest'
import { ipadUrl, lanAddress, pickLanAddress } from './lan-address.ts'

const nic = (address: string, family: string | number = 'IPv4') => [
  { family, internal: false, address },
]

describe('which address the iPads type', () => {
  it('prefers a travel-router address over Docker', () => {
    expect(
      pickLanAddress({
        'vEthernet (WSL)': nic('172.17.176.1'),
        'Wi-Fi': nic('10.0.0.2'),
      }),
    ).toBe('10.0.0.2')
  })

  it('prefers 192.168 over 10 over other private', () => {
    expect(
      pickLanAddress({
        Ethernet: nic('10.0.0.2'),
        'Wi-Fi': nic('192.168.1.4'),
        'Local Area Connection': nic('172.16.0.8'),
      }),
    ).toBe('192.168.1.4')
  })

  it('says nothing when the only addresses are virtual', () => {
    expect(
      pickLanAddress({
        'vEthernet (Default Switch)': nic('172.17.176.1'),
        docker0: nic('172.17.0.1'),
      }),
    ).toBeNull()
  })

  it('never invents localhost', () => {
    expect(
      pickLanAddress({
        Loopback: [{ family: 'IPv4', internal: true, address: '127.0.0.1' }],
      }),
    ).toBeNull()
  })
})

describe('the address the iPads type on this machine', () => {
  it('is a Student URL on this laptop\'s LAN, never localhost', () => {
    const address = lanAddress()
    if (address === null) return
    expect(address).not.toBe('127.0.0.1')
    expect(ipadUrl(4321)).toBe(`http://${address}:4321/student`)
  })

  it('says nothing when the laptop has no network yet', () => {
    const url = ipadUrl(4321)
    if (lanAddress() === null) expect(url).toBeNull()
    else expect(url).toMatch(/^http:\/\/.+:4321\/student$/)
  })
})
