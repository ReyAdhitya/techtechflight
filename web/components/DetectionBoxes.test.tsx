import { describe, expect, it } from 'vitest'
import { render, screen } from '@testing-library/react'
import { DetectionBoxes } from './DetectionBoxes'

describe('DetectionBoxes', () => {
  it('colours person purple and puts the name on a solid chip', () => {
    render(
      <DetectionBoxes
        ariaLabel="1 recognised"
        detections={[
          {
            id: 'd1',
            label: 'person',
            confidence: 0.98,
            box: { x: 0.2, y: 0.1, width: 0.4, height: 0.5 },
          },
        ]}
      />,
    )

    const box = screen.getByRole('listitem')
    expect(box).toHaveAttribute('data-detection-label', 'person')
    expect(box).toHaveAttribute('data-detection-color', '#7c3aed')
    expect(box).toHaveStyle({ borderColor: '#7c3aed' })
    expect(screen.getByText('person')).toBeInTheDocument()
    expect(screen.getByText('98%')).toBeInTheDocument()
  })

  it('gives laptop a different colour from person', () => {
    render(
      <DetectionBoxes
        ariaLabel="2 recognised"
        detections={[
          {
            id: 'a',
            label: 'person',
            confidence: 0.9,
            box: { x: 0, y: 0, width: 0.2, height: 0.2 },
          },
          {
            id: 'b',
            label: 'laptop',
            confidence: 0.8,
            box: { x: 0.5, y: 0.5, width: 0.2, height: 0.2 },
          },
        ]}
      />,
    )

    const items = screen.getAllByRole('listitem')
    expect(items[0]).toHaveAttribute('data-detection-color', '#7c3aed')
    expect(items[1]).toHaveAttribute('data-detection-color', '#6366f1')
  })
})
