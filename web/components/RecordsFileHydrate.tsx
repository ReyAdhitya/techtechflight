'use client'

import { useEffect } from 'react'
import { hydrateRecordsFromFile } from '@/lib/lesson-records'

/**
 * When the records file and this browser disagree, the file wins (ADR-0035).
 *
 * Mounted once around the Teacher board. A missing ground station is a shrug: the browser
 * copy remains, which is how planning on the sofa still works.
 */
export function RecordsFileHydrate() {
  useEffect(() => {
    void hydrateRecordsFromFile()
  }, [])
  return null
}
