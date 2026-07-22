'use client'

import { useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

/**
 * The Tower's forwarding address.
 *
 * A static export has no server to answer with a redirect, so the move happens here. The
 * link is not a fallback nobody sees: it is what a Teacher gets if scripting is blocked on
 * a school laptop, and it says where they are going rather than only taking them there.
 */
export function MovedToControl() {
  const router = useRouter()

  useEffect(() => {
    router.replace('/control')
  }, [router])

  return (
    <main id="content" tabIndex={-1} className="mx-auto w-full max-w-3xl p-8">
      <p className="m-0 text-body text-ink">
        The Tower is now the Flight Control Center.{' '}
        <Link href="/control" className="text-ink underline">
          Go there
        </Link>
        .
      </p>
    </main>
  )
}
