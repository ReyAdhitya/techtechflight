'use client'

import { useEffect, useState } from 'react'
import { readLogbook, replaceLogbookFromCloud } from '@/lib/logbook'
import { fetchLogbookSnapshot, readLogbookSyncSecret } from '@/lib/logbook-sync'

/**
 * On Vercel (or any board with a sync secret), pull the cloud Logbook when this browser
 * is empty or older — last-write-wins (#93). Local classroom data is never wiped by an
 * older cloud copy.
 */
export function LogbookCloudHydrator() {
  const [note, setNote] = useState<string | null>(null)

  useEffect(() => {
    if (!readLogbookSyncSecret()) return
    let cancelled = false
    void fetchLogbookSnapshot().then((cloud) => {
      if (cancelled || !cloud) {
        if (!cancelled && readLogbookSyncSecret() && !cloud) {
          const local = readLogbook()
          const empty =
            local.roster.length === 0 &&
            local.lessons.length === 0 &&
            local.trainerLessons.length === 0
          if (empty) {
            setNote('No cloud Logbook yet — save Students on the classroom laptop to sync a copy.')
          }
        }
        return
      }
      const local = readLogbook()
      const localAt = local.revisedAt ?? 0
      if (cloud.updatedAt >= localAt) {
        replaceLogbookFromCloud(cloud.book, cloud.updatedAt)
        setNote('Loaded the cloud Logbook copy (last-write-wins).')
      }
    })
    return () => {
      cancelled = true
    }
  }, [])

  if (!note) return null
  return (
    <p className="m-0 px-4 py-2 text-center text-label text-ink-muted" role="status">
      {note}
    </p>
  )
}
