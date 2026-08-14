# Changelog

Newest first. One line per change that a Teacher, or the next person reading this code,
would notice.

## Unreleased

### Fixed

- **Skip on the warm-up lasted until the Teacher looked away.** The full-screen minute over
  the start of a Lesson came back on every visit to step 1 inside that minute, because Skip was
  the state of the panel that draws it rather than a fact about the morning. A rail is made to
  be walked up and down. Skipped once is skipped for that Lesson now; tomorrow's class still
  gets its warm-up.
- **Leave, on the second tab of the Teacher's own laptop, changed the code the whole class was
  using.** One laptop can hold `/mission` and `/student` at once, which is the point of roles
  being per tab, and both tabs share one classroom. Leaving deleted the whole document, so the
  board found nothing there and minted a new code: the four letters the Teacher had read out
  stopped working on every iPad in the room, from a button two tabs away. The board now says
  which room is its own, and a tablet on that device forgets its seat rather than the room. An
  iPad, which has no board of its own, still leaves exactly as it did.
- **A child tapped a Drone and the screen bounced back to the Drone picker, and the same bug
  kept them off the Teacher's board.** One classroom document was pushed and pulled whole by
  every device in the room, so whoever wrote last erased everything the others had written
  since: the tablet's tap was overwritten by the board's copy of the seats a second later, and
  the board never saw the child because a tablet's document was hardly ever the later one. Two
  faces, one cause. Copies are merged a seat at a time now, settled by a count of writes rather
  than by a clock, because a board and a tablet do not share a clock. A Teacher granting a
  takeoff and a child taking a Drone in the same second both survive.
- **A tablet whose clock ran behind the board's could not write to the classroom store at
  all.** The store answers 409 to a document older than the one it holds, and that answer was
  the end of it: a child could join, take a Drone and ask to take off while appearing on no
  screen but their own, with nothing anywhere saying so. Checked against the live store, where
  a board one minute fast silenced a correct tablet permanently. A 409 is treated as news
  now — pull, merge, send once more.
- **A Teacher saving anything could delete a child who had just joined.** Every writer starts
  from the session it was handed, and a screen drawn before the child at the back typed their
  name still held a seat list without them. A write keeps seats it has never heard of; Free
  stays the one way a row leaves the board.
- **A new class inherited the finished class's code, and every tablet read a room that was
  over.** A board with no Logbook Lesson started carries `lessonId: null`, and `openClassroom`
  decided whether to keep the old code by comparing that id with the last one: `null === null`
  is true, so the run after a Lesson ended carried on the dead session, `endedAt` and all. The
  Teacher read four letters out and every device that typed them was told the classroom had
  finished. A classroom that has ended never carries on now, whatever its Lesson id says; a
  reload mid-lesson still keeps the code, which is why the ids are still read.
- **Every No-fly Zone a Teacher drew landed outside the picture.** The rail read "2 no-fly
  zones" while the Scope's key named no hatch, and both were telling the truth: the drawing
  surface was a fixed twenty metres square running north-east from the origin, and the Scope
  draws a window around where the Drones are — about eight metres by six, astride the origin,
  half of it in negative metres the grid could not express. The surface now draws the Scope's
  own window, or the classroom boundary before there is one, and holds a typed corner inside
  it. Where a zone still cannot be seen, both screens say so.
- **The rail counted zones nobody had finished.** A shape with two corners is a zone a Teacher
  started; `breachesAt` ignores it and the Scope draws no hatch for it. Only zones that
  enclose something are counted now.
- **Putting a team on a craft needed a page reload.** The Lesson screen read the team list
  once per render, so "Put these craft on the Mission" stayed away until something else
  re-rendered the page. It subscribes now, the way the Logbook is subscribed to.
- **The Student's name list was this device's history, not the room.** It offered every name
  ever typed on that tablet — one showed five, from five different lessons, and it only ever
  grew. It is this classroom now: a name somebody has stays on screen, is not pressable, and
  says which Drone they took, which is the rule the Drone picker already teaches.

- **A tablet that lost the board had no way out of it.** The exit was gated on the Drone
  being down, and "airborne" was the last thing the board said rather than something known to
  be true now: an iPad that heard it seventeen hours ago still believed it, so a child sat on
  *Land and wait* with nothing to press, forever. Silence is not flight. The way out appears
  when the Drone is down **or** when the board has gone quiet, on the heartbeat that was
  already there. A child genuinely flying still gets none, which is the point of the rule.
- **The Scope's key named a shape that was not on the picture.** "Hatched = No-fly Zone" read
  under a picture with no hatching in it, at 390 on step 7, because the window is fixed
  (ADR-0014) and the zone sat outside it. The key is now computed from what is drawn in the
  view that is showing rather than from what exists. Side and Front flatten one axis, so a
  zone off to the east still bands on Side and is still named there.

- **The demonstration's one Recall flew 8.5 m from where the dotted line said.** `takeOff`
  stamped home from the current position unconditionally and `flyRoute` calls it with no
  airborne guard, so the scripted incident moved the Drone's home to wherever the drift had
  taken it. The Scope was right and the aircraft was wrong, at the one moment the ninety
  seconds exists to prove Recall trustworthy. Home and the hover height are gated on being on
  the ground, which is what made them true.
- **The Student screen scrolled 856 pixels sideways on a phone.** `.sr-only` is
  `position: absolute` and the rail's scrolling list was `position: static`, so the
  screen-reader marks escaped the clip: `scrollWidth` was 1246 against a 390 viewport. One
  word, `relative`. `web/scroll-containers.test.ts` refuses a scroller with no positioning
  context, because jsdom can see neither half of this.
- **The type-scale test now catches what it claims.** It read `.tsx` only and could not see an
  arbitrary value at all, so thirteen sizes typed into the markup had accumulated while two
  were reported in each of two waves. The showcase gains its own `--sc-text-*` scale.

### Added

- **Change classroom, beside Leave.** Leaving and moving rooms are different intentions and
  only the destructive one was on offer: the sole route to the code screen forgot the name as
  well as the room, so a Teacher moving a tablet to the other class landed on *What is your
  name?* with nothing to do but type it again. Change keeps whose tablet it is and re-seats
  them the moment the new code lands.
- **Alerts live on step 10 alone (ADR-0032).** The whole panel — cards, buttons and "2 more in
  the queue" — repeated under every in-the-air step, so step 6 answered step 10's question as
  well as its own. Land all, Hover all and Stop all stay on every step, unchanged. The cost is
  written into the ADR: a Teacher on step 8 will not learn about a No-fly breach until they
  visit step 10.
- **Three colours, three meanings (ADR-0033).** The classroom boundary is blue dashed, a
  No-fly Zone is red hatched, and amber means something needs you. The boundary was drawn in
  the Alert amber and is the only coloured thing on the picture that never changes, which
  trained a Teacher to skim the colour Alerts arrive in. The Mission area editor draws the
  same blue box, so a Teacher places a zone against the room.

- **The address decides the role for that tab.** `/mission` is the Teacher and `/student` is
  the Student, for as long as that tab is open, so a Teacher's laptop can hold both at once
  and a demonstration does not have to keep switching one board between two people. The
  remembered role now routes only the bare address. The PIN gate has not moved: a child typing
  `/mission` is still stopped at it, because the lock was never the hidden button.
- **A Student may tap a step they have done and re-read it (ADR-0031).** A child who cannot
  re-read the rules asks the Teacher instead, mid-lesson, holding a drone. Later steps stay
  untappable. Two things hold it up: *Back to now* in the rail, and the screen pulling itself
  back the instant the lesson moves, so a takeoff clearance cannot arrive behind something a
  child chose to look at.
- **Who else is in the room, on both sides.** The Student sees their own team named and spaced
  from everyone else, who are listed smaller underneath. The Teacher's board keeps the full
  list: every child, the Drone they took, and the time they joined, plus a line for anybody
  who joined and has not taken a craft, who used to be in the room and on no row.

- **A tablet can leave a classroom, and a new Lesson mints a new code.** The owner found an
  iPhone sitting in a lesson called "bleble" that had finished weeks earlier: there was no way
  to leave, the code never changed, and nothing had ever said the lesson was over. All three
  now do. A Lesson ending mid-flight reads "The lesson has ended. Land now." and hands the way
  out over once Telemetry sees the Drone down.
- **Roles are secrets.** A Student types the classroom code, which is public and read out
  loud; a Teacher types a four digit PIN, private and set once. The door asks for the
  matching one. **Switch role has left the Student chrome entirely** — it was two taps from a
  child to Land and Stop — and asks for the PIN on the Teacher side. Settings says that iPad
  Guided Access is the stronger lock and how to turn it on.
- **A Student joins by tapping the Drone number in their hands.** Their name typed once and
  remembered on that device, then the number painted on the aircraft. A Drone somebody has is
  greyed out and untappable, and taking it is refused underneath. A Student can reclaim their
  own Drone from a device that died. The name stays large for the whole lesson, which is the
  fix for a mistap rather than a PIN.
- **A Teacher can seat a Student by hand, and free a Drone in one tap.** A broken iPad must
  not stop a child flying. Step 3 fills itself in as tablets join, and the Teacher's change
  always wins.
- **A heartbeat both ways.** The board says "Drone 3, not heard from for 40 seconds"; the
  tablet says it has lost the board rather than holding the last numbers on screen as though
  they were live. A child the Teacher seated by hand is never reported: they have no tablet
  on purpose.
- **After a grant, the simulated Drone flies itself** — climbs, flies the Mission's points in
  order, holds station at the last one, and flies home when the Teacher approves the task. In
  a demo there is no child, so the aircraft plays the child's part.
- **A two minute demonstration Mission with one scripted incident.** One press in Settings
  sets up the airspace and the task; thirty-five seconds in, one airborne Drone drifts toward
  the No-fly Zone and the Teacher recalls it. Real minutes, not a fast clock.
- **A Student's tablet changes after takeoff.** Points tick off by themselves from the
  Drone's own position, in any order, and nobody presses anything. When every point is
  reached the Teacher's board offers **Approve**, and it cannot appear before that. The way
  down follows the approval and the score follows the Drone being down. Twelve screens
  existed and five could be reached; all twelve are reachable now.
- **The Student tablet carries a look-only rail** of all twelve steps, marking where they
  are. Not one row is pressable (ADR-0028), which is what keeps the two-press rule true.
- **The four situations the poster names are answered**: low battery, obstacle ahead, new
  target, missed checkpoint. Each takes the whole screen and says what to do.
- **A Teacher can hold a takeoff, and every Drone has a starting point.** Home is wherever a
  Drone was standing when it left the ground: automatic, one per Drone, taken from
  Telemetry. Recall has promised the launch point since it shipped and nothing recorded one.
- **`--text-caption` exists.** Twenty component files used the class and no rule stood behind
  it. Was issue #649.

### Changed

- **The air is one step at a time, over a bar that does not move (ADR-0030).** Steps 6 to 10
  each show their own panel in the rail's order. The page used to be nine sections on one
  scroller running 10, 6, 9, 7, so tapping step 7 scrolled past 9 and 10 to reach it. The
  Attention bar and Land all / Hover all / Stop all are above every step and never scroll
  away, which is how ADR-0026's safety argument is answered rather than dropped. The cost is
  in the ADR: per-Drone commands are one rail tap away rather than zero.
- **Nothing is airborne that a Teacher did not clear.** The board opened with Drones already
  in the air: the simulator's `#wander` lifted them on a dice roll every tick, so the opening
  shot contradicted the product's own safety story before a Teacher had touched it. Lost
  links and faults stay; an aircraft deciding to fly is not the world, it is a child.
- **No Student, no takeoff.** The clearance queue read the Logbook assignment, so a child who
  joined and picked up Drone 3 was invisible to it and a Drone nobody had touched was
  eligible. The number in the air now equals the devices that joined and took one, plus
  whoever the Teacher seated by hand.
- **No-fly Zones draw on Side and Front, floor to ceiling (ADR-0029).** A zone has no ceiling
  to invent, and `breachesAt` has always ignored altitude. A Teacher watching Side saw a Drone
  cross a zone with nothing on the picture to say so. The Control board's Scope was never
  passed the zones at all, while its caption said "Scope shows them live".
- **The Scope draws the starting point**, and a dotted line from an airborne Drone to it, so a
  Teacher can see where Recall goes before pressing it. `home-point.ts` had tracked it since
  it was written and only ever printed it as words.
- **The Lesson screen says when a zone is drawn outside the picture the Scope draws.** Real,
  raising Alerts, and on no view.
- **Three rules on the Student screen, never twenty.** It printed the Teacher's eighteen-line
  briefing checklist, written for an adult reading a safety brief out loud. Each of the three
  is declared beside the warning that follows it, so they cannot drift apart.
- **The header.** Go to moves left beside the logo, Mission run leads its list, the panel is
  a row of the bar rather than a dropdown over the status bar, and on a tablet or phone it is
  a full sheet the room controls fold into. Nothing wraps: Settings is a control with a width
  of its own rather than loose grey text that fell onto a second row.
- **No cap on the Drone count.** `MAX_CLASSROOM_FLEET_SIZE` was twenty with nothing behind
  it. Settings takes any number for the simulated set and says what the board can show at
  that size; past two dozen the strip list says so and tightens.
- **The door.** One centred question, two identical boxes, one word in each, no grey
  subtitle, equal space above and below. The type shrinks on a phone rather than the wording
  changing.
- **Approve says what it does**, and step 11 says Recall is for a Drone still up at the end
  of the period. Ending a normal flight with Recall is ending a lesson with the fire alarm.
- **The Mission Zone is gone (ADR-0027).** Teachers draw No-fly Zones only, any number, and
  none is a normal answer. The class flies inside a net cage, so a second boundary drawn in
  software told a Teacher something they could already see, and a slightly small one reported
  a breach for a Drone that was safely inside the netting.
- **The Lesson name is asked once.** It was asked twice on one screen, with nothing saying
  which of the two would name the Lesson.
- **The set-up stays reachable while a Lesson runs.** Pressing Start used to take the plan
  panel off the screen with it.
- **Step 11 refuses instead of disappearing.** It closed while anything was airborne, so a
  Teacher got a line of text and nothing to press, with the Recall that answered it four
  steps back. It now lists every Mission Drone and offers Recall and Land against the ones
  still up.
- **The board says Drone, never craft.** CONTEXT.md is the authority, and thirty-five places
  a Teacher or a Student reads had drifted.
- **Grant takeoff**, not Grant clearance, as the prototype has it.
- **Reports is back in the Go to button**, and no longer behind a step that can be locked.

### Fixed

- **`/reports` lands on the report screen.** It forwarded to the twelfth step, which is
  locked until a Mission is sealed, so on a day with nothing sealed there was no route at all
  to the weekly digest, the export, the remedial queue or a past Lesson.
- **The Warm-up never covers a Mission already flying.** It was gated on a browser tab rather
  than on the Lesson, so a second tab replayed a sixty second overlay over a class in the air.
- **The rail no longer puts a tick beside "No teams yet".**
- **Step 8 names the Drone a Teacher actually picked.** It was hardcoded absent.
- **The keyboard reaches the rail on the live steps.** The board's own scroll moved the
  sequential focus start into the middle of the strips.
- **The Fleet headcount check is gone** (#624), and the flaky Camera Escape test no longer
  races a clock.


### Changed

- **The Mission run is one page with the twelve-step rail on it.** `/mission` carries all
  twelve: set-up one block at a time for steps 1 to 5, the live board whole for 6 to 10,
  close-down at 11, the debrief at 12. `/lesson`, `/control` and `/reports` still resolve
  and forward to the step that answers them. ADR-0026 reverses the 2026-08-06 supersession
  of ADR-0024.
- **The seven-item navigation collapses behind one Go to button.** Lesson, Control and
  Reports leave it, because they are steps. Fleet, Walls, Students and Vision stay behind
  it and Settings keeps its own control. Two navigations on one screen was the confusion
  being removed. `Ctrl` + `K` still reaches the Mission run.
- **Every rail step says what it decided, not that it is finished.** Step 1 reads "Search
  and Rescue", step 3 reads "4 teams, 3 craft", step 12 reads "Sealed 09:44". Steps 7 to
  10 read as live while the class is up and settle to done when the Mission is sealed.
  A step that is not open says why, in the prototype's own words: "Choose a Scenario
  first", "Grant a takeoff first", "Seal the Mission first".
- **A step that is not open still opens, and says what is in the way,** rather than
  bouncing a Teacher back to step 1. The bounce was the dead end the first rail had.
- **The header logo goes to the Mission run.** It used to go to Control, which is the same
  place under its old name.
- **Reprioritise is spelled the way the rest of the board is.**

### Added

- **A Teacher can hold a takeoff, not only grant it.** Hold sits beside Grant in the
  clearance queue; the held team stays on the list and reads Held rather than Waiting, and
  the Student's tablet says "Hold for now" in words. A hold is a record and reaches no
  aircraft (ADR-0021). Granting supersedes it, so there are two answers rather than three.

### Fixed

- **`/enter` shows the door** when no role is stored, instead of hanging on Opening.
- **Classroom code appears when a Scenario is picked.** `ClassroomOpen` listens to the
  Mission draft, not only the Logbook. Cloud join needs `BLOB_READ_WRITE_TOKEN` (Blob store
  linked on Vercel). Class roll still rides the session for Student tablets.
- **Classroom code join works on iPads.** The class roll travels on the classroom session
  (not only the Teacher Logbook), join checks this laptop first, and the Teacher board
  shows sync status with Retry. Empty roll still lets a Student type their name.
- **Role is sticky and reversible.** `/enter` skips when Teacher or Student is already
  chosen; Switch role in the header, Settings, and Student chrome returns to the door.
  Teacher and Student sit side by side on `/enter`.
- **Students cannot open Teacher chrome.** A Student role never mounts Lesson, Control,
  Settings, showcase, or any other Teacher route. Typed URLs bounce to `/student`.

### Changed

- **Room controls in the header are icon-only:** sun/moon for lit ↔ dark room, projector
  for large format. Words stay in the accessible name and hover title; the bar stays quiet.
- **UI copy drops dash-like separators.** Em dashes and middots between phrases are gone;
  the board uses commas and plain sentences instead. A broken string from that sweep that
  blocked typecheck (and kept production on the old build) is repaired.
- **Lesson is one scrolling page again; the Mission-run rail is gone.** Scenario, zones,
  teams, pre-flight, brief and Start sit on `/lesson` without `?step=`. Control is one live
  board: Attention, classroom code, Scenario watch-list, clearances, Teacher ATC toolbar,
  Scope, strips, Mission seal and pack-down, always on, not step-gated. ADR-0024 superseded.
- **Attention speaks Teacher words again:** “things need you” / “behaving”, not “nominal”.
- **Students join on an iPad with the classroom code** (`/api/classroom` + join door). Same
  laptop still shares via localStorage. Role switch from Settings and the Student chrome.
- **Reports opens with a Debrief** of sealed Mission scores.
- **Lesson answers one question: set this Mission up, and start or end the period.**
  Everything else it carried moved to the screen whose question it answers, or went because
  that screen already answered it. Fleet health, craft by craft, is the **Fleet** board's;
  one line stays on Lesson saying whether the period can run, and links there. Finished
  Lessons and the remedial queue are **Reports**'. Pack-down is on **Control**, under the
  confirmation that ends the Mission. Where records are stored is said on **Settings**
  alone, not on four screens.

### Removed

- **Run bar (“Step N of 12”).** Gone from the app frame. No step banner above Control.
- **Lock screen.** Toggle and command lock are gone; Commands stay available.
- **Quiet mode / training wheels.** Stop-hiding practice chrome is gone; Stop stays on strips.
- **Mission run rail (left).** Already withdrawn. Top SiteNav only.

### Added

- **The Student's screen, on one machine.** A tablet answers what a Student is doing, whether
  they may go, and how they did: the brief with the objective as the largest thing on it, the
  pre-flight seven for their own craft, asking the Teacher for takeoff, the Teacher's answer,
  a flying screen that reads the Fleet, a read-only map of the Mission Zone and their own
  checkpoints, what to do when something happens, and the score once the Teacher seals it.
  Landscape and full width, one dominant thing at a time, two pressable things in the whole
  app. It shares this browser with the board; an iPad on the school Wi-Fi does not reach it
  yet. ADR-0025.
- **A Mission step is the whole Lesson screen.** The step opens with its phase, its number,
  an instruction as the heading and one line on what it is for. Everything else the Lesson
  is (serviceable counts, the plan, assignment, exercises, pack-down, earlier lessons) folds
  into one disclosure, so the step is not the top of a long page. Start the lesson stays
  reachable inside it.
- **The rail says how far through the run you are**, as a bar as well as a count, and names
  the running Lesson.
- **The twelve steps are a workflow you can follow.** A step rail down the left of Lesson and
  Control carries the operational run: each step reads as done, current, live or locked, and a
  locked step says what is standing in the way ("Draw the Mission Zone first") instead of going
  quiet. It minimises to a column of numbers, and slides away entirely on a narrow board.
  Set-up is now one step per screen at `/lesson?step=1` to `5`. ADR-0024.
- **Approve takeoff, and confirm the Mission complete.** Steps 6 and 11 reach a screen for the
  first time. Both were built and tested and never mounted, so granting a clearance and sealing
  a Mission were unreachable in the product.

### Fixed

- **A held Student is told they are held.** Holding a takeoff sent the seat back to
  "not asked yet", so a Student the Teacher had told to wait looked exactly like one who had
  never asked and the screen could not say why they were waiting. Asking again clears a hold.
- **A cleared Student is not told they have landed.** The way-down screen was chosen from the
  clearance, which is permission to leave the ground rather than evidence of having left it.
  It is now chosen from the first Telemetry sighting off the ground.
- **Pre-flight asks about every craft.** It ran on the first Drone on the board alone, so a
  Teacher ticked one airframe and the other five were never checked. It now runs for each craft
  a team has taken.
- **A Mission survives changing screens.** The Scenario and the zones lived in React state on
  the Lesson screen, so walking to Control threw them away. They live in
  `techtechflight:mission-draft` and are adopted by the Lesson that starts after planning.

### Changed

- **Lesson leads the navigation.** Order is now Lesson · Control · Walls · Fleet · Students ·
  Reports · Vision — a Teacher's day starts by planning and starting a Lesson, and Control is
  where they go once it runs.

### Added

- **Local YOLO11x AI service.** Optional FastAPI service (`ai-service/`) runs Ultralytics
  YOLO11x with CUDA when available and CPU otherwise — REST `/detect`, WebSocket `/stream`
  with ByteTrack, Docker CPU/GPU profiles. The board prefers it when
  `http://127.0.0.1:8090` is healthy, else YOLOv8n wasm, else the demo detector (ADR-0023).

### Fixed

- **The Mission run is walkable end to end.** Seven things a Teacher hit trying to run one.
  Steps 6 to 11 are reachable at last: the rail sent every in-the-air step to a bare
  `/control`, so Telemetry, Commands and Alerts could not be opened at all. Control now
  carries **Back** and **Next** like Lesson does, and the forward button says *Next* rather
  than the next step's whole sentence. The simulated Fleet reports Wi-Fi signal and altitude
  hold, so pre-flight can be finished on a Fleet with no hardware in the room — it could not
  before, and step 4 was the end of the road. The Attention bar sits on step 10 instead of
  above every step. The rest of the day is on step 1 rather than folded under all five. Land
  all, Hover all and Stop all fire on one press.
- **You can now draw the Mission area by drawing.** The Mission area editor showed its
  grid only once a zone already had a point, so "Tap the grid" pointed at nothing and the
  only way in was to type two numbers into Add point. The grid is always there now, capped
  at 26rem so it does not push Add point off the screen, and the guidance sits under it so
  the surface cannot move between the first tap and the second. Add point also stays live
  while the Mission Zone is still being drawn — a fourth corner was reachable by tapping
  and impossible by typing.
- **Vision boxes work again.** In-browser YOLO letterboxes at 640 to match the fixed ONNX
  graph (416 made every frame fail silently). Concurrent surfaces no longer share one
  scratch canvas. Vision names the last detector error when frames fail.
- **Control strips keep coordinates and Commands on every row.** An accidental compact-
  strip change shipped with the YOLO11x PR and hid Land / Hover / Recall / Stop (and the
  coordinate line) on grounded unselected craft — CI failed. Anatomy restored; fleet-wide
  Hover all / Stop all and the Attention focused card remain.

### Changed

- **Control Attention stays compact; responses open in a dialog.** The bar keeps the count
  and one-line worst Alert so Scope and strips do not jump when something needs you.
  **Respond** opens the playbook (Recall / Land now / …) as a popup over the board;
  Acknowledge stays on the compact line. The rest of the queue stays in a disclosure.
- **Control Attention is one focused Alert.** Attention shows the worst Alert with
  recommended responses and Acknowledge; the rest of the queue stays in a disclosure.
  Land all · Hover all · Stop all sit under the Scope. Per-strip Commands stay on every
  strip (not selection-gated).
- **Detection boxes are readable and class-coloured.** Each recognised class gets its own
  border and chip colour (`person` is purple); the label sits on a solid chip with large
  type so it stays legible on a dark hoodie. The camera loop waits for each inference to
  finish before starting the next.

### Added (Wave M2 — Search and Rescue end-to-end)

- **Mission Scenario picker.** Three cards — Search and Rescue, Delivery and Building
  Inspection — each show objective, success criteria and common risks. The choice stays
  changeable until the first Clearance.
- **Mission area editor.** Draw one Mission Zone and any number of No-fly Zones as
  polygons in metres, with undo; an empty editor says what to do rather than showing a
  blank box.
- **Zones on the Scope.** Mission Zone outlined and No-fly Zones hatched on the plan view
  only; on a hardware Fleet the caption says they are not surveyed against this aircraft.
- **Checkpoints on the Scope.** Ordered marks; reached ones read as filled circles and
  unreached ones as diamonds, with the status said in words as well as colour.
- **Mission teams.** Students group into named teams and each team can take a Drone —
  beside the Logbook's who-is-flying assignments, not instead of them.
- **Seven-item pre-flight check.** Battery, sensors, Wi-Fi, camera, altitude hold and
  obstacle sensing read from Telemetry; propellers is the one item a Teacher ticks.
- **Mission rules and safety briefing.** Tickable per Lesson, with Scenario objective and
  risks from the catalogue.
- **Printable team brief.** One A4 sheet per team with objective, map, checkpoints, time
  limit and four what-if responses.
- **Lesson screen mission prep.** Scenario picker, area editor, teams, pre-flight,
  briefing and team briefs mount in workflow order with next-step hints.
- **The clearance queue.** Ready, assigned teams past pre-flight enter by themselves; the
  Teacher grants or holds, and the count stays visible at zero when nobody is waiting.
- **Mission phase and checkpoint progress on the strip.** Phase in words with a distinct
  shape; checkpoints as "2 of 4" or "No checkpoints" in words.
- **The no-fly Alert.** Entering a No-fly Zone raises one critical Alert from the
  playbook — what to do — and stays silent until the craft leaves and crosses again.
- **Alert response options.** Pressable playbook choices in safety-priority order, with
  the recommended action named first.
- **Recall on the command row.** Joins Land, Hover and Stop; enabled only while airborne;
  receipt reads sent → waiting → done from Telemetry alone.
- **Assign target, Reroute and Reprioritise.** Instructions recorded on the Mission —
  never Commands — so they work on real hardware (ADR-0021).
- **Alert log.** Alerts persist on the Lesson with raised-at, cleared-at, kind, craft and
  what the Teacher did; acknowledgement stays in memory only.
- **Confirm mission complete.** Seals the Mission and its score once every craft is down;
  refuses while any Mission craft is still airborne.
- **Mission report in Reports.** Per-Lesson mission log, score against stated criteria,
  incidents by category, and the sealed debrief — print-friendly.

### Added (Wave M1 foundations — remainder)

- **Classroom Fleet size.** Configurable from one to twenty Drones; six remains the default.
- **Ground speed.** Horizontal speed derived from position over time, beside climb rate.
- **Missions in the Logbook.** Legacy Lesson `exercises` migrate forward to `missions` on
  write; old records still read.
- **Zone breaches as a rising edge.** Hovering on a boundary raises one alert, not one
  every tick; leaving and crossing again raises a second.
- **Mission score.** Graded against the five lifecycle success criteria and five failure
  conditions — met, not met, or unknown — with an overall score only when enough was measured.
- **Clearances.** A Ready, assigned craft past pre-flight enters the queue by itself;
  granting records who and when; clearances end with the Mission (ADR-0021).
- **Mission clock.** Counts down from the Scenario limit; no limit says so rather than
  showing zero; crossing zero raises `mission-timeout` once.
- **Route coverage.** Fraction of the Mission Zone flown from the trail — or "Not enough
  track yet" when the board cannot tell.

### Added (Wave M3 vision — remainder)

- **Camera device picker.** Lists cameras, remembers the choice, and names a non-secure
  origin that blocks the camera.
- **Detector timing.** Frames per second and per-frame latency, in words until enough
  frames exist to average.
- **Detect wall counts honestly.** Feeds real pixels, or says it cannot count rather than
  showing a zero it did not measure.
- **Search and Rescue target found.** A person above confidence inside the search area
  satisfies the find-the-target criterion; the Teacher can overrule it.

### Added (the mission layer — Wave M1 and M3)

- **Vision check.** A new **Vision** screen answers one question with a word: does object
  detection actually work on this machine. It refuses to be fooled by the demo detector,
  which draws two confident invented boxes when no weights are present, and names the two
  failures a Teacher will actually hit — missing weights, and a camera the browser will
  not open on a network address.
- **Detection works with no internet.** The WebAssembly runtime is served by the board
  instead of a CDN. It used to mean detection quietly degraded to the demo detector in any
  classroom without a connection. `npm run fetch:yolo` now fetches the runtime as well as
  the weights, and the Vercel build runs it.
- **Recall.** A Teacher can send an airborne Drone back to where it took off. It flies
  there and lands; it is not instant, so a Drone that ignored a Recall still looks like one
  (simulated Fleet only, ADR-0011).
- **Signal strength.** Where the radio reports it, each Drone carries how well the link is
  carrying — a different fact from Last Contact. Where it does not, the board says so
  rather than drawing an empty bar.
- **Mission Scenarios.** The three a class runs — Search and Rescue, Delivery, Building
  Inspection — as data, with the objective, flow, success criteria, risks, and what each
  side watches.
- **The flight area.** Mission Zones and No-fly Zones as polygons in the Fleet's own frame,
  with the geometry to tell a Teacher what a Drone has breached and how much room is left.
- **Mission phase.** Where a Drone has got to in its Mission, derived from Telemetry and
  the Teacher's own records — never from a Command having been sent.
- **The incident playbook.** Every Alert now has advice attached: what the aircraft is
  already doing, what the board has done, what to do about it, and how to know it is over.

### Added

- **Wave 1A mounted on shared screens.** Fleet, Lesson, Control, Settings, Reports,
  Students, and Walls hub wire the batch components; camera session chrome lives in the
  Camera dialog; lesson close asks for a name and seals attendance / pupil hours.

### Added (Wave 1A)

- **Charge-to-ready for the set.** One line under the Fleet summary — "6 ready in 12 minutes" — built only from charge the board has watched go in; silent when no honest forecast exists.
- **Fleet headcount before class.** Tick each craft on the bench; the present count (including zero) and the missing list stay on the prep screen.
- **Missing since last Lesson.** Prep names any craft that flew the last closed Lesson and has not come back (Offline or gone from the Fleet).
- **Nominate the spare.** Mark one craft as the swap during prep; the board remembers it on this laptop.
- **Assign everyone.** One tap fills every free craft from the roster in board order and says how many were handed out.
- **Undo last assignment.** One step puts the previous Student ↔ Drone pairings back exactly.
- **Swap Students.** One action exchanges who is flying two craft, using the same swap the Control strips already know.
- **Absent frees a craft.** Marking a Student absent returns their Drone to the waiting list and names who is next.
- **Waiting list.** Lesson screen can show who flies next — unassigned Students in roll order, with an empty state that explains itself.
- **Assignment wall.** Classroom Wall cards show each Student next to their craft, large enough to read across the room.
- **Objective wall.** One large sentence from the running Lesson — the Exercise under way, or the Lesson label — for the class to see.
- **Safety brief.** Fixed classroom rules the Teacher can tick with the class; ticks reset when a new Lesson starts.
- **Everything fine?** One line on Control / Fleet that answers whether anything needs attention — calm at zero, never vanishing.
- **Exercise time left.** Every Control strip counts down the current Exercise — quiet when no duration was set.
- **Not yet airborne.** Control names grounded craft that still have an assigned Student after the Lesson starts.
- **Up longest.** Control names the craft that has been airborne longest, with how long.
- **Screen lock.** The Teacher can lock Control so a pupil at the laptop cannot press Stop — every Command control disables and says why.
- **Altitude floor over the desks.** Control can warn when an airborne Drone is skimming
  below the configured floor (default 0.5 m) — grounded craft on desks stay quiet.
- **Ceiling breaches on the report.** Each time a Drone climbs above the classroom ceiling
  during a lesson is counted once, and the total stays readable afterwards.
- **Tunable separation alarm.** Settings can change how close two craft may get before the
  board warns — default stays today's 1.5 m.
- **Land all now.** One control lands every airborne craft, held down to confirm.
- **Land one table.** A control lands only the airborne craft in the chosen group, not the whole Fleet.
- **Stop on the lesson.** Every Stop press is written onto the lesson record with time and craft.
- **Incident severity from a list.** New incident notes pick Needs attention or Fault;
  older free-text severities still print as written on Reports.
- **Clip library.** Clips captured this session stay listed so the Teacher can download them again without re-recording.
- **Snapshot gallery.** Stills taken this session show as thumbnails with craft and time in the Camera dialog.
- **Frozen feed.** When the camera picture stops updating, the board says so instead of leaving a still frame that looks live.
- **Camera orientation.** Each craft can be mirrored and rotated; the choice sticks on this laptop and applies to the camera pane.
- **Pack-down checklist.** At lesson close, one tickable row per craft — packed or still out — and a fresh list every lesson.
- **Battery back on charge.** At pack-down, tick which packs went back on charge — and see which still need placing.
- **Craft returned.** At pack-down, the headcount out — how many are back, with any craft still missing named.
- **Lesson name at close.** Closing asks for a name so the record is never left as Untitled lesson.
- **Download CSV on Reports.** Lessons and incidents as a spreadsheet file — names with commas quote cleanly.
- **Lifetime hours per craft on Reports.** Accumulated Lesson time for each airframe that took off, across every closed Lesson.
- **Incident categories.** A fixed vocabulary for what went wrong — collision, battery, link, control, hardware, other. Notes written before categories stay readable as Uncategorised or their original words.
- **One-page printable Lesson summary.** A single A4 sheet for one closed Lesson — paper tokens under print, kept together with `break-inside: avoid`.
- **Attendance over time.** Present and absent counts per Student, sealed from the marks the Teacher already keeps.
- **Notes per pupil.** Free-text notes on each Student, saved when focus leaves the field — the same habit as craft notes.
- **Roster CSV import.** Choose a class list file — a bad spreadsheet changes nothing and says why.
- **Flight hours per pupil.** Accumulated airborne time across closed Lessons — sealed intervals when available, otherwise Lesson length when a takeoff was recorded.

### Fixed

- **Record lives inside Camera.** Control strips keep only the Camera entry; per-Drone
  Record sits in the Camera dialog next to the feed (where CameraPane already had it), not
  as a sibling pill beside Camera. **Record all cameras** stays above Every Drone.

- **The gate is green again.** `ControlStripOrder.test.tsx` still looked for the Attention
  queue by `role="status"` after it became a disclosure list, so `main` had been failing CI
  since 30 July without anyone noticing. The query now matches the role the component
  actually has. The live region that change removed is a separate question — see #239.

- **Warm-up timer actually counts down.** Fleet’s 1s clock was recreating `onDone` each
  tick, which cleared the 60s timeout before it fired — stuck on 60. Callback is now
  held in a ref so re-renders cannot reset the countdown.

### Changed

- **Charge reading gets an iPhone-style battery glyph** on Control strips and the Scope
  dock — fill tracks fraction; low charge uses the Not Ready colour.
- **Dual wall: pick Drones from dropdowns.** Each camera pane has a select; choice updates
  `?a=` / `?b=` so the pair stays shareable. Defaults remain the first two.
- **Lesson strip actions sit together.** Bookmark, Note incident, and End share one
  right-hand cluster (`gap-2`); compact mode hides recent lists so the bar stays one row.
- **Attention is a closed dropdown.** Count + worst line stay put; open to see every
  item and acknowledge. No more single-alert swap that made the board feel like it was
  moving.
- **Fleet Details → More details.** Opening Details on a Fleet tile keeps you on the board
  (dialog). Charge chart, height, camera, and attitude sit under **More details** —
  same instruments as the old full `/drone` page, without leaving Fleet.
- **Control is three beats again.** Attention → Scope → Every Drone. Lesson tools,
  waiting queue dock, camera filmstrip, YOLO/voice/class-average strips, timer, and
  end-period prompt are off Control. Secondary actions sit under **More actions**.
- **Strip alerts collapse.** NOW/SOON lines on each Every Drone row sit in a closed
  disclosure (count + first line); open for the full list.
- **Ceiling warning is one compact line** so it no longer owns half the viewport.
- **Walls hub:** one flat grid of every wall, plus a **Find a wall** search field.
  No “More walls” disclosure.
- **Ghost paths on Side and Front.** Scope trails use altitude when known, not only the
  top-down plan.

### Removed

- **Paste roster on Students.** Bulk paste box and Import names were chrome — never wired
  into the Logbook. Add names one at a time.
- **Battery swap checklist.** Five-step Power off → Confirm charge list gone from Lesson
  prep — Teachers already know the pack swap; it was chrome.
- **Camera button on Fleet Details.** Dialog footer is only **Back to the Fleet**. Camera
  still lives under **More details** (and Walls / Control); no separate slide from Fleet.
- **Spotlight.** Peer-demo Spotlight on Control strips/dock, `/walls/spotlight`, and hub
  tile removed — open **Camera** when you need a large view.
- **Projector and TV walls.** Hub tiles and `/walls/projector` / `/walls/tv` routes gone —
  use Cameras / Status (and Large format) for the room screen.
- **Control lesson chrome pile.** Waiting queue dock, lesson timer, remedial/absent/
  class-average/voice/YOLO strips, camera filmstrip, and end-period prompt no longer
  mount on Control (components may remain for Walls / Lesson).
- **Parent demo kiosk (`/walls/kiosk`).** Redundant Status wall clone — Status wall stays.
- **Stop audit log.** Session list of Stop presses removed from Control Lesson tools.
- **Classroom / Wide hall / Tight bay presets** from Control — they cluttered “Where
  everything is” without driving the Scope window.
- **Lesson timer on `/walls/cameras` and `/walls/projector`.** Countdown stays under
  Control’s Lesson tools disclosure only.
- **Scope layout preset module.** Dead `ScopeLayoutPresets` / `scope-layout-presets`
  removed after Control stopped mounting them.
- **Teacher PIN.** No more `4242` gate on Control commands or Settings — Stop/Land/Hover
  and Settings open without a PIN.
- **Cloud Logbook copy panel.** Settings no longer shows the cloud sync secret UI; the
  background hydrator is gone with it. Local Logbook stays as before.

### Fixed

- **CI green for Walls classroom branch.** Control `'use client'` import order; PIN unlock
  in Stop/Swap tests; hub link assertions by href; demo-only env cleared in test setup.

### Added

- **Camera Record (one + all).** Per-Drone **Record** on Control strips, Scope dock,
  Camera wall tiles, and CameraPane. **Record all cameras** on Control (Every Drone) and
  the Cameras wall. Session marks only — not a Fleet Command; no clip bytes yet.
- **Landing pad workflow sim.** Step-through approach to touchdown on Pads.
- **Camera recording clip.** Save clip control on CameraPane (stub handler) — superseded
  by per-Drone / all-Fleet **Record** marks (see Added).
- **Student projector (`/walls/projector`).** Cameras wall for the class screen.
- **Voice ready callouts.** Labels list Ready grounded craft for spoken cueing.
- **Battery swap checklist.** Five-step local checklist on Lesson prep.
- **Maintenance grounding flag.** Badge for craft held for maintenance.
- **Spare inventory.** Grounded count shown as spare beside headcount on Control.
- **Lesson templates pack.** Three starter plans on the Lesson prep screen.
- **Roster import paste.** Students screen accepts one-name-per-line paste.
- **Reports student ids.** Helper joins lesson assignment names for report rows.
- **Weekly teacher digest.** Reports shows finished/started lesson counts for the last 7 days.

- **End-of-day export.** Reports offers a JSON download of todays lessons (ZIP later).
- **Auto PDF after lesson.** Ending a lesson opens a confirm dialog to download the reports PDF.
- **Before/after lesson scores.** Score pair formatter and strip for lesson summaries.
- **YOLO lesson scoring.** Class average of detection counts on Control (stub zeros until detector tallies feed in).

- **Incident note on running lessons (#48).** **Note incident** on Control and `/lesson`
  saves Teacher observations into the Logbook with optional Drone context — local only
  (ADR-0011). Fleet events still copy at lesson close.
- **Absent versus Offline badges (#46).** Students can be marked **Absent** on `/students`;
  **Offline** badges appear on Drones that have gone quiet. Control shows an Absent summary
  line and Offline on strips — semantic status tokens, not one shared warning colour.
- **Double-assign guard (D7).** `assignStudent` refuses when a name already flies another
  Drone; AssignmentColumn and one-tap assign honour the same rule at the Logbook layer.
- **Incident note on running lessons (#48).** **Note incident** on Control and `/lesson`
  saves Teacher observations into the Logbook with optional Drone context — local only
  (ADR-0011). Fleet events still copy at lesson close.
- **Absent versus Offline badges (#46).** Students can be marked **Absent** on `/students`;
  **Offline** badges appear on Drones that have gone quiet. Control shows an Absent summary
  line and Offline on strips — semantic status tokens, not one shared warning colour.
- **Double-assign guard (D7).** `assignStudent` refuses when a name already flies another
  Drone; AssignmentColumn and one-tap assign honour the same rule at the Logbook layer.
- **Photo evidence on CameraPane (#49).** **Save photo evidence** downloads a PNG from the
  live video frame (`canvas.toDataURL`); sim surfaces get a labelled placeholder. Browser
  download only — no Fleet path (ADR-0011).

- **Swap drone mid-lesson.** Select a strip on Control, then **Swap** on another — student assignments exchange without retyping.
- **One-tap roster assign.** Control and Students offer **Assign {name}** — the next unassigned roster name goes to the selected unassigned Drone, or the first free Drone in board order.
- **Student name on Control strips.** Assigned names render as prominent display type beside the callsign; click to edit. Scope dock matches.
- **Land all (sim) on Control.** Beside the live headcount, a button brings every airborne craft down via `setAltitude(0)` when a simulated Fleet is connected — not a hardware Command (ADR-0011).
- **Teacher PIN gate.** Demo PIN `4242` unlocks session access to Control Commands (Land/Hover/Stop/Release) and Settings; overlay until entered. Not security — documented demo only.
- **Quiet mode on Control.** Toggle beside Every Drone hides Stop and Release stop on every strip and the selected scope dock; Land and Hover stay. Local UI only — not a Fleet Command.
- **Classroom geofence on Scope.** Top-down view draws a dashed 8×6 m box (−4…4 m east, −3…3 m north from setup); caption documents extents. Orientation only — no alerts yet.
- **Height ceiling banner on Control.** Alert when any Drone exceeds the 3 m classroom ceiling default; reuses the height wall threshold.
- **Freeze scope on Control.** **Freeze scope** snapshots Drone positions, the scope window,
  and conflict lines while Telemetry and flight strips keep updating — same discipline as
  camera wall freeze. **Resume updates** catches up from the live Fleet.
- **Ghost paths on the Scope (Control).** Optional **Ghost paths** toggle draws faint dashed
  recent trails on top-down view. Positions accumulate in a browser ring buffer — FleetHistory
  has no position trail yet, so the toggle works with empty paths until Drones move.
- **Lesson bookmark moment on Control and Lesson.** While a lesson runs, **Bookmark moment**
  saves elapsed time plus an optional note into the Logbook — local only, no Command
  (ADR-0011). Recent bookmarks list under the control on Control and `/lesson`.
- **Remedial queue on Control and Lesson.** After a lesson ends, Drones with fault
  incidents are queued for remedial follow-up in the Logbook. Control and `/lesson` show a
  minimal list linking to `/drone?id=`; **Done** dismisses without sending a Command.
- **Lesson plan wizard on /lesson.** Three steps — name, exercises, confirm — before start, with
  a header shortcut to start immediately (E7). Reuses `ExerciseList`.
- **Training wheels mode.** Toggle on Control and Lesson (localStorage). Banner when on; Stop
  hidden and alert styling softened — UI-only, no hardware commands (ADR-0011).
- **Peer demo spotlight on Control.** Spotlight button on each strip opens a large watch-only
  CameraPane for class demo; End spotlight dismisses. No Commands (C9).
- **Class average strip on Control.** Mean airborne height and readiness percentage above the
  scope — glanceable fleet summary without opening a wall.
- **Live headcount on Control.** Airborne / grounded counts beside Every Drone.
- **End-period land prompt.** When the Control lesson timer hits zero, a dialog offers sim land-all (altitude 0) or dismiss.
- **Lesson warm-up.** After Start, a 60s countdown overlay on `/lesson` (Skip available); once per lesson id in sessionStorage.
- **Lesson timer on Control.** Same local `LessonTimerBanner` as the camera wall, under the lesson strip.

- **Attention queue dock on Control.** Sorted needs-you list beneath the Attention bar;
  click lights and scrolls to the matching flight strip. The bar still carries one Alert at
  a time; the dock carries the whole queue worst-first.
- **Battery time budget on Control strips.** Charge now carries a naive minutes-left readout
  (`minutes ≈ charge × 12`) beside the percentage on every flight strip and the selected
  strip panel — enough to eyeball whether a lesson fits without reading discharge history.
- **Pre-flight checklist on `/lesson`.** Before start, the Lesson screen shows the same
  ready / not ready counts and per-Drone labels as the Ready wall (`ready-mapping.ts`).
  Starting with zero ready shows calm copy beside Start; the button stays enabled (E7).
- **Lesson timer on camera wall.** Local countdown banner above Cameras; Start/Pause/Reset.
- **Walls TV mode (`/walls/tv`).** Toggle Cameras or Status for a classroom display; Exit TV returns to the hub.
- **End-lesson landed wall (`/walls/landed`).** One tile per Drone — green when on the
  ground, red when still airborne; summary landed / still flying counts; tiles link to Drone
  detail. Read-only. Not on the Walls hub yet.
- **Camera wall freeze (`/walls/cameras`).** Freeze wall snapshots tile names and camera
  labels while Telemetry and ScenarioControls keep running; Resume updates catches up.
  CameraSlide stays live so Start/Stop still works during a freeze.
- **Who's-who labels on the camera wall.** Each tile names the assigned student from the
  Logbook when one exists; otherwise the Drone callsign only. Simulated-feed overlays use
  the same label.
- **Scope camera filmstrip on Control.** Horizontal row of watch-only camera thumbs under
  the scope in board order; click opens CameraSlide. The lit scope mark lights its thumb.

- **Walls hub lists Proximity through Spotlight** after those walls landed.

- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **Detection count wall (`/walls/detect`).** One tile per Drone with an object tally when
  the in-browser detector exposes counts and the sim camera is streaming; otherwise "—".
  Summary total when any tile reports; tiles link to Drone detail. Read-only. Not on the
  Walls hub yet.
- **QR pad wall (/walls/pads).** Per-Drone pad Not seen until a sighting store exists.

- **Landing pad wall (`/walls/pads`).** One tile per Drone with landing-pad QR seen or not on
  the camera picture; reuses the camera landing-target readout. Simulated streaming scans the
  static fixture; idle cameras and hardware show an em dash until a school-frame scan path
  lands. Summary seen count; tiles link to Drone detail. Read-only — never written into
  Telemetry.
- **Landing watch (`/walls/landing`).** Focus descending/auto-landing/low airborne craft; else show all with height.

- **Landing watch wall (`/walls/landing`).** When any Drone is descending or auto-landing,
  the wall narrows to those tiles with phase, airborne state, and height; otherwise every
  Drone stays visible with land-relevant vitals. Summary: “N landing”. Tiles link to Drone
  detail. Read-only.
- **Proximity risk wall (/walls/proximity).** Close pairs under SEPARATION_WARNING_M from vitals; display-only.

- **Proximity wall (`/walls/proximity`).** One tile per close pair of airborne Drones inside
  the 1.5 m separation warning; summary count, distance readout, tiles link to Drone detail.
  Read-only.
- **Walls hub lists Attention, Faults, Heartbeat, and Height.** Sync after those walls landed.
- **Lost-link visual siren on Walls.** When any Drone is Offline or has a no-response
  alert, Walls show a pulsing fault-border alert (motion suppressed under
  prefers-reduced-motion). Visual only — no audio.
- **Height wall (`/walls/height`).** One tile per Drone with name and an aligned height
  readout; tiles above the classroom ceiling default (3 m) highlight with a summary count.
  Tiles link to Drone detail. Read-only.
- **Last Contact wall (`/walls/heartbeat`).** One dot per Drone in board order — filled when
  the link is live, hollow when Telemetry is Stale or the Drone has not responded. Summary
  stale count; tiles link to Drone detail. Teacher-facing copy says Last Contact, not
  heartbeat.
- **Fault mosaic (`/walls/faults`).** Every Drone on one grid; fault, stale, and emergency
  tiles sort to the front, the rest follow in board order. Summary count, fault reason when
  reported, stale hint. Tiles link to Drone detail. Read-only.
- **Attention wall (`/walls/attention`).** Troubled Drones — fault, emergency, stale, or
  alerts still on the Teacher queue — read large with the headline alert; nominal Drones
  shrink to a muted callsign. Summary: “N need you”. Tiles link to `/drone?id=`. Read-only.
- **Battery wall (`/walls/battery`).** One tile per Drone with name, charge bar, and
  percentage; critical count when charge is below the ground-station usable threshold.
  Tiles link to Drone detail. Read-only.
- **Ready wall (`/walls/ready`).** Pre-flight board: each Drone tile shows Ready, Not
  ready, Offline, or Fault with a calm “N ready · M not ready” summary. Tap a tile for
  `/drone?id=`. Offline and Fault count in the not-ready bucket.
- **Status wall (`/walls/status`).** Grid of linked tiles — name, Status word, charge, height
  when reported, and response age with a stale hint. Fault and emergency stop use existing
  status-fault borders; empty Fleet keeps the calm waiting line.
- **Classroom Walls hub (`/walls`).** SiteNav “Walls” after Control opens a hub with links
  to Cameras, Status, Ready, and Battery subroutes. Shared `WallsShell` + `WallGrid`
  primitives; subroutes ship placeholder tiles named from the Fleet until each wall lands.
- **Camera wall (`/walls/cameras`).** Grid of watch-only camera tiles in board order; click
  opens CameraSlide with the full CameraPane for that Drone.

### Fixed

- **Front/Side Scope labels no longer double-print when marks stack (#86).** Coincident
  elevation piles stack names vertically in rem above the mark; the drawing box clips so
  “Filled = flying” stays in the footer only.

### Changed

- **Trainer Drones inventory is optional and less crowded (#80).** Model / created date sit
  behind Add details; empty is fine and does not block teaching. Empty save clears the row.
- **Every classroom sim Drone has a camera fitted (#91).** Default simulator no longer
  leaves odd-index craft without `camera` on Telemetry — Teachers never see “No camera
  fitted” on Drone 2/4/6 in the default Fleet. Hardware may still omit the field.

### Added

- **Live headcount on Control.** Airborne / grounded counts beside Every Drone.
- **End-period land prompt.** When the Control lesson timer hits zero, a dialog offers sim land-all (altitude 0) or dismiss.
- **Lesson warm-up.** After Start, a 60s countdown overlay on `/lesson` (Skip available); once per lesson id in sessionStorage.
- **Lesson timer on Control.** Same local `LessonTimerBanner` as the camera wall, under the lesson strip.

- **Lesson timer on camera wall.** Local countdown banner above Cameras; Start/Pause/Reset.
- **Walls TV mode (`/walls/tv`).** Toggle Cameras or Status for a classroom display; Exit TV returns to the hub.

- **Walls hub lists Proximity through Spotlight** after those walls landed.

- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **QR pad wall (/walls/pads).** Per-Drone pad Not seen until a sighting store exists.
- **Landing watch (`/walls/landing`).** Focus descending/auto-landing/low airborne craft; else show all with height.
- **Proximity risk wall (/walls/proximity).** Close pairs under SEPARATION_WARNING_M from vitals; display-only.

- **Header logo goes to Control (#96).** The brand mark (and wordmark fallback) is a link to
  `/control` — same teaching surface as the Control nav item. “Flight Deck” product name
  stays outside the link.
- **Dual-write Logbook to Vercel (#93 / #83).** Local save first; debounced cloud copy via
  `/api/logbook` (Blob + shared secret). Vercel board hydrates when cloud is newer.
  ADR-0015. Print/PDF and static classroom export unchanged.
- **Reports Download PDF (#92).** Primary control saves a real PDF (Lessons + recurring
  defects) with no browser Headers/footers. Print stays secondary.
- **Settings Classroom setup — Sim vs Radio (#88).** Plain-language path picker on Settings.
  Simulator (default, Commands) vs Radio/MAVLink (monitoring only, ADR-0011). Preference in
  `ground-station/classroom-source.json`; restart the launcher to apply. No hardware
  `CommandableSource`.
- **Windows classroom launcher (#75).** Double-click `Start TechTech Flight.bat` installs if
  needed, builds the board once when missing, starts the ground station on :4321, and opens
  the board. Unreachable banner tells Teachers to run that file. Default Fleet is the
  Simulator; MAVLink radio remains opt-in monitoring-only (ADR-0011).
- **YOLOv8n person/object detection on the camera (#69).** While the sim camera is on, the
  board prefers the laptop webcam and runs **YOLOv8n** (ONNX, COCO) in the browser — boxes
  for person, chair, bottle, etc. Falls back to the labeled demo detector if weights/wasm
  fail. Telemetry unchanged: `camera.streaming` only. Fetch weights:
  `node scripts/fetch-yolo-model.mjs`.
- **Camera from Control (#59 / #67).** Every Drone strip (and the scope dock / Fleet detail)
  opens a large centered dialog hosting `CameraPane` — watch the feed without leaving the
  teaching surface. Stream URLs stay env/IT (#66). Not a Command (C9).
- **QR landing targets on the camera surface (#51).** When the simulated feed has a picture,
  the board decodes landing-pad QR codes (`ttf-land:…`) and shows where to land. Display-only
  by default — never written into Telemetry. Sim may offer an explicit **Place at landing pad
  (demo)** ScenarioControl; hardware never does. Uses a static fixture until school stream
  pixels land (#50).
- **School camera stream map (#50).** `droneId → http(s) URL` via optional
  `NEXT_PUBLIC_CAMERA_STREAM_MAP` (and localStorage when set). When hardware Telemetry says
  `camera.streaming` and the Drone is mapped, `CameraPane` plays a native `<video>` from
  that map — never from Telemetry. Unmapped hardware keeps the honest notice; simulated
  Fleets still use labeled demo pixels and ignore the map. No Teacher Settings form.
- **Object-detection overlay on the simulated camera feed (#49).** While the sim feed is
  streaming, `CameraPane` draws bounding boxes from a pluggable `ObjectDetector`. Default
  is a labeled demo detector (not YOLOv12 — weights not loaded). Hardware streaming and
  idle/no-camera still show no overlay. Telemetry unchanged: `camera.streaming` only.
- **Trainer DB in the browser Logbook (#48).** Students carry `studentId` + name; trainer
  Drones store model / created date; prepared Lessons use LessonDrone and LessonAssignment
  (studentId-keyed). Strips still show names. Legacy name-only roll still loads; migrate on
  write. Minimal UI on Students, Settings, and Lesson prep — not a Control redesign.
- **Camera pane on Drone detail (#45).** Teachers see a per-aircraft camera surface driven
  by Telemetry `camera.streaming` only — no URL on the wire. Simulated Fleet gets a labeled
  demo feed plus Start/Stop via ScenarioControls (not Commands). Hardware Fleets show state
  without inventing a Start.

### Changed

- **Teachers get a find-path for Logbook data (#74).** Students / Settings / Lesson / Reports
  note that records live on this laptop’s browser Logbook (not Vercel), and name where to
  look for roster, trainer Drones, prep, and finished Lessons.
- **Lesson and Students say where records live (#68).** Plain note: the Logbook stays in
  this browser on this laptop; Vercel is a separate preview with its own empty storage — not
  a shared school database.

### Fixed

- **School camera streams panel stays off Settings (#66).** Teachers do not edit droneId →
  URL there; env/IT map remains for hardware playback.
- **Lesson and Student IDs are system-generated (#58).** Teachers type names only; the board
  assigns `L-…` / `S-…`. Fleet Drones stay pick-by-existing-id. Strips still show names.
- **Scope Drone names stay above each mark without colliding (#61).** Top-down no longer
  alternates names below the mark; packed classroom rows get a horizontal rem stagger so
  labels stay readable. Names are never dropped to anonymous dots.
- **Lesson exercise hint is "Stay still in the air" (#60).** Placeholder / DESIGN wireframe
  no longer say "Hover and hold", which read like the Control command. Control strip and
  kind `hold` unchanged.
- **Control Hold label is Hover (#52).** Teacher-facing button and receipts say **Hover**;
  wire kind stays `hold`. Strips and fullscreen Scope dock updated.
- **Stop is one click — no hold, no second press.** Same as Land/Hold; owner dropped the
  GuardedButton / C8 press-and-hold path for classroom speed. DESIGN §13.2 marked resolved
  so it no longer contradicts §4.5.
- **No more "Stop — done" beside Release stop.** Emergency-stop receipt clears when the latch
  is on Telemetry; Release stop + the critical alert are the lasting signal. Land/Hold still
  get sent/waiting/done.
- **Reports print is a readable paper document in dark theme.** Print forces light colour
  tokens (dark `text-ink` was invisible on white), breaks only on Lesson cards, stamps
  printed-at on the sheet, and tells Teachers to turn off browser Headers and footers so
  the URL and clock do not appear. Print button sets a clean document title before
  `window.print()`.
- **Every Drone strip freespace is the response column (#41).** Head grid is
  `auto_auto_auto_auto_1fr` so charge stays snug after height; Response flush right. Quiet
  strip vertical gap tightened; Land/Hold left, Stop/Release still `ml-auto` (not merged).
- **Scope Front spreads the classroom row (#38).** Elevation floor axes swapped — Front
  horizontal = **east**, Side = **north** — so parked craft at `eastM: 0,1,2…` / `northM: 0`
  separate on Front. ADR-0016/0017 and training T7/T7b follow. (Fullscreen icon-only and
  centred overlay composition landed in the same branch.)
- **Emergency stop label is just Stop.** Dropped "immediately" — the primary CTA is **Stop**;
  after the latch it remains **Release stop**.
- **Stop, then Release stop when latched.** Control strips no longer say "Stop — hold"; after
  Telemetry shows the emergency latch the control becomes **Release stop** on the simulator
  (or present-and-unavailable on a Fleet that cannot release).
- **Control Every Drone strips stay in board order.** Stopped worst-first `compareStrips`
  reshuffling when alerts appear or clear; urgency remains on the Attention bar only.
  DESIGN.md and deliberate position #1 updated so the next reader does not put it back.
- **MAVLink adapter stays live when SITL omits battery.** Match frames by registry class
  (not `instanceof`), and when HEARTBEAT is present but charge is unknown emit
  `batteryFraction: 1` with `batteryIsEstimate: true` so the strip shows contact instead of
  Offline. Verified end-to-end against ArduCopter 3.3 SITL in WSL (UDP 14550).
- **Living docs match the merged board-corrections stack.** CI is acknowledged (no lint
  remains true); the logbook header no longer claims Settings export; ADR-0014 no longer
  requires a live `Grid:` caption; DESIGN.md strip anatomy is five head-row cells.
- **Register residual after PR #22.** Lesson and Maintenance blocking copy, logbook
  service-state meanings, the Drone screen cluster, auto-landing unavailable, and the
  Control acknowledged-alert line — the ADR-0015 "before" strings the first sweep missed
  behind route params and warm leftovers. Key `'watch'` and the five Status words untouched.

### Added

- **Live headcount on Control.** Airborne / grounded counts beside Every Drone.
- **End-period land prompt.** When the Control lesson timer hits zero, a dialog offers sim land-all (altitude 0) or dismiss.
- **Lesson warm-up.** After Start, a 60s countdown overlay on `/lesson` (Skip available); once per lesson id in sessionStorage.
- **Lesson timer on Control.** Same local `LessonTimerBanner` as the camera wall, under the lesson strip.

- **Lesson timer on camera wall.** Local countdown banner above Cameras; Start/Pause/Reset.
- **Walls TV mode (`/walls/tv`).** Toggle Cameras or Status for a classroom display; Exit TV returns to the hub.

- **Walls hub lists Proximity through Spotlight** after those walls landed.

- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **QR pad wall (/walls/pads).** Per-Drone pad Not seen until a sighting store exists.
- **Landing watch (`/walls/landing`).** Focus descending/auto-landing/low airborne craft; else show all with height.
- **Proximity risk wall (/walls/proximity).** Close pairs under SEPARATION_WARNING_M from vitals; display-only.

- **Full-screen Scope keeps Commands for the selected mark.** Overlay covers Every Drone
  strips; picking a mark docks Land / Hold / Stop (same row as the strip) at the bottom
  until Cleared or deselected.
- **AED-style training scenarios in Settings.** Named Run/Reset drills (T1–T8, T11–T12) that
  drive the simulated Fleet so every Teacher surface can be exercised without a real aircraft.
  C9: Settings only, never on strips. Catalog and coverage map in
  [`docs/training-scenarios.md`](./training-scenarios.md). T7b / T9 / T10 documented as
  checklist (Front waits on #28; Lesson/Reports are human steps).
- **Full screen on the Control scope.** Opt-in overlay lifts the ADR-0014 cap so the grid can
  fill the viewport; **Exit full screen** or Escape restores the capped layout. View toggle
  stays usable inside; choice is not persisted.
- **The scope has a Front elevation view.** Height against **north**, beside Side (height
  against east). Same box, same ceiling ladder, same heightless-and-named rule; conflict and
  link lines stay top-down only. ADR-0017; supersedes ADR-0016's "any third view". Toggle:
  Top-down · Side · Front. See [ADR-0017](./adr/0017-a-front-view-on-the-scope.md).
- **A MAVLink Telemetry Source, developed against ArduPilot SITL.** New `fleet-adapters/`
  workspace (Node-only — `node:dgram` cannot enter `fleet-core`, ADR-0013). Reads HEARTBEAT,
  SYS_STATUS, BATTERY_STATUS, LOCAL_POSITION_NED, GLOBAL_POSITION_INT and ATTITUDE over UDP
  `127.0.0.1:14550` by default. Fresh `Telemetry` objects per reading; `Clock` injected; no
  `CommandableSource` (ADR-0011) — against real hardware this is monitoring, not control.
  The ground station still defaults to the simulator; `TELEMETRY_SOURCE=mavlink` opts in.
  Adapter tests use recorded frames and a `TestClock` — no socket, no sleeps.
- **The scope has a side view, toggled with the top-down.** The plan view answers *which one
  is that* and *are two about to meet*; it cannot answer **are those two at the same height**,
  and two marks a hand's width apart in plan may be three metres apart vertically and in no
  danger at all. One box, one view, a labelled control to swap — stacking a second picture
  would have undone the 600 px cap the week it landed. A metre up is the same length as a
  metre across, because a stretched vertical axis makes two Drones look separated when they
  are not. Top-down on every load; the choice is not remembered. A Drone that cannot measure
  its height is left out and named rather than drawn on the ground line, which would say it
  had landed when the truth is that it cannot say. See
  [ADR-0016](./adr/0016-a-side-view-on-the-scope.md), including why the ground line is not the
  flight area ADR-0012 defers.
- **Every flight strip carries X, Y and Z.** `X 2.4 m E · Y 1.1 m N · Z 1.7 m`, on its own
  line beneath the head row — never inside it, because §4.4 justifies the whole strip format
  on the eye learning fixed positions and three more numbers in the head row would push charge
  and response age sideways. Each axis carries its letter *and* its direction, so the letters
  are learnable without being the only key. A Drone that has reported no position gets no line
  at all rather than a row of dashes, and a height that was never reported reads `Z not
  reported` rather than `0.0` — an airframe with no barometer and one on the floor are
  different facts (§11.1). At exactly zero no direction is claimed, since 0 m east and 0 m
  west are the same place. The same readout is in the Drone detail dialog. This required
  `docs/DESIGN.md` §1.2 to be **narrowed**: numbers are still not the primary language, and
  position is carried in addition to the instruction rather than instead of it.

### Removed

- **Settings no longer has a records panel or a keyboard panel.** Export, Import and Clear
  everything are withdrawn with the first of them. Notes, service decisions and lesson records
  stay exactly where they were — in one browser profile — but every route to moving them to
  another laptop, or to clearing them short of clearing site data, is gone. That consequence
  was stated and accepted. Settings keeps the ground station block and the scenario controls,
  which `docs/DESIGN.md` §9 requires to live there and nowhere near a Command.
- **The end-of-lesson prompt offering to export a heavy logbook went with them.** It told a
  Teacher their records were getting large and offered the one control that could do something
  about it. With that control deleted the prompt would have been a dead end, and a warning
  with no remedy is worse than no warning.
- **`Ctrl`/`⌘`+K and `Esc` still work, and are now undiscoverable.** The keyboard panel was
  the only place on the board that said they existed. **This is a decision, not an oversight**
  — recorded here so it reads as one at the next accessibility audit. `docs/DESIGN.md` §11.3
  still requires every screen and every Drone to be reachable by keyboard, and they still are;
  what has gone is the documentation of *how*, not the capability.
- **Dead logbook code went with the panels:** `recordsAreHeavy`, `exportLogbook`,
  `recordsSize`, `RECORDS_WARN_BYTES` and `replaceLogbook`, each of which lost its last
  caller. There is no lint here, so an unused export is never flagged and reads as an API the
  next person may build on.

### Changed

- **The whole board speaks in a professional register.** *"3 things need you"* is now *"3
  items require action"*; *"5 of 6 ready to hand out"* is *"5 of 6 serviceable"*; *"Nobody has
  a Drone yet. Hand them out from the Lesson screen."* is *"No Drone is assigned. Assignments
  are made on the Lesson screen."* `CONTEXT.md`'s education-first rule is superseded and says
  so — see [ADR-0015](./adr/0015-a-professional-register.md), which landed before any string
  moved. **What did not change:** every Alert still says what to *do* (§1.2 — the register
  changes the vocabulary, never the grammar of an order), severity is still `Now · Soon ·
  Later`, the classroom nouns are still Teacher, Student, Lesson and Exercise, and the five
  `Status` strings are untouched because they are the type, the wire format and the display
  text at once. The language is English throughout, as it always was; the register moved, not
  the language.
- **The flight strip no longer names a phase.** It read `Level · 2.6 m`, which is the same
  fact twice: a Drone holding 2.6 m is what *Level* means, and the height carries the number
  the word could not. The direction stays — an arrow and a rate answer *is it going up or
  down*, which one height cannot give. A grounded Drone now reads `0.0 m` in a cell that used
  to be empty, because the phase word beside it was the only thing saying where it was.
- **A Drone being watched is now "Under observation", not "Keep an eye on it".** Standing
  airworthiness vocabulary, parallel in grammar to `In service` and `Out of service` either
  side of it, and free of jargon a Teacher would need training on. **The stored `watch` key is
  untouched** — it is serialized into the browser logbook, so renaming it to match the new
  words would silently invalidate every service decision on every Teacher's laptop, with no
  migration and no error. A test now pins the key against exactly that.
- **"End the lesson" is a primary control rather than a ghost button.** It carried a hairline
  border and a transparent fill, for the one control a Teacher has to find across a room at
  the moment a class is packing up. It now uses the filled treatment "Start the lesson"
  already had, character for character — the two are symmetrical halves of one lifecycle. Not
  a Status colour: `design.md` §9 reserves colour for exception, and a lesson ending on time
  is the normal path. A test now weighs the pair against each other, since they live in
  different files with separate copies of the class string, which is how they drifted apart.
- **The scope writes each Drone's height under its name, in place of the phase word.**
  *"Level"* said the Drone was holding its height without saying what height; the number is
  the thing a Teacher can act on, and the phase is still on the flight strip in words. An
  airframe that cannot measure height draws no number at all — not a dash, not `0.0 m`, which
  is what a Drone on the floor correctly says. The height comes off `DroneState` rather than
  Vitals, so Reports gets labelled marks too.
- **The scope no longer captions its grid with a cell size.** *"Grid: 0.5 m"* read as a claim
  about what a cell measures on the glass, and every monitor is a different size, so on screen
  it could never be true. The grid itself is unchanged. The symbol keys stay — *Filled =
  flying* says what a mark means, not how big it is.

### Fixed

- **A Teacher on a screen reader is no longer told the scope is a room.** The `<svg>` was
  labelled *"Positions of N Drones in the room"* — the one claim ADR-0014 exists to deny.
  Sighted Teachers see a frame with no walls and read it correctly; a screen reader gave the
  opposite model of the picture, which makes it an accessibility defect rather than a wording
  one. It now reads *"Where N Drones are, looking down"*. `roomExtent` / `RoomExtent` were
  renamed to `scopeWindow` / `ScopeWindow` for the same reason, and the component's own doc
  comment, which still claimed the box was shaped like the room, went with them.
- **The scope's grid holds still, and its cells are square.** The window was the Fleet's own
  extent plus a metre, recomputed on every Fleet State, so the grid shifted, the frame
  reshaped and the number of cells changed on every telemetry tick — while `percentOf`
  renormalised each Drone into that same moving box, which left the Drones looking like the
  stationary thing. Reported as *"the squares move, the dots should move"*, which was exactly
  right. The window is now a square from a fixed ladder of five sizes, growing when a Drone
  leaves it and never shrinking, with cells of half a metre at the default size. A Drone
  beyond the largest window is held on the edge and named, never dropped. (Where it centres,
  and the caption that stated the cell size, both changed again below.) See [ADR-0014](./adr/0014-a-fixed-scope-window.md) for why a fixed window is
  not the flight area ADR-0012 deferred; without that distinction written down, the next
  reader deletes this.
- **The scope is an aid again, not the whole screen.** Making it square made it 1216 px tall
  at 1440 px, which put every flight strip below the fold — the strips are where a Teacher
  works, so that had the priority backwards. It is capped at 600 px and centred, in rem so
  LARGE FORMAT still grows it. All six strips are visible again without scrolling.
- **The scope frames the Drones instead of the setup point.** The window used to centre on
  the origin, so a Fleet set up in a corner drew in a corner with half the picture empty —
  and the wasted half pushed the marks together. It now centres on the middle of the Fleet,
  with the centre snapped to a whole cell so the grid still cannot drift, and it is only
  reconsidered when a Drone actually leaves it. The demonstration Fleet went from a 12 m
  window to an 8 m one for the same six Drones.
- **The scope's labels stop colliding on a phone.** Six labels in a short strip ran into one
  unreadable line at 390 px — the bug recorded in `Scope.tsx` found once before. Below 640 px
  a mark now shows only its Drone Name; the phase goes, because it is three times the width
  and is already on that Drone's flight strip further down the same screen. The name stays at
  every width, since answering *"which one is that"* is the whole reason the scope exists.
- **`npm test` is deterministic again.** Every component test that rendered a demonstration
  Fleet ran the real simulator with `Math.random` and spontaneous events switched on, so a
  Drone could take off unasked or drop its link on a 0.2%-per-tick roll in the middle of an
  assertion that it was standing still. The suite failed about one run in three and named a
  different test each time — recorded as O7 in `docs/TEST_REPORT.md` as a transient that did
  not reproduce. It reproduces. `LocalFleetOptions` had carried the seam for pinning this
  since it was written; `FleetProvider` simply could not reach it. Five consecutive full runs
  now pass 374 of 374. This matters more than a flaky test usually would: at the time there
  was no CI, so `npm test` run by hand was the whole gate, and a gate that is red one run in
  three has stopped being one.
- **The simulation label is a strip under the bar again, not a white block beside it.**
  `.site-header-shell` was `display: flex` with no axis, so the bar and the label became
  columns of a row. On a phone the label swelled to a quarter of the viewport. The label's
  own rule was always written as a full-width strip; only the axis above it was wrong.
  This is requirement C5 — the one label that exists so a Teacher never presses **Land**
  wondering whether a real aircraft is coming down — so it mattered that it looked broken.
- **The timeline says how much time it covers without garbling it.** It used to build a
  duration by deleting "ago" from an age, which held until the answer was "just now" or
  "yesterday" — neither of which contains the word — and printed *"Covering the last just
  now"* on a freshly started ground station. `formatDuration` in `lib/age.ts` now says a
  span in its own words.
- **The product has one name again.** `d94b160` renamed Flight Deck to Readyboard and
  `44d770f` restored it, but only in the header — ten page titles were still saying
  "TechTech Readyboard". Every tab now reads "… · Flight Deck · TechTech".

### Added

- **Live headcount on Control.** Airborne / grounded counts beside Every Drone.
- **End-period land prompt.** When the Control lesson timer hits zero, a dialog offers sim land-all (altitude 0) or dismiss.
- **Lesson warm-up.** After Start, a 60s countdown overlay on `/lesson` (Skip available); once per lesson id in sessionStorage.
- **Lesson timer on Control.** Same local `LessonTimerBanner` as the camera wall, under the lesson strip.

- **Lesson timer on camera wall.** Local countdown banner above Cameras; Start/Pause/Reset.
- **Walls TV mode (`/walls/tv`).** Toggle Cameras or Status for a classroom display; Exit TV returns to the hub.

- **Walls hub lists Proximity through Spotlight** after those walls landed.

- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **Camera spotlight (/walls/spotlight).** One large CameraPane plus a thumbnail row to switch focus.
- **Dual camera watch (`/walls/dual`).** Two CameraPanes side by side; `?a=` / `?b=` pick Drones (defaults first two).
- **QR pad wall (/walls/pads).** Per-Drone pad Not seen until a sighting store exists.
- **Landing watch (`/walls/landing`).** Focus descending/auto-landing/low airborne craft; else show all with height.
- **Proximity risk wall (/walls/proximity).** Close pairs under SEPARATION_WARNING_M from vitals; display-only.

- **The rule a hardware adapter has to keep is written down as a test.** `CODEBASE_AUDIT.md`
  §8 noticed that `sameFleet` compares Telemetry by reference and judged it worth a test
  rather than a fix. Probing it first found something sharper than the note recorded: the
  ground station keeps the Telemetry object it is handed rather than copying it, so a source
  that fills one buffer and re-emits it — what a serial or MQTT adapter is most likely to do
  — would silently rewrite Fleet States it had already published, and a second reading
  inside the same millisecond would go unpublished. `telemetry-ownership.test.ts` asserts the
  requirement rather than the hazard, so it does not lock the defect in place. The fix, if it
  ever bites, is a copy on ingest. See ADR-0001 for why this is the seam that has to hold.
- **CI, for the first time.** `.github/workflows/ci.yml` runs `npm run typecheck`, `npm test`
  and the static export on every push to `main` and every pull request, on Linux **and**
  Windows — the repository is developed on one and deployed on the other, and every
  path-handling bug it has had lived in that gap. The two gates were always the whole gate;
  what was missing was anything that ran them without being asked. `npm run audit:devices`
  stays out: it needs a real browser and a built board, and belongs in a job somebody
  watches rather than one that blocks a merge.
- **`scripts/shot.mjs` is in the repository.** `CLAUDE.md` has named it as one of the two
  defences against a layout bug the jsdom suite cannot see, while it sat untracked — one
  `git clean` from gone, along with the Chromium-resolution knowledge it carries. It now
  photographs the whole page rather than a fixed 320px crop of the header, says plainly
  when the board is not built or Chromium is missing instead of failing inside Playwright,
  and finds Chromium on macOS and Linux as well as Windows. Shots land in `scripts/shots/`,
  gitignored — evidence for one fix, stale by the next.
- `docs/PLAYBOOK.md` — detected stack, how far behind current, conventions, pitfalls.
- `docs/DESIGN-TOKENS.md` — the design system as actually built, including the two-layer
  token structure that was not written down anywhere.
- First tests for `lib/age.ts` and `SiteHeader`.

### Changed

- **The scope draws the room in proportion, and its labels are readable.** East and north
  were normalised to 0–100 *independently* and the result forced into a 4:3 box, so a metre
  north and a metre east were different lengths on screen — and whether two Drones are about
  to meet is the one question the picture exists to answer. The viewBox is now in metres, so
  the scale is 1 and cannot drift. A 7 m × 2 m classroom draws as 7 m × 2 m instead of filling
  810px of height with empty room.
- **Drone marks are HTML, not SVG text.** Sized in user units they grew with a small room and
  shrank with a large one, ignored the Teacher's browser font size and the large format
  entirely — the one place on the board where a size was not relative (ADR-0008) — and six
  "On the ground" labels in a wide strip overlapped into one unreadable line.
- **A mark on the scope is reachable from a keyboard.** It was a `<g>` with an `onClick`: no
  focus, no role, no name, so the linked selection the scope exists for was mouse-only,
  against §11.3 of `docs/DESIGN.md`.
- **The flight strip has fixed anatomy at last.** `docs/DESIGN.md` §1.1 justifies the
  strip on being "scannable by position rather than by reading", but the row was a
  `flex flex-wrap`: every cell sized by its own content, so a variable-width phase word
  shifted every column to its right. It looked aligned only because every Drone was in the
  same phase. The columns now live on the list and each strip takes them by subgrid, so a
  wide value in one strip cannot move another's. Below the breakpoint the strip wraps, as a
  phone wants.
- **A grounded strip says "On the ground" once.** The phase column and the height column
  beside it both printed it. `formatVerticalMovement` now returns nothing when a Drone is
  not airborne — the phase word already carries the fact — and the empty cell still holds
  its column.

- **One page frame, in two named widths.** Five screens carried five different maxima —
  `6xl`, `5xl`, `4xl`, `3xl`, and `FleetBoard` with none at all — so the content edge moved
  every time a Teacher changed screen, and the Fleet screen rendered two frames at once.
  Instrument screens (Fleet, Control) now share one width and reading screens (Lesson,
  Reports, Students, Settings) another, both from `lib/frame.ts` and enforced by
  `web/page-frame.test.ts` so they cannot drift apart again. See `docs/DECISIONS.md`.

### Removed

- Three unused dependencies: `framer-motion` (every import is `motion/react` — the same
  library under its old name), `@fontsource/inter`, `@fontsource/plus-jakarta-sans` (only
  Schibsted Grotesk and Hanken Grotesk are loaded). And `web/components/Board.tsx`, dead
  since the Vite dashboard was retired (ADR-0010).

### Security

- `next` 16.2.10 → 16.2.11 (July 2026 security release). Hygiene rather than exposure: every
  CVE in that release is server-side, and this build is a static export with no server. `npm
  audit`'s three remaining highs are build-time-only (postcss, sharp) and its autofix
  downgrades to `next@9`; left as-is and recorded in `docs/DECISIONS.md`.

### Also

- `/showcase` no longer opens a WebSocket on the standalone deploy, where there is no ground
  station to reach. It fell back to the demonstration Fleet already, but logged an
  `ERR_CONNECTION_REFUSED` on every load getting there.
