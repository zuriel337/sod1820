# Identity × Attribution — Foundation Contract (v1)

> **WIDE CONTRACT · MINIMAL IMPLEMENTATION.** This document is the single focused
> Foundation artifact for the Identity / Attribution / Subscriber / Journey domain.
> It **extends** the existing canonical DB laws — it does not replace or duplicate them:
> - `traffic_intelligence_law` (nodes + project_codex) — analytics/attribution SSOT.
> - `identity_architecture_law` (nodes) — anonymous → user → contributor transitions.
> - `sod1820_canonical_identity_law` (nodes) — platform *name* identity (unrelated to visitor identity).
>
> Codifying this artifact into `nodes`/`project_codex` is a **follow-up on ZURIEL authorization**
> (no live DB write was made by this pass).

ONE TREE · ONE IDENTITY OWNERSHIP · MANY REPRESENTATIONS · NO SHORTCUTS.

---

## 1. Identity ownership (MUST FOUNDATION NOW)

The anonymous browser **visitor identity** (`sod_vid`) is **owned once**, by exactly one
primitive: **`src/lib/visitorId.js` → `getVisitorId()`**. It is the only place that
creates/reads `sod_vid`. Every other domain **consumes** it, never re-creates it:

- `tracking.js` re-exports `getVisitorId` from the primitive (events / `visitor_events`).
- `acquisition.js` re-exports it as `visitorId` (signup attribution snapshot).
- signup paths and journey/event linkage consume the same id.

**Rule:** *Identity is owned once; other domains consume identity.* No second visitor id,
no second key, no second UUID generator, no second cookie/store.

> Known pre-existing separate representation (out of scope here): `feedback.js` uses a
> different key `sod_visitor_id` for feedback fairness counting. Unifying it is a broad,
> unrelated refactor and is **not** performed by this pass — flagged as LATER.

## 2. Taxonomy — keep these distinct (MUST FOUNDATION NOW)

| Distinction | Meaning |
|---|---|
| Visitor ≠ Session ≠ Person ≠ Subscriber | four different identities; one human ≠ one row |
| Representation ≠ canonical identity | `visitor_id` / `person(user).id` / `subscriber` row / `email` / `session` are *representations* of the same human |
| Identity **link** ≠ identity **merge** | linking preserves provenance; merging collapses it — never merge on probabilistic match |
| Event ≠ Attribution | an observed event is fact; attribution is an interpretation over events |
| Observed source ≠ Derived source | UTM/referrer are observed; any future scoring is derived |
| First Touch ≠ Last Touch ≠ Signup Touch ≠ Return Touch | four distinct moments |
| **Unknown ≠ Direct** | absence of an observed external source is `null`, **not** "direct" and **not** a fabricated campaign |
| Acquisition snapshot ≠ Event history | subscriber holds a snapshot; `events` remains event truth |
| Subscriber ≠ Newsletter send; Sent ≠ Opened ≠ Clicked ≠ Returned | lifecycle stages are separate facts |
| Claimed association ≠ Verified association | a claimed link is not a verified one |

## 3. Representations & transitions (EXTENSION POINT NOW)

Supported transition directions the contract must never block (no implementation now):

```
anonymous visitor ──▶ authenticated person ──▶ subscriber
subscriber (before account) ──▶ later authenticated person
```

- **Visitor** → `sod_vid` (localStorage, anonymous).
- **Session** → `events.session_id` (already exists; multiple per visitor).
- **Person** → `users.id` / `auth.users` (canonical authenticated identity).
- **Subscriber** → `subscribers` row keyed by `email` (may exist before any account).

Linkage carriers that already exist and must keep letting these be re-associated later:
`subscribers.acquisition.visitor_id`, `subscribe_events.visitor_id`/`user_id`,
`visitor_identity(visitor,user_id,email)`, `events(session_id, person_id, sod_id)`.
No schema change is required to represent the transitions; they link by shared id/email.

## 4. Attribution snapshot contract (`subscribers.acquisition`, v1)

```
{
  attribution_version: "v1",
  visitor_id,                         // = sod_vid (the one owned identity)
  first_touch:  <touch|null>,         // first-ever known arrival  (from tracking.captureAcquisition)
  last_touch:   <touch|null>,         // last known external touch (from tracking.captureAcquisition)
  signup_touch: { source, ref_host, utm, path, occurred_at }   // the conversion moment
}
touch = { channel, tag, tagged, rid, ref, landing, at }   // existing Traffic convention
```

- **Snapshot only** — never the visitor's full event history. `events` stays event truth.
- **Provenance:** `first_touch`/`last_touch` are *recorded observed provenance*. `signup_touch`
  fields are *observed* (utm/referrer/path). Any future *derived* attribution is separate and
  must carry its own provenance — never overwrite observed fields.
- **Time:** every touch carries `at` / `occurred_at`.
- **Unknown:** `signup_touch.source = null` when no external source was observed at that moment
  (an empty referrer is ambiguous between direct and stripped-referrer, so it stays `null`).
  `first_touch`/`last_touch = null` when never observed. Unknown is a legal state.

## 5. Newsletter lifecycle (EXTENSION POINT NOW — already representable)

Existing tables already represent the lifecycle without a second newsletter system:
`subscribers` (subscribed / `unsubscribed_at`), `newsletter_welcome` + `email_events`
(welcome queued/sent), `newsletter_campaigns` + `newsletter_sends` (campaign sent),
`email_events` (opened/clicked via edge pixels), and **return touch** = a future site
arrival carrying the campaign tag, captured by the same `captureAcquisition`/`events` path
(a `?src=`/`utm_*` on a newsletter link becomes an observed touch). No new store needed.

## 6. Privacy / Consent / Human Gate (MUST FOUNDATION NOW)

- `subscribers` is **admin-read only** (RLS) — anonymous visitor identity never exposes
  subscriber PII to the client. `acquisition` holds no email/name, only attribution signals.
- Server-side linkage writes (`subscribe_events`) use service-role (RLS-safe); the client
  path keeps linkage inside `acquisition.visitor_id`. No RLS weakening, no new policy.
- **Human Gate:** a future attribution engine may *rank/suggest*; it must never turn a
  marketing inference into a canonical fact without provenance. Observed ≠ derived.

## 7. Cross-domain consumption (EXTENSION POINT NOW)

Identity and attribution are UI-/language-independent. The same `getVisitorId()` primitive
and the same acquisition/event contracts are consumable, unchanged, from future surfaces
(Number Page, ELS, Raziel, Research Studio, 3D/Spatial, Personal Journey, Entity Hub) —
none of which are implemented now. The contract leaves the natural seam; no surface is built.

---

## 8. Future-Capability Challenge — classification

**MUST FOUNDATION NOW** (skipping causes identity break / migration / duplicated system):
- Single visitor-identity owner (§1). *(fixed this pass)*
- Taxonomy separations, esp. Unknown ≠ Direct and snapshot ≠ event-history (§2, §4). *(fixed this pass)*
- Privacy boundary: subscriber PII not client-readable; observed≠derived provenance (§6). *(already true)*

**EXTENSION POINT NOW** (leave the seam; do not implement):
- Identity transitions & representation re-association (§3) — carriers already exist.
- Newsletter lifecycle stages incl. return touch (§5) — tables already exist.
- Cross-domain consumption from other research surfaces (§7).
- Multi-touch / assisted attribution over event history — contract must not block it; **no scoring engine now**.

**LATER** (deferrable without redesign):
- Unifying `feedback.js` `sod_visitor_id` into the one primitive.
- A canonical `person_id`/`session_id`/`journey_id` inside the acquisition snapshot (currently
  linkable via `events`; add only when a surface needs it).
- Any attribution scoring / interest profile / recommendation / marketing automation.

## 9. Foundation verdict

For the wired scope (visitor identity ownership + signup attribution snapshot + truthful
Unknown + linkage), the existing structures represent every MUST-NOW capability with **no
schema change and no parallel system**. The domain is **FOUNDATION SUFFICIENT** for v1,
with the EXTENSION POINTS above left open by contract.
