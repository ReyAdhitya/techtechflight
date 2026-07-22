# Building good web apps and UI — Resources

## Knowledge

- [Article: "How to fix a bad user interface" — Scott Hurff](https://www.scotthurff.com/posts/why-your-user-interface-is-awkward-youre-ignoring-the-ui-stack/)
  The primary source for the UI Stack: Ideal, Empty, Error, Partial, Loading. Builds on
  37signals' earlier "Three State Solution". Use for: enumerating what a screen can be
  before deciding how it should look.

- [Article: "Designing Empty States in Complex Applications: 3 Guidelines" — Nielsen Norman Group](https://www.nngroup.com/articles/empty-state-interface-design/)
  Communicate system status, provide learning cues, provide direct pathways. Research-backed
  rather than opinion. Use for: what to actually put on a screen with nothing on it.

- [Video: "Empty States in Application Design: 3 Guidelines" — Nielsen Norman Group](https://www.nngroup.com/videos/empty-states-in-application-design-guidelines/)
  The same material in six minutes. Use for: a fast refresher.

- [Reference: `grid-template-columns` — MDN](https://developer.mozilla.org/en-US/docs/Web/CSS/grid-template-columns)
  The normative definition of `auto-fit` versus `auto-fill`, which decide how a grid behaves
  when it holds fewer items than it has room for. Use for: partial-state layout.

- [Spec: WCAG 2.2 Understanding Resize Text (1.4.4)](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)
  Why px-based type scales is a real accessibility problem, not a stylistic preference.
  Use for: a future lesson on the type scale in `tokens.css`.

## Wisdom (Communities)

Not yet discussed with Reysendrya — propose once there is work worth showing. Candidates,
in order of signal:

- [r/UI_Design](https://reddit.com/r/UI_Design) — critique-friendly, low on portfolio spam.
  Use for: posting a screenshot of the board and asking what reads first.
- [Designer Hangout](https://www.designerhangout.co/) — invite-only Slack, high moderation.
  Use for: practitioner answers rather than opinions.

## Gaps

- Nothing yet on **instrument panels and glanceable displays specifically** — dashboards
  read at a distance under time pressure. Most UI writing assumes a seated user with
  attention to spare. Aviation and control-room human factors literature is the likely
  place to look.
- Nothing yet on **motion**, one of the four layers in scope.
