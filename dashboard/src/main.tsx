import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

// Fonts are bundled rather than fetched. The board has to work in a school with no
// usable internet (ADR-0002), and a webfont CDN would strand it there.
import '@fontsource/plus-jakarta-sans/400.css'
import '@fontsource/plus-jakarta-sans/500.css'
import '@fontsource/inter/400.css'
import '@fontsource/inter/500.css'

import './styles/tokens.css'
import './styles/board.css'

import { SystemClock } from '@techtechflight/contract/testing'
import { App } from './App.tsx'
import { FleetConnection, browserSocket } from './fleet-connection.ts'

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
