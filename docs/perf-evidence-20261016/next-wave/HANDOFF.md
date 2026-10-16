# Next performance wave — closing document

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · actor CLAUDE (leading the wave while the GPT center was unavailable) · to ZURIEL, passive (no dispatch, no ACK wait)
Branch `claude/perf-next-wave-20261016` from `ae6d6263a1780cb82986c231d6bb26e96c93ea99` (the checked starting point; `ccr-cb3840b9-7iz2j1` was not pushed to again and still stands at `ae6d6263`).
State: **BRANCH-ONLY**. Not merged, not deployed, no pull request, no Production, no Legacy / database / RLS / live switch / shared CI / deployment setting touched. `vercel.json` blocks previews for `claude/*` (checked against the configuration; the hosted result is not observable from here);
GitHub Actions has no run on this branch. A decision of ZURIEL made during the run (stable area, message and retry for a failed area; bounded reserved space; a retry loads only the failed area; the content around does not jump; a message or a skeleton is never usable content) is built into package 1.

## Commits (three packages, separate commits)

| Package | Commit | What it is |
|---|---|---|
| 1 | `bdaf63e4` | Home completion: stable message with retry per area, bounded kept space, layout-extent memory (the ~105 px final-height difference) |
| 2 | `1ba78c51` | First entry: the plane story asks for the post's row only on Home; the reading projection stays on World |
| 3 | `f62625f4` | A wide cold entry no longer jumps; display and navigation acceptance at four widths and three themes |
| — | this document | closing document |

Per-package detail, raw (content-text-free) results and the tools: `package1/README.md`, `package2/README.md`, `package3/README.md`; structured requests to other owners: `dependency-handoff-20261016.md`.

## What changed

**Package 1** (`useSettledBox2029.js`, `HomeComposition2029.jsx`, `DiscoveryGateways2029.jsx`, `HomeReadNotice2029.jsx`, `homeComposition2029.css`, evidence predicate v5)
* A Home area whose read fails or comes back empty shows a stable box with a message and a **נסו שוב** button (latest updates, the hero's unavailable state, the notable strip, each gateway; the plane story slot keeps the box of its own message). The retry repeats the reads of that area only (one reader per gateway area; posts; the strip) and is proved with the real components.
* The box is kept while the area is in view or above the viewport and is reduced to 160 px once it is below the viewport (letting an area go above the viewport is counted by the browser as a shift even when the scroll is compensated in the same task; measured and not done). A retry gives the whole box back.
* **The ~105 px final-height difference** (cause reproduced on synthetic input, removed): a box was remembered from painted rectangles while cards were mid-entrance-animation (6–7 px too tall per strip), then stretched its grid rows on every later return. Now the extent is the layout extent and a held box does not stretch its rows. Synthetic return: final height 7423 → 7424 (it was 7431). Whether this is the whole ~105 px on the real corpus is **not checked** (`BLOCKED_INPUT`).
* An error message or a loading skeleton is never composed/usable content (explicit in the evidence predicate and shown to agree with the shared perf metric, which was not changed).

**Package 2** (`WorldFlightStory2029.jsx`)
* The first-entry map (assets in waves, reads in order, script cost from a Chromium trace) is in `package2/results/entry-map-before-after.md`. The factor the evidence supports: the Home plane card drew only the post's row but loaded the reading-projection builder and ran its extension phase (World-only content).
  On Home it now reads the row (the projection's own first read) and builds the card; World, and a Home row without an image, use the full reader. Home markup is byte-identical to the previous component's for the same row; not-Home material gives the same message. No engine, database or shared reader changed.
* Synthetic first entry, 5 pairs: requests 65 → 46, scripts 51 → 44 (43 after package 3 dropped one extra import), script gzip 480 → 431 KB, long-task time 1179 → 310 ms (CPU ×4).

**Package 3** (`HomeComposition2029.jsx`, `homeComposition2029.css`, `WorldFlightStory2029.jsx`, runner)
* Found at 1440/1920: a cold first entry jumped inside the first screen (CLS 0.104 / 0.088 in the base; 0.177 / 0.122 on the branch before this package): the loading hero was 105 px shorter than the loaded one and the latest-updates strip stood nothing until its cards arrived. Fixed: a loading hero as tall as a loaded one on wide pages, and four loading cards in the strip on a cold load (safe now that a failure keeps the box). 0.024 / 0.028.
* Found by the budget test: package 2 had added a 1 KB chunk to every route graph that contains the plane story (World 38 chunks > 37). Removed in package 3.
* Acceptance at 320 / 390 / 1440 / 1920, dark / light / parchment, reduced motion, early input, Forward + Back again, a deliberate scroll: see the table in `package3/README.md`.

## Valid measurements (synthetic input; behavior and structure, **not speed**)

| | Base | Branch |
|---|---|---|
| Return CLS, 320 / 390 / 1440 / 1920 | 3.02 / 2.44 / 0.74 / 0.18 | 0.025 / 0.025 / 0.093 / 0.076 |
| Return CLS, light / parchment / reduced motion / early input 250 and 600 ms | 1.94 / 2.05 / 1.94 / 2.5, 2.6 | 0.022 / 0 / 0.024 / 0.014, 0.044 |
| Return, the block read ends at 0 px; second Back at 0–1 px; same titles, links, images, rows; Forward to the same Post at the same place; a deliberate scroll never pulled back | — | every configuration |
| First entry CLS, 320 / 390 / 1440 / 1920 | 0.030 / 0.021 / 0.104 / 0.088 | 0.030 / 0.018 / 0.024 / 0.028 |
| Cold load, posts empty / fail / outage; return with failures | 0.59 / 0.59 / 0.27; 1.57 / 0.77 | 0.001 each; 0 / 0.001 |
| Requests on a first entry (390) | 65 | 46 |
| Horizontal overflow, images that did not decode | 0 / 0 | 0 / 0 at every width and theme |

**Not claims.** Usable-content and LCP times: this lab differs by ≈ 400 ms when the *same build* is served twice from two directories (`package3/results/noise-floor-first-entry.json`), and the package 2 timing differences have confidence intervals that cross zero. The first-entry timing on the real corpus is the central session's to measure.

## Tests and gates

Home / scroll set, sequential: **158 tests in 14 files, all passing** (scroll restorer 27, scroll return 16, settled box 19 + 19 in a real browser, readiness predicate 24, retry with the real components 9, story 6, and the earlier files). `npm run build` ok; `npm run test:2029-bundle-budget` 5/5 on a fresh build; the 19 isolation-gate commands exit 0 (`package*/results/isolation-gates.txt`).
`test/date-display-rule-2029.test.mjs` fails 2 cases in files this wave does not touch (`SourceRepeatInfo2029.jsx`, `ZviGroupTimeline2029.jsx`); it fails the same on the unchanged tree.
One process fact: the package 2 commit, built fresh, exceeded the World route budget by one chunk; its own gate run used a build made before that change. Package 3 fixed it and the budget was re-run on a fresh build.

## Blockers

* **`BLOCKED_INPUT`**: the private central corpus is not reachable from this environment; it was not collected again and the damaged image corpus was not used. Not accepted here: real images and LCP, the real final height of the Home document (the ~105 px), the layout at the four widths on real content, hosted behavior.
* The Preview / deployment block is checked against the configuration only.

## Open decisions for ZURIEL

1. **Space above the reading place after a failure.** Areas above the person keep their whole box (updates 714 px, hero 458, …) because giving it back there is counted as a shift. With every read failing, the document ends taller than the base (5436 → 7182 px). Accept, or accept a bounded shift (for example only releases under a few dozen px).
2. **Wide returns.** On a wide page the frame adds its context rail on the return (column 1112 → 978 px) and every remembered box is released by design; return CLS 0.06–0.09 (base 0.74). Owner of the frame: know the rail before Home is drawn (handoff D7).
3. **Four loading cards on a cold entry.** The strip in the first screen shows four skeleton cards until its read settles (the base showed one 200 px skeleton). Design call; the evidence tool does not count them as content.

## Remaining work, in order

1. Central acceptance on the real corpus with the tools of this branch (handoff D6): `--mode load` and `--mode back` with `--traceDir`, `--forward 1`, `--deliberate 1`, at the four widths and three themes; compare `holdsAtEnd`, `cardsAtEnd`, `assets`, `reads`, `scripts`, `identity`.
2. D1 (route preload for `/`, ≈ 350 ms idle network between the entry and the Home route graph), D2 (two `site_flags` reads), D3 (the System Frame's panels that render after an action: ≈ 72 KB raw), D7 (the rail) — owners in `dependency-handoff-20261016.md`.
3. The notable strip and the per-card rating reads (D5): measure before deciding.
4. Decision 1 above.

## Reviews and ownership

The review key `CLAUDE_PERF_2029_NEXT_WAVE_REVIEW_20261016` was read at the start, after package 1, and at the end: **no rows**; nothing to fix or re-test from it. No other session was started by this work; the supervising Claude session mentioned in the instruction has not received anything from here.
Ownership of this task key's scope (`src/components/experience2029/**`, `src/pages/Home2029Page.jsx`, `src/App2029.jsx`, `src/lib/homeReadiness2029.js`, `src/lib/scrollRestore2029.js`, their tests, `docs/perf-evidence-20261016/**`) is released with the AFTER row.
