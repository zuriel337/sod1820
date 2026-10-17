# Closing round — a wide return keeps Home's width; a failed area gives its reserved space back

task_key `CLAUDE_PERF_2029_NEXT_WAVE_20261016` · actor CLAUDE (same executing session) · to ZURIEL, passive (no dispatch, no ACK wait)
Branch `claude/perf-next-wave-20261016`, started from `f60d078822a40d0940860a98470930e3e9fb59d5` (verified: local = remote, tree clean). Product commit **`eed39c9a9a2263454130f4eb27c9d42278429543`**; the document commit that carries this file and the evidence follows it (its SHA is the final SHA of the branch).
State: **BRANCH-ONLY**. Not merged, not deployed, no pull request, no Production, no push to `ccr-*`. No Legacy, database / RLS, live switch, shared reader or engine, shared CI or deployment setting touched; `scripts/perf-execution-2029/browser-metrics.mjs` untouched (that gap stays with GPT); D1 / D2 / D3 / D5 not expanded.
Read first, as instructed: the top of the central handoff `7f7855a2` and the independent review `cd8d6bda` (see "The review").

Input of every measurement here is the **synthetic** `smoke-snapshot-3.json.gz` (sha256 `d3f8f58e…a686`, not committed); the private central corpus is not reachable from this environment, was not collected again, the damaged image corpus was not used. **Real-corpus acceptance is `BLOCKED_INPUT`.** The runs prove layout and behavior; they say nothing about speed, images or the real content, and no timing is claimed.

> **Superseded in part by [`../recovery-fix/README.md`](../recovery-fix/README.md).** Two things in §2 below no longer hold: the start-at-the-bound after two failed entries (`STRIKES_TO_BOUND`, `messageBox`, `entryMemory`) and its price (`recover2` 0.13–0.9, open decision 2) were **removed** — a failure is not proof that the next read fails, so every entry starts from the whole remembered box; the gate that shows it (A = this round's head fails `recover2` at 320 / 390 / 1440 / 1920, B passes at 390 / 1440 / 1920) is in the later document. The statement that giving the space back above the viewport "is counted by the browser … even when the scroll is compensated" stands for this shell, and its cause is now measured (every ancestor of Home's content that clips overflow); the space limit above the reading place is a defined open task of the shell. §1 (the rail fix, now also its own branch `claude/perf-rail-fix-20261016`), the message never shrinking the box its loading state had, and the signed evidence of this round stay as they are.

## What this round closes

### 1. The return to Home on a wide screen

**The failure, proved on the head the round started from** (`f60d0788`, desktop profile — mouse, keyboard, `isMobile=false`, 1440×900, Back from a Post, 10 pairs, `results/desk-core-1440-AB.json.gz`):

| | head (A) | this branch (B) |
|---|---|---|
| return CLS, 10 samples | 0.083–0.187, median 0.107, **6 of 10 above 0.1** | **0.024–0.044**, median 0.024 |
| Home's column (first visit → end of the return) | 1112 → **978** px | 1112 → 1112 |
| remembered boxes still held at the end | 0 of 8 (every one released) | 7 of 8 |
| the capsule | opens from 56 to 340 px after Home mounted | slim, as on the first visit |
| document, before leaving → end | 4156 → 4698 px | 4156 → 4157 px |

(An earlier 10-pair run of the same A/B at the same width, on a superseded candidate build and not committed, had A at 0.063–0.161, median 0.073; the CLS of the failure varies from run to run in the lab, the width change and the released boxes are in every sample. The central session's 0.1826 is inside this range.)

**Cause, three facts that were checked in the running app:**
1. On a wide screen (≥ 981 px) the context rail is drawn **inside the companion capsule** at the left edge, not in the main stage. The main stage nevertheless marked itself `has-context-rail` whenever a context subject existed, and that class reserves a grid column (286 px + gap + padding) for a rail that is not there.
2. The first visit to Home has no subject; the return has the one the person left with (Home's own `selectPost` puts the opened Post into the shared context). The frame remounts on every route, so on the return the column was narrower from Home's first frame — and every remembered height (settled boxes are keyed to the width they were measured at) was released by design, so the unheld blocks loaded into the page.
3. The same effect then opened the capsule (56 → 340 px) after Home had mounted: the rail's content re-flowed while it grew. After the person left the capsule the content stayed at 978 px beside an empty band (seen in the probe: `slim` with content 1046).

At 1920 the column is the same width with or without the reservation (the free space is large enough), which is why only the middle of the wide range failed; the capsule's expansion still cost something there (`desk-width-1920`: A 0.083–0.127 across the two runs of the matrix, B 0.014).

**The fix** (`src/components/experience2029/frameLayout2029.js` — two pure decisions — used by `SystemFrame2029.jsx` for the stage class and for the capsule's auto-open):
* **Home reserves no column for a rail the capsule carries.** Home's column is the same width on the first visit and on the return.
* **A subject Home was entered with does not open the capsule by itself** (a return restores the surface as it was left); the capsule opens when the person opens it. A subject that appears *while Home is shown* still opens it.
* **Every other surface keeps exactly the old rule**: the decision table is tested over all surfaces × all inputs against a verbatim copy of the old rules. Post, Topic, World, Number … still reserve their column; that is a design call for the frame owner (see D7 in `../next-wave/dependency-handoff-20261016.md`, updated).

**The rail is not hidden and nothing is lost** (probe `--capsule 1`, `desk-width-1440` / `-1920`): after the return the capsule is there with its context indicator; hovering it opens it with the **same rail and context** (`railPresent`, same text length as before the fix); the content column stays at 1180 / 1112 px while it is open, closed again after the mouse leaves. Content, order, links, images, reading place (block displacement 0 px), Forward to the same Post at the same place (0 px), a deliberate scroll afterwards (never pulled back) — every configuration, see the table.
**Decision for ZURIEL, because it changes what is visible:** on a return to Home the capsule is no longer open by itself (before: open, with the Post's context). If the open-on-return is wanted back, the cost is the one this round removed (Home's width differs between the visits) — it would need the frame owner to decide for every surface at once.

### 2. The reserved space after a failure

ZURIEL's decision stands as built in package 1 (stable message, focused retry, bounded space); this round adds **when the space is given back**.

* **The visit that fails is not moved.** The area keeps the whole box it held while in view or above the viewport (unchanged; giving it back there is counted by the browser as a shift even when the scroll is compensated — measured before). A message now also never shrinks the box its *loading* state had (the hero's loading state is taller than the bound an entry starts from; without this a failing hero shrank at the top of the page on a fresh entry: CLS 0.059 against 0.011).
* **A fresh entry gives the space back, at mount, before the first paint** (no earlier frame to shift from): an area that ended as a message on **two entries in a row** starts at the 160 px bound (and, with nothing remembered, is held at the bound instead of being drawn as loading slots). One strike per entry however often its message comes back; a list that loads clears it; a record for another viewport width does not apply. Mechanism: `useSettledBox2029.js` (`messageBox`, `entryMemory`, `STRIKES_TO_BOUND`). The bound is `KEEP_RESERVE_PX` as before.
* **Why two entries and not one** (measured, and the reason the first version was changed): with one strike, an entry that follows one failed entry and loads fine showed CLS **0.114 on desktop and 0.32–0.41 on a phone**, because an area that grows above the reading place is counted. With two strikes a blip costs nothing: `recover` below.

Measured on the real app (`failnav-*`, `recover-*`, `recover2-*`; Back after a Post, then Forward + Back again — each Back is a fresh entry):

| | head (A) | this branch (B) |
|---|---|---|
| 3 failing returns, desktop 1440: CLS of return 1 / 2 / 3 | 0.121 / 0.078 / 0.185 | **0.024 / 0.024 / 0.025** |
| … document at the end of return 2 → return 3 | 4032 → 4032 | 4130 → **3812** (−318 px) |
| 3 failing returns, 390 phone: document at return 2 → 3 | 7182 → 7182 | 7182 → **6287** (−895 px); CLS 0.001 / 0 / 0 |
| 3 failing returns, 320 phone | 7638 → 7638 | 7638 → **6669** (−969 px) |
| outage (every read but the flags fails), 390: return 2 → 3 | 6270 → 6270 | 6270 → **5375** (−895 px) |
| **one** failed return, then a healthy one (blip): CLS of the healthy entry, 1440 / 1920 / 390 / 320 | 0.393 / 0.113 / 0.022 / 0.036 | **0.024 / 0.028 / 0 / 0.032** (the page is its content again: 4157 px, 7424 px) |

**What it costs, stated plainly.** Starting an area at the bound is a prediction that it fails again. When an outage that lasted for **two failed entries** ends and the next entry loads, those areas grow from the bound, and above the reading place that growth is counted: `recover2-*` — desktop 1440 **0.226**, 1920 **0.130**, phone 390 **0.909** (0.32 in the other sample), 320 **0.411** (head: 0.546 / 0.036 / 0.028 / 0.025). Once, on the first healthy entry after a persistent failure, and nothing is lost (the content and the reading place are exact). The cost is in `STRIKES_TO_BOUND`: raising it makes the cost rarer and the blank last longer; setting it to `Infinity` returns to the previous behavior (blank space carried from entry to entry). **That trade is ZURIEL's** (decision 2 below).
Also stated: when the person was standing *inside* a failure box that gave its space back, the reading block's top moves by the blank that was inside it (phone 390: 87 px, 320: 196 px) — the person stays at that block, within what was given back; for a block that is not a failure box the displacement is 0 px (harness: the reader below failed areas, exact to 12 px).

## The evidence tool (the existing one, no second mechanism)

`docs/perf-evidence-20261016/home-stability-v3/` (`runner.mjs`, `run-matrix.sh`, `acceptance-table.mjs`, new `scrub-results.mjs`):
* `--profile desktop` — a person with a mouse and a keyboard: `isMobile=false`, `hasTouch=false`, DPR 1, wheel notches for every scroll, a mouse move and click on the departure control, `--input wheel|key` for what interrupts a restore; no touch event exists in that profile. `--profile mobile` is the default and is what every earlier result was taken with. Unknown profile / an input the profile cannot make / a malformed commit are refused before anything starts.
* the page records every input the restorer cancels on (touch, wheel, key, mouse press); `--capsule 1` hovers the capsule and reads the rail; `--cycles N` repeats Forward + Back (each Back is reported as its own fresh entry: CLS, document, remembered boxes, reading block, same content); `--recover 1` makes the last return healthy.
* **Signatures in every result file** (`signatures`): commit of each arm (`--armShas`, null if not given), the build-artifact signature of each dist tree (sha256 of the sorted "path, file sha256" lines; recorded at start and end: `stableDuringRun`), the input signature (fixture sha256 and file sha256, keys, admitted images, `--corpus synthetic|central` as said by the caller, never guessed), runner and readiness file hashes, repository HEAD and whether tracked files were dirty, and the environment (Chromium 141.0.7390.37, Playwright 1.56.1, Node v22.22.0, kernel, CPU, CPU ×4, 1.6 Mbps / 150 ms, locale, timezone, theme, motion). All 38 result files carry the same: A `f60d0788` / `17ae563a53d7…`, B `eed39c9a` / `0019d89f2e41…` (full: `isolation-gates.txt`), runner `5a569cd4…` (equal to the runner committed at `eed39c9a`), input `d3f8f58e…`. `repoTrackedFilesDirty: true` is recorded because two documents of the previous wave (`next-wave/HANDOFF.md`, `dependency-handoff-20261016.md`) were edited while the matrix ran; no product, tool or test file was dirty. Nothing was filled in afterwards; the earlier waves' evidence (no signatures recorded) is not back-filled.
* `scrub-results.mjs` is the committed form of a result (content text removed, gzip); tested.

## What was run (all sequential, one browser at a time, shared isolation: unmapped request or undecodable image invalidates a sample)

Pairs: 10 for the wide return (`desk-core-1440`), 2 for every other configuration (diagnostic counts, not a statistical acceptance). A = `f60d0788`, B = `eed39c9a`. Full table: `acceptance-table.md`; raw (content-text-free) results: `results/`.

| Asked for | Where |
|---|---|
| cold entry | `desk-load-width-1440/1920`, `mob-load-width-320/390`: first-entry CLS max 0.0237 / 0.0275 / 0.0305 / 0.0185, **equal in A and B** (no regression; the first entry is not changed by this round) |
| Back / Forward (+ Back again), same Post, same place, same content | `desk-width-*`, `desk-theme-*`, `mob-width-*`, `mob-theme-*`, `mob-reduced-motion`: Forward reaches the same Post at the same place (0 px), the second Back lands on the same block (0–1 px), the same titles / headings / links / images / rows (hashes) — every configuration |
| a deliberate scroll | same runs: moves the page by what was asked, **no programmatic scroll follows** — every configuration |
| a restore cancelled by input | `desk-interrupt-wheel-250/600`, `desk-interrupt-key-250/600` (desktop), `mob-interrupt-250/600` (touch): programmatic scrolls after the input = **0** in every sample; both phases seen (before the first placement, during the hold) |
| mobile 320 / 390 | `mob-*`, `failnav-*`, `recover*-*` at 320 and 390 |
| desktop 1440 / 1920 | `desk-*`, `failnav-*`, `recover*-*` at 1440 and 1920 |
| three themes | dark (every run), light and parchment: `desk-theme-*` (1440), `mob-theme-*` (390); reduced motion: `mob-reduced-motion` |
| skeletons and failure messages are not usable content | unchanged readiness predicate v5 (`readiness.mjs`, same hash as before); a failure run reports no usable time |

Highlights, A → B, return CLS (max of the configuration): desktop 1440 dark 10 pairs 0.187 → 0.044; light 0.165 → 0.044; parchment 0.165 → 0.044; wheel-interrupt 250 / 600 ms 0.155 / 0.173 → 0.044 / 0.044; key-interrupt 0.082 / 0.077 → 0.025 / 0.025; error / outage state 0.121 / 0.092 → 0.024 / 0; 1920 0.127 → 0.014. Phones (`mob-*`: 320, 390, three themes, reduced motion, touch interrupts): A and B within noise, every value ≤ 0.055 in both — the phone return is not changed by the frame fix.
Residuals, both arms, not caused by this round: a first-screen floor of 0.024–0.05 at 1440 (the notable strip's header and cards arriving above the gateways, unheld before its read resolves) and, for every healthy return in B, nothing above 0.055.
Invalid samples, excluded by the rules and listed: 6 at 320×640 (`failnav-error-320` A#1, `failnav-outage-320` A#2 and B#2, `recover-320` B#1, `recover2-320` A#2 and B#2: the fixed script finds no fully visible departure control at that height; the same kind as before) — so the 320 rows have 1 valid sample per arm in those groups. In the first (superseded) run one `mob-reduced-motion` sample had an unmapped request (invalidated).
`same NO` in the failure rows is expected: the page shows messages instead of the content it had at the first visit; the comparison of what Home shows is meaningful in the healthy rows (`same yes`).

## Tests and gates

* Home / scroll / frame set, sequential, on the final commit: **17 files, 197 tests, 0 failures, 0 skipped** — scroll restorer 27, scroll return 21 (five new: three failing returns, the old hook as negative control, one failed return then healthy, two failed then healthy, every read failing), settled box 22, settled box in a real browser 30 (eleven new, with the hook of `f60d0788` and of `a704ba9e` as negative controls), readiness predicate 24, retry with the real components 9, story 6, anchors 4, build / classification 4, evidence corpus 6, evidence runner 11 (five new), **frame width 10 (new)**, gateways 7, post cards 3, density 4, placement 5, preview route 4.
* Old-failing / new-passing: `test/frame-rail-width-2029.test.mjs` — the decision table against a verbatim copy of the old rules (over every surface and input), the frame's real stylesheets in Chromium (the reservation narrows the column at 1440, never at 1920; Home's column equal on first visit and return; Post unchanged), and a source check that the frame uses the decisions. A mutation (the old behavior put back) fails four of its ten; the new one passes ten. The settled-box tests run the same scenarios against `f60d0788`'s hook (the next entry holds the whole box again) and `a704ba9e`'s (the hero shrank on its message).
* One existing assertion changed on purpose: `scroll-return-2029` "reads above the reading place fail" counted "one placement, one follow"; the follow was the restorer putting back the hero's shrink (the hero's loading state is taller than the box it remembered). It is now one placement; the comment says why.
* `npm run build` ok; `npm run test:2029-bundle-budget` 5/5 on a fresh build of `eed39c9a`; the 19 isolation-gate commands exit 0 (`isolation-gates.txt`). The first gate run on `a704ba9e` had gate 04 exit 1: a comment in `SystemFrame2029.jsx` contained "Research Context", which the System Frame's public-copy assertion scans for (comments included); reworded, the dist tree is identical.
* Failing before this round and unchanged by it, verified on a clean worktree of `f60d0788`: `date-display-rule-2029` (2 cases), `post-topic-pinned-context-rail-2029` (1), `companion-2029-public-source-shortcuts` (1), `post2029-living-tree-infra` (1) — stale source-pattern assertions in files this round did not touch. Not made to pass.

## The review (`cd8d6bda`) and the central acceptance

* Finding 1 (shared `browser-metrics.mjs` counts transparent / off-screen / message-with-link content): **not touched**, as instructed (GPT). Every number here comes from the Home tool's predicate v5, which rejects all four; a central "usable" time must be read as composed-only until the shared metric is fixed.
* Finding 2 (results not bound to a SHA / build): done for everything in this round (signatures above). The earlier packages' evidence stays unsigned; it is not back-filled.
* Finding 3 (wide returns reported from two pairs, best not max): this round reports the **max** everywhere and ran 10 pairs for the 1440 return; it is still the synthetic input — the central ≥ 15 pairs on the real corpus remain to be run.
* Minor: the `//` comment in `WorldFlightStory2029.jsx` that swallowed `privateStage / previewSnapshot / extensionsPending` is fixed (the fields are real; the story tests, which compare the markup byte for byte, pass). Not done: the `Reveal` MutationObserver's `flushSync` per class mutation of the plane-story subtree — to be measured on real content.

## Open decisions for ZURIEL

1. **Open on return.** Home's capsule is no longer open by itself on a return (above). Keep, or ask for it back with a decision for every surface.
2. **Bound after two failed entries** (above): the price is one counted shift (0.13–0.9) on the first healthy entry after a persistent failure. Keep `STRIKES_TO_BOUND = 2`, raise it, or set it to `Infinity` to give up the bound (the blank then stays from entry to entry, as before this round).
3. **The other surfaces' empty column** (frame owner): on a wide screen Post / Topic / World / Number reserve a column for a rail drawn in the capsule. Not changed.

## Remaining work (unchanged scope)

Central acceptance on the real corpus with these tools (`--profile desktop`, `--cycles`, `--capsule 1`, `--forward 1 --deliberate 1`, three themes, ≥ 15 pairs for 1440), a signed central receipt; D1 (route preload), D2 (two `site_flags` reads), D3 (frame panels on demand), D5 (ratings reads): measure before deciding; the hosted / Preview check (`vercel.json` blocks previews for `claude/*`, checked against the configuration only); the unified head with the Number / CI work (`3c3ea58a`), which this branch does not contain.

## Ownership

BEFORE row `5e4d1a12-e4d3-4fb9-b0a4-4f508b0dd177` (same task_key, passive to ZURIEL, dispatch NULL, scope `src/components/experience2029/**`, its tests, `docs/perf-evidence-20261016/**`); the AFTER row releases that scope. No other session was started by this work and no GPT message or ACK wait was used.
