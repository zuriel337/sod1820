# SOD1820 — G3 REMAINING CLOSURE LIST v1

**Date:** 2026-09-29 · **Base:** `origin/main` `aab72423` · **Supabase:** `linswmnnkjxvweumprav`
**Status:** HANDOFF / WORK LIST · **NOT SSOT** · every number below is a live measurement, re-verify before acting.

## 0. Bootstrap (mandatory)

```bash
git fetch origin --prune && git rev-parse origin/main
```
Re-resolve owners from live `rules_active`. Scan `work_log_current` for overlapping active writers.
**ONE SCOPE — ONE ACTIVE WRITER.** Known open: `G3_A1_EFFECTIVE_COST_CHALLENGE_V1` (CLAUDE→GPT, `DEFERRED`).

## 1. DONE — do not redo

| Item | Evidence |
|---|---|
| B0 ELS server gate | `els-search-bridge` calls `fn_capability_execution_gate_v1`; 3 gate sites |
| B1 ELS Goldens | `test/fixtures/els-runtime-goldens.mjs` (#826) |
| B2 bounded scanner | `src/lib/research/els2029AdaptiveScanner.js` (#826) |
| B3 seeded controls | `src/lib/research/els2029StatisticalControls.js` (#826) |
| A3 client correlation | `interactionCorrelation.js`; `interaction_id` present in deployed Heichal/ELS chunks |
| C5 IssueReport emitter | #821 |
| C1–C4 reliability | #813 replaced, #822, #823; `test/g3-reliability-preclose.test.mjs` 10/10 |
| 7D SEO rail | Googlebot / bingbot / Baiduspider receive server documents |
| A1 implementation | branch `claude/g3-a1-trace-cost-exact-v1` — **built, not applied** |

## 2. REMAINING — dependency order

### BLOCK 1 · No Black Box — the declared G3 blocker

**A1 · apply the cost migration** — `cost_certainty='exact'` = **0** of 101 model_call spans.
Branch `claude/g3-a1-trace-cost-exact-v1` is built and verified. Dry run prices 101/101 → $1.929744 / ₪5.8085.
Closure: apply → 0 becomes 101. **Human Gate (migration apply).**

**A2 · trace coverage** — **4 of 85** edge functions emit (`ai-analyze`, `research-extract`, `research-run`, `els-search-bridge`).
Closure: every *material* interaction opens a root or joins one. Media spans must join too.
Pattern to copy: `research-run`'s fail-closed trace discipline.

**A3 · prove the client chain live** — deployed, never fired. Newest trace row `2026-09-29 13:02`, before #819 landed.
Closure: one real interaction producing a root whose `interaction_id` was minted client-side after deploy.

**A4 · three-engine fan-in** — not demonstrated.
Closure: `root → plan → engine A+B+C → synthesis`, each engine's cost/latency/`output_use` independent, exact roll-up, **no double counting**. Becomes a fixture once A1–A3 are done.

### BLOCK 2 · Research OS

**D1 · `research_paths` = 0, `research_plans` = 0** — unchanged across four measurements while the runtime and migration are merged. Nothing writes a row.
Closure: the canonical Plan/Path write path executes for real research interactions, `trace_id` joined. Blocks Journey and Workspace surfaces.

### BLOCK 3 · Access seam

**D2 · seam adopted by 2 of 13 surfaces** — `composeCapabilityProjection` has **zero** call sites.
Closure: every 2029 surface resolves capability through the one seam. **Each new surface adopts it at build time** — retrofitting 13 at swap time is the expensive path.

### BLOCK 4 · ELS runtime

**B4 · provenance v3 → v9** — migration `20260929180000_…_v1.sql` written, **not applied**. 26 `els_research_layer_law v3` citations remain in `src/` + `supabase/`.
Closure: apply, then confirm source citations. **Do not change deterministic search semantics for metadata cleanup.**

**B5 · replay + negative outcomes** — bounded search space, continuation, replay/verification, explicit negative / truncated / context-required outcomes; canonical occurrence identity preserved across renderers.

**B6 · exact-head gates green** — engine parity, replay, Goldens, Classic/Research = one state / two projections, no new store.

### BLOCK 5 · Active-tree hygiene — blocks the compaction gate

**E1 · 18 failing unit tests** (`src/**/*.test.js`, 663/681)
- 15 · `roadmapParser.test.js` pinned to **Roadmap v5.3** while live is **v6.5**; `roadmapParser.js` imported by nothing → retire
- 1 · `explorerAccess.test.js` imports `vitest`, not a dependency
- 2 · `explorerFacets.test.js` `normalizePageResult` → **triage as real**

**E2 · 13 failing tests in `test/` + 4 red gate scripts** (201/214 · 49/53)
Cluster of 5 `research-viewer-*` looks like one regression. Gate scripts: `calculator-2029-opening`, `connected-golden-2029`, `beit-midrash-methods-registry` (assertions that stopped matching their own source), `research-sync-provider` (missing `esbuild`). Check PR #809 first.

**E3 · 4 unreachable duplicate 2029 routes** in `src/App.jsx` (`/2029`, `/world`, `/els`, `/heichal`). `vercel.json` rewrites them first, so they are dead but still chunk 2029 surfaces into the legacy graph. Extend `test-2029-isolation.mjs` to assert absence.

**E4 · env** — add `esbuild`; `.nvmrc` 24.21 vs runtime 22.22.

**G2 residue · 6 of 86 active rules lack `compaction_v1` + canonical owner** (freeze required 0):
`sod1820_canonical_identity_law` v4 · `raziel_companion_layer_law` v3 · `research_intake_foundation_contract_law` v13 · `golden_entity_law` v4 · `platform_tiers_law` v5 · `writer_material_home_law` v5
Cause: metadata not carried forward on version bump. `foundation_closure_protocol_law` v7 did it correctly — copy that.

**G1 · Owner Index** — partly refreshed by #818. Re-verify against live `rules_active` **at the end**, not the beginning.

### BLOCK 6 · PR / branch hygiene
~20 open PRs. Classify each `RELEASE` / `REBASE` / `ABSORB` / `ARCHIVE` / `SUPERSEDED`. Do not leave stale branches as apparent architecture authority.

### BLOCK 7 · Human Gate only

**H1 · restore drill** — **zero evidence** anywhere in `test/`, `scripts/`, `audits/`, `docs/`, `.github/`. G3 cannot formally close without one proving *recovery*, not that a backup exists. Never restore destructively into canonical production; report exact action/cost/risk first.

**H2 · erasure / export** — **zero functions** matching `erase|delete_account|export_user|forget|gdpr|purge_user`. Required before private corpus / voice history grow. Reuse the `admin_retention_preview()` dry-run boundary; no second retention system.

**H3 · applies** — A1 migration · ELS provenance migration.

## 3. Done condition

Do not say "G3 closed" until each is `MERGED + DEPLOYED + LIVE + VERIFIED` or is an explicit Human-Gate-only action with no engineering ambiguity:

| # | Blocker | Where |
|---|---|---|
| 1 | Exact-priced span, aggregate → root → span, no double counting | A1 |
| 2 | Trace coverage on material paths | A2 |
| 3 | Three-engine fan-in acceptance | A4 |
| 4 | Research Path/Plan write path live | D1 |
| 5 | Reliability precloses proven on a real deploy | C1–C4 |
| 6 | ELS runtime green on current main | B4–B6 |
| 7 | Restore drill proving recovery | H1 |

Never collapse: `DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`.

## 4. Boundaries
Not an owner, contract or documented state. Severities and ordering are engineering interpretation. **Unverified, flagged:** Corpus/Books edition/witness identity (PHASE 5B) was never exercised in any scan.
