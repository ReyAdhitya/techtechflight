import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest'
import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { VisionCheckScreen } from './VisionCheckScreen'

/**
 * The Vision check has one job, and it is a job it can fail invisibly: telling a Teacher
 * that detection works when no model is loaded.
 *
 * On a jsdom run there is no camera and no ONNX runtime, so `boardDetector()` resolves to
 * the demo detector — which is exactly the state the screen must refuse to call working.
 * That makes the default test environment the most important case rather than an awkward
 * one, and these lean on it.
 */

beforeEach(() => {
  // jsdom ships no media devices at all. Absent is the honest starting point.
  Object.defineProperty(window.navigator, 'mediaDevices', {
    configurable: true,
    value: undefined,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('what it says before anything has been tried', () => {
  it('names the screen and what it is for', async () => {
    render(<VisionCheckScreen />)
    expect(screen.getByRole('heading', { name: /vision check/i })).toBeInTheDocument()
  })

  it('refuses to call the demo detector working', async () => {
    /*
     * The whole point. Without the weights, `boardDetector()` falls back to a detector
     * that returns two confident boxes. A screen that trusted them would tell a School
     * their vision module works when nothing was ever downloaded.
     */
    render(<VisionCheckScreen />)

    await waitFor(() => {
      expect(screen.getByText(/Not working/)).toBeInTheDocument()
    })
    expect(screen.getByText(/invented/i)).toBeInTheDocument()
  })

  it('says how to fix it rather than only that it is broken', async () => {
    render(<VisionCheckScreen />)
    await waitFor(() => {
      expect(screen.getByText(/fetch:yolo/)).toBeInTheDocument()
    })
  })

  it('never lets the demo detector pass for a model in the readout', async () => {
    render(<VisionCheckScreen />)
    await waitFor(() => {
      expect(screen.getByText(/not a loaded model/i)).toBeInTheDocument()
    })
  })
})

describe('values that have not been measured', () => {
  it('says so in words rather than drawing a zero', async () => {
    /*
     * `docs/DESIGN.md` §11.1. A `0 ms` frame time on a screen whose subject is whether
     * anything is running at all would be the single most misleading number available.
     */
    render(<VisionCheckScreen />)

    expect(screen.getByText('Not measured yet')).toBeInTheDocument()
    expect(screen.getByText('None yet')).toBeInTheDocument()
    expect(screen.getByText('Nothing yet')).toBeInTheDocument()
  })
})

describe('the camera', () => {
  it('starts off, and says so', () => {
    render(<VisionCheckScreen />)
    expect(screen.getByText('The camera is off.')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /start the camera/i })).toBeInTheDocument()
  })

  it('reports a machine with no camera as having none, not as having refused', async () => {
    // Different problems need different advice. "Allow it" is useless to somebody with
    // no webcam, and jsdom is exactly that machine.
    render(<VisionCheckScreen />)

    await userEvent.click(screen.getByRole('button', { name: /start the camera/i }))

    await waitFor(() => {
      expect(screen.getByText(/reports no camera/i)).toBeInTheDocument()
    })
  })
})

describe('the verdict region', () => {
  it('announces politely rather than interrupting', async () => {
    /*
     * A Teacher on this screen is already watching for the answer. `assertive` would
     * interrupt whatever a screen reader was mid-way through for a result they are
     * looking straight at.
     */
    const { container } = render(<VisionCheckScreen />)
    const live = container.querySelector('[aria-live]')
    expect(live).toHaveAttribute('aria-live', 'polite')
  })

  it('carries the verdict as a word, not only as a colour', async () => {
    // ADR-0004, without exception.
    render(<VisionCheckScreen />)
    await waitFor(() => {
      expect(screen.getByText(/^Not working,/)).toBeInTheDocument()
    })
  })
})
