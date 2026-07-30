'use client'

import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'

const STORAGE_KEY = 'ttf-training-wheels'

type TrainingWheelsContextValue = {
  readonly enabled: boolean
  readonly setEnabled: (next: boolean) => void
  readonly toggle: () => void
}

const TrainingWheelsContext = createContext<TrainingWheelsContextValue | null>(null)

function readStored(): boolean {
  if (typeof window === 'undefined') return false
  try {
    return window.localStorage.getItem(STORAGE_KEY) === '1'
  } catch {
    return false
  }
}

function writeStored(enabled: boolean): void {
  try {
    window.localStorage.setItem(STORAGE_KEY, enabled ? '1' : '0')
  } catch {
    // localStorage unavailable — session-only is fine.
  }
}

export function TrainingWheelsProvider({ children }: { readonly children: ReactNode }) {
  const [enabled, setEnabledState] = useState(false)

  useEffect(() => {
    setEnabledState(readStored())
  }, [])

  const setEnabled = useCallback((next: boolean) => {
    setEnabledState(next)
    writeStored(next)
  }, [])

  const toggle = useCallback(() => {
    setEnabledState((current) => {
      const next = !current
      writeStored(next)
      return next
    })
  }, [])

  const value = useMemo(
    () => ({ enabled, setEnabled, toggle }),
    [enabled, setEnabled, toggle],
  )

  return (
    <TrainingWheelsContext.Provider value={value}>{children}</TrainingWheelsContext.Provider>
  )
}

export function useTrainingWheels(): TrainingWheelsContextValue {
  const ctx = useContext(TrainingWheelsContext)
  if (!ctx) {
    throw new Error('useTrainingWheels must be used within TrainingWheelsProvider')
  }
  return ctx
}

export function useTrainingWheelsOptional(): TrainingWheelsContextValue | null {
  return useContext(TrainingWheelsContext)
}
