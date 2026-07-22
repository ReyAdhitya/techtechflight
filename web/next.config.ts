import type { NextConfig } from 'next'

/**
 * The board is entirely client-side — it holds no server data of its own, only whatever
 * the ground station streams over the socket. Exporting it as static files keeps the
 * existing deployment story intact: `ground-station/src/server.ts` already serves a
 * directory, and it can serve `web/out` exactly as it serves `dashboard/dist` today.
 */
const config: NextConfig = {
  output: 'export',
  // A school's ground station is reached by IP or hostname with no image pipeline
  // behind it, and every asset is bundled rather than fetched (ADR-0002).
  images: { unoptimized: true },
  // Both are TypeScript source rather than built packages, so the bundler compiles them
  // as if they were part of this app. fleet-core joins contract because the board now
  // runs the Fleet itself when there is no ground station to read one from (ADR-0013).
  transpilePackages: ['@techtechflight/contract', '@techtechflight/fleet-core'],
}

export default config
