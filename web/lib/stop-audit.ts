export type StopAuditEntry = { readonly at: number; readonly droneId: string; readonly callsign: string }
const KEY = 'ttf-stop-audit'
export function readStopAudit(): readonly StopAuditEntry[] {
  if (typeof window === 'undefined') return []
  try { const raw = sessionStorage.getItem(KEY); return raw ? (JSON.parse(raw) as StopAuditEntry[]) : [] } catch { return [] }
}
export function recordStopAudit(entry: StopAuditEntry): void {
  if (typeof window === 'undefined') return
  sessionStorage.setItem(KEY, JSON.stringify([entry, ...readStopAudit()].slice(0, 50)))
}
