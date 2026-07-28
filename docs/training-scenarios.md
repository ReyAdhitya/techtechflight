# Training scenarios — AED-style full surface coverage

Date: 2026-07-28 · Issue #30

Named drills on the **simulated** Fleet so a demo or QA pass can exercise every primary
Teacher surface without a real aircraft. Runners live in **Settings** only (C9).

## Coverage map

| Surface / function | Scenario | Done |
|---|---|---|
| Fleet board (Status, Needs Attention, boardOrder) | T3, T4 | [x] |
| Control — Attention bar | T1, T2, T5 | [x] |
| Control — Scope top-down conflict/link | T1, T6 | [x] |
| Control — Scope Side (height) | T7 | [x] |
| Control — Scope Front | T7b | [x] (east axis after #38) |
| Control — flight strips | T1, T2, T7 | [x] |
| Control — Commands Land/Hold/Stop (sim) | T8 | [x] |
| Control — LessonStrip | T9 | [x] checklist |
| Lesson — plan/start | T9 | [x] checklist |
| Students — assign | T9 | [x] checklist |
| Reports | T10 | [x] checklist |
| Drone detail | T11 | [x] |
| Settings runners (C9) | T0 | [x] |
| Stale honesty | T12 | [x] |
| Emergency stop latch | T5 | [x] |
| MAVLink | OUT OF SCOPE | — |

## Catalog

| Id | Name | Run does |
|---|---|---|
| T1 | Separation conflict | Two airborne at 0.8 m |
| T2 | Low charge while flying | takeOff + 8% battery |
| T3 | Lost link | loseLink Drone 2 (Restore via Advanced) |
| T4 | Fault | injectFault Drone 3 |
| T5 | Emergency stop | takeOff + latch |
| T6 | Link group | link whole Fleet airborne |
| T7 | Height / Side | Two altitudes; toggle **Side** |
| T7b | Front | Same east, different north; toggle **Front** (#28) |
| T8 | Commands | One airborne for Land/Hold/Stop |
| T9 | Lesson + Students | Checklist: assign → plan → start → LessonStrip |
| T10 | Reports | Checklist: after T9 (+ optional T4), open Reports |
| T11 | Drone detail | Fault on Drone 1 → open `/drone?id=ttf-0001` |
| T12 | Stale honesty | loseLink Drone 1; wait for Offline/stale copy |

**Reset classroom** parks every craft (clears faults, links, stops, mid charge).

## Full drill (boss path)

1. T9 — Students + Lesson start  
2. T1 — separation on Control  
3. T2 — low charge  
4. T5 — emergency stop  
5. T10 — Reports  

## Advanced

Atomic per-Drone buttons remain under **Demonstration** in Settings for ad-hoc triggers.
