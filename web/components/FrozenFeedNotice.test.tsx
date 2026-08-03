import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DEFAULT_FROZEN_WINDOW_MS, FROZEN_FEED_MESSAGE } from '@/lib/frozen-feed'
import { FrozenFeedNotice } from './FrozenFeedNotice'

describe('FrozenFeedNotice', () => {
  it('says the picture has stopped when the window elapses', () => {
    render(
      <FrozenFeedNotice
        lastFrameAt={1_000}
        now={1_000 + DEFAULT_FROZEN_WINDOW_MS}
        streaming
      />,
    )
    expect(screen.getByRole('alert')).toHaveTextContent(FROZEN_FEED_MESSAGE)
  })

  it('renders nothing while frames are fresh', () => {
    const { container } = render(
      <FrozenFeedNotice lastFrameAt={1_000} now={1_500} streaming />,
    )
    expect(container).toBeEmptyDOMElement()
  })

  it('renders nothing when the feed is not streaming', () => {
    const { container } = render(
      <FrozenFeedNotice
        lastFrameAt={1_000}
        now={1_000 + DEFAULT_FROZEN_WINDOW_MS}
        streaming={false}
      />,
    )
    expect(container).toBeEmptyDOMElement()
  })
})
