# SOD1820 2029 — Membership, Credits & Cardcom Product Contract V1

**Status:** INTERNAL DRAFT · 2029 ONLY · NOT A PUBLIC OFFER · NOT IMPLEMENTED
**Date:** 2026-10-25
**Owner:** ZURIEL / Human Gate
**Scope:** the 2029 product runtime only. Legacy pages, labels and access behavior are not product truth for this contract.
**Activation:** No active membership product exists.
**Authorization:** This draft authorizes no migration, Cardcom action or configuration, Checkout, charge, live DB/RLS change, deployment or publication.
**Pricing:** ₪30 monthly and ₪300 annually are working hypotheses and are not approved for publication.

## 1. Why this document exists

This is the single internal source of truth for the first paid product in SOD1820 2029. It connects:

- the value a member receives;
- Free / Registered / Membership / Credits allocation;
- monthly and annual billing;
- Cardcom recurring payments;
- Supabase subscription and entitlement state;
- Raziel and expensive-operation metering;
- referral rewards after a verified membership payment;
- cancellation, payment failure, refund and reconciliation behavior.

Nothing in this document is public pricing or a promise until ZURIEL approves the final offer and the G5 Money / Entitlement gate passes.

## 2. Product principles

1. **Few choices.** Launch with one paid membership, offered monthly or annually. Do not create many overlapping packages.
2. **Membership buys continuity and depth.** Credits meter variable-cost actions; they do not replace the membership.
3. **Deterministic work should stay cheap.** Gematria calculations, cached content and client-side spatial rendering should not consume AI credits merely because they appear inside a premium surface.
4. **One identity and one research tree.** Paid access changes authorized depth, not truth quality and not the identity of a Number, Post, Book, ELS finding or Research object.
5. **Server-owned economics.** The browser never chooses price, allowance, entitlement, credit quantity or renewal status.
6. **Verified payment before access.** Redirect success is not payment proof. Only a verified Cardcom result/webhook may activate or extend membership.
7. **No silent divergence.** Cardcom, subscription state, entitlement state and the credit ledger must be reconcilable and idempotent.

## 3. Recommended launch offer

### 3.1 Free / Registered

Purpose: let a person discover the system, understand its value and build a first research context.

Candidate allocation:

- public Posts, Topics, Numbers and approved sources;
- core deterministic gematria;
- bounded ELS introduction/search;
- a limited Raziel text allowance;
- saved identity and a small personal workspace after registration;
- visible examples of Life Journey, Books and Heichal depth without pretending locked content is available.

Exact limits are intentionally deferred to the Public Beta evidence window.

### 3.2 One paid membership

Working name: **SOD1820 Membership / בני ההיכל 2029**. Final Hebrew name requires ZURIEL approval.

The same plan has two billing choices:

| Billing choice | Working price | Product rule |
|---|---:|---|
| Monthly | ₪30 per month | renews monthly until cancelled |
| Annual | ₪300 per year | one annual renewal; equivalent to two months free |

These prices are **working candidates**, not approved public pricing. Validate them against at least two full weekly Public Beta cycles and real cost-per-use evidence.

Candidate member value:

- full member content published for 2029;
- expanded Bible Code / ELS workspace and saved matrices;
- Life Journey depth and continuity;
- Books and guided research paths;
- Heichal research workspace and richer approved research context;
- personal saves, journeys, resume and private workspace features where implemented;
- a recurring monthly credit allowance for Raziel and variable-cost actions;
- member pricing for additional credit packs;
- early access to approved 2029 capabilities.

### 3.3 Credits

Credits are a single usage currency across 2029. Do not introduce separate “research points”, “tokens” and “Raziel coins” in customer-facing language.

Proposed policy:

| Operation family | Membership relation | Credit policy candidate |
|---|---|---|
| deterministic gematria / cached public reading | available by access tier | no AI credit charge |
| deterministic ELS engine work | bounded by abuse/compute policy | free or low fixed charge only if server cost justifies it |
| Raziel standard text | member allowance + credits | metered |
| deep research / multiple tools | member access + higher credits | metered by bounded operation, not raw provider tokens shown to user |
| voice session / transcription | entitled capability + credits | metered by bounded time blocks |
| generated audio/media | entitled capability + credits | metered; cache reusable output where appropriate |
| client-side 3D/spatial | access tier only | no AI credit charge unless it explicitly invokes server AI |

The user sees understandable operation prices and remaining credits. Raw model tokens remain an internal cost/observability metric.

### 3.4 Bible Code-only plan

Do **not** launch a separate Bible Code-only subscription in V1. It adds choice and entitlement complexity before demand is known. Keep it as an experiment candidate after Public Beta if ELS users show strong standalone demand and low cross-use of the broader membership.

## 4. 2029 capability allocation draft

The following is a product hypothesis, not an implemented gate:

| 2029 surface/capability | Free/Registered candidate | Member candidate | Credits |
|---|---|---|---|
| Home / Posts / Topics / public Numbers | broad public access | same identity with richer approved depth | no |
| Gematria | core deterministic methods | advanced views, continuity and richer research tools | expensive AI only |
| Bible Code / ELS | bounded discovery | expanded searches, saves, comparisons and journeys | only cost-bearing runs if needed |
| Life Journey | entry experience / sample | full continuity and deeper approved modules | Raziel/media actions only |
| Books | public excerpts/approved reading | guided paths and deeper member material | generated briefs/media only |
| World | public discovery graph | richer authorized projections and personal continuity | deep synthesis only |
| Heichal | guided introduction | full member research workspace | deep/agentic operations |
| Researcher/profile/community | public identity and approved work | personal workspace and member utilities | normally no |
| Raziel text | small bounded allowance | recurring allowance | yes after allowance |
| Raziel voice / media / proactive research | preview or unavailable | entitled when ready | yes |

An entitlement can expose more authorized depth. It must never imply that paid output is “truer”.

## 5. Recommended Cardcom recurring-payment model

### Decision

Use **Cardcom-managed recurring orders** for V1, while Supabase remains the source of truth for SOD1820 subscription state and entitlements.

Why this fits V1:

- only one membership with monthly/annual intervals;
- Cardcom schedules recurring charges and can produce documents;
- Cardcom reports the recurring-order state and every actual debit by webhook;
- SOD1820 does not need to run its own monthly token-charging scheduler;
- the system still owns authorization, grace periods, referrals and customer-visible status.

Cardcom also documents a token + server-initiated charge model as a more flexible alternative. Do not use both models for the same subscription. Reconsider token-managed billing only when SOD1820 needs complex proration, usage billing, many plan changes or provider portability.

### 5.1 Signup sequence

1. The authenticated user selects the canonical monthly or annual plan.
2. The server loads plan price, interval and allowance from its own catalog.
3. The server creates a Cardcom Low Profile payment page for the **first charge**.
4. Cardcom hosts card entry; SOD1820 never receives or stores the card number/CVV.
5. Cardcom webhook arrives and the server independently verifies the payment result.
6. After a verified successful first charge, the server creates a Cardcom recurring order using the successful `LowProfileDealGuid`.
7. `NextDateToBill` is the next month or next year. It must not charge the first period twice.
8. The server stores only provider references such as Cardcom `AccountId`, `RecurringId`, Low Profile ID and transaction IDs.
9. Supabase activates the subscription and derives the member entitlement for the paid period.
10. If the signup came through a valid referral, the verified subscription-payment event is passed once to the referral processor.

### 5.2 Monthly and annual Cardcom configuration

| Field | Monthly | Annual |
|---|---|---|
| Cardcom interval | configured monthly `TimeIntervalId` | configured annual `TimeIntervalId` |
| first charge | Low Profile checkout now | Low Profile checkout now |
| next debit | one month later | one year later |
| recurring count | ongoing membership (`99999`/provider-approved no-end value) | ongoing annual renewal |
| amount | canonical monthly price | canonical annual price |
| currency | ILS | ILS |
| `ReturnValue` | opaque internal subscription reference | opaque internal subscription reference |

Do not assume an interval ID in code. Read the IDs configured for this Cardcom account and store them in server-only configuration.

### 5.3 Cardcom interfaces confirmed by current official documentation

- Recurring-order creation/update: Cardcom `RecurringPayment.aspx`, production requests by `POST`, using a successful Low Profile deal or a token.
- Recurring-order read: API v11 `RecuringPayments/GetRecurringPayment`.
- Recurring history/reconciliation: API v11 `RecuringPayments/GetRecurringPaymentHistory`.
- Recurring webhook types:
  - `MasterRecurring` for recurring-order creation/status changes;
  - `DetailRecurring` for an actual debit/status change.
- Cardcom explicitly requires duplicate webhook handling; `InternalDealNumber` is an available debit identity.
- Cardcom supports a shared webhook secret and retries failed reports.

Official references:

- https://support.cardcom.solutions/hc/he/articles/360008695513
- https://support.cardcom.solutions/hc/he/articles/360017105139
- https://cardcomapi.zendesk.com/hc/he/articles/25405486094226
- https://cardcomapi.zendesk.com/hc/he/articles/25407418754450

Before implementation, Cardcom support must confirm that the merchant account has:

- the recurring-payments module enabled;
- an API username/password authorized for the required interfaces;
- a terminal configured for recurring debit and the relevant acquirer/Shva settings;
- monthly and annual interval IDs;
- the correct document type and VAT treatment;
- recurring webhooks set to API Level 11 JSON if available for this account;
- a test environment/user and the required production endpoint behavior.

## 6. Subscription state model

Canonical states:

- `checkout_pending`
- `active`
- `past_due`
- `grace`
- `cancel_at_period_end`
- `cancelled`
- `expired`
- `refunded`

Rules:

- first verified payment activates access;
- every verified successful renewal extends `current_period_end` exactly once;
- a failed debit enters `past_due`/`grace`, never silently extends access;
- proposed V1 grace period: 3 days, pending ZURIEL approval and Cardcom retry configuration;
- cancellation stops future Cardcom debits but normally preserves access through the paid period;
- a refund/chargeback follows an explicit reviewed policy and produces an auditable entitlement transition;
- redirect URLs only display progress; they never decide subscription state.

## 7. Supabase ownership model — design only

This section is a schema plan. No live migration is authorized by this document.

Suggested canonical records:

- `membership_plans`: server-owned product catalog and versioned price/allowance;
- `subscriptions`: one current subscription identity per account, provider references and lifecycle state;
- `subscription_payment_events`: immutable/idempotent provider debit events;
- `entitlements`: derived authorized capabilities and effective dates;
- existing `credit_ledger`: all credit grants/spends with reason and source event;
- referral reward records: created only from a verified subscription payment event.

Minimum identifiers:

- internal subscription UUID;
- user UUID;
- immutable plan/version identifier;
- billing cycle;
- Cardcom `AccountId` and `RecurringId`;
- Low Profile/provider reference;
- exact Cardcom transaction/internal-deal ID stored as text-safe identity;
- current period start/end;
- cancellation/effective dates;
- last verified event and reconciliation timestamps.

Client-visible reads must be owner-scoped. Provider secrets, payment payloads and privileged transition functions remain server-only. A paid tier in editable user metadata is never authorization proof.

## 8. Webhook and reconciliation contract

1. Authenticate the configured Cardcom secret and expected payload shape.
2. Persist the raw event only in a bounded, access-controlled audit form.
3. Deduplicate by provider event/debit identity before any grant.
4. Map `ReturnValue` to the internal subscription without trusting client-supplied user IDs.
5. Update payment event, subscription and entitlement atomically or through a retry-safe state transition.
6. Grant recurring credits and referral rewards from the verified event once.
7. Return Cardcom's expected plain success response promptly.
8. Run a daily reconciliation job against Cardcom recurring info/history.
9. Alert on provider success without entitlement, entitlement without provider success, repeated webhook failure, unknown recurring IDs and duplicate/replayed events.

## 9. Cancellation, failed payments and refunds

### User cancellation

- user requests cancellation in My Workspace;
- server disables the Cardcom recurring order;
- subscription becomes `cancel_at_period_end`;
- access remains until `current_period_end` unless a legally required or explicitly approved immediate cancellation applies;
- UI shows the exact end date and a reactivation path.

### Failed renewal

- record the failed attempt and Cardcom response;
- show `past_due` with a clear update-payment action;
- allow only the approved grace period;
- never grant monthly credits or referral commission for a failed debit;
- after grace/retry exhaustion, expire the entitlement while preserving personal data according to policy.

### Refund / chargeback

- do not delete payment history;
- create a reversing financial/credit event where policy requires it;
- mark related referral rewards void if still pending, or create an auditable recovery balance if already redeemed;
- require Human-Gated review for exceptional overrides.

## 10. Referral integration in 2029

Referral attribution and economics are a separate capability projected inside the 2029 personal workspace.

Working economics from the existing draft:

- invited member: 20 credits after the first verified membership payment;
- inviter: ₪15 membership credit for a monthly conversion or ₪50 for an annual conversion;
- 30-day availability delay;
- approved affiliate candidate after three paid referrals;
- affiliate working rate: 20% of verified net subscription payments for up to 12 months.

These are still draft policy. The 2029 UI must explain eligibility, cancellation/refund behavior, redemption, self-referral prevention, cross-device attribution and whether membership credit has an expiry.

## 11. Required customer-facing documents after approval

Generate only after the offer and implementation are approved:

1. **What the 2029 membership includes** — a short comparison of Free vs Member.
2. **Pricing, credits and common questions** — monthly/annual renewal, credit use, cancellation and failed payments.
3. **Referral and affiliate terms** — qualification, 30-day hold, redemption and abuse rules.

Do not publish internal provider mechanics, raw token costs, Cardcom identifiers or operational security details.

## 12. Delivery gates

### Gate A — product decision

- approve name;
- approve monthly/annual prices;
- approve included monthly credits;
- approve exact capability allocation;
- approve grace/refund/cancellation policy;
- approve referral economics.

### Gate B — Cardcom account confirmation

- recurring module and terminal enabled;
- API credentials/permissions confirmed;
- monthly/annual intervals configured;
- document/VAT rules confirmed;
- recurring webhook and secret configured;
- real test plan agreed with Cardcom support.

### Gate C — implementation

- canonical plan catalog;
- subscription/payment/entitlement state model;
- Cardcom checkout + recurring creation;
- webhook + reconciliation;
- 2029 My Workspace subscription UI;
- server-side capability gates before expensive IO;
- credits/referrals integration.

### Gate D — verification

- monthly real low-value test and cancellation;
- annual test or Cardcom-approved accelerated interval test;
- duplicate/out-of-order webhook tests;
- failed debit and retry tests;
- refund/chargeback simulation;
- reconciliation and alert tests;
- access removed/retained exactly according to period state;
- no cross-account access, price manipulation or double grant.

### Gate E — controlled launch

- internal/admin cohort;
- small invited cohort;
- observe cost, successful renewal, failure and support signals;
- approve public wording and only then publish the offer.

## 13. Open Human-Gate decisions

- [ ] Final membership name.
- [ ] Approve or change ₪30 monthly / ₪300 annual working prices.
- [ ] Included monthly credit allowance.
- [ ] Exact Free vs Member limits for ELS, Life Journey, Heichal and Raziel.
- [ ] Whether annual members receive all credits upfront or monthly; monthly release is safer for cost and refunds.
- [ ] Grace period after failed renewal.
- [ ] Refund policy and effect on already-used credits.
- [ ] Expiry and redemption mechanics for referral ILS credit.
- [ ] Whether/when to test a Bible Code-only plan after Public Beta.
- [ ] Business/document type and VAT settings in Cardcom.
