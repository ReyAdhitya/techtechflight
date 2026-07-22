# Glanceability: what the standards actually say

`DroneTile.tsx` says the tile reads "from a few steps away". `display-scale.ts` says the
large format is "for a projector or a board read from across the room". ADR-0008 admits
the claim is untested and calls it "a thing to test". This is the reading behind that
test: the published numbers that would confirm the claim or kill it, and what they say
about the board as it stands.

Two things to say up front about method. First, every figure here is angular. A
standard never specifies a font size, because a font size means nothing without a
distance; it specifies the angle a character subtends at the eye, in minutes of arc, and
the designer works back to a size once the distance is known. Second, the conversion from
CSS pixels to angle uses the W3C's own definition rather than a guess: the CSS reference
pixel "is the visual angle of one pixel on a device with a device pixel density of 96dpi
and a distance from the reader of an arm's length", and "for a nominal arm's length of 28
inches, the visual angle is therefore about 0.0213 degrees"
([W3C CSS Values and Units Level 4](https://www.w3.org/TR/css-values-4/#reference-pixel)).
0.0213° is **1.278 arc minutes**, so one CSS pixel subtends 1.278′ at 711 mm and
1.278 × (711 / d) arc minutes at any other distance d in millimetres. Everything below
follows from that one conversion.

Character height in every standard cited here means **x-height**, not font size.
ANSI/HFES 100 is explicit: "The height of a character is typically specified by the height
of the lower-case x character". AVIXA's element height for text is likewise "with text:
lowercase letter". The two faces on this board were measured from their own font files:
Hanken Grotesk has an x-height of 0.493 em and a cap height of 0.697 em; Schibsted Grotesk
0.5273 em and 0.7031 em. So 16px of Hanken gives a 7.9px x-height, not 16px, and using the
font size in place of the x-height overstates legibility by roughly a factor of two.

---

## 1. Legibility at distance

### The threshold and the comfortable minimum

The clearest statement comes from the human factors standard for computer workstations.
The draft ANSI/HFES 100 revision, published by HFES itself, states: "The minimal x height
in body text should be 16 arcmin. Comfortable, efficient reading requires minimally 22′ of
arc". It also gives an upper bound — "character size should be below 30′ of arc to avoid
slowing down reading by reducing the number of characters that can be viewed foveally
during a fixation" — and two exceptions that matter here: "Where speed of recognition is
unimportant, such as footnotes and subscripts and superscripts, character height can be as
low as 12′ of arc; warnings and other essential information require larger characters to
ensure accurate and speedy recognition"
([BSR/HFES 100 draft, HFES](https://higherlogicdownload.s3.amazonaws.com/HFES/42fffbb4-31e1-4e52-bda6-1393762cbfcd/UploadedImages/Technical_Standards_Docs/ANSIHFES_100-2019_V2.pdf)).

The FAA's human factors handbook gives 20–22′ from a different direction, as the preferred
rather than the minimum: "As the preferred character size for readability is 20-22 arc
minutes, the size of the characters on the display will need to be larger to maintain the
preferred character size at greater distances" (HFDS §5.1.2.15, citing ANSI 1988). The
same document sets a hard floor for symbols on flat panels — "The height of alphanumeric
characters and geometric or pictorial symbols shall subtend a visual angle of at least 15
min" (§5.6.1, from MIL-STD-1472F)
([FAA Human Factors Design Standard, Chapter 5](https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch5_Displays_and_printers.pdf)).

So: **16′ is threshold, 22′ is comfortable, 30′ is the point past which larger stops
helping.** Three independent bodies land in the same band.

### The 1:200 rule, in its citable form

The "1:200" signage rule is folklore in the form it is usually quoted, but it exists as a
published constant. AVIXA's DISCAS standard defines two viewing categories and gives each
an acuity factor: "The Acuity Factor for Basic Decision Making is 200. The Acuity Factor
for Analytical Decision Making is 3438"
([AVIXA, Learn More About Display Size](https://www.avixa.org/resources/display-image-size-calculators/learn-more-about-display-size)).
AVIXA's own CTS training material shows the arithmetic: farthest viewer distance = image
height × percent element height × 200, worked as "For 2%EH: 36.8 x .02 x 200"
([AVIXA CTS-Prep, Aspect Ratio and DISCAS](https://avcdn.azureedge.net/production/docs/default-source/default-document-library/cts-prep-aspect-ratio-and-discas-apr2020.pdf?sfvrsn=56494d78_2)).

Rearranged, Basic Decision Making requires **element height ≥ farthest viewer distance /
200**. 1/200 radian is 17.19 arc minutes — which sits between the HFES threshold of 16′ and
its comfortable 22′. The signage rule and the workstation standard are the same number
seen from two sides, and that agreement is the strongest single result in this document.

The Analytical factor of 3438 is 1 radian expressed in arc minutes, so ADM simply requires
one display pixel to subtend one arc minute — the classical line-resolution limit, which
AVIXA states as "5 minutes of arc for optotype, 1 minute of arc for line". ADM is for
"the finest of details" and is not the right category for a status board; BDM is.

### The 4-6-8 rule

The 4/6/8 rule survives in manufacturer guidance but is a rule of thumb rather than a
current standard, and AVIXA's DISCAS supersedes it for AV design. The nearest citable
form is in MIL-STD-1472F via the FAA handbook, and it is stated as a *ratio to screen
diagonal*, not height: "The ratio of viewing distance to screen size (measured diagonally)
shall be not more than 8:1 and not less than 2:1. The optimum ratio is 4:1; the preferred
range is not less than 3:1 or more than 6:1" (HFDS §5.7.2.3). Note that this constrains the
room, not the type. It tells you where to put the back row; it does not tell you how big
`--text-tile-name` has to be. Only the arc-minute rules do that.

### What this board actually measures

Sizes are read from `web/app/globals.css` at a default 16px root, converted through the
CSS reference pixel and the measured x-heights. Figures are x-height in arc minutes;
the summary count is a numeral, so it is measured at cap height.

| Element | Size | 0.7 m | 1.5 m | 2 m | 3 m | 5 m |
|---|---|---|---|---|---|---|
| Fleet summary count | 2.75rem Schibsted | 39.5′ | 18.7′ | 14.1′ | 9.4′ | 5.6′ |
| Tile name | 1.5rem Schibsted | 16.2′ | 7.7′ | 5.8′ | 3.8′ | 2.3′ |
| Status badge word | 1rem Hanken | 10.1′ | 4.8′ | 3.6′ | 2.4′ | 1.4′ |
| Value / age line | 0.875rem Hanken | 8.8′ | 4.2′ | 3.1′ | 2.1′ | 1.4′ |
| Label (uppercase) | 0.75rem Hanken | 7.6′ | 3.6′ | 2.7′ | 1.8′ | 1.1′ |
| Status badge dot | 11px | 14.1′ | 6.7′ | 5.0′ | 3.3′ | 2.0′ |
| Status border | 1px | 1.28′ | 0.61′ | 0.45′ | 0.30′ | 0.18′ |

The summary count is the only element that clears 16′ beyond about a metre, and only just.
The tile name clears the 16′ threshold at arm's length and nowhere else. The status badge
word — the element that names the Status in words, which the whole design leans on as the
signal colour is not allowed to carry alone — is at **10.1′ at arm's length**, below the
threshold for body text at the distance the board is nominally designed for. At three
steps back it is at 2.4′, roughly a fifth of what it needs.

"A few steps away" is not a supported claim at the present scale. At 1.5 m nothing on the
board except the summary count reaches even the 16′ threshold.

### What it would take

Working back from 16′ and 22′, at a 16px root:

| Distance | Tile name (Schibsted) | Status word (Hanken) | Summary numeral |
|---|---|---|---|
| 1.5 m | 3.1rem / 4.3rem | 3.3rem / 4.6rem | 3.2rem at 22′ |
| 2 m | 4.2rem / 5.7rem | 4.5rem / 6.1rem | 4.3rem at 22′ |
| 3 m | 6.3rem / 8.6rem | 6.7rem / 9.2rem | 6.5rem at 22′ |
| 5 m | 10.4rem / 14.3rem | 11.2rem / 15.3rem | 10.8rem at 22′ |

The first figure in each pair is the 16′ threshold, the second the 22′ comfortable
minimum. Large format multiplies by 1.375, which moves the tile name from 1.5rem to
2.06rem — enough to hold the 16′ threshold at about 0.97 m, and no further. **The large
format as specified buys under a metre.**

For a projector the arithmetic runs in millimetres rather than reference pixels, because
the physical size is set by the throw and not by the display's dpi. With a 1920 CSS px
viewport projected to a 2.4 m wide image, one CSS pixel is 1.25 mm. Basic Decision Making
then requires:

| Farthest viewer | BDM element height | in CSS px | Body font | Display face |
|---|---|---|---|---|
| 3 m | 15 mm | 12 px | 1.5rem | 1.4rem |
| 5 m | 25 mm | 20 px | 2.5rem | 2.4rem |
| 8 m | 40 mm | 32 px | 4.1rem | 3.8rem |

A projector is far more forgiving than a monitor read across a room, which is worth saying
plainly: the same board that fails at 3 m on a laptop screen passes comfortably at 5 m
projected at 2.4 m wide. The two conditions in the code comment are not one condition, and
should not be served by one number.

---

## 2. Preattentive channels and the periphery

### What is preattentive, and how fast

The canonical survey is Healey and Enns, *Attention and Visual Memory in Visualization and
Computer Graphics*, IEEE TVCG 18(7), 2012
([PubMed 21788672](https://pubmed.ncbi.nlm.nih.gov/21788672/)). Healey's accompanying
reference page gives the operational definition — "tasks that can be performed on large
multi-element displays in less than 200 to 250 milliseconds (msec) are considered
preattentive" — and lists the features: line orientation, length and width, closure, size,
curvature, density and contrast, numerosity, hue, intensity, intersection, terminators, 3D
depth cues, flicker, direction of motion, velocity of motion
([Healey, Perception in Visualization, NC State](https://www.csc2.ncsu.edu/faculty/healey/PP/)).

There is a documented asymmetry between channels: "Background variations in colour
interfere with a viewer's ability to identify the presence of individual shapes" while
"random variations in shape have no effect on a viewer's ability to see colour patterns",
and separately a "luminance-on-hue preference". The practical rule Healey draws is "the
most important data attributes should be displayed with the most salient visual features".

**Colin Ware's *Information Visualization* is the source the brief asked for and I could
not verify it directly.** It is not open access and no legitimate full text was reachable.
Nothing below rests on it.

### The border question

The brief asks how a thin border colour change ranks against size, area fill, position and
motion. **No published ranking answers that question in that form.** The preattentive
literature ranks *features*, not *feature carriers of a given size*; hue appears in every
list of preattentive features, so on a naive reading a coloured border is a strong signal.
That reading is wrong, and the reason is spatial rather than attentional.

Human colour vision has a much lower resolution limit than luminance vision. Mullen's
measurement is the standard citation: the red-green and blue-yellow contrast sensitivity
functions are low-pass, and "the limiting acuities based on red-green and blue-yellow
colour discriminations are similar at 11 or 12 cycles/deg"
([Mullen 1985, *J. Physiol.* 359:381–400](https://physoc.onlinelibrary.wiley.com/doi/10.1113/jphysiol.1985.sp015591)).
At 12 cycles per degree the period is 5′ and a single bar is 2.5′ wide. **A coloured line
narrower than about 2.5 arc minutes cannot be resolved as coloured at all**, whatever its
hue.

ANSI/HFES 100 says the same thing in design language: "Luminance contrast is required
because purely chromatic contrasts have poor visibility (Anderson, Mullen, & Hess, 1991;
Chen & Yu, 1996; Legge et al., 1987; Legge et al., 1990; Mullen, 1985; Sekiguchi, Williams,
& Brainard, 1993)."

Converted to CSS pixels, a border must be at least this wide before its colour can be
resolved:

| Distance | 2.5′ (chromatic limit) | 5′ (twice the limit) |
|---|---|---|
| 0.7 m | 2.0 px | 3.9 px |
| 1.5 m | 4.1 px | 8.3 px |
| 2 m | 5.5 px | 11.0 px |
| 3 m | 8.3 px | 16.5 px |
| 5 m | 13.8 px | 27.5 px |

**The board's 1px border is below the red-green chromatic resolution limit even at arm's
length**, at 1.28′ against a limit of about 2.5′. It is not a weak signal at distance; it
is a signal that was never above the chromatic threshold. Whatever a Teacher perceives from
a Fault tile at desk distance, they are not perceiving the border's hue — they are
perceiving a slight darkening of a hairline, which is a luminance cue that carries no
severity information at all. Coral and amber both darken the hairline by about the same
amount: the Fault border is 4.07:1 against the hairline it replaces and the Not Ready
border is 4.51:1, so as a luminance signal the two Statuses are nearly identical and, if
anything, inverted.

### Peripheral vision

The "corner of the eye" case is better than folklore suggests, and the correction matters
because it points at the right fix. Rosenholtz's review is direct about this: peripheral
colour judgements are "quite reasonable, so long as the patches are sufficiently large",
and threshold letter size "increases roughly linearly with eccentricity" with a modest
slope. Scaling for cortical magnification gives a factor of 0.27E + 1 at eccentricity E in
degrees (Horton & Hoyt 1991), so at 10° off fixation a stimulus needs to be about four
times foveal size — not the order-of-magnitude collapse usually assumed. The dominant limit
is not acuity but crowding: "the critical spacing is approximately 0.4 to 0.5 times the
eccentricity for a fairly wide range of stimuli (Bouma 1970, Pelli et al. 2004)". And
motion is the channel that genuinely survives: detecting unreferenced motion "hardly falls
off at all by 10° eccentricity (Levi et al. 1984)"
([Rosenholtz 2016, *Annual Review of Vision Science* 2:437–457](https://www.annualreviews.org/content/journals/10.1146/annurev-vision-082114-035733)).

Two consequences for this board. Peripheral colour works if the patch is large, so an
area-fill Fault treatment would be caught out of the corner of the eye where a hairline
never will. And at 10° eccentricity — roughly a tile's width away on a laptop — the
critical spacing of crowding is 4–5°, which is wider than a whole tile: the badge dot, the
Status word and the drone name are all inside one crowding zone and cannot be read
independently without a saccade. That is an argument for one large signal per tile rather
than three small ones.

For scale, the 1px border ring is **1.2–1.6% of the tile's area** and the 11px dot is
**0.11–0.18%**, depending on tile size. A 4px border would be about 5–6%. A full-tile wash
is 100%.

---

## 3. WCAG

**1.4.3 Contrast (Minimum)** requires 4.5:1 for text, 3:1 for large text. The rationale is
worth quoting because it explains the whole family of numbers: the 4.5 comes from an ISO
baseline of 3:1 for normal vision multiplied by 1.5 for acuity loss — "A user with 20/40
would thus require a contrast ratio of 3 * 1.5 = 4.5 to 1" — and "20/40 is commonly
reported as typical visual acuity of elders at roughly age 80". The formula's 0.05 constant
is not arbitrary either: "The .05 value used is based on Typical Viewing Flare from
IEC-4WD"
([W3C, Understanding SC 1.4.3](https://www.w3.org/WAI/WCAG22/Understanding/contrast-minimum.html)).
That last point is load-bearing for section 5.

**1.4.6 Contrast (Enhanced)** raises those to 7:1 and 4.5:1, with large text defined as
"at least 18 point or 14 point bold", noted as "approximately 18.5px and 24px"
([W3C, Understanding SC 1.4.6](https://www.w3.org/WAI/WCAG22/Understanding/contrast-enhanced.html)).

Measured against the board's own canvases, in light theme on `#f4f3f0`: Fault 4.83:1, Not
Ready 5.34:1, muted foreground 4.69:1, subtle ink 8.45:1. In dark on `#17130e`: Fault
5.70:1, Not Ready 9.06:1, muted 6.43:1, subtle 10.62:1. These reproduce `design.md` §9
exactly. Every pair clears AA. **No pair clears AAA at 7:1** except the subtle and full ink
steps, which matters if the board is ever read in poor conditions, because AAA is the level
written for exactly that.

**1.4.11 Non-text Contrast** requires 3:1 "against adjacent color(s)" for "visual
information required to identify user interface components and states" and for "parts of
graphics required to understand the content". A tile's status border is a graphical object
required to understand the content, so it is in scope. Measured against both adjacent
colours — the tile fill inside and the canvas outside — the status borders pass: Fault
4.83:1 against canvas and 5.36:1 against the card in light, 5.70:1 and 5.26:1 in dark. Not
Ready passes more comfortably. The neutral hairline does not pass (1.18:1 against canvas),
but the hairline carries no state and is not required by this criterion.

So **the border passes 1.4.11 and is still not fit for purpose.** That is the most useful
thing WCAG says here, and it says it by omission. The criterion has no thickness term.
Its guidance acknowledges the gap without closing it: "best practice would be for authors
to avoid particularly thin lines and shapes, or to use a combination of colors that exceeds
the normative requirements of this success criterion"
([W3C, Understanding SC 1.4.11](https://www.w3.org/WAI/WCAG22/Understanding/non-text-contrast.html)).
Contrast alone cannot certify a signal that is too thin to resolve. **I found no standard
that sets a minimum thickness for a status indicator.** Section 2's chromatic resolution
limit is the closest thing to one, and it is a perceptual finding rather than a normative
requirement.

**1.4.4 Resize Text**: "text can be resized without assistive technology up to 200 percent
without loss of content or functionality"
([W3C, Understanding SC 1.4.4](https://www.w3.org/WAI/WCAG22/Understanding/resize-text.html)).
ADR-0008 already moved the type scale to rem and this is satisfied for type. It is *not*
satisfied for the status signals: `size-[11px]` on the badge glyph, the 1px tile border,
`border-2` on the hollow and half shapes and `outline-[1.5px]` with `outline-offset-[2.5px]`
on the ringed shape are all hard pixels. A Teacher who doubles their browser font size gets
larger words and an identically sized dot and border. ADR-0008's own consequence — "Any new
size added to either board has to be in rem" — is being broken by the four measurements
that carry Status.

**2.5.8 Target Size (Minimum)**: "The size of the target for pointer inputs is at least 24
by 24 CSS pixels", with a spacing exception where "a 24 CSS pixel diameter circle is
centered on the bounding box of each" and the circles do not intersect
([W3C, Understanding SC 2.5.8](https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum.html)).
The Details button is handled: the `after:` pseudo-element brings the pointer target to
44px tall while leaving the visible lozenge smaller, which is deliberate and documented in
the component. No issue found.

---

## 4. Colour vision deficiency

### Prevalence

The cleanest citable statement in a standards document is ANSI/HFES 100's: "8%–10% of males
of European ancestry have difficulty discriminating reds from greens (Pokorny & Smith,
1986)"
([BSR/HFES 100 draft](https://higherlogicdownload.s3.amazonaws.com/HFES/42fffbb4-31e1-4e52-bda6-1393762cbfcd/UploadedImages/Technical_Standards_Docs/ANSIHFES_100-2019_V2.pdf)).
The US National Eye Institute confirms the ordering — deuteranomaly is "the most common
type of red-green color vision deficiency" — but publishes no percentages by type
([NEI, Types of Color Vision Deficiency](https://www.nei.nih.gov/learn-about-eye-health/eye-conditions-and-diseases/color-blindness/types-color-vision-deficiency)).

**The often-quoted split of the 8% into roughly 1% deuteranopes, 1% protanopes, 1%
protanomalous and 5% deuteranomalous appears widely but I could not trace it to a primary
peer-reviewed source within this search.** Treat the 8–10% aggregate as sound and the
per-type breakdown as unverified. For a classroom set at a UK secondary school, one
red-green deficient teacher in a department of twelve is the right order of magnitude, and
that is enough to design against without a precise split.

### Do amber and coral survive it?

Simulated with the Viénot, Brettel and Mollon transform — "Digital video colourmaps for
checking the legibility of displays by dichromats", *Color Research & Application* 24(4),
1999
([Wiley](https://onlinelibrary.wiley.com/doi/10.1002/(SICI)1520-6378(199908)24:4%3C243::AID-COL5%3E3.0.CO;2-3)) —
using the matrices published in the public-domain
[libDaltonLens](https://github.com/DaltonLens/libDaltonLens) implementation, applied in
linear sRGB. Colour differences are CIEDE2000.

| Theme | Vision | Amber → | Coral → | ΔE00 | Contrast |
|---|---|---|---|---|---|
| Light | normal | `#8a5a00` | `#c3391a` | 22.8 | 1.11:1 |
| Light | deuteranopia | `#6b6b00` | `#787800` | **5.1** | 1.20:1 |
| Light | protanopia | `#616102` | `#58581d` | **5.5** | 1.14:1 |
| Dark | normal | `#f5a524` | `#f75a36` | 27.7 | 1.59:1 |
| Dark | deuteranopia | `#c1c111` | `#9f9f25` | **10.3** | 1.46:1 |
| Dark | protanopia | `#b0b026` | `#7a7a38` | **19.6** | 1.95:1 |

Both colours collapse to the same olive-yellow hue under both dichromacies. The severity
distinction survives only as a lightness difference, and in light theme it very nearly does
not survive at all: **ΔE00 falls from 22.8 to about 5**, which is a barely perceptible
difference between two patches seen side by side and effectively no difference between two
tiles seen a screen apart, at distance, without a reference.

Each colour does remain legible *against its own canvas* under simulation — light
deuteranopia gives amber 5.07:1 and coral 4.21:1 on the canvas — so the words stay readable.
What is lost is the amber-versus-coral severity split, which is precisely the distinction
`FleetSummary.tsx` builds `attentionSeverity` to express and which `design.md` §9 defends as
the difference between "a Teacher with charging to do" and "a Drone leaving the set".

**I found no standard that gives a minimum ΔE00 for "distinguishable at a glance across a
room".** CIEDE2000 is standardised (CIE 015 / ISO/CIE 11664-6) as a metric; the threshold
for this task is not. The numbers above are comparative, not pass/fail against a published
line.

The mitigation is already in the codebase and is the right one: `STATUS_PRESENTATION`
gives every Status a distinct shape and a written word, so colour is the third signal. The
finding is not that the palette is wrong. It is that on the summary line — where
`attentionSeverity` switches a colour and nothing else — colour *is* the only carrier, and
under either dichromacy that line says nothing about severity.

---

## 5. Ambient conditions

### The floor, and what raises it

ANSI/HFES 100 sets the display requirement: "The display shall exhibit a contrast ratio of
at least 3 under all office illumination conditions", with the reasoning that "Visibility
improves with increasing contrast up to a contrast ratio of 3, above which it rapidly
levels off". Two adjustments to that floor matter for a classroom. Ageing: "as workers age,
they require more contrast, approaching a factor of 3 at age 65, to produce a given
visibility (Blackwell & Blackwell, 1971)". And, crucially, the interaction with size:
**"With the minimal contrast ratio of 3, character height should be 30′ of arc or larger"**
(Chen & Yu 1996; Legge et al. 1990; Sekiguchi et al. 1993).

That last requirement is the one this board is furthest from. In degraded contrast the
character requirement is not 16′ or 22′ but 30′, which at a 16px root means 6.3rem of body
text at 1.5 m and 12.6rem at 3 m. Contrast and size are not independent budgets. Spending
one does not excuse the other; running short on both compounds.

ISO 9241-303:2011 §5.1.2 is the standard that most directly names this board's condition:
"For larger visual displays, such as those used in office tasks, the preferred viewing
distance is longer — typically 400 mm to 750 mm... **For presentation tasks or projection,
the preferred viewing distance is still larger (typically 2 m to 10 m)**"
([ISO 9241-303:2011 preview](https://cdn.standards.iteh.ai/samples/57992/bddfd91165b444f6b9815a6993feadc5/ISO-9241-303-2011.pdf)).
The comment in `DroneTile.tsx` is describing the 2–10 m regime and the type is sized for
the 400–750 mm one.

**ISO 9241-303's own character-height clause (§5.5.4) and luminance contrast clause (§5.5.2)
are behind the ISO paywall and I could not read them.** The publicly available preview
stops before both. The numbers commonly attributed to it — 16′ minimum, 20–22′ recommended
cap height — match ANSI/HFES and the FAA independently, which is reassuring, but I am not
citing ISO for them.

### Projection

The FAA handbook, drawing on MIL-STD-1472F, gives concrete projection requirements. Ambient
light: "The ratio of ambient light to the brightest part of an image shall not be greater
than 1:10 for black and white images and 2:10 for images with gray scale or color, while
maintaining optimum image luminance. The optimum ratio... is 0:1, and the preferred range is
1:100 to 1:500" (§5.7.2.9). Content-specific luminance ratios: "The minimum luminance ratio
for viewing charts, printed text, and other line work shall be 5:1" (§5.7.2.12), rising to
25:1 for limited-range images and 100:1 for full-range ones. Uniformity: maximum-to-minimum
luminance across the screen "shall be not greater than 3:1" (§5.7.2.7)
([FAA HFDS Chapter 5](https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch5_Displays_and_printers.pdf)).

A monochrome status board is "line work", so the 5:1 system contrast requirement applies —
and that is a *system* ratio measured in the room with the lights on, not a ratio between
two CSS colours. The board's best status pair in light theme is 4.83:1 measured on an ideal
display before any ambient light is added.

The current AV standard for this is ANSI/AVIXA V201.01:2021, Image System Contrast Ratio,
which "defines four contrast ratios based on content viewing requirements" and specifies
that "System contrast ratio measurements are taken in the system's typical use case (e.g.,
classroom with ambient light and a video distribution system throughout the school)"
([AVIXA, Image System Contrast Ratio](https://www.avixa.org/standards/image-system-contrast-ratio)).
**The four numeric thresholds are behind the ANSI/AVIXA paywall and I did not verify them.**
A figure of 50:1 for Analytical Decision Making circulates in the trade press; I am not
repeating it as fact. What is verified and useful is the principle: contrast is a property
of the system in its room, and a hex-pair ratio measured in a browser is an upper bound
that the room only ever reduces.

### How the room reduces it

WCAG's contrast formula already carries a small flare term — the 0.05 is "Typical Viewing
Flare from IEC-4WD" — so extending the same model to a brighter room means increasing that
constant. Adding a veiling luminance V, expressed as a fraction of display white:

| Veiling luminance | Light theme Fault | Dark theme Fault |
|---|---|---|
| 0.00 (WCAG baseline) | 4.83:1 | 5.70:1 |
| 0.05 | 4.05:1 | 3.50:1 |
| 0.10 | 3.53:1 | 2.70:1 |
| 0.20 | 2.89:1 | 2.04:1 |

Light theme drops below AA at a small amount of flare and below the 3:1 floor at V ≈ 0.2.
**Dark theme degrades roughly twice as fast**, which is the expected result — a dark canvas
has almost no luminance of its own, so reflected room light dominates it — and it is a
concrete reason for ADR-0006's light theme beyond the one recorded there.

**The veiling luminance figures above are illustrative, not sourced.** I found no standard
that specifies a veiling luminance for a classroom. The model is WCAG's own; the inputs are
mine, and the only honest use of this table is as a sensitivity analysis showing which
theme is more fragile, not as a prediction of a measured ratio.

---

## 6. What could not be sourced

Recorded so that nobody later mistakes a gap for a finding.

Colin Ware's *Information Visualization* — not open access, not verified, nothing here
depends on it. A published ranking of a thin coloured border against size, area, position
and motion — does not exist in that form; the argument in section 2 is assembled from the
chromatic resolution limit instead. A minimum thickness for a status indicator in any
standard — none found; WCAG 1.4.11 explicitly declines to set one. A minimum ΔE00 for
"distinguishable at a glance" — none found. The per-type breakdown of red-green deficiency
prevalence — widely repeated, not traced to a primary source. ISO 9241-303 §5.5.2 and §5.5.4
— paywalled, not read. The four ANSI/AVIXA V201.01 contrast thresholds — paywalled, not
read. A classroom veiling luminance figure — none found.

---

## 7. What this means for the board

Stating the design condition first, because every number below depends on it. Two
conditions are being conflated and should be separated: **desk, 0.7 m**, which the board
already serves; and **room, 3 m**, which is what "a few steps away" and "across a
classroom" actually mean. A projector is a third and easier case. Pick 3 m as the room
target and the numbers fall out.

**At 3 m, at a 16px root, to reach the 16′ threshold (22′ comfortable in brackets):**

- Tile name: **6.3rem** (8.6rem). Currently 1.5rem.
- Fleet summary count: **4.7rem** to hit 16′ at digit height, **6.5rem** at 22′. Currently
  2.75rem.
- Status badge word: **6.7rem** (9.2rem). Currently 1rem.

Those are large, and they should be read as what they are: a statement that a 3 m board
cannot be the same layout as a 0.7 m board with a multiplier on it. Three or four tiles fit
across a 1080p screen at that scale, not twelve. If the room condition is real, it needs
its own layout, not a bigger version of the desk one.

**The 1.375 large-format multiplier is not enough by roughly a factor of three at 3 m.** It
extends the tile name's 16′ compliance from about 0.72 m to about 0.99 m. To reach 3 m the
multiplier would need to be about 4.2. That is not a tuning change; it is a different
board.

**The large-format toggle currently does nothing on the Next.js board.** `display-scale.ts`
sets `data-display="large"` on the root and `globals.css` declares `--display-scale: 1` and
consumes it in `calc(100% * var(--display-scale))`, but there is no
`[data-display="large"]` rule anywhere in `web/`. The Vite board has it —
`dashboard/src/styles/tokens.css:198` sets `--display-scale: 1.375` — and it was not
carried across in the port. The button toggles, the label flips, the attribute lands, and
nothing changes size. Fix this before measuring anything, or the measurement is of the
wrong board.

**Verdict on the 1px border plus 11px badge as the primary Fault signal: not sufficient,
and not marginal.** Three independent reasons.

The border is below the red-green chromatic resolution limit at every distance including
arm's length — 1.28′ against roughly 2.5′
([Mullen 1985](https://physoc.onlinelibrary.wiley.com/doi/10.1113/jphysiol.1985.sp015591)).
Its colour is never resolved as colour. To carry hue at 3 m it would need to be about 8px,
and about 17px to sit comfortably above the limit.

The 11px badge dot subtends 3.3′ at 3 m against a 15′ floor for symbols
([FAA HFDS §5.6.1](https://hf.tc.faa.gov/hfds/download-hfds/hfds_pdfs/Ch5_Displays_and_printers.pdf)),
and it is 0.11–0.18% of the tile's area. Both it and the border are hard-pixel values that
do not respond to the Teacher's browser font size or to large format, so they are the two
elements on the board that get *relatively smaller* every time a Teacher asks for
something bigger.

And under deuteranopia or protanopia the amber-versus-coral distinction collapses to
ΔE00 ≈ 5 in light theme, so for one Teacher in roughly ten the border's colour would not
separate the two Statuses even if it were wide enough to see.

**What to change, in order of effect per unit of disruption.**

Make the four status measurements relative. `size-[11px]`, the 1px border, `border-2` on
the shapes and `outline-[1.5px]`/`outline-offset-[2.5px]` should be rem, so that ADR-0008's
one number moves them too. This is a small change and it is the precondition for every
other one.

Restore `[data-display="large"] { --display-scale: 1.375 }` in `web/app/globals.css`.

Move the Fault signal onto area rather than outline. Peripheral colour judgement works
"so long as the patches are sufficiently large"
([Rosenholtz 2016](https://www.annualreviews.org/content/journals/10.1146/annurev-vision-082114-035733));
a 1.2% ring is not a patch. This is the change `design.md` §9 explicitly rules out — colour
means exception, fills are for chrome and identity, never for a Drone — so it should be
argued with ADR-0004 and §9 directly rather than slipped in. The argument for it is that a
wash reserved for Fault alone does not make the board polychrome when the Fleet is healthy;
it makes the exception visible when there is one. That is the same position §9 takes,
applied to area instead of hue.

Give the summary line a non-colour carrier for severity. `attentionSeverity` currently
switches only a colour, which under either dichromacy conveys nothing. The rest of the
board is scrupulous about this and this one line is not.

If the room condition is real, ship a distinct room layout rather than a multiplier: fewer
tiles, larger type, Status as area. And if it is not real — if the honest answer is that a
Teacher reads this at a desk and glances at a projector — then delete the comments that
claim otherwise. Either is a good outcome. The current state, where the comment claims a
distance the type cannot serve and the control meant to fix it is disconnected, is the only
bad one.

---

## 8. How to test this

Three procedures, each of which produces a number rather than an opinion.

**The distance test.** Measure and mark 0.7 m, 1.5 m and 3.0 m from the screen with a tape.
Load the board with a Fleet containing at least one Ready, one Not Ready and one Fault, and
note which Drone is which. Stand at each mark and, without approaching, answer three
questions: how many Drones are ready; which Drone needs attention; and whether that Drone
is Not Ready or a Fault. Record the distance at which each answer first becomes wrong or
uncertain. Repeat with a second person who has not seen the Fleet, since knowing the answer
makes the board look far more legible than it is. Run it once at standard size and once in
large format, and if the two results are identical, check that `[data-display="large"]`
exists before concluding anything. To convert a result to arc minutes: measure the physical
height of a lowercase "x" in the tile name with a ruler in millimetres, then
arcmin = 3438 × height_mm / distance_mm. Compare against 16, 22 and 30.

**The blur test.** This substitutes for standing far away and takes seconds. Screenshot the
board at its normal size and apply a Gaussian blur. The radius that corresponds to a given
distance is set by the acuity limit: to simulate viewing at distance d, use a radius in
pixels of roughly σ = d / (2 × 711 mm) in units of the original CSS pixel — that is, **σ ≈ 1
px for 1.5 m, 2 px for 3 m and 3.5 px for 5 m**, applied to a 1× screenshot. Two things to
look for. At σ = 2, can you tell a Fault tile from a Ready tile at all? And separately,
desaturate a copy to greyscale before blurring: whatever survives both is the part of the
signal that does not depend on colour, which is the part that reaches a Teacher looking
sideways at the board from the far side of the room. This is a proxy, not a measurement —
Gaussian blur is not the eye's point spread function — so use it to compare design options
against each other, and use the distance test for absolute answers.

**The CVD simulation.** Apply the Viénot, Brettel and Mollon 1999 transform for
deuteranopia and protanopia. The matrices are published in
[libDaltonLens](https://github.com/DaltonLens/libDaltonLens) and must be applied in
*linear* sRGB, not to the gamma-encoded bytes — applying them to raw hex values is the
usual mistake and it flatters the result. Browser DevTools has a built-in emulation under
Rendering → Emulate vision deficiencies which is adequate for a quick look. The question to
answer is not "is each colour still visible" — both are — but "with two tiles on screen and
no legend, can I say which is the Fault?". Then repeat with the summary line alone, which
is where the answer is currently no.

Re-run all three whenever a canvas colour, a status colour or a size token changes. The
values in this document were computed against `web/app/globals.css` as of this writing; if
that file moves, these numbers are stale.
