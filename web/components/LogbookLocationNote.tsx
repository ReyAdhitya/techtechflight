/**
 * Where Lesson / Student / Trainer records actually live, and where Teachers look.
 *
 * The working store is this browser's Logbook (localStorage) on the machine running
 * the board — typically localhost in the classroom. Vercel is a preview origin with
 * its own empty storage; nothing syncs between the two. ADR-0005; no server DB (#68 / #74).
 */
export function LogbookLocationNote() {
  return (
    <div className="flex flex-col gap-2" role="note">
      <p className="m-0 text-value text-ink-subtle">
        Lesson and Student records stay in this browser on this laptop. They are not saved on
        Vercel — the online preview is a separate place with its own empty Logbook.
      </p>
      <p className="m-0 text-value text-ink-subtle">
        Find them on this board: <span className="text-ink">Students</span> (roster),{' '}
        <span className="text-ink">Settings</span> (trainer Drones),{' '}
        <span className="text-ink">Lesson</span> (prep and who flies what),{' '}
        <span className="text-ink">Reports</span> (finished Lessons). Control strips show
        names only.
      </p>
    </div>
  )
}
