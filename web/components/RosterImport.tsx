'use client'
import { useState } from 'react'
import { parseRosterPaste } from '@/lib/roster-import'

export function RosterImport({ onImport }: { onImport: (names: readonly string[]) => void }) {
  const [text, setText] = useState('')
  return (
    <div className="flex flex-col gap-2">
      <label className="label" htmlFor="roster-paste">Paste roster</label>
      <textarea
        id="roster-paste"
        className="min-h-24 rounded-surface border border-hairline bg-surface-1 p-3 text-body text-ink"
        value={text}
        onChange={(e) => setText(e.target.value)}
        placeholder="One name per line"
      />
      <button
        type="button"
        className="min-h-11 w-fit rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink"
        onClick={() => onImport(parseRosterPaste(text))}
      >
        Import names
      </button>
    </div>
  )
}
