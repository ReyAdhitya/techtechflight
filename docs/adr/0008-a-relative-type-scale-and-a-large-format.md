# The type scale is relative, and the board has a large format

ADR-0006 added a light theme on the grounds that the room decides what is readable. This
carries the same argument to size: the room also decides how big the board has to be, and
a lit classroom with the board projected at the front is not the condition a laptop on a
desk is designed for.

Two changes, and the first is what makes the second possible.

## The scale is in rem, not px

Every size token was a hard pixel value. That is a WCAG 1.4.4 failure rather than a
stylistic preference: a Teacher who has told their browser they need larger text was
being overruled by the board, silently, on the one screen they have to read across a
room.

The ratios ADR-0004 settled on are unchanged and every size renders identically at a
default 16px root. This is the same scale, expressed in a unit that can be scaled.
Spacing moved with it, so a board whose type grows is not cramming larger text into gaps
that stayed still — including the grid's minimum tile width, which was the last hard
pixel measurement left and would otherwise have been the one thing that ignored the
change.

## Large format is a multiplier, not a second set of values

`--display-scale` multiplies the root font size — `calc(100% * var(--display-scale))`.
`100%` is whatever the Teacher's browser was already told, so the control magnifies their
preference rather than replacing it. A second set of larger tokens would have discarded
it, reintroducing the accessibility problem at exactly the size where it hurts most.

One number moves the whole board, because the whole board is expressed in rem.

Below roughly 26rem the two largest values step down and the room controls drop out of
their fixed corner into normal flow. A control pinned over a tile hides the one thing the
board exists to show, and a Teacher on a narrow screen has less room to spare, not more.

## The board has one speed of change

Related, and recorded here because it shares the reasoning about the room: every value
that can change while a Teacher is looking now moves at a single shared duration and
easing — a tile's border resolving into amber, a battery filling, a Status word changing
colour, the Needs Attention count.

Transitions, deliberately, not animations. A transition does not run on first paint, so a
board opened on a Fleet that already has two Faults sits still, and only a change that
happens while a Teacher is in the room actually moves. That is the whole point: the count
was already present at zero (ADR-0004) so that news arrives as a number changing rather
than an element appearing, and until now nothing ever made the change perceptible. One
vocabulary of movement does it without adding any element whose job is to carry the news.

Reduced motion already removes all of it globally.

## Consequences

Any new size added to either board has to be in rem, or it becomes the one measurement
that ignores both the Teacher's browser setting and large format.

The pre-paint script that restores the stored size is an optimisation against flashing,
never the source of truth. When the two disagreed the board was one size while the
control offered to switch to the size it was already in, and pressing it went the wrong
way — so the client re-applies the stored value on mount, and storage, document and label
agree by construction.

Large format is not a substitute for measuring. Whether the board actually reads across a
classroom is still an untested claim; this gives it a fighting chance and a thing to test.
