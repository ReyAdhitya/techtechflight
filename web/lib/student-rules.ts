/**
 * The three rules a child reads, and the three warnings that enforce them.
 *
 * The tablet used to print the **Teacher's** briefing checklist: eighteen rules across five
 * sections, written for an adult walking a class through a safety brief out loud. On a
 * Student's screen that is a wall of text, and a wall of text is not read. Three are read.
 *
 * ## Why the rule and the warning live in one object
 *
 * A child who was told "stay out of red" at the start and then sees *no-fly zone violation
 * detected* mid-flight has been given two rules, not one, and has to work out at speed that
 * they are the same. So the pairs are declared together and the screens read the warning from
 * here. Drift is then impossible rather than merely discouraged.
 *
 * ## Which three
 *
 * The three the board can actually enforce, because those are the three a warning can follow.
 * Everything else in the Teacher's brief is said out loud by a person, which is where it
 * belongs: separation, the charge, the clock and the emergency stop are things a Teacher
 * watches and a child is told about, not things this screen has anything to say on until they
 * happen.
 */

export interface StudentRule {
  /** What the brief says, before the flight. */
  readonly rule: string
  /** What the warning says, during it. The same words, so it reads as the same rule. */
  readonly warning: string
}

export const STUDENT_RULES: readonly StudentRule[] = [
  { rule: 'Stay out of the red areas.', warning: 'Move away' },
  { rule: 'Do what your Teacher says, straight away.', warning: 'Your Teacher' },
  { rule: 'Land when your Teacher tells you to land.', warning: 'Return home and land' },
]

/** Just the words, for the brief and for the classroom session the tablet reads. */
export const STUDENT_RULE_WORDS: readonly string[] = STUDENT_RULES.map((row) => row.rule)

/** The warning that follows a rule, so a screen never writes its own wording for one. */
export function studentWarning(index: 0 | 1 | 2): string {
  return STUDENT_RULES[index]!.warning
}
