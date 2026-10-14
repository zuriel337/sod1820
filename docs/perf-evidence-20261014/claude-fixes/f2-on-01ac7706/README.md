# F2 — scroll on back/forward, new entries and anchors, measured against PR1100 head 01ac7706

Handover to Codex (Role A) for integration. Nothing applied to PR1100, nothing merged, no DB change. Authorisation: ZURIEL's instruction in this session after Codex AFTER `2b5160bc` (which asked for an owner-qualified transfer of App/history/restore/reset); journal BEFORE `8ddfa2cc`, AFTER in the same task key `CLAUDE_2029_SCROLL_F2_20261014`.
**F1 is not included:** the Hebrew-slug head read is already in PR1100 via `67d07abf` (also handles `%2F`, no read when undecodable). My earlier F1 patch is in `../superseded/` and must NOT be applied; so is my earlier F2 version (it reset to the top on POP and raised back→Home CLS).

## Delivery
- `patches/0001-…patch` (one commit, `git am` on 01ac7706): `src/lib/scrollRestore2029.js` (new, pure + testable), `src/App2029.jsx` (one layout effect in `RouteEffects2029`, 17 lines), `test/scroll-restore-2029.test.mjs` (13 cases).
- Verified: patch applies cleanly to 01ac7706; 22 unit tests pass (13 mine + the 9 early-read cases of 01ac7706); `build:2029` passes. Not run: repo CI workflows, browser release specs, hosted preview (Codex owns those).
- Ownership kept: no change to readers, supabase.js, SystemFrame, DiscoveryGateways/Home height (scopes 75/839, visual owner), CI files, or the PR1100 branch.

## What the code does (and why)
Measured on 01ac7706: on back/forward the browser restores the offset as soon as the still-short document allows; the content above then keeps arriving and **scroll anchoring pushes the page further down** (Home +1000…+2100 px away from where the user left; World after forward stays at 0 because its content arrives later than the restore window). So, leaving the browser's first restore in place:
1. **Back/forward with a remembered offset** (per history key, session storage, ≤60 entries; the clamp caused by the page being swapped out is ignored): pause scroll anchoring immediately, wait until the document is tall enough **and** has stopped growing (400 ms; forced after 3 s; give up after 4 s), put the page at the remembered offset (instant jump — `html` is `scroll-behavior:smooth`), keep anchoring paused 1.5 s more so late content cannot move it. Touch, wheel, key or pointer input ends it at once.
2. **New entry** (PUSH to another pathname, no hash): instant jump to the top.
3. **Anchors**: any location with a hash is left to the page that owns the anchor (direct load, in-page, cross-page). Same-pathname PUSH/REPLACE (filters, query) keep their scroll.

## Measurements (`scrolltest.mjs`, `raw/n0.json` = 01ac7706, `raw/n1.json` = 01ac7706 + patch)
Mobile 390×844 touch, CPU ×4, 1.6 Mbps / 150 ms, cold context per sample, fixtures recorded live for both builds, replay 150 ms, **7 samples per side**, 0 invalid samples, 0 page errors. Input is real: touch swipes, taps on controls already inside the viewport (never a programmatic scroll), the real mobile drawer, browser back/forward. Position, timing and layout shift are separate tables.

**Position** (did the page end where the user left it?)
| | 01ac7706 | + patch |
|---|---|---|
| back → Home, within 120 px of where the user left (≈2050–2280 px) | **0 / 7** | **7 / 7** |
| forward → World, within 120 px (≈2750 px) | **0 / 7** (stays at 0) | **7 / 7** |
| new entry from a scrolled Home (post, then World via drawer) at top | 7 / 7 | 7 / 7 (explicit) |
| direct load `/world#world-plane-india`, target in view | 7 / 7 | 7 / 7 |
| in-page anchor `#world-connections`, target in view | 7 / 7 | 7 / 7 |
| cross-page `/world#world-sources` landing | y 0, target at 1207 px in 7/7 | identical (the app does not honour that anchor in either build — unchanged, not fixed) |

**Timing** (action → READY marker, median [range], ms): back→Home 511 [434–575] → 538 [504–668]; forward→World 237 [227–263] → 248 [226–273]; new entry World 2032 [1949–2115] → 2030 [1983–2105]. All inside the ranges: no measurable time cost.

**Layout shift, reported on its own** (CLS in the action window): back→Home **2.00 → 1.90, 7/7 runs >0.1 in both** (not improved: Home re-mounts in waves); new entry to Post 0.018 → 0.018; new entry to World 0 → 0; **forward→World 0 [0–0] (0/7 runs >0.1) → 0 [0–2] (3/7 runs >0.1)**. The new World shifts are a consequence of showing the correct region: the baseline never leaves the top, so it never meets the reveal/late-insertion shifts there. This is a real trade-off, not noise, and it needs the Home/Discovery/reveal height-stability work (scopes 75/839, visual owner) to go away.

## Limits
- Lab replay, mobile only: no desktop, signed-in, physical device, hosted preview. Fixture misses in 3 of 7 patched runs (1 request each, from lazy content in the restored region) — flagged, not counted as faster.
- The restore waits up to ~0.4–3 s after the document stops growing; during that time the user sees the top (same as the baseline's forward behaviour).
- The earlier claim "browser restores Home on back" (my review's correction) was too generous: it restores to the right offset first and anchoring then moves it. Corrected here; the review and claude-fixes READMEs point to this file.
