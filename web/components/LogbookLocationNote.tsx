/**
 * Where Lesson / Student / Trainer records actually live.
 *
 * The working store is this browser's Logbook (localStorage) on the machine running
 * the board — typically localhost in the classroom. Vercel is a preview origin with
 * its own empty storage; nothing syncs between the two. ADR-0005; no server DB (#68).
 */
export function LogbookLocationNote() {
  return (
    <p className="m-0 text-value text-ink-subtle" role="note">
      Lesson and Student records stay in this browser on this laptop. They are not saved on
      Vercel — the online preview is a separate place with its own empty Logbook.
    </p>
  )
}
