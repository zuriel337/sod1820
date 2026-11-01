# Raziel Fast Credit Meter — branch receipt

Status: BRANCH CANDIDATE · DEFAULT OFF · NOT DEPLOYED

Task: `RAZIEL_FAST_CREDIT_METER_2029`

Branch: `gpt/2029-raziel-fast-credit-meter-20261101`

Foundation base: `c4abd685c62b77676d15dd4d867d7e40c61011d4`

## Implemented boundary

This branch connects the first operation family, `raziel_fast`, to the inactive
membership credit engine. The seam is deliberately narrow:

- canonical 2029 research contract only;
- authenticated ordinary member only (not guest or admin);
- fast, general-view synthesis only;
- no Legacy, WhatsApp, deterministic answer, semantic classifier, personal
  companion, matrix, special view or deep request;
- `RAZIEL_CREDIT_METER_ENABLED=on` is required in addition to an active server
  action catalog row. Both remain off by default.

The browser never submits a price. It supplies the existing interaction UUID;
the server derives `raziel-fast:<uuid>` and the database resolves the fixed
cost from `credit_action_prices`.

## Charge lifecycle

1. Existing availability, identity, plan and quota paths run first.
2. Every deterministic exit remains free.
3. Immediately before provider I/O, the caller JWT reserves `raziel_fast`.
4. A validated accepted output settles the reservation.
5. Provider degradation, numeric-truth rejection or an unhandled request
   failure returns the reservation.
6. If settlement cannot be confirmed, the result is not delivered and a
   best-effort return runs; the expiry sweeper remains the final safety net.

An already-seen operation reference is refused before provider I/O. The branch
does not pretend it can replay a prior answer because no durable result store
exists yet.

## Bounded client receipt

The Edge response may add only:

```json
{
  "credit_usage": {
    "action_key": "raziel_fast",
    "cost": 15,
    "status": "settled"
  }
}
```

`cost` is the database result, not a browser value. The client projection
accepts only `raziel_fast`, a positive bounded integer and `settled` or
`returned`. A model-authored nested lookalike is stripped. The visible account
meter is not implemented in this branch; this receipt is its trusted input.

## Acceptance

- Credit seam contract: 4/4 passed.
- Raziel session, transport provenance and personal Follow/activity focused
  regression: 26/26 passed.
- Broad integrated Raziel Phase A–M, matrix route, personal, comparison,
  numeric-truth, navigation, quota/trace and credit seam regression: 250/250
  passed.
- Membership engine static contract: 3/3 passed; disposable PostgreSQL SQL
  acceptance passed again.
- One Tree: 78/78 passed; `build:2029` passed with the repository's existing
  chunk/import warnings.
- `package:ai-analyze` passed from 16 committed sources with JWT verification
  enabled.
- `git diff --check`: passed.

## Remaining candidate work

1. Exercise reserve, accepted settle, provider failure return, insufficient
   balance and operation replay against a disposable/candidate runtime with
   the migration applied and only `raziel_fast` active.
2. Add the visible account credit meter and refresh it from
   `membership_credit_summary_v1` after the bounded receipt.
3. Do not activate the environment switch or action catalog until signed-in
   candidate acceptance and rollback evidence are complete.

## Release boundary

No migration applied. No catalog row activated. No environment variable set.
No Edge, Preview or Production deployment. No Cardcom action. No charge. No
merge or push to `main`. Legacy remains unchanged.
