# Starting floor, read from the board rather than claimed

Reysendrya did not state a level, so the floor was inferred from the code they had
already written. The Fleet board demonstrates competence well above beginner: colour is
never the sole carrier of meaning, tiles hold position to protect muscle memory, the
connection banner deliberately avoids the Status vocabulary so it cannot be misread,
`prefers-reduced-motion` is handled, live regions are named to tell them apart, and the
amber/coral severity split is reasoned about in hue degrees. Do not teach fundamentals —
teach systematisation and the things careful people still miss.

## Implications

- Skip: "use semantic HTML", "don't rely on colour", "add focus states". All present.
- Their gap is not care, it is **coverage** — the states they did not think to worry
  about. Audit-style lessons that turn up real defects in their own code are the right
  shape, and land harder than generic instruction.
- Respect ADR-0004 and `CONTEXT.md` as authorities. Several apparent "improvements" are
  deliberate positions; argue with them explicitly or not at all.
- The mission was stated vaguely ("build a good web app and UI") and is grounded in this
  repo instead. See [[MISSION.md]]. Revisit if they start a second project.

## Evidence

Read `dashboard/src/components/*.tsx`, `dashboard/src/styles/*.css`, `CONTEXT.md`, and
`ground-station/src/fleet.ts` before writing lesson 1.
