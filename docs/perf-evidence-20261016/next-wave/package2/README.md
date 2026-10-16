# Package 2 — The first entry: what starts before the main content, and the one factor the evidence supports

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · branch `claude/perf-next-wave-20261016` · built on package 1 (`bdaf63e4`)

Input: the synthetic `smoke-snapshot-2.json.gz` (not committed; mobile 390×844, CPU ×4, 1.6 Mbps / 150 ms, shared isolation). The **code, its bytes, its requests and its CPU cost are the real ones**;
the data and images are not, so nothing here says how fast the site is for a person. Timing differences are shown as seen and are **not claims** (their confidence intervals cross zero);
the structural differences (which files, which reads, how many) are deterministic. The real-corpus first-entry acceptance stays `BLOCKED_INPUT`.

## The map: what a Home entry does, in order (arm A, package 1, median run: usable 4132 ms, LCP 4028 ms; `results/entry-map-before-after.md`)

| When | What | Size / count |
|---|---|---|
| 5–260 ms | the document; its inline script (`sod2029-primary-reads`) starts the latest-posts read at once, before any script | 1 read |
| 245–1466 ms | wave 1: the entry chunk and the vendors it preloads (react-dom, router, the providers, supabase client, auth, tracking) | 9 scripts, 183 KB gzip |
| 1466–1819 ms | **nothing is requested**: the entry compiles and runs, `App2029` renders its providers, the lazy `import()` of the Home route is only issued now | ≈ 350 ms with an idle network |
| 1819–3435 ms | wave 2: the Home route graph discovered by that import (the System Frame chunk 68 KB gzip, Home 23 KB, the research libraries Home imports) | 26 scripts, 158 KB gzip |
| ≈ 4075 ms | Home mounts: the content reads (posts, gateways, pulse counts, notable strip, flags for the gates) and the hero image | ~30 reads |
| ≈ 4070–5460 ms | **wave 3: the plane story's reading projection**: the builder and its chain (`timeFlow` calendar library 53 KB gzip, `topicSourceContext`, `momentClockSystemMethod`, `researchW2Executors…`) and the reads of its extension phase (6 method traces, 2 zero-scale, 4 topic cards, 2 node lookups, 4 more post rows) | 16 scripts, 139 KB gzip, 19 reads |

Wave 3 starts when the content mounts and overlaps the hero image and the LCP window. Total long-task time 1179 ms and function-call time 1591 ms (CPU ×4, from the Chromium trace) for the whole entry;
script compile 4273 ms (summed over the trace).

## The factor: Home was loading and running the reading projection for a card that draws none of it

`WorldFlightStory2029` on Home draws the post's own row: its image, categories and date, and a button to World. It asked for the full reading projection anyway: the builder module and its
chain, then the extension phase (timeline, verifications, method traces, convergence meter), whose only consumer is a collapsed section that exists on the **World** surface alone.
The component already took the row early (`onPrimary`), so the card was on screen before the extension phase started; the rest was background work competing with the first content.

Fix, inside `src/components/research/WorldFlightStory2029.jsx` (no engine, database or shared reader changed): on the Home surface the card asks for the row with `getPostBySlug` (the **first read the projection itself makes**, same reader, same arguments)
and builds the card from it. The full reader is still used on World, and on Home for a row that has no image (the full reader may supply one from the post's experience media). A row that is not Home material
(not found, draft, forum) ends in the same unavailable message with the same retry, without loading the builder.

| First entry, synthetic input, 5 pairs | before (package 1) | after | |
|---|---|---|---|
| requests | 65 | **46** | −19 in every sample |
| scripts / script gzip | 51 / 480 KB | **44 / 431 KB** | the builder and 7 more chunks no longer load |
| long-task time (CPU ×4) | 1179 ms | **310 ms** | from the trace |
| function-call time (CPU ×4) | 1591 ms | **1055 ms** | |
| usable content | 4132 ms | 3615 ms | −492 ms, CI [−860, +78]: **not a claim** |
| LCP | 4016 ms | 3832 ms | −260 ms, CI [−512, +44]: **not a claim** |
| CLS | 0.018 | 0.018 | unchanged |

Reads that no longer run on Home: `rpc/gematria_method_trace` ×6, `rpc/fn_zero_scale` ×2, `topic_cards_public` ×5, `nodes` ×2, `posts?…slug` ×4.

What is preserved, and how it is shown (`test/home-story-2029.test.mjs`, the real component over stand-in readers, against the component exactly as before):

* **Content and links**: the Home card's markup is byte-identical to the previous component's for the same row (full row; sparse row; a row with an experience-media poster).
* **Permissions and admission**: the same public reader and the same admission (`postRowToWorldUpdate`, draft, private stage, preview snapshot are never Home material); not-Home material gives the identical message.
* **Freshness**: the same read, issued at the same moment (it is the first thing the projection did); the retry in the story's own message reads the row again and only that.
* **World**: the same calls in the same order, the same markup, the timeline is there.
* **Methods and results**: Home shows none; the method traces were work for the World section.

A cost of the change, stated: opening World from Home used to find the builder already loaded by Home; it is now loaded when World opens, exactly as for a direct entry to World.

## Considered and not done here (structured handoff: `../dependency-handoff-20261016.md`)

| Candidate | Why it is not in this package |
|---|---|
| Ask for the Home route graph while the entry loads (≈ 350 ms of idle network above) | needs hashed chunk names in the HTML head (a build plugin) or an earlier `import()`; the build configuration is shared |
| Load the System Frame's panels that render only after an action (Raziel companion, contact / issue report, story viewer, Or-Geula column: ≈ 72 KB raw; to be confirmed by the Frame's owner) on first open | the Frame is the single owner for every 2029 route; needs its owner's review and its gates; bytes alone are not proof of time saved |
| Two reads of `site_flags` on every entry (lock flags in `supabase.js`, `fx_` switches in `runtimeSwitches2029.js`) | both are shared readers |
| The notable strip's own chain (`explorerFacets`, entity hub, book projection: 20 KB gzip) and the per-card ratings reads (`convergence_meter` ×4, `fn_method_value`, `nodes` ×3) | not shown to be a bottleneck; they serve content that is on screen |

## Tests and gates

`home-story-2029` 6 (new) + the Home/scroll set → **157/157** run sequentially; `npm run test:2029-bundle-budget` 5/5; the 19 isolation-gate commands exit 0 (`results/isolation-gates.txt`).
