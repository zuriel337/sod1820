# SOD1820 2029 — Unified Control Center Architecture Freeze V1
Date: 2026-10-10
Decision: APPROVED DIRECTION · DOCUMENTATION ONLY · NO MERGE/DEPLOY
Owner: existing 2029 Experience / System Frame + canonical Operational/AI Cost owners.
Human Gate: project owner explicitly requested chained close-out of architecture, defer release until site ready.

## One home, no parallel admin systems
Single canonical private admin experience: `/2029/control`.
- UX/interaction target: **PR #908** Control Center + resource simulator, release evidence, queues, budgeting/stress scenarios, freshness and refresh.
- Current runtime/observability owners: existing **ControlPlane2029Page.jsx**, admin_system_health, traces/cost logs, video/egress. Keep underlying functionality and server truth.
- Existing Legacy/knowledge/content/admin owners remain authority for their domains; compose secure views/links, do not duplicate databases, RPC business logic, queues or permission truth.
- **PR #1018** is cost/consumption policy contract V1.1; integrate full project expense ledger VIEW using evidence-backed source adapters. Do not treat its prose as deployed implementation.
- **PR #1007** is native Control Plane repair, NOT a separate admin product. Its authenticated preview acceptance found admin_system_health and admin_video_map_health 500 / SQLSTATE 57014 (backend timeout). Must resolve before actual release. Do not represent missing card data as zero.

## Canonical navigation after ready
1. Overview: health, incidents, active attention and freshness.
2. Finance & Consumption: ChatGPT Pro/Codex, OpenAI/Claude/Gemini subscriptions/API, Vercel, Supabase, GitHub, automation/media/business services; confirmed bill vs observed vs estimated vs unknown, renewal, prepaid/no double counting; expense allocation.
3. AI Agents & Tasks: GPT/Codex and Claude/Gemini routing visibility, coordinated work and read-only dispatch status, model costs, no unverified remote invocation.
4. Platform & Media: database, storage, egress, ingestion, backlog/retention preview, cron.
5. Analytics & Growth: marketing funnels, traffic, scenarios, forecast.
6. Release & Security: GitHub PR and exact deployment evidence, canary, readiness, auth boundary.
7. Knowledge/Content links: existing canonical owner screens, not new models.

## Sequence and gates
A. NOW — freeze UX/IA, source-owner crosswalk, route ownership, costs contract references. No production edits.
B. BEFORE SITE CUTOVER — finish 2029 public core; fix admin blocking 500/timeouts via responsible backend owner in independently scoped PR; no rollout from a failed authenticated acceptance. Maintain read-only/least-privilege admin.
C. AFTER core stable — reconcile PR #908 with current main (historically diverged) and PR #1007/1018, cherry-pick scoped features/UX as appropriate, don't blindly merge stale snapshots. Verify no duplicate stores/systems; implement complete Finance surface following contract.
D. ACCEPTANCE — 2029 mobile + desktop + RTL + a11y, authorized admin end-to-end, failure-isolated cards, exact build/production SHA, provider source freshness and missing-value honesty, simulated budget alert no unexpected auto-send, all relevant CI; human review of final preview.
E. RELEASE — independent Human Gate approves merge/production. Retire older navigation surfaces only after capability/ownership parity and rollback validation. Never delete Legacy source owners as side effect.

## Explicit preservation
- Keep OpenAI, Claude, Gemini all active, existing provider routing unchanged until measured what-if and approved update.
- Preserve PR #908 styling and simulator as target; not a license to overwrite more recent main changes.
- Codex remote bridge `REMOTE_CODEX_EXECUTOR_BRIDGE_V1` remains independent. Previously discovered remote CLI 401/managed auth; journaling a task is NOT execution. Authenticate an isolated runner using approved vendor login, probe read-only, then authorized dispatch; no credential dumping, hidden automation or unbounded costs.
- Cost V1.1 `SOD1820_2029_COST_CONTROL_V1` remains its own implementation scope with PR #1018 as contract, no competing billing engine.
- One scope, one active writer; explicit before/after coordination and staged acceptance.
## Status statement
This document closes **architecture only**; no claim of completed operational integration, PR merge, stable previews, production launch or remote Codex connection.

## Implementation Reality · existing private owner extension (PR #1024; BRANCH ONLY)
The already-authorized `/2029/control` ControlPlane2029Page projects a small read-only, failure-isolated view of current coordination from existing admin-gated `get_work_log_current()`, using selected safe columns only (not raw context/notes). Canonical work_log remains coordination evidence, not source-code or runtime truth. Owner/scope are **reported**, implementations/consumers/dependencies/legacy/branch/live/health/cost/DRIFT remain UNKNOWN until independent current main/DB/provider evidence adapters exist. Missing data NEVER means no consumer, no cost, no active writer or safe deletion. Do not create a new store/registry, policy or provider secrets. Existing admin HTTP 500/timeouts in PR #1007 remain blocking for any full production-ready Control Center declaration. Future real evidence map uses owner -> implementation -> consumers -> dependencies -> writer/handoff -> branch/release/live -> health/cost/DRIFT in this one private admin surface. All run/merge/deploy gates remain unchanged.

<a id="implementation-context-map"></a>

## Capability–Surface context cards for GPT

This extends the evidence map of the existing Control architecture only. It is **not** a new capability registry, owner, context store, synchronization process or authority. Existing `contextualCapabilities.js` and `experienceCapabilities.js` remain the product composition/vocabulary; this index helps GPT find their implementation and direct evidence.

**Checkpoint 2026-10-10:** main `4b62216d89b3fada1701ef21f8753f5fffaa9e0b`; PR #1024 baseline `24e96cf2eaf27ae525331d1f4a86432df8c8546a`. Active owner versions were checked in canonical Supabase (including Coordination v13, ELS v9, Strategy v17, Workspace v5, Raziel v3). Code imports/calls and selected live catalog object names were inspected; no private content, full-corpus scan, live product/API operation or admin browser acceptance was performed. Each card is bounded entry evidence, not an exhaustive system certification. Recheck main/PR/owner/writer deltas before implementation.

**Evidence labels:** VERIFIED_CODE / VERIFIED_CODE_BRANCH_ONLY describe inspected code only; live catalog existence is not execution or permission proof. COORDINATION_REPORTED is a dated handoff; PLANNED is intent; UNKNOWN is missing verification. DRIFT is a demonstrated disagreement, not the default for missing evidence. Historical v15 comments in `contextualCapabilities.js` are provenance: current Strategy owner is v17. Missing consumers do not mean no consumers or safe deletion.

**Access without a new service:** natural language → GPT selects one context ID below → existing read-only collector returns that card, source locators and bounded candidate references. Example input to `node scripts/codex-implementation-recon-readonly.mjs` on this branch: `{"task_key":"SOD1820_ELS_UX_CONTEXT","context_id":"els-2029"}`. Related cards are pointers; they are **not recursively loaded**. No API/model call or paid runner is required.

GPT with GitHub tools can read the same card directly from this document at the exact commit and line interval returned by the collector. Reverify PR #1024 head before reading; until merge, a main-only request will not contain this section. Then fetch only the selected source paths/owner bodies needed for the UX decision. With Supabase access, use the active owner rule and bounded relevant `work_log_current` rows; without it, mark live owner/writer state unverified. Offline GPT can use an attached selected pack as dated evidence. Tool availability is session-specific; no automatic ChatGPT connection, memory load or admin endpoint is implied.

| Context ID | Domain / surface |
|---|---|
| `world-2029` | [עולם 2029 ודף הבית](#implementation-world-2029) |
| `frame-2029` | [מסגרת וניווט](#implementation-frame-2029) |
| `number-2029` | [דף המספר ושיטות](#implementation-number-2029) |
| `els-2029` | [ELS בעולם 2029](#implementation-els-2029) |
| `research-2029` | [מחקר, היכל ומסעות](#implementation-research-2029) |
| `users` | [משתמשים, זהות והרשאות](#implementation-users) |
| `content-publications` | [תוכן, פרסומים וגלריות](#implementation-content-publications) |
| `analytics` | [אנליטיקה ותנועה](#implementation-analytics) |
| `payments` | [תשלומים וזכאויות](#implementation-payments) |
| `ai-raziel` | [AI ורזיאל](#implementation-ai-raziel) |
| `infrastructure` | [תשתיות, אבטחה ופריסה](#implementation-infrastructure) |
| `control-2029` | [מרכז הניהול הקיים](#implementation-control-2029) |

<!-- implementation-context:world-2029:start -->
<a id="implementation-world-2029"></a>

### עולם 2029 ודף הבית — `world-2029`

- **Role / intended experience:** Understand what is happening, discover a story, inspect its source and continue without losing the entry point.
- **Implemented:** VERIFIED_CODE: App2029 routes Home/World; World imports source-corpus, entity and context projections. Catalog existence verified for posts, channel_updates, research_objects, nodes and gallery_images. This does not verify current public access to individual content.
- **Planned:** PLANNED: coherent discovery/stories rather than a research dashboard; reuse original source/placement and explicit Journeys. Existing #1013 §8A carries decisions; no independent World tree.
- **Owner / branch / coordination:** BRANCH_ONLY: [#1025](https://github.com/zuriel337/sod1820/pull/1025) codex/world-discovery-integrated-20261010 @ eb6fd33f. Existing World owner; work_log task WORLD_2029_GROUP_STREAM_1001_RELEASE_CONTINUATION_V1, AFTER 4a49d573 releases its delivery scope.
- **Data / API:** posts / channel_updates / nodes / research_objects / gallery_images; fetchEntityHubProjection and public source reader; do not retrieve private bodies for a UX inventory.
- **Gaps / verification:** COORDINATION_REPORTED: exact plane Post return and public/saved Journey acceptance remain; expansion hold 9407b0c8. LIVE deployment of this branch not established. UNKNOWN: current content coverage beyond mapped examples.
- **Dependencies / consumers:** [frame-2029](#implementation-frame-2029), [content-publications](#implementation-content-publications), [research-2029](#implementation-research-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `reality_graph_law`, `research_gold_hints_law`, `research_intake_foundation_contract_law`, `experience_governance_foundation_v1_law`.
Focus paths: `src/pages/Home2029Page.jsx`, `src/pages/World2029Page.jsx`, `src/lib/research/worldDiscoveryStream.js`, `src/lib/research/worldSourceCorpus.js`, `src/lib/research/entityHubProjection.js`, `src/lib/research/contextualCapabilities.js`.
Symbols: `World2029Page`.
Related contexts: `frame-2029`, `content-publications`, `research-2029`.

Source links: [Home2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Home2029Page.jsx) · [World2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/World2029Page.jsx) · [worldDiscoveryStream.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/worldDiscoveryStream.js) · [worldSourceCorpus.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/worldSourceCorpus.js) · [entityHubProjection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/entityHubProjection.js) · [contextualCapabilities.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/contextualCapabilities.js).
<!-- implementation-context:world-2029:end -->

<!-- implementation-context:frame-2029:start -->
<a id="implementation-frame-2029"></a>

### מסגרת וניווט — `frame-2029`

- **Role / intended experience:** Maintain orientation, contextual rails, tools, Number drawer, Research Context and Raziel across destinations.
- **Implemented:** VERIFIED_CODE: App2029 composes AuthProvider + ResearchProvider; SystemFrame consumes contextual tools/actions, Number drawer and Raziel surface context. These are existing components, not proof every navigation state passed acceptance.
- **Planned:** PLANNED: one consistent 2029 frame under Design V2; final layout/motion and spatial progression remain experience work.
- **Owner / branch / coordination:** Existing System Frame/Design owners; shared Crown/Frame imports appear in #1025, ELS shared controls in #1020. Work-log mobile dock followup 5c1976ee; no new Frame writer assigned here.
- **Data / API:** ResearchProvider context; AuthContext; current availability/entitlement owners. This card defines no global route or capability registry.
- **Gaps / verification:** COORDINATION_REPORTED: narrow mobile dock labels need closure. UNKNOWN: all auth-expiry/reload/orientation combinations. Route declarations alone do not establish production routing.
- **Dependencies / consumers:** [users](#implementation-users), [research-2029](#implementation-research-2029), [ai-raziel](#implementation-ai-raziel). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `experience_governance_foundation_v1_law`, `canonical_ui_components_law`.
Focus paths: `src/App2029.jsx`, `src/components/experience2029/SystemFrame2029.jsx`, `src/components/experience2029/Sod2029Shell.jsx`, `src/lib/research/contextualCapabilities.js`, `docs/sod1820-system-frame-contract-v1.md`, `docs/sod1820-system-frame-contract-v2-addendum.md`.
Symbols: `SystemFrame2029`.
Related contexts: `users`, `research-2029`, `ai-raziel`.

Source links: [App2029.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/App2029.jsx) · [SystemFrame2029.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/components/experience2029/SystemFrame2029.jsx) · [Sod2029Shell.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/components/experience2029/Sod2029Shell.jsx) · [contextualCapabilities.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/contextualCapabilities.js) · [sod1820-system-frame-contract-v1.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/docs/sod1820-system-frame-contract-v1.md) · [sod1820-system-frame-contract-v2-addendum.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/docs/sod1820-system-frame-contract-v2-addendum.md).
<!-- implementation-context:frame-2029:end -->

<!-- implementation-context:number-2029:start -->
<a id="implementation-number-2029"></a>

### דף המספר ושיטות — `number-2029`

- **Role / intended experience:** See expressions, exact methods, visible expansion/hidden letters and crossings; begin a Journey from the chosen result.
- **Implemented:** VERIFIED_CODE: Number page imports canonical trace, method/system projections, living World and deep-view components. gematria_method_trace RPC and gematria_methods/gematria_words catalogs exist. No new arithmetic or method engine.
- **Planned:** PLANNED: high-fidelity method rendering and cross-surface Journey continuity through existing identities; advanced spatial travel later.
- **Owner / branch / coordination:** Existing Number/method owners. #1014 continuity is included in #1025; #1016 depth-fidelity slice is separate lineage. Reconcile current work_log before editing Number.
- **Data / API:** gematria_methods / gematria_words / nodes; gematria_method_trace; entityHubProjection. Verify numeric transforms with canonical rules/engine, never model arithmetic.
- **Gaps / verification:** COORDINATION_REPORTED: initial sourceRef propagation and actual selected Post region remain acceptance seams. UNKNOWN: complete current method parity, private save and full public reader acceptance.
- **Dependencies / consumers:** [research-2029](#implementation-research-2029), [content-publications](#implementation-content-publications), [ai-raziel](#implementation-ai-raziel). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `gematria_engine_law`, `canonical_methods_registry_law`, `research_workspace_law`.
Focus paths: `src/pages/Number2029Page.jsx`, `src/lib/research/numberDeepViewProjection.js`, `src/lib/research/gematriaTrace.js`, `src/lib/research/entityHubProjection.js`, `src/lib/research/gematriaMethodRegistry.js`, `src/lib/research/numberExpressionFocus.js`.
Symbols: `Number2029Page`.
Related contexts: `research-2029`, `content-publications`, `ai-raziel`.

Source links: [Number2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Number2029Page.jsx) · [numberDeepViewProjection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/numberDeepViewProjection.js) · [gematriaTrace.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/gematriaTrace.js) · [entityHubProjection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/entityHubProjection.js) · [gematriaMethodRegistry.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/gematriaMethodRegistry.js) · [numberExpressionFocus.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/numberExpressionFocus.js).
<!-- implementation-context:number-2029:end -->

<!-- implementation-context:els-2029:start -->
<a id="implementation-els-2029"></a>

### ELS בעולם 2029 — `els-2029`

- **Role / intended experience:** Enter ELS from a story/context, inspect the exact term/corpus/skip/direction/start, replay it, ask contextual Raziel and continue or return.
- **Implemented:** VERIFIED_CODE: Els2029Page calls verifyEls2029Selection via els-search-bridge, projects results/layers and builds Raziel context. Replay client requires term, corpus, skip, direction and start. Contextual tools expose /els from World; this is route capability evidence, not proof a selected World occurrence survives end-to-end.
- **Planned:** PLANNED: native search/history/cipher workspace, exact Journey reuse and progressive spatial presentation, using the single canonical engine.
- **Owner / branch / coordination:** BRANCH_ONLY: [#965](https://github.com/zuriel337/sod1820/pull/965) gpt/els-native-classic-v1 @ b8925353; [#1020](https://github.com/zuriel337/sod1820/pull/1020) gpt/els-crown-design-integration-20261010 @ 34133a4e. Existing ELS owner, task ELS_REGULAR_RESULTS_COMPLETION_V1. Design import in #1025 does not import/accept the complete ELS workspace.
- **Data / API:** Existing canonical ELS bridge and result/selection adapters. API source inspected; no live search/API/model invocation in this map. Load current ELS owner body only when semantics are required.
- **Gaps / verification:** COORDINATION_REPORTED: F3/F4 privacy followup 165cfc12 has no closure in this bounded read. UNKNOWN: current server execution/permissions and exact World → ELS → saved Journey → return acceptance. Do not trigger an ELS scan to fetch this context.
- **Dependencies / consumers:** [frame-2029](#implementation-frame-2029), [research-2029](#implementation-research-2029), [ai-raziel](#implementation-ai-raziel). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `els_research_layer_law`, `research_workspace_law`, `research_strategy_layer_law`, `raziel_companion_layer_law`.
Focus paths: `src/pages/Els2029Page.jsx`, `src/lib/research/els2029ReplayClient.js`, `src/lib/research/els2029Projection.js`, `src/lib/research/elsRazielContext.js`, `src/lib/research/elsJourneyReopen.js`, `src/lib/research/contextualCapabilities.js`, `supabase/functions/els-search-bridge/index.ts`, `docs/els-capability-workarea-unification.md`.
Symbols: `buildElsRazielSurfaceContext`, `verifyEls2029Selection`.
Related contexts: `frame-2029`, `research-2029`, `ai-raziel`.

Source links: [Els2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Els2029Page.jsx) · [els2029ReplayClient.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/els2029ReplayClient.js) · [els2029Projection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/els2029Projection.js) · [elsRazielContext.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/elsRazielContext.js) · [elsJourneyReopen.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/elsJourneyReopen.js) · [contextualCapabilities.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/contextualCapabilities.js) · [index.ts](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/supabase/functions/els-search-bridge/index.ts) · [els-capability-workarea-unification.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/docs/els-capability-workarea-unification.md).
<!-- implementation-context:els-2029:end -->

<!-- implementation-context:research-2029:start -->
<a id="implementation-research-2029"></a>

### מחקר, היכל ומסעות — `research-2029`

- **Role / intended experience:** Inspect evidence and methods deeply in Heichal, compose findings and save/resume a Journey using one Research Context.
- **Implemented:** VERIFIED_CODE: Provider composes context/sync/path functions; path runtime calls fn_research_path_resume_v1, append_v1 and fork_v1. Those RPCs and research_paths/research_objects exist in the live catalog; behavior and ACL acceptance were not replayed by this inventory.
- **Planned:** PLANNED: public Journey reader/publishing acceptance and final Heichal composition; do not substitute private persistence for a public reader.
- **Owner / branch / coordination:** Existing Workspace/Research Paths owners; #1014 joined into #1025; existing dependency plan #1013. No research-store or Heichal writer takeover.
- **Data / API:** research_objects / research_paths; exact path RPCs; existing Research OS evidence, not work_log as a research store.
- **Gaps / verification:** UNKNOWN: current authenticated save/resume/expiry behavior on the accepted consumer and public publication/access. COORDINATION_REPORTED: guest preview is only guest evidence.
- **Dependencies / consumers:** [users](#implementation-users), [number-2029](#implementation-number-2029), [els-2029](#implementation-els-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `research_workspace_law`, `research_strategy_layer_law`, `truth_axes_foundation_law`.
Focus paths: `src/lib/research/ResearchProvider.jsx`, `src/lib/research/researchContext.js`, `src/lib/research/researchPathRuntime.js`, `src/lib/research/researchPlanV2.js`, `src/lib/research/researchResultBundle.js`, `src/pages/Heichal2029Page.jsx`, `docs/research-studio-v1-contract.md`.
Symbols: `getLatestResearchPath`.
Related contexts: `users`, `number-2029`, `els-2029`.

Source links: [ResearchProvider.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/ResearchProvider.jsx) · [researchContext.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/researchContext.js) · [researchPathRuntime.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/researchPathRuntime.js) · [researchPlanV2.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/researchPlanV2.js) · [researchResultBundle.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/researchResultBundle.js) · [Heichal2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Heichal2029Page.jsx) · [research-studio-v1-contract.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/docs/research-studio-v1-contract.md).
<!-- implementation-context:research-2029:end -->

<!-- implementation-context:users:start -->
<a id="implementation-users"></a>

### משתמשים, זהות והרשאות — `users`

- **Role / intended experience:** Sign in, retain personal research and follow preferences while private context remains private.
- **Implemented:** VERIFIED_CODE: AuthContext subscribes to authentication/profile state; auth adapter reads users and supports password/OTP/OAuth; identity and research sync adapters exist. users catalog verified without reading personal rows.
- **Planned:** PLANNED: accepted personal-area continuity across surfaces and channels under current Person owner; no separate identity store.
- **Owner / branch / coordination:** Existing Person/Auth owners; #999 security and #1008 entry acceptance are related restricted lanes, not ownership transfers.
- **Data / API:** Supabase Auth + users; existing identity/research sync/notification RPCs; private rows excluded from this pack.
- **Gaps / verification:** UNKNOWN: present user-role/RLS behavior, session-expiry Golden and individual grants. Do not infer authorization from a UI flag or admin SQL catalog access.
- **Dependencies / consumers:** [research-2029](#implementation-research-2029), [payments](#implementation-payments), [frame-2029](#implementation-frame-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `person_foundation_contract_law`, `subscription_funnel_law`, `platform_tiers_law`.
Focus paths: `src/lib/AuthContext.jsx`, `src/lib/auth.js`, `src/lib/identity.js`, `src/lib/research/researchSyncRuntime.js`, `src/lib/notifications.js`.
Symbols: `AuthProvider`.
Related contexts: `research-2029`, `payments`, `frame-2029`.

Source links: [AuthContext.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/AuthContext.jsx) · [auth.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/auth.js) · [identity.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/identity.js) · [researchSyncRuntime.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/researchSyncRuntime.js) · [notifications.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/notifications.js).
<!-- implementation-context:users:end -->

<!-- implementation-context:content-publications:start -->
<a id="implementation-content-publications"></a>

### תוכן, פרסומים וגלריות — `content-publications`

- **Role / intended experience:** Read a clear story, open its original image/caption, understand a topic connection and return to the same place.
- **Implemented:** VERIFIED_CODE: Post consumes reading projection and contextual findings; entity projection reads graph/gallery/source occurrences; public source-corpus adapter reads posts. Catalog existence verified for posts/gallery_images/channel_updates/topic_cards_public.
- **Planned:** PLANNED: preserve historical gallery chronology/credits while exposing individual images in topics; raw arrivals are not automatically approved research. Reuse original scanned evidence.
- **Owner / branch / coordination:** Existing publication owner project_codex.publishing_conventions + Intake; Posts task GOLDEN_POSTS_POST_ONLY_RECONCILE_V2. #1015 source context integrated in #1025. Source mapping e04a35a0 and recovery request d5f8250c are provenance.
- **Data / API:** posts / gallery_images / channel_updates / topic_cards_public; canonical Post identity and gallery placement. work_log stores handoff references only.
- **Gaps / verification:** COORDINATION_REPORTED: exact plane region restoration, source admission boundaries and original mapping annex recovery. UNKNOWN: candidate publication permission; unpublished drafts must not enter public context exports.
- **Dependencies / consumers:** [world-2029](#implementation-world-2029), [number-2029](#implementation-number-2029), [research-2029](#implementation-research-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `research_intake_foundation_contract_law`, `truth_axes_foundation_law`, `reality_graph_law`.
Focus paths: `src/pages/Post2029Page.jsx`, `src/pages/Topic2029Page.jsx`, `src/lib/research/post2029ReadingProjection.js`, `src/lib/research/galleryMediaEnvelope.js`, `src/lib/research/entityHubProjection.js`, `src/lib/research/worldSourceCorpus.js`.
Symbols: `fetchPost2029ReadingProjection`.
Related contexts: `world-2029`, `number-2029`, `research-2029`.

Source links: [Post2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Post2029Page.jsx) · [Topic2029Page.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/Topic2029Page.jsx) · [post2029ReadingProjection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/post2029ReadingProjection.js) · [galleryMediaEnvelope.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/galleryMediaEnvelope.js) · [entityHubProjection.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/entityHubProjection.js) · [worldSourceCorpus.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/worldSourceCorpus.js).
<!-- implementation-context:content-publications:end -->

<!-- implementation-context:analytics:start -->
<a id="implementation-analytics"></a>

### אנליטיקה ותנועה — `analytics`

- **Role / intended experience:** Understand real visits and discovery/Journey usage without counting internal admin activity as public engagement.
- **Implemented:** VERIFIED_CODE: App2029 RouteEffects excludes /2029/control from public route telemetry; analytics2029 uses admin_2029_analytics; visits provides canonical traffic/health adapters. events and admin_2029_analytics catalog existence verified.
- **Planned:** PLANNED: final UX funnels and growth projections should reuse current traffic definitions, not create competing visit counts.
- **Owner / branch / coordination:** Existing Traffic Intelligence and admin analytics owners; no new analytics writer identified in this bounded check. Resolve a live task before changes.
- **Data / API:** events; admin_2029_analytics / track_visit and current traffic RPC adapters in visits.js; schema presence does not prove successful RPC results.
- **Gaps / verification:** UNKNOWN: latest measured traffic, consent/identity completeness, counters and provider freshness. No production analytics RPC or tracking write invoked here.
- **Dependencies / consumers:** [world-2029](#implementation-world-2029), [control-2029](#implementation-control-2029), [infrastructure](#implementation-infrastructure). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `traffic_intelligence_law`, `system_suggestions_law`.
Focus paths: `src/lib/analytics2029.js`, `src/lib/analytics.js`, `src/lib/visits.js`, `src/lib/research/journey2029Telemetry.js`, `src/App2029.jsx`, `src/lib/webVitals2029.js`.
Symbols: `get2029Analytics`.
Related contexts: `world-2029`, `control-2029`, `infrastructure`.

Source links: [analytics2029.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/analytics2029.js) · [analytics.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/analytics.js) · [visits.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/visits.js) · [journey2029Telemetry.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/journey2029Telemetry.js) · [App2029.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/App2029.jsx) · [webVitals2029.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/webVitals2029.js).
<!-- implementation-context:analytics:end -->

<!-- implementation-context:payments:start -->
<a id="implementation-payments"></a>

### תשלומים וזכאויות — `payments`

- **Role / intended experience:** Understand access and credit purchase clearly, with entitlement and balance resolved by the server.
- **Implemented:** VERIFIED_CODE: legacy CreditsBuyPage uses credit_packages_list/cardcom_purchase_status/credit_purchase_request; credits.js calls credit_spend. credit_ledger and credit_spend catalog exist. notify-payment is a retired 410 tombstone, NOT an active sender.
- **Planned:** PLANNED: 2029 purchase/access experience reuses canonical entitlement/credit owners. experienceCapabilities is vocabulary/composition, explicitly not a permission or pricing engine.
- **Owner / branch / coordination:** Existing Access/Credit owners; no payment implementation PR selected by this bounded inventory. Legacy code is evidence, not 2029 UX authority.
- **Data / API:** credit_ledger; credit_spend and existing purchase RPC adapters. Cost Control for infrastructure spend is a separate owner scope.
- **Gaps / verification:** UNKNOWN: actual provider webhook/charge readiness, current pricing, purchase acceptance and 2029 routing. No payment, balance read, provider call or price change performed.
- **Dependencies / consumers:** [users](#implementation-users), [ai-raziel](#implementation-ai-raziel), [control-2029](#implementation-control-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `platform_tiers_law`, `unified_credit_system`, `site_flags_lock_law`.
Focus paths: `src/pages/CreditsBuyPage.jsx`, `src/lib/credits.js`, `src/lib/experienceCapabilities.js`, `supabase/functions/notify-payment/index.ts`.
Symbols: `spendCredits`.
Related contexts: `users`, `ai-raziel`, `control-2029`.

Source links: [CreditsBuyPage.jsx](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/pages/CreditsBuyPage.jsx) · [credits.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/credits.js) · [experienceCapabilities.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/experienceCapabilities.js) · [index.ts](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/supabase/functions/notify-payment/index.ts).
<!-- implementation-context:payments:end -->

<!-- implementation-context:ai-raziel:start -->
<a id="implementation-ai-raziel"></a>

### AI ורזיאל — `ai-raziel`

- **Role / intended experience:** A contextual companion understands the current source, method and selection, explains a connection and suggests an authorized next step.
- **Implemented:** VERIFIED_CODE: askRaziel invokes ai-analyze persona=raziel with context/path/surface_semantic; SystemFrame builds current surface context; structured next-action and ELS context adapters exist.
- **Planned:** PLANNED: continuous adaptive research, voice and learned preferences follow existing Raziel owner gates; conversation feedback does not prove deployed learning.
- **Owner / branch / coordination:** Existing Raziel/AI owner; [#1017](https://github.com/zuriel337/sod1820/pull/1017) codex/raziel-quota-trace-20261010 @ 6d832d44 is a branch-only completed-tool/quota Trace fix.
- **Data / API:** ai-analyze existing API, canonical Research Context/Result Bundle and server capability gates; no new memory, provider route or API key.
- **Gaps / verification:** UNKNOWN: live contextual answer quality, provider usage and all authorization/limit cases. No model request or AI scan performed. Paid Codex execution and credential handoff are outside this map.
- **Dependencies / consumers:** [research-2029](#implementation-research-2029), [users](#implementation-users), [frame-2029](#implementation-frame-2029). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `raziel_companion_layer_law`, `raziel_routing_law`, `research_strategy_layer_law`.
Focus paths: `src/lib/research/razielSurfaceContext.js`, `src/lib/research/razielActionContract.js`, `src/lib/research/elsRazielContext.js`, `src/lib/supabase.js`, `supabase/functions/ai-analyze/index.ts`, `src/lib/experienceCapabilities.js`.
Symbols: `askRaziel`.
Related contexts: `research-2029`, `users`, `frame-2029`.

Source links: [razielSurfaceContext.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/razielSurfaceContext.js) · [razielActionContract.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/razielActionContract.js) · [elsRazielContext.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/research/elsRazielContext.js) · [supabase.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/supabase.js) · [index.ts](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/supabase/functions/ai-analyze/index.ts) · [experienceCapabilities.js](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/src/lib/experienceCapabilities.js).
<!-- implementation-context:ai-raziel:end -->

<!-- implementation-context:infrastructure:start -->
<a id="implementation-infrastructure"></a>

### תשתיות, אבטחה ופריסה — `infrastructure`

- **Role / intended experience:** Keep the site available and make release state, failures and dependencies visible without confusing a branch with production.
- **Implemented:** VERIFIED_CODE: CI/release/canary workflows and Vercel route config exist; live main checked at 4b62216d. Active owner versions and relevant coordination read via canonical Supabase. No production request executed by this inventory.
- **Planned:** PLANNED: close current G1/P0 and public cutover acceptance under existing owners; no new deploy or synchronization service.
- **Owner / branch / coordination:** Existing #999 P0, #1008 G1 and reliability owners. PR1024 remains draft, branch only. No merge/main push/production authorization here.
- **Data / API:** work_log_current for coordination, GitHub heads/checks, Vercel deployment evidence under actual tools; neither source-file presence nor a handoff establishes LIVE.
- **Gaps / verification:** COORDINATION_REPORTED: existing production canary failure remains a release blocker. UNKNOWN: current production SHA/health beyond cited receipts. Revalidate only the affected deployment before release.
- **Dependencies / consumers:** [control-2029](#implementation-control-2029), [users](#implementation-users), [analytics](#implementation-analytics). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `foundation_closure_protocol_law`, `inter_agent_coordination_law`, `work_log_authority_law`.
Focus paths: `.github/workflows/post-deploy-canary.yml`, `.github/workflows/release-visual-gate.yml`, `vercel.json`, `SOD1820_MASTER_STATE.md`, `AGENTS.md`, `CLAUDE.md`.
Symbols: .
Related contexts: `control-2029`, `users`, `analytics`.

Source links: [post-deploy-canary.yml](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/.github/workflows/post-deploy-canary.yml) · [release-visual-gate.yml](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/.github/workflows/release-visual-gate.yml) · [vercel.json](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/vercel.json) · [SOD1820_MASTER_STATE.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/SOD1820_MASTER_STATE.md) · [AGENTS.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/AGENTS.md) · [CLAUDE.md](https://github.com/zuriel337/sod1820/blob/4b62216d89b3fada1701ef21f8753f5fffaa9e0b/CLAUDE.md).
<!-- implementation-context:infrastructure:end -->

<!-- implementation-context:control-2029:start -->
<a id="implementation-control-2029"></a>

### מרכז הניהול הקיים — `control-2029`

- **Role / intended experience:** Give an authorized administrator a bounded view of health, traces, work and evidence gaps in the existing /2029/control surface.
- **Implemented:** VERIFIED_CODE_BRANCH_ONLY (#1024): admin-gated selected-column get_work_log_current read feeds implementationRealityProjection. Output is COORDINATION_REPORTED; implementations/consumers/live/health/cost remain UNKNOWN. Admin RPC names exist in live catalog; authenticated UI/RPC success not proven.
- **Planned:** PLANNED: independent current-code/live evidence adapters in the same private Control surface; full admin expansion remains deferred.
- **Owner / branch / coordination:** Existing Control owners, [#1024](https://github.com/zuriel337/sod1820/pull/1024) codex/isolated-executor-prototype-20261010 baseline24e96cf2; related #1007 and #908 are not blindly composable. Context routing is a separate bounded increment, not executor activation.
- **Data / API:** get_work_log_current / admin_system_health / current operational trace adapters. Private raw coordination notes are not public map inputs.
- **Gaps / verification:** COORDINATION_REPORTED: #1007 backend timeout/500 gate and #908 reconciliation. This read-only context package is not automatically loaded into the admin UI; no live aggregation endpoint or GPT natural-language API is claimed.
- **Dependencies / consumers:** [infrastructure](#implementation-infrastructure), [analytics](#implementation-analytics), [ai-raziel](#implementation-ai-raziel). These are direct context pointers, not an exhaustive consumer graph.

Owner refs: `system_suggestions_law`, `work_log_authority_law`, `inter_agent_coordination_law`.
Focus paths: `src/pages/ControlPlane2029Page.jsx`, `src/lib/implementationRealityProjection.js`, `src/lib/visits.js`, `scripts/codex-implementation-recon-readonly.mjs`, `docs/2029-unified-control-center-architecture-freeze-v1.md`.
Symbols: `projectImplementationRealityAssignments`.
Related contexts: `infrastructure`, `analytics`, `ai-raziel`.

Source links: [ControlPlane2029Page.jsx](https://github.com/zuriel337/sod1820/blob/24e96cf2eaf27ae525331d1f4a86432df8c8546a/src/pages/ControlPlane2029Page.jsx) · [implementationRealityProjection.js](https://github.com/zuriel337/sod1820/blob/24e96cf2eaf27ae525331d1f4a86432df8c8546a/src/lib/implementationRealityProjection.js) · [visits.js](https://github.com/zuriel337/sod1820/blob/24e96cf2eaf27ae525331d1f4a86432df8c8546a/src/lib/visits.js) · [codex-implementation-recon-readonly.mjs](https://github.com/zuriel337/sod1820/blob/24e96cf2eaf27ae525331d1f4a86432df8c8546a/scripts/codex-implementation-recon-readonly.mjs) · [2029-unified-control-center-architecture-freeze-v1.md](https://github.com/zuriel337/sod1820/blob/24e96cf2eaf27ae525331d1f4a86432df8c8546a/docs/2029-unified-control-center-architecture-freeze-v1.md).
<!-- implementation-context:control-2029:end -->
