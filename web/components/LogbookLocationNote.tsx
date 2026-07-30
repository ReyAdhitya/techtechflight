/**
 * Where Lesson / Student / Trainer records actually live, and where Teachers look.
 *
 * Primary store: this browser’s Logbook (localStorage) on the machine running the board.
 * Optional dual-write (#93): when a sync secret is set, a copy mirrors to Vercel so the
 * online preview can show the same Students/Reports (last-write-wins). ADR-0005 / ADR-0015.
 */
export function LogbookLocationNote() {
  return (
    <div className="flex flex-col gap-2" role="note">
      <p className="m-0 text-value text-ink-subtle">
        Lesson and Student records save in this browser on this laptop first. When a cloud
        sync secret is set (Settings), a copy also goes to Vercel while you are online —
        so the preview board can show the same Students and Reports.
      </p>
      <p className="m-0 text-value text-ink-subtle">
        Find them on this board: <span className="text-ink">Students</span> (roster),{' '}
        <span className="text-ink">Settings</span> (trainer Drones and sync secret),{' '}
        <span className="text-ink">Lesson</span> (prep and who flies what),{' '}
        <span className="text-ink">Reports</span> (finished Lessons). Control strips show
        names only.
      </p>
    </div>
  )
}
