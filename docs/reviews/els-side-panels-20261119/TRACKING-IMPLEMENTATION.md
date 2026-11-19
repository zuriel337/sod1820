# ELS measurement extension — branch implementation, 19 November 2026

Actor: GPT (Codex); recipient: ZURIEL. Owner: traffic_intelligence_law v11.
Task: ELS_ACTION_MEASUREMENT_20261119. Branch: ccr-06bc2910-pgarr4, PR #1426.
Base: UI corrections c5dcafc2f01e31321d50271df886fd6a5251606f, merged origin/main d550d0fc3ad85265b140435df35d215ceeebc80e via 54d17e1f7.

## Implemented

The existing captureMeasurement / measurementBody / sendMeasurement -> ingest_event pipeline remains the only collector. Page entry/engagement stays with App2029. No new store, queue, retry, global frame import, provider call or polling loop.

- Native surface capture observes button/link/summary activation and select/checkbox/radio/range changes, including the shared fullscreen tree. Page capture covers outer controls and suppresses nested native duplicates.
- UI fields: bounded region, control type/index, gesture, mode, corpus scope. Four tool buttons have stable semantic names (discovery/findings/results/research). Other controls currently have structural indices, not durable semantic identities across layout changes. No input values, DOM text, link URLs, matrix letters or cell coordinates are collected. Typed keystrokes, drag paths and every scroll tick are intentionally not collected.
- Operation start/phase/finish: native search, load, findings, source lens, save; local Discovery; background term research; existing Fable transport. Every run has a random operation ID and captures measurement credentials/session and mode/scope once. No raw occurrence coordinates or expressions are added to analytics.
- Repeated terminal responses are deduplicated. Cancellation request is distinct from confirmed cancellation; detached tracking, partial coverage and errors are distinct outcomes. Background cancellation means local tracking stopped, not a claim that the server killed computation. Fable cancellation is confirmed only by the existing provider response.
- Optional measurement/storage failures cannot prevent interaction. No automatic AI invocation. Unit/provider answers and browser ingest endpoints are synthetic in tests.

## Server proposal — NOT APPLIED

`supabase/proposed/20261119190000_els_action_telemetry_PROPOSAL.sql` extends only the existing ELS allowlist in ingest_event. It checks the inspected function definition hash and refuses drift, including unrelated drift after an earlier application. A guarded rollback is adjacent. The client and generated worker schema are tested against the proposed schema. Release preparation validated application, repeat application, refusal of drift and exact rollback in disposable local PostgreSQL using the read-only live function definition (MD5 `897f442aaa8f75a2f1f2dd332ad92c0a`). All 22 SQL regression tests passed, including closed fields/events, unchanged other families, permissions and invalid input rejection. No remote SQL was executed to modify anything.

The new events are not live-ready until the server allowlist is explicitly approved and applied. A branch build is not proof of ingestion. Live aggregate readback remains blocked by the previously observed permission denial on fn_ti_surface_activity; no raw visitor/event rows were read as a workaround.

## Coverage limits

This is not 100% of all people/clicks. The existing 60 actions/window/10 minute budget is unchanged and can drop events in a busy matrix session, including lifecycle endings. Network failure, browser blocking, auth readiness and page termination can also lose sends. No durable delivery/retry is introduced. Public host/bot gates remain; UI components with admin context exclude admin interactions. Transport-only adapters depend on the canonical server's account handling and do not independently resolve administrator status. Preview does not count as production traffic.

The operation context supports analytics correlation, not reconstruction of a matrix: research replay/snapshots remain their existing separate responsibility. No analytics claim that matrix A's exact viewport can be rebuilt from these events.

## Validation

Release preparation adds `test/els-action-telemetry-sql.test.mjs` to the security SQL CI job and keeps the live application as a separate approval. The current SQL proposal SHA-256 is `1000055220d89e89dae2b55692934b6fdd4a27384506bffa66fd42149cf872d6`; rollback SHA-256 is `a9ef6a7ca28914d6e83b45cc40aad852235401863197e06f9b7b92ccb4154b93`. The original implementation checks below are historical; see `RELEASE-READINESS.md` for preparation evidence and production prerequisites.

- 65 local unit/contract tests pass: measurement identity and transport, page deduplication, worker admission/budget, ELS lifecycle, background research and Fable transport. Includes late-response origin context, failures, partial/cancel outcomes and storage failures.
- Browser tests exercise the real native tools and engine, with synthetic identity and mocked ingest endpoint. Production-host admission is bypassed only in the fixture; this is not a live server receipt test.
- npm run build passes; shell budget passes without baseline changes (eager JS +610 bytes, frame JS +792, frame CSS +464 relative to the existing baseline).

No main merge, deployment, flags/secrets, SQL application, live AI calls, engine-limit changes or new Preview were performed. Completion state: implemented locally; server rollout and live readback still pending explicit authorization/access. Report final commit and browser results in PR and user handoff.
