# Entry cost — D3 closed; D1/D2/D5 ranked; Home stability and acceptance blocked on input

Branch `claude/perf-entry-cost-20261017`, from the unified candidate `8c8e9df9b2b012b70479e398e75f16e7008b8619` (verified: remote head equal, tree clean, no existing follow-up branch contains it). State: **BRANCH-ONLY**. No PR, no merge, no deployment, no Production/Legacy/DB/RLS/switch change. Workflows have only `pull_request`/`workflow_dispatch`/`schedule` triggers (no `push`/`create`) and `vercel.json` disables `claude/*` deployments, so pushing the branch starts nothing.

> **Superseded in part by [`../storyviewer-isolation/README.md`](../storyviewer-isolation/README.md) (commit `5f52ab00`).** The D3 change below made `StoryViewer` lazy inside the file that Legacy also uses and left the report form's failed load without a boundary. Both are fixed there: Legacy consumers keep the static viewer (Legacy start-up graph 60 files / 687,978 B gzip, base 60 / 687,984), a failed or slow load of the viewer or the form shows a status/retry/close instead of unmounting the frame. The shell figures in this file (70,072 → 61,783 B gzip, measured with `gzip -c`) are replaced by the same-method figures there: **70,416 → 63,190 B gzip (−10.3 %)** with the load-state UI included.

## 1. Entry cost

### Ranking from existing evidence (`../../perf-evidence-20261016/next-wave/dependency-handoff-20261016.md`, synthetic input; no new timing)

| id | evidence | owner scope | decision |
|---|---|---|---|
| D3 | System Frame chunk on every 2029 route; panels that render only after an action | `SystemFrame2029.jsx`, 2029 components — in scope | **fixed here** |
| D1 | ≈350 ms idle network before the Home route graph is requested | `vite.config.js`, `2029.html` — shared build config | not changed; needs build-owner decision + central cold-load pairs |
| D2 | two `site_flags` reads per entry | `src/lib/supabase.js` is shared with Legacy | not changed (Legacy/lock-law boundary) |
| D5 | notable/ratings reads, "not shown to be a bottleneck" | Home composition | no measurement that shows a cost; not changed |

D1 has the largest *time* figure but sits in shared build configuration and its acceptance needs real-corpus cold loads; D3 is the largest *proven bytes* item inside the allowed scope, so it went first.

### D3 fix (commit `d9b45ebc`)

* `ContactGateway` (with `IssueReport`, `ReportHint`) is now `lazy` behind the frame's existing `Suspense`/`FrameState kind="loading"` pattern (same one as `NumberDrawer2029`); it loads when the report panel opens.
* `StoryViewer` in `OrGeulaStoryColumn` is `lazy` and mounted only after a story is opened (`Suspense fallback={null}`).
* Kept eager on purpose: `CompanionPanel2029` / `EventSequencePanel2029` — on wide screens the slim capsule renders at entry, so loading it lazily would add layout movement; the 72 KB raw figure in the handoff is therefore only partly addressable without a frame design decision.
* No capability removed: same components, props, permissions, return context.

Build measurement (same source base, `npm run build:2029`, before = `8c8e9df9`, after = `d9b45ebc`):

| chunk | before raw / gzip | after raw / gzip |
|---|---|---|
| `Sod2029Shell` (loaded on every 2029 route) | 235,306 / 70,072 B | 207,439 / 61,783 B (**−27,867 raw, −8,289 gzip, −11.8 %**) |
| `ContactGateway` (on demand) | in shell | 21,320 / 7,053 B |
| `StoryViewer` (on demand) | in shell | 7,605 / 3,028 B |

`2029.html` references no new chunk. This is a **bytes-on-first-load** measurement, not a timing claim: no READY/LCP/browser-work figure was taken (see blocked input). The cost moved to first open of the report form / first story open (one extra chunk request; no prefetch-on-intent was added).

### Tests
* `npm run test:2029-bundle-budget` 5/5 pass.
* `node scripts/test-2029-system-frame.mjs` PASS; `test-entry-contextual-learn-2029.mjs` and `test-issue-report-canonical-emitter.mjs` pass after their two source-shape assertions were changed from the static `import ContactGateway` to the `lazy(() => import(...))` form (same wiring checked; old form was failing on the new code, new form passes).
* `test/companion-2029-*`, `frame-rail-width-2029`, `home-story-2029`: 24/25; the one failure (`companion-2029-public-source-shortcuts` #8, `companionHasSequence = !corePublicViewer && …`) fails identically on the unchanged base (already listed in the 20261016 recovery-fix README).
* Not run: browser/Chromium suites, the full hard-source gate (not re-run per instruction; only the touched files were re-verified).

## 2. Home stability — not changed (BLOCKED_INPUT)

* The 320 px story jump (≈0.18 CLS in ~1 of 7 returns, old build too) and the failure-area space limit need the real-app recovery gate. Its synthetic snapshot (`smoke-snapshot-3.json.gz`, sha256 `d3f8f58e…a686`) is **not in the repository or this environment**, and the central corpus is unavailable; I did not fabricate or fetch live data. **No Home stability result, no CLS number, no PASS is claimed from this session.**
* Already true on the candidate and verified by reading: the failure-predicting policy (`entryMemory`, `messageBox`, `STRIKES_TO_BOUND`) is absent from `d325780c`, so a failed entry never shrinks the next entry's start height. I did not reintroduce it and did not raise thresholds.
* The measured root cause of the space limit (clipping ancestors `html`/`body`/`#root`/`.sod29-root` make Chrome count a compensated give-back) is a shell-wide CSS change that also makes the sticky header/sidebar stick to the viewport; it needs the frame owner's decision and acceptance on real content. Stable error area with retry and the 160 px bound below the viewport remain as delivered.

## 3. Acceptance gaps — not run

Number preflight (`BLOCKED_INPUT`: canonical 376 lookup result, nodes 0/376/1237/1820, method registry, shalom→376 profile), World, Entry, signed-in user, phone: no approved input in this environment, so **none was run and none is PASS**. `fx_number_lookup_page` untouched (OFF). No live fallback used.

## Ownership
Passive BEFORE/AFTER records to ZURIEL, no dispatch/ACK: no write access to the coordination DB was used in this session (read-only boundary); this README and the commit trail are the record. Scope: `SystemFrame2029.jsx`, `OrGeulaStoryColumn.jsx`, two source-shape scripts, this folder. Released at hand-off.
