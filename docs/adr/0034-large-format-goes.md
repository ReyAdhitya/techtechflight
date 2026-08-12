# Large format goes

The **Large format** control is removed: `DisplayScaleToggle`, the
`techtechflight:display-scale` key, the `data-display` attribute, the `--display-scale`
multiplier, the boot-script line that stamped it, and the two style rules that hung off it.

This reverses the second half of
[ADR-0008](./0008-a-relative-type-scale-and-a-large-format.md). **The first half stands and
is the more important one:** every size on this surface is `rem`, spacing included, and a `px`
font-size here is still a defect. That is a WCAG 1.4.4 obligation and it is untouched.

Issue #623 asked for large format, guidance afterwards said keep it, and the owner has now
ruled: remove.

## What it was for, and why that argument no longer carries it

ADR-0008's case was that the room decides how big the board has to be, and a classroom with
the board projected at the front is not the condition a laptop on a desk is designed for.
That is still true. What has changed is that this control was never the answer to it:

- **The multiplier is 1.375, and ADR-0008 already said that was not enough.** Its own text
  records `reference/glanceability.md` measuring it as buying roughly one metre of viewing
  distance, "well short of the projector this exists for", and says raising it is a decision
  for its own ADR. Nobody wrote that ADR. So the control shipped at a value its own decision
  record described as insufficient for the case it existed to serve.
- **The browser already does this, and does it better.** `rem` throughout means a Teacher who
  turns their browser up gets the whole board bigger, at whatever size they actually need,
  remembered by the browser across every site they use, and reachable by a keyboard shortcut
  they already know. A second control that offers one fixed step of the same thing is a worse
  copy of a feature the platform ships.
- **It cost a permanent button in the header.** The header is the room controls and nothing
  else, and every button in it is read past by a Teacher looking for Settings, forty times a
  day. A control that duplicates the browser's own zoom is not worth that space.

## What this does not change

- **Every size stays relative.** `rem`, always. This ADR removes a multiplier on the root font
  size; it does not put pixels back.
- **The projector case is still real and is still served** — by the Teacher's own browser
  zoom, which was always doing most of the work.
- The comments in `FleetBoard`, `StatusBadge` and `Scope` that explained why a measurement is
  in `rem` are kept and reworded: the reason is now the Teacher's own font size rather than a
  control that no longer exists.

## When this ADR is wrong

If a school reports that browser zoom is unavailable to them — a kiosk build, a locked-down
managed browser, a projector driven by something without a zoom control — then the platform is
not in fact providing this and the board has to. The fix then is not this toggle back: it is a
size the owner has actually measured against the room it is for, which is the ADR ADR-0008
asked for and nobody wrote.
