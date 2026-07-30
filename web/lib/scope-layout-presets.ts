export type ScopeLayoutPreset = 'classroom' | 'wide' | 'tight'
export const SCOPE_LAYOUT_PRESETS: Record<ScopeLayoutPreset, { label: string; windowM: number }> = {
  classroom: { label: 'Classroom', windowM: 12 },
  wide: { label: 'Wide hall', windowM: 20 },
  tight: { label: 'Tight bay', windowM: 8 },
}
