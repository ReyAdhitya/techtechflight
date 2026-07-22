'use client'

import { Component, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useReducedMotion } from 'motion/react'
import type { DroneState } from '@techtechflight/contract'
import { STATUS_TONE, tone } from './visual-language'
import { DroneModel } from './DroneModel'

export interface DroneStageProps {
  readonly drone: DroneState
  readonly dark: boolean
  /** Small stages sit inside a Drone's own panel and get a tighter camera. */
  readonly compact?: boolean
}

/**
 * The 3D stage.
 *
 * Loaded only in the browser and only after the cards have painted, because it is the
 * single most expensive thing on this page and it is never the only place a fact is
 * stated. If WebGL is unavailable — a locked-down school laptop, a dropped context, a
 * virtual machine with no GPU — the boundary below replaces it with a sentence and the
 * board carries on being a board.
 */
export function DroneStage({ drone, dark, compact = false }: DroneStageProps) {
  const reduced = useReducedMotion() ?? false
  const statusColour = tone(STATUS_TONE[drone.status], dark)

  return (
    <StageBoundary>
      <Canvas
        // Capped rather than uncapped: a 4K classroom display would otherwise render
        // four times the pixels for a stage nobody is inspecting closely.
        dpr={[1, 1.75]}
        shadows
        // A Teacher who asked for less motion gets a still frame, redrawn only when the
        // Fleet State actually changes.
        frameloop={reduced ? 'demand' : 'always'}
        camera={{ position: compact ? [2.1, 1.35, 2.6] : [2.5, 1.75, 3.1], fov: 38 }}
        gl={{ antialias: true, alpha: true }}
      >
        <ambientLight intensity={dark ? 0.55 : 0.85} />
        <directionalLight
          position={[3.2, 5.2, 2.4]}
          intensity={dark ? 1.5 : 1.9}
          castShadow
          shadow-mapSize={[1024, 1024]}
        />
        {/* A rim light in the Status colour, so the aircraft is lit by its own state. */}
        <pointLight position={[-2.4, 1.6, -1.6]} intensity={dark ? 14 : 8} color={statusColour} />

        <DroneModel drone={drone} dark={dark} reduced={reduced} />

        <ContactShadows
          position={[0, -0.002, 0]}
          opacity={dark ? 0.5 : 0.32}
          scale={6}
          blur={2.6}
          far={3}
          resolution={512}
        />
      </Canvas>
    </StageBoundary>
  )
}

interface BoundaryState {
  readonly failed: boolean
}

/**
 * Anything the renderer throws — no WebGL, a lost context, a driver that will not
 * compile a shader — degrades to a sentence rather than taking the Fleet down with it.
 */
class StageBoundary extends Component<{ children: ReactNode }, BoundaryState> {
  override state: BoundaryState = { failed: false }

  static getDerivedStateFromError(): BoundaryState {
    return { failed: true }
  }

  override render() {
    if (this.state.failed) {
      return (
        <p className="sc-stage__fallback">
          This machine cannot draw the 3D view. Every Drone&rsquo;s Status, Telemetry and
          Last Contact is on the cards below.
        </p>
      )
    }
    return this.props.children
  }
}
