# Package 3 — Display and navigation acceptance: 320 / 390 / 1440 / 1920, three themes, first entry, Back / Forward, a deliberate scroll

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · branch `claude/perf-next-wave-20261016` · built on package 2 (`1ba78c51`)

Input: the synthetic `smoke-snapshot-3.json.gz` (the smoke snapshot of the earlier waves plus two **synthetic** rows that the wide layouts ask for: an empty Or-Geula channel list and a synthetic logo image; not committed, not a corpus).
Every run goes through the shared isolation; an unmapped request or an undecodable image invalidates a sample. Mobile profile (touch) at every width, CPU ×4, 1.6 Mbps / 150 ms, QUICK pair counts (2 per configuration, 5 for the core return), base `7c3f43f3` (A) against this branch (B).
The runs prove **behavior and layout**. They say nothing about speed, images or the real corpus; the corpus acceptance stays **`BLOCKED_INPUT`** (the private corpus is not reachable here, was not collected again, and the damaged image corpus was not used).
The full table is `results/acceptance-table.md`; the raw samples (content text removed) are `results/*.json.gz`.

## What was checked, and how

* **Return exactness**: the block the person was reading in (marked blocks), its distance from the viewport top before leaving and at the end of the horizon; CLS as the session-window maximum.
* **Same content after Back**: hashes of the titles, headings, link destinations, image sources (without query) and gateway rows on Home, before leaving and after the return (and after the second Back): missing / added, by kind.
* **Forward**: from Home, after a deliberate scroll: Forward to the same Post at the scroll position it was left at; then Back again: the same place (to the pixel) and the same content.
* **A deliberate scroll** once the return has settled: down 500 px and up 300 px must move the page by about that and no programmatic scroll may follow.
* **Early input**: a touch while the return is being placed, before the first placement or during the hold: no programmatic scroll may follow it. Both phases are reported.
* **Display**: horizontal overflow, images that did not decode, the theme actually applied (dark, light, parchment), reduced motion; screenshots were looked at (not committed: synthetic images).
* **First entry** at every width and theme: CLS, composed/usable markers, residue.

## Result (B = this branch; A = base)

| | A (base) | B (branch) |
|---|---|---|
| Return CLS at 320 / 390 | 3.02 / 2.44 | **0.025 / 0.025** |
| Return CLS at 1440 / 1920 | 0.742 / 0.177 | **0.093 / 0.076** (runs 0.063–0.093 / 0.014–0.076) |
| Return CLS, light / parchment / reduced motion (390) | 1.94 / 2.05 / 1.94 | **0.022 / 0 / 0.024** |
| Return CLS, early input at 250 / 600 ms | 2.5 / 2.6 | **0.014 / 0.044** |
| Block read: displacement after Back | 0 px (the base is placed by number; its CLS above is the page moving under it) | **0 px**, every configuration, except the early-input rows, where the person moved the page on purpose (385–495 px) |
| Same titles, headings, links, images, gateway rows after Back; after Forward + Back | yes | **yes**, every configuration |
| Forward: same Post, same place (px) | yes (0) | **yes (0)**, every configuration |
| Second Back: place (px from where the person left) | 0 | **0–1** |
| Deliberate scroll afterwards, nothing pulls back | yes | **yes**, every configuration |
| Early input: programmatic scrolls after the touch | 0 | **0** (both phases seen: before the first placement; during the hold) |
| Horizontal overflow / images that did not decode | 0 / 0 | **0 / 0**, every width and theme |
| First entry CLS: 320 / 390 / 1440 / 1920 | 0.030 / 0.021 / 0.104 / 0.088 | **0.030 / 0.018 / 0.024 / 0.028** |
| First entry CLS, light / parchment | 0.020 / 0.021 | **0.018 / 0.019** |
| Cold load, posts empty / fail / outage | 0.590 / 0.589 / 0.273 | **0.001 / 0.001 / 0.001** |
| Return, posts fail / outage | 1.57 / 0.77 | **0 / 0.001** |

## Findings this package fixed

* **A wide first entry jumped inside the first screen (base 0.104 at 1440; the branch before this package 0.177).** Two causes, both on a cold load: the loading hero is 142 px and the loaded one 247 px (everything below moves 105 px), and the latest-updates strip, in the first screen on a wide page, stood **nothing** until its cards arrived
  (the base had a 200 px skeleton). Now a loading hero is as tall as a loaded one (`.h29-hero.is-loading { min-height: 247px }`; phones keep their own, taller, rule) and the strip stands the standard four loading cards on a cold load. This is safe now because an empty or failed read **keeps** that box with its message (package 1);
  the strips below the first screen (notable, gateways) still reserve nothing without evidence. Result: 0.104 → 0.024 at 1440, 0.088 → 0.028 at 1920; the cold failures went from 0.09 to 0.001.
* **A new chunk in every route graph that contains the plane story** (package 2 imported a 1 KB experience projector in the story): a fresh build exceeded the World route budget by one chunk (38 > 37). The import was unnecessary (the media only supplies an image when the row has none, and then the full reader is used); removed. The package-2 measurements were taken with that chunk present (one script more, ≈ 1 KB gzip).

## What stays open

* **Wide returns still show some movement (0.06–0.09 at 1440, up to 0.076 at 1920; one earlier sample 0.237).** On a wide page the System Frame adds its context rail on the return, so Home's column is narrower (1112 → 978 px) than on the first visit and every remembered box is released by design (a height remembered for another width is the wrong height).
  The unheld blocks then load into the page. The owner of the frame decides whether the rail should be known before Home is drawn; the Home side would need a memory per width (a second return would then be held). Both are in `../dependency-handoff-20261016.md` (D7).
* **Failure returns end taller than the base** (error 5436 → 7182 px, outage 4525 → 6935): areas above the reading place keep their whole box (package 1). Reported there, a decision for ZURIEL.
* **`usable` times are not compared.** Serving the same build twice from two directories differs by ≈ 400 ms in this lab (`results/noise-floor-first-entry.json`: the same build, A median 3993 ms against B 3584 ms), so a first-entry timing difference below that proves nothing here. Structure is what is claimed: request counts (65 → 46 at 390), and CLS.
* Real-corpus acceptance (images, LCP, the layout at the four widths on real content) and the hosted check: **`BLOCKED_INPUT`**.

## Tests and gates

Home / scroll set run sequentially: 158 tests in 14 files (`home-retry-2029` is 9, with a cold-load case for the four loading cards), all passing; `npm run build` ok; `npm run test:2029-bundle-budget` 5/5 on a fresh build; the 19 isolation-gate commands exit 0 (`results/isolation-gates.txt`).
