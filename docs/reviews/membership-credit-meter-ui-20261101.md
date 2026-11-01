# Membership Credit Meter UI — branch receipt

Status: BRANCH CANDIDATE · DEFAULT HIDDEN · NOT DEPLOYED

Task: `MEMBERSHIP_CREDIT_METER_UI_2029`

Branch: `gpt/2029-membership-credit-meter-ui-20261101`

Fast-meter base: `fbd3a3bf339486e0db09376eb797a8f7042a7ea9`

## Implemented boundary

The existing 2029 personal area now has a read-only projection for
`membership_credit_summary_v1`. It is entirely hidden behind
`VITE_MEMBERSHIP_CREDIT_METER_ENABLED=true`; while the flag is absent or false,
no membership RPC runs and the existing "גישה ומנוי · בהכנה" state remains.

For a signed-in owner the enabled meter can show:

- total available balance;
- included credits still valid;
- credits currently reserved for an operation;
- monthly allowance and used amount when an active cycle exists;
- the server-provided plan name, or an explicit statement that no active
  membership cycle exists.

It does not expose prices, Checkout, Cardcom, activation or purchase actions.

## Identity and data safety

- The RPC derives the owner from `auth.uid()`; no user id is sent to it.
- The client checks the authenticated account before and after the read and
  discards a response if the account changed in flight.
- Every numeric field must be a non-negative safe integer. Invalid or missing
  state is shown as unavailable, never as zero.
- The reader does not query membership tables directly and creates no new
  store.

## Refresh path

The already bounded server `credit_usage` receipt emits a local
`sod:credit-usage` event after validation. The personal-area meter listens only
for `raziel_fast` with `settled` or `returned`, then rereads the owner summary.
No balance is calculated or adjusted in the browser.

## Acceptance

- Membership meter contract + fast credit seam: 7/7 passed.
- Workspace/session focused regression: 25/25 passed.
- Combined membership engine, meter, Raziel session and Follow/activity focused
  regression: 32/32 passed.
- Existing My Workspace 2029 native-home contract: passed after narrowing its
  former placeholder-only assertion; it still forbids prices, Checkout,
  Cardcom, entitlement controls, publish/activate controls and commercial
  links in the meter section.
- `git diff --check`: passed.
- One Tree: 78/78 passed; `build:2029` passed with the repository's existing
  chunk/import warnings.
- `package:ai-analyze` passed from 16 committed sources with JWT verification
  enabled.

## Release boundary

No migration applied. No catalog row activated. No environment variable set.
No Edge, Preview or Production deployment. No Cardcom action. No charge. No
merge or push to `main`. Legacy remains unchanged.
