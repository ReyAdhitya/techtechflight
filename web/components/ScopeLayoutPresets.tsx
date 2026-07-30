'use client'
import { SCOPE_LAYOUT_PRESETS, type ScopeLayoutPreset } from '@/lib/scope-layout-presets'
export function ScopeLayoutPresets({ value, onChange }: { value: ScopeLayoutPreset; onChange: (v: ScopeLayoutPreset) => void }) {
  return (
    <div className="flex flex-wrap gap-2" role="group" aria-label="Scope layout presets">
      {(Object.keys(SCOPE_LAYOUT_PRESETS) as ScopeLayoutPreset[]).map((key) => (
        <button key={key} type="button" aria-pressed={value === key} className="min-h-11 rounded-pill border border-hairline px-3 py-1.5 text-caption text-ink" onClick={() => onChange(key)}>{SCOPE_LAYOUT_PRESETS[key].label}</button>
      ))}
    </div>
  )
}
