# Life Journey private continuation — 2026-10-11

Actor: GPT. Task key: `LIFE_JOURNEY_2029_CHAIN_V1`.
Owner: existing Person v6, Research OS / Workspace, canonical engines and Experience.
Base: PR #1028, `0bc507047f18c000cc7ee38cc25f6919145e4aee`.
Branch: `gpt/life-journey-continuation-20261011`.
Verified main: `737ee9aa2df4aaa80dd95ea0fa3c4f2bcbc4f12a`.

This continues #1028's optional-family/five-engine/save-and-resume interface. The user explicitly requested GPT finish the interface and Claude review only at the end; live claim `ac01f80f-da3b-4fb8-be9a-45311dc1e98d` records that task-specific override. It does not change global visual ownership or authorize release.

## Finished interface

- Saved Life Journey paths have an owned, paginated list; selection uses the existing ResearchProvider resume function and recomputes current inputs.
- Optional self-name reflection uses the existing NameLab normalization/finding/reflection pipeline: fresh first-name-only research, explicit AI consent, then three symbolic cards. Separate loading, cancellation, empty, quota/error and success states. Results remain in component memory. No generic AI content logger, surname, birthdate, family, event content or owner reference is sent to AI.
- Personal event observations can be added, read and corrected. Date is optional; Gregorian and Hebrew representations use the existing date module. Corrections preserve earlier records. Stable request IDs prevent duplication after a committed response is lost. Revision conflicts require reopening the latest item.
- Event name/date analysis requires an explicit click, reloads the selected revision, and uses the existing canonical cross engine. Refresh cancels old analysis; results can only render under the matching revision. Event content does not go to AI.
- Existing family close/cancel/continue-self, five research routes and numeric continuation remain available. Context section navigation now includes events.

## Data boundary and migration

Prepared, NOT applied: `supabase/migrations/20261011214651_life_journey_private_continuation_v1.sql`.

Four narrow SECURITY DEFINER RPCs validate `auth.uid()` against the Person owner; execution is authenticated-only. No table, direct table grant, RLS alteration, canonical engine or AI edge-function change.

1. `fn_person_life_input_v1`: select latest exact owned Person observation before checking private/candidate eligibility; purpose-minimized fields. Reflection is self-only. All Life research entrypoints, including family comparisons, use this boundary instead of treating `fn_list_family` as analysis permission.
2. `fn_person_life_event_record_v1`: append private candidate observations to existing `research_objects`, user-declared subject role, immutable input snapshot, request idempotency, advisory transaction lock and expected revision. Governed records require the pre-existing governed successor path. No truth promotion/publication.
3. `fn_person_life_events_v1`: latest revision first, then private/candidate filter, bounded keyset pagination; never fall back to an earlier version after governance.
4. `fn_person_life_paths_v1`: owned path metadata and generic labels only; no raw saved subject content.

Event refs use `life_event:<owner>:<event>:<request>`, never `person:`: the existing family reader matches that namespace. These are personal **event observations**, not canonical Event identities, telemetry events or factual/causal claims. Analysis snapshots are local to the displayed result. The UI lists current observations (loaded pages sorted by occurrence date), not a complete revision-history browser.

## Verification

- 45 Node tests pass: Life runtime/continuity (17), existing journey and AI contract checks (6), existing NameLab findings/reflection (22).
- 8 isolated PostgreSQL/PGlite tests pass: anonymous/cross-owner denial, no direct table read, constants/minimization, hidden/approved Person denial with no old-record fallback, replay, changed-payload denial, immutable corrections, revision conflict, governance and bounded owned path pagination.
- Synthetic Chromium integration passes using actual components, mocked server/auth/provider boundaries and blocked external network: optional family, all five engines, private save/resume from latest and list, numeric roundtrip, partial failure, family retry/edit, AI consent/success/quota, event response-loss retry and correction, event analysis refresh cancellation, account exit, and 390px layout.
- Existing Research Path resumability acceptance passes; both production builds pass with existing bundler warnings; `git diff --check` passes.
- Independent local read-only specialist rechecked input privacy/status and stale-result fixes; no remaining blocker in that bounded review.

Reproduce focused checks:

```sh
node --test test/life-journey-research.test.mjs test/life-journey-continuity.test.mjs test/life-journey-2029-chain.test.mjs test/ai-analyze-name-lab-normalized-reflection.test.mjs src/lib/research/nameLabReflectionRuntime.test.js src/lib/research/nameLabFinding.test.js
PGLITE_MODULE=/path/to/pglite/dist/index.js node --test test/life-journey-continuity-sql.test.mjs
PLAYWRIGHT_MODULE=/path/to/playwright/index.mjs node test/life-journey-browser.mjs
npm run test:research-path-resume
npm run build
```

These fixtures do not prove deployed auth/JWT, production triggers/RLS, multi-session PostgreSQL concurrency, real AI provider availability or live browser writes. No production private data fixtures, paid AI call, product DB writes or live migration were used.

## Release choreography and review

Bundle with #1028. The new input RPC is a dependency of the entire Life engine flow: **apply and verify the migration before deploying this client**. Roll back the client first if necessary; additive RPCs can remain. After separately authorized release, validate an authenticated synthetic owner, own/foreign access denial, response-loss retry, saved-path resume, AI consent/quota, account exit and mobile display on the deployed build.

Claude receives the completed branch for READ_ONLY final review only. Exact head, PR, dispatch/result and CI are recorded in the task's live work log; delivery is not completion. No transfer of implementation to Claude.

State: IMPLEMENTED / TESTED / PR_READY. NOT MERGED / NOT LIVE. No shared Frame, ResearchProvider, advanced ELS lane, engine definitions or global law edits. Advanced ELS remains its separate active scope; family deletion/relationship editing, canonical Event identity and historical finding storage are outside this continuation.
