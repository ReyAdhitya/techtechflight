'use client'

import type { Detection } from '@/lib/object-detection'
import { swatchForLabel } from '@/lib/detection-palette'

/**
 * Bounding boxes on a live camera picture.
 *
 * Each class gets its own border and chip colour so two boxes are not mistaken for each
 * other across the room. The chip always carries the class name in words (ADR-0004) on a
 * solid fill with high-contrast type — thin ink on video is what made "person 98%"
 * unreadable on a dark hoodie.
 */

export function DetectionBoxes({
  detections,
  ariaLabel,
}: {
  readonly detections: readonly Detection[]
  readonly ariaLabel: string
}) {
  if (detections.length === 0) return null

  return (
    <ul
      className="pointer-events-none absolute inset-0 m-0 list-none p-0"
      aria-label={ariaLabel}
    >
      {detections.map((detection) => {
        const swatch = swatchForLabel(detection.label)
        const pct = Math.round(detection.confidence * 100)
        return (
          <li
            key={detection.id}
            className="absolute box-border"
            style={{
              left: `${detection.box.x * 100}%`,
              top: `${detection.box.y * 100}%`,
              width: `${detection.box.width * 100}%`,
              height: `${detection.box.height * 100}%`,
              borderWidth: '0.1875rem',
              borderStyle: 'solid',
              borderColor: swatch.fill,
              boxShadow: `inset 0 0 0 0.0625rem ${swatch.fill}`,
            }}
            data-detection-label={detection.label}
            data-detection-color={swatch.fill}
          >
            {/*
              Chip sits *inside* the box at the top-left. Outside would clip under
              overflow-hidden parents and disappear on a face filling the frame. Exactly
              when a Teacher most needs to read the label.
            */}
            <span
              className="absolute left-0 top-0 z-10 m-0.5 flex max-w-[calc(100%-0.25rem)] items-baseline gap-1 rounded-sm px-1.5 py-0.5 font-display text-value font-medium leading-tight shadow-sm"
              style={{
                backgroundColor: swatch.fill,
                color: swatch.text,
              }}
            >
              <span className="truncate">{detection.label}</span>
              {detection.trackId ? (
                <span className="tnum shrink-0 opacity-90">#{detection.trackId}</span>
              ) : null}
              <span className="tnum shrink-0 opacity-90">{pct}%</span>
            </span>
          </li>
        )
      })}
    </ul>
  )
}
