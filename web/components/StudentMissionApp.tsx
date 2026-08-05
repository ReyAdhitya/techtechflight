'use client'

import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useRouter } from 'next/navigation'
import {
  joinClassroomAsStudent,
  loadClassroomByCode,
  normalizeClassroomCode,
  readClassroomSession,
  readStudentSeatLocal,
  requestTakeoff,
  subscribeClassroom,
  updateSeatPhase,
  type ClassroomSeat,
  type ClassroomSession,
  type StudentMissionPhase,
} from '@/lib/classroom-session'
import { clearBoardRole } from '@/lib/role'
import { cn } from '@/lib/utils'

/**
 * Student Mission workflow from the classroom brief (#629).
 *
 * Briefing → objective → prepare → connect → request takeoff → fly after Teacher grant →
 * checkpoints → return → score. Connected to the Teacher board by classroom code (#628).
 */

const PHASE_ORDER: readonly StudentMissionPhase[] = [
  'briefing',
  'objective',
  'prepare',
  'connect',
  'request-takeoff',
  'awaiting-clearance',
  'cleared',
  'flying',
  'returning',
  'complete',
]

function phaseTitle(phase: StudentMissionPhase): string {
  switch (phase) {
    case 'briefing':
      return 'Receive Mission briefing'
    case 'objective':
      return 'Understand the objective'
    case 'prepare':
      return 'Prepare your craft'
    case 'connect':
      return 'Connect and check status'
    case 'request-takeoff':
      return 'Request takeoff approval'
    case 'awaiting-clearance':
      return 'Waiting for Teacher approval'
    case 'cleared':
      return 'Cleared to take off'
    case 'flying':
      return 'Fly the Mission'
    case 'returning':
      return 'Return and land'
    case 'complete':
      return 'Review your score'
  }
}

function seatOf(session: ClassroomSession | null, studentId: string | null): ClassroomSeat | null {
  if (!session || !studentId) return null
  return session.seats.find((row) => row.studentId === studentId) ?? null
}

export function StudentMissionApp() {
  const router = useRouter()
  const [session, setSession] = useState<ClassroomSession | null>(null)
  const [codeInput, setCodeInput] = useState('')
  const [nameInput, setNameInput] = useState('')
  const [joinError, setJoinError] = useState<string | null>(null)
  const [joining, setJoining] = useState(false)

  const local = readStudentSeatLocal()
  const seat = seatOf(session, local?.studentId ?? null)

  useEffect(() => {
    setSession(readClassroomSession())
    return subscribeClassroom(setSession)
  }, [])

  useEffect(() => {
    if (!local?.code) return
    void loadClassroomByCode(local.code).then((remote) => {
      if (remote) setSession(remote)
    })
  }, [local?.code])

  const latestInstruction = useMemo(() => {
    if (!session || session.instructions.length === 0) return null
    return session.instructions[session.instructions.length - 1]!
  }, [session])

  const join = async () => {
    setJoining(true)
    setJoinError(null)
    const code = normalizeClassroomCode(codeInput)
    const loaded = await loadClassroomByCode(code)
    const base = loaded ?? (readClassroomSession()?.code === code ? readClassroomSession() : null)
    if (!base) {
      setJoinError('No classroom with that code. Ask your Teacher for the code on their board.')
      setJoining(false)
      return
    }
    const { session: next } = joinClassroomAsStudent(base, nameInput)
    setSession(next)
    setJoining(false)
  }

  const advance = (phase: StudentMissionPhase) => {
    if (!session || !seat) return
    setSession(updateSeatPhase(session, seat.studentId, phase))
  }

  const askTakeoff = () => {
    if (!session || !seat) return
    setSession(requestTakeoff(session, seat.studentId))
  }

  const leave = () => {
    clearBoardRole()
    router.replace('/enter')
  }

  if (!seat || !session || !local || local.code !== session.code) {
    return (
      <main id="content" tabIndex={-1} className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-6 p-5">
        <header className="flex items-start justify-between gap-3">
          <div>
            <p className="label m-0">Student Mission</p>
            <h1 className="m-0 font-display text-heading font-medium">Join your class</h1>
          </div>
          <button type="button" onClick={leave} className="label min-h-11 cursor-pointer text-ink-subtle">
            Switch role
          </button>
        </header>

        <label className="flex flex-col gap-1">
          <span className="label">Classroom code</span>
          <input
            value={codeInput}
            onChange={(event) => setCodeInput(event.target.value.toUpperCase())}
            placeholder="ABCD"
            autoCapitalize="characters"
            className="min-h-12 rounded-pill border border-hairline bg-surface-1 px-4 text-heading tracking-[0.2em] text-ink"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="label">Your name</span>
          <input
            value={nameInput}
            onChange={(event) => setNameInput(event.target.value)}
            placeholder="Ada"
            className="min-h-12 rounded-pill border border-hairline bg-surface-1 px-4 text-body text-ink"
          />
        </label>

        {joinError ? <p className="m-0 text-value text-status-not-ready">{joinError}</p> : null}

        <button
          type="button"
          disabled={joining || normalizeClassroomCode(codeInput).length < 4}
          onClick={() => void join()}
          className="min-h-12 cursor-pointer rounded-pill border-0 bg-ink px-5 text-body font-medium text-canvas disabled:bg-muted disabled:text-ink-muted"
        >
          {joining ? 'Joining…' : 'Join Mission'}
        </button>
      </main>
    )
  }

  const phase = seat.phase
  const checkpointLabel = `${Math.min(seat.checkpointIndex + 1, session.checkpointCount)} of ${session.checkpointCount}`

  return (
    <main id="content" tabIndex={-1} className="mx-auto flex min-h-[100dvh] max-w-lg flex-col gap-5 p-5 pb-10">
      <header className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="label m-0 truncate">{session.scenarioName || 'Mission'}</p>
          <h1 className="m-0 font-display text-heading font-medium">{phaseTitle(phase)}</h1>
          <p className="m-0 text-value text-ink-subtle">
            {seat.name}
            {seat.droneName ? ` · ${seat.droneName}` : ''}
            {' · '}
            Code {session.code}
          </p>
        </div>
        <button type="button" onClick={leave} className="label min-h-11 shrink-0 cursor-pointer text-ink-subtle">
          Leave
        </button>
      </header>

      <section
        className="grid grid-cols-2 gap-2 rounded-surface border border-hairline bg-surface-1 p-3"
        aria-label="Mission screen"
      >
        <HudChip label="Objective" value={session.objective || 'Listen to the brief'} wide />
        <HudChip label="Checkpoints" value={checkpointLabel} />
        <HudChip label="Timer" value={`${session.limitMinutes} min`} />
        <HudChip label="Battery" value="On craft" />
        <HudChip
          label="Score"
          value={seat.score === null ? '—' : `${Math.round(seat.score * 100)}%`}
        />
        <HudChip label="Phase" value={`${PHASE_ORDER.indexOf(phase) + 1}/${PHASE_ORDER.length}`} />
      </section>

      {latestInstruction ? (
        <p className="m-0 rounded-surface border border-brand bg-brand-wash px-3 py-2 text-value text-ink">
          Teacher: {latestInstruction.text}
        </p>
      ) : null}

      {phase === 'briefing' ? (
        <StepCard
          body={`${session.scenarioName}. ${session.objective}`}
          action="I have the brief"
          onAction={() => advance('objective')}
        />
      ) : null}

      {phase === 'objective' ? (
        <StepCard
          body={
            <ul className="m-0 flex list-disc flex-col gap-1 pl-5">
              {session.rules.length > 0 ? (
                session.rules.map((rule) => <li key={rule}>{rule}</li>)
              ) : (
                <li>Stay inside the Mission Zone. Land when the Teacher says.</li>
              )}
              <li>Time limit: {session.limitMinutes} minutes.</li>
              <li>Checkpoints: {session.checkpointCount}.</li>
            </ul>
          }
          action="I understand"
          onAction={() => advance('prepare')}
        />
      ) : null}

      {phase === 'prepare' ? (
        <StepCard
          body="Check propellers, battery, and your controller. The Teacher has the pre-flight board."
          action="Craft ready"
          onAction={() => advance('connect')}
        />
      ) : null}

      {phase === 'connect' ? (
        <StepCard
          body={
            session.live
              ? 'You are connected to this classroom. Status follows the Teacher board.'
              : 'Waiting for the Teacher to start the Lesson.'
          }
          action="Continue"
          onAction={() => advance('request-takeoff')}
          disabled={!session.live}
        />
      ) : null}

      {phase === 'request-takeoff' ? (
        <StepCard
          body={
            seat.heldAt
              ? 'Teacher held takeoff. Fix what they asked, then request again.'
              : 'Ask the Teacher for takeoff clearance. You still fly by hand.'
          }
          action="Request takeoff"
          onAction={askTakeoff}
        />
      ) : null}

      {phase === 'awaiting-clearance' ? (
        <StepCard body="Waiting for the Teacher to grant takeoff on their board…" />
      ) : null}

      {phase === 'cleared' ? (
        <StepCard
          body="You are cleared. Take off when ready, then fly the route."
          action="I am airborne"
          onAction={() => advance('flying')}
        />
      ) : null}

      {phase === 'flying' ? (
        <div className="flex flex-col gap-3">
          <StepCard
            body={`Fly through the checkpoints. Avoid no-fly zones. ${session.zones.length} zone(s) on the Teacher map.`}
            action={
              seat.checkpointIndex + 1 >= session.checkpointCount
                ? 'Mission task done'
                : 'Checkpoint reached'
            }
            onAction={() => {
              if (seat.checkpointIndex + 1 >= session.checkpointCount) {
                advance('returning')
                return
              }
              setSession(
                updateSeatPhase(session, seat.studentId, 'flying', {
                  checkpointIndex: seat.checkpointIndex + 1,
                }),
              )
            }}
          />
          <ExceptionHints />
        </div>
      ) : null}

      {phase === 'returning' ? (
        <StepCard
          body="Return home and land safely. Follow Teacher / ATC if they call you in early."
          action="Landed"
          onAction={() =>
            setSession(
              updateSeatPhase(session, seat.studentId, 'complete', {
                score: 0.7 + Math.min(0.25, seat.checkpointIndex * 0.05),
              }),
            )
          }
        />
      ) : null}

      {phase === 'complete' ? (
        <StepCard
          body={
            <div className="flex flex-col gap-2">
              <p className="m-0 font-display text-summary font-medium">
                Score {seat.score === null ? '—' : `${Math.round(seat.score * 100)}%`}
              </p>
              <p className="m-0">
                Feedback comes from your Teacher after they confirm the Mission complete.
              </p>
            </div>
          }
        />
      ) : null}
    </main>
  )
}

function HudChip({
  label,
  value,
  wide = false,
}: {
  readonly label: string
  readonly value: string
  readonly wide?: boolean
}) {
  return (
    <div className={cn('flex flex-col gap-0.5', wide && 'col-span-2')}>
      <span className="label text-ink-muted">{label}</span>
      <span className="truncate text-value text-ink">{value}</span>
    </div>
  )
}

function StepCard({
  body,
  action,
  onAction,
  disabled = false,
}: {
  readonly body: ReactNode
  readonly action?: string
  readonly onAction?: () => void
  readonly disabled?: boolean
}) {
  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-canvas p-4">
      <div className="text-body text-ink">{body}</div>
      {action && onAction ? (
        <button
          type="button"
          disabled={disabled}
          onClick={onAction}
          className="min-h-12 cursor-pointer rounded-pill border-0 bg-ink px-5 text-body font-medium text-canvas disabled:cursor-not-allowed disabled:bg-muted disabled:text-ink-muted"
        >
          {action}
        </button>
      ) : null}
    </section>
  )
}

function ExceptionHints() {
  return (
    <details className="rounded-surface border border-hairline bg-surface-1 px-3 py-2">
      <summary className="label cursor-pointer text-ink-subtle">If something happens</summary>
      <ul className="mt-2 flex list-none flex-col gap-2 p-0 text-value text-ink-muted">
        <li>
          <strong className="text-ink">Low battery.</strong> Follow Teacher instructions. Return
          and land.
        </li>
        <li>
          <strong className="text-ink">Obstacle ahead.</strong> Adjust your route.
        </li>
        <li>
          <strong className="text-ink">New target.</strong> Confirm and fly to the new point.
        </li>
        <li>
          <strong className="text-ink">Missed checkpoint.</strong> Follow Teacher instructions.
        </li>
      </ul>
    </details>
  )
}
