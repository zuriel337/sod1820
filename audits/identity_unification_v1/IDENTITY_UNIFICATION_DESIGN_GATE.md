# IDENTITY_UNIFICATION_DESIGN_GATE — Design Only, No Implementation

Status: **design gate, read-only follow-up to ANONYMOUS_IDENTITY_UNIFICATION_AUDIT.**
No code or DB has been changed by this document. Reproducible measurement queries: see
`identity_fragmentation_measurement.sql` in this folder (run 2026-09-03 against
project `linswmnnkjxvweumprav`).

## The decisive question: (A) same representation needing ONE canonical id, or (B) two semantic layers needing a deterministic bridge?

**Verdict: (B) for `sod_vid` vs `sod_id` — they are different semantic layers by their
own written contracts, not two accidental copies of the same thing. Collapsing them
into one id would be a semantics change with no upside.** But there is a separate,
narrower (A)-shaped problem underneath: `sod_visitor` (`visits.js`) and
`sod_visitor_id` (`supabase.js`/`feedback.js`) are **not** a third and fourth semantic
layer — they are accidental re-implementations of the *same* layer `sod_vid` already
owns, created because two files rolled their own inline generator instead of importing
`visitorId.js`. Those two *should* collapse into `sod_vid` (subject to the AI-quota risk
noted below). This is not "shrink the id count for its own sake" — it's restoring a
contract (`visitorId.js`'s own docstring: "the ONE place that creates/reads the site's
anonymous visitor id") that two other files are currently violating.

### Why (B) for sod_vid vs sod_id — read from the contracts, not from the bug

- **`visitorId.js`** states its own scope explicitly: *"זהו REPRESENTATION אחד —
  «מבקר-דפדפן אנונימי» — ולא זהות-האדם הקנונית. Visitor ≠ Session ≠ Person ≠
  Subscriber."* ("This is ONE representation — 'anonymous browser visitor' — not the
  canonical person identity.") `sod_vid` explicitly disclaims being a person-identity.
  It has no cookie, no persons/identity_edges relationship, no login-linking — it was
  never built to carry that weight.
- **`identity.js`** frames `sod_id` as *"שדרת זהות מאוחדת — שלב 1"* ("unified identity
  spine — stage 1") layered **on top of** the older per-browser ids via
  `identity_edges`, explicitly as a compatibility/bridge layer, not a replacement that
  erases what came before.
- **`persons`/`identity_edges`** sit at a *third*, higher tier still: `persons` is the
  "one human" resolution (has `account_user_id`), and `identity_edges` is generic
  bridge infrastructure between id-kinds (`device`/`login`/`legacy_seed`/`probe`) and
  `person_id` — this table's entire reason to exist is "bridge different id spaces,"
  which only makes sense if there legitimately *are* different id spaces to bridge.
- **Multi-device/login already works, and it does not depend on `sod_vid` at all.**
  `link_identity(kind='login')` merges two different browsers' anonymous histories
  into one `person` **by `account_user_id`** (the real auth signal), not by comparing
  `sod_vid`/`sod_id` values across devices — which is structurally impossible anyway
  for a `localStorage`-only id (it can never be the same value on two devices). This is
  the standard shape of the problem (compare Segment/Mixpanel/Amplitude's
  `anonymousId` vs `userId` + an explicit `identify()`/`alias()` call): the anonymous
  browser-instance id and the identity-graph id are *supposed* to be different things,
  reconciled by an explicit bridging event, not by making them the same string.
- **The one place this got blurry is `acquisition.js`**, which calls `sod_vid` "the
  canonical visitor id" — that claim is *correct* for the Visitor tier specifically,
  but the file's actual behavior (`signupAttribution()` stores only `sod_vid` in
  `subscribers.acquisition`, a JSON blob with no FK to anything) never also captures or
  links `sod_id`, so a real signup event never enters the Identity Spine graph at all.
  That's the actual bug — not that two ids exist, but that one legitimate boundary
  (Visitor → Identity Spine) is missing its bridge at exactly the moment (signup) it
  matters most.

**Conclusion:** do not replace `sod_vid` with `sod_id`, and do not replace `sod_id`
with `sod_vid`. Strengthen the bridge between them (`identity_edges`,
`kind='legacy_seed'`, already-existing infra) so it actually fires reliably, and
retire the two accidental *duplicate Visitor-tier* ids (`sod_visitor`,
`sod_visitor_id`) into `sod_vid` itself where that's safe to do (see risk on AI quota
below — that one specific consumer is deliberately left alone for now).

## Corrected framing for the post_sidebar_v1 report (per explicit request)

To be unambiguous, since this has been a recurring point of confusion across the last
two turns:

- **Decision metrics (`second_page_rate`, `views_per_session`, `scroll75/90`,
  `internal_clicks`, `search/cross_search`, `compute`, `share`, `exit_after_post`,
  landing/channel breakdown, Human Gate, HUMAN/UNKNOWN/BOT classification) are
  computed entirely on `events`, keyed by `sod_id` + `session_id`, and are NOT affected
  by the sod_vid/sod_id split.** `emit()` always resolves `sod_id` itself regardless of
  which higher-level function called it, so every row in `events` — including
  story/search/compute/share rows — already carries a consistent `sod_id` and
  `session_id`. These metrics are sound today.
- **Only `story_open_rate`/`story_view_rate` are marked `diagnostic_degraded`**, and
  only because the *cross-check* against the legacy `visitor_events` table (used to
  sanity-check `events`' counts) relies on `visitor_events.visitor_id`, which for
  those two event types is `sod_vid`, not `sod_id` — an identity-namespace gap in the
  **diagnostic cross-check itself**, not in the decision metric. The decision metric's
  own numbers (from `events`) are computed the same reliable way as everything else
  above; what's degraded is only the *confidence that the visitor_events-side sanity
  check is telling us anything meaningful* about symmetry between variants.

## New-visitor bootstrap: removing the module-load-order race

**Root cause of the race:** `getSodId()`'s legacy-adoption check
(`for (const k of LEGACY_KEYS) …`) reads `localStorage` for legacy keys **once, at the
exact moment `getSodId()` first runs in that browser** — a snapshot-in-time check with
no retry. If `getVisitorId()` (creating `sod_vid`) happens to run *after* that moment
(e.g. a different component tree order, lazy-loaded chunk, etc.), the window to bridge
them is gone: `getSodId()` already minted an unrelated fresh UUID, and nothing
re-checks later. This is why measured bridging coverage is in the single digits, not
because the mechanism is wrong in concept.

**Design (not implemented):** stop trying to guess the right order at all. Add one
function, `ensureIdentity()`, to `identity.js`, and call it exactly once per app load
from `App.jsx` next to the existing `captureArrivalSource()`/`captureAcquisition()`
calls (same tier, same timing convention already established there — no new pattern
introduced). Each call:

1. Resolves `sod_id` (existing `getSodId()`, unchanged — cookie/localStorage).
2. Resolves `sod_vid` (existing `getVisitorId()` from `visitorId.js`, unchanged).
3. If a `sessionStorage` guard for *this tab-session* hasn't already fired (cheap,
   avoids hammering the RPC on every route change — **not** a correctness dependency,
   just a courtesy; unlike the current one-shot-per-browser-forever flag, this one
   resets every new tab/session, so it retries far more often and no longer depends on
   a single missed moment), call `link_identity(p_sod_id=sod_id, p_kind='legacy_seed',
   p_legacy_id=sod_vid)` unconditionally. The RPC's own
   `on conflict (sod_id, person_id, kind) do update` (already in `link_identity`) makes
   repeated calls cheap and idempotent — no new SQL needed.

This makes the bridge **self-healing over time for every visitor, old or new**,
because it no longer depends on catching a one-time window at first-ever bootstrap —
it just keeps trying, cheaply, every session, until it succeeds (which it always will,
since both ids are guaranteed to exist by the time step 3 runs).

## Backward compatibility for existing visitors — no mass rewrite, no lost attribution/AI quota

- **No id is deleted, renamed, or regenerated.** Existing `sod_id`/`sod_vid` values
  in cookies/localStorage are read as-is; `ensureIdentity()` only *adds* a bridge edge
  using whatever values are already there.
- **Historical rows become retroactively joinable the moment the edge exists**, with
  zero rewriting: `identity_edges(sod_id, legacy_id='<their existing sod_vid>')` is a
  pointer, not a copy. Once it exists, *every past* `visitor_events`/`site_visits` row
  carrying that same `sod_vid` string becomes joinable for reporting purposes — the
  audit's own bridging-coverage queries already prove this (`exists (select 1 from
  identity_edges where legacy_id = …)`). Nothing needs to be backfilled into the old
  tables themselves.
- **`sod_visitor`/`sod_visitor_id` retirement (where in scope) is additive, not
  destructive:** `visits.js` switches to *reading* `getVisitorId()` instead of its own
  local key; the old `sod_visitor` value some visitors already have in `localStorage`
  simply stops being written to going forward and is never read again — it doesn't
  need to be migrated, because `site_visits.visitor` rows already written under the old
  value stay exactly as they are (historical, not rewritten), and the visitor's *new*
  `site_visits` rows going forward will use `sod_vid`, which (thanks to
  `ensureIdentity()`) will now also be bridged to `sod_id`. This creates one
  generation's worth of a seam (their history before the switch uses `sod_visitor`,
  after uses `sod_vid`) that is not perfectly joined across the seam — acceptable,
  explicitly not solved by a mass rewrite, consistent with the "no mass rewrite without
  proven need" instruction.
- **AI quota / `sod_visitor_id` is explicitly OUT of scope for this fix.**
  `ai-analyze`'s guest quota counting and `feedback.js` currently key off
  `sod_visitor_id` (`supabase.js`'s `aiVisitorId()`). Switching that specific call site
  to `sod_vid` would change the string sent to the server for every existing guest user
  in one release, which — if the server-side quota counter groups by that exact string
  — would look like *every anonymous user's AI quota resetting simultaneously* on
  deploy day. That is a real, user-facing risk with no upside for this identity-audit's
  goals (AI quota doesn't feed into `events`/persons/experiments at all today). **Recommendation: leave `aiVisitorId()`/`logJourneyAb()`/`feedback.js` exactly as they
  are for now**, flagged as a separate, lower-priority follow-up if/when someone
  specifically wants AI-quota history unified too — do not fold it into this fix.

## Two implementation alternatives

### Alternative 1 — Central `ensureIdentity()` bootstrap (recommended)

One new function in `identity.js`, called once from `App.jsx`; `visits.js` changed to
delegate to `getVisitorId()` instead of its own local key. Everything else (identity_edges,
link_identity, persons, resolve_person, `events`/`emit()`) untouched.

- **Pros:** single choke point, matches the app's own existing "call once at App mount"
  convention; self-heals *every* visitor (existing and new) progressively over their
  next sessions with zero backfill; smallest total diff (2 files); zero new DB objects,
  columns, or RPC signatures; leaves the AI-quota-sensitive code path untouched.
- **Cons:** one extra idempotent RPC call per tab-session (small, avoidable cost); the
  `sod_visitor`→`sod_vid` switch in `visits.js` still leaves a historical seam for
  `site_visits` (accepted above, not a blocker).

### Alternative 2 — Point-of-write dual-tagging (no shared bootstrap)

Leave `identity.js`/`visitorId.js` exactly as they are; instead, edit each write site
independently (`visits.js`'s `track_visit` call, `supabase.js`'s `logJourneyAb`/AI-quota
calls, `feedback.js`) to *also* pass `getSodId()` alongside whatever local id they
already send, and extend the corresponding RPCs (`track_visit`, `log_journey_ab`,
`ai-analyze`, feedback insert) to accept and store it.

- **Pros:** more surgical per file — no shared new function, smaller conceptual change
  per commit, easier to review/ship one call-site at a time.
- **Cons:** touches *more* total surface (3-4 RPC signatures instead of 1 shared table
  already built for exactly this), does **not** actually resolve the
  `sod_visitor`/`sod_visitor_id` duplication (each site keeps minting its own id
  forever, just also reporting `sod_id` alongside) — so the "ONE TREE, single owner"
  contract stays violated indefinitely; still leaves a version of the race (each site
  independently calls `getSodId()`/its own generator at its own first-use moment,
  rather than one guaranteed-ordered bootstrap), just moved to being "captured per
  write" instead of "never captured" — net improvement, but a permanently bolted-on
  workaround rather than a fix.

### Recommendation

**Alternative 1.** It's smaller, it reuses 100% of existing infra
(`identity_edges`/`link_identity`) with no new columns or RPC params, it actually
restores the `visitorId.js` "single owner" contract instead of further ignoring it, and
it self-heals the historical population (`~76%`/`~96%` unlinked) over time without a
migration script. Alternative 2 is a reasonable fallback only if there's a reason
Alternative 1's single bootstrap point can't be added (none identified so far).

## Risks (full list, including the ones already called out above)

- **AI quota reset risk** if `sod_visitor_id` is ever folded in without a migration
  path — mitigated by explicitly leaving it out of scope here.
- **`site_visits` historical seam** for visitors who switch from `sod_visitor` to
  `sod_vid` mid-history — accepted, not fixed, matches "no mass rewrite."
  visitors — worth a quick manual spot-check post-deploy, not a blocker.
- **Extra RPC call cost**: `ensureIdentity()`'s `link_identity` call, even
  session-gated, adds load on every tab-session for every visitor. `link_identity` is
  already called today for the `login`/`push` kinds without an apparent volume
  problem, but worth watching in `admin_infra_load` after shipping.
- **This does not fix the *historical* ~76%/96% unlinked population.** It only stops
  the bleeding going forward and lets returning visitors self-heal on their next visit.
  Visitors who never come back stay permanently unlinked — expected and accepted, not a
  defect of this design.
- **Scope creep risk on review:** it will be tempting to "also fix" `sod_visitor_id`
  while in this code — explicitly resist that per the AI-quota risk above unless asked.

## Stop condition

This is a design document only. No code or migration has been written or applied.
Waiting for explicit go-ahead before implementing Alternative 1 (or a decision to go
with Alternative 2 instead).
