# SOD1820 — G3 MERGED CLOSURE EXECUTION PLAN v1

**Date:** 2026-09-29
**Status:** HANDOFF / EXECUTION PLAN · **NOT SSOT** · HUMAN-GATE CONTROLLED
**Canonical Supabase:** `linswmnnkjxvweumprav`

This document merges two independently-produced closure inputs into one dependency-ordered plan:

1. **GPT handoff** `CLOSE G3 COMPLETELY / ELS RUNTIME → RELIABILITY → FINAL COMPACTION` (2026-09-29) — reliability findings, ELS runtime closure, one-tree compaction, PR hygiene.
2. **CLAUDE audit lineage** — `G3_BOTTOM_UP_TREE_INFRASTRUCTURE_GAP_SCAN_V1.md` (2026-09-22) and `G3_LOWER_LAYER_CLOSURE_LIST_V1.md` (2026-09-29) — bottom-up lower-layer gaps with live evidence.

It is an execution plan, not an owner, contract, registry or truth store. Domain semantics resolve from live owners. `SOD1820_MASTER_ROADMAP.md` remains program navigation.

---

## 0. Why the order changed from the GPT handoff

The GPT handoff's DONE CONDITION is correct: do not say "G3 closed" until every mandatory G3 blocker is `MERGED + DEPLOYED + LIVE + VERIFIED` or is an explicit Human-Gate-only action.

**The declared G3 blocker was not in that plan.** `SOD1820_MASTER_ROADMAP.md` states:

> *"Foundation Runtime is not considered closed if an admin cost/usage aggregate cannot drill down to the underlying root trace and individual span(s), including a three-engine workflow, without double-counting cost."*

> *"No-Black-Box acceptance is mandatory before G3 closes."*

Reliability (PHASE B below) answers *do we know when it breaks*. No Black Box answers *do we know what ran and what it cost*. They are adjacent, not the same. Executing the original plan perfectly would still leave G3 un-closeable by its own gate.

Three insertions were therefore made, and one sequence was changed:

- **PHASE A (new, first)** — No Black Box closure. Was absent.
- **PHASE D (new)** — Research OS live write path. Was absent.
- **B-0 (new, before ELS runtime work)** — gate `els-search-bridge`. The original plan adds scanner and statistical load to the only traced-but-ungated expensive path in the tree.
- **Reliability now follows instrumentation**, because its global-capture item and the trace propagation item are the same hooks. Doing them separately wires the browser twice and breaks the One Tree the original plan is built to protect.

Everything else from the GPT handoff is preserved, including its reliability findings, its ELS dependency order, its egress correction, its release-safety boundary and its closure report format.

---

## 1. LIVE BOOTSTRAP — mandatory before any action

Re-verify rather than trusting this document. It is routing, not truth.

```bash
git fetch origin --prune
git rev-parse origin/main
git status --porcelain
```

Then verify production where runtime/UI matters, and re-resolve owners from live `rules_active`.

### Bootstrap verification performed for this document (2026-09-29, CLAUDE, READ_ONLY)

Every checkable claim in the GPT handoff was verified live and **passed**:

| Claim | Result |
|---|---|
| `origin/main` = `90618c13…` | **CONFIRMED** |
| Branch `gpt/els-g3-runtime-closure-v1` exists and is empty | **CONFIRMED** — head = main, 0 commits ahead |
| 14 active owner versions | **ALL 14 MATCH** live `rules_active` |
| A4 ELS provenance DRIFT (`els_research_layer_law v3` cited while live is v9) | **CONFIRMED** — 7 citations across `elsW2Executor.js`, `supabase.js`, 3 migrations, `els-search-bridge/index.ts` |
| #811, #817 in main; #789 closed; #813/#785/#810/#808/#804 open | **CONFIRMED** |

Live owner versions at authoring time — **if any moved, LIVE wins**:

`foundation_closure_protocol_law` v6 · `live_state_resolution_law` v2 · `inter_agent_coordination_law` v13 · `system_suggestions_law` v5 · `traffic_intelligence_law` v11 · `research_intake_foundation_contract_law` v13 · `research_strategy_layer_law` v17 · `research_workspace_law` v5 · `canonical_methods_registry_law` v6 · `els_research_layer_law` v9 · `canonical_ui_components_law` v7 · `experience_governance_foundation_v1_law` v7 · `content_translation_law` v4 · `deploy_on_request` v2

### Two corrections to the original handoff's census

- **PR #815** "ELS 2029: mount Classic / Research profiles" is **OPEN and non-draft**, updated 2026-09-29 14:08. It overlaps PHASE B and is not mentioned in the handoff. Reconcile it before starting work on the empty ELS branch.
- **PR #809** (draft) "Fix 2029 server SEO parity test regex syntax" likely addresses one of the four red gate scripts in PHASE E. Check before re-authoring.

### Before every WRITE

- rescan overlapping active writers in `work_log_current`;
- **ONE SCOPE — ONE ACTIVE WRITER**; do not overwrite another writer — order by dependency;
- do not merge an old branch merely because it exists. Current main is authority.

Open with:

```
LIVE BOOTSTRAP COMPLETE
- origin/main:
- production:
- canonical Supabase:
- active owners:
- relevant work_log:
- parallel overlap:
- read budget:
- DRIFT:
```

---

## 2. Current live position

Already closed and in main — do not revive as authority:

- **#811** CanonicalProgress current-main recovery; `canonical_ui_components_law` now **v7** ("Problem Report + Long-task Presence"). The prior "wait for #811" dependency is gone.
- **#817** ELS Classic/Research projection mount — live on main.
- **#789** old Home Reality Gallery branch — CLOSED.
- **#812** SEO regex drift — in current main.
- **PHASE 7D SEO rail — CLOSED.** Googlebot, bingbot and Baiduspider now receive server-rendered documents; verified live on `/topic/1820`. Soft-404s closed, video/search indexability unified. Not re-opened below.

ELS handoff owner · `work_log` task_key: `ELS_G3_RUNTIME_CLOSURE_HANDOFF_20260929_V1`
ELS continuation branch: `gpt/els-g3-runtime-closure-v1` (verified empty — **verify again before use**)

---

## PHASE A — CLOSE NO BLACK BOX · **the declared G3 blocker** · do this first

Owner: `system_suggestions_law` v5 + existing cost owners. **EXTEND_EXISTING only** — no second telemetry store. The physical runtime already exists and is faithful to the contract: `op_trace_roots` / `op_trace_spans` with `parent_span_id`, `outcome`, `output_use`, `cost_certainty`, `fx_rate`, `payload_hash`, `redaction_applied`, and `availability_ref`/`entitlement_ref`/`budget_ref` on the root, plus `op_trace_begin/record_span/finish/link_ai_cost_v1` and `admin_op_trace_v1` / `admin_op_trace_list_v1`.

What is missing is coverage and proof, not design.

### A1 · One exact-priced span, end to end — **BLOCKER · cheapest action, largest effect**

Live: `select count(*) from op_trace_spans where cost_certainty='exact'` → **0**. Observed values are `not_billable` and `unknown` only, across 674 spans.

Required: one real priced model call recorded through `op_trace_link_ai_cost_v1` carrying provider-native amount, currency, `pricing_ref`, `pricing_effective_at`, `fx_rate`, `fx_effective_at` and `cost_ils`, with `cost_certainty='exact'`, drillable from the admin aggregate down to that span.

This single item converts the runtime from built to proven. Do it before anything else in this document.

### A2 · Trace coverage on material paths — **BLOCKER**

Live: 4 of 85 edge functions emit — `ai-analyze`, `research-extract`, `research-run`, `els-search-bridge`. Not emitting: `gematria-api`, `expression-extract`, `number-researcher`, `raziel-attention`, `post-save`, the media lane, every notification/delivery path.

Required: every **material** interaction opens a root or joins one. Not every function — material events. Media processing spans must join the trace (PHASE 4 requirement).

### A3 · Client→server trace propagation **merged with global runtime capture** — **HIGH**

Live: no `trace_id` or `op_trace` reference in `src/pages/*2029*.jsx`, `src/components/experience2029/` or `researchPathRuntime.js`. Traces begin at the edge, not at the interaction.

**This absorbs the GPT handoff's B6.** Both require the same browser hooks; doing them separately instruments the client twice.

Required, as one pass:

- shared correlation envelope across browser → server → Edge → planner → engine → tool → media;
- `window.error`, `unhandledrejection` and the React `ErrorBoundary` all entering the **same** canonical incident/event tree;
- bounded, privacy-safe payloads — no query-string or private data leakage; hashes/references, not raw payloads;
- no polling;
- the §1.6 chain becomes answerable: `arrival → surface/action → Research Context → operational trace → engine cost → output use`.

Note: `d0a6a01c Instrument ErrorBoundary for bounded client crash telemetry (#791)` is already in main — verify what it implemented and extend it rather than replacing it.

### A4 · Three-engine fan-out / fan-in acceptance — **BLOCKER**

Required Golden: `root interaction → router/plan → engine A + B + C → optional tools → synthesis → response`, with each engine's cost/latency/result-use independent, exact root roll-up, and **no double counting**. `output_use` (`used` / `partially_used` / `rejected` / `superseded`) is modeled in the schema and unproven under fan-in.

With A1–A3 done this becomes a fixture, not a build.

### A5 · No-Black-Box fixture set

Per the Roadmap's own list: parallel three-engine synthesis, sequential escalation, cache hit, retry/continuation, timeout/cancel, unpriced model, partial failure, private-input redaction, cross-layer propagation.

**PHASE A exit gate:** an admin ₪/usage aggregate drills to root trace and individual span, including a three-engine workflow, without double counting, while raw private payloads remain protected.

---

## PHASE B — CLOSE ELS G3 RUNTIME

Continue from `ELS_G3_RUNTIME_CLOSURE_V1`. Goal: close the remaining ELS G3 runtime tree with **no second ELS engine, store or corpus**, and without opening broad 3D/XR.

First reconcile **PR #815** (open, non-draft, overlaps this phase).

### B0 · Gate `els-search-bridge` — **do this before adding runtime load** · NEW

Live: `els-search-bridge` (227 lines) **emits trace but does not call** `fn_capability_execution_gate_v1`. Only `ai-analyze` and `research-run` call the gate.

PHASE 2's exit gate is "no expensive capability can execute before server gate." ELS is now exactly such a capability, and B2/B3 below add a scanner and statistical controls on top of it. Gate it first.

### B1 · Real Golden fixtures

Make these replayable through the canonical engine. **No model arithmetic as truth.** Exact expected coordinates, orientation and provenance.

Verified Goldens carried from the prior handoff:

- `תורה` / skip 50 — includes `start0=5`
- `תורהקדשה` / skip 10065 — unique `start0=50890`
- `אליהו` / skip 1820 — forward `start0=27914`, backward `start0=37550`

### B2 · One bounded adaptive scanner/runtime

Use the existing canonical ELS geometry/search owner. **No scanner 2, no engine 2.** Bounded search/runtime behavior; replayability and provenance preserved.

### B3 · Deterministic statistical controls

Legacy Monte Carlo using `Math.random` is **NOT** closure evidence. Use deterministic seeded controls. Implement/verify BH/FDR where owned and justified. Output remains Finding / Evidence / Interpretation — **never automatic canonical truth**. Human Gate owns canonicalization.

### B4 · Provenance DRIFT — verified

7 live citations of `els_research_layer_law v3` / `:v3` across `src/lib/research/elsW2Executor.js`, `src/lib/supabase.js`, `20260916150500_g3_els_callable_core_v1.sql`, `20260916150900_…compatibility_extension_v1.sql`, `20260916151000_…truth_hardening_v1.sql` and `supabase/functions/els-search-bridge/index.ts`, while the active owner is **v9**.

Reconcile provenance to v9 **without changing deterministic search semantics** for metadata cleanup alone.

### B5 · Replay, negative and truncated outcomes

PHASE 5C additionally requires bounded search space, continuation, replay/verification, and explicit negative / truncated / context-required outcomes. Preserve canonical occurrence identity and replay inputs across renderers (corpus/version, start/positions/span, skip, direction, locus). Keep `Character Identity ≠ Textual Occurrence ≠ Glyph Representation ≠ font outline ≠ Rendering Instance`. Geometry is projection of a verified occurrence, never engine authority.

### B6 · Exact-head tests/gates

Canonical engine parity · replay · Goldens · Classic/Research remains **one state / two projections** · no new store · no Legacy resurrection · current-main compatibility.

**Do not call ELS runtime CLOSED until all current-main evidence is green.**

---

## PHASE C — CLOSE G3 RELIABILITY PRECLOSE

Mandatory G3 blocker. Relevant old implementation: **PR #813** "G3 reliability core: runtime errors, dead-man, production canary" — **open draft, NOT release-ready**, built on older main, independent CLAUDE audit returned CHANGES.

**Rebuild/replay its unique work on CURRENT MAIN. Do not merge the old head raw.** Supersede #813 once absorbed.

Useful pieces in #813: bounded dedupe/rate limit · runtime-error incident detection extension · health-watch dead-man extension · deterministic zero-AI post-deploy canary. (Its global error capture is absorbed into **A3** above.)

These findings are carried verbatim from the GPT handoff and remain correct.

### C1 · Incident detection latency — MUST FIX

The old PR placed meaningful runtime incident detection in `detect_suggestions()`, which is effectively **weekly** through system-watchman. A 24h incident detector cannot wait a week.

Required: decision-critical runtime-error incident and dead-man alerting terminates in the existing **15-minute `fn_health_watch` / `notify_admin`** path, or another existing bounded current owner. Weekly `detect_suggestions` may keep summary/recommendation semantics. **No monitoring system 2.**

### C2 · Events dead-man false positives — MUST FIX

The old implementation used `max(events.ts)` with a 2h threshold. Live history already contains legitimate >2h gaps, so it can page falsely at night.

Required: do not count canary or `runtime_error` rows as proof that normal ingest is alive. Establish a **measured** threshold — likely ≥6–8h, or derived from the observed p99 gap. **Explain the chosen threshold from live data; do not invent one.** Preserve "no data != healthy".

### C3 · Canary reporting / bootstrap — MUST FIX

Old holes: missing `SUPABASE_URL`/anon key reported "skipped" while the workflow could still succeed; non-2xx report response did not fail; a never-reported canary could stay invisible forever; anon event rows can be spoofed.

Required: the scheduled/deployment canary **fails** if required reporting authority is missing · non-2xx report = failure · bootstrap/seeding so "never reported" becomes detectable after a bounded interval · report explicit SHA + GitHub run identity/provenance · do not treat an arbitrary anon row as authoritative release evidence · use the smallest existing secure owner-native reporting path · no secret leakage.

### C4 · Exact-SHA / next release gate

Under `deploy_on_request` v2: exact production deployment identity/revision proof as far as current Vercel/repo evidence supports · the latest relevant production canary must be SUCCESS before the **next** release proceeds · failure blocks the next release but there is **NO automatic rollback** · Human Gate override remains explicit and auditable · **no parallel release system.**

### C5 · Issue Report flow

`canonical_ui_components_law` is now **v7** ("Problem Report + Long-task Presence") and #811 has landed. Verify what #811 actually implemented, then close the runtime path:

`IssueReport → existing events → incident detection / system_suggestions → Control Plane / Watchman → Human Gate / notify path`

**No IssueReport Store, Bug Store or Status System 2.**

### C6 · Synthetic critical journeys

Deterministic · zero AI · post-deploy · at most 4 scheduled passes/day by default · small critical-journey set only · **no synthetic "PASS" replacing real Golden testing.**

---

## PHASE D — MAKE THE RESEARCH OS WRITE PATH LIVE · NEW

### D1 · `research_plans` = 0 and `research_paths` = 0 — **BLOCKER**

Unchanged across three measurements (2026-09-22 initial, 2026-09-22 post-release, 2026-09-29) although `20260922…g3_research_path_resumability_runtime_v1.sql` and `src/lib/research/researchPathRuntime.js` are both merged and `d0c4033c Journey 2029: add basic path telemetry foundation (#763)` shipped.

The migration and runtime are `MERGED`. The capability is not `LIVE` — **nothing writes a row.**

Required: the canonical Research Path/Plan write path actually executes for real research interactions, under `research_strategy_layer_law` v17 + `research_workspace_law` v5, with `trace_id` joined per PHASE A. Negative / missing / access-filtered / partial outcomes preserved. No second research store.

Blocks PHASE 6's exit gate (switch surface/channel/model without losing research subject, evidence lineage or authorized state) and everything consuming it: Research Room, Dossier, Pulse, cross-channel continuity, and the Journey surface.

### D2 · Experience Context seam adoption — HIGH

Live: `experienceContext` / `experienceCapabilities` consumed by `World2029Page.jsx` and `SystemFrame2029.jsx` only; `composeCapabilityProjection` has **zero** call sites — unchanged while four new surfaces shipped.

Required: Topic, Books, ELS, Heichal, Researcher, Number, Post, Video, Calculator and Control Plane resolve capability through the one seam (availability → authorization → entitlement → budget → routing). Each surface added before adoption is a future migration.

---

## PHASE E — ACTIVE-TREE HYGIENE · blocks the compaction gate · hours, not days

### E1 · 18 failing unit tests
681 tests, 663 pass, 18 fail — composition unchanged since 2026-09-22 while the suite grew by 229 tests.
- 15 in `src/lib/roadmapParser.test.js` — pinned to **Roadmap v5.3** (`version_label === "v5.3"`, 24 `WS-*` cards, 21 gates) while live is **v6.5**. `roadmapParser.js` is imported by nothing in the application → retire.
- 1 in `src/lib/research/explorerAccess.test.js` — imports `vitest`, not a dependency.
- 2 in `src/lib/research/explorerFacets.test.js` — `normalizePageResult` pass-through and null input. Live Research OS module → **triage as real**.

### E2 · 4 red gate scripts — new drift during the 327-commit week
49 of 53 pass. Red: `test-calculator-2029-opening` (assertion `/פתח את השיטה/` no longer matches source) · `test-connected-golden-2029` (`/pageBg: "#080c16"/`) · `test-beit-midrash-methods-registry` ("soul/sub must only render when the registry actually has them") · `test-research-sync-provider` (`Cannot find package 'esbuild'`).

The first three are gates that stopped guarding their own subject — a green-looking suite whose red members are ignored. **Check PR #809 first**, which may already fix one.

### E3 · Unreachable duplicate 2029 routes
`src/App.jsx` still declares `/2029`, `/world`, `/els`, `/heichal` against 2029 page components. `vercel.json` rewrites all of them to `/2029.html` first, so they are unreachable in production while still importing and chunking 2029 surfaces into the legacy graph. Two declarations of one route identity in two runtimes is exactly the drift the isolation gate exists to prevent. Extend `test-2029-isolation.mjs` to assert their absence.

### E4 · Node engine drift
`package.json` requires `node >=24.9.0 <25`, `.nvmrc` pins `24.21.0`; agent/CI environments run `v22.22.2` (`EBADENGINE`). Add `esbuild` while fixing E2.

---

## PHASE F — PR / BRANCH HYGIENE

Repository-wide open-PR census on **current main**. Do not limit to named PRs.

Known items to re-check: **#785** stale docs branch — absorb/replay or close · **#804** media poster branch — current-main re-evaluation · **#808** Bentov Spatial Golden — classify as later-stage/future projection rather than G3 closure · **#809** SEO parity test fix — likely absorb into E2 · **#810** stale Owner Index repair — absorb into G1 · **#813** reliability — supersede after PHASE C replacement · **#815** open ELS profiles PR — reconcile before PHASE B · #789 CLOSED · #811, #817 in main.

For every open PR/branch: `RELEASE` / `REBASE` / `ABSORB` / `ARCHIVE` / `SUPERSEDED`.

**Do not leave stale branches as apparent architecture authority.**

---

## PHASE G — FINAL ONE-TREE OPTIMIZATION / COMPACTION

**#785** and **#810** were independently audited PASS on earlier exact heads, but current main has advanced materially. **DO NOT MERGE RAW.** Consume unique semantics, replay/re-author only what is still current, supersede/close stale branches once absorbed.

### G1 · Owner Index — at the END, not the beginning
Refresh **current** pointers from live `rules_active`. Do not rewrite historical G2/G3 provenance paragraphs merely because current versions advanced. Verify against the bootstrap table in §1 — **if any version moved, LIVE wins.**

### G2 · Run the G3.5 rescan for real — timeboxed
Do not leave a note saying "rescan later" while closing G3. A long build followed by an untimeboxed census reproduces exactly the staleness that made #785 and #810 stale.

Fresh live census: DB/table/index/storage size + growth · current writers/readers · all Legacy/staging/backup/import stores · all cron/Edge/background workers · `pg_stat_statements` hot paths · Supabase RLS/index advisors · duplicate/missing-index candidates **and actual use** · dead tuples / autovacuum / analyze · events vs Legacy telemetry parity · retry amplification and conflict behavior · Raziel site/channel/provider paths · DB-held external HTTP / `wa_admin` path · System Health FAST vs DEEP drilldown cost · Storage/media derivatives, cache, no-cache video, poster coverage · egress attribution by PURPOSE · full retention census · all open PRs/branches against current main.

Classify each: `KEEP` · `TEMPORARY_COMPATIBILITY` · `ABSORB_THEN_ARCHIVE` · `REVIEW_FOR_RETIREMENT` · `RETIRE_REMOVE` · `HUMAN_GATE_PURGE`.

**Do not create a new Cleanup/Optimization System.**

### G3 · Egress — carried correction
Do not describe every "bot" byte as hostile crawler traffic. Deeper 29.9 logs found a dominant node-fetch raw-video burst on `media/sod1820/agent/sharshar-*.mp4` with strong asset/time correlation to authorized Descript research/editing imports. **Correlation is strong but not cryptographic identity proof**, and the bytes still count as real egress cost.

Operational categories must distinguish: public/human delivery · authorized external processing / research-tool transfer · CI/headless acceptance · named crawler · unknown automation. **UA/IP/ASN alone is not authorization identity.**

Semantic events had zero `is_bot` rows while Storage showed bot-like traffic: **events is NOT sufficient crawler/egress attribution** — use provider/edge/storage evidence.

**PR #804** poster backfill was audited as adjacent hygiene, **not** root cause of that burst. Re-evaluate on current main; if still useful, replay through the existing poster/thumb pipeline only; beware the one-time raw-video egress cost of the backfill itself; do not claim it fixes public crawler egress unless measurement proves it.

### G4 · Legacy retirement
Anything still used by the active old site may remain `TEMPORARY_COMPATIBILITY`, but each such item needs: current writer · current reader · 2029 replacement · proof · retirement condition.

Re-check especially: Legacy telemetry dual-write · `gematria_wall` · `raw_gematria` · `convergences` · `journey_seeds` · `research_candidates` · `insights` · `discovery_events` · `contributor_content` · `bot_health` · `g3_openweb_import_stage` · backup/bak/cleanup tables.

**No data purge solely because a table "looks old."**

### G5 · Performance — evidence, not table-count aesthetics
Right-size: hot RPC/query paths · missing useful indexes · true duplicate/redundant indexes · hot RLS policies · DB-held network waits · cache/projection paths · `VACUUM`/`ANALYZE` only after logical/index changes. **"One Tree" does not mean "one SQL table."**

Add here: rail 7E (cache / projection version) has no verified implementation — canonical input identity, version dimensions, hit provenance, invalidation on material change. Newly relevant now that server documents are generated for crawlers.

### G6 · Raziel
Verify channel adapters consume canonical Routing, Method Profile, Research OS, Convergence and Context. **No WhatsApp-local brain, fixed method registry or independent convergence truth.** Latency-critical external provider I/O must not hold DB connections where the existing async/Edge path preserves identity, idempotency, retry, delivery outcome and trace.

### G7 · Monitoring
**One monitoring tree only.** FAST Health = cheap bounded routine snapshot. DEEP = retention, dependency scans, dedupe, storage drilldown, expensive diagnostics — cached/background/on-demand under existing `analytics_cache`/owners. **No Monitor 2.**

---

## PHASE H — HUMAN-GATE-ADJACENT ITEMS

Do all preparatory and replay-safe work first; stop at the gate and report exact action, cost and risk.

### H1 · Restore drill
G3 cannot formally close without at least one isolated restore drill proving **recovery**, not merely that a backup file exists. **DO NOT restore destructively into canonical production.** First resolve the existing backup owner and what can actually be restored. If executing an isolated Supabase branch/project carries cost or security consequences, **STOP at that Human Gate** and report exact action/cost/risk.

### H2 · Erasure / export path — HIGH · NEW
Live: functions matching `erase|delete_account|export_user|forget|gdpr|purge_user` in `public` → **NONE**.

PHASE 1 requires account deletion/erasure/export identified **before** private corpus and voice history grow. This is the one Layer-1 item that gets strictly more expensive with time.

Required: a path over the existing Person/Privacy owner covering `user_research`, `user_notes`, `journey_saves`, `identity_edges`, `search_log`, media submissions and trace references — reusing the `admin_retention_preview()` dry-run boundary, **not** a second retention system.

### H3 · Consent separation
Live: consent-bearing objects = `notification_prefs` only. Follow *intent* is not separated from notification-*channel* consent; **PR #486** is the owner candidate and remains draft, with the 2029 Follow control correctly shipped disabled. Blocks Follow/Attention delivery truth and proactive Pulse.

### H4 · PHASE 7F least-privilege acceptance
Measured, not alarmist: RLS enabled on all public tables; sampled `admin_*` SECURITY DEFINER functions enforce `auth.uid()` + `role='admin'` **and** pin `search_path`; the dangerous intersection (SECURITY DEFINER ∧ mutable `search_path` ∧ anon-executable) measured **0**; `journey_saves` demonstrates the correct pattern (direct reads revoked, writes through a bounded SECURITY DEFINER RPC with shape/size validation).

What remains: the isolated acceptance has never been run, so the surface is unreviewed rather than accepted. Concrete item: `agent_research_stats` is a SECURITY DEFINER view granted SELECT to `anon`.

---

## PHASE I — FINAL G3 CLOSURE CHALLENGE

After implementation is complete:

1. Rescan current main + live DB + production.
2. Run all focused tests/gates.
3. Run `build:2029`, and the Legacy build only where current production still depends on it.
4. Run replayable real Goldens.
5. Re-run performance/reliability evidence.
6. Independent foundation challenge.
7. Verify no parallel writer remains.
8. Verify documented state against live state.

The final report **MUST** distinguish, without collapsing:

`DOCUMENTED` · `IMPLEMENTED` · `COMMITTED` · `BRANCH-ONLY` · `MERGED` · `DEPLOYED` · `LIVE` · `VERIFIED`

---

## RELEASE SAFETY

ZURIEL asked to CLOSE the work. **This handoff is not itself permission to perform destructive purge or production release.**

Permitted: research · challenge · isolated branches/PRs · safe tests · non-destructive live verification · preparing the exact release sequence.

Requires the applicable Human Gate / explicit release authorization: merge or deploy to main · production migration apply · destructive purge · permanent Legacy retirement · an isolated paid Supabase project/branch restore drill that incurs cost or material risk.

If only Human-Gate actions remain, **STOP THERE** and give ZURIEL one compact release command/action list.

---

## DONE CONDITION

Do not say "G3 closed" until every mandatory blocker is either:

**A.** `MERGED + DEPLOYED + LIVE + VERIFIED`, or
**B.** explicitly identified as a Human-Gate-only action with no remaining engineering ambiguity.

Mandatory blockers, consolidated:

| # | Blocker | Phase |
|---|---|---|
| 1 | Exact-priced span, cost aggregate → root → span, no double counting | A1 |
| 2 | Trace coverage on material paths | A2 |
| 3 | Three-engine fan-out/fan-in acceptance | A4 |
| 4 | Research Path/Plan write path live | D1 |
| 5 | Reliability precloses (incident latency, dead-man, canary, release gate) | C1–C4 |
| 6 | ELS runtime green on current main | B1–B6 |
| 7 | Restore drill proving recovery | H1 |

---

## FINAL REPORT FORMAT

```
G3 CLOSURE STATUS

- No Black Box / cost drill-down:
- ELS runtime:
- Reliability:
- Research Path live write:
- Restore proof:
- One-tree compaction:
- Performance:
- Retention:
- Raziel:
- Monitoring:
- Legacy writer shutdown:
- PR/branch hygiene:
- Owner Index / documented state:
- remaining Human Gates:
- exact next command for ZURIEL:
```

---

## Boundaries

- This document is a handoff and execution plan. It is **not** an owner, contract, registry, truth store or documented state.
- Domain semantics resolve from live owners; release authority resolves from `deploy_on_request` v2 + `inter_agent_coordination_law` v13.
- Severities and ordering are engineering interpretation, not canonical project state.
- Live verification in §1 was performed READ_ONLY on 2026-09-29 against `origin/main` `90618c13`, canonical Supabase and production. Re-verify before acting — this document ages.
- **Unverified and flagged as such:** Corpus/Books edition/witness identity (PHASE 5B) was not exercised in the underlying scans.
