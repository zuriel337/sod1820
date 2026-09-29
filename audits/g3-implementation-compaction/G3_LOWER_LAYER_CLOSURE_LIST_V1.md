# SOD1820 — G3 LOWER-LAYER CLOSURE LIST v1

**Date:** 2026-09-29
**Actor:** CLAUDE
**Mode:** READ_ONLY evidence scan. No code, schema, content or release write.
**Status:** EVIDENCE / AUDIT ONLY — not an owner, not documented state, not a release gate result.

**Verification base:** `origin/main` = `90618c1367b2a6cbb0b30ac03df947fcde7e0fa9`; canonical Supabase `linswmnnkjxvweumprav` queried live; production HTTP-verified; `npm run build` PASS; 681 unit tests (663 pass / 18 fail); 53 gate scripts (49 pass / 4 fail).

**Purpose:** every item below is in the lower layers (PHASE 1–7 of `docs/2029-implementation-dependency-plan-v1.md`) and blocks or discounts work built above it. Items are listed bottom-up. Each carries live evidence, why it blocks, and what closure means.

Supersedes the gap list in `G3_BOTTOM_UP_TREE_INFRASTRUCTURE_GAP_SCAN_V1.md` (2026-09-22) where they overlap. Closed since that scan and **not** repeated here: server-rendered identity for search/AI crawlers, the ELS callable boundary, Post/Video/Calculator/Control Plane surfaces, physical trace runtime existence.

---

## LAYER 1 — Identity / privacy / consent · PHASE 1

Verified working, recorded so it is not re-opened: guest→account stitching is real. `AuthContext.jsx:72` calls `stitchLogin(user.id)` on auth state change, which writes `link_identity(kind='login')` into `identity_edges` (43 MB live). Legacy visitor keys are adopted as seed rather than reset. Anonymous state is not stolen. `link_visitor_identity` exists server-side.

### C-1.1 · No erasure / export path exists anywhere — **HIGH**

Live: functions matching `erase|delete_account|export_user|forget|gdpr|purge_user` in `public` → **NONE**.

PHASE 1 requires: *"account deletion/erasure/export requirements identified before private corpus/voice history grows."*

Blocks: Private Research Corpus (PHASE 14), voice/transcript history, any premium personal-data capability. Every additional personal-data surface built before this widens the eventual erasure surface. This is the one Layer-1 item that gets strictly more expensive with time.

Closure: an erasure/export path over the existing Person/Privacy owner covering `user_research`, `user_notes`, `journey_saves`, `identity_edges`, `search_log`, media submissions and trace references — reusing the `admin_retention_preview()` dry-run boundary, not a second retention system.

### C-1.2 · Consent is a single channel table, not separated intent — **MEDIUM**

Live: consent-bearing objects in `public` = `notification_prefs` only (4 policies).

PHASE 1 and rail 7C require Follow *intent* to be separate from notification-*channel* consent. PR #486 (`G3-F: close Follow identity one-tree seam`) is the owner candidate and is still **draft**. The 2029 frame ships the Follow control **disabled** with `title="Follow runtime נשאר ב־PR #486 עד release gate"` — correct behavior, but it means the rail is stubbed at the UI boundary.

Blocks: Follow/Attention delivery truth, proactive Research Pulse, cross-channel continuity.

### C-1.3 · No data-lifecycle boundary for personal research state — **MEDIUM**

`src/lib/privacy.js` is 15 lines: a `sessionStorage` anon-search toggle that, by documented product decision, suppresses `search_log` and the public wall while leaving internal analytics running. That is a legitimate product choice and it is **not** a privacy/lifecycle enforcement layer.

PHASE 1/2 require privacy + data-lifecycle enforcement as a runtime boundary. Today there is no retention/lifecycle policy attached to personal research state.

---

## LAYER 2 — Runtime control plane / No Black Box · PHASE 2 · **the declared G3 blocker**

The runtime now exists and is live: `op_trace_roots` (151 rows) / `op_trace_spans` (674 rows), a faithful schema (`parent_span_id`, `outcome`, `output_use`, `cost_certainty`, `fx_rate`, `payload_hash`, `redaction_applied`, and `availability_ref`/`entitlement_ref`/`budget_ref` on the root), plus `op_trace_begin/record_span/finish/link_ai_cost_v1` and admin drill-down `admin_op_trace_v1` / `admin_op_trace_list_v1`. What is missing is coverage and proof, not design.

### C-2.1 · Trace coverage is 4 of 85 edge functions — **BLOCKER**

Emitting: `ai-analyze`, `research-extract`, `research-run`, `els-search-bridge`. Not emitting: the other 81, including `gematria-api`, `expression-extract`, `number-researcher`, `raziel-attention`, `post-save`, the media lane and every notification/delivery path.

PHASE 2 requires 100% material-event coverage. Closure means every *material* interaction — not every function — opens a root or joins one.

### C-2.2 · Zero spans carry `cost_certainty='exact'` — **BLOCKER**

Live: `select count(*) from op_trace_spans where cost_certainty='exact'` → **0**. Observed values are `not_billable` and `unknown` only.

This is the single most load-bearing item in the whole list. The Roadmap's own stated blocker is that an admin cost/usage aggregate must drill down to root trace and individual spans **without double-counting**. With no exact-priced span, the ₪ path has never been demonstrated end to end. One real priced model call, linked through `op_trace_link_ai_cost_v1` with provider-native amount + FX + `pricing_ref`, converts the runtime from built to proven.

### C-2.3 · No client→server trace propagation — **HIGH**

Live: no `trace_id` or `op_trace` reference anywhere in `src/pages/*2029*.jsx`, `src/components/experience2029/` or `researchPathRuntime.js`.

Traces therefore begin at the edge function, not at the user interaction. PHASE 2 requires a shared correlation envelope across browser/server/Edge/planner/engine/tool/media, and §1.6 requires the chain `arrival → surface/action → Research Context → operational trace → engine cost → output use`. Without the browser hop, the business question the plan is built to answer cannot be answered.

### C-2.4 · Three-engine fan-out/fan-in acceptance not demonstrated — **BLOCKER**

PHASE 2 states the Golden requirement explicitly: `root → router/plan → engine A + B + C → tools → synthesis → response`, each engine's cost/latency/result-use independent, exact root roll-up, no double counting. No such fixture or live trace exists. `output_use` is modeled in the schema but unproven under fan-in.

### C-2.5 · Experience Context seam still adopted by 2 surfaces — **HIGH**

Live: `experienceContext`/`experienceCapabilities` consumed by `World2029Page.jsx` and `SystemFrame2029.jsx` only. `composeCapabilityProjection` has **zero** call sites. Unchanged across two measurements (22.9 → 29.9) while four new surfaces shipped.

PHASE 2's "One access tree" (availability → authorization → entitlement → budget → routing) is declared, tested and not taken by Topic, Books, ELS, Heichal, Researcher, Number, Post, Video, Calculator or Control Plane. Each surface added before adoption is a future migration.

### C-2.6 · The entitlement/budget gate guards 2 of 4 traced paths — **HIGH**

`fn_capability_execution_gate_v1` / `fn_user_entitlement` are called from `ai-analyze` and `research-run` only. Notably **`els-search-bridge` is traced but ungated** — the newest expensive path emits telemetry yet runs without the server gate in front of it.

PHASE 2's exit gate is "no expensive capability can execute before server gate." ELS is now exactly such a capability.

---

## LAYER 3 — Event-driven jobs / background execution · PHASE 3

### C-3.1 · No general background-job runtime for user work — **MEDIUM**

The **agent** lane is genuinely live and correctly built: `work_log` carries `dispatch_kind/state/attempts/next_attempt_at/lease_owner/lease_expires_at/last_error/completed_at`, with real in-flight states (`FIRE_REQUESTED`, `DEFERRED`). EXTEND_EXISTING was honored — no second queue owner.

What does not exist is the equivalent for **user-initiated** long work: lease/claim, duplicate suppression, cancel, stale-lease recovery and `trace_id` propagation for research runs, media generation and Pulse. Domain queues (`media_thumb_queue`, `wa_deep_queue`, `word_review_queue`) are not that runtime.

Blocks: Research Room, Research-to-Media, proactive Pulse (PHASES 16–17).

---

## LAYER 4 — Media / Universal Intake · PHASE 4

Healthiest lower layer. Entry points are bounded and plural (`media-upload-intent`, `agent-upload` with hash/MIME validation, `raw-put`, `sign-upload`, `gen-thumb`, `media-thumb-queue`, `capture-video-thumb`). Retention correctly **reuses** `admin_retention_preview()` as a pointer rather than duplicating it — `20260928113000_egress_hardening_monitoring_v1.sql` is explicit about this, and its comment block is a model of owner-respecting design. Egress hardening, crawler metadata guards and video ingest all landed.

### C-4.1 · Derivative-ladder and page-view generation guarantee unproven — **MEDIUM**

The Roadmap still lists media performance/delivery standardization as in-G3. PHASE 4's exit gate requires that every public surface can request the smallest sufficient bounded representation **without page-view media processing or unintended raw-video/original fetch**. The monitoring projection now reports thumbnail health and large objects, which is the instrument — the acceptance run against it is what is missing.

### C-4.2 · Media spans do not join the trace — **MEDIUM**

Consequence of C-2.1: no media function emits. PHASE 4 explicitly requires media processing spans to join the No-Black-Box trace.

---

## LAYER 5 — Canonical engine layer · PHASE 5

5A Gematria is closed: server authority via `supabase.rpc("gematria_api")`, no client calculator authority in the 2029 graph.

### C-5.1 · ELS boundary exists; replay/negative outcomes unproven — **HIGH**

`els-search-bridge` (227 lines) is live and `Els2029Page` calls it through `verifyEls2029Selection`. `els_records` holds 135 rows.

PHASE 5C additionally requires bounded search space and continuation, replay/verification, and explicit negative/truncated/context-required outcomes — plus the PHASE 9 Golden fixture preserving canonical occurrence identity and replay inputs (corpus/version, start/positions/span, skip, direction, locus) across renderers. None of that is demonstrated yet. Combined with C-2.6, ELS is currently the least-governed expensive path in the tree.

### C-5.2 · Corpus / Books witness identity — **MEDIUM**

PHASE 5B requires stable source/work/edition/witness identity, locator vs revision vs current-render distinction, and extraction lineage. `corpus_admission_foundation_v1` and `shared_expression_extraction_contract_v1` own this and the Books 2029 surface consumes it, but the edition/witness distinction has not been verified live in this scan. Flagged as unverified rather than failed.

---

## LAYER 6 — Research OS / Context Compiler · PHASE 6

### C-6.1 · `research_plans` = 0 and `research_paths` = 0 — **BLOCKER**

Unchanged across all three measurements (22.9 initial, 22.9 post-release, 29.9), despite `20260922…g3_research_path_resumability_runtime_v1.sql` and `src/lib/research/researchPathRuntime.js` both being merged, and despite `d0c4033c Journey 2029: add basic path telemetry foundation` shipping.

The migration and the runtime are `MERGED`. The capability is not `LIVE` — nothing writes a row.

Blocks: PHASE 6's exit gate (switch surface/channel/model without losing research subject, evidence lineage or authorized state) and everything that consumes it — Research Room, Dossier, Pulse, cross-channel continuity, and the Journey surface in C-9.1.

This is the second load-bearing item after C-2.2, and it is the one where merged code has been sitting unused the longest.

---

## LAYER 7 — Cross-cutting rails · PHASE 7

7D (SEO / canonical publishing) is **closed** and is not listed below: Googlebot, bingbot and Baiduspider now receive server-rendered documents, verified live on `/topic/1820`; soft-404s were closed and video/search indexability unified.

### C-7.1 · Follow / Attention rail stubbed — **MEDIUM**
See C-1.2. PR #486 draft; UI control disabled.

### C-7.2 · Typed Share Object not finalized — **MEDIUM**
Rail 7B requires one typed Share Object/Intent (content identity ≠ landing identity ≠ share action ≠ arrival ≠ conversion) before broad 2029 share UI. `ShareActions` is the canonical primitive and is already used across surfaces; the plan warns specifically against cloning the current minimal pattern before the rail is finalized. Surface count has since grown from 8 to 12.

### C-7.3 · PHASE 7F least-privilege acceptance never run — **MEDIUM**

Measured, not alarmist. RLS is enabled on all public tables. Sampled `admin_*` SECURITY DEFINER functions enforce `auth.uid()` + `role='admin'` **and** pin `search_path`. The dangerous intersection (SECURITY DEFINER ∧ mutable `search_path` ∧ anon-executable) measured **0**. `journey_saves` now demonstrates the correct pattern: direct reads revoked, writes through a bounded SECURITY DEFINER RPC with length/shape/size validation.

What remains is that the isolated acceptance PHASE 7F requires has not been run, so the surface is unreviewed rather than accepted. Concrete item: `agent_research_stats` is a SECURITY DEFINER view granted SELECT to `anon`.

### C-7.4 · Cache / projection version rail unspecified — **MEDIUM**
Rail 7E (canonical input identity, version dimensions, hit provenance, invalidation on material change) has no verified implementation. Relevant now that server documents are generated for crawlers.

---

## LAYER 8 — Active-tree hygiene · blocks the mandatory end-of-G3 compaction gate

These are cheap and they are the compaction gate's own acceptance items.

### C-8.1 · 18 failing unit tests — **MEDIUM**
681 tests, 663 pass, 18 fail. Composition unchanged since 22.9 while the suite grew by 229 tests:
- 15 in `roadmapParser.test.js` — parser pinned to **Roadmap v5.3** (`version_label === "v5.3"`, 24 `WS-*` cards, 21 gates) while live is **v6.5**. `roadmapParser.js` is imported by nothing in the application.
- 1 in `explorerAccess.test.js` — imports `vitest`, not a dependency.
- 2 in `explorerFacets.test.js` — `normalizePageResult` pass-through and null-input. In a live Research OS module; triage as real.

### C-8.2 · 4 gate scripts now red — **MEDIUM · new drift since 22.9**
All 49 other gate scripts pass. These four went red during the 327-commit week:
- `test-calculator-2029-opening` — assertion `/פתח את השיטה/` no longer matches source.
- `test-connected-golden-2029` — assertion `/pageBg: "#080c16"/` no longer matches source.
- `test-beit-midrash-methods-registry` — "soul/sub must only render when the registry actually has them".
- `test-research-sync-provider` — `Cannot find package 'esbuild'` (missing devDependency).

The first three are gates that stopped guarding their own subject. That is the failure mode worth naming: a green-looking suite whose red members are ignored.

### C-8.3 · Unreachable duplicate 2029 routes in the legacy runtime — **LOW-MEDIUM**
`src/App.jsx` still declares `/2029`, `/world`, `/els`, `/heichal` against the 2029 page components. `vercel.json` rewrites all of them to `/2029.html` first, so they are unreachable in production while still importing and chunking 2029 surfaces into the legacy graph. Two declarations of one route identity in two runtimes is exactly the drift the isolation gate exists to prevent, and `test-2029-isolation.mjs` does not assert their absence.

### C-8.4 · Node engine drift — **LOW**
`package.json` requires `node >=24.9.0 <25`, `.nvmrc` pins `24.21.0`; agent/CI environments run `v22.22.2` (`EBADENGINE`). Build and gates still pass.

---

## LAYER 9 — Surfaces whose absence is a lower-layer symptom · PHASE 8

### C-9.1 · Journey has no 2029 surface — **MEDIUM**
`JourneyPage.jsx` / `JourneyPageV2.jsx` are legacy. Path telemetry landed (#763) but there is no `Journey2029Page` and no route in `App2029.jsx`. This is downstream of C-6.1: Journey cannot be built natively while `research_paths` is empty.

### C-9.2 · Workspace / Personal Area has no 2029 surface — **MEDIUM**
Declared in PHASE 8, absent from the 2029 route table. Falls through `LegacyDocumentHandoff`. Downstream of C-1.1/C-1.3 and C-6.1.

PHASE 8's exit gate — "no Legacy fallback required for core 2029 interaction" — is not met while these two fall through.

---

## Closure order

Strict dependency order. Items marked BLOCKER gate G3 itself.

1. **C-2.2** one exact-priced span, end to end — the cheapest action with the largest effect on the declared blocker.
2. **C-2.1** extend trace emission to the remaining material paths; **C-2.3** propagate from the browser.
3. **C-2.6** put the gate in front of `els-search-bridge` before ELS traffic grows.
4. **C-6.1** start writing `research_paths` — merged runtime, zero live use, longest-standing.
5. **C-2.4** the three-engine fan-in acceptance; with 1–4 done this becomes a fixture, not a build.
6. **C-8.1/C-8.2/C-8.3** hygiene — hours, not days, and they are the compaction gate's acceptance list.
7. **C-1.1** erasure/export before any private-corpus or voice capability.
8. **C-2.5** route the remaining surfaces through the Experience Context seam.
9. **C-5.1** ELS replay/negative-outcome proof; **C-7.3** the least-privilege acceptance run.
10. **C-9.1/C-9.2** Journey and Workspace, once C-6.1 and C-1.x can carry them.

## Boundaries of this scan

- READ_ONLY. Nothing in the live DB, `origin/main` or production was modified.
- Audit evidence under §15 active-tree discipline. Not an owner; creates no new MASTER/FINAL/map artifact.
- Owner reconciliation is required before any item becomes a decision. A specialist report is evidence, not truth.
- **C-5.2 is flagged unverified rather than failed** — Corpus/Books edition/witness identity was not exercised in this scan.
- Percentages and severities are engineering interpretation, not canonical project state; no owner defines them.
