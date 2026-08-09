import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'

/**
 * `/reports` lands on the report screen and never forwards.
 *
 * It used to send a Teacher to `/mission?step=12`, and step 12 is locked until a Mission is
 * sealed. On any day with nothing sealed there was no route at all to the weekly digest, the
 * export, the remedial queue or a past Lesson.
 *
 * Read from source rather than rendered, the way `page-frame.test.ts` is: the rule is about
 * what the route is allowed to be, and a render would only prove the screen mounts today.
 */
const source = readFileSync(
  resolve(process.cwd(), 'web/app/(app)/reports/page.tsx'),
  'utf8',
)

describe('the reports route', () => {
  it('renders the standing report screen', () => {
    expect(source).toContain('ReportsScreen')
  })

  it('does not forward to a step, because a step can be locked', () => {
    expect(source).not.toContain('MissionStepForward')
    expect(source).not.toContain('step=')
  })
})
