# Staged loading of number research results in the 2029 World — experiment, NOT recommended for adoption

Branch `claude/staged-results-2029-20261015`, built on the combined test build `4c4c700b`. Not part of the combined acceptance commit. No merge, no deploy, no migration, no live flag change (the new switch is OFF; no `site_flags` row exists).

## Recommendation
**Do not merge.** Time to usable content did not improve with proof (pooled n=12/arm, 1.6 Mbps wire model: 2440 → 2251 ms, bootstrap 95% CI of the difference [−251, +106] ms includes zero), while opening the Gematria lane got slower with proof (307 → 1139 ms, CI [+330, +1259]). The measured, real effects are fewer requests to first content (54 → 45) and no loss of correctness. Keep the branch and evidence; the narrower candidate in "What did work" needs its own, larger measurement.

## Step 1 — dependency map (`fn_number_lookup` and its consumers)
Payload for number 776: 379 rows, 471 KB decoded, **~31 KB on the wire (gzip)**; processing the rows into Universal Findings in `researchNumber` costs ~10 ms (unthrottled node, `tools/cpu-stages.mjs`). The lookup is not CPU-bound; in the 776 waterfall it is not on the critical path at all (response at 656 ms of 2262 ms; the path is ~10 dependent waves of ~150 ms: node resolve → lookup/anchors → edges → nodes → media/topics → nodes → edges → nodes → entity links → cross-method).

| Consumer | Requests / when | Fields needed for first content | Used for count / order / rank / relations | Detail only |
|---|---|---|---|---|
| `fetchEntityHubProjection` → `familyLookup` → `getValueFamilies` (+`fetchMethodRegistry`, 2 enrichment reads per ≤300 shown phrases, `fetchNodesByLabels`) | 1 page of `numberLookupLimit` (default 500, with `total_count`; a second unbounded call only if the page is not exhaustive), at projection start | per-method **distinct phrase counts** (needs the whole population), 12 phrases per method, governance flags | counts, display priority, governed-first | enrichment (ragil/tags/world), phrase→entity links |
| `researchNumber` lens `number_lookup` (window 500) | same RPC, deduplicated per projection | none for World's overview | `total_count`/`source_exhaustive` bounds; one Universal Finding per row | all of it |
| `World2029Page` | uses ONLY `lenses.numberResearch.universal_findings` (role `number-lookup-row`) and `bounds.number_lookup`, only inside the **Gematria lane** (`worldGematriaRows`, filters/search over the full set, lane badge) | — | — | the lane |
| `World2029Page` and the families | **does not use** `data.gematria.families/registry/phraseEntities` anywhere | — | — | — |
| `Number2029Page`, `NumberDrawer2029`, `EntityHubPreview*`, `EntityHubGoldenControls` | own `fetchEntityHubProjection` calls; families on the first screen | families need the full population for true per-method counts | counts | — |
| `methodLensProjection`, `researchComposerW2`/`researchResultBundle`, legacy `NumberFamilies`/`getNumberLookup` | own calls; not touched | | | |

Chosen route: **World number view** (clear boundary: first screen = overview/prominence; the lookup lens + families are only needed for a lane the user may never open). Number page: **no safe split** — its first screen shows families whose per-method counts require the whole population; staging them would show page counts as totals. A server-side per-method count aggregate would be required (not drafted, nothing applied).

## Step 2 — what was implemented (behind `fx_staged_number_results`, default OFF)
- `entityHubProjection.js`: option `stagedNumberResults` (default false = unchanged one-shot path). ON: the first projection does not fetch the `number_lookup` lens, the word families/registry/enrichment, or phrase→entity links; it marks `lenses.numberLookupStage = {deferred:true,number,limit}`. New `fetchNumberLookupStage` runs the **same** `researchNumber` lens with the same window (500, true `total_count`), transport and provenance; pure `mergeNumberLookupStage` attaches it and refuses a stage for a different number.
- `World2029Page.jsx`: reads the switch only for number subjects; the stage starts when the Gematria lane is clicked, hovered, focused or touched (not automatically, not after idle); lane badge shows `…` instead of a false 0 until loaded; loading and failure use the existing `FrameState` (failure: retry button, no partial list); a token drops late answers of a previous entity.
- `runtimeSwitches2029.js`: new registry entry (shown by the existing control panel generically; no DB change — `admin_set_runtime_switch` already accepts any `fx_` key). Existing switches unchanged and independent.
- Loaded immediately: everything except below. Deferred until the lane is approached: the 500-row lookup lens (Universal Findings, bounds, lane list/filters). Dropped for World (unused there): families, method registry, phrase enrichment, phrase→entity reads (−8 requests).

## Step 4 — evidence (776, mobile 390x844, CPU x4, replay at fixed 150 ms/request + simulated shared downlink with gzip wire sizes; `tools/staged-measure.mjs`, raw in `raw/`; runs with fixture misses or a failed lane are excluded — 0 excluded)
`ab3-summary.json` (1.6 Mbps, n=12/arm, passes interleaved):
| | OFF (world switch ON only) | staged | families-skipped only (attribution build, not committed) |
|---|---|---|---|
| click → first usable content, ms | 2440 [2397–2831] | 2251 [2189–2601] | 2379 [2351–2793] |
| requests to content | 54 | 45 | 46 |
| wire KB to content | 110 | 73 | 104 |
| main-thread CPU to content, ms | 808 | 665 | 775 |
| click on Gematria lane → list, ms | 307 [212–704] | **1139 [627–1666]** | 380 [212–805] |
| total requests (content + lane) | 55 | 47 | 47 |
Diff of medians vs OFF (bootstrap 95% CI): staged content −189 ms [−251, +106]; families-only −61 [−120, +114]; lane staged **+832 ms [+330, +1259]**. Other bandwidths (n=8/arm, `raw/aggregate.json`): unlimited 2325 → 2110 ms; 5 Mbps 2303 → 2187 ms; lane open +75 ms / +484 ms. Decoded bytes to content 783 → 296 KB, but on the wire only 110 → 73 KB (JSON compresses ~15:1); a first, uncompressed-wire model (`raw/v1-uncompressed-model/`) showed 5729 → 3325 ms and is **superseded** (it overstated bytes).
Live server reads (n=3/arm, real HTTPS from this sandbox, `raw/live-*`): content OFF 4687 [4352–5087] vs staged 4828 [4458–5148] ms — no gain; lane 341 [277–752] vs 951 [931–1696] ms. Byte columns are not recorded in live mode.
- Correctness (every measured ON run vs OFF): lane section hash identical (`44617703`), badge `גימטריה 379` after load, chip `379 מוצגות`, same 360 filter options, same heading/order; unit parity (`test/staged-number-results-2029.test.mjs`): merged staged result deep-equals the one-shot result for an exhaustive set (379), a truncated set (620 → 500 findings, true `total_count`=620, `source_exhaustive:false`) and an empty set; a stage for another number is refused.
- Fast switching (`raw/stale-worldstaged.json`, 2 valid runs, slow link): lane clicked, user deepens into another entity before the 776 stage answers → subject 45, no 776 list, no stuck loading, badge `…` (pending) until its own lane is opened, then `כל רשימת הגימטריות של 45`, `367` rows; no page errors.
- Layout: lane button top 324 → 323 px, scrollY unchanged, CLS 0.000 on lane open in all runs; the `…` badge is 8 px narrower than the number (108 vs 116 px) — a small width change, no measurable shift. The user's reading position is never changed by the stage (it starts only on lane intent).
- Gates on this branch: scroll 15/15, staged 5/5, switches, perf-two-switches, shell-surface, perf-navigation, early-primary-read, route-legitimacy, hard isolation, world-surface, control-plane, legacy-research-containment, entityHub progressive, researchSyncRuntime, bundle budget, build:2029 — all pass. CI workflows not run; `package:research-run` still fails as in the combined build (pre-existing, other owner).

## What did work, and the follow-up
Skipping the unused families/registry/enrichment/entity-link reads for the World projection removes ~9 requests and ~6 KB wire to content with no lane cost (families-only column: +0 ms lane, −61 ms content, CI includes zero). It needs its own switch and a larger sample before any claim. Lookup deferral itself (the requested staging) buys ≤190 ms at best and costs ~0.8 s at the lane; adding an idle prefetch would only restore the original order of work and was not measured.

## Switch and rollback
`fx_staged_number_results` (existing registry/control panel, optimization mode, default OFF). OFF = existing path byte-for-byte for the projection (`stagedNumberResults` false) and the page. Rollback = revert this branch's three source files; nothing else depends on it. No DB change; no site_flags row exists.
