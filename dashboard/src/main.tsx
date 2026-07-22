import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are bundled rather than fetched. The board has to work in a school with no
// usable internet (ADR-0002), and a webfont CDN would strand it there.
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'

import './styles/tokens.css'
import './styles/board.css'

import { SystemClock } from '@techtechflight/contract/testing'
import { App } from './App.tsx'
import { applyDisplayScale, readDisplayScale } from './display-scale.ts'
import { FleetConnection, browserSocket } from './fleet-connection.ts'
import { resolveInitialTheme, writeTheme } from './theme.ts'

// Before the first render rather than in an effect, so a board set to large format or to
// the lit-room theme does not flash the wrong one on every reload in front of a class.
writeTheme(resolveInitialTheme())
applyDisplayScale(readDisplayScale())

const clock = new SystemClock()

/**
 * Same host as the page by default, so the board follows wherever the ground station is
 * served from. Overridable for a dashboard pointed at a ground station elsewhere.
 */
const url =
  import.meta.env['VITE_FLEET_URL'] ??
  `${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.hostname}:4321/fleet`

const connection = new FleetConnection({ url, clock, createSocket: browserSocket })

const container = document.getElementById('root')
if (!container) throw new Error('The dashboard has nowhere to mount')

createRoot(container).render(
  <StrictMode>
    <App connection={connection} clock={clock} />
  </StrictMode>,
)
