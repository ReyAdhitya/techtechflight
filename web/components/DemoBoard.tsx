'use client'

import { useEffect, useMemo, useState } from 'react'
import { buildScenario } from '@/lib/scenarios'
import { FleetBoard } from './FleetBoard'

/*
 * Stable during prerender and hydration. The browser replaces this anchor after mount,
 * so the fixture reads as freshly received without making the server and first client
 * render disagree.
 */
const PRERENDER_ANCHOR = 1_000_000

/** The Flight Deck driven by explicit sample data, with no WebSocket attempt. */
export function DemoBoard() {
  const [anchor, setAnchor] = useState(PRERENDER_ANCHOR)
  const [now, setNow] = useState(PRERENDER_ANCHOR)
  const snapshot = useMemo(() => buildScenario('demo', anchor), [anchor])

  useEffect(() => {
    const mountedAt = Date.now()
    setAnchor(mountedAt)
    setNow(mountedAt)

    const interval = window.setInterval(() => setNow(Date.now()), 1_000)
    return () => window.clearInterval(interval)
  }, [])

  if (!snapshot) throw new Error('The demonstration scenario must produce a Fleet')

  return <FleetBoard snapshot={snapshot} now={now} demo />
}
