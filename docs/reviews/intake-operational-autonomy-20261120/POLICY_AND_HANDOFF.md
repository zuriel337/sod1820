# SOD1820 #1457 — Site AI Operations + Control Plane Cost Attribution
**Owner decision, 20 Nov 2026 — REVIEW CANDIDATE / BRANCH ONLY**

## Decision that supersedes the earlier plan
The ₪50 spending ceiling is **CANCELLED**. There is no new spending quota, monetary hold/reservation, or automatic shutdown at ₪50. The owner wants AI to operate the site intelligently when genuinely essential, not run a costly full corpus study merely because more content arrives. AI cost should be *visible and attributable*, not arbitrarily capped.

This document supersedes the earlier ₪50-budget draft. Historical prior decisions remain in GitHub Issue #1457, but must NOT be implemented.

## The existing system and proper owner boundaries
Research Intake v14 captures canonical sourceRefs and native source evidence. Strategy v17/Raziel Routing v2 plans bounded research. System Suggestions v7 handles operational incidents. Truth Axes v3 owns epistemic state, verification, governance and publication. UI presentation is owned by the Design/Experience writer lane (Claude); GPT must not create a competing Control Plane visual design without adoption.

Cron 102 ingest remains active. Cron 128 periodic deep research remains inactive. Cron 132 media enrichment currently operates independently; its AI usage requires observability but not a new fixed ₪50 limit.

The **branch-only, pure** event classifier `src/lib/research/intakeOperationalPolicy2029.js` identifies routine intake, duplicates, verified repeated operational failures, security incidents and research tasks. It only identifies a candidate, never approves a paid provider call or Production write. The plan preview keeps standing owner authorization, source freshness, safe redaction, deterministic dedup, model/token/time bounds and no automatic mutation. It no longer does any 50-ILS quote/reservation.

## New cost visibility: what to show in Control Plane
One admin-only lazy cost section in the existing `ControlPlane2029Page.jsx` / `OperationalMetrics2029` experience. No static Shell/Frame import or extra public bundle.

**At-a-glance:** internally priced AI ledger total (₪); number of calls; unpriced calls; attribution coverage; exact reporting date range and update/read timestamp. Costs must be marked `ledger-priced`, `partial` or `unknown`; never `invoice` unless corroborated with the provider.

**Cohorts (one cost per call):**
1. **My account**: exact authenticated admin `auth.uid()` only, not everyone with `role=admin`.
2. **Other admins**: other verified `users.role=admin`.
3. **Verified paying customers**: only settled, verified successful payment or subscription for same user at time of call. An editable tier label or active pilot alone is insufficient.
4. **Registered users (payment unconfirmed)**: other verified user IDs.
5. **Anonymous visitors**: visitor token with no user ID; do not infer identity or purchaser from string.
6. **Verified system operations**: ONLY if positive server-owned trace/source evidence proves automated system initiator. Current historical sources cannot be assigned just because their name starts with `wa-` or `research-`.
7. **Unknown / unattributed**: every remaining cost. This is never included in My Account or quietly set to zero.

**Drill-down:** 1/7/30/90 days, daily trend, top source/channel, model/provider, token usage and cohort, missing provenance and gaps. For paying customers only add per-client cost vs. verified payment receipts if access and billing ownership are separately reviewed. Keep owner/visitor identity private by default; do not expose customer PII to nonadmins.

**Infrastructure costs:** Supabase Storage/Egress, Functions, Vercel and other vendors should use their own priced sources and freshness/certainty labels. Do not add observed Storage logs to provider invoices or double count cached egress.

**Relevant code:**
- `src/lib/research/intakeOperationalCostPreview2029.js`: pure offline cost cohort aggregation and unknown handling; there is **no limit/quota**.
- `src/lib/research/costCohortView2029.js`: dormant reader/normalizer for an admin-only RPC that does not yet exist live.
- `supabase/proposed/admin_ai_cost_cohorts_v1_REVIEW_ONLY.sql`: proposed read-only cohort summary from `ai_token_log` + `agent_token_costs` with exact admin identity checks, authoritative payment evidence and no PII in output; NOT APPLIED.
- `src/lib/research/intakeOperationalPlanPreview2029.js`: no-cost intent preview only; not provider invocation.
- `test/intake-operational-cost-2029.test.mjs`, `test/cost-cohort-view-2029.test.mjs`, `test/intake-operational-plan-preview-2029.test.mjs`, `test/intake-operational-policy-2029.test.mjs`: no-cost tests.

## Verified live baseline, read-only, Nov 2026
250 AI log records total, internal ledger priced sum **₪14.548** with zero unpriced in this period. 39 records with user_id, six visitor-only, 205 with neither. Of the 39 user IDs, 23 had `users.role='admin'` but originated from **two distinct admin accounts**, not necessarily only the owner. Priced breakdown by current data:
- Admin accounts together **₪0.8878** (needs exact viewer split).
- Other registered users **₪0.3205** (no observed verified-paying cohort in these calls).
- Visitor-only **₪0.2660**.
- Unattributed/unknown **₪13.0733**.
These figures describe AI ledger cost, not the full provider invoices, infrastructure fees, customer revenue, or profit. One active subscription pilot and settlement receipts exist in the database, but that does not mean its account generated AI calls in this period.

## Acceptance and Claude review gate
1. All cohort sums match internal ledger totals for same time window. Unknown/unpriced never silently vanish; source rows are deduped by token_log id.
2. Nonadmin RPC access denied; no source PII, user IDs, visitor tokens or payment details in response. Admin role and payment settlement checked against server-owned evidence, not client metadata.
3. On Control Plane, visible cards exactly distinguish my account, other admins, verified paying customers, registered, visitors, verified system operations, and UNKNOWN.
4. Prove source attribution coverage; never allocate ambiguous historical 205 calls to the owner by source-name guess. Future logging should capture server-proven initiating actor/tenant at call time in canonical trace/usage records (requires separate approved write).
5. Ensure counted costs do not double count `op_trace_spans` + `agent_token_costs`. Show Storage/Vercel/Supabase separately.
6. Backend reader is dormant; SQL proposed only. UI should be lazily loaded and reviewed by Claude as required by writer lanes, with genuine no-data / loading / stale/partial indicators, and exact user switching safety.
7. No SQL, PR merge, Edge, cron, production or feature-flag changes without separate exact approvals. Cron 128 remains OFF.
8. AI operational executor remains a future separate gate: fixed event classes, nonexpiring/expiring standing authorization as decided by owner, bounded token/time/calls, dedup, privacy and incident stop. There is **no monetary cap**.

**Current status: CODE + PROPOSED READ MODEL, not a working Control Plane card.** Explicitly do not claim Production has cost cohorts before the approved SQL and visual wiring are deployed.
