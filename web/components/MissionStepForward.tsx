'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { missionStepHref } from '@/lib/mission-flow'

/**
 * An old destination, forwarded to the step that answers it.
 *
 * `/lesson`, `/control` and `/reports` were three screens for one hour of teaching before
 * ADR-0026 put the twelve steps on one page. They still resolve, because a Teacher has
 * bookmarked them, a poster prints them, and a 404 in front of a class is worse than any
 * amount of forwarding.
 *
 * A link as well as a redirect. `router.replace` needs JavaScript, and this is a static
 * export served off a memory stick as often as off Vercel: if the redirect does not fire,
 * something on the page still has to say where the Teacher was going.
 */
export function MissionStepForward({
  step,
  what,
}: {
  readonly step: number
  /** What this route used to be called, so the line reads as an answer. */
  readonly what: string
}) {
  const router = useRouter()
  const href = missionStepHref(step)

  useEffect(() => {
    router.replace(href)
  }, [router, href])

  return (
    <main id="content" tabIndex={-1} className="flex flex-col gap-3 p-8">
      <p className="tnum m-0 text-body text-ink-muted">
        {`${what} is step ${step} of the Mission run now.`}
      </p>
      <Link href={href} prefetch={false} className="w-fit text-body text-ink">
        Go to step {step}
      </Link>
    </main>
  )
}
