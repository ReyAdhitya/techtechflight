# The local flight deck: one laptop, one switch, the school's own drones

2026-08-17. Rewritten the same day after grilling the owner: the first draft assumed MAVLink
and that assumption was wrong. The school's drones are **DIY, built on ESP32, with firmware
written in-house, signalling over Wi-Fi**. MAVLink is a standard for bought flight controllers
and is not this project's path. The adapter stays in the tree for anyone who ever wants it.

Written after a week in which nothing about teaching broke and everything about hosting did:
Blob suspended for billing, a Cloudflare login that could not complete, a free-plan request cap
hit account-wide in a day. This plan takes the classroom off the internet entirely.

**The goal, in the owner's words:** something ready to plug in, in one setup.

---

## 0. What is known, and what is not

| | |
|---|---|
| Aircraft | DIY, ESP32, firmware written by the school's drone team |
| Radio | Wi-Fi. Nothing is plugged into the laptop |
| Message format | **The drone team decides.** This project adapts |
| MAVLink | Not the path. Not needed. Not deleted |
| **The dangerous unknown** | **Whether the aircraft transmits anything back at all** |

That last row governs everything in Phase 3. The board is built on the aircraft talking back:
battery, height, position, airborne, points reached. A one-way link — handset to aircraft,
nothing returning — means every live reading reads *not reporting* forever, and no code fixes
it. Ask the drone team before Phase 3 is scheduled. The three questions are in §8.

---

## 1. The kit

| Item | What it does | Cost |
|---|---|---|
| Travel router | The classroom's own network. Fixed SSID, so devices and drones find it without school IT | ~£25 |
| The laptop | Ground station on `:4321`. Serves the board, holds the classroom, listens for the drones | owned |
| The drones | Already carry an ESP32 with Wi-Fi. **Nothing to add to them** | the drone team's |
| iPads | The children's screens, joined to the same router | owned |

```mermaid
flowchart TB
  subgraph room["The room. No internet."]
    router["Travel router<br/>one SSID"]
    laptop["Laptop, static IP<br/>:4321 board + classroom<br/>:14555 drone messages"]
    drones["The drones<br/>ESP32, own firmware<br/>one id each"]
    ipads["iPads<br/>http://10.0.0.2:4321"]
  end
  drones -- "small Wi-Fi messages :14555" --> router
  ipads -- "HTTP" --> router
  router -- "all traffic" --> laptop
```

**Why a router rather than the school Wi-Fi.** An ESP32 cannot join WPA-Enterprise, which is
the username-and-password kind nearly every school runs. Client isolation then blocks the iPads
from reaching the laptop, and a captive portal blocks both. Three walls, none of them arguable
with on the morning of a lesson. The drones need an ordinary WPA2 network with a fixed name and
password, and that is what £25 buys.

---

## 2. Phase 0 — prove the network. No code.

Everything below assumes an iPad can reach the laptop. If it cannot, the answer is a router,
not a rewrite.

- Laptop and iPad on one network. `ipconfig` for the laptop's address.
- On the iPad, open `http://<laptop-ip>:4321`. The board loads, or it does not.
- Try it on the school network **and** on the router. Write down which worked.
- Give the laptop a static address on the router. The board's URL then never changes and can be
  printed on a card taped to the trolley.

---

## 3. Phase 1 — the classroom store moves into the ground station

The store is about ninety lines of Worker code. It moves to `ground-station/src/server.ts` as
`GET/PUT /api/classroom`, backed by a JSON file beside `classroom-source.json`.

```mermaid
flowchart LR
  subgraph before["Today"]
    b1["Board"] --> net["The internet"]
    i1["iPad"] --> net
    net --> cf["Cloudflare store<br/>100,000 requests a day<br/>account, token, cap"]
  end
  subgraph after["After Phase 1"]
    i2["iPad"] -- "one hop" --> gs["Laptop · :4321<br/>board · /api/classroom · classroom.json"]
  end
```

### Work

1. **Port the merge, do not rewrite it.** The Worker settles seats on `rev`, seat by seat, ties
   to the store's copy, and refuses nothing. The ground station runs the same rules.
   `web/standards.test.ts` already refuses two runtimes drifting apart — extend it to a third.
   **Never settle any of it on `updatedAt`:** a board and a tablet do not share a clock, and
   that is the bug that made a correct tablet invisible for three days.
2. **Persist to disk.** A crash mid-lesson must not lose who is on which Drone.
3. **Default to same origin when the board was served by a ground station.** The built-in
   Cloudflare URL stays for the hosted copies; `techtechflight:classroom-sync-url` stays as the
   override.
4. **Slow the poll.** Every device asking every 2.5 s is what emptied the Cloudflare allowance:
   thirty iPads is 43,200 requests an hour. Back off when nothing has changed, and do not poll
   at all before a Mission starts.
5. **Fix two lies on the classroom code panel.** It names `BLOB_READ_WRITE_TOKEN`, dead since
   2026-08-12, and it says "not configured" when it means "the store refused me". A Teacher
   cannot tell those apart, and that hid a broken sync for three days.

### Not in scope

The Logbook. It stays in the browser and the Neon copy stays the copy (ADR-0034).

---

## 4. Phase 2 — one switch

- One `.bat`: ground station up, real Fleet selected, board opened on `localhost`.
- It prints the iPad address and renders a QR for it. Nobody types an IP in front of a class.
- **The board runs on `localhost`, not the LAN address.** `getUserMedia` is refused on a plain
  `http://` address that is not localhost, so the camera breaks in a way that reads as a
  permissions bug.
- **No demo fallback.** With no Fleet connected the board says so. It must not quietly simulate
  one and look like it is working.

---

## 5. Phase 3 — the open door

Not MAVLink. **A door on the laptop that accepts small Wi-Fi messages**, so that whatever the
drone team builds can reach the board without this project depending on their decisions.

```mermaid
flowchart LR
  drone["Drone ESP32<br/>own firmware"] -- "UDP :14555<br/>small JSON" --> src["EspTelemetrySource<br/>fleet-adapters<br/>node:dgram"]
  src --> fleet["Fleet<br/>fleet-core"]
  fleet -- "socket" --> board["Board"]
  board -. "Land · Hover · Stop<br/>NOT IMPLEMENTED" .-> src
```

### The packet

One object per aircraft per tick, roughly 2 Hz. Only `id` is required.

```json
{ "id": "drone-3", "battery": 0.74, "height": 2.1, "east": 1.2, "north": -0.4, "airborne": true }
```

Ten lines on their side, no library:

```cpp
udp.beginPacket(LAPTOP_IP, 14555);
udp.printf("{\"id\":\"drone-3\",\"battery\":%.2f,\"height\":%.2f}", batt, alt);
udp.endPacket();
```

### Rules the door obeys

- **Every field except `id` is optional, and absent means "cannot report".** Never a zero. The
  contract already distinguishes absent from null and the board already says both in words.
- **An id the Fleet does not know is not invented into existence.** Registration comes from
  config, the way the ground station registers a set today, so a stray packet cannot add an
  aircraft to a Teacher's board mid-lesson.
- **Silence is said out loud.** Last-heard drives *not reporting*; readings are never frozen and
  shown as though current.
- **Malformed packets are dropped quietly**, size-capped, and never crash the ground station. A
  classroom full of half-written firmware is the normal case, not the edge case.
- The sender's address is remembered per id. Phase 4 needs somewhere to send a reply.

### Why this cannot be wasted work

It assumes nothing about the drone team's radio, handset, or naming. If they invent their own
format, somebody writes a thirty-line translator. If they surprise everyone and use MAVLink,
that adapter is already in the tree. It is testable with no aircraft in the room: send packets
from the laptop itself and watch the board.

---

## 6. Phase 4 — commands that really work

Its own ADR, after Phase 3 has flown. Phases 1 to 3 need no undoing: Phase 4 is a new
implementation of an existing seam, `CommandableSource`, which the simulator satisfies and
hardware does not (ADR-0011). Owning both ends of the wire makes this *simpler* than MAVLink
would have been — the drone team defines what a command looks like — and no easier to make safe.

**Answer these in the ADR before any code:**

- **What does Stop mean in the air?** Cutting motors makes a drone fall. Above a class of
  children that is worse than the problem it solves. Stop probably has to mean *land now* — and
  then the word on the button is wrong and must change.
- **What happens when the message is lost?** UDP does not deliver reliably. The Teacher pressed
  Land. Did it land? The board must not claim an outcome it cannot see, so a command needs an
  acknowledgement or the screen has to stay honest about not knowing.
- **What if the child is still on the sticks?** Two inputs, one aircraft. Decide who wins, and
  make it the same answer every time.
- **What if the wrong aircraft answers?** Two drones flashed with the same id is a Command
  reaching the wrong child's aircraft. Ids must be unique and checked.

---

## 7. What must not break

- Students never get a Command. Exactly two pressable things on the tablet (ADR-0025).
- Phases derive from records and Telemetry, never from a press.
- No invented readings. Absent is said in words, never a zero and never a dash.
- No GPS, no map tile. Metres from the Fleet's own origin (ADR-0019).
- The browser stays the record; the database is the copy (ADR-0034).

---

## 8. Send these three to the drone team

Nothing in Phase 3 can be scheduled until these are answered. They are deliberately short.

1. **Does the drone send anything back to the ground — battery, height, position — or does the
   link only go from the controller to the aircraft?** If nothing comes back, the Teacher's
   board can show the lesson but never a live reading.
2. **If it does send something back: what does the message look like, and how often?** Any
   format is workable. We need one example packet and the rate.
3. **Can each aircraft carry a fixed id that never changes** (drone-1, drone-2 …), so the board
   can tell six identical airframes apart?

A useful thing to offer them, even though they decide: *"send this to the laptop on UDP 14555 at
2 Hz and it will work"*, with the packet and the ten lines above. Concrete beats asking someone
to choose.

---

## 9. Still the owner's to decide

| Decision | Blocks |
|---|---|
| Router, or the school network. Test it, buy the router anyway | Phase 0 |
| How many aircraft in one lesson | board layout, message rate |
| Whether iPads need the camera. If yes, the laptop needs a certificate the iPads trust | Phase 2 |
