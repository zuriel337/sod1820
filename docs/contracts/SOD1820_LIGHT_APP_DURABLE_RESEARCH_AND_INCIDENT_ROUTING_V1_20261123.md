# SOD1820 — Light App, Durable Research & Incident Routing Contract v1
Date: 2026-11-23
Status: **PROPOSED ADDENDUM / draft PR. Not a new active Supabase law.**
Owner: existing Research OS / Auth / Traffic Intelligence / Reliability / system_suggestions owners.
Relation: `docs/research-os-canonical-lock-v1.md`, `research_workspace_law`, `live_state_sync_law`,
`canonical_ui_components_law`, `traffic_intelligence_law`, `system_suggestions_law`, Speed Law #1521.

## Invariants

1. **One truth per domain.** A signed-in user's explicitly saved research, ELS cipher/matrix, collection, Journey or pin belongs to the authorized canonical cloud store (e.g. `research_items`, `user_research`, `journey_saves`, `els_records`). No parallel saved database.
2. **Server receipt controls the success badge.** Button click, client mutation, queued operation and RPC request are not success. Only committed server confirmation makes the interface say "saved to your account". Failed/ambiguous RPC results must display failed/unknown, not assume success.
3. **Offline safety, never silent loss.** Until receipt, explicit writes may be held in a principal-isolated, bounded durable recovery queue. If persistence fails, show a failure; do not silently delete, overwrite or publish unsynced data. Guest-local data is not represented as cloud-backed.
4. **Local storage is not an unlimited database.** Passive history, view context and diagnostics must be bounded, replaceable and non-journaling during public reading. Existing unsynced explicit writes cannot be evicted to improve speed or free space. Storage cleanup is manual and restricted to demonstrably passive abandoned data.
5. **ELS matrix replay, not bitmap hoarding.** Preserve verified corpus ID/version, normalized term, canonical occurrence ID, start, skip, direction, bounded findings and selected coordinates, layout/window controls as needed. Derive grid cells and rendered pixels at reopen; never persist full thousands-cell grids, AI responses or screenshots by default. Reopening verifies the original occurrence and represents uncertain or stale replay without inventing correctness.
6. **Auth continuity is a separate acceptance gate.** A full localStorage cache must not silently turn a successful sign-in into an apparently durable session. Correctly distinguish durable/tab-only/memory-only and transient verification failures. Session expiry or sign-out is never classified as a cipher save failure.
7. **Healthy browsing has no diagnostic work.** No periodic browser poll, extra initial JS dependency, local log queue, model invocation, screenshot or new database for operational error sensing. Only bounded and classified failures may use the existing `events` → Reliability → `system_suggestions` path.
8. **Canonical owner identification.** Every detected class maps to existing contract owner + acceptance gate; unknown classes remain UNKNOWN and do not authorize fixes. A suggestion never grants permission to deploy, modify access, change law versions, delete personal data or run SQL.
9. **Privacy.** Diagnostic signals carry only a fixed outcome code, stage, normalized public route and existing bounded measurement identity. Never send email, saved term, matrix contents, token, free-form exception, query/hash, or draft text through automatic diagnostics.
10. **No performance regression hidden behind LCP.** Run load-budget, interaction, login→reload, save→receipt→reload, 100 passive opens, two-account isolation and offline recovery acceptance; compare same device/route/cohort. No raising performance budgets to pass.

## Incident classification / owner decisions

| Signal | Existing owner | Gate | Meaning |
|---|---|---|---|
| `save_started` → `save_confirmed` / `save_failed` | Research OS / ELS | Research Sync Acceptance + real ELS RPC receipt | Explicit save only |
| `auth_failed` | Public Auth | Auth browser + Live Contracts | Classified storage/refresh/network |
| `load_failed` | Foundation / Release | Isolation + Visual | Render/chunk loading |
| `runtime_error` | Reliability / system_suggestions | G3 Reliability | Bounded runtime errors |
| `web_vital` | Traffic Intelligence | Observability / Speed Law #1521 | Measured field performance |
| `issue_report` | Canonical UI components | Issue Report | Explicit user-submitted report |
| Unknown | **unclassified** | Evidence required | Must not infer a responsible law |

## Critical release checks (expected outcome)

- 100 public-reading visits yield no new passive `pending` journals.
- Successful ELS save gets an authorized RPC receipt and the same cipher reopens after a cold reload and on another device.
- Failed/ambiguous ELS save does not show confirmed cloud success.
- Two signed-in accounts never mix research, pending operations or ELS private ciphers; anonymous reader cannot see private cipher content.
- Full/blocked storage and session-refresh errors retain visible diagnostics without stealing auth credentials.
- Failure reporting sends **no** request on healthy navigation; under repeated failures, rate and dedup caps apply; missing telemetry = UNKNOWN.
- CI must execute focused event transport, body validation, Auth, Research and ELS tests, and a build budget gate. A draft is not a shipped fix.

## Current rollout evidence and explicitly open gaps (23 Nov)

- #1513 and #1520 restored safe personal-save recovery and prevented new stranded passive research journals; old device caches still require explicit reclaim.
- #1492's ELS save UI is in production. The proposed `save_els_matrix` SQL is **not applied** at the live DB: public community saves still follow the old pending/private admission. This requires independent SQL and RLS/security approval, not a UI switch.
- Centralized `app_health` browser events are staged in this draft; the live `fn_reliability_watch` currently recognizes only `runtime_error` and `issue_report` classes. An additive, reviewed detector change and an authenticated real-device save test remain open. Do not claim auto-alerts for `app_health` until that server acceptance is completed.
- #1521 has separate active writers for proactive speed/behavior gates; reconcile by changed file ownership before merge.
