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

## Approved AI command experience direction — 18.10.2026

**Human decision:** ZURIEL will **manage the SOD1820 site, not a collection of chat sessions or agents**. The sole private management UI is the existing `/2029/control`. An authenticated **"בקש שינוי באתר" / AI Command** experience belongs *inside* that UI and its existing Control Plane owners, including mobile/RTL. It is not a new admin site, replacement research AI, chat-to-chat messaging system, agent wake service, new canonical owner or permission system.

### User journey and truthful state

- ZURIEL gives a natural-language site request, e.g. "check the homepage speed, prepare a fix and let me inspect mobile preview".
- Control Plane resolves current domain/owner and active writer, live `origin/main`, relevant canonical `work_log`, and the minimum necessary source evidence. The response shows **observed facts**, **recommendation**, **work in progress**, **PR/tests**, **exact-sha preview**, **blockers**, **cost**, and **approval needed** as distinct statuses.
- A single user-facing manager presents progress and results. Specialist execution is internal and invoked only when an authorized, verified provider/runtime path exists. ZURIEL is not asked to shuttle raw handoff messages or orchestrate individual chats.
- A request cannot imply that Claude/Codex/ChatGPT Work conversations were remotely resumed. **API/SDK managed agent sessions are separate from preexisting ChatGPT Work conversations.** State `NOT_WIRED` / `UNVERIFIED` until execution provenance exists.
- All actions use the **existing** domain owners, GitHub Issue/PR workflow, release/provenance rules and operational traces. Do not create a duplicate task ledger, job queue, provider registry, analytics, audit log or second work_log.

### Staged, enforceable delivery (no implicit release permission)

**P0 — source/ownership and release blockers (READ_ONLY).**
Recheck `ControlPlane2029Page.jsx`, route/auth, PR #908 and #1007 against *current* main and current preview; resolve or explicitly gate existing admin 500/timeout risks before release. PR #908 is an old divergent draft, not a merge candidate without scoped reconciliation. Inventory existing AI/provider runtime and cost trace contracts; do not claim OpenAI is wired because SDK documentation exists.

**P1 — real authenticated READ_ONLY command vertical slice (isolated PR).**
Extend the existing Control Plane page and owner-qualified server boundary to accept a bounded natural-language intent, resolve relevant current GitHub/Supabase/Vercel facts, return citations/evidence and `UNKNOWN` for gaps, and render errors without hiding existing health cards. Minimum acceptance: real admin auth **on server**, unauthorized 401/403, rate/abuse limits, mobile/RTL/a11y, no client-side secrets, no anonymous external tool calls, no fake tasks or simulated success. The UI is not considered functional until server-side read and exact evidence are verified in private preview.

**P2 — OpenAI model/runtime, gated and metered (separate approval).**
Prefer the official OpenAI Agents SDK manager-style workflow or Responses API **as an implementation choice**, not a second independent product/AI owner; verify compatibility with existing provider orchestration/operational trace first. OpenAI may be marked `WIRED` only after real server-side integration, authorization, privacy, redaction, concurrency and trace tests. Keep `OPENAI_API_KEY` in approved **server-only** encrypted environment configuration, never browser JS, repo, prompts or work_log. API usage is billed separately from ChatGPT; require explicit ZURIEL approval of provider, spending ceiling (per request/day/month), fallback and stop-on-budget policy before any billable call. Fail closed on missing entitlement/cost provenance.

**P3 — bounded build/PR execution (separate write authorization).**
After an explicit task-level command, validate canonical owner and **one scope/file–one active writer**, set isolated branch and test criteria, use an existing authenticated runner/connector, and produce a real GitHub PR plus preview. A work_log entry or created Issue is not proof a remote code worker ran. Under active `inter_agent_coordination_law v17`, no GPT-directed task wake, ACK wait or agent-to-existing-Work-chat injection; do not silently change v17 to make this work. If an execution path requires a governance change, HOLD and obtain a new explicit Human Gate first.

**P4 — governed release.**
Propose release with exact tested head, approved diff, CI, mobile preview, backend auth, rollback and change impact. Explicit ZURIEL approval is required for merge, deploy, production DB writes and publishing. A successful API/model response never authorizes a release.

### Reality Stream V3 / system-intelligence integration — planning crosswalk only

**Planning source (not live authority):** `SOD1820_REALITY_STREAM_OS_MASTER_V3_20261016.md`, dated 16.10.2026, especially **§23 "מרכז הבקרה — חדר הפיקוד בתוך הקיים"** and **§29 "קדימות ההקשר, תאריך־כותרת, המד החכם המשותף, ארכיון קר ומהירות"**. The source is currently available as a user Library planning artifact, **not verified as a canonical repository or Supabase contract**. Resolve its latest full text and active owners before implementation; do not silently treat its DRAFT design, rankings or global meter position as approved for build. Its §29 explicitly requires a coherent whole-screen Home/Post/World/Number/Gallery/mobile preview and ZURIEL approval first.

**One system, different jobs:** Reality Stream / World / Posts / Number render existing governed entities, source occurrences, links and time for visitors; Raziel/Research OS may investigate and explain authorized evidence; **the private `/2029/control` is their operational/curation/quality oversight projection**. All consume the same canonical source, temporal, relationship, Truth and access owners. No second Reality Graph, Stream OS, intelligence engine, meter-scoring truth, task store, gallery store or admin site.

**Extend existing Control Plane Knowledge/Content links + Attention, not a parallel moderation console:**

- **Source-unit coverage:** show mapped/unmapped Posts, gallery images, videos/locators, source sections, corpus references, rights/access, and precise `source_ref` / locator / version; detect historical import dates masquerading as event time. Keep `event_at`, `source_update_at`, `source_published_at`, `ingested_at` and date precision/role separate. A date visible in a source's original top heading is source evidence; it is **not** automatically the event date.
- **Connection review:** candidate/approved links, direct (hop 1), mediated (hop 2 with visible intermediate node), distant (bounded hop 3+ on demand), `why_connected`, evidence, engine/method, independent sources vs duplicated/derived paths, and publication eligibility. The system can **propose**, never fabricate proof or silently promote a candidate to canonical/public.
- **Editorial review:** preserve external writer/source credit and authorized `פרשנות המערכת` as distinct, provenance-bearing, human-reviewed content. An AI-generated draft is not automatically a public system interpretation, published Post, Event or accepted fact.
- **Contextual stream + shared meter quality:** distinguish near/relevant approved connections from stale unrelated archive content, and distinguish source-update recency from occurrence recency. The planned common compact focus/navigation meter (Home/Post/World/Number/Gallery) is an **Experience projection** over canonical Research Context and links, not a replacement for the existing `convergence_meter`, editorial `quality` or manual Gold/Diamond curation. Its final weights, display placement and scoring remain DRAFT.
- **Learning + operational recommendations:** route missing-source, date-precision, relationship-provenance, performance, data-quality and reading-friction signals into existing owner-qualified `system_suggestions` / Attention / Trace / `notify_admin` and the existing evidence-learning loop: observe → detect → recommend → ZURIEL decide → bounded change → measure → keep/revert. For repeated `capacity_growth_guard`-style warnings, **group only when the same verified incident/dedupe identity warrants it**; retain every observation/history and do not turn repeated alarms into false independent incidents or silently delete them.

**Cost/performance contract:** deterministic and indexed read by default, **zero per-page model calls**; bounded one-time/compile-on-change extraction and candidate preparation, with human-governed promotion. Public first view returns a small authorized summary and roughly 3–5 explainable linked items without full graph/large gallery/post HTML; older archives, distant relation paths and detailed review load lazily/on demand. Source and permission-aware cache/invalidation, pagination, no N+1, no bulk `gallery_image_tree` traversal on first paint. Collect real cold/SPA mobile p75 LCP/CLS/INP, SQL p95, egress, cache, cost and exact provenance before claiming faster.

**Execution priority and ownership:** do not interrupt active G4/performance work. After stable isolated evidence, test a small set of canonical real-world cases (e.g., 45/source dates, 1237 source vs expression, Post 5119's multiple events, a verified historical direct link). Validate private/anonymous boundary and exact-return navigations. Then present the holistic visual draft before any shared meter/stream build. Reuse `reality_graph_law`, `reality_stream_law`, `cross_vs_convergence_criteria`, `research_gold_hints_law`, Truth/Publishing, `research_strategy_layer_law`, `system_suggestions_law`, Design V2 and the existing 2029 Attention/Evidence plans; **owners decide semantics, this Control Plane only observes and requests authorized actions**.

**Status:** CROSSWALK DOCUMENTED / STREAM EXPERIENCE STILL DRAFT. No schema migrations, content publication, runtime configuration, model spending, automatic agent wake, code changes or release are authorized by this paragraph. Keep this PR DRAFT/HOLD until separately reviewed.

### Acceptance checkpoints and non-goals

- One private UI at `/2029/control`, reuse current `Sod2029Shell`, data-access adapters and operational traces, preserve Legacy/2029 isolation.
- Verify genuine task progress by provider execution ID and exact PR/commit/preview refs. Distinguish `PLANNED`, `AUTHORIZED`, `EXECUTING`, `IMPLEMENTED`, `TESTED`, `PR_READY`, `MERGED`, `DEPLOYED`, `LIVE`, `VERIFIED`. Never substitute Issue-comment identity for an authenticated Work-session identity.
- No autonomous production action, no prompts as permission to edit arbitrary filesystem/DB, no new persistent agent hierarchy required for the user-facing experience.
- This amendment is **documentary direction only**. It is not an API key setup, runtime implementation, applied migration, merged change, release authorization or live feature. Carry out P1–P4 only in separate scoped, reviewed PRs and with the required permissions and cost approvals.

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
