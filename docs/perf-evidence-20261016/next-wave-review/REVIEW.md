# Independent review — next performance wave

task_key `CLAUDE_PERF_2029_NEXT_WAVE_REVIEW_20261016` · reviewer CLAUDE (read-only on product) · to ZURIEL, passive
Reviewed head: `f60d078822a40d0940860a98470930e3e9fb59d5` (branch `claude/perf-next-wave-20261016`), separate worktree. Executor task `CLAUDE_PERF_2029_NEXT_WAVE_20261016`; its AFTER row `50540aae…` (16:13:29Z) released its scope. `main` = `503b52ef`. No product file, database, switch, merge or deploy was touched. This report lives on its own docs branch `claude/perf-next-wave-review-20261016` (a `claude/*` branch, which `vercel.json` excludes from previews; the assigned `ccr-*` branch was not used because the handoff says `ccr-*` pushes create previews).

## Top findings (by priority)

### 1. HIGH — the shared "primary content" metric used for real acceptance still counts transparent, off-screen and message-with-link content; the "shown by test" claim holds only for link-less fixtures
* Evidence: `scripts/perf-execution-2029/browser-metrics.mjs` `primaryContentState('/')` (the wait condition in `measure.mjs:113`) excludes only `aria-busy`, `aria-hidden`, `.h29-skel`, `.dg29-skeleton`, `.is-loading`. Probe (`shared-metric-probe.mjs`, run against the head): `opacity:0` card → `primary:true`; card below 3000 px → `true`; `.is-unavailable` hero containing a `/post/` link → `true`; `.h29-notice` containing a `/post/` link inside a titled card → `true`. The executor's test (`test/home-readiness-predicate-2029.test.mjs`, "shared perf-execution metric … either") uses only a notice and an unavailable hero **without** post links, so it passes by absence of links, not by exclusion. package1/README line 18 ("shown by test to reject them as well") overstates it.
* Why it matters: the strict v5 predicate (opacity ≥ 0.9, ≥ 40 % in viewport, hit-testable, no notice/unavailable ancestor) exists only in the A/B runner. Central/hosted acceptance uses the lax one, so a "usable" time there can still be a faded-in-progress or off-screen card, and once failure notices carry links the new failure UI could be counted.
* Fix: add `.is-unavailable, .h29-notice` to the `closest(...)` exclusion in the shared metric (its owner, not this wave), add opacity/viewport conditions or rename its output "composed"; add link-bearing fixtures to the test. Until then report central "usable" as composed-only.

### 2. MEDIUM — results are not bound to a SHA/build, and package 1/2 results predate the final head
* Evidence: the 36 summary/raw files record runner/readiness version, fixture sha256 (`d3f8f58e…`), browser, node (v22.22.0; the central runs used Node 24.19.0) — but no commit, no `dist-A/dist-B` digest (`run-matrix.sh:4` asks to "record the SHAs next to the results"; no file does). `isolation-gates.txt` has no SHA or time. Runs: package1 14:01–14:09Z (commit `bdaf63e4` at 14:20), package2 14:27Z (commit 14:35; the README admits the extra 1 KB chunk was present), package3 15:15–15:47Z (commit `f62625f4` at 16:11). So no measurement is provably of `f62625f4`/`f60d0788`; the HANDOFF "valid measurements" table mixes packages. The synthetic fixture is uncommitted (hash only).
* Fix: add a `SHAS.txt` (A/B commit, `git rev-parse`, sha256 of each `dist` tree, fixture sha256) per package, and re-run only package 3's core-back/load at the final head when the central session runs D6. Reproduced here at the head: the 4 Home test files I ran (readiness 24, story, retry, scroll-return) pass 55/55; I did not re-run browser A/B (synthetic input not committed).

### 3. MEDIUM — wide-return CLS is presented as under the 0.1 gate from 2 pairs while 0.237 was observed
* Evidence: HANDOFF table "Return CLS 1440/1920: 0.093 / 0.076" (QUICK = 2 pairs; package3 README: "one earlier sample 0.237"; 0.093 is 7 % under the gate). D7/open decision 2 mention it, the headline table does not. Also the failure-return document is 5436→7182 px (decision 1) and the hero `min-height:247px` was measured on synthetic content only.
* Fix: report max, not best, for wide returns; do not treat 1440/1920 returns as passed; collect ≥ 15 pairs on the central corpus; keep 0.1 unchanged.

Minor (not ranked): `WorldFlightStory2029.jsx:53` — a `//` comment swallowed `privateStage:false, previewSnapshot:false, extensionsPending:false`; harmless today (undefined is falsy in `admit`) but the intent is dead code. The `Reveal` MutationObserver calls `flushSync` on every class mutation of the plane-story subtree (no-op when value unchanged; measure on real content).

## Passed (checked against the head)
1. Chain: `ae6d6263` (checked head) is an ancestor of `f60d0788`; `ccr-cb3840b9-7iz2j1` still at `ae6d6263` (not pushed again). Only 6 `src` files changed, all in `experience2029/**` and `WorldFlightStory2029.jsx`; `src/lib/**` and `scripts/**` unchanged, so the scroll-restore and readiness fixes are intact (scroll-return 16 and restorer tests pass).
2. Package 2 keeps behavior: Home reads the same first read (`getPostBySlug`), same draft/forum admission, same image chain (`thumb_url || image_url`), row without image falls back to the full reader; World unchanged; no permission/engine/reader change; retries repeat the same reads (freshness kept); navigation handlers unchanged.
3. Own predicate v5 (`readiness.mjs`) correctly separates composed vs usable and excludes loading, unavailable, notice, transparent, off-screen and covered content; the four cold skeleton cards are `.is-loading`/aria-hidden.
4. Synthetic diagnostics are labeled synthetic; speed/LCP is explicitly not claimed (noise floor ≈ 400 ms shown); request-count/CLS-structure claims are the only ones made.

## Blocked on missing input (not PASS)
* Real corpus: images/LCP, the ~105 px final-height gap, four widths on real content, hosted/preview behavior (`BLOCKED_INPUT`, correctly stated by the executor).
* Home central acceptance, Number/World series and the unified head (Number/CI head `3c3ea58a` is still separate) remain open per the central handoff; the executor's HANDOFF does not restate Number/World but claims no PASS for it. No gap was converted to PASS.
* Open decisions 1–3 in the executor HANDOFF remain ZURIEL's.

## Ownership
Read-only reviewer; no scope claimed beyond `docs/perf-evidence-20261016/next-wave-review/**`; released at the AFTER row.
