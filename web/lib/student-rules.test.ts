import { describe, expect, it } from 'vitest'
import { MISSION_BRIEFING_RULES } from '@/components/MissionBriefing'
import { STUDENT_RULES, STUDENT_RULE_WORDS, studentWarning } from './student-rules'

/**
 * Three rules, never twenty, and the same words as the warnings that follow.
 *
 * The tablet printed the Teacher's eighteen-line briefing checklist, written for an adult
 * reading a safety brief out loud to a class. On a child's screen that is a wall of text, and
 * a wall of text is not read.
 */
describe('what a Student reads before flying', () => {
  it('is three rules', () => {
    expect(STUDENT_RULES).toHaveLength(3)
    expect(STUDENT_RULE_WORDS).toHaveLength(3)
  })

  /*
   * The failure this pairing exists to prevent: told "stay out of red" at the start and shown
   * "no-fly zone violation detected" mid-flight, a child has two rules to reconcile at speed.
   */
  it('carries the warning beside the rule, so neither can drift', () => {
    expect(studentWarning(0)).toBe('Move away')
    expect(studentWarning(1)).toBe('Your Teacher')
    expect(studentWarning(2)).toBe('Return home and land')
    expect(STUDENT_RULES.every((row) => row.warning.trim() !== '')).toBe(true)
  })

  /* `MissionBriefing.tsx` is the Teacher's checklist and must never be printed for children. */
  it('is not the Teacher checklist', () => {
    expect(MISSION_BRIEFING_RULES.length).toBeGreaterThan(10)
    const teacherWords = new Set<string>(MISSION_BRIEFING_RULES.map((rule) => rule.label))
    for (const rule of STUDENT_RULE_WORDS) {
      expect(teacherWords.has(rule)).toBe(false)
    }
  })

  it('says nothing a ten year old has to translate', () => {
    for (const rule of STUDENT_RULE_WORDS) {
      expect(rule).not.toMatch(/separation|clearance|protocol|checkpoint|altitude floor/i)
      // Rewrite the sentence, do not delete the character.
      expect(rule).not.toMatch(/[—·]/)
    }
  })
})
