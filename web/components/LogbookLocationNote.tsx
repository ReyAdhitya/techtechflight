/**
 * Where Lesson / Student records live, and where Teachers look.
 *
 * The records are a file on this laptop (ADR-0035). The browser keeps a copy so the board
 * still works with the ground station closed. Settings has the two buttons that copy them
 * out. Nothing is sent off the premises unless a school ticks that box.
 */
export function LogbookLocationNote() {
  return (
    <div className="flex flex-col gap-2" role="note">
      <p className="m-0 text-value text-ink-subtle">
        Lesson and Student records are kept on this laptop. Nothing is sent anywhere.
      </p>
      <p className="m-0 text-value text-ink-subtle">
        Find them on this board: <span className="text-ink">Students</span> (the class),{' '}
        <span className="text-ink">Lesson</span> (who flies what),{' '}
        <span className="text-ink">Reports</span> (finished Lessons). Settings can save a
        copy to your Desktop.
      </p>
    </div>
  )
}
