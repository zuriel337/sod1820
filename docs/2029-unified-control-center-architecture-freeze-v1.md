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
