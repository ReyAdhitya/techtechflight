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
  transpilePackages: ['@techtechflight/contract'],
}

export default config
