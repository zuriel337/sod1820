# Package 1 — Home completion: failure and empty states, in-view jumps, the final-height difference

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · branch `claude/perf-next-wave-20261016` · start `ae6d6263a1780cb82986c231d6bb26e96c93ea99`

All numbers below come from a **synthetic input** (`smoke-snapshot-2.json.gz`, derived from the legacy corpus with synthetic images; not committed). They prove **behavior and layout structure**
only. Nothing here says the site is faster, and nothing here replaces the acceptance on the private central corpus (`BLOCKED_INPUT`, see the end).

## ZURIEL's decision, as built

When a content area fails to load, a stable area stands in its place with a failure message and a **נסו שוב** button.

| Part of the decision | What was built |
|---|---|
| A stable area with a message and a retry | `HomeReadNotice2029` (one message, one button, `aria-live="polite"`, no `role="status"`). Used by the latest-updates strip, the hero's unavailable state (its own retry), the notable-convergences strip (when it was on screen before), and each discovery gateway that failed. The plane story already drew its own message and retry (`WorldFlightStory2029`); its slot now keeps that box too. |
| The reserved space is limited | A message keeps the box that was held for its area, **up to what was there**, and gives it back down to **160 px** (`KEEP_RESERVE_PX`: room for the message and its retry) once the area is **below the viewport**. A retry gives the whole box back for its own loading. |
| A retry loads only the failed area | Home posts: one read (hero + strip). Notable strip: its own read. Gateways: one reader per area; a retry runs the readers of that area and leaves every other area as it is (`AREA_READS`, `retryArea`). Proved with the real components in `test/home-retry-2029.test.mjs` (the calls after each click are listed in the assertions). |
| The content around does not jump | The area keeps its box while it is in view **and while it is above the viewport**. Letting an area go above the viewport moves everything under it, and Chrome still counts that as a shift even when the scroll position is compensated in the same task (≈0.35 in the harness, `scroll-return-2029`), so it is not done. |
| An error message or a loading skeleton is never usable content | The evidence predicate (`readiness.mjs`, v5) excludes `.h29-notice` and `.is-unavailable` explicitly, whatever links they contain; the shared `perf-execution-2029/browser-metrics.mjs` (unchanged) is shown by test to reject them as well. A message is counted on its own (`__skeletons().notices`) and never carries the status role that marks a loading line. |

An empty result and a failed one look the same for readers that swallow their errors (`getLatestPostCards`, `getCategoryVideos`); for those an empty result also offers the retry. Readers that throw
(`fetchHomePostCards2029`, `getMatrixLibraryPage`) offer it only when they rejected; an empty category read by them is simply empty and says what it always said.

## The ~105 px difference in the final height

Cause, reproduced on the synthetic input and removed:

1. **A box was remembered from the painted rectangles.** `useSettledBox` measured `first.getBoundingClientRect().top .. last.getBoundingClientRect().bottom`. The cards enter with `h29-rise` (`translateY(8px)`, 80 ms stagger per card), so when the
   measurement ran during that animation the box came out 6–7 px too tall for a four-card strip (714 px instead of 707.8). It was remembered once and never corrected (a resize observer only fires for the first and last child).
2. **A held box stretched its grid rows.** The next return applied that height as `min-block-size`; the grid handed the 6–7 px to its rows, every card became 1.8 px taller (`card-geometry-before-fix.json.gz`: `main` 92 → 93.8 on all four), and the measurement of the stretched list fed back.

Fix: the extent is the **layout extent** (`offsetTop`/`offsetHeight`, transform-free, `layoutExtent`); a held box does not stretch what is inside it (`align-content: start` for `[data-h29-hold]`).
Synthetic return, 5 pairs: final document height base 7423 → candidate **7424** (before the fix: 7431). The same hook feeds the notable strip, the hero slot and the gateways, so the difference on the real corpus is the sum over every strip
that was measured while animating; that sum, and whether it is the whole ~105 px, **could not be checked here** (`BLOCKED_INPUT`: the private corpus is not available; it was not collected again).
What to look at centrally: `holdsAtEnd` (box against natural extent per remembered box) and `cardsAtEnd` in the runner output, which now exist.

A second idea, a release of "stale" holds once images and fonts are in, was built and **removed**: on the plane story it made the box oscillate (CLS 0.16–0.36 against 0.03). The measurement fix is what the evidence supports.

## Measured (synthetic input, `QUICK` pair counts, mobile 390×844, CPU ×4, 1.6 Mbps / 150 ms, shared isolation)

| Scenario | Base `7c3f43f3` | Candidate | Note |
|---|---|---|---|
| Return to Home, normal (5 pairs) | CLS 2.44 [1.79..2.49] | **0.024 [0.021..0.036]** | final height 7423 → 7424 |
| Cold load, posts empty (2 pairs) | 0.590 | **0.056** | usable: none in either arm (nothing to use) |
| Cold load, posts fail | 0.588 | **0.089** | same |
| Cold load, every REST read but the flags fails | 0.274 | **0.035** | same |
| Return, the return's posts fail | 0.824 | **0** | |
| Return, every REST read but the flags fails | 0.183 | **0** | |

`usableMs` is `null` in all failure rows for both arms: the failure message is not counted as usable content, which is the point of the predicate change.

## What stays open

* **Space above the reading place is not given back.** With every read failing on a return, the document ends taller than the base (error 5436 → 7182 px, outage 4525 → 6935): the areas above the person keep their whole box (hero 458, updates 714, notable 563, story 384, …) and only
  areas below the viewport go down to 160 px. It is blank space above the reading place that the person meets only by scrolling up. Giving it back above the viewport costs a counted shift (above). A decision for ZURIEL: accept it, or accept a bounded shift (e.g. only when the release is under a few dozen px).
* **A strip that must disappear** (the world gate resolving closed after the notable strip was held) still collapses; it is a gate decision, not a failed read, and was not changed.
* **The home arrivals block** (`Reveal id="arrivals"`) has no held box; it shrinks by ~40 px in an outage. Not changed.
* The hero's unavailable state is taller than its loading state on wide screens (a paragraph and the retry are added); phones are covered by the kept box. Measured with the display acceptance (Package 3).
* Real-corpus acceptance (images, LCP, the final height on real content): **BLOCKED_INPUT**.

## Tests (all run sequentially; the isolation gates as before)

`scroll-restore-2029` 27 · `scroll-return-2029` 16 (negative controls kept: the collapse path is still exercised with `keepOff`) · `home-settled-box-2029` 19 · `home-settled-box-dom-2029` 19 (real browser: layout extent, no stretch,
the kept box in view / above / below the viewport, the retry's whole box, cold areas) · `home-readiness-predicate-2029` 24 (messages and the unavailable hero are never content, also against the shared metric) · `home-retry-2029` 8 (the real
`DiscoveryGateways2029` and `HomeComposition2029` over stand-in readers: which reads run after each click) · `home-scroll-anchors-2029` 4 · `home-build-and-classification-2029` 4 · `home-evidence-corpus-2029` 6 · `home-evidence-runner-2029` 6 → **133/133**.
`npm run build` ok · `npm run test:2029-bundle-budget` 5/5 · the 19 isolation-gate commands exit 0 (`results/isolation-gates.txt`).
`test/date-display-rule-2029.test.mjs` fails 2 cases in `SourceRepeatInfo2029.jsx` and `ZviGroupTimeline2029.jsx`, files this package does not touch; it fails the same without the package (checked with the changes stashed).
