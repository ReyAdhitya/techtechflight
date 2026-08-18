'use client'

import { useState } from 'react'
import { seedDemonstration } from '@/lib/demonstration-seed'
import { tickAllMissionBriefRules } from './MissionBriefing'

/**
 * One button that fills a Lesson, so somebody can be shown the product without a class.
 *
 * **It presses what a Teacher presses.** Scenario, zones, teams on craft, the propeller tick,
 * the brief, the classroom, the children seated, the Mission started and the takeoffs granted,
 * all through the same functions the screens call. Every step of the rail then opens because
 * its condition genuinely holds: **no lock is removed, weakened or bypassed**, because the
 * locks are the product guiding somebody and a rail that opened without the fact behind it
 * would be teaching a lie about what the board does.
 *
 * Step 12 stays shut, and that is right. It opens on a Teacher sealing the Mission, which is a
 * judgement somebody makes after watching a class fly, and a seed that opened it would be
 * seeding an opinion.
 *
 * **It refuses to run on a real class.** A demonstration writes flights and attendance against
 * names, and putting invented mornings into a register a school relies on is the one failure
 * that would matter.
 */
export function DemonstrationSeedPanel() {
  const [saying, setSaying] = useState<string | null>(null)
  const [refused, setRefused] = useState(false)

  return (
    <section
      className="flex flex-col gap-3 rounded-surface border border-hairline bg-surface-1 p-5"
      aria-labelledby="demonstration-heading"
    >
      <div className="flex flex-col gap-1">
        <h2 id="demonstration-heading" className="label m-0">
          Show somebody the board
        </h2>
        <p className="m-0 max-w-[62ch] text-value text-ink-subtle">
          Fills a lesson so every step opens: a Scenario, a no-fly zone, three teams on three
          craft, pre-flight ticked, the class briefed and takeoff granted. It is a real lesson,
          recorded as a demonstration, and you seal it yourself at the end.
        </p>
      </div>

      <button
        type="button"
        onClick={() => {
          const outcome = seedDemonstration({ tickBrief: tickAllMissionBriefRules })
          setRefused(!outcome.seeded)
          setSaying(
            outcome.seeded
              ? 'Ready. Open the Mission and walk the steps.'
              : (outcome.refusedBecause ?? 'That did not work.'),
          )
        }}
        className="min-h-11 w-fit cursor-pointer rounded-pill border-0 bg-ink px-4 py-1.5 text-value font-medium text-canvas"
      >
        Set up a demonstration lesson
      </button>

      {saying === null ? null : (
        <p
          role="status"
          className={
            refused
              ? 'm-0 max-w-[62ch] border-l-4 border-status-not-ready pl-3 text-value text-ink'
              : 'm-0 max-w-[62ch] text-value text-ink'
          }
        >
          {saying}
        </p>
      )}
    </section>
  )
}
