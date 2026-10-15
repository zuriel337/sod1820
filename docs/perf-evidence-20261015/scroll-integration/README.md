# F2 scroll/back-forward integrated on PR1100 head 01ac7706 — verification

Branch `claude/scroll-navigation-2029-fix-oz90c0` = PR1100 head `01ac7706` + F2 (patch from `8dce19b3`, applied with `git am`, commit `1701cf3a`).
Pre-check: neither PR1100 head nor main (503b52ef) contains any scroll restoration (no `scrollRestore*`, no `ScrollRestoration`), so nothing duplicated.
Touched: `src/lib/scrollRestore2029.js` (new), `src/App2029.jsx` (one layout-effect pair in `RouteEffects2029`), `test/scroll-restore-2029.test.mjs` (new), harness `scripts/perf/serve.mjs` + this folder. No readers, supabase.js, SystemFrame, CSS/design, switches, DB, flags.

## Gates run on this branch
- scroll unit tests 13/13; early-primary-read 9 + home-preview-route 4 pass; `test-route-legitimacy-2029` PASS; `test-2029-isolation` (hard isolation) PASS; `test-2029-bundle-budget` 5/5; `npm run build:2029` OK.
- Not run: GitHub CI workflows (isolated-postgres, els-core, public-core, number-2029), hosted preview.

## Mobile replay (390x844 DPR2 touch, CPU x4, 1.6Mbps/150ms, cold context, fixtures re-recorded live, 7 samples/arm, 0 invalid, 0 page errors)
Real touch swipes, taps on in-viewport controls, real drawer, browser back/forward. Raw: `raw/base-01ac7706.*`, `raw/f2-integrated.*`.

| Position (separate) | 01ac7706 | + F2 |
|---|---|---|
| world→post→back→Home within 120px of departure | 0/7 | **7/7** |
| Home→World→...→forward→World within 120px | 0/7 | **7/7** |
| new entry (Post, World) at top | 7/7, 7/7 | 7/7, 7/7 |
| direct `/world#world-plane-india` in view | 7/7 | 7/7 |
| in-page anchor in view | 7/7 | 7/7 |
| cross-page `/world#world-sources` | not honoured (0/7) | unchanged (not honoured; app-owned anchor, out of scope) |

| Time to usable content (action→READY marker, median [range] ms) — separate from position | 01ac7706 | + F2 |
|---|---|---|
| back→Home | 768 [307–1154] | 432 [390–906] |
| forward→World | 202 [197–298] | 216 [193–514] |
| new entry World | 1842 [1795–2020] | 1799 [1744–2259] |
Ranges overlap in all three: **no speed claim**. The back→Home median difference is within run-to-run spread (baseline varied 307–1154); this is a position fix, not a speed improvement.

| CLS in action window (separate) | 01ac7706 | + F2 |
|---|---|---|
| back→Home | 2.29 [1–3], 7/7 >0.1 | 1.85 [1–2], 7/7 >0.1 |
| forward→World | 0 [0–0], 0/7 >0.1 | 0 [0–2], **1/7 >0.1** |
| new entry Post / World | 0.018 / 0 | 0.018 / 0 |

## Not caused by restore, documented
- back→Home CLS ≈ 1.9–2.3 exists identically on the baseline: Home re-mounts in waves (Discovery/Home reveal height; scopes 75/839 + visual owner). Not fixed here; F2 does not worsen it.
- forward→World CLS 1/7 >0.1 appears only because World is now shown at the restored offset, where the baseline (stuck at top) never meets late insertions (World reveal/late sections). Prior F2 run showed 3/7; component-level attribution not done.
- One of seven patched runs had 1 fixture miss (lazy content in restored region); one cross-page anchor sample returned undefined. Neither counted as a result.

## Limits
Lab replay only, mobile only; no physical phone, desktop, signed-in, hosted preview. User-input cancellation and no-late-jump (anchoring paused 1.5s after jump, ends on touch/wheel/key/pointer) are covered by the unit tests, not by a separate browser interruption measurement.

## Integration
`git fetch origin claude/scroll-navigation-2029-fix-oz90c0` then into PR1100 branch (gpt/perf-execution-20261014 @01ac7706): `git merge --no-ff` (fast-forward possible while head is 01ac7706; commits: 1701cf3a, harness commit, evidence commit). Or `git am` the single patch 1701cf3a. If main's App2029.jsx (changed by PR1103/1104) is the target, re-apply the 17-line effect pair manually and rerun the scroll tests.
