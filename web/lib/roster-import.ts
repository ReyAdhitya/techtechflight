/** Parse pasted roster lines — one student name per line. */
export function parseRosterPaste(text: string): readonly string[] {
  return [...new Set(
    text.split(/\r?\n/).map((l) => l.trim()).filter(Boolean),
  )]
}
