# Recovery fix — "two failures → healthy" removed; the space limit above the reading place is a defined open task of the shell

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · actor CLAUDE (same executing session) · to ZURIEL, passive (no dispatch, no ACK wait)
Branch `claude/perf-next-wave-20261016`, continued from the remote head `97363471` (verified: local = remote, tree clean, ownership scan of `work_log` clean — the only other writer since the BEFORE row, `CLAUDE_HOME_STORY_CARD_COLUMNS_20261017`, released its scope at 01:07 and touched none of these files).
State: **BRANCH-ONLY**. Not merged, not deployed, no pull request, no Production, nothing pushed to `ccr-*`. No Legacy, database / RLS, live switch, shared reader or engine, shared CI or deployment setting touched; `scripts/perf-execution-2029/*` and `browser-metrics.mjs` untouched (the general measurement gap stays closed at `759c2239`).
Input of every measurement is the **synthetic** `smoke-snapshot-3.json.gz` (sha256 `d3f8f58e…a686`, not committed). The private central corpus is not reachable from this environment: **real-corpus acceptance stays `BLOCKED_INPUT`**. The runs prove layout and behavior only; no timing or speed is claimed.

Product commit **`4fb991385773ef1f812cb699e63f0b0474256eb5`** (the hook, its tests, the evidence tool); the document commit that carries this file and the evidence follows it — its SHA is the final SHA of the branch (it is in the AFTER row and in the delivery message). The give-back build that was measured and removed is `c90bf0cd` (history). Rail package: branch `claude/perf-rail-fix-20261016`, code commit `c2ef5064ba161eeb2e5ae14443a1963fd592d524`, branch head `671d68b207f33d260e03ac4427c974afab49d0c0`.

## The three outcomes, first

1. **"Two failures → healthy" is fixed.** A failure is not proof that the next read fails, so nothing is remembered about failures: every entry starts from the whole box that was remembered (the last healthy one), whatever happened on earlier entries. `STRIKES_TO_BOUND`, `messageBox`, `entryMemory` are gone; the limit was not raised, waived or hidden — it was **removed as a policy** and its second half (giving the space back) is the open task below.
2. **The space limit above the reading place is NOT delivered, and the reason is a measured root cause, not a choice of number.** Giving the space of a failed area back while it is entirely above the person (idle, restorer not holding, the page put back by exactly the measured drift) was built, tested in a real browser harness (0 counted), and then **measured on the real app: the browser counts it** (CLS 0.88 at 390, 1.1–1.5 at 320; the old hook, which gives nothing back, 0–0.025 in the same samples). Cause below. It is a change of the shell, not of this hook, so it is left as a defined open task (section "The open task").
3. **The rail fix is an independently acceptable package** (section "The rail package"): its own branch `claude/perf-rail-fix-20261016`, one commit, three files, its own signed evidence.

## The recovery gate — failing on the code it was written for, passing after

The gate (`../home-stability-v3/recovery-gate.mjs`, run by `run-matrix.sh recgate`) is six cases at four widths on the real app (mobile profile at 320 × 640 and 390 × 844; desktop profile — mouse, keyboard — at 1440 × 900 and 1920 × 1080), 3 pairs each, every return watched for 9 s. Fixed limits: layout shifts the browser counts ≤ **0.1**, reading place ≤ **12 px**, the content that came back identical (titles, headings, links, images, rows). Cases: `recover2` (three entries: two with every read failing, then a healthy one), `blip` (one failing, then healthy), `persist` (three entries that all fail), `empty` (the lists come back empty), `retry` (a failure that is over, the person presses the retry control that is in view), `healthy` (nothing fails: the change must not cost the normal case); the persistent / empty / healthy cases also check a deliberate scroll (never pulled back) and the exact return. A case without a valid sample or without the control it needs is `NOT_RUN`, never a pass. Samples invalidated by their input or exit point (the 320 × 640 viewport sometimes has no really visible post control at the moment of departure) stay `INVALID` and are counted in "valid samples".

| case | arm | 320 | 390 | 1440 | 1920 |
|---|---|---|---|---|---|
| recover2 | A 97363471 | FAIL (2/3) | FAIL (3/3) | FAIL (3/3) | FAIL (3/3) |
| recover2 | **B 4fb99138** | FAIL (3/3) — see "The one failing cell" | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| blip | A 97363471 | FAIL (3/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| blip | **B 4fb99138** | PASS (**1/3** valid) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| persist | A 97363471 | FAIL (2/3) | FAIL (3/3) | PASS (3/3) | PASS (3/3) |
| persist | **B 4fb99138** | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| empty | A 97363471 | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| empty | **B 4fb99138** | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| retry | A 97363471 | PASS (2/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| retry | **B 4fb99138** | PASS (3/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| healthy | A 97363471 | PASS (2/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |
| healthy | **B 4fb99138** | PASS (2/3) | PASS (3/3) | PASS (3/3) | PASS (3/3) |

A (the head the round started from): PASS 17 · **FAIL 7** · NOT_RUN 0 — B (this branch): PASS 23 · FAIL 1 · NOT_RUN 0. (`results/gate/gate-A-*.md`, `gate-B-*.md`; the raw results, scrubbed of content text and signed, are in `results/gate/mobile` and `results/gate/desktop`. Every file carries the arms' commits and dist-tree signatures: A `973634715723…` / `0019d89f2e41…` — the same tree as `eed39c9a`, `97363471` only added documents — B `4fb991385773…` / `7ac96d192cdc…`; input `d3f8f58e…`; `--corpus synthetic`.)

**The healthy entry after two failures (`recover2`), the case this round is about** — CLS of the third return, every valid sample, and what came back:

| width | arm | valid | return 3 (healthy) CLS per sample | content that came back | reading place (3rd) |
|---|---|---|---|---|---|
| 320 | A 97363471 | 2/3 | 0.404 · 0.415 | same in every sample | 0 px |
| 320 | B 4fb99138 | 3/3 | 0.026 · 0.184 · 0.033 | same | 0 px |
| 390 | A 97363471 | 3/3 | 0.252 · **0.937** · 0.317 | same | 1 px |
| 390 | B 4fb99138 | 3/3 | 0.023 · 0.051 · 0.031 | same | 0 px |
| 1440 | A 97363471 | 3/3 | 0.192 · 0.192 · 0.114 | same | 0 px |
| 1440 | B 4fb99138 | 3/3 | 0.044 · 0.024 · 0.024 | same | 0 px |
| 1920 | A 97363471 | 3/3 | 0.129 · 0.053 · 0.053 | same | 0 px |
| 1920 | B 4fb99138 | 3/3 | 0.028 · 0.028 · 0.028 | same | 0 px |

Also on A: `persist` at 320 / 390 fails the reading place at the third failing return (**196 px**: the area starts at the bound and the block the person was reading moves by what was given back inside it) and `blip` at 320 fails (0.186). B starts every entry from the whole box, so none of these exist; the first and second returns are the same on both arms (0 – 0.025, the baseline of the story block).

**The one failing cell, stated plainly (`recover2` at 320, B).** One sample of three had 0.184 on the healthy third return (the other two 0.026 and 0.033), so the gate says FAIL, and it is not turned into a pass. It is **not caused by the recovery path**: B-only extra samples at 320 (not part of the table; `results/gate/extra/`) — the recovery sequence again, 4 valid: third return 0.006 · 0.025 · 0.031 · **0.184**; and a control with **no failure at all** on the same build, 7 valid first returns: 0.011 · 0.025 · 0.033 · **0.1845** · 0.011 · 0.037 · 0.005. The same value and the same sources (`div.sod29-flight-copy` of the Home story and the gateway section under it), with or without a failure. What the per-frame series of the control shows: ~565 ms after Back the story's text arrives and the document grows by ~115 px above the reading place, and the restorer's third placement jump (+127 px, `scrollTo` 2421 → 2548) puts the person back at the same block (final displacement 0 px) — a compensating jump of the same kind the open task is about, counted by the browser. **The old build shows it too**: the same no-failure control on `97363471`, 4 valid first returns: 0.187 · 0.027 · 0.025 · 0.002 (`extra-nofailure-320-build-97363471-8pairs`; the tool labels its single arm "B" in that file, its commit signature says `97363471`). It is a separate item of the story block / the shell (the clip would have to be gone for the restorer's jump too), not part of "two failures → healthy", and nothing in this round touches it. Whether the shell change of the open task also removes it is **not verified** here.


## Why the give-back above the person is counted here (root cause, measured)

Every ancestor of Home's content that clips overflow makes Chrome count layout movement under it **even when the scroll is compensated in the same task, by the browser or by us**. In the shell these are `html`, `body`, `#root` (`index.html`: `overflow-x: clip`) and `.sod29-root` (`overflow-x: hidden`, which also computes `overflow-y: auto`, so it is a scroll container).

How it was found (each step on the real app unless marked):

| step | result |
|---|---|
| first run of the gate on the give-back build (`results/overflow-diagnostics/giveback-first-matrix-run-gate-recover2-320-AB.json.gz`) | 320: first return CLS 1.47 / 1.15 / 1.15 (the old hook: 0); `compensations: []` — the browser's own scroll anchoring did the compensating |
| the same with our own `scrollBy` by the measured drift and anchoring paused (`v1-390`) | identical: 0.609 + 0.269 = 0.878 at 390; the compensation is recorded (`[-548, -242]`) and the reading block does not move (0 px) |
| no animations / transitions; `position: static` everywhere; `html, body, #root` visible; `.sod29-root` `overflow-x: clip` | the same 0.878 each time |
| per-frame sampler (`sampler`, not committed) | the reader (`dg29`) is at the same viewport position before and after; `hero`, which is above, moves down by the drift; the document shrinks by exactly the drift — a correct compensation, still reported with the reader as the shifted source |
| **static replica** of the real DOM + the real CSS, scripts removed (`overflow-ancestors/replica.mjs`) | reproduces 0.2689; "every element `overflow: visible`" → 0; the 15 subsets of {html, body, #root, .sod29-root} show it is 0 **only when `#root` and `.sod29-root` and `html` or `body` are visible**; with all four visible, one inner `overflow-x: clip` (`.sod29-main`, `.sod29-content`, `.h29`) brings the 0.2689 back |
| the real app with `html, #root, .sod29-root { overflow: visible }` injected (`diag-vis-*`) | 390: CLS 0, reading block 0 px; 320: 0; 1440: 0.024; 1920: 0.016 (those two are small shifts at 0.8 s, before any give-back); `scrollWidth − innerWidth = 0` at 320 / 1440 / 1920 |

The micro-experiment of an earlier round ("a compensated collapse above the viewport counts nothing") was correct for a page with no clipping ancestor and wrong for this shell; the statement in the earlier documents that the browser counts it was right for this shell, its explanation (which elements are counted) was incomplete.

### The real-app runs behind the root cause (diagnostics, one arm, not acceptance)

`results/overflow-diagnostics/` (scrubbed, gzip; commit signature of the build; the runner of these runs is the one committed here, its `DIAG_JS` hook injects only what the caller sets):

| run | change | width | CLS of the return | counted shifts | scrollBy of the hook | reading block |
|---|---|---|---|---|---|---|
| b390 | give-back, the browser puts the page back (scroll anchoring) | 390 | 0.8782 | 0.609 + 0.269 | none (native anchoring) | 0 px |
| v1-390 | give-back, scroll anchoring paused, our scrollBy by the measured drift | 390 | 0.8782 | 0.609 + 0.269 | −548, −242 | 0 px |
| diag-css-none | … no animations / transitions | 390 | 0.8782 | 0.609 + 0.269 | none | 0 px |
| diag-fixed-hide | … `position: static` on every element | 390 | 0.8782 | 0.269 + 0.609 | none | 0 px |
| diag-overflow-vis | … `html`, `body`, `#root` overflow visible (`.sod29-root` unchanged) | 390 | 0.8782 | 0.269 + 0.609 | none | 0 px |
| diag-root-clip | … `.sod29-root` `overflow-x: clip` (the others unchanged) | 390 | 0.8782 | 0.269 + 0.609 | none | 0 px |
| diag-vis-all | … `html`, `body`, `#root`, `.sod29-root` overflow visible | 390 | **0** | none ≥ 0.01 | none | 0 px |
| diag-vis-html-root | … `html`, `#root`, `.sod29-root` overflow visible (`body` clips) | 390 | **0** | none ≥ 0.01 | none | 0 px |
| diag-vis-320 | same | 320 | **0** | none ≥ 0.01 | none | 224 px (the reading block is the failed area that was given back) |
| diag-vis-1440 | same | 1440 (desktop) | 0.024 | 0.023 (at 0.8 s, before any give-back) | none | 0 px |
| diag-vis-1920 | same | 1920 (desktop) | 0.016 | 0.013 (same) | none | 0 px |

The replica (`overflow-ancestors/replica.mjs`, output kept in `overflow-ancestors/replica-output.md`) is the same experiment without the app: the real DOM and CSS, one ancestor changed at a time.

## The open task (defined; nothing here asks ZURIEL to choose a number)

**What.** Give the reserved space of a failed Home area back (bounded to `KEEP_RESERVE_PX` = 160 px) while it is entirely above the person, without moving what they read and without a counted shift.
**Why it cannot be done in `useSettledBox2029.js`.** See the root cause: the compensation is exact and the browser counts it because of the clipping ancestors. The hook (built, tested, then removed in this round) is exactly: idle for 400 ms with no scroll / wheel / touch / key / pointer, the restorer not holding (`overflow-anchor` not `none`), tab visible, ≥ 150 ms after the previous give-back (several in one frame are counted heavily), measure the drift of the box's bottom after shrinking it, `scrollBy` by exactly that drift (0 when the browser already did). It is in the history of this branch (`c90bf0cd`) and works wherever no ancestor clips.
**Owner.** The System Frame / shell (`index.html`, `sod2029.css`), i.e. the frame owner of D7 in `../next-wave/dependency-handoff-20261016.md`.
**What has to change, and what that costs (not done here).**
* `html`, `body`, `#root`, `.sod29-root` must not clip on the way to Home's content (visible on all four does it; `html` **or** `body` may keep `clip` — the replica shows it, the real app confirms it with `html, #root, .sod29-root`). A horizontal-overflow guard is still wanted: it can sit on `html` only, or on leaf containers that do not wrap the reader.
* `.sod29-root` is today a scroll container (`overflow-x: hidden` makes `overflow-y: auto`), so `.sod29-header` and `.sod29-sidebar` (`position: sticky; top: 0` in `sod2029.css`) stick to it, not to the viewport. Making it non-clipping makes them start sticking to the viewport on every surface. That is a visible change of the whole shell and needs the frame owner's decision and a 2029-wide acceptance — which is why it is not a drive-by in a Home hook.
* Content that overflows horizontally would no longer be clipped at four levels: the check is `scrollWidth − innerWidth` on every surface at 320 / 390 / 1440 / 1920 with the real corpus (`BLOCKED_INPUT` here).
**Acceptance for the task** (the tools exist): the replica table above with the shell's CSS as it would ship; `recovery-gate.mjs --enforceSpace` on the real app at 320 / 390 / 1440 / 1920 with the give-back hook restored from `c90bf0cd` (or a re-derivation): every case PASS, the "space above the person" column "within the limit", CLS ≤ 0.1 in every valid sample, the reading place ≤ 12 px; plus the sticky header / sidebar review and the horizontal-overflow check.
**What the person gets until then.** After a failure the area keeps its whole box while it is in view or above the viewport (it is bounded at once when it is below the viewport, and a retry gives the whole box back for its own loading). That is the behavior of the earlier packages, before the closing round; a person who scrolls up to a failed area finds the message in the box it always had.

## Old-failing / new-passing

The same scenario, the hook of `97363471` (kept as `test/fixtures/settled-box-harness/useSettledBox.97363471.js`, the negative control) against the hook of this branch:

| where | scenario | `97363471` | this branch |
|---|---|---|---|
| `test/home-settled-box-dom-2029.test.mjs` (real browser, the hook alone) | two failed entries, then an entry whose list loads | **starts at 160 px and grows** to the natural box (test 22, the control, passes only because it fails) | every frame is the real box, no loading slots, 0 counted (test 21) |
| same | a failed entry changes nothing about the next one, however many failed; an empty list is the same; a cold area that failed | – (the box is the bound after two) | whole box, message stays in it (tests 23, 24, 25) |
| same | above the viewport | – | the whole reservation stays for the rest of the entry however idle the person is, **the hook never calls scrollBy / scrollTo / scroll**, 0 counted (test 16) |
| `test/scroll-return-2029.test.mjs` (the real hook with the real restorer and real components) | three failing returns | the third entry starts ≥ 300 px smaller than the second (test 19, control) | the third starts where the second started, the reading place exact in each, 0 counted (test 18) |
| same | two failed returns, then a healthy one | the healthy entry starts hundreds of px smaller and grows into the page (test 21, control) | it starts no smaller than the failing entry before it, is the page again (±30 px of the first visit), displaced ≤ 12 px, CLS ≤ 0.01 (test 20) |
| same | one failed, then healthy; every read fails; the lists come back empty; a deliberate swipe right after the return | – | tests 22, 23, 24, 25: displaced ≤ 12 px, CLS ≤ 0.01, no `scrollTo` after the touch |
| `test/home-settled-box-2029.test.mjs` (source) | the hook keeps no history (`entryMemory`, `messageBox`, `STRIKES_TO_BOUND`, `readMessageBox`, `strikes`, `lastWidth` absent) and never scrolls | – | test 20 |
| the real app, `recovery-gate.mjs` | `recover2` at 320 / 390 / 1440 / 1920 | **FAIL at all four** (0.404 / 0.252 / 0.192 / 0.129) | PASS at 390 / 1440 / 1920; 320: see "The one failing cell" |

Reproduce: `node --test test/home-settled-box-2029.test.mjs test/home-settled-box-dom-2029.test.mjs test/scroll-return-2029.test.mjs`; the real app: build both commits, then `SHA_A=<40-hex> SHA_B=<40-hex> CORPUS=synthetic PROFILE=mobile WIDTHS="320:640 390:844" OUT=… bash docs/perf-evidence-20261016/home-stability-v3/run-matrix.sh recgate` (and `PROFILE=desktop WIDTHS="1440:900 1920:1080"`), then `node recovery-gate.mjs <OUT> --arm A|B` (`--enforceSpace` makes the open task decisive).

## What was kept, what was dropped

* **Kept:** the rail fix (`frameLayout2029.js`, `SystemFrame2029.jsx`), a message never shrinks the box its loading state had, the bound **below** the viewport (immediate, as in package 1), a retry giving the whole box back, the signed evidence of the closing round, the evidence tool (profiles, signatures, `--cycles`, `--recover`, `--capsule`), the story-comment fix.
* **Dropped:** `STRIKES_TO_BOUND`, `messageBox`, `entryMemory`, the start-at-the-bound on a fresh entry. `lastWidth` (only the record used it).
* **Not raised, not waived:** the limit is `KEEP_RESERVE_PX` = 160 px as before; it is applied where nothing the person sees can move (below the viewport) and its application above the reading place is a defined open task with measured cause; no valid content is hidden; counts and order are unchanged; no acceptance threshold changed (CLS 0.1, 12 px).
* **Evidence tool added to:** `recovery-gate.mjs` (the six cases, the open "space above the person" column), `--retry`, `--cycleHorizon`, the `recgate` group, `DIAG_JS` (diagnostic hook, nothing injected unless set), `scrub-results.mjs` also removes the diagnostic page dump. `scripts/perf-execution-2029/*` and `browser-metrics.mjs` are not touched.

## The rail package (independent)

Branch **`claude/perf-rail-fix-20261016`**, from `f60d0788` (the head the closing round started from), one commit **`c2ef5064`**: `frameLayout2029.js` (new, two pure decisions), `SystemFrame2029.jsx` (uses them for the stage class and the capsule's auto-open), `test/frame-rail-width-2029.test.mjs` (10 tests: the decision table over all surfaces × inputs against a verbatim copy of the old rules, the frame's real stylesheets in Chromium, the frame source). It does not contain the settled-box hook, the restorer tests or the evidence tool, and nothing in it depends on them: the rail is a decision of the frame. Its own A/B on the real app (A = `f60d0788`, B = that commit; desktop profile 1440 with 10 pairs, 1920 with the capsule probe, phones 390 / 320 as a no-regression check) and its acceptance note are on that branch under `docs/perf-evidence-20261016/rail-fix/`. Results there (A `f60d0788`, B `c2ef5064`, signed, synthetic input): 1440 with 10 pairs — A CLS 0.063–0.212, median 0.161, **7 of 10 above 0.1**; B **0.024–0.044**, median 0.024; Home's column 1112 → 978 (A, 10/10) against 1112 → 1112 (B); the capsule `is-peek` (A) against `is-slim` (B). 1920: A 0.029–0.079, B 0.014–0.028. Phones 390 / 320: no change. Branch head `671d68b2` (the code commit plus its note). The earlier signed evidence for the same code (`eed39c9a`, 38 results, 10 pairs at 1440: A 0.083–0.187 with 6 of 10 above 0.1, B 0.024–0.044) stays in `../closing-round/`.

## Tests and gates on the product commit

On `4fb99138` (docs only follow it), sequential, one file at a time: **18 files, 200 tests, 0 failures, 0 skipped** — settled box (unit) 20, settled box in a real browser 27, scroll return 25, scroll restorer 27, readiness predicate 24, evidence runner 11, frame width 10, retry 9, gateways 7, evidence corpus 6, story 6, placement 5, anchors 4, build / classification 4, density 4, preview route 4, companion 4, post cards 3.
`npm run build` ok; `npm run test:2029-bundle-budget` 5/5; the 19 isolation-gate commands exit 0 (`node scripts/test-2029-system-frame.mjs` among them: the System Frame source carries no lab wording). The rail branch: 10 frame tests and gate 04.

## Superseded statements in earlier documents

* `../closing-round/README.md` §2 "A fresh entry gives the space back … after two failed entries" and "What it costs" (`recover2` 0.13–0.9) and open decision 2 (`STRIKES_TO_BOUND`): **removed by this round** (the rule is gone; there is no number left to choose). The sentence there that giving the space back above the viewport "is counted by the browser … even when the scroll is compensated" was right for this shell; its cause is now measured (above).
* `../next-wave/package1/README.md` and `../next-wave/HANDOFF.md` carry the same statement and now point here.
* The earlier belief of this session's last turn that the above-viewport give-back "counts nothing" (a micro page and the harness) was wrong for the shell: both pages had no clipping ancestor.

## Not done, and why

* **Real-corpus acceptance: `BLOCKED_INPUT`** (the private central corpus is not reachable from this environment); everything here is synthetic and proves behavior, not speed.
* **The space limit above the reading place** — the open task above.
* **The story block at 320** (0.18 in ~1 of 7 returns, with or without a failure, old build too) — separate; not touched.
* `blip` at 320 on B has **1 valid sample of 3** (the 320 × 640 viewport had no really visible post control at the moment of departure in the other two): a pass on one sample, covered by `recover2` (3/3) on the same code path.
* The 38 configurations of the earlier matrix that this change cannot affect were not repeated, as instructed. The hosted / Preview check is unchanged (`vercel.json` blocks previews for `claude/*`).
* Failing tests that were already failing before this wave and are not touched: `date-display-rule` (2 cases), `post-topic-pinned-context-rail` (#3), `companion-2029-public-source-shortcuts` (#4), `post2029-living-tree-infra` (#11).

## Ownership

BEFORE row `930ade5e-138a-4c56-9878-d7eff19aca25` (same task_key, passive to ZURIEL, dispatch NULL, scope `useSettledBox2029.js`, its tests, `docs/perf-evidence-20261016/**`); the AFTER row releases that scope. No other session was started by this work and no GPT message or ACK wait was used.

