/**
 * Prove the school-drones door with no aircraft in the room.
 *
 * Sends two valid packets (Drone 1 and Drone 2) and one junk string. The board should show
 * the two and ignore the junk. An unknown id is also sent and must not invent a seventh
 * Drone. Settings must be on School drones (Wi-Fi) and the ground station restarted first.
 *
 *   node scripts/send-esp-packets.mjs
 */
import { createSocket } from 'node:dgram'

const PORT = Number(process.argv[2] ?? 14_555)
const HOST = process.argv[3] ?? '127.0.0.1'

const packets = [
  JSON.stringify({
    id: 'ttf-0001',
    battery: 0.74,
    height: 2.1,
    east: 1.2,
    north: -0.4,
    airborne: true,
  }),
  JSON.stringify({ id: 'ttf-0002', battery: 0.4, airborne: false }),
  'not-json {{{',
  JSON.stringify({ id: 'stray-bench-test', battery: 1, airborne: true }),
]

const socket = createSocket('udp4')
let remaining = packets.length
for (const packet of packets) {
  socket.send(packet, PORT, HOST, (error) => {
    if (error) console.error(error.message)
    remaining -= 1
    if (remaining === 0) socket.close()
  })
}
