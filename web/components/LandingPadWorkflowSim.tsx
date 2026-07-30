'use client'
import { useState } from 'react'
const STEPS = ['Approach', 'See pad QR', 'Descend', 'Touchdown'] as const
export function LandingPadWorkflowSim() {
  const [step, setStep] = useState(0)
  return (<section className="flex flex-col gap-3 p-4" aria-label="Landing pad workflow sim"><h2 className="label m-0">Landing pad workflow (sim)</h2><p className="m-0 font-display text-summary font-medium text-ink">{STEPS[step]}</p><div className="flex flex-wrap gap-2"><button type="button" className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink" disabled={step >= STEPS.length - 1} onClick={() => setStep((s) => Math.min(STEPS.length - 1, s + 1))}>Next</button><button type="button" className="min-h-11 rounded-pill border border-hairline px-4 py-1.5 text-caption text-ink-subtle" onClick={() => setStep(0)}>Reset</button></div></section>)
}
