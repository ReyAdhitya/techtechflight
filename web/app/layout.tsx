import type { Metadata, Viewport } from 'next'
import type { ReactNode } from 'react'

// Fonts are bundled rather than fetched. The board has to work in a school with no
// usable internet (ADR-0002), and a webfont CDN would strand it there.
import '@fontsource/schibsted-grotesk/400.css'
import '@fontsource/schibsted-grotesk/500.css'
import '@fontsource/schibsted-grotesk/600.css'
import '@fontsource/hanken-grotesk/400.css'
import '@fontsource/hanken-grotesk/500.css'
import '@fontsource/hanken-grotesk/600.css'

import './globals.css'

export const metadata: Metadata = {
  title: 'Flight Deck, TechTech',
  description: 'The state of every Drone in the classroom set.',
}

export const viewport: Viewport = {
  // Keep mobile Safari and Chrome on the physical device width. A responsive board must
  // never rely on either browser's shrink-to-fit fallback to make wide chrome appear to fit.
  width: 'device-width',
  initialScale: 1,
  // The board is glanced at rather than read; pinch-zoom stays available, but the
  // colours have to be right whichever theme the machine is in.
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#17130e' },
    { media: '(prefers-color-scheme: light)', color: '#f4f3f0' },
  ],
}

/*
 * Stamped before first paint rather than in an effect.
 *
 * A board that flashed the wrong theme on every reload would do it in front of a class.
 * An explicit stored choice first, the machine's preference otherwise (design.md §2). The
 * toggle re-applies it on mount, so this script is an optimisation against flashing and
 * never the source of truth.
 *
 * It used to stamp a second attribute for large format. That is gone (ADR-0034).
 */
const BOOT = `try{var t=localStorage.getItem('theme');if(t!=='light'&&t!=='dark'){t=window.matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'}document.documentElement.dataset.theme=t}catch(e){}`

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    // The boot script sets attributes on <html> before React hydrates, so the two
    // disagree by design.
    <html lang="en-GB" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body>{children}</body>
    </html>
  )
}
