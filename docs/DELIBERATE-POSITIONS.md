# Deliberate positions

Six things about this board look like defects and are not. Each was decided on purpose, and
each has been "fixed" by someone at least once before the reason was found.

They are collected here because they are easy to trip over and expensive to undo. `docs/adr/`
and `CONTEXT.md` remain the authority — this file points at them, it does not replace them.

**If you disagree with one, argue with it in an ADR. Do not quietly correct it.**

---

### 1. Tiles and Control strips never reorder when Status or Alerts change

`web/components/FleetBoard.tsx` · `web/components/ControlScreen.tsx`

Order is by `DroneRegistration.boardOrder` and never by Status or Alert severity. A Teacher
builds muscle memory for where each Drone sits; an element that jumps to the top because it
got worse destroys exactly the glanceability the board exists for. Control rooms reached the
same conclusion independently — see `docs/DESIGN.md` §1.1.

On Control, that means the **Every Drone** list stays put while the **Attention** bar alone
carries urgency (`alertQueue`). Do not restore worst-first strip sorting — it was removed
because live reordering made the list dizzying.

### 2. Colour is never the sole carrier of meaning

`web/components/StatusBadge.tsx`

Every Status, severity and phase carries a **word** and a **shape** as well as a colour. The
board is read on projectors, in daylight, and by colour-blind eyes. ADR-0004 states the rule
without exception.

### 3. Needs Attention renders at zero

`web/components/FleetSummary.tsx`

The count is present when it is nought, so its arrival is a *number changing* rather than an
element *materialising*. A counter that vanishes makes its reappearance a layout event, and
the eye reads layout events as noise rather than as information.

### 4. The amber / coral severity split is reasoned, not arbitrary

`web/app/globals.css`

Roughly 38° against 11° of hue. Two severities that must stay distinguishable to a
colour-blind eye and on a washed-out projector — which is also why **shape carries them
too**: Fault's rail is solid, Not Ready's is interrupted. See `docs/DESIGN-TOKENS.md`.

### 5. Elevation is lightness only — there is no shadow tier

ADR-0004

Surfaces separate by getting lighter, not by casting shadows. Adding a shadow scale would
import a depth model this design does not use and would read as a different product.

### 6. `prefers-reduced-motion` is already handled

`web/app/globals.css`

It is not missing. Motion is removed with nothing lost, per `docs/DESIGN.md` §11.2.

---

## Two more worth knowing

Not from the original six, but the same category — correct, and easy to mistake for an
oversight:

- **`--text-value` is deliberately the same size as `--text-body`.** Data is not small print
  on this surface. Every size is `rem`; a `px` font-size here is a defect (ADR-0008).
- **A Not Ready Drone stays silent about its return** unless the ground station has watched
  the charge actually rise. Null is the resting value, not a missing feature — ADR-0007.
