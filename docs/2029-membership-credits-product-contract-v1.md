# SOD1820 2029 — Membership, Credits & Cardcom Product Contract V1

**Status:** INTERNAL DRAFT · 2029 ONLY · NOT A PUBLIC OFFER · PARTIALLY PROVEN BY ADMIN PILOT
**Date:** 2026-10-31
**Owner:** ZURIEL / Human Gate
**Scope:** the 2029 product runtime only. Legacy pages, labels and access behavior are not product truth for this contract.
**Activation:** No public membership product exists. A limited admin-only ₪4 monthly pilot proved first charge, encrypted-token storage, server-initiated renewal, cancellation-at-period-end and isolated failure handling. It is not the launch product or public offer.
**Authorization:** This draft records the proven pilot and product recommendations. It authorizes no additional migration, Cardcom action or configuration, Checkout, charge, live DB/RLS change, deployment or publication.
**Pricing:** ₪30/₪300 for SOD אישי and ₪79/₪790 for SOD מחקר are working hypotheses and are not approved for publication.

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

1. **Few choices.** Launch with no more than two paid membership levels, each offered monthly or annually. Do not create many overlapping packages.
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

### 3.2 Two paid membership levels

Selected umbrella name: **מנויי SOD1820**. The two selected working level names are **SOD אישי** and **SOD מחקר**. “בני ההיכל” is not a membership-plan name in this contract.

Keep one content membership and offer two usage levels:

| Working level | Monthly | Annual | Monthly credits | Product role |
|---|---:|---:|---:|---|
| SOD אישי | ₪30 | ₪300 | 600 | affordable access to all member content plus regular Raziel and research use |
| SOD מחקר | ₪79 | ₪790 | 3,000 | the same member content with substantially more capacity for Raziel, Life Journey and Bible Code research |

Both levels renew monthly or annually until cancelled. The annual price is equivalent to two months free. These prices are **working candidates**, not approved public pricing. Validate them against at least two full weekly Public Beta cycles and real cost-per-use evidence.

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

The two levels share the same member-content entitlement. SOD מחקר sells greater usage capacity, not a claim to better truth and not an artificial lock on member articles. Recommended V1 allowance presentation:

- SOD אישי: **600 credits every membership month**;
- SOD מחקר: **3,000 credits every membership month**.

Monthly subscribers receive the applicable allowance after each verified renewal. Annual subscribers receive the same applicable allowance monthly throughout the paid annual period. Membership is sold for its content, continuity and tools as well as the allowance; credits are not advertised as a cash equivalent.

At the proposed operation prices, 3,000 credits can fund approximately 200 Raziel-fast answers, 50 Raziel-deep answers or 6 deep Bible Code matrix readings. If the full allowance were consumed entirely by one of those categories, current evidence indicates provider cost of roughly ₪30.88 at fast P90, ₪31.64 at deep P90 or ₪31.26 at the recorded matrix-reading exposure ceiling. That leaves about ₪47 before VAT treatment, Cardcom, shared infrastructure, failed runs, support and content costs at a ₪79 sticker price. This is sufficient for a controlled pilot, not evidence for unlimited use.

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

#### Raziel and variable-cost pricing calibration

The launch meter must price a bounded customer action, not raw provider tokens. A user should never need to know which model ran, how many tokens it used or whether a truth retry occurred. Those details remain internal evidence for setting and reviewing the fixed credit price.

Measured end-to-end Raziel evidence from production observability between 2026-10-22 and 2026-10-31:

| Customer interaction | Sample | Average recorded provider cost | P90 | Recorded maximum |
|---|---:|---:|---:|---:|
| Raziel site — fast | 124 | ₪0.0755 | ₪0.1544 | ₪0.3096 |
| Raziel site — deep | 37 | ₪0.3295 | ₪0.6328 | ₪1.2090 |
| Raziel site — deterministic/no model | 17 | ₪0 | ₪0 | ₪0 |
| Raziel WhatsApp — fast | 7 | ₪0.0324 | ₪0.0506 | ₪0.0518 |

The end-to-end figures include observed model retries inside the same interaction. Other bounded Haiku helpers such as Number, Discovery, Name Lab, Compare and Research recorded common per-call averages around ₪0.016–₪0.022 in the same window. Samples remain small for several surfaces, so they justify an initial price band, not a permanent tariff.

Current active credit packs, excluding the admin-only ₪1 test item, imply a retail value of approximately ₪0.0222–₪0.0333 per credit. On that basis the recommended V1 customer prices are:

| Bounded operation shown to the user | V1 price candidate | Examples and boundary |
|---|---:|---|
| deterministic calculation or exact cached result | 0 credits | gematria arithmetic, deterministic ELS construction, reopen an existing result |
| short AI explanation | 5 credits | a bounded Number, Name, Discovery or guided explanation |
| Raziel fast | 15 credits | one submitted prompt and its completed fast answer, including internal retries |
| Raziel deep | 60 credits | one submitted prompt and its completed deep answer, including internal retries |
| bounded deep module | 60 credits | one measured Life Journey / Number-style deep module within the current one-call envelope |
| extended multi-tool report | 120 credits provisional | only after the complete job has a hard budget and end-to-end P90 telemetry; do not expose before that gate |
| deep Bible Code matrix reading | 500 credits | one usable completed Fable-backed reading, under the rules below |
| voice, transcription or generated media | not priced yet | keep unavailable or explicitly free in a bounded pilot until duration and provider-cost evidence exists |

Why these bands are coherent:

- 15 credits currently represents about ₪0.33–₪0.50 of pack value against a ₪0.1544 fast P90;
- 60 credits represents about ₪1.33–₪2.00 against a ₪0.6328 deep P90 and the recorded ₪1.209 maximum;
- the customer pays once for the promised action, never again because the server retried internally;
- the server may route to a cheaper sufficient model, but the displayed price and required answer quality do not change during the action;
- prices must be rechecked monthly at first, and whenever model price, FX, routing, context size or P90 cost changes materially.

These are launch candidates, not published prices. The existing source-code constants `els: 30`, `cross: 20`, `name_deep: 40`, `report: 50` and `journey: 60` predate this calibration and are not canonical product truth for 2029.

#### Customer credit meter

Use one customer-facing currency named **credits**. The meter has two simple views:

1. **Available now** — the total spendable balance across membership allowance, earned credits and purchased credits.
2. **This membership cycle** — how much of the plan allowance was used, for example `215 / 600 used` for SOD אישי or `1,240 / 3,000 used` for SOD מחקר.

Before every paid action show all three facts together: the fixed action price, the available balance and the balance expected after completion. Example: `Raziel deep · 60 credits · 740 available · 680 after completion`.

Meter behavior:

- green above 50% of the cycle allowance remaining, amber at 20–50%, red below 20%; color supports the numbers and never replaces them;
- a long job moves credits to **reserved** while it runs, then to **spent** once a usable result completes or to **returned** on a qualifying failure;
- reservations count as unavailable so two simultaneous jobs cannot spend the same balance;
- reopening an exact saved or cached result is free and visibly marked as already paid;
- the ledger uses human labels such as `Raziel fast`, `Raziel deep` and `Deep matrix reading`, not provider/model names;
- insufficient balance blocks before provider work begins and offers the relevant credit pack; it must not create hidden debt;
- the member may set an optional low-balance warning, initially recommended at 100 credits.

Internal balance policy required for Membership:

- grant the plan allowance at the start of each successful monthly membership period: 600 for SOD אישי or 3,000 for SOD מחקר;
- grant annual subscribers their plan allowance each month, not 7,200 or 36,000 at purchase time;
- let unused included credits roll forward up to two months of the current plan allowance: 1,200 for SOD אישי or 6,000 for SOD מחקר, so one quiet month is not lost while business exposure remains bounded;
- purchased credits do not expire under this draft; any expiry for earned/promotional credits requires explicit customer terms before launch;
- consume the time-limited membership allowance first and purchased credits last;
- preserve one displayed total while keeping source, expiry, reservation and settlement entries separately reconcilable on the server.

The current interface already shows `profile.credits` and recent `credit_ledger` movements, but it is only a single balance plus history. It does **not** yet provide a membership-cycle meter, allowance-source buckets, rollover cap or reserve/settle state. Those are implementation requirements after product approval; this document does not authorize their migration or deployment.

#### Deep Bible Code / ELS matrix reading

The Fable-backed deep matrix reading is a premium, variable-cost operation. It is not part of deterministic ELS search and must never be presented as unlimited merely because the ELS surface is included in Membership.

Measured evidence from the first two completed `els_matrix_reading_jobs` on 2026-10-30:

| Completed reading | Model | Usage-based estimated provider cost | Notes |
|---|---|---:|---|
| reading 1 | `claude-fable-5-1` | ₪3.9604 | 21,541 input / 48,322 output tokens |
| reading 2 | `claude-fable-5-1` | ₪1.4616 | 21,387 input / 15,146 output tokens |

The job evidence estimates a normal range of about ₪1.26–₪1.54 for a bounded 25-proposal reading, but records an estimated exposure ceiling of about **₪5.21** when output grows or reaches its allowance. These figures use usage objects, recorded list prices, a Message Batches factor and an FX rate of 3.01 ILS/USD. They are estimates, not provider-invoice truth; current pricing and FX must be revalidated before publication.

**V1 pricing recommendation: 500 credits for one completed deep matrix reading.**

Why 500:

- current public credit packs value 500 credits at approximately ₪11.10–₪16.67, depending on pack size;
- against the ₪5.21 observed exposure ceiling, this leaves an estimated gross contribution of about ₪5.90–₪11.46 before shared infrastructure, tax, support, failed attempts and membership-allocation economics;
- the round price is understandable and leaves room for model-price, FX and output variance;
- charging credits avoids a separate Cardcom transaction and transaction fee for every reading.

Product rules:

- deterministic ELS search, matrix construction and saved-matrix viewing do not consume these 500 credits;
- show the 500-credit price and current balance before starting;
- reserve once and settle idempotently; retries and duplicate callbacks must not double-charge;
- charge only after a usable completed result; return the reserved credits on a technical/provider failure or an incomplete result with no usable answer, while recording the provider cost internally;
- one member allowance may fund a reading, but the feature is not “unlimited”; additional readings consume credits;
- cache and reopen the completed reading without a new charge when the exact saved result is reused;
- reprice or route to a cheaper sufficient model only after measured quality parity, never by silently reducing required research quality.

Working allowance hypothesis: if the launch promise includes one deep matrix reading per month, the monthly SOD אישי allowance must be at least 500 credits. A **600-credit monthly allowance** is the smallest coherent entry candidate because it can fund one reading plus, for example, six Raziel-fast answers and two short AI explanations. Alternatively it funds about 40 fast answers or 10 deep answers. The **3,000-credit SOD מחקר allowance** funds up to six completed readings at the fixed price, without calling the capability unlimited. The measured Raziel and matrix evidence supports both as V1 candidates, but they still require ZURIEL approval before publication or implementation.

### 3.4 Bible Code-only plan

Do **not** launch a separate Bible Code-only subscription in V1. SOD מחקר already supplies a high-volume option for Bible Code users without fragmenting the content membership. Keep a code-only plan as an experiment candidate after Public Beta only if ELS users show strong standalone demand and low cross-use of the broader membership.

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

## 5. Proven Cardcom recurring-payment direction

### Decision

Use **SOD1820-managed recurring billing with a Cardcom token** for V1, while Supabase remains the source of truth for subscription state and entitlements.

Why this is now the V1 direction:

- Cardcom confirmed that the account's token/API model is active;
- the limited production pilot successfully charged ₪4, stored only an AES-GCM encrypted Cardcom token envelope, and then performed a second ₪4 server-initiated charge without card re-entry;
- Cardcom produced a document for each approved charge;
- the renewal kept the subscription active, advanced the paid period exactly once and reset failure state;
- cancellation-at-period-end was scheduled without another charge;
- isolated PostgreSQL acceptance tests passed for decline-to-`past_due`, cancellation, no-charge-after-cancel, replay, rollback and RLS;
- SOD1820 needs direct control of grace periods, retries, entitlements, credits, referrals, plan changes and customer-visible state.

Do not combine Cardcom-managed recurring orders and SOD1820 token-managed billing for the same subscription. A future provider-managed recurring-order path would be a separate, explicitly reviewed migration decision.

### 5.1 Signup sequence

1. The authenticated user selects the canonical monthly or annual plan.
2. The server loads plan price, interval and allowance from its own catalog.
3. The server creates a Cardcom Low Profile payment page for the **first charge**.
4. Cardcom hosts card entry; SOD1820 never receives or stores the card number/CVV.
5. Cardcom webhook arrives and the server independently verifies the payment result.
6. After a verified successful first charge, the server encrypts the returned Cardcom token with the server-only token-encryption key and stores the ciphertext envelope and expiry in the private credential boundary.
7. The server schedules `next_charge_at` for one month or one year later. It must not charge the first period twice.
8. The server stores only the encrypted token envelope, expiry and provider references such as Low Profile ID and transaction IDs. It never stores card number or CVV.
9. Supabase activates the subscription and derives the member entitlement for the paid period.
10. If the signup came through a valid referral, the verified subscription-payment event is passed once to the referral processor.

### 5.2 Monthly and annual configuration

| Field | Monthly | Annual |
|---|---|---|
| billing interval | one month, server-owned | one year, server-owned |
| first charge | Low Profile checkout now | Low Profile checkout now |
| next debit | one month later | one year later |
| renewal execution | guarded server-initiated token charge | guarded server-initiated token charge |
| amount | canonical monthly price | canonical annual price |
| currency | ILS | ILS |
| internal reference | opaque subscription / due-period identity | opaque subscription / due-period identity |

The browser never supplies the amount, interval or next billing date. The renewal worker must require its server secret, production environment and explicit billing-enable flags, and must use one idempotency key for retries of the same due period.

### 5.3 Cardcom interfaces and account facts

- first charge and token creation use Cardcom Low Profile `ChargeAndCreateToken`;
- subsequent debits use API v11 `Transactions/Transaction` with the encrypted-at-rest token decrypted only inside the guarded server runtime;
- `ExternalUniqTranId` is the renewal idempotency identity and must remain exact across retries;
- every charge is persisted as an immutable attempt and settled only from a verified Cardcom response;
- Cardcom's account manager confirmed that token-based recurring API billing is active in the account's subscription;
- provider documents and transaction IDs are retained as payment evidence.

Official references:

- https://support.cardcom.solutions/hc/he/articles/360008695513
- https://support.cardcom.solutions/hc/he/articles/360017105139
- https://cardcomapi.zendesk.com/hc/he/articles/25405486094226
- https://cardcomapi.zendesk.com/hc/he/articles/25407418754450

Before public launch, Cardcom support must still confirm that the merchant account has:

- token/API billing enabled for the production terminal and the relevant acquirer/Shva settings;
- the existing API identity authorized for unattended token charges;
- the correct document type and VAT treatment;
- the recommended way to test a real decline response without a customer card;
- a test environment/user if available and the required production endpoint behavior.

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
- encrypted-token credential reference in the private boundary;
- Low Profile/provider reference;
- exact Cardcom transaction/internal-deal ID stored as text-safe identity;
- current period start/end;
- cancellation/effective dates;
- last verified event and reconciliation timestamps.

Client-visible reads must be owner-scoped. Provider secrets, payment payloads and privileged transition functions remain server-only. A paid tier in editable user metadata is never authorization proof.

## 8. Payment verification and reconciliation contract

1. Treat the initial Low Profile callback only as a prompt to fetch and verify the Cardcom result server-to-server; renewals are decided from the guarded `Transactions/Transaction` response.
2. Persist the raw event only in a bounded, access-controlled audit form.
3. Deduplicate by provider event/debit identity before any grant.
4. Map `ReturnValue` to the internal subscription without trusting client-supplied user IDs.
5. Update payment event, subscription and entitlement atomically or through a retry-safe state transition.
6. Grant recurring credits and referral rewards from the verified event once.
7. Return Cardcom's expected callback response promptly and keep renewal responses internal.
8. Run a daily reconciliation job against local due/charge state and Cardcom transaction evidence.
9. Alert on provider success without entitlement, entitlement without provider success, repeated callback/renewal failure, unknown transaction references and duplicate/replayed events.

## 9. Cancellation, failed payments and refunds

### User cancellation

- user requests cancellation in My Workspace;
- server sets `cancel_at_period_end` and prevents any future token charge after the paid period;
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

**Approved sequencing decision (ZURIEL, 2026-10-31):** build the premium foundation now, but do not publish or sell the membership until one complete “golden path” works end to end. Launch SOD אישי to a closed cohort first. Enable SOD מחקר only after the credit meter, reserve/settle/refund behavior and real usage costs are proven. This sequencing approval is not authorization for a migration, Cardcom configuration, charge, deployment or public offer.

### Gate A — product decision

- approve name;
- approve monthly/annual prices;
- approve included monthly credits;
- approve exact capability allocation;
- approve grace/refund/cancellation policy;
- approve referral economics.

### Gate B — Cardcom account confirmation

- token/API billing and terminal enabled;
- API identity/permissions for unattended token charges confirmed;
- document/VAT rules confirmed;
- provider decline test method confirmed;
- real test plan agreed with Cardcom support.

### Gate C — premium foundation

- canonical plan catalog;
- subscription/payment/entitlement state model;
- Cardcom checkout + encrypted token + guarded renewal worker;
- webhook + reconciliation;
- 2029 My Workspace subscription UI;
- one total credit balance plus membership-cycle usage meter;
- allowance-source, rollover, reservation, settlement and return accounting;
- server-side capability gates before expensive IO;
- credits/referrals integration.

Premium labels and gates may be prepared during this phase, but no broad public paywall is activated.

### Gate D — golden-path verification

Prove one complete journey without manual repair:

`register/login → choose plan → verified payment → active entitlement → monthly credits → priced premium action → ledger update → renewal/cancellation/failure state`

Required verification:

- monthly real low-value test and cancellation;
- annual token-charge test or an approved accelerated simulation;
- duplicate/out-of-order webhook tests;
- failed debit and retry tests;
- refund/chargeback simulation;
- reconciliation and alert tests;
- access removed/retained exactly according to period state;
- no cross-account access, price manipulation or double grant.

### Gate E — SOD אישי closed pilot

- internal/admin cohort;
- then a small invited cohort on 600 monthly credits;
- include the first coherent premium value set: member content, Raziel fast/deep, deterministic Bible Code and the metered deep matrix reading;
- observe comprehension of the meter, provider cost, failure/refund behavior, support load and successful renewal;
- do not require every planned 2029 capability to be finished before this pilot.

### Gate F — SOD מחקר enablement

- enable 3,000 monthly credits only after SOD אישי usage is measured;
- verify that 6,000-credit rollover, simultaneous reservations and downgrade behavior cannot overspend or erase purchased credits;
- verify hard operation budgets and alerts for unusually costly Raziel, Life Journey and Bible Code runs;
- start with a small high-usage cohort and compare real cost per active subscriber with the pricing model.

### Gate G — public launch

- customer-facing plan comparison, credit explanation, cancellation/refund terms and privacy/payment wording approved;
- receipts/invoices, support route and failed-payment messaging proven;
- mobile and cross-device membership state verified;
- public wording approved only after the closed-pilot evidence review;
- publish deliberately; do not tie membership launch to the completion of every future 2029 feature.

## 13. Open Human-Gate decisions

- [ ] Approve or change the two working levels: ₪30/₪300 with 600 monthly credits and ₪79/₪790 with 3,000 monthly credits.
- [ ] Approve, change or reject 500 credits per deep ELS matrix reading.
- [ ] Approve, change or reject the initial 5 / 15 / 60 / 120 / 500 fixed operation-price bands.
- [ ] Approve, change or reject allowance rollover up to two months: 1,200 / 6,000 included credits, with purchased credits kept separately and not expiring.
- [ ] Exact Free vs Member limits for ELS, Life Journey, Heichal and Raziel.
- [ ] Confirm monthly allowance release for annual members instead of granting 7,200 / 36,000 upfront.
- [ ] Grace period after failed renewal.
- [ ] Refund policy and effect on already-used credits.
- [ ] Expiry and redemption mechanics for referral ILS credit.
- [ ] Whether/when to test a Bible Code-only plan after Public Beta.
- [ ] Business/document type and VAT settings in Cardcom.
