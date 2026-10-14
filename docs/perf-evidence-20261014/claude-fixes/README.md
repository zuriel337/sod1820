# CLAUDE_2029_FIXES_FROM_REVIEW_20261014 — two fixes for the review findings (patches, not applied to PR1100)

Base: PR1100 `gpt/perf-execution-20261014` **53fa46c8** (it had moved from 5dd4afaa during this work; the review ran on 5dd4afaa).
Delivery: `patches/*.patch` (`git am`), made on a private worktree branch `fix/review-20261014` (not pushed — PR1100 belongs to the GPT/Codex lane, and my designated branch has a different base). Verified: both patches apply cleanly to 53fa46c8, 17 unit tests pass (`test/early-primary-read-2029.test.mjs`, `test/scroll-restore-2029.test.mjs`), `build:2029` passes. Not run: the CI workflows, the browser release specs, hosted preview.
Measurement: `claude-review/review.mjs` and `coldload.mjs` (same conditions as the review: mobile 390×844 touch, CPU ×4, 1.6 Mbps/150 ms, cold context, fixtures recorded live for both builds, replay 150 ms, n=7 flow / n=5 cold). Lab replay, not a device.

## F1 `d26029fd` — head post read uses the decoded route parameter
Problem (review finding): for a non-ASCII slug the head asked for `slug=in.(%25D7…)` (raw path segment, double-encoded) while the client reader asks for the decoded set → two requests, the head read wasted, no handoff.
Fix: `entryPrimaryReads2029` decodes the `/post/` segment the way the router does (raw if undecodable) before `postBySlugRead`; test asserts the head URL equals the client reader URL for Hebrew and ASCII slugs.
Result (Hebrew-slug post, cold, back-to-back runs `raw/cold-b2again.json` vs `raw/cold-fixfinal.json`): slug reads **2 → 1**, REST total 14 → 13, READY **4123 [4081–4230] → 3945 [3910–4041]** (−178 ms, ranges do not overlap). Unchanged where it should be: ASCII post 3947 → 4054 [ranges overlap], Home 4063 → 3997, World 4590 → 4660 (all inside ranges).

## F2 `1efb6efc` — complete a failed back/forward scroll restore (downwards only)
Problem (review finding, narrowed by this work): after browser **forward**, World stayed at 0 instead of ≈2750 px. 
Fix: `scrollRestore2029.js` + a small layout effect in `RouteEffects2029`: remember each history entry's offset (session storage, ≤60, ignores the clamp caused by the page being swapped out), and on back/forward wait (≤4 s) until the document is tall enough, then scroll **down** to the offset only if the browser left the page >40 px above it; never scrolls up, cancelled by touch/wheel/key/pointer, hash navigation untouched, `history.scrollRestoration` left on `auto`.
Result (`raw/b2v2.json` vs `raw/fixv3.json`, n=7): forward → World restored **0/7 → 7/7** (2630–2897 px vs ≈2745 before leaving, 0 px in all 7 baseline runs); back → Home unchanged (the browser already restores it; 4/4 valid runs in both); READY forward 237 → 244 ms, back 509 → 506 ms, blocking and touch-scroll frames unchanged; Home/World cold READY unchanged.
Not proven / trade-offs: back from World → Home CLS 0.10 (2/7 runs >0.1) vs 0.17 (5/7) — the fix scrolled nothing in that step (`yRestored` 0 in both), so I read it as noise, but n=7 cannot separate it; only forward-with-late-content is shown to benefit; desktop, signed-in, real device, hosted preview untested.

## Correction to the review (`claude-review/README.md`)
The review reported "Home after back = 33 px instead of ≈2047" at every stage. That was a **harness artifact**: my `tap()` called Playwright's `scrollIntoViewIfNeeded`, which scrolled Home up to the first post card before the tap, so the position the user "left" was ≈33. With the tap helper fixed (prefers a control already in view) the unpatched PR1100 restores Home to ≈2709–2800 on back. What stands: forward → World is not restored (0 vs ≈2745); a page entered from a scrolled page starts at 0 already; and the back-to-Home CLS comes from content arriving in waves, not from a missing restore. My first F2 (manual `scrollRestoration`, reset-to-top, restore-on-POP) was therefore the wrong fix: it raised back→Home CLS 0.07 → 0.61 (`raw/fix2.json`, measured with the old tap) and was replaced by the narrower version above.

## Not done
- Reserving heights for `DiscoveryGateways` (`dg29`) / hero reveals (the real source of the back-to-Home CLS): another Home claim (`ecea2ed8`) covers `DiscoveryGateways2029.jsx`; not touched.
- Applying to PR1100 or pushing a branch: needs ZURIEL's permission.
