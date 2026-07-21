import type { Clock, Unsubscribe } from './index.ts'

interface Timer {
  readonly id: number
  readonly callback: () => void
  readonly intervalMs: number
  readonly repeating: boolean
  nextFireAt: number
}

/**
 * A Clock the tests drive by hand.
 *
 * Every time-dependent behaviour in this product is exercised by advancing this, never
 * by sleeping. `advance` fires due timers in chronological order and leaves `now` at
 * each timer's own fire time while its callback runs, so a callback that reads the
 * clock sees the time it was scheduled for rather than the end of the window.
 */
export class TestClock implements Clock {
  #now: number
  #timers: Timer[] = []
  #nextId = 1

  constructor(startAt = 0) {
    this.#now = startAt
  }

  now(): number {
    return this.#now
  }

  setInterval(callback: () => void, intervalMs: number): Unsubscribe {
    return this.#schedule(callback, intervalMs, true)
  }

  setTimeout(callback: () => void, delayMs: number): Unsubscribe {
    return this.#schedule(callback, delayMs, false)
  }

  #schedule(callback: () => void, delayMs: number, repeating: boolean): Unsubscribe {
    if (delayMs <= 0) {
      throw new Error(`TestClock needs a positive delay, got ${delayMs}`)
    }
    const timer: Timer = {
      id: this.#nextId++,
      callback,
      intervalMs: delayMs,
      repeating,
      nextFireAt: this.#now + delayMs,
    }
    this.#timers.push(timer)
    return () => this.#cancel(timer.id)
  }

  #cancel(id: number): void {
    this.#timers = this.#timers.filter((candidate) => candidate.id !== id)
  }

  /** Move time forward, firing whatever falls due on the way. */
  advance(byMs: number): void {
    if (byMs < 0) throw new Error(`TestClock cannot go backwards, got ${byMs}`)
    const target = this.#now + byMs

    for (;;) {
      const due = this.#timers
        .filter((timer) => timer.nextFireAt <= target)
        .sort((a, b) => a.nextFireAt - b.nextFireAt)[0]
      if (!due) break

      this.#now = due.nextFireAt
      // A one-shot is removed before its callback runs, so a callback that
      // reschedules cannot be undone by its own expiry.
      if (due.repeating) due.nextFireAt += due.intervalMs
      else this.#cancel(due.id)
      due.callback()
    }

    this.#now = target
  }
}

/** The real clock. The only place either program touches ambient time. */
export class SystemClock implements Clock {
  now(): number {
    return Date.now()
  }

  setInterval(callback: () => void, intervalMs: number): Unsubscribe {
    const handle = setInterval(callback, intervalMs)
    return () => clearInterval(handle)
  }

  setTimeout(callback: () => void, delayMs: number): Unsubscribe {
    const handle = setTimeout(callback, delayMs)
    return () => clearTimeout(handle)
  }
}
