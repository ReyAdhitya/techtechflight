'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import type { Group } from 'three'
import type { DroneState } from '@techtechflight/contract'
import { AIRFRAME_TONE, STATUS_TONE, tone } from './visual-language'

/** The subset of material properties that carries Stale and Offline across every part. */
interface SurfaceProps {
  readonly transparent: boolean
  readonly opacity: number
  readonly roughness: number
  readonly metalness: number
}

export interface DroneModelProps {
  readonly drone: DroneState
  readonly dark: boolean
  /** True when the Teacher has asked for less motion. Rotors and hover both stop. */
  readonly reduced: boolean
}

const TAU = Math.PI * 2
const ARM_ANGLES = [0.25, 0.75, 1.25, 1.75].map((turn) => turn * TAU)

/**
 * One Drone, as an aircraft.
 *
 * Every visual channel here carries a datum rather than a mood — this is the whole
 * argument for putting 3D on a status board at all, so it is worth stating plainly:
 *
 *   height above the pad   — airborne, or not
 *   rotor rotation         — airborne, or not (the redundant channel, for a glance
 *                            from across the room where 20cm of altitude is invisible)
 *   airframe tint + beacon — Status
 *   pitch                  — Fault: the airframe cants, so a broken Drone is wrong in
 *                            silhouette and not only in colour
 *   the arc under the pad  — battery, as a proportion of a full turn
 *   translucency           — Stale: the aircraft literally fades as the reading ages
 *
 * Nothing here is the only statement of any of those facts. The stage is a second
 * reading of the Drone the cards already describe in words, which is what makes it
 * safe for it to be unavailable on a machine with no WebGL.
 */
export function DroneModel({ drone, dark, reduced }: DroneModelProps) {
  const hull = useRef<Group>(null)
  const rotors = useRef<Group>(null)

  const airborne = drone.telemetry?.airborne ?? false
  const flying = drone.status === 'Flying'
  const faulted = drone.status === 'Fault'
  const offline = drone.status === 'Offline'
  const battery = drone.telemetry?.batteryFraction ?? 0

  const statusColour = tone(STATUS_TONE[drone.status], dark)
  const airframeColour = tone(AIRFRAME_TONE, dark)

  /* Stale readings fade. Offline recedes further — it is not an error, it is absence. */
  const opacity = offline ? 0.42 : drone.stale ? 0.62 : 1

  const restingHeight = flying || airborne ? 0.62 : 0.02
  const spin = flying || airborne ? 26 : 0

  useFrame((state, delta) => {
    if (rotors.current && spin > 0 && !reduced) {
      rotors.current.rotation.y += spin * delta
    }
    if (!hull.current) return

    /*
     * The hover. A slow bob rather than a fixed offset, so an airborne Drone is
     * distinguishable from a parked one in peripheral vision — which is the only
     * situation in which a 3D stage beats a word.
     */
    const bob = reduced || !(flying || airborne)
      ? 0
      : Math.sin(state.clock.elapsedTime * 1.6) * 0.045
    hull.current.position.y = restingHeight + bob
    hull.current.rotation.z = faulted ? 0.16 : 0
    hull.current.rotation.x = faulted ? -0.07 : 0
  })

  const materialProps = useMemo<SurfaceProps>(
    () => ({ transparent: opacity < 1, opacity, roughness: 0.55, metalness: 0.12 }),
    [opacity],
  )

  return (
    <group>
      {/* The pad. Present whether or not a Drone is on it, so an empty stage is
          legibly an empty stage rather than a failed render. */}
      <mesh rotation-x={-Math.PI / 2} position-y={-0.001} receiveShadow>
        <circleGeometry args={[1.55, 64]} />
        <meshStandardMaterial
          color={dark ? 0x1a150f : 0xe7e3db}
          roughness={0.9}
          metalness={0}
        />
      </mesh>

      {/* Battery, as a proportion of a full turn around the pad. The track behind it
          is always a full circle, so the reading is a fraction of something visible. */}
      <mesh rotation-x={-Math.PI / 2} position-y={0.002}>
        <ringGeometry args={[1.34, 1.44, 96]} />
        <meshBasicMaterial color={dark ? 0x2c261e : 0xd4cec2} transparent opacity={0.9} />
      </mesh>
      {battery > 0 && (
        <mesh rotation-x={-Math.PI / 2} position-y={0.004}>
          <ringGeometry
            args={[1.34, 1.44, 96, 1, Math.PI / 2, Math.max(0.02, battery * TAU)]}
          />
          <meshBasicMaterial
            color={statusColour}
            transparent
            opacity={drone.stale ? 0.45 : 0.95}
          />
        </mesh>
      )}

      <group ref={hull} position-y={restingHeight}>
        {/* Body */}
        <mesh castShadow>
          <boxGeometry args={[0.66, 0.2, 0.86]} />
          <meshStandardMaterial color={airframeColour} {...materialProps} />
        </mesh>

        {/* Canopy — a second, slightly proud shell so the silhouette is not a slab. */}
        <mesh position={[0, 0.13, 0.08]} castShadow>
          <boxGeometry args={[0.44, 0.14, 0.42]} />
          <meshStandardMaterial
            color={airframeColour}
            {...materialProps}
            roughness={0.32}
          />
        </mesh>

        {/* The Status beacon. Emissive, so it reads as lit rather than painted. */}
        <mesh position={[0, 0.235, -0.16]}>
          <sphereGeometry args={[0.062, 20, 20]} />
          <meshStandardMaterial
            color={statusColour}
            emissive={statusColour}
            emissiveIntensity={offline ? 0.15 : 1.5}
            transparent={opacity < 1}
            opacity={opacity}
          />
        </mesh>

        {/* Arms, motor pods and rotors */}
        <group ref={rotors}>
          {ARM_ANGLES.map((angle, index) => (
            <Arm
              key={index}
              angle={angle}
              colour={airframeColour}
              statusColour={statusColour}
              materialProps={materialProps}
              spinning={spin > 0}
            />
          ))}
        </group>

        {/* Landing skids */}
        {[-0.26, 0.26].map((x) => (
          <mesh key={x} position={[x, -0.17, 0]}>
            <boxGeometry args={[0.05, 0.16, 0.62]} />
            <meshStandardMaterial color={airframeColour} {...materialProps} />
          </mesh>
        ))}
      </group>
    </group>
  )
}

interface ArmProps {
  readonly angle: number
  readonly colour: number
  readonly statusColour: number
  readonly materialProps: SurfaceProps
  readonly spinning: boolean
}

function Arm({ angle, colour, statusColour, materialProps, spinning }: ArmProps) {
  const radius = 0.58
  const x = Math.cos(angle) * radius
  const z = Math.sin(angle) * radius

  return (
    <group>
      <mesh position={[x / 2, 0, z / 2]} rotation-y={-angle} castShadow>
        <boxGeometry args={[radius, 0.06, 0.09]} />
        <meshStandardMaterial color={colour} {...materialProps} />
      </mesh>

      {/* Motor pod */}
      <mesh position={[x, 0.03, z]} castShadow>
        <cylinderGeometry args={[0.09, 0.1, 0.12, 20]} />
        <meshStandardMaterial color={colour} {...materialProps} />
      </mesh>

      {/*
       * The rotor disc. Solid and translucent when turning — the way a real propeller
       * reads to the eye — and a pair of thin blades when it is not, so "stopped" and
       * "spinning" are different shapes rather than the same shape at two speeds.
       */}
      {spinning ? (
        <mesh position={[x, 0.11, z]} rotation-x={-Math.PI / 2}>
          <circleGeometry args={[0.3, 40]} />
          <meshBasicMaterial color={statusColour} transparent opacity={0.22} />
        </mesh>
      ) : (
        <group position={[x, 0.11, z]}>
          {[0, Math.PI / 2].map((blade) => (
            <mesh key={blade} rotation-y={blade}>
              <boxGeometry args={[0.56, 0.012, 0.06]} />
              <meshStandardMaterial color={colour} {...materialProps} />
            </mesh>
          ))}
        </group>
      )}
    </group>
  )
}
