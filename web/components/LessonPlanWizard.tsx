'use client'

import { useState, type ReactNode } from 'react'
import type { Exercise } from '@/lib/logbook'
import { cn } from '@/lib/utils'
import { ExerciseList } from './ExerciseList'

type Step = 'label' | 'exercises' | 'confirm'

const STEPS: readonly { id: Step; title: string }[] = [
  { id: 'label', title: 'Name' },
  { id: 'exercises', title: 'Exercises' },
  { id: 'confirm', title: 'Confirm' },
]

/**
 * Three-step prep before Start — label, exercises, confirm. E7 still allows empty fields.
 */
export function LessonPlanWizard({
  label,
  onLabelChange,
  exercises,
  onExercisesChange,
  usableCount,
  fleetSize,
  onStart,
}: {
  readonly label: string
  readonly onLabelChange: (next: string) => void
  readonly exercises: readonly Exercise[]
  readonly onExercisesChange: (next: readonly Exercise[]) => void
  readonly usableCount: number
  readonly fleetSize: number
  readonly onStart: () => void
}) {
  const [step, setStep] = useState<Step>('label')
  const stepIndex = STEPS.findIndex((entry) => entry.id === step)

  return (
    <section className="flex flex-col gap-4 rounded-surface border border-hairline bg-surface-1 p-5">
      <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
        <h2 className="label m-0">Lesson plan</h2>
        <button
          type="button"
          onClick={onStart}
          className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
        >
          Start now
        </button>
        <ol className="m-0 flex list-none gap-2 p-0">
          {STEPS.map((entry, index) => (
            <li key={entry.id}>
              <span
                className={cn(
                  'rounded-pill border px-3 py-1 text-caption',
                  index === stepIndex
                    ? 'border-ink bg-canvas text-ink'
                    : 'border-hairline text-ink-muted',
                )}
              >
                {index + 1}. {entry.title}
              </span>
            </li>
          ))}
        </ol>
      </div>

      {step === 'label' && (
        <WizardStep
          onNext={() => setStep('exercises')}
          nextLabel="Exercises"
        >
          <label className="flex flex-col gap-1" htmlFor="wizard-lesson-label">
            <span className="label">What is this lesson?</span>
            <input
              id="wizard-lesson-label"
              value={label}
              onChange={(event) => onLabelChange(event.target.value)}
              placeholder="Year 8, period 3"
              className="min-h-11 rounded-pill border border-hairline bg-canvas px-4 py-1.5 text-value text-ink"
            />
          </label>
          <p className="m-0 text-value text-ink-subtle">
            Optional — blank becomes Untitled lesson when you start (E7).
          </p>
        </WizardStep>
      )}

      {step === 'exercises' && (
        <WizardStep
          onBack={() => setStep('label')}
          onNext={() => setStep('confirm')}
          nextLabel="Confirm"
        >
          <ExerciseList exercises={exercises} onChange={onExercisesChange} />
        </WizardStep>
      )}

      {step === 'confirm' && (
        <WizardStep onBack={() => setStep('exercises')} onNext={onStart} nextLabel="Start the lesson">
          <dl className="m-0 flex flex-col gap-2">
            <div className="flex flex-wrap gap-x-2">
              <dt className="label m-0">Label</dt>
              <dd className="m-0 text-value text-ink">{label.trim() === '' ? 'Untitled lesson' : label}</dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="label m-0">Exercises</dt>
              <dd className="m-0 text-value text-ink-subtle">
                {exercises.length === 0
                  ? 'None'
                  : exercises.map((exercise) => exercise.name).join(', ')}
              </dd>
            </div>
            <div className="flex flex-wrap gap-x-2">
              <dt className="label m-0">Serviceable</dt>
              <dd className="m-0 tnum text-value text-ink-subtle">
                {usableCount} of {fleetSize} at start
              </dd>
            </div>
          </dl>
        </WizardStep>
      )}
    </section>
  )
}

function WizardStep({
  children,
  onBack,
  onNext,
  nextLabel,
}: {
  readonly children: ReactNode
  readonly onBack?: () => void
  readonly onNext: () => void
  readonly nextLabel: string
}) {
  return (
    <div className="flex flex-col gap-4 border-t border-hairline pt-4">
      {children}
      <div className="flex flex-wrap gap-2">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="min-h-11 cursor-pointer rounded-pill border border-hairline bg-transparent px-4 py-1.5 text-value text-ink-muted hover:border-ink hover:text-ink"
          >
            Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          className="min-h-11 cursor-pointer rounded-pill border-0 bg-ink px-5 py-2 text-body font-medium text-canvas"
        >
          {nextLabel}
        </button>
      </div>
    </div>
  )
}
