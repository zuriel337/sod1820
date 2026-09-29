# SOD1820 — G3 FULL CLOSURE LIST v2 (runtime + maintenance + compaction + G4 entry)

**Date:** 2026-09-29 · **Base:** `origin/main` `aab72423` · **Supabase:** `linswmnnkjxvweumprav`
**Status:** HANDOFF / WORK LIST · **NOT SSOT** · every number is a live measurement — re-verify before acting.

Supersedes `G3_REMAINING_CLOSURE_LIST_V1.md`. Adds the mandatory end-of-G3 Maintenance Acceptance Matrix, the Implementation Compaction / Archive pass, and the G4 entry condition.

## 0. Bootstrap

```bash
git fetch origin --prune && git rev-parse origin/main
```
Re-resolve owners from live `rules_active`. Scan `work_log_current` for overlapping active writers. **ONE SCOPE — ONE ACTIVE WRITER.**
Known open: `G3_A1_EFFECTIVE_COST_CHALLENGE_V1` (CLAUDE→GPT, `DEFERRED`) — reuse that task key, do not fork.

## 1. DONE — do not redo

B0 ELS gate · B1 Goldens · B2 bounded scanner · B3 seeded controls (`#826`) · A3 client correlation (deployed) · C5 IssueReport (`#821`) · C1–C4 reliability (`#822`, `#823`, preclose 10/10) · 7D SEO rail · A1 **built not applied** (`claude/g3-a1-trace-cost-exact-v1`).

---

# PART A — RUNTIME BLOCKERS

## A1 · Exact cost on the span — **the declared blocker**
`cost_certainty='exact'` = **0 of 101** model_call spans. Branch built + verified; dry run prices 101/101 → $1.929744 / ₪5.8085. **Human Gate: migration apply.**

## A2 · Trace coverage
**4 of 85** edge functions emit. Closure: every *material* interaction opens or joins a root; media spans included. Copy `research-run`'s fail-closed trace discipline.

## A3 · Prove the client chain live
Deployed, never fired — newest trace row `2026-09-29 13:02`, before `#819`. Closure: one real interaction producing a root with a client-minted `interaction_id`.

## A4 · Three-engine fan-in
`root → plan → A+B+C → synthesis`; independent cost/latency/`output_use`, exact roll-up, **no double counting**. Becomes a fixture once A1–A3 land.

## D1 · Research OS write path
`research_paths` = **0**, `research_plans` = **0** across four measurements while runtime + migration are merged. Nothing writes a row. Blocks Journey and Workspace.

## D2 · Access seam
**2 of 13** surfaces; `composeCapabilityProjection` **0** call sites. Adopt at build time — retrofitting 13 at swap is the expensive path.

## B4–B6 · ELS finish
B4 provenance v3→v9 migration written, **not applied**; 26 `v3` citations remain in `src/`+`supabase/`. B5 replay + explicit negative/truncated/context-required outcomes. B6 exact-head gates green. **Do not change deterministic search semantics for metadata cleanup.**

---

# PART B — MAINTENANCE ACCEPTANCE MATRIX (mandatory end-of-G3 gate)

Roadmap v6.5 requires, for every row: `OWNER → SIGNAL → ENFORCEMENT → PROJECTION → STATUS`.
Status vocabulary: `LIVE_VERIFIED` · `IMPLEMENTED_NOT_LIVE` · `PLANNED_G3` · `LATER_STAGE` · `GAP`.

> **A row is not CLOSED when only its signal/dashboard exists — owner-native enforcement must be verified too. A load-bearing `GAP` blocks ascent.**

Pre-filled from live evidence. Verify each before accepting.

| # | Requirement | Signal (live) | Status | What closes it |
|---|---|---|---|---|
| 1 | reliability / health | `fn_health_watch` cron `*/15` · `system_watchman_weekly` `0 8 * * 0` | IMPLEMENTED_NOT_LIVE | one real incident proven end-to-end into `notify_admin` |
| 2 | browser / runtime failures | `#791` ErrorBoundary · `#819` correlation | IMPLEMENTED_NOT_LIVE | a real captured client error in the canonical event tree |
| 3 | dead-man | events gap detector (C2 threshold fix) | IMPLEMENTED_NOT_LIVE | threshold derived from observed p99, not invented; canary/runtime_error excluded |
| 4 | exact-SHA canary | `post-deploy-canary.yml` (`#822`, `#823`) | IMPLEMENTED_NOT_LIVE | one real deploy where the canary gates the next release |
| 5 | operational trace / correlation | `op_trace_roots/spans` | **GAP** | A2 — 4/85 coverage |
| 6 | provider / AI cost | `ai_token_log` → `api_pricing` | **GAP** | A1 — 0 exact spans |
| 7 | cache / billable state | rail 7E | **GAP** | input identity, version dimensions, hit provenance, invalidation |
| 8 | egress | `egress_hardening_monitoring_v1` (`#778`) | IMPLEMENTED_NOT_LIVE | attribution **by PURPOSE**, not by UA. See Part C. |
| 9 | DB / query performance | `pg_stat_statements` | PLANNED_G3 | hot paths, missing/duplicate indexes **and actual use** |
| 10 | capacity / growth / top-growers | table+storage size census | PLANNED_G3 | growth census with owners |
| 11 | retention / compaction | `admin_retention_preview()` · `cron-job-run-details-retention-daily` | IMPLEMENTED_NOT_LIVE | full retention census; **no second retention system** |
| 12 | privacy / RLS failures | `rls-grant-audit-weekly` · `edge-grant-audit-daily` | **GAP on enforcement** | 7F isolated least-privilege acceptance never run; `agent_research_stats` is a SECURITY DEFINER view granted to `anon` |
| 13 | restore / recovery evidence | — | **GAP — load-bearing** | H1 below. **Zero evidence anywhere.** |
| 14 | release health | `deploy_on_request` v2 + canary gate | IMPLEMENTED_NOT_LIVE | branch/merged/deployed/live/verified reconciled exactly |
| 15 | Raziel / channel paths | wa-* crons, `raziel-attention` | PLANNED_G3 | adapters consume canonical Routing/Method/Research OS/Convergence/Context; no WhatsApp-local brain |

### Cron / worker census note
**35 scheduled jobs live.** Four run every minute (`g3-agent-dispatch-recovery`, `g3-agent-routine-response-reconcile`, `g3-gpt-result-wake-recovery`, `wa-deep-process`, `wa-gabriel`, `wa-poll`). Each needs: owner · purpose · cost · retirement condition. **No Monitor 2.** FAST health = cheap bounded snapshot; DEEP (retention, dependency scans, storage drilldown) = cached/background/on-demand under existing `analytics_cache`.

---

# PART C — IMPLEMENTATION COMPACTION / ARCHIVE PASS

Gate: `audits/g3-implementation-compaction/G3_IMPLEMENTATION_COMPACTION_ARCHIVE_GATE_V1.md`.
Rule: **new runtime first; legacy only by explicit temporary compatibility; archive when replacement is verified.** No history deleted to reduce counts.

## C1 · Rule disposition — live census (86 active)

| Disposition | n | Action |
|---|---|---|
| KEEP_SCOPED_SEMANTIC | 46 | may be absorbed after proving semantic preservation |
| KEEP_CANONICAL_OWNER | 20 | survives unless superseded through the owner gate |
| **REVALIDATE_DURING_G3** | **11** | **each needs a final KEEP / ABSORB→ARCHIVE / RETIRE decision with live evidence** (hard acceptance #4) |
| **MISSING classification** | **6** | the G2 residue below |
| LEGACY_COMPAT_RETIRE_WHEN_REPLACED | 2 | retire, or record explicit live dependency + removal condition (#5) |
| DEFER_PRODUCT_DECISION_G5 | 1 | carry forward, do not hard-wire |

The 11 `REVALIDATE_DURING_G3` cover: legacy Number Page presentation · numeric-row data shape · tag-as-source-of-truth · word-review gate · world-color projection · OG raster constraint · older response envelope · UGC/account ladder · bot delivery/outbox · source-video representation · channel adapter.

## C2 · G2 residue — 6 of 86 lack both `compaction_v1` and `g3_disposition_v1`
`sod1820_canonical_identity_law` v4 · `raziel_companion_layer_law` v3 · `research_intake_foundation_contract_law` v13 · `golden_entity_law` v4 · `platform_tiers_law` v5 · `writer_material_home_law` v5
Cause: metadata not carried forward on version bump. `foundation_closure_protocol_law` v7 did it correctly — copy that pattern. **Fix the carry-forward, not just the six rows,** or it recurs on the next bump.

## C3 · Mandatory end-of-G3 runtime census
Inventory current production/main dependencies across: routes/navigation/redirects · components/renderers/UI primitives · tables/views/RPCs/functions/triggers/RLS · Edge Functions/workers/webhooks/cron · AI/Raziel adapters/prompts/envelopes · ELS/Gematria adapters · Research OS/Journey/personal-state adapters · publishing/media/SEO/share · Follow/Attention producers · analytics read models · capability flags · legacy compat code/migrations/scripts.
Each artifact gets exactly one: `KEEP_CURRENT` · `ABSORB_THEN_ARCHIVE` · `TEMPORARY_COMPATIBILITY` (owner + removal condition) · `RETIRE_REMOVE`.

## C4 · Egress — carried correction
Do **not** describe every "bot" byte as hostile crawler traffic. The dominant node-fetch raw-video burst on `media/sod1820/agent/sharshar-*.mp4` correlates strongly with authorized Descript imports — **correlation is not cryptographic identity proof**, and the bytes are still real cost.
Categories: public/human delivery · authorized external processing · CI/headless · named crawler · unknown automation. **UA/IP/ASN alone is not authorization identity.** Semantic events showed zero `is_bot` rows while Storage showed bot-like traffic → **events is not sufficient egress attribution**; use provider/edge/storage evidence.
`#804` poster backfill = adjacent hygiene, not root cause; beware its own one-time raw-video egress.

## C5 · Legacy retirement
Anything still used by the live old site may stay `TEMPORARY_COMPATIBILITY`, but each needs: current writer · current reader · 2029 replacement · proof · retirement condition.
Re-check: legacy telemetry dual-write · `gematria_wall` · `raw_gematria` · `convergences` · `journey_seeds` · `research_candidates` · `insights` · `discovery_events` · `contributor_content` · `bot_health` · `g3_openweb_import_stage` · backup/bak/cleanup tables.
**No data purge because a table "looks old."**

## C6 · Hard acceptance (all 10 must hold)
No 2029 path consumes a legacy-compat rule as architecture owner · no duplicated engine/RPC/trigger/worker/store for one canonical responsibility · no old route/component/prompt silently defining semantics · every REVALIDATE decided with live evidence · every LEGACY_COMPAT retired or with explicit dependency + removal condition · compat layers undiscoverable via normal owner-first startup · obsolete triggers/cron removed only after replay proves no loss · branch/merged/deployed/live/verified reconciled exactly · full provenance preserved in git/rules/work_log/migrations · fresh-agent replay resolves only current owners.

---

# PART D — ACTIVE-TREE HYGIENE

**E1 · 18 failing unit tests** (663/681): 15 `roadmapParser` pinned to Roadmap **v5.3** vs live **v6.5**, imported by nothing → retire · 1 `explorerAccess` imports `vitest` (not a dependency) · 2 `explorerFacets` `normalizePageResult` → **triage as real**.
**E2 · 13 failing in `test/` + 4 red gate scripts** (201/214 · 49/53): cluster of 5 `research-viewer-*` looks like one regression; `calculator-2029-opening`, `connected-golden-2029`, `beit-midrash-methods-registry` are assertions that stopped matching their own source; `research-sync-provider` needs `esbuild`. Check `#809` first.
**E3 · 4 unreachable duplicate 2029 routes** in `src/App.jsx`. Extend `test-2029-isolation.mjs` to assert absence.
**E4 · env:** add `esbuild`; `.nvmrc` 24.21 vs runtime 22.22.
**G1 · Owner Index:** partly refreshed by `#818`. Re-verify against live `rules_active` **at the end**.
**F · PR hygiene:** ~20 open. Classify each `RELEASE` / `REBASE` / `ABSORB` / `ARCHIVE` / `SUPERSEDED`.

---

# PART E — HUMAN GATE ONLY

**H1 · Restore drill** — **zero evidence** in `test/`, `scripts/`, `audits/`, `docs/`, `.github/`. Must prove **recovery**, not that a backup exists. Never restore destructively into canonical production. Do all preparatory/replay-safe work, then stop and report exact action / cost / risk.
**H2 · Erasure / export** — **zero functions** matching `erase|delete_account|export_user|forget|gdpr|purge_user`. Required before private corpus and voice history grow. Cover `user_research`, `user_notes`, `journey_saves`, `identity_edges`, `search_log`, media submissions, trace references. Reuse the `admin_retention_preview()` boundary; **no second retention system**.
**H3 · Applies** — A1 cost migration · ELS provenance migration.
**H4 · Consent separation** — only `notification_prefs` exists; Follow intent vs channel consent pending `#486` (draft), UI control correctly shipped disabled.

---

# PART F — DONE CONDITION AND G4 ENTRY

## G3 CLOSED requires
Each of these `MERGED + DEPLOYED + LIVE + VERIFIED`, or an explicit Human-Gate-only action with no engineering ambiguity:

`A1` exact-priced span · `A2` trace coverage · `A4` three-engine fan-in · `D1` Research Path write path · `C1–C4` reliability proven on a real deploy · `B4–B6` ELS green · `H1` restore drill
**plus** the Maintenance Acceptance Matrix with no load-bearing `GAP`
**plus** the Compaction / Archive pass hard acceptance (all 10).

Never collapse: `DOCUMENTED ≠ IMPLEMENTED ≠ COMMITTED ≠ BRANCH-ONLY ≠ MERGED ≠ DEPLOYED ≠ LIVE ≠ VERIFIED`.

## G4 entry
> Entering G4 means the G3 foundation/runtime is sufficiently closed to test complete experiences. It does **not** auto-enable G5+ capabilities. G4 consumes what exists, finds real cross-layer failures, and promotes only journeys that pass Golden acceptance. Failed journeys route back to the owning G3 layer for repair **without reopening Legacy UX as the target**.

Golden order: **ELS + Raziel/context before broad localization/media rollout.** No simulated PASS.

G4 cannot start meaningfully while `A1`/`A2` are open — a Golden that cannot show what ran and what it cost is not a Golden.

## Boundaries
Not an owner, contract or documented state. Severities, statuses and ordering are engineering interpretation; the Matrix rows must be re-verified by the executing agent.
**Unverified, flagged:** Corpus/Books edition/witness identity (PHASE 5B) was never exercised in any scan.
