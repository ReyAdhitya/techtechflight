# Three colours, three meanings

On the Scope and on the Mission area editor:

- **Blue dashed** is the classroom boundary. `--color-info`, the shared blue.
- **Red hatched** is a No-fly Zone. `--color-status-fault`, unchanged.
- **Amber means something needs you**, and nothing else.

This matches the customer's own poster, where the boundary is blue dashed and No-fly Zones
are red hatched, so a Teacher who has read the poster already knows the picture.

## What was wrong

The classroom boundary was drawn in `stroke-status-not-ready` — the amber the board uses for
*this needs attention*. It is the only coloured thing on the top-down that never changes: it
is there before the lesson, during it, and after it, in every screenshot and on the projector
all morning.

A colour a Teacher sees continuously stops being a signal. Training somebody for forty
minutes that amber is the shape of the room is training them to skim past the amber an Alert
arrives in, and Alerts are the thing on this board that must not be skimmed. ADR-0004 already
says colour is never the only channel; this is the other half of that rule, which is that a
channel used for everything carries nothing.

## Why blue, specifically

It is the token that already exists (`--info`, #356a9c light and #6aa7dc dark), it is on the
customer's poster, and it is the one hue on this board with no Fleet Status meaning attached:
`ready`, `flying`, `offline`, `not-ready` and `fault` are all spoken for, and the boundary is
not a status. It is furniture, and it is now allowed to look like furniture.

## What did not change

- **Red stays red.** No-fly Zones were already `status-fault` and hatched, and hatching is the
  non-colour channel ADR-0004 requires.
- **The key says the colour out loud.** *Blue dashed box = classroom boundary*, *Red hatched =
  No-fly Zone*. Naming the colour in the key is what keeps this true for anybody who cannot
  see the difference between them.
- **Nothing alerts from the boundary.** ADR-0014 said the line is orientation only, and it
  still is. Changing its colour does not promote it to a rule.

## The editor draws the boundary too

The Mission area editor now draws the same blue dashed box in the same place. A Teacher
placing a No-fly Zone is placing it against the room, and the room was the one thing that
surface did not show — which is part of how every zone came to be drawn outside the picture.
