# Decisions

Judgement calls made while working, that are not big enough for an ADR but would otherwise
be invisible. Newest first. An entry here is a thing someone could reasonably have done
differently — not a record of every change.

For architecture, see [`docs/adr/`](./adr/). For the design system, see
[`../design.md`](../design.md) and [`DESIGN-TOKENS.md`](./DESIGN-TOKENS.md).

---

## 2026-08-14 · A classroom that has ended never carries on.

- **`endedAt`, not the Lesson id, is what decides a room is over.** Two other fixes were on
  offer. One was to give a Lesson-less run an id of its own so the ids could never both be
  `null`, which invents a Lesson where a Teacher made none and puts a second identity beside
  the Logbook's. The other was to mint a code on every open, which is correct exactly once and
  wrong on every reload after it: a Teacher who refreshes mid-lesson would find the four
  letters they read to thirty children had changed. Closing a Lesson is the Teacher saying the
  room is over, and that stamp is the one fact a run with a Lesson and a run without one both
  carry.

## 2026-08-11 · The calls made inside the eight.

- **The drawing surface follows the Scope's window, and falls back to the classroom
  boundary.** The alternative was to keep a fixed grid and warn harder, which is what the old
  notice did: it fired on every zone a Teacher drew, so it was not a warning, it was the
  product. Following the window means the surface changes shape between lessons, and that is
  the honest cost — it draws the space that exists rather than a tidy square that does not.
- **The boundary is drawn on the editor too.** A Teacher placing a zone is placing it against
  the room, and the room was the one thing that surface did not show. Same blue dashed line as
  the Scope, so the two pictures are the same picture.
- **Bounding boxes, not polygon clipping, for "is this zone on the picture".** Every zone a
  Teacher can draw here is a rectangle dragged out with a finger, so the two agree; where they
  would not, a box errs towards keeping a key over a sliver rather than dropping one over a
  shape that is there.
- **The Student's name list dropped the class roll entirely.** The roll is kept on purpose so a
  Teacher types the class once rather than every period, and offering it as a name picker was
  the reason five lessons' worth of names accumulated on one tablet. A child typing their own
  name on their own tablet was always the argument; the roll was a convenience that cost more
  than it saved. A Teacher who wants a child on a craft without a tablet seats them by hand
  from the board.
- **Change classroom and Leave come from a context, not eight threaded props.** They belong
  together on every screen that has a foot, and threading a ninth prop through six components
  is six chances to ship a foot with one of them.
- **The team-list cache is checked against the raw string.** A cache only a writer can
  invalidate lies to anybody who touches the key another way — a test's `removeItem`, or a
  future writer that forgets — and the failure is a screen showing a team list that is not
  there. One string read per render, which is what the old code already did minus the parse.
- **The classroom code stays.** It was questioned and kept: without it, anyone who opens the
  site joins the live class. It is public and read out loud, which is the point — it is a
  door, not a secret (see `docs/adr/` on roles).

---

## 2026-08-11 · The calls made inside the five.

- **Tab role lives in `sessionStorage`, and the remembered role stays in `localStorage`.**
  They answer two different questions and needed two different lifetimes: what this *device*
  is for, which survives a reboot and routes the bare address, and what this *tab* is showing,
  which dies with the tab. One key could not have held both, and a Teacher's laptop showing
  the board and a pupil's view side by side is the whole reason the second one exists.
- **The look-back taps sit in the rail, not on the stage.** ADR-0025's two presses are Mission
  presses, and the count that guards them is a count of `<main>`. Reading history asks the
  Teacher for nothing and reaches no aircraft, in exactly the way joining and leaving do not;
  putting the taps where the rail already is keeps the stage at two and keeps the test that
  proves it honest rather than widened.
- **A Teacher's instruction is not on the list of things that interrupt reading.** A red zone
  and a quiet board take the screen from a child mid-sentence. An instruction does not need
  to, because it moves the lesson to step 9, and moving the lesson is already what puts a
  child back on their own screen. One mechanism, not two.
- **A zone touching the window's edge keeps its key.** The Scope holds a shape on the frame
  rather than letting it run off, so a zone reaching the boundary draws a line down it and a
  Teacher can see where the forbidden half starts. Only a zone with nothing at all inside the
  frame goes unnamed. Bounding boxes rather than true clipping, because every zone a Teacher
  can draw here is a rectangle dragged out with a finger.
- **`mayLeaveClassroom` is a predicate rather than an expression inside the screen.** The
  pinned demonstration the jsdom suite flies never leaves the ground, so the airborne half of
  "silence is not flight" is unreachable there whatever the session says, and the browser walk
  cannot reach it either: the standalone build runs one Fleet per tab, so a Teacher's grant
  flies the Teacher's simulated craft and never the child's. Three of the four answers were
  provable and the fourth was the one that matters. Now all four are.
- **The team sits beside the child's name in the rail, on every screen.** The brief names it
  once, at the start of a lesson that runs forty minutes; the rail is the one thing that never
  leaves, including on the two takeovers that carry nothing else. The prop had been there
  unused since the rail shipped.
- **The Student's team is found by the Drone, not by a roster id.** A child joins by tapping
  the number painted on the craft in their hands, so the craft is the one thing the Teacher's
  team list and the child's seat both know. Matching ids would have worked only for a child
  who came off the roll, which is the case that needed it least.

---

## 2026-08-11 · The calls made inside the eleven.

- **The emergency bar carries four things, not the two the plan drew.** The plan's diagram is
  the Attention bar and the fleet-wide buttons. The Lesson strip and the one-line headcount
  are up there too: the strip is where **End the lesson** lives, and leaving it on a step
  would have stranded a Teacher who needed it — step 11 in particular never had it, so
  closing a Lesson from the close-down step was already impossible. Four short rows, and the
  tie-breaker of fewer words is beaten by not stranding anybody.
- **`TaskApproval` sits on step 6 with the clearance queue.** Approve is the third answer a
  Teacher gives a team, beside Grant and Hold, and the code already said so. The Teacher's
  step 10 is Alerts, not "task done", which is the Student rail's wording.
- **Three Teacher actions became step moves rather than scrolls.** *Approve takeoff*, *Add
  no-fly zone* and *New target* were navigation dressed as commands, answered by scrolling a
  page that no longer exists. They take the Teacher to the step instead. *Add no-fly zone*
  goes to step 2, where zones are drawn, rather than to the Scope, which has never drawn one
  and says so in its own caption; that was wrong before this change and is now visibly so.
- **The way out of a classroom is on the grounded screens only.** A child holding a flying
  aircraft must not be able to take their own screen away, so it is absent while the Drone is
  up. That is also why it is not one of ADR-0025's two presses: those are Mission presses, and
  this one is only ever offered when the Mission is not happening to you.
- **Freeing a classroom is per device.** `leaveClassroom` forgets the local seat and the local
  copy and touches nothing the Teacher owns. A tablet walking out of a room is not a Teacher
  deleting a record.
- **The stale-session sentence is triggered by the board's own silence.** A tablet cannot know
  a lesson is over when nobody ever said so, which is exactly the case that stranded the
  owner. A board that has not beaten for forty seconds is the honest evidence available, so
  the empty Drone grid says the lesson looks finished rather than promising Drones.
- **`--text-diagram: 0.35rem` is a token on a surface that refuses small print.** It is the
  checkpoint numeral inside the printed brief's SVG map, which is measured in metres and a few
  centimetres across on paper. A token rather than a literal so that this sentence has
  somewhere to live.
- **The colour check exempts canvas, print and the `themeColor` meta**, which are the three
  places a CSS custom property genuinely cannot reach. The meta is pinned against
  `--background` in both themes instead, because nothing else could catch it drifting.

---

## 2026-08-10 · The calls made inside the twenty-one changes from a tablet.

- **The Teacher PIN is a digest, and a weak one.** FNV-1a over four digits in `localStorage`.
  Ten thousand candidates is a second's work for anyone who can open a console, and there is
  nowhere to put a salt that the same attacker could not read. It is sized for the actual
  threat, which is a curious ten year old holding an iPad rather than a determined one
  holding a laptop, and the measure for that child is iPad Guided Access, which Settings
  recommends in those words. Upgrading it to SubtleCrypto would buy nothing and would invite
  someone to believe it protects something.
- **The first Teacher through a board with no PIN chooses one.** Refusing every answer locks
  a Teacher out of their own laptop on the first morning; waving them through leaves the hole
  the pair exists to close. Choosing at the door is the only option that is neither.
- **A Student reclaims their own Drone by name.** A second iPad mints a second `studentId`, so
  their own craft would be greyed out against them forever. Two children called Amira is what
  this gets wrong, and it gets it wrong in the direction the Teacher can see: one row where
  they expected two.
- **Freeing a seat removes it rather than only releasing the craft.** The reason a Teacher
  presses it is that the child is not there. If the tablet is alive it rejoins by the name it
  remembers and is asked which Drone it is holding, which is the honest question.
- **`flyRoute` and `flyHome` are scenario controls, not Commands.** They are the world
  behaving rather than the world misbehaving, but they are the same kind of thing and so they
  come through the same door. `scenarios` is null on hardware, where a ten year old with a
  controller does this, which is what keeps ADR-0021 intact.
- **The clearance queue prefers the classroom seat and keeps the Logbook assignment as a
  fallback.** Dropping the fallback would break every prepared-Lesson flow for a gain nobody
  asked for; preferring the seat is what makes "no Student, no takeoff" true for a class that
  joined on tablets.
- **Above two dozen Drones the strips tighten rather than compact.** The instruction was a
  compact list; `CLAUDE.md` records that compacting strips hid Commands from the scan path and
  broke CI. What goes is the air between the rows, because every strip keeps its coordinate
  line and every Command in the flow and there is nothing else that can go without hiding a
  Command. The count and the consequence are said in words above the list.
- **`COMFORTABLE_BOARD_SIZE` lives in `web/lib`, not beside `classroomFleet`.** How many
  strips fit on a screen is a display fact. It is also the only way a component can read it:
  screens may not import the simulator, and `import-boundaries.test.ts` enforces that.
- **The room controls render once, in the row or in the sheet.** Rendering both and hiding one
  with CSS would put two Switch role buttons in every screen's accessibility tree, with
  `display: none` the only thing keeping the second out of a Teacher's Tab order. The media
  query defaults to wide, so a laptop never flashes a bar with no controls on it.
- **Home markers stay off the elevation views**, unlike zones. A zone genuinely occupies the
  whole column of air; home is a place on the floor, and on Side it would be a tick on the
  ground line saying nothing about height.

---

## 2026-08-09 · The calls made inside the twenty-five fixes.

- **Reports goes back in the Go to button.** It left when the rail shipped, on the grounds
  that the debrief is step 12. Half right: the debrief of the Mission just sealed is a step,
  and step 12 is locked until a Mission is sealed, so on a Monday morning the digest, the
  export, the remedial queue and every past Lesson sat behind a step that refused. What
  happened across a term is not part of one Mission run.
- **Steps 2 and 3 give the same lock reason.** With the go-area gone (ADR-0027) step 3 has
  nothing to wait for but the Scenario, and it cannot wait for a No-fly Zone: a room with
  nothing to stay out of is a real room, so gating teams behind an optional drawing is a
  lock a Teacher could never open. Saying "Choose a Scenario first" twice is more honest
  than inventing a second gate to justify an ordering.
- **`--text-caption` is body-sized.** The doc has no caption row, so the size came from the
  principle rather than from taste: this surface refuses small print, which is why
  `--text-value` is body-sized too. It is also what the twenty callers were already
  rendering at, because the class had no rule behind it at all.
- **The four what-if answers keep the poster's action and the prototype's voice.** The
  poster says "Follow ATC; return / land", which is a phrase for an adult in a tower. The
  instruction is the poster's; the sentence a child reads is the prototype's register.
- **"Missed Target / Route Error" got a title, not an entry.** The playbook already covers a
  missed checkpoint and a test refuses any Alert kind without advice. A route error has no
  detector, and an incident nothing raises is a page nobody reaches, so one row carries both
  names.
- **`craft` became `Drone` everywhere on screen, including where the prototypes say craft.**
  CONTEXT.md is the authority on what a screen calls an aircraft, and this is the one place
  the prototypes are not followed word for word. The test that pins the lock reasons says so.
- **Could have gone differently:** leave `--text-caption` at 0.875rem, which is what most
  design systems would pick. Rejected: it is a step the scale does not have, and it would
  have shrunk twenty files' worth of controls that read fine today. Add a `route-error`
  Alert kind so the poster row has its own entry. Rejected: nothing would ever raise it.

## 2026-08-09 · The `carried` variable was not dead, and the comment above it was wrong.

- **Decision / notes:** The brief said to delete it. It cannot be deleted. Each writer
  persists the session it returns *and* starts from the session it is handed, so threading
  the return value between the grant and hold loops is what stops a grant and a hold
  answered in one press from overwriting each other. What was actually wrong was the comment
  above it, which described a missing write to the classroom session; there is no missing
  write, and a reviewer read that comment and called a stop-the-line on it. Renamed to
  `answered`, comment rewritten, and two tests pin both halves.
- **Could have gone differently:** follow the instruction and delete it. Rejected: it would
  have introduced the bug the comment was falsely describing.

## 2026-08-07 · The rail is the navigation, and the top bar is what collapses.

- **Decision / notes:** ADR-0026. The twelve steps live on `/mission` and the seven-item
  `SiteNav` becomes one **Go to** button holding Fleet, Walls, Students and Vision.
  `/lesson`, `/control` and `/reports` forward with a link as well as a `router.replace`,
  because a static export is served off a memory stick as often as off Vercel and a
  redirect that needs JavaScript is not a redirect. `LessonScreen`, `ControlScreen` and
  `ReportsScreen` gained a `bare` prop rather than being rewritten: the work has not moved,
  only the way in. Steps 6 to 10 render the whole live board and only bring the section for
  the step into view; step 11 is close-down alone.
- **Could have gone differently:** Gate steps 6 to 10 the way 1 to 5 are gated, one pane
  each, as the prototype draws them. Rejected on safety: Land, Hover, Recall and Stop live
  on the strips, and a Command a navigation press can hide is a Command a Teacher cannot
  reach in the ten seconds they have. The prototype says so itself against step 7. Step 11
  is the exception because it does not open until every craft is down. Bounce a Teacher who
  presses a locked step back to the step the records imply. Rejected: a link that goes
  nowhere reads as broken, which is exactly what the first rail did.

## 2026-08-07 · Hold is the Teacher's second answer, and there is no third.

- **Decision / notes:** `holdClearance` beside `grantClearance`, and `holdSeatsForDrone`
  beside `grantSeatsForDrone` so the answer reaches the tablet. A held request stays in the
  queue and reads **Held**; the Student reads "Hold for now" in the words the held screen
  already shipped with. Records written before the field exists read as not held, because
  absent is not held. No free-text reason: the prototype's Hold is a bare button and a
  Teacher answering four teams has no spare press.
- **Could have gone differently:** A Release control so a Teacher can un-hold without
  granting. Rejected: granting already supersedes a hold, and a third button on a row a
  Teacher reads at a glance costs more than it answers. Drop a held team out of the queue.
  Rejected: it would make the Teacher's own answer invisible to them.

## 2026-08-06 · Class roll rides the classroom session; role is sticky and reversible.

- **Decision / notes:** Student tablets pick names from `session.roster` copied by
  `ClassroomOpen`, not from the Teacher Logbook. `ClassroomOpen` also subscribes to the
  Mission draft, so picking a Scenario mints the classroom code. Join-by-code reads
  localStorage first, then `/api/classroom`. Board role stays in
  `techtechflight:board-role` so a return visit skips `/enter`; Switch role clears it and
  the Student seat. `RequireRole` reads the role before mounting children so a Student who
  types `/lesson` never sees Teacher UI. Cross-device codes need `BLOB_READ_WRITE_TOKEN`.
- **Could have gone differently:** Keep reading the Logbook on the tablet. Rejected: an
  iPad never has that Logbook. Force `/enter` every launch. Rejected: sticky role matches
  a classroom device that stays Teacher or Student for the period. Server middleware for
  roles. Rejected: static export has no middleware; the client gate is the gate.

## 2026-08-06 · Mission-run rail withdrawn for a one-page Lesson and always-on Control.

- **Decision / notes:** The left twelve-step rail (ADR-0024) is removed again. Lesson shows
  every set-up block in one scroll. Control shows Attention, clearances, Scope, ATC toolbar,
  strips, seal and pack-down together. Poster steps remain a checklist of work, not a second
  nav. Classroom code sync for iPads ships as `/api/classroom` (Blob keyed by code); Teacher
  chrome shows/copies the code; Student door joins by code then name. Approve takeoff stays a
  Clearance (ADR-0021). See `docs/POSTER-WORKFLOW-PLAN.md`.
- **Could have gone differently:** Keep the rail and only fix empty step 6. Rejected: the
  owner asked for one-page Lesson, and the rail was already withdrawn once for being a second
  navigation. Hide pack-down until “step 11”. Rejected: with no steps, close-down belongs at
  the bottom of Control whenever a Lesson is running.

## 2026-08-06 · The Student's score is copied onto the classroom session, not looked up.

- **Decision / notes:** The Teacher seals a Mission on Control step 11, which writes the sealed
  Mission to `techtechflight:mission-draft` and to the Logbook. The Student's tablet needs that
  score. `ClassroomOpen` copies `mission.outcome` onto the classroom session, so the score
  reaches a tablet by the route the objective, the rules, the zones and the checkpoints already
  travel. The tablet renders the number and never recomputes it.
- **Could have gone differently:** Point the Student screen at the Logbook. It is the same
  browser today, so it would work, and it saves a field. Rejected on two counts: the Logbook is
  the Teacher's record and would have to be unpicked the moment the session crosses a network,
  and it puts every Lesson a School has ever run within reach of a child's device. Recomputing
  the score on the tablet from the same evidence was also rejected: two arithmetics for one
  grade is one of them being wrong, and a child's tablet is the worst place to find out.

## 2026-08-06 · Held is a phase, and a clearance is not a flight.

- **Decision / notes:** Two seat fields that looked like they said enough, and did not.
  `holdSeatClearance` sent the seat back to `request-takeoff`, which made a Student the Teacher
  had held indistinguishable from one who had never asked; `held` is its own phase now, and
  asking again is what clears it rather than the Teacher being asked to un-hold. And the
  way-down screen was chosen from `clearedAt`, so a Student cleared and still standing on the
  pad read "You are down"; the seat carries `flownAt`, written once from the first Telemetry
  sighting off the ground. `seatHasFlown` tolerates a seat written before the field existed,
  because a session outlives a deploy in `localStorage` and a missing field read as "has flown"
  would land a Student who never took off.
- **Could have gone differently:** Derive landing from the craft being on the ground while the
  clearance stands, with no new field. Rejected: that is true of a Student who has just been
  cleared, which is the bug. A `landedAt` written on the way down was also considered and
  dropped as one field too many: the first sighting off the ground is the fact that cannot be
  reconstructed, and the ground is Telemetry either way.

## 2026-08-05 — One screen, one question: Lesson keeps the Mission and the period.

- **Decision / notes:** Lesson had grown into the whole day. Alongside the Mission set-up
  steps it carried Fleet health with a craft-by-craft fault list, finished Lessons, the
  remedial queue, pack-down, a second copy of the Mission briefing, and two paragraphs on
  where records are stored. A Teacher at 08:55 read past four blocks to reach the step they
  opened the screen for, and every one of those blocks was a second place for a fact to go
  stale. Each moved to the screen whose question it answers, or was deleted because that
  screen already answered it:

  | Block | Went to | Because |
  | --- | --- | --- |
  | Fleet health, craft by craft | Fleet board | It lists every Drone with Status and fault |
  | Finished Lessons | Reports (`LessonReports`) | Same fields, same filter, already there |
  | Remedial queue | Reports | Follow-up belongs beside the record of what happened |
  | Pack-down | Control step 11 | Pack-down is close-down |
  | Second Mission briefing | Step 5 | The rail points at step 5 |
  | Where records live | Settings | That is where a Teacher goes to ask |

  One line of Fleet health stays, because "can the period run" is a question about the
  period rather than about the Fleet. It says both numbers and links to the list.
- **Could have gone differently:** A Lesson overview that keeps a summary of each. Rejected
  as the disclosure that had just been removed wearing a different hat: it keeps two sources
  of truth alive and puts the reading back in front of the step. Deleting the Fleet-health
  block outright was also rejected — a Teacher does need to know at 08:55 whether the lesson
  can run, and one line answers that without a list that can disagree with Fleet.

## 2026-08-05 — Land all, Hover all and Stop all lost their hold.

- **Decision / notes:** All three fleet-wide buttons wanted about a second of held pointer,
  with a fill bar, and a keyboard path that armed on the first press and fired on the
  second. The guard was aimed at a glance-misclick on the projector emptying the room. A
  Teacher reaching for one of these is usually reaching because something is going wrong,
  and a control that ignores the first press has to be learned before it works. Hover is
  the least consequential thing that can be done to the room; Land is recoverable; Stop is
  the one with a real argument, and it goes anyway because **per-strip Stop has always been
  a single press** (DESIGN §4.5) and one word cannot mean "at once" on a strip and "hold
  me" on the fleet row.
- **Could have gone differently:** Keep the hold on Stop all alone. Rejected — a guard that
  applies to one of three identical-looking buttons is a guard a Teacher discovers by
  pressing and getting nothing.

## 2026-08-05 — The Mission step is the h1, and Alerts belong to step 10.

- **Decision / notes:** The Attention bar was mounted above every Control step, carrying
  both the alert count and the page's only `<h1>`. Taking it off the other steps therefore
  left Control with no top-level heading, and Lesson had the same hole once the rest of the
  day moved to step 1. The step is what the screen is about, so the step title is the h1 on
  both screens, and the alert count is the h2 under it on step 10.
- **Could have gone differently:** Leave the bar mounted everywhere and shrink it.
  Rejected — a count that reads "4 items require action" above *Watch the airspace* is a
  second screen stacked on the first, whatever size it is.

## 2026-08-05 — The rest of the day lives on step 1, not under every step.

- **Decision / notes:** The Fleet check, the plan wizard, the remedial queue and last
  week's lessons folded into a disclosure summarised "Start a Lesson, and the rest of the
  day", carried on all five set-up steps. Carried is what was wrong: on step 4 it read as a
  drawer of unexplained work under the one thing the Teacher was being asked to do. It is
  the top of the day, so it is on step 1, in the open.
- **Could have gone differently:** Delete it outright, which is the literal request.
  Rejected — Start the lesson lives in there, and removing the only way to start a Lesson
  is not decluttering.

## 2026-08-04 — The Mission area grid is always on screen, and the guidance sits under it.

- **Decision / notes:** The editor swapped its drawing surface for a "here is what to do"
  box while nothing was drawn — deliberately, so an empty editor was not a blank square.
  But the sentence in that box said *Tap the grid*, and there was no grid to tap: the only
  way out of the state every Teacher starts in was to type two numbers into Add point.
  Show the grid always and keep the sentence, as a caption underneath. Underneath matters:
  above the grid, the sentence vanishing on the first point drags the grid up by its own
  height, and tap two lands somewhere the Teacher did not aim. Capped at `26rem` because a
  square that tracks the Lesson column is 900px tall and buries Add point below the fold.
- **Could have gone differently:** Keep the swap and reword the copy to "Add a point to
  start". Rejected — tapping is the natural way to draw a shape, and the editor already
  supported it; the copy was right and the surface was missing.

## 2026-08-04 — Run bar, Quiet mode and Screen lock leave the board.

- **Decision / notes:** Teachers asked the Step banner, Lock screen, and practice
  Stop-hiding (Quiet mode / Training wheels) removed. Drop `RunBar` / `runStep`, the
  Quiet and Screen-lock toggles, and the Training-wheels path. Control stays Attention +
  Scope + Commands; Photo 3 steps live on Lesson / Control / Reports, not a second chrome
  strip. Stop stays visible and Commands stay pressable.
- **Could have gone differently:** Keep the Run bar after withdrawing the left rail.
  Rejected — the Step line was the noise they pointed at.

## 2026-08-04 — Attention playbook opens in a dialog; the bar stays compact.

- **Decision / notes:** The focused Alert on Control is a one-line card (severity, callsign,
  text, Respond, I have this). Playbook responses and View Drone details live in a
  centered dialog so an arriving Alert does not shove Scope and Every Drone down the page.
  Same owner dizziness that made the July 30 closed-dropdown call — the inline playbook
  panel grew the bar enough to feel like the board was shaking.
- **Could have gone differently:** Put responses back behind a `<details>` on the bar.
  Rejected — opening that still grows the page under the Teacher's eyes; a dialog keeps
  the board still.

## 2026-08-05 · The step rail returns, with state and a way to put it away.

- **Decision / notes:** Reverses the withdrawal below, on the owner's direction and against a
  clickable prototype they reviewed. The rail is not the same object: every step reads as done,
  current, live or locked, a locked step says what is standing in the way, and the whole thing
  minimises to a column of numbers (slides away entirely on a narrow board). Set-up on Lesson is
  now one step per screen, keyed by `?step=`. Steps 6 and 11 (`ClearanceQueue`,
  `ConfirmMissionComplete`) are mounted for the first time; both had shipped as passing tests
  that no screen imported. Needed a Mission that outlives a screen
  (`techtechflight:mission-draft`) and somewhere to keep clearances
  (`techtechflight:clearances`). ADR-0024.
- **Could have gone differently:** Mount steps 6 and 11 and leave the rail withdrawn. Rejected —
  that fixes the unreachable steps and leaves a Teacher still unable to tell how far through
  set-up they are, or why a block will not open.

## 2026-08-04 — Mission run rail withdrawn.

- **Decision / notes:** The left twelve-step rail shipped and was removed the same day.
  The board stays on top SiteNav. Photo 3 steps are not a second nav.
- **Could have gone differently:** Keep iterating the rail. Rejected — product call was
  “gajadi”; restore the calmer chrome.

## 2026-08-04 — Control strips stay fully open; Attention stays one focused Alert.

- **Decision / notes:** AttentionBar keeps DESIGN §4.2 — worst Alert plus playbook
  responses (now via Respond dialog — see entry above), queue in a disclosure. Fleet
  actions use Land all · Hover all · Stop all under the Scope. Per-strip coordinates and
  Commands stay on every strip (DESIGN §4.4); gating them on selection/airborne was an
  accidental ship with the YOLO PR and broke CI. Fleet-wide Stop uses hold-to-confirm like
  Land all; per-strip Stop stays a single press.
- **Could have gone differently:** Compact grounded strips for calmer Mission Running.
  Rejected — the scan path and existing strip tests are the product contract.

## 2026-08-04 — Browser YOLO stays at 640; accuracy-heavy work moves to ai-service.

- **Decision / notes:** The Hyuto YOLOv8n ONNX is fixed-shape 640. Feeding 416 broke every
  frame while the UI still said the model was loaded. Wasm stays at 640; YOLO11x / high
  imgsz / ByteTrack live in the optional local AI service (ADR-0023), with CUDA or CPU.
- **Could have gone differently:** Re-exporting a dynamic ONNX for 416. Rejected for the
  hotfix — classroom recovery mattered more than a second export pipeline.

## 2026-08-04 — YOLO letterboxes to 416, not 640, on the board. (superseded)

- **Superseded** the same day — see the entry above. Kept so the mistaken 416 change remains
  visible in the log.

## 2026-08-04 — Wave M2 mounts mission prep on Lesson; Control gets Recall first.

- **Decision / notes:** Photo 3's twelve steps already map onto Lesson / Control / Reports,
  so M2 adds no new nav item. The Run bar lives on the app layout and derives its step
  from Logbook + localStorage + Fleet vitals until every flag has a dedicated store.
  ClearanceQueue, MissionPhaseBadge, CheckpointProgress, AlertResponseOptions,
  AssignTargetControl, InstructionControls and ConfirmMissionComplete ship as tested
  components; Control mounts Recall in this wave because it is a Command on an existing
  row. The rest wait for a thin wiring pass once Mission state is held in one place —
  mounting them with stub props would invent a second source of truth.
- **Could have gone differently:** Mounting every Control panel with local-only state in
  the same PR. Rejected because two Mission stores would drift on the first Lesson that
  both Lesson and Control touch.

## 2026-08-04 — The Vision check reports a missing model before a bad origin.

- **Decision / notes:** Both can be true at once — a fresh checkout opened at the laptop's
  network address has no weights *and* no camera. The model is reported first because it is
  fatal however the page was opened, and because it is the one thing establishable with no
  camera at all. Reporting the origin first would send a Teacher to fix their URL and land
  them back on the same screen with the same problem.
- **Could have gone differently:** Listing every applicable failure at once. Rejected as a
  wall of text on a screen whose value is a single word.

## 2026-08-04 — Only one onnxruntime variant is vendored, and which one is not a preference.

- **Decision / notes:** The package ships four WebAssembly builds totalling 77 MB. Which is
  needed is decided by the package's main entry point, not by the execution providers the
  board asks for — at 1.27 it is the **jsep** build even though we only ever request
  `wasm`. Copying the plain build looked reasonable, passed every test, built cleanly, and
  broke detection in the browser: the file 404s, session creation throws, and the board
  falls back to the demo detector, which draws confident invented boxes. It looks like it
  is working. Found by taking a screenshot, which is why that rule exists.
- **How to check after an upgrade:** build, then
  `grep -rho "ort-wasm[a-z0-9.-]*" web/out/_next/static/chunks | sort -u`.

## 2026-08-04 — Mission phase gains a twelfth state the customer's diagram does not have.

- **Decision / notes:** Their lifecycle goes straight from Await Takeoff Approval to
  Takeoff. That is right when a machine launches itself and wrong here, because a Student
  flies the aircraft — approval and launch are separated by however long a team takes to be
  ready. Without **Cleared**, a team that has permission and has not moved is
  indistinguishable from one still waiting on the Teacher, which is the queue the Teacher
  is working through.
- **Could have gone differently:** Staying at eleven and letting Awaiting clearance cover
  both. Rejected because the word would then be false for half the Drones showing it.

## 2026-08-04 — Alerts are ranked by safety priority, not by severity.

- **Decision / notes:** A `critical` low charge and a no-fly breach are not in the order
  their severities suggest. The customer's five priorities — people, airspace, recovery,
  mission, logging — order the playbook instead, because one of those two is about where an
  aircraft is relative to a room full of children. Equal priorities keep arrival order, so
  the list does not reshuffle under a Teacher mid-glance.

## 2026-08-03 — Record is inside Camera, not beside it.

- **Decision / notes:** Per-Drone Record is session chrome for the feed, so it only appears
  in CameraPane / the Camera dialog. Control strips keep the Camera opener alone; putting
  Record next to Camera made it look like a Command sibling of Land / Hover. Fleet-wide
  **Record all cameras** stays on Control / Walls as a board action.

## 2026-08-03 #119 — Charge-to-ready for the set.

- **Decision / notes:** The minutes figure is the longest `timeToReadyMs` among forecasted craft, and the count is already-Ready plus every craft carrying a forecast. Partial horizons ("4 ready in 5 minutes" while two more still charge) would need a second line; one line for the whole set answers when the forecasted pack is in.

## 2026-08-03 #129 — Missing since last Lesson.

- **Decision / notes:** "Absent" means Offline or missing from the Fleet — not the Teacher's physical headcount tick (#128). The notice is silent when the last closed Lesson left no tally/assignments/commands to compare against.

## 2026-08-03 #146 — Undo last assignment.

- **Decision / notes:** Undo depth is one snapshot of the whole live assignment map, captured before a mutation (`captureAssignmentUndoPoint` / `withAssignmentUndo`). The Integrator wraps assign paths; the button only restores. A second capture replaces the first — no multi-step stack.

## 2026-08-03 #148 — Absent frees a craft.

- **Decision / notes:** Marking absent clears their live assignment but does not auto-assign the next waiting name — the Teacher still chooses who takes the freed craft. The notice only names who is next.

## 2026-08-03 #156 — Safety brief.

- **Decision / notes:** Persist ticks in localStorage keyed to the running Lesson id (`techtechflight:safety-brief`), not on the Logbook — the brief is period chrome, not a Student record, and must not ride Telemetry or the optional Blob sync.

## 2026-08-03 #230 — Camera orientation.

- **Decision / notes:** Orientation lives in `localStorage` (`techtechflight:camera-orientation`), never on Telemetry — same class of school preference as the stream map. CSS `scaleX` + `rotate` is applied by the Integrator to the video element.

## 2026-08-03 #310 — Lifetime hours per craft on Reports.

- **Decision / notes:** The Logbook has no per-flight airborne clock. A craft with `tally.flights > 0` in a closed Lesson is charged that Lesson's wall-clock (`endedAt − startedAt`). Open Lessons and crafts that never took off do not accumulate. Order is by `droneId`, not by hours.

## 2026-08-03 #340 — Attendance over time.

- **Decision / notes:** Attendance history lives in a side localStorage key (`techtechflight:attendance-history`), not inside the Logbook shape. Parallel wave tickets cannot extend `Logbook` without colliding. The Integrator should call `sealAttendanceFromBook(lessonId, book, at)` when a Lesson closes so the open `absentStudentIds` marks become a lasting session. Counts stay at zero until something is sealed — inventing absence from "not assigned" would misread rotations as truancy.

## 2026-08-03 #342 — Notes per pupil.

- **Decision / notes:** Pupil notes live in `techtechflight:pupil-notes`, not on `Logbook`, because this wave cannot extend the Logbook shape without colliding. Behaviour mirrors `writeNote`: trim, empty clears, `updatedAt` on save.

## 2026-08-03 #345 — Roster CSV import.

- **Decision / notes:** Name-only CSV replaces the class via `saveRoll`. CSV with studentId upserts those rows and leaves other roster members alone. Validation runs to completion before any write.

## 2026-08-03 #350 — Flight hours per pupil.

- **Decision / notes:** True takeoff/land timestamps are not kept on `LessonRecord`. Prefer `sealPupilFlightHours` from live events via `airborneMsFromEvents`. Without a seal, attribute Lesson wall-clock only when `tally.flights > 0` for that assignment, and label the readout approximate. Zero stays zero when nothing applies.

## 2026-08-03 Parallel waves write changelog fragments, not the changelog

- **Decision:** During a multi-agent wave, no agent edits `docs/CHANGELOG.md` or this file.
  Each writes `docs/changelog.d/<issue>.md`, and one serial Integrator merges them in issue
  order at the end of the wave. Working alone, edit both files directly as always.
- **Reason:** The standing "update the changelog after every task" rule assumes serial work.
  Ten agents appending to the same two files at the same moment is a guaranteed three-way
  conflict, and resolving it by hand is where a wave loses entries silently.

## 2026-08-03 A stale test selector was realigned, not the live region restored

- **Decision:** `ControlStripOrder.test.tsx` now queries the Attention queue by
  `role="list"`. The `role="status"` that commit `1907523` removed was **not** put back.
- **Reason:** That role was an ARIA live region — an announcement. The list it sat on now
  lives inside a **closed** disclosure, where a live region announces nothing, so restoring
  it there would look like a fix without being one. Whether a new fault should announce
  itself at all, and from which element, is a design question; raised as #239 rather than
  settled inside a test repair.
- **Cost stated:** until #239 is answered, a screen-reader user is not told when a new item
  joins the queue. That is a real gap, not a tidy outcome.

## 2026-07-30 Charge reading uses an iPhone-style battery glyph

- **Decision:** Add `BatteryGlyph` (outline + nub + proportional fill) beside the
  existing percent · time words via `BatteryChargeReading` on Control strips / Scope dock.
- **Reason:** Owner asked for a familiar phone battery icon next to the charge line.

## 2026-07-30 Camera Record is one session mark, many buttons

- **Decision:** Shared `camera-recording` session store. Per-Drone **Record** on Control
  strips, Scope dock, Camera wall tiles, and CameraPane; **Record all cameras** on
  Control Every Drone and Cameras wall. Still not a Fleet Command (ADR-0011); no media
  bytes captured yet — the mark is the product until clip download lands.
- **Reason:** Owner — could not find the old school-stream-only “Save clip” stub; wants
  one-by-one and all-Fleet recording controls.

## 2026-07-30 Lesson strip actions are one cluster

- **Decision:** Group Bookmark / Note incident / End in a single flex on the Lesson strip;
  pass `compact` so recent lists do not stack under the buttons.
- **Reason:** Owner — `justify-between` with four siblings left the ghost buttons floating
  in the middle of the bar.

## 2026-07-30 Warm-up countdown ignores unstable onDone

- **Decision:** `LessonWarmUp` ticks with one `setInterval` and keeps `onDone` in a ref
  (effect does not depend on the callback identity).
- **Reason:** Fleet `now` re-renders every second with a new inline `finishWarmUp`. That
  used to sit in the timeout effect deps, clearing the 1s timeout so the overlay stuck
  near 60.

## 2026-07-30 Drop Battery swap checklist

- **Decision:** Remove `BatterySwapChecklist` from Lesson (and delete the component).
- **Reason:** Owner — not needed; local checkbox chrome without Commands.

## 2026-07-30 No Camera button on Fleet Details

- **Decision:** Drop the quiet **Camera** footer control (and Fleet `CameraSlide` host)
  from the tile Details dialog. CameraPane remains under **More details**.
- **Reason:** Owner — another chrome control on Fleet; Walls / Control cover large view.

## 2026-07-30 Attention bar is a closed dropdown

- **Decision:** Replace the single rotating “next alert” panel with a `<details>`
  disclosure: summary shows count + worst line; body lists every queue item with
  “I have this”. Empty state unchanged (count at zero + calm sentence).
- **Reason:** Owner — the advancing single alert felt like the UI was moving and made
  them dizzy.

## 2026-07-30 Fleet Details carries More details instruments

- **Decision:** Keep Fleet tile **Details** as an on-board dialog. Add a **More details**
  disclosure with Charge chart, Height/landing, CameraPane, and Attitude — the content
  that used to push Teachers onto `/drone`. Full `/drone` remains for deep links.
- **Reason:** Owner — prefer investigating from the Fleet grid rather than a separate page.

## 2026-07-30 Drop Spotlight entirely

- **Decision:** Remove peer-demo Spotlight from Control (strip + scope dock +
  `PeerDemoSpotlight`) and delete `/walls/spotlight` / hub link / `SpotlightWall`.
- **Reason:** Owner — do not want a Spotlight feature; Camera is enough.

## 2026-07-30 Walls hub is a searchable flat list

- **Decision:** Drop the “More walls” disclosure. Show every wall in one grid; filter
  with a “Find a wall” search input (label + hint + path).
- **Reason:** Owner — disclosure felt unnecessary; search is how they want to find a wall.

## 2026-07-30 Drop Projector and TV walls

- **Decision:** Remove `/walls/projector` and `/walls/tv` (hub links + `WallsTvMode`).
  Classroom display uses Cameras/Status plus the existing Large format toggle.
- **Reason:** Owner — redundant with Cameras/Status; cluttered the Walls hub.

## 2026-07-30 Control and Walls UX: teach first, chrome later

- **Decision:** Strip Control to Attention bar + optional ceiling line + Scope + Every
  Drone list. Park Land-all / Quiet / Training wheels / Clear under **More actions**.
  Drop Control mounts for waiting-queue dock, lesson tools stack, and camera filmstrip.
  Collapse per-strip NOW/SOON alerts into a closed disclosure. Walls hub shows eight
  primary walls; remaining walls live under **More walls**.
- **Reason:** Owner — the board felt chaotic; Teachers need a calm glance, not every
  walls experiment on the teaching surface.

## 2026-07-30 Drop kiosk wall and Stop audit

- **Decision:** Remove `/walls/kiosk` (and hub link) and delete Stop audit
  (`StopAuditLog` / `stop-audit` sessionStorage) from Control.
- **Reason:** Owner — neither mattered for classroom teaching; Status wall covers the
  kiosk glance, and Stop audit was unused noise.

## 2026-07-30 Control disclosures and Scope ghost paths on elevation

- **Decision:** Collapse Control extras (full waiting queue, lesson tools, camera
  filmstrip, class actions) into closed `<details>` disclosures; keep AttentionBar as
  the single always-visible urgent line. Delete Scope layout presets (Control mount +
  module). Drop the lesson timer from `/walls/cameras` and `/walls/projector`. Record
  `altitudeM` on ghost-path samples and draw trails on Side/Front as well as top-down.
- **Reason:** Owner — long alert lists and filmstrip chrome shoved the board around and
  made Control hard to scan; layout presets were unused noise; ghost paths should match
  every Scope view.

## 2026-07-30 Teacher PIN and Cloud Logbook copy UI removed

- **Decision:** Drop the demo Teacher PIN gate and the Settings “Cloud Logbook copy”
  panel (plus layout hydrator). Commands and Settings are ungated again.
- **Reason:** Owner — both felt like noise in the classroom product; PIN especially.
- **Note:** `logbook-sync` helpers may remain for API/env use; the Teacher-facing copy UI
  is what went.

## 2026-07-30 Test suite clears DEMO_ONLY and unlocks teacher PIN where Commands run

- **Decision:** `web/test-setup.ts` deletes `NEXT_PUBLIC_DEMO_ONLY` so a leftover demo-only
  shell does not force SimulationLabel on `/`. Stop/Swap Control tests call
  `unlockTeacherPin` because Commands go through the PIN gate.
- **Reason:** Otherwise CI fails after a local `NEXT_PUBLIC_DEMO_ONLY=1` next process, and
  Stop never reaches the simulator.

## 2026-07-30 Landing pad workflow is a sim stepper

- **Decision:** Local step UI on Pads route.
- **Reason:** Feature 65c.
## 2026-07-30 Stop audit is sessionStorage

- **Decision:** Local session only.
- **Reason:** Feature 65b.
## 2026-07-30 Recording clip is a stub control

- **Decision:** Button only.
- **Reason:** Feature 65a.
## 2026-07-30 Projector reuses Cameras wall page

- **Decision:** `/walls/projector` clones Cameras page; hub link included.
- **Reason:** Feature 64.
## 2026-07-30 Parent kiosk reuses Status wall page

- **Decision:** `/walls/kiosk` clones Status page; hub link included.
- **Reason:** Feature 63.
## 2026-07-30 Voice callouts are text labels first

- **Decision:** Text labels only.
- **Reason:** Feature 62.
## 2026-07-30 Scope layout presets are local chrome

- **Decision:** Preset buttons store choice in React state.
- **Reason:** Feature 61.
## 2026-07-30 Battery swap checklist is local UI only

- **Decision:** Checklist on Lesson; no hardware Commands (ADR-0011).
- **Reason:** Feature 60.
## 2026-07-30 Maintenance flag is a strip badge

- **Decision:** `MaintenanceFlag` badge; active state can bind to out-of-service later.
- **Reason:** Feature 59.
## 2026-07-30 Spare inventory is grounded count

- **Decision:** `SpareInventory` uses grounded vitals as spare.
- **Reason:** Feature 58.
## 2026-07-30 Lesson templates are a fixed starter pack

- **Decision:** `LESSON_TEMPLATES` three plans; pick wires later into ExerciseList.
- **Reason:** Feature 57.
## 2026-07-30 Paste roster removed from Students

- **Decision:** Drop `RosterImport` / `parseRosterPaste`. Class names are added one at a
  time via the Name field.
- **Reason:** The paste box never wrote into the Logbook (`onImport` was a no-op) and
  cluttered The class.
- **Supersedes:** 2026-07-30 “Roster import is paste-then-parse” (Feature 56 stub).

## 2026-07-30 Reports join student ids from assignments

- **Decision:** `studentIdsForLesson` reads unique names from `lesson.assignments`.
- **Reason:** Feature 55.
## 2026-07-30 Weekly digest is a 7-day lesson count

- **Decision:** `WeeklyDigest` on Reports summarises the last 7 days.
- **Reason:** Feature 54.

## 2026-07-30 End-of-day export is JSON until ZIP lands

- **Decision:** `EndOfDayExportButton` downloads todays lessons as JSON; ZIP deferred.
- **Reason:** Feature 53.
- **Note:** Filename `techtechflight-eod.json`.
## 2026-07-30 Auto PDF is confirm-then-download on lesson end

- **Decision:** `AutoPdfAfterLesson` opens from `LessonStrip` after `endLesson`; Teacher confirms download via existing `downloadReportsPdf`.
- **Reason:** Feature 52.
- **Note:** Defects list empty in the prompt payload; Reports still has the full export.
## 2026-07-30 Before/after scores are a pair on the lesson summary

- **Decision:** `formatScorePair` / `BeforeAfterScores` present before→after; storage on LessonRecord can follow.
- **Reason:** Feature 51.
- **Note:** Local presentation first.
## 2026-07-30 YOLO lesson score averages detection counts

- **Decision:** `YoloLessonScoreStrip` shows mean detection count per craft; Control passes zeros until Detect wall tallies are wired live.
- **Reason:** Feature 50.
- **Note:** Formula in `yolo-lesson-score.ts`.

## 2026-07-30 Teacher incident notes during a lesson

- **Decision:** `addTeacherIncidentNote` appends attention-severity incidents to the running
  lesson. Control and `/lesson` expose **Note incident** beside bookmark — Logbook only
  (ADR-0011).
- **Reason:** Feature #48 — Teachers need to record what they saw without waiting for
  lesson close or a fault event.
- **Note:** Auto-copied fleet incidents at close are unchanged; teacher notes use the same
  `incidents` array with `severity: 'attention'`.
## 2026-07-30 Absent Student versus Offline Drone badges

- **Decision:** **Absent** is a Teacher-marked roster flag (`absentStudentIds` in the Logbook).
  **Offline** is Telemetry Status on a Drone. Separate pills: `text-status-not-ready` vs
  `text-status-offline`. Nothing is sent to the Fleet (ADR-0011).
- **Reason:** Feature #46 — a Student away from class is not the same fact as a craft that
  lost link.
- **Note:** Absent Students still appear on the roster; assignment is unchanged.
## 2026-07-30 Double-assign blocked in the Logbook

- **Decision:** `assignStudent` returns false when `studentAssignedElsewhere` finds the name
  on another Drone. UI clash warnings stay; the Logbook is the backstop so one-tap assign
  cannot bypass D7.
- **Reason:** Feature #47 — six quick taps must not put one Student on two craft.
- **Note:** Clearing a name or swapping assignments is unchanged.
## 2026-07-30 Camera photo evidence download

- **Decision:** `PhotoEvidenceButton` on CameraPane captures the current `<video>` frame to
  PNG via an off-screen canvas; sim feeds without pixels use `downloadPlaceholderEvidence`.
  No upload or Command (ADR-0011).
- **Reason:** Feature #49 — Teachers need a still for incident follow-up without inventing
  cloud storage.
- **Note:** Filename `{droneId}-evidence.png`; school streams and sim both offer the control.

## 2026-07-30 Swap exchanges live assignments only

- **Decision:** `swapStudentAssignments` exchanges `book.students` entries between two Drones. Control shows **Swap** on every other strip while one is selected. Lesson-record assignments at start are untouched (G6).
- **Reason:** Feature 45 — a faulted airframe swap mid-lesson should not make a Teacher retype names.
- **Note:** Swap with one empty Drone moves the assignment; both empty is a no-op.

## 2026-07-30 One-tap assign walks the roster in order

- **Decision:** `assignNextRosterName` hands the next unassigned roster name to a Drone. Control targets the selected unassigned craft when one is lit; otherwise `firstUnassignedDrone` in board order. Students uses board order only.
- **Reason:** Feature 44 — six assignments in thirty seconds; typing six names is not thirty seconds.
- **Note:** Does not bypass D7 double-assign — `assignStudent` still owns clashes.

## 2026-07-30 Assigned Students read as display type on strips

- **Decision:** When a Student is assigned, Control strips show their name as `font-display text-body font-medium text-ink` beside the callsign; click opens the existing inline field. Unassigned strips keep the dashed input.
- **Reason:** Feature 43 — §4.4 wireframe puts the name at equal weight to the Drone name; a narrow input buried it.
- **Note:** Alert copy still repeats "Flown by …" under alerts; that line is for urgency, not identity.

## 2026-07-30 Land all (sim) is a ScenarioControls surface

- **Decision:** `SimLandAllButton` on Control calls `scenarios.setAltitude(id, 0)` for every airborne craft. Shown only when `scenarios` is present; hidden when nothing is up.
- **Reason:** Feature 42 — Teachers need land-all without waiting for the period timer; still not a Command path (ADR-0011 / C9).
- **Note:** End-period prompt keeps the same landing logic; this is the always-available control.

## 2026-07-30 Teacher PIN is session demo gate only

- **Decision:** `DEMO_TEACHER_PIN = '4242'` in `teacher-pin.ts`; unlock stored in `sessionStorage`. Control wraps Commands via `useTeacherPinGate`; Settings blocks behind `TeacherPinOverlay` until unlocked.
- **Reason:** Feature 41 — minimal authority gate before sensitive actions without inventing school identity.
- **Note:** Demo PIN only, not authentication; closing the tab clears unlock.

## 2026-07-30 Quiet mode hides Stop on Control strips

- **Decision:** `QuietModeToggle` sets local React state on Control; `CommandRow` accepts `hideStop` and omits Stop / Release stop when true. Land and Hover unchanged.
- **Reason:** Feature 40 — demonstrations and quiet classrooms where the red Stop must not sit on every strip.
- **Note:** UI-only; does not change what the Fleet accepts (ADR-0011).

## 2026-07-30 Classroom geofence is a fixed 8×6 m box on Scope

- **Decision:** `CLASSROOM_GEOFENCE` in `web/lib/classroom-geofence.ts` — west −4, east 4, south −3, north 3 metres from setup. Scope top-down draws a dashed `stroke-status-not-ready` rect; elevation views omit it. Caption states extents.
- **Reason:** Feature 39 — show a nominal classroom boundary without claiming it is the room (ADR-0012 / ADR-0014).
- **Note:** No geofence alerts yet; the line is orientation only.

## 2026-07-30 Height ceiling banner reuses the wall threshold

- **Decision:** `HeightCeilingBanner` on Control calls `isOverCeiling` from `height-wall.ts` (`CLASSROOM_CEILING_M = 3`). Read-only — no Command path (ADR-0011).
- **Reason:** Feature 38 — Teachers working strips need the ceiling warning without opening the height wall.
- **Note:** Banner hides at zero over-ceiling craft; names every offender.

## 2026-07-30 Freeze scope snapshot on Control

- **Decision:** **Freeze scope** snapshots Drone positions, the held window, ceiling, and
  conflict lines on Control's Scope only (`onSelect` mounts). Telemetry, strips, and
  Commands stay live — display pause only, mirroring camera wall freeze. No backend flag.
- **Reason:** Teachers need a still plan view without stopping the Fleet behind Control.
- **Note:** Reports Scope omits the control; read-only mounts never offered freeze.
## 2026-07-30 Ghost paths on the Scope

- **Decision:** **Ghost paths** are optional on Control's Scope (top-down only). Positions
  accumulate client-side in `scope-ghost-paths.ts` (two-minute window, 40 points per Drone).
  `FleetHistory` carries events and charge samples only — no wire trail yet — so Reports and
  other Scope mounts omit the toggle; enabling with no movement shows caption copy only.
- **Reason:** Teachers asked for recent trails without claiming Telemetry history that does
  not exist.
- **Note:** When position history lands on the ground station, this buffer can hydrate from
  it; until then the stub toggle documents the gap honestly.
## 2026-07-30 Lesson bookmark moment on Control and Lesson

- **Decision:** **Bookmark moment** appends `{ at, note? }` to the running lesson in the
  Logbook (`bookmarks`, capped at 50). Shown on the Control lesson strip and `/lesson` while
  the lesson is under way. No Fleet message (ADR-0011).
- **Reason:** Teachers need to mark a classroom moment without leaving Control.
- **Note:** Closed lessons keep bookmarks on the record for reports later.
## 2026-07-30 Remedial queue on Control and Lesson

- **Decision:** **Remedial queue** lives in the browser Logbook (`remedialQueue`). When a
  lesson closes, Drones with **fault**-severity incidents are merged in once each. Control
  and `/lesson` render a minimal linked list; **Done** dismisses locally — no Command
  (ADR-0011).
- **Reason:** Classroom follow-up after incidents without another screen to maintain.
- **Note:** Attention-severity incidents stay off the queue unless a Teacher adds them later.
## 2026-07-30 Lesson plan wizard on /lesson prep

- **Decision:** `LessonPlanWizard` replaces the inline label + exercises + start block with three
  steps (Name → Exercises → Confirm). A persistent **Start now** in the wizard header
  preserves E7 — planning never gates start.
- **Reason:** Feature 33 — structured prep without redesigning `LessonPrepPanel` or assignments.
- **Note:** Confirm step summarizes label (or Untitled lesson), exercises, and serviceable count.
## 2026-07-30 Training wheels mode is UI-only local state

- **Decision:** `TrainingWheelsProvider` stores on/off in `localStorage`. When on, Control and
  Lesson show a banner; Stop buttons are replaced with copy; strip and alert chips use muted
  hairline styling instead of status-fault borders. Land and Hover remain.
- **Reason:** Feature 32 — first-lesson practice without the highest-risk control surface.
- **Note:** Does not intercept `command()` or add CommandableSource paths (ADR-0011).
## 2026-07-30 Peer demo spotlight on Control

- **Decision:** Each Flight strip and the scope dock get a Spotlight button that mounts
  `PeerDemoSpotlight` — one enlarged `CameraPane` with the assigned Student name when known.
  Watch-only; no Telemetry URLs or Commands (C9, ADR-0011).
- **Reason:** Feature 31 — Teachers demo one Student's craft without leaving Control or opening
  `/walls/spotlight`.
- **Note:** Separate from `cameraDroneId` / `CameraSlide`; spotlight and slide can coexist.
## 2026-07-30 Class average strip on Control

- **Decision:** `ClassAverageStrip` sits between the Attention bar and the scope. Mean height
  averages airborne Drones with a reported altitude only; readiness is the share labelled Ready
  via `readyBoardLabel`.
- **Reason:** Feature 30 — Teachers scanning a lesson need a fleet-wide line without a wall.
- **Note:** Grounded craft at 0 m are excluded from the height average so the number tracks the
  air, not the desk.
## 2026-07-30 Live headcount is airborne vs grounded counts

- **Decision:** `LiveHeadcount` shows `vitals.airborne` true/false tallies next to the Every Drone heading.
- **Reason:** Feature 29 — glance how many are up without scanning strips.
- **Note:** Board order of strips unchanged.

## 2026-07-30 End-period prompt lands via setAltitude(0)

- **Decision:** `LessonTimerBanner.onExpire` opens `EndPeriodLandPrompt`. Sim land-all calls `scenarios.setAltitude(id, 0)` for airborne craft — not a hardware Command surface (ADR-0011 / C9).
- **Reason:** Feature 28 — period end needs a land nudge without inventing ScenarioControls.landAll.
- **Note:** Absent `scenarios` (hardware), the dialog is dismiss-only copy.

## 2026-07-30 Lesson warm-up is a 60s overlay once per lesson

- **Decision:** `LessonWarmUp` shows for 60s after a lesson starts on `/lesson`; Skip or expiry marks `sessionStorage` so reload does not re-show for that lesson id.
- **Reason:** Feature 27 — brief settle time before the class treats the lesson as running.
- **Note:** Overlay only; does not block Control.
## 2026-07-30 Control reuses the camera-wall lesson timer

- **Decision:** Control mounts `LessonTimerBanner` under `LessonStrip` — local countdown only, same component as `/walls/cameras`.
- **Reason:** Feature 26 — Teachers watching Control need the period clock without opening Cameras.
- **Note:** End-period prompt is a separate feature that hooks `onExpire`.

## 2026-07-30 Attention queue dock on Control

- **Decision:** Add `ControlAttentionQueue` beneath the Attention bar — the full
  `alertQueue` worst-first as clickable rows. Click selects the matching strip and scrolls
  it into view; the bar still shows one Alert at a time with Acknowledge.
- **Reason:** Feature 25 — Teachers working several alerts need to jump between strips
  without re-finding them in board order. The dock reuses queue ordering and presentation;
  strips stay in `boardOrder` (deliberate position #1).
- **Note:** Hide the dock at zero queue length — the bar's count and reassuring sentence
  already cover the empty case.
## 2026-07-30 Battery time budget uses charge × 12 minutes

- **Decision:** Control flight strips show estimated flight minutes as `batteryFraction × 12`,
  rounded to whole minutes (`about N min left`). No discharge slope — a classroom rule of
  thumb only. Low-budget threshold for warnings is `< 20%` charge (~2.4 min).
- **Reason:** Feature 24 — Teachers need a quick time budget beside charge without vitals
  history; the vitals endurance forecast stays on Drone detail where slope data exists.
- **Note:** Helper lives in `web/lib/battery-budget.ts`.

## 2026-07-30 Lesson timer on camera wall is local state

- **Decision:** `LessonTimerBanner` on `/walls/cameras` holds countdown in React state only.
- **Reason:** Feature 22.
- **Note:** Persist later; Control timer is a separate feature.
## 2026-07-30 Walls TV mode toggles Cameras and Status

- **Decision:** `/walls/tv` mounts CameraWall or StatusWall with a toggle; Exit TV → `/walls`. No Settings link on this surface.
- **Reason:** Feature 21.
- **Note:** SiteHeader still present via app layout.

## 2026-07-30 End-lesson landed wall at `/walls/landed`

- **Decision:** `/walls/landed` renders `LandedWall` — one linked tile per Drone in board
  order. Green (`success`) when `airborne` is false, red (`destructive`) when still airborne.
  Summary: `N landed · M still flying`. Click → `/drone?id=`. Empty Fleet → “Waiting for the
  Fleet.”
- **Reason:** Feature 19 — end-of-lesson glance at who is down without Control.
- **Note:** Pure filter in `landed-wall.ts`; hub link deferred — do not edit `WallsHub`
  until hub sync.
## 2026-07-30 Camera wall names the assigned student when the Logbook has one

- **Decision:** Camera wall tiles use `studentOf` for the headline and simulated-feed label;
  unassigned tiles keep the Drone callsign only — no placeholder.
- **Reason:** Feature 20 — Teachers scanning six feeds need who's flying, not another row of
  "Drone N".
- **Follow-up:** When assignment is missing, the tile stays drone-named; assignment still
  happens on Control / Students, not on the wall.
## 2026-07-30 Scope camera filmstrip under Control scope

- **Decision:** Control's "Where everything is" section adds a horizontal filmstrip of
  `CameraTile` thumbs below `Scope`. Board order, watch-only; click opens `CameraSlide`.
  Selected scope mark sets `aria-pressed` on the matching thumb.
- **Reason:** Feature 15 — glance every fitted camera without leaving the scope.
- **Note:** Lives on `/control` (Tower redirects there). Reuses `CameraTile`; no new Commands.

## 2026-07-30 Spotlight wall is one CameraPane plus thumb row

- **Decision:** /walls/spotlight shows one large CameraPane; thumbnails switch focus by drone id in local state.
- **Reason:** Feature 17 — class demo focus without leaving Walls.
- **Note:** Reuses CameraPane; no Telemetry stream URLs.
## 2026-07-30 Dual watch selects update a/b query params

- **Decision:** Each Dual pane has a native Drone `<select>`; changing it `router.replace`s
  `?a=` / `?b=`. Missing params still default to the first two Fleet Drones in board order.
- **Reason:** Teachers pick feeds on the wall; query params stay the shareable address.
- **Alternatives considered:** Local state only (rejected: deep links and refresh lose the
  pair); URL-only via typing (rejected: classroom UX).

## 2026-07-30 Dual watch uses query params a/b for CameraPane pair

- **Decision:** /walls/dual mounts two CameraPanes. `?a=` / `?b=` select drone ids; missing params use the first two Fleet Drones in board order.
- **Reason:** Feature 16 — compare two feeds without crowding Control.
- **Note:** Full CameraPane (sim Start/Stop) inside each pane; no new Commands.
  Superseded for UI by the select decision above; params remain the address.
## 2026-07-30 Detection wall shows em dash until counts are shared

- **Decision:** Tiles show —; counts stay in CameraPane for now.
- **Reason:** Feature 14.
## 2026-07-30 QR pad wall ships Not seen until CameraPane sightings are shared

- **Decision:** Tiles show Not seen; no Telemetry write.
- **Reason:** Feature 13.
## 2026-07-30 Landing watch focuses descending and auto-landing phases

- **Decision:** Prefer `descending` / `auto-landing` / low airborne; else all with height. Click `/drone?id=`.
- **Reason:** Feature 12.
- **Note:** Read-only.


## 2026-07-30 Landing watch wall at `/walls/landing`

- **Decision:** `/walls/landing` renders `LandingWatch` — one linked tile per Drone in board
  order when nothing is landing; when any Drone has phase `descending` or `auto-landing`
  (or airborne with vertical rate below the vitals deadband), the wall **narrows to those
  tiles only**. Tile body: name, phase label when focused, airborne state, aligned height.
  Summary: `N landing`. Click → `/drone?id=`. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 12 of classroom walls — whole-class landing glance without Control.
- **Note:** Pure filter in `landing-wall.ts`; hub link deferred — do not edit `WallsHub`
  until hub sync.
## 2026-07-30 Proximity wall at `/walls/proximity`

- **Decision:** `/walls/proximity` renders `ProximityWall` — one linked tile per unique pair
  of airborne Drones closer than **`SEPARATION_WARNING_M` (1.5 m)** from vitals, deduped the
  same way Scope draws conflict lines. Summary: `N close pairs`; distance readout uses one
  decimal and ` m apart`. Click → `/drone?id=` on the lexicographically first id in the
  pair. Empty when all clear. Display-only.
- **Reason:** Feature 11 proximity risk wall — whole-class separation glance without Scope.
- **Note:** Pair logic lives in `proximity-wall.ts`; hub link syncs in a later wave.
## 2026-07-30 Lost-link siren is visual pulse on Walls, not audio

- **Decision:** `LostLinkSiren` mounts in `WallsShell` when any vitals entry is Offline,
  `no-contact`, or has a `no-response` alert. Uses `role="alert"` and
  `motion-safe:animate-pulse` (no compulsory motion). No audio in this feature.
- **Reason:** Owner feature 10 — Teacher glance when a craft goes quiet mid-lesson.
- **Note:** Does not change ConnectionBanner (board↔ground-station); this is per-Drone link.
## 2026-07-30 Height wall uses 3 m classroom ceiling default

- **Decision:** `/walls/height` compares each reported `altitudeM` against
  **`CLASSROOM_CEILING_M = 3`** in `height-wall.ts`. At or below 3 m is normal; above
  highlights the tile and counts in “N over ceiling”. No shared ceiling constant existed
  elsewhere — Scope uses an adaptive ladder, and ADR-0016’s “3 m ceiling” is illustrative
  only.
- **Reason:** Feature 9 height wall — whole-class height comparison with one teaching
  default until a room model lands.
- **Note:** Readouts use one decimal and a fixed ` m` suffix for column alignment; click
  → `/drone?id=`. Hub link syncs in a later wave.
## 2026-07-30 Last Contact wall at `/walls/heartbeat`

- **Decision:** `/walls/heartbeat` renders `HeartbeatWall` — one linked tile per Drone in
  board order (`vitals`), read-only. Tile body: name plus a single dot — filled (`bg-ink`)
  when `lastContact` is set and the Drone is not Stale, hollow (`border-stale`) otherwise.
  Summary line: `N stale`. Click → `/drone?id=`. Teacher-facing title **Last Contact**;
  route keeps `heartbeat` internally. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 8 of classroom walls — whole-class link liveness at a glance without
  Status noise.
- **Note:** Alive logic in `heartbeat-wall.ts`; aria-label carries responding/stale for
  screen readers because the dot alone would violate ADR-0004.
## 2026-07-30 Fault mosaic reorders trouble to the front

- **Decision:** `/walls/faults` renders `FaultMosaic` — one linked tile per Drone. Unlike
  Control strips and the Status wall, **priority tiles sort first**: stale silence, Fault
  status, latched emergency, or a `fault` / `emergency-stop` alert. Within each group,
  board order is preserved. Summary line: `N troubled`. Tile body: name, `StatusBadge`, fault
  reason when Telemetry carries one, stale “Link gone quiet” otherwise, response age. Fault →
  `border-status-fault`; emergency → `border-2 border-status-fault`. Non-priority tiles stay
  visible but slightly muted. Click → `/drone?id=`.
- **Reason:** Feature 7 of classroom walls — a mosaic view where trouble is never buried
  behind healthy Drones.
- **Note:** Pure sort in `fault-mosaic.ts`; hub link lands in a later sync commit.
## 2026-07-30 Attention wall — loud trouble, quiet nominal

- **Decision:** `/walls/attention` renders `AttentionWall` — one linked tile per Drone in
  board order. **Troubled** when any of: `status === Fault`, `phase === emergency`,
  `drone.stale`, or an unacknowledged vitals alert. Troubled tiles use `text-tile-name`,
  show the worst pending alert (or a fault/emergency/stale fallback), and reuse Status
  wall border accents. **Nominal** tiles are `text-label text-ink-muted` with callsign
  only. Summary: `N need you`. Click → `/drone?id=`.
- **Reason:** Feature 6 of classroom walls — whole-class triage without Control's one-at-a-time
  attention bar.
- **Note:** Acknowledgement only gates alert kinds; fault/emergency/stale stay loud. Hub
  link deferred — do not edit `WallsHub` until hub sync.

## 2026-07-30 Battery wall critical threshold matches board usable charge

- **Decision:** A tile is **critical** when `batteryFraction` is below
  `DEFAULT_THRESHOLDS.usableBatteryFraction` (30%) — the same number vitals uses for
  `battery-low` and the ground station uses for Not Ready. No separate 20% wall threshold.
- **Reason:** Owner battery wall spec — one low-battery idea across board and walls.
- **Note:** Reuses `BatteryLevel` with `low={critical}`; summary line is “N critical”.

## 2026-07-30 Remedial queue on Control and Lesson

- **Decision:** **Remedial queue** lives in the browser Logbook (`remedialQueue`). When a
  lesson closes, Drones with **fault**-severity incidents are merged in once each. Control
  and `/lesson` render a minimal linked list; **Done** dismisses locally — no Command
  (ADR-0011).
- **Reason:** Classroom follow-up after incidents without another screen to maintain.
- **Note:** Attention-severity incidents stay off the queue unless a Teacher adds them later.

## 2026-07-30 Pre-flight checklist on `/lesson`

- **Decision:** Before start, `/lesson` shows a **Pre-flight check** section: summary
  `N ready · M not ready` and a list of not-ready Drones with Ready-wall labels and glyphs.
  Reuses `readyBoardLabel`, `readyBoardSummary`, and `READY_BOARD_PRESENTATION` from
  `ready-mapping.ts` — same mapping as `/walls/ready`, no second ruleset. `readyAtStart`
  on the lesson record uses that ready count. Zero ready shows calm copy near Start; Start
  stays enabled (E7).
- **Reason:** Feature 23 — Teachers see pre-flight readiness on the lesson workflow without
  opening the Ready wall.
- **Note:** Serviceable headline and “Standing in the way” stay on contract Status; the
  checklist is the vitals-based Ready-board view.

## 2026-07-30 Ready wall maps vitals to four pre-flight labels

- **Decision:** `/walls/ready` derives each tile from existing `DroneVitals` and Status
  only — no new Telemetry fields. Four labels: **Ready**, **Not ready**, **Offline**,
  **Fault**. Summary line: `N ready · M not ready`; Offline, Fault, and Not ready share
  the second count.
- **Mapping (first match wins):**

  | Condition | Label |
  | --- | --- |
  | `status === Offline`, `phase === no-contact`, or a `no-response` alert | Offline |
  | `status === Fault`, `phase === emergency`, or a `fault` / `emergency-stop` alert | Fault |
  | `status === Ready` and not airborne | Ready |
  | otherwise (Not Ready, Flying, airborne Ready, etc.) | Not ready |

- **Reason:** Owner ready-board plan — whole-class pre-flight glance without Commands.
- **Note:** Pure function in `ready-mapping.ts`; tiles link to `/drone?id=` like Status wall.

## 2026-07-30 Status wall tiles link to Drone detail

- **Decision:** `/walls/status` renders `StatusWall` — one linked tile per Drone in board
  order (`vitals`), read-only. Tile body: name, `StatusBadge`, charge %, height when
  `altitudeM` is on vitals, response age with “Last response …” when stale. Fault →
  `border-status-fault`; latched emergency → `border-2 border-status-fault`. Click →
  `/drone?id=`. Empty Fleet → “Waiting for the Fleet.”
- **Reason:** Feature 3 of classroom walls — whole-class status at a glance without Control.
- **Note:** Battery subroute stays on placeholder until its feature lands.

## 2026-07-30 Camera wall freeze on `/walls/cameras`

- **Decision:** **Freeze wall** snapshots vitals order and per-tile drone/camera labels on
  the camera wall only. Telemetry, ScenarioControls, and CameraSlide stay live — freeze is a
  display pause for comparing a class moment, not a sim or link stop. **Resume updates**
  drops the snapshot and re-renders from the current Fleet.
- **Reason:** Feature 18 — Teachers need a still frame of every camera label without
  stopping the Fleet behind the wall.
- **Note:** No backend or Telemetry flag; UI state in `CameraWall` only.

## 2026-07-30 Camera wall at `/walls/cameras`

- **Decision:** Cameras sub-wall shows one compact watch-only tile per Drone in board order
  (`CameraTile` + `WallGrid`). Tiles reuse stream-map / sim rules from CameraPane without
  YOLO, QR, or Start/Stop on the tile. Click opens existing `CameraSlide`. Offline or
  missing Telemetry uses board connection language (Status badge, “No Telemetry yet”).
- **Reason:** Feature 2 of classroom walls — whole-class camera glance without crowding Control.
- **Note:** Full CameraPane behaviour stays in the slide only.

## 2026-07-30 Classroom Walls live under `/walls` after Control in SiteNav

- **Decision:** Sixth workflow destination is **Walls** (`/walls`), placed immediately after
  Control. Sub-walls are `/walls/*`. Shared `WallsShell` + `WallGrid`; hub lists every
  wall as it lands. Nav active state matches `/walls` and any `/walls/…` child. Camera-like
  tiles open CameraSlide; status-like tiles go to `/drone?id=`. Instrument frame (same
  family as Control).
- **Reason:** Owner classroom-walls plan — whole-class glance without crowding Control.
- **Note:** Feature 1 is shell + placeholders only; feeds and vitals arrive per wall.

## 2026-07-30 Trainer Drones Model/Created stay optional behind Add details

- **Decision:** Settings Trainer Drones lists name + id with a quiet summary; Model and
  Created open only via **Add details** / **Edit details**. Empty values are valid; saving
  both blank removes the inventory row. Teaching never depends on model.
- **Reason:** Owner #80 — MODEL must not feel mandatory.
- **Note:** Still Logbook-only (ADR-0005); not Telemetry.

## 2026-07-30 Header logo navigates to Control

- **Decision:** The brand mark (logo asset / wordmark fallback) is a `<Link href="/control">`
  with accessible name “… go to Control”. The “Flight Deck” product title beside the mark
  is **not** in the link — it is identity, not the logo cluster the owner highlighted.
- **Reason:** Owner #96 — click logo → teaching surface (Control), not Fleet/home.
- **Note:** Min-height 2.75rem on `.brand-link` for touch without scaling the mark.

## 2026-07-30 Dual-write Logbook: local first, Vercel Blob copy with shared secret

- **Decision:** Every Logbook save writes **localStorage first**, then debounced PUT to
  `/api/logbook` when a sync secret is set. Cloud store is private **Vercel Blob** via a
  root Serverless Function (not Next route handlers). Auth: `LOGBOOK_SYNC_SECRET` /
  Settings secret. v1 **last-write-wins** on `revisedAt` / `updatedAt`. ADR-0015.
- **Reason:** Owner #93 / plan #83 — Vercel preview should show Students/Reports, offline
  classroom must keep working.
- **Note:** Needs `BLOB_READ_WRITE_TOKEN` + `LOGBOOK_SYNC_SECRET` on Vercel. Telemetry
  never carries Logbook rows.

## 2026-07-29 Reports primary action is Download PDF

- **Decision:** Reports’ primary control is **Download PDF** (`jspdf` in the browser) so the
  file has no browser Headers/footers (URL/clock). **Print** remains secondary. No
  “Printed at” stamp on the PDF (optional omit).
- **Reason:** Owner #92 — Teachers should not fight print-dialog chrome for a take-home copy.
- **Note:** Still client-side / static export compatible (ADR-0005). No server PDF route.

## 2026-07-29 Every classroom sim Drone has a camera

- **Decision:** `SimulatedTelemetrySource` sets `hasCamera: true` for every classroom
  registration (owner option B / #91). “No camera fitted” remains for Telemetry that omits
  `camera` (hardware / fixtures).
- **Reason:** Odd-index craft without cameras confused Teachers on the default sim Fleet.
- **Note:** Rangefinder and auto-land still vary by index for sensor-absence demos.

## 2026-07-29 Front/Side coincident piles stack labels vertically

- **Decision:** Elevation Scope labels for craft that share one spot (same Front column /
  height) use a rem **vertical stack** away from the mark (`nudgeYRem`), not only the
  horizontal stagger from #61. Grounded piles stay **above** the mark. The drawing box
  uses `overflow-hidden` so names never paint into the “Filled = flying” figcaption.
- **Reason:** Owner #86 — Front still showed double-printed names (e.g. Drone 8) when marks
  stacked; 1 rem horizontal was not enough for “Drone N”.
- **Note:** Top-down placement unchanged. Marks stay on the projected point (ADR-0014).

## 2026-07-29 Settings Classroom setup is Sim vs Radio (no hardware Commands)

- **Decision:** Settings **Classroom setup** lets the boss prefer **Simulator** (default,
  Commands work) or **Radio (MAVLink)** without editing `.env`. Preference lives in
  `ground-station/classroom-source.json` (gitignored); `GET`/`PUT` `/api/classroom-setup` on
  the ground station. Changing path requires restarting the ground-station window (launcher).
  `TELEMETRY_SOURCE` still overrides for developers. Radio remains **monitoring only** —
  no hardware `CommandableSource` (ADR-0011).
- **Reason:** Owner #76 / #88 — zero-coding Sim vs Radio copy + status after #75 launcher.
- **Note:** Vercel demonstration Fleet explains itself; Radio needs :4321 on the laptop.

## 2026-07-29 Classroom start is a Windows double-click launcher

- **Decision:** Boss/Teacher starts the ground station with **`Start TechTech Flight.bat`**
  at the repo root (install if needed, build `web/out` once if missing, start
  `ground-station` on **:4321**, open the board). No terminal typing for the normal path.
  Default telemetry remains the **Simulator**. **MAVLink radio** stays opt-in via
  `TELEMETRY_SOURCE=mavlink` and is **monitoring only** (ADR-0011) — not a zero-coding
  CommandableSource.
- **Reason:** Owner #75 — “cara nyalain localhost 4321” must not require npm/IDE.
- **Note:** Unreachable banner points at the `.bat`. Vercel preview needs no :4321
  (`NEXT_PUBLIC_DEMO_ONLY`).

## 2026-07-30 Detect wall tallies come from the browser detector, not Telemetry

- **Decision:** `/walls/detect` runs the same pluggable `ObjectDetector` as `CameraPane`, but
  only for **simulated streaming** cameras and only when `exposesCounts !== false`. Tiles
  show `detect().length`; idle cameras, hardware streams, and detectors that set
  `exposesCounts: false` show **"—"**. Counts never go on the Telemetry wire. Tiles link to
  `/drone?id=` (not CameraSlide). The wall is not listed on the Walls hub in this PR.
- **Reason:** Feature #14 — Teachers need a class-wide glance at YOLO tallies without opening
  every camera pane. Reusing the detector interface avoids a second model load path.
- **Note:** Hardware school streams could reuse the same loop when the map supplies pixels;
  until then those tiles stay unavailable. A future hub entry can land separately.

## 2026-07-29 In-browser detection is YOLOv8n ONNX (not napkin YOLOv12 yet)

- **Decision:** Default `ObjectDetector` loads **YOLOv8n** COCO via `onnxruntime-web`
  (`web/lib/yolo-onnx-detector.ts`). Weights at `/models/yolov8n.onnx` (gitignored; fetch
  script). Wasm from jsDelivr. Sim Start camera uses **getUserMedia** when allowed so the
  model has real pixels; CSS sim + demo detector if denied / jsdom / load failure. UI says
  **YOLOv8n**, never claims YOLOv12 until those weights are wired.
- **Reason:** Owner wants person/object detection on the board (#69). YOLOv8n is the
  practical classroom-sized ONNX; napkin “YOLOv12” waits on a publishable browser export.
- **Note:** Detections stay app-side — never on Telemetry. Swap path: drop a newer ONNX in
  `public/models/` and point `MODEL_URL`.

## 2026-07-29 Teacher find-path is this laptop’s Logbook screens

- **Decision:** Canonical Trainer data lives in this browser Logbook on the classroom
  laptop. Teachers find it on: **Students** (roster), **Settings** (trainer Drones),
  **Lesson** (prep / LessonDrone + LessonAssignment), **Reports** (finished Lesson records).
  Control/Fleet strips show **names** only. Vercel is preview-only — not the school DB.
- **Reason:** Owner #74 — “nanti Teachers nyari datanya gimana?” Answer is the board on
  this laptop, not a cloud admin.
- **Note:** No Export/Import restore here (ADR-0012). Pointer: issue #74.

## 2026-07-29 Camera opens from Control as a large centered dialog

- **Decision:** Control strips (and the scope selection dock) offer a **Camera** control that
  opens a **centered** Radix Dialog at `w-[min(42rem,92vw)]` hosting `CameraPane` (kept
  name `CameraSlide`). Fleet detail offers the same entry. Camera is not a Command — outside
  `CommandRow` (C9). Escape / Close dismisses. Stream map stays env/IT only — no Teacher
  Settings form (#66).
- **Reason:** Owner — teaching wants click → camera on Control (#59); right rail felt too
  small (#67).
- **Note:** No Telemetry URL. Sim Start/Stop remain ScenarioControls inside the pane.

## 2026-07-29 Lesson and Student IDs are assigned by the board

- **Decision:** `registerStudent(name)` → `S-0001…`; `createTrainerLesson(name)` → `L-0001…`.
  Create UIs expose name only; id is read-only after create. Drone attachment uses Fleet
  `droneId` (no Teacher-typed second key).
- **Reason:** Owner #58 — forcing Lesson/Student ID into a form is wrong.
- **Note:** `upsertStudent` / `upsertTrainerLesson` remain for tests and migration; legacy
  `stu-…` ids do not advance the serial counter.

## 2026-07-29 Scope names stay above marks; close ones nudge sideways

- **Decision:** Top-down Scope labels are always **above** the mark. When marks sit within
  ~14% of the window of each other, names get a horizontal rem stagger (cluster fan-out)
  instead of the old above/below alternation. Elevation keeps "toward the middle of the
  box" vertically, with the same horizontal stagger. Names are never omitted.
- **Reason:** Owner #61 — put the name above the drone, one-by-one; do not let them crash
  into each other. Alternating below contradicted "above" and still collided when a row
  closed up.
- **Note:** Logic in `scopeLabelPlacements`; Mark keeps the geometric point fixed and only
  offsets the label. Scope geometry / ADR-0014 window unchanged.

## 2026-07-29 Curriculum exercise copy is "Stay still in the air"

- **Decision:** Lesson planner exercise placeholder (and DESIGN § wireframe example) is
  **Stay still in the air**, not "Hover and hold" / "Hover practice".
- **Reason:** Owner Phase 2 — the old chip read like Control’s hover/hold Command.
  Curriculum task ≠ kind `hold`.
- **Note:** Do not rename the Control strip label or wire `hold`. Teachers may still type
  any exercise name; this is catalog/hint copy only.

## 2026-07-30 Pad wall ships read-only with an honest no-signal tile

- **Decision:** `/walls/pads` shows landing-pad QR **seen / not seen** per Drone using the
  same `landingTargetPresentation` copy as `CameraPane`. Scan gate matches the camera pane:
  simulated feed with `camera.streaming` only. Idle sim, no camera, and hardware (`scenarios
  === null`) show **—**; a streaming sim picture with no landing QR shows **Not seen**.
  Tiles link to `/drone?id=`; nothing writes Telemetry.
- **Reason:** Feature #13 — classroom glance at pad visibility without opening every camera.
  Hardware school streams still lack a frame scan on the wall (#50 follow-up).
- **Follow-up:** When mapped school `<video>` pixels are scannable on the wall, reuse
  `createUrlScanner` / stream-frame capture — same display-first rule, no Telemetry write.

## 2026-07-29 QR on camera is a landing target (display-first)

- **Decision:** Camera QR means **where to land**, not inventory. Decode via a small
  `QrDecoder` seam (jsQR). Payloads `ttf-land:<id>` or `ttf-land:<id>;east=<m>;north=<m>`
  map into the classroom frame; other codes stay quiet. Result is shown on `CameraPane`
  only — never written into Telemetry. Sim may offer an explicit **Place at landing pad
  (demo)** that calls `ScenarioControls.setPosition`; hardware (`scenarios === null`) never
  gets that control (C9). No auto pose write.
- **Reason:** Owner clarification on #51 — landing targeting. Silent Telemetry overwrite on
  a live airframe would be dangerous and out of scope.
- **Note:** Sim feed scans a static fixture (`/qr/landing-pad-a.png`) when school stream
  pixels are not the picture source. YOLO (#49) and Trainer DB (#48) untouched.

## 2026-07-29 School camera streams are an env/IT map + native `<video>`

- **Decision:** `droneId → http(s) URL` lives outside Telemetry
  (`techtechflight:camera-stream-map` localStorage), seeded by optional
  `NEXT_PUBLIC_CAMERA_STREAM_MAP` JSON when storage is absent. No Teacher Settings form.
  `CameraPane` plays a mapped URL with a native `<video controls playsInline muted
  autoPlay>` when hardware Telemetry says `streaming` and a map entry exists. No hls.js —
  progressive HTTP(S) broadly; Safari-native HLS (`.m3u8`) where the browser supports it.
  Simulated Fleets keep labeled demo pixels and ignore the map. URLs sanitized to absolute
  http(s) without credentials.
- **Reason:** REQUIREMENTS forbid stream URLs in Telemetry (#50). School IT can bake a seed
  at deploy. Native `<video>` avoids a decoder dependency until a classroom proves Chromium
  HLS is required.
- **Note:** Unmapped hardware streaming keeps the honest “needs a school stream map” notice.
  No fake Start on hardware. WebRTC / hls.js remain follow-ups if schools need them.

## 2026-07-29 Camera object detection is a pluggable app-side detector (demo first)

- **Decision:** `CameraPane` runs an `ObjectDetector` overlay only while the **simulated**
  feed is streaming. Interface lives in `web/lib/object-detection.ts`. This PR ships a
  **deterministic demo detector** (honest UI: "Demo detector (not a loaded model)") — not
  YOLOv12. Telemetry stays `camera?: { streaming }` only; no boxes / URL on the wire.
  Detector failure → empty overlay, pane stays up.
- **Reason:** Owner path is live feed → AI (YOLOv12), but the sim feed is CSS pixels and
  weights are not in the repo. Ship the overlay loop + swap point first (#49); do not claim
  a model family that is not loaded.
- **Follow-up:** Swap to a newer COCO ONNX (napkin “YOLOv12”) by dropping weights in
  `web/public/models/` and pointing `MODEL_URL` — the board path is already ONNX (#69).
  School-stream pixels can feed the same detector when the map supplies a `<video>`.
  Then rename `displayName` / drop `demo: true` on that path.
- **Alternatives considered:** Bundling a tiny real model now (no useful pixels on the CSS
  feed); putting detections on Telemetry (REQUIREMENTS forbid stream URL; same injection
  class for payload bloat).

## 2026-07-29 Trainer DB is 3NF-shaped Logbook relations, not the napkin

- **Decision:** Browser Logbook gains `roster` (Student: studentId + name), `trainerDrones`
  (droneId, model, createdDate), `trainerLessons`, `lessonDrones`, and `lessonAssignments`
  (lessonId + droneId → studentId). Live `students` stores studentId after write; `studentOf`
  always returns the name for strips (D5). LessonRecord.assignments still captures **names**
  at start (G6). Legacy name-only `roll` / `students` load unchanged; migrate forward on write
  only. Napkin example IDs and nested `drones[]` are illustration — Lesson↔Drone is a
  relation, not a forever belongs-To.
- **Reason:** Owner photo + #48 — classroom identity needs proper related records in the
  browser (ADR-0005); Telemetry must not carry trainer rows.
- **Note:** Minimal Students / Settings / Lesson-prep UI. Control layout untouched. YOLO,
  stream map, and QR stay other tickets.

## 2026-07-29 Control command Hold is labelled Hover

- **Decision:** Teacher-facing strip/dock label and C4 receipt word is **Hover**. Command
  kind remains `hold` on the wire.
- **Reason:** Owner notes (#52 / epic #47) — “stay hover immediately”.
- **Note:** Do not rename `CommandKind` without a separate contract pass.

## 2026-07-29 Lesson/Student Logbook is this browser; Vercel is a separate preview

- **Decision:** Teacher-facing copy on Lesson and Students states that records stay in
  **this browser on this laptop**. Localhost (classroom) is the working store. Vercel is
  preview-only — a different origin with its own empty `localStorage` Logbook. No server
  Postgres; ADR-0005 stands.
- **Reason:** Owner confusion (#68) — boss uses localhost for real lessons; Vercel is so
  they can preview online. Data must not be assumed to follow between the two.
- **Note:** Export/Import stay withdrawn. Cloud sync is out of scope.
## 2026-07-29 Per-Drone camera pane is Telemetry boolean + sim pixels

- **Decision:** Drone detail mounts `CameraPane`. Telemetry stays `camera?: { streaming }`.
  Simulated picture is app-owned canvas; Start/Stop are `ScenarioControls`, never Commands
  (C9). Hardware (`scenarios === null`) shows idle/streaming copy only.
- **Reason:** Owner Phase 1 — open one Drone and see its camera; YOLO/QR/DB later. REQUIREMENTS
  forbid a stream URL in Telemetry.
- **Note:** School stream map landed in #50 (env/IT + native `<video>`, no Settings form).
  Overlay detection is #49 — still not on the Telemetry wire. Even-index classroom craft
  already have `hasCamera` in the simulator.

## 2026-07-28 Stop is a single press (owner overrides C8 hold)

- **Decision:** Emergency **Stop** is an ordinary click — no `GuardedButton` hold, no
  "Press again to stop". Release stop behaviour unchanged.
- **Reason:** Owner — hold/confirm felt awkward; classroom needs the cut immediately.
- **Note:** Supersedes DESIGN §4.5 press-and-hold reading of C8 for this product. Accidental
  strip presses remain a residual risk; strip order + fault styling still separate Stop.

## 2026-07-28 Full-screen Scope docks Commands for the selected mark

- **Decision:** Pass a `selectedPanel` into `Scope`; when expanded and a mark is selected,
  show Land / Hold / Stop (same `CommandRow` as the strip) in a bottom dock. Reports omits
  the panel.
- **Reason:** Owner feedback — selecting on the graph works, but fullscreen covers Every
  Drone so Commands were unreachable.
- **Note:** Overlay still temporary (ADR-0014 / #31); Clear or re-tap mark deselects.

## 2026-07-28 Emergency stop has no "Stop — done" receipt on the strip

- **Decision:** When Telemetry shows the emergency latch, drop the command-tracker line for
  that Stop (forget on satisfied; never render done/held receipt). Keep Land/Hold receipts.
- **Reason:** Owner — "Stop — done" stuck beside Release stop and read as a second broken
  control. Latch + alert already say the cut held.
- **Note:** Brief Stop — sent / waiting before latch may still flash; that is C4, not the
  stuck done line.

## 2026-07-28 Reports print forces paper tokens; browser chrome is off-dialog

- **Decision:** `@media print` resets light colour tokens on `:root` and `[data-theme='dark']`,
  breaks only on `.lesson-report`, and the Print control stamps printed-at + sets the
  document title. Browser Headers and footers (URL, clock) stay a Teacher toggle in the
  print dialog — not something CSS can own.
- **Reason:** Dark theme left semantic ink light-on-white (blank preview); blanket
  `break-inside: avoid` on `section`/`li` emptied page 1. G3 still wants a usable A4 sheet.
- **Note:** History stays `print-hide`; Lessons + recurring defects print.

## 2026-07-28 Strip freespace is the response column, not charge

- **Decision:** Control Every Drone list uses `grid-cols-[auto_auto_auto_auto_1fr]` — Name,
  Student, height, charge are `auto`; response takes `1fr` and is `text-right`. Stop stays
  separated from Land/Hold via `ml-auto`.
- **Reason:** `1fr` on charge left-aligned text in a stretched column → cavern before
  Response (#41 / owner screenshot).
- **Note:** Five-cell order and boardOrder (#27) unchanged. Plan:
  `docs/plans/2026-07-28-flight-strip-tighten.md`.

## 2026-07-28 Training scenarios are Settings runners, not strip Commands

- **Decision:** Named T-scenarios on `ScenarioControls` (+ `placeNear` / `setAltitude` /
  `setPosition` / e-stop / `link` / `resetClassroom`), UI in Settings
  `TrainingScenariosPanel`. Atomic Demonstration panel stays for ad-hoc triggers.
- **Reason:** Owner bar — kena semua Teacher surfaces. C9 forbids scenario buttons on strips.
- **Note:** T7b available with Front on main (#28). T9/T10 checklist. MAVLink out of scope for #30.

## 2026-07-28 Scope fullscreen is an overlay, not browser Fullscreen API

- **Decision:** Fixed inset overlay on `Scope` for Full screen / Exit + Escape. Do not call
  `requestFullscreen`. Cap (ADR-0014) restored on exit; not persisted.
- **Reason:** Classroom projectors and tablets are flaky with the browser Fullscreen API;
  issue #31 preferred overlay. Opt-in only — strips stay the working surface by default.
- **Note:** Independent of Front (#28); toggle list is whatever Scope already ships.

## 2026-07-28 Front elevation reuses Side's rules on the other floor axis

- **Decision:** Add Scope view `front` — north × altitude — with ADR-0017. Factor
  `isElevation()` for shared ceiling / ground / heightless / aspect behaviour.
- **Reason:** Side stacks Drones that share an easting; Front separates them. Owner asked
  for the missing elevation without a second box (ADR-0014).
- **Note:** ADR-0016 "any third view" superseded in writing. Conflict lines still top-down
  only.

## 2026-07-28 Emergency stop CTA is just Stop

- **Decision:** Primary strip label is **Stop**, not "Stop immediately". Confirm / hold copy
  unchanged; latched state still **Release stop**.
- **Reason:** Owner — "immediately" is noise on the button.
- **Note:** Follows #32's Release-stop behaviour; only the idle label tightens (#37).

## 2026-07-28 Release stop clears the latch; it is not a Scenario

- **Decision:** After `emergency` phase, replace **Stop** with **Release stop** calling
  `ScenarioControls.resetEmergencyStop` on a simulated Fleet. On hardware
  (`scenarios === null`), keep the control present but disabled with a reason in words.
- **Reason:** A stale Stop CTA after the motors are cut reads as failure. The physical
  counterpart is walking over to release the cut-out — not inventing a fault (C9).
- **Note:** Do not add a `CommandKind` for release (ADR-0011 / no hardware command path).
  Confirm-on-first-press for armed Stop stays.

## 2026-07-28 Control strips follow boardOrder; Attention carries urgency

- **Decision:** Drop `compareStrips` from Control's Every Drone list. Strips use the same
  `FleetState.drones` / `boardOrder` order as Fleet tiles. Keep `alertQueue` worst-first on
  the Attention bar.
- **Reason:** Owner reported the live list as dizzying — rows swapped on every alert tick.
  Numbers updating is fine; positions moving is not. Aligns with deliberate position #1 and
  DESIGN.md §1.1; overrides the old wireframe "worst first" line for strips.
- **Note:** `compareStrips` deleted — it had no other callers. Do not restore worst-first
  strip sort without an ADR arguing against position #1.

## 2026-07-28 Front uses east; Side uses north; fullscreen is an icon

- **Decision:** Swap elevation floor axes — Front horizontal = east, Side = north — so the
  default classroom row spreads on Front. Fullscreen control is icon-only with aria-labels
  (owner override of DESIGN §1.2 for that one control). Expanded overlay centres the
  composition in the viewport.
- **Reason:** Owner defects #38 — text fullscreen label, letterbox hugging the top, Front
  stacking every parked Drone in one place (`northM: 0`).
- **Note:** Do not fake positions in the UI; the mapping changed. Training T7/T7b layouts
  follow the new axes.

## 2026-07-28 Unknown SITL battery is an estimate, not silence

- **Decision:** If a craft is heartbeating but `batteryRemaining` / voltage are absent or
  sentinel (`-1` / `0`), emit Telemetry with `batteryFraction: 1` and `batteryIsEstimate:
  true` rather than withholding the observation.
- **Reason:** Older ArduPilot SITL (e.g. dronekit ArduCopter 3.3) never fills charge; silence
  made Drone 1 read Offline while UDP was live. Contact without a measured cell is still
  contact.
- **Note:** Match decoded messages by registry `clazz`, not `instanceof` — SITL traffic and
  recorded fixtures both need it. Still no `CommandableSource` (ADR-0011).

## 2026-07-28 MAVLink lives in `fleet-adapters/`, opted in by env

- **Decision:** Put the MAVLink `TelemetrySource` in a new `fleet-adapters/` workspace, and
  select it from `ground-station/src/main.ts` only when `TELEMETRY_SOURCE=mavlink`. The
  simulator remains the default. Host/port override via `MAVLINK_HOST` / `MAVLINK_PORT`.
- **Reason:** ADR-0013 forbids `node:dgram` in `fleet-core`. The issue (#15) already named
  the workspace. An env switch keeps every existing demo and the Vercel `DEMO_ONLY` path on
  the simulator without a second binary.
- **Alternatives considered:** Always-on dual source (rejected: two Fleets on one board);
  replace the simulator (rejected: ADR-0001 — the simulator is permanent); put the adapter
  inside `ground-station/` (rejected: the plan and the issue both say `fleet-adapters/`).
- **Note:** System id maps to `CLASSROOM_FLEET` by `boardOrder` so SITL's usual sysid `1`
  lands on Drone 1. Commands stay unavailable by omission of `CommandableSource`.

## 2026-07-28 Living docs follow the merged stack, not the pre-merge world

- **Decision:** Align CLAUDE.md / PLAYBOOK / logbook header / ADR-0014 / DESIGN.md §4.4 with
  what PR #22 shipped (#23). Do not restore the `Grid:` caption or Settings export.
- **Reason:** Agents and reviewers were "fixing" correct code against stale claims.
- **Note:** Showcase register and product-string residual stay on #13 / owner taste — not here.

## 2026-07-28 Register residual is a closed list, not a second sweep

- **Decision:** Finish #13 from the Planner's residual table only — Lesson, Maintenance,
  logbook meanings, Drone cluster, two warm leftovers. Do not re-inventory the whole board.
- **Reason:** Most of W5 already shipped in #22; a second full sweep would re-touch settled
  copy and collide with taste calls (showcase) that Planner parked elsewhere (#23 / owner).
- **Note:** The first miss was a harvest that opened `/drone` without `?id=`. Acceptance is
  grep for the listed "before" strings, not another DOM crawl.

## 2026-07-28 `ScopeWindow` is the projection; `WindowChoice` is the decision

- **Decision:** Rename `RoomExtent` → `ScopeWindow` and `roomExtent()` → `scopeWindow()`, and
  rename the small held record that was already called `ScopeWindow` to `WindowChoice`, on
  the member `.choice`.
- **Reason:** The review asked for `scopeWindow` and noted the name was already taken by the
  held record, so something had to move. The projection object is what every caller touches
  and what the ADR is about, so it gets the honest name; the held record is a decision — how
  big, and where the middle is — and `WindowChoice` says that.
- **Alternatives considered:** `ScopeProjection` for the big one, leaving `ScopeWindow` on
  the small one (rejected: the review asked for `scopeWindow` specifically, and a projection
  is what the object *does* rather than what it *is*); `HeldWindow` for the small one
  (rejected: it is only "held" from the component's point of view — `chooseWindow` returns
  one before anything holds it).
- **Note:** No user-facing string changed except the `aria-label`, which is finding 4 of the
  same review and landed in its own commit.

## 2026-07-28 The two ladder walks in `Scope.tsx` stay separate

- **Decision:** Do not fold `chooseWindow`'s rung walk and `gridStepM`'s step walk into one
  "first that fits, else the fallback" helper, though the review noted the shape twice.
- **Reason:** They stopped being the same shape once the cell floor landed. `chooseWindow`
  skips rungs below the held side, returns a derived `WindowChoice` rather than the rung, and
  falls back to the **last** rung; `gridStepM` skips nothing, returns the step, and falls back
  to the **first**. A shared helper would need a skip predicate, a mapper and a fallback
  selector — three parameters to save two lines each — and it would hide that the two
  fallbacks point in opposite directions, which is the one interesting thing about them.
- **Note:** The cells-across arithmetic *was* folded, into the exported `cellsAcross()`, which
  is what the ladder test now asserts on. `gridStepM` cannot use it without recursing, and
  `gridLines` counts rules over an arbitrary span rather than cells across the window, so
  neither is the same calculation.

## 2026-07-27 The scope's window is reconsidered only when a Drone leaves it

- **Decision:** Keep the held window — size *and* centre — untouched for as long as it
  contains every placed Drone. Recompute only when one has left. When recomputing, centre on
  the midpoint of the Fleet's extent and snap that centre to a multiple of the grid cell.
- **Reason:** "Centred on the Fleet" and "the grid does not move" pull against each other,
  because the Fleet's midpoint moves continuously. Snapping alone would still pan the picture
  by a cell every time the midpoint crossed a half-cell boundary — occasional rather than
  constant, but a whole-Fleet jump is more startling than a slow drift, not less. Gating on
  containment removes it entirely: the window changes when a Drone leaves the frame, which is
  a reason the Teacher can see.
- **Alternatives considered:** Snapping without the containment gate (the pan above);
  centring on the mean position rather than the extent's midpoint (an outlier drags the
  centre less, but the picture then no longer frames the outermost Drones, which is what the
  window is for); re-centring on a timer or with an animation (motion on a board whose
  complaint was motion).
- **Note:** Each rung is tested *after* its own snap rather than picked from the raw reach,
  because snapping can shift the centre by half a cell and push a Drone out of a rung that
  fitted before the snap.

## 2026-07-27 The scope's window is held in a ref, and clamping lives in `project`

- **Decision:** Hold the chosen window side in a `useRef` inside `Scope`, written during
  render, rather than in `useState` adjusted during render or in an effect. And do the
  edge-clamping inside `roomExtent`'s `project()` rather than at each call site.
- **Reason:** The ref write is idempotent — the same props give the same side whether render
  runs once or twice — so the usual objection to writing a ref during render does not apply
  here, and `useState` would have cost a second render pass for a value no one re-renders on.
  Clamping in `project()` means `projectOf`, `percentOf` and the conflict lines all inherit
  it for free; clamping at the call sites would have been four places to forget, and the
  conflict line is the one that would have been forgotten, because it is the only one that
  does not go through a Drone.
- **Alternatives considered:** Recomputing the window freely each render (this is the
  original bug in miniature — a Drone on a rung boundary flips it every tick); lifting the
  held side to `ControlScreen` as state (it is display bookkeeping, not screen state, and
  `HistoryScreen` would have had to carry it too for no reason); clamping in `percentOf`
  only, which leaves an unclamped conflict line drawn off the frame.
- **Note:** The ref means the window resets when the scope unmounts. That is deliberate — a
  Teacher who navigates away and back gets the smallest window that fits, and "never shrinks"
  is a statement about a continuous look at the board, not about the session.

## 2026-07-27 The tests are pinned, and the demonstration stays unpredictable

- **Decision:** Make the demonstration Fleet deterministic **in tests only**, by giving
  `FleetProvider` a `demonstration` prop that forwards `random` and `spontaneous` to
  `LocalFleetLink`. The product passes nothing and keeps `Math.random` with spontaneous
  events on.
- **Reason:** The flakiness came from tests asserting against weather, not from the weather
  being wrong. Spontaneity is a feature of the demonstration — it is the same reason the
  ground station binds scenario keys to its own stdin, so a demonstration never has to wait
  for something to happen. Removing it to make tests pass would have fixed the suite by
  damaging the product.
- **Alternatives considered:** Defaulting `spontaneous` to false and opting the demo *in*
  (quiet by default is the wrong default for the one build anyone looks at); sniffing
  `NODE_ENV` inside `FleetProvider` (production code that behaves differently under test is
  how a suite stops describing the product); mocking the simulator per test (six files each
  inventing their own Fleet, and no longer testing the real derivation path that
  `LocalFleetLink` exists to provide).
- **Note:** The pinned values live in one place, `web/test-support/fleet.ts`, and match
  what `local-fleet-link.test.ts` already used — so the suite has one answer to "what does
  a Drone do when nothing asks it to". It must stay module-level: `FleetProvider` rebuilds
  its link when those options change, so a fresh object per render would restart the Fleet
  on every render.

## 2026-07-24 The commit and branch convention moves to conventional commits

- **Decision:** New work uses `feat:` / `fix:` / `docs:` / `chore:` prefixes, on a branch,
  through a PR. Earlier history keeps its prose subjects.
- **Reason:** Asked for explicitly. `BROWNFIELD.md` prescribes it and the repo previously
  did the opposite — prose subjects committed straight to `main`, no merge commits.
- **Alternatives considered:** Keeping the repo's prose style, which is what its own
  "follow existing patterns" rule would normally imply, and which reads better. Overruled
  deliberately.
- **Consequence:** `git log` has a visible seam at this date. That is the cost.

## 2026-07-24 The page frame is two named frames, not one

- **Decision:** Instrument screens (Fleet, Control) use a wide frame; reading and form
  screens (Lesson, Reports, Students, Settings) use a narrow one. Both are named and
  enforced by a test.
- **Reason:** `docs/DESIGN.md` §3.4 says "one column, centred, with a maximum width" —
  singular. But the Fleet board is the one screen meant to be read across a room, and
  forcing it to the reading width costs it a column at 1440px, making tiles smaller on
  exactly the surface where size is the point. Two named frames still satisfies one
  column, centred, with a stated maximum.
- **Alternatives considered:** One literal frame (costs the board a column); one wide
  frame everywhere (stretches Settings and Students across an unreadable measure); leaving
  the five ad-hoc widths alone.
- **Note:** What was there before was not a considered third option. `FleetBoard`'s
  container predates `docs/DESIGN.md` by eight hours and had no maximum at all; the four
  other widths were each chosen locally afterwards. This replaces sediment, not a design.

## 2026-07-24 The simulation label spans the full sticky layer

- **Decision:** When fixing the flex axis, the label spans the full width of the sticky
  layer rather than matching the floating bar's 1240px maximum.
- **Reason:** `design.md` §9 rejects a badge for this label specifically — "the way a
  persistent indicator fails is that the eye stops seeing it". A full-width strip is a
  statement about the screen; a strip that tracked the bar's width would read as another
  piece of chrome.
- **Alternatives considered:** Matching the bar's width when floating, which reads as one
  object but adds a second animated maximum for no gain in legibility.

## 2026-07-24 npm audit's three highs are left as they are

- **Decision:** Bump `next` 16.2.10 → 16.2.11 and remove three unused dependencies, but do
  **not** run `npm audit fix --force`. The three high advisories it reports are left in place.
- **Reason:** All three are transitive build-time dependencies of Next — `postcss` (CSS
  stringify XSS, sourceMappingURL file read) and `sharp`/libvips (image optimization). This
  build is `output: 'export'` with `images: { unoptimized: true }`: postcss runs only during
  the build and emits static CSS, and sharp is never invoked at all. Neither ships in the
  artifact a School runs. They were present on `main` before this change; the bump did not
  introduce them.
- **Alternatives considered:** `npm audit fix --force`, which resolves to **`next@9.3.3`** —
  a six-major-version downgrade and a rewrite of the whole framework, to patch code that does
  not run. That is precisely the "breaking change / new architecture" the workflow says to
  stop and flag rather than take.
- **Revisit when:** Next ships a release that moves off the flagged postcss/sharp ranges, or
  the board ever stops being a static export. Until then this is noise, not exposure.
