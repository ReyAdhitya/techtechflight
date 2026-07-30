'use client'
import { readStopAudit } from '@/lib/stop-audit'
export function StopAuditLog() {
  const entries = typeof window === 'undefined' ? [] : readStopAudit()
  if (entries.length === 0) return <p className="m-0 text-value text-ink-muted">No stops recorded this session.</p>
  return (<ul className="m-0 flex list-none flex-col gap-1 p-0" aria-label="Stop audit log">{entries.map((e) => (<li key={`${e.at}-${e.droneId}`} className="text-value text-ink-subtle"><span className="tnum">{new Date(e.at).toLocaleTimeString()}</span> · {e.callsign}</li>))}</ul>)
}
