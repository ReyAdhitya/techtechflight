'use client'
export function VoiceReadyCallouts({ readyNames }: { readyNames: readonly string[] }) {
  return (<p className="m-0 text-body text-ink-subtle" aria-label="Voice ready callouts">Ready callouts: {readyNames.length === 0 ? 'none' : readyNames.join(', ')}</p>)
}
