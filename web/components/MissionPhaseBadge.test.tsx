import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import {
  EXCEPTION_WORDS,
  PHASE_WORDS,
  type MissionException,
  type MissionPhase,
} from '@/lib/mission-phase'
import { MissionPhaseBadge } from './MissionPhaseBadge'

const PHASES = Object.keys(PHASE_WORDS) as MissionPhase[]
const EXCEPTIONS = Object.keys(EXCEPTION_WORDS) as MissionException[]

describe('MissionPhaseBadge', () => {
  it('names every ordinary phase in words from PHASE_WORDS', () => {
    for (const phase of PHASES) {
      const { unmount } = render(<MissionPhaseBadge phase={phase} />)
      expect(screen.getByText(PHASE_WORDS[phase])).toBeInTheDocument()
      unmount()
    }
  })

  it('gives every phase a shape as well as a colour', () => {
    for (const phase of PHASES) {
      const { container, unmount } = render(<MissionPhaseBadge phase={phase} />)
      const glyph = container.querySelector('[data-shape]')
      expect(glyph, `phase ${phase}`).not.toBeNull()
      expect(glyph?.getAttribute('data-shape')).toBeTruthy()
      unmount()
    }
  })

  it('uses semantic colour tokens rather than raw palette names', () => {
    for (const phase of PHASES) {
      const { container, unmount } = render(<MissionPhaseBadge phase={phase} />)
      const badge = container.firstElementChild as HTMLElement
      expect(badge.className).toMatch(/text-(ink|status-)/)
      unmount()
    }
  })

  it('names an exception in words when one is active', () => {
    render(<MissionPhaseBadge phase="in-mission" exception="low-battery" />)
    expect(screen.getByText(/In mission/)).toBeInTheDocument()
    expect(screen.getByText(/Charge low/)).toBeInTheDocument()
  })

  it('shifts exception tone onto a status token', () => {
    const { container, rerender } = render(
      <MissionPhaseBadge phase="in-mission" exception="no-fly" />,
    )
    expect(container.firstElementChild).toHaveClass('text-status-fault')

    rerender(<MissionPhaseBadge phase="in-mission" exception="paused" />)
    expect(container.firstElementChild).toHaveClass('text-ink-subtle')
  })

  it('keeps the phase shape when an exception is riding on it', () => {
    const { container } = render(
      <MissionPhaseBadge phase="checkpoint-progress" exception="avoiding" />,
    )
    expect(container.querySelector('[data-shape="ringed"]')).not.toBeNull()
  })

  it('covers every exception word', () => {
    for (const exception of EXCEPTIONS) {
      const { container, unmount } = render(
        <MissionPhaseBadge phase="in-mission" exception={exception} />,
      )
      expect(container.textContent).toContain(EXCEPTION_WORDS[exception])
      unmount()
    }
  })
})
