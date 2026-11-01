# Raziel 2029 Golden Premium Readiness — branch receipt

Status: BRANCH READY FOR REVIEW · NOT DEPLOYED · NO LIVE BILLING

Task: `RAZIEL_2029_GOLDEN_PREMIUM_READINESS`

Base implementation: `d0d96a760cdca222c4a206d1e8aaa70b42d7a0ae`

Branch: `gpt/2029-raziel-golden-premium-readiness-20261101`

## Verified runtime position

The canonical Supabase project currently serves `ai-analyze` version 91 with JWT verification. Its deployed source contains personal research continuation, current-content reads, Number context, tool research, coordination, the explicit personal-area companion and ELS matrix reading. The live database also contains the applied Raziel Phase A/C/D2/E/F/G/H/K/L migrations.

The deployed function does not contain the new bounded reads from `notification_prefs`, `subscribe_events` and `user_activity`. Those reads remain in the branch implementation above. The remote product branch and `origin/main` do not yet contain that commit.

## Golden operation matrix

| Customer operation | Execution state | Cost evidence | Premium readiness |
| --- | --- | --- | --- |
| deterministic calculation / exact cached result | verified zero-model path | no provider cost | ready to remain free; no credit debit |
| Raziel fast | explicit-submit L2 path with quota and operational trace | provider usage/cost observability exists | execution ready; credit reserve/settle is not connected |
| Raziel deep | explicit depth L3 path, one governed higher-intelligence attempt | provider usage/cost observability exists | execution ready; fixed customer price remains a draft |
| deep ELS matrix reading | explicit admin-gated job route, replay and cost reporting | measured job cost evidence exists | not customer-ready until entitlement, hard budget and reserve/return are connected |

Candidate customer prices remain internal hypotheses only: deterministic 0, fast 15, deep 60 and deep matrix 500 credits. This receipt does not approve or publish them.

## Personal Follow/activity boundary

`personal_continue` now composes explicit Follow separately from recent post activity. It retains source, time and `measured`, `measured_empty`, `missing`, `access_filtered` and `failed` states. Activity is not converted into Follow, inferred interest, recommendation, score or audience membership. A 401 during any owner read fails the whole personal continuation closed and discards partial data.

The owner GETs are exactly:

- `notification_prefs(topics, updated_at)` — one row, up to 20 topics;
- `subscribe_events(topic, source, action, created_at)` — up to 100 recent rows;
- `user_activity(kind, ref, title, created_at)` — up to 12 posts in 30 days.

Every request uses the verified caller JWT, an explicit verified-UID filter and existing owner RLS. No service credential, write, automatic opt-in or new audience store is involved.

## Acceptance

- Broad Raziel Phase A–M, personal companion, Follow/activity, content-comparison, quota/trace, numeric-truth, navigation and ELS matrix-route selection: 263/263 passed.
- 2029 One Tree prebuild contract: 78/78 passed.
- `npm run build:2029`: passed with the repository's existing chunk-size and mixed dynamic/static import warnings.
- The first build attempt used an incomplete shared dependency directory and failed on missing declared packages. A clean local `npm ci` from the committed lockfile resolved the environment; no source or lockfile changed.
- No paid model call, live user mutation, Follow change, credit debit or payment was used.

## Exact blockers before a paid pilot

1. The branch candidate is not integrated or deployed; the live function remains version 91.
2. Live Supabase has no `membership_plans`, `credit_action_prices`, `membership_credit_cycles`, `credit_reservations` or `credit_reserve_v1` foundation.
3. No server-side credit reservation runs before provider I/O, and no settle/return operation is connected to Raziel or matrix completion.
4. The customer UI has no membership-cycle meter, reserved balance or fixed-price confirmation.
5. Real signed-in acceptance for Follow/activity, account switch, revocation and stale-response discard still requires a deliberately released candidate runtime.
6. Prices, plan allowances, grace/refund rules and exact Free/Member allocation remain Human-Gate decisions; none is a public offer.

## Safe release order

1. Preserve the current deployed version-91 source as the rollback artifact.
2. Reconcile this single commit onto the latest approved 2029 integration head without importing old feature branches wholesale.
3. Package `ai-analyze` from committed sources and compare its manifest with the rollback artifact.
4. Run protected signed-in acceptance for account A, account B, logout/revocation, empty and missing states. Do not create Follow/activity records merely for observation.
5. Only after that acceptance, integrate the inactive membership/credit foundation on a branch and test it in a disposable PostgreSQL environment.
6. Connect reserve/settle/return one operation family at a time, beginning with Raziel fast; do not activate or publish plans during foundation work.

## Release boundary

No migration applied. No DB/RLS/grant change. No Edge, Preview or Production deployment. No Cardcom action. No charge. No merge or push to `main`.
