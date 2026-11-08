# RPC inventory — DRAFT (reading activity beacon, PR #1259)

**Status: DRAFT / PROPOSAL ONLY. Nothing in this file is verified on the live database.** The objects below are *not applied*
anywhere. It follows the fields that `docs/2029-security-hardening-gate-plan-v1.md` Stage S0/S1 asks for each externally
reachable capability. It is not a security approval, not the S2 (Pre-Cutover) gate, and not a registration in any owner.
Nothing here changes a database, an Edge Function, the site or GA4.

## Evidence tiers used in this file
| Tier | Meaning | Where it comes from |
|---|---|---|
| **P** | Stated in the proposal text | `supabase/proposed/reading_activity_v1.sql` (reviewed as text) |
| **L** | Exercised on a disposable local Postgres built from live definitions (a replica fixture) | `tests/sql/reading_activity_v1.sql` (case ids given) |
| **R** | Read from the live database, read-only, earlier in this session | only for `ingest_event` and the edge-header log counts; re-read before relying on it |
| **—** | Not verified | no evidence; listed under "Not verified" |

A tier **L** result proves the function and its privileges *on the replica*, not on the live project, and not through
PostgREST (the PostgREST proof is **OPEN / NOT VERIFIED**).

## Inventory
| # | Capability | New? | Principal (who can call) | Surface / route | Side effect | Expected caller | Auth class | Abuse / rate sensitivity | Proposed owner |
|---|---|---|---|---|---|---|---|---|---|
| 1 | `public.ingest_reading_activity_v1(text,text,text,jsonb)` SECURITY DEFINER, `search_path = public, pg_temp` | new | `anon`, `authenticated`, `service_role` EXECUTE; not PUBLIC (P; L: T8) | `POST /rest/v1/rpc/ingest_reading_activity_v1`, from the public-reading service worker or any direct caller | write: 1 row in `events` + 1 key row + counter rows (4 writes recorded, 3 duplicate, 2 other refusals, 1 `no_address`; local measure) (L) | the 2029 calculators, via the worker | anonymous (the anon key). A JWT never changes the stored actor class (L: T5) | high: public write. Bounds in P/L: address from `cf-connecting-ip` only (T6b), 60/min per address (T6), 120/min global for well-formed calls (T6d), size bounds (T11), closed schema (T4), exactly-once key (T2, T9, T10) | `traffic_intelligence_law` (v12 extension drafted, **not submitted**) |
| 2 | `public.fn_reading_activity_count_v1(text)` SECURITY DEFINER | new | owner only; revoked from public/anon/authenticated/service_role (P; L: T8) | internal helper, not an API surface | upsert of a counter row | called only by #1 | none (not callable through the API) | low | same |
| 3 | `public.fn_reading_activity_prune_v1(interval)` SECURITY DEFINER | new | `service_role` only (P; L: T8 anon/authenticated denied) | `POST /rest/v1/rpc/fn_reading_activity_prune_v1` with a service key | delete of key and counter rows older than the retention window (default 130 days) (L: T12) | a future scheduled retention job (**no job exists or is proposed to be scheduled**) | service role | low, but destructive: deletes only keys/counters, not events | same |
| 4 | `public.reading_activity_ids` (table) | new | RLS on, no policy; no access for public/anon/authenticated/service_role except `SELECT` for `service_role` (P; L: T8) | `/rest/v1/reading_activity_ids` | none through the API except service-role read | service-role projections | service role | low: holds a random id and first-seen time only | same |
| 5 | `public.reading_activity_outcomes` (table) | new | same as #4 | `/rest/v1/reading_activity_outcomes` | none through the API except service-role read | canary/projection (service key) | service role | low: `minute`, `outcome` (7 CHECK-enforced names), `n`. No address, no identity (L: T14) | same |
| 6 | `public.ingest_event(...)` (existing, recreated) | **existing** | EXECUTE by PUBLIC today as read earlier in this session (R, re-read before relying on it); ACL unchanged by the proposal (P) | `POST /rest/v1/rpc/ingest_event` | write: 1 `events` row (existing behaviour). The proposal adds one early `return` for `surface='gematria'` and the three reserved compute event types (L: T7 over 242 combinations; definition diff = the GUARD line) | the worker for allow-listed event types; any direct caller | anonymous | pre-existing public write; **this PR does not tighten or loosen it** other than the guard | existing owner (unchanged) |
| 7 | `public.edge_rate_limit_check(text,int,int)` (existing) | **existing** | not callable by `anon` on the replica (L: T8). The replica copy was built from the live definition; **its live ACL was not re-read for this draft (—)** | internal, called by #1 | upsert of a bucket row (hash key) | #1 | — | the only address-derived value is the key hash, ≈2 h retention, not readable by API roles (P/L) | existing owner (unchanged) |

## Dependencies on request context (P/L, not live-verified through PostgREST)
- #1 reads `request.headers` for `cf-connecting-ip` and `request.jwt.claims` for the account-id check.
- On the replica this is exercised by SQL setting the GUCs and by an HTTP shim that copies headers into `request.headers`. **That is not PostgREST.**
- Supporting (not verifying) evidence: the existing live `add_guest_community_message` reads the same header; 497,960 of 497,960 edge requests carried it (R/log read).

## Not verified (explicit)
1. **PostgREST end to end:** header and JWT-claim propagation through the real PostgREST. **OPEN / NOT VERIFIED.**
2. **Live ACL of the new objects:** they do not exist on the live project. Every ACL statement for #1–#5 is tier P or L only.
3. **Supabase security/performance advisors** have not been run against the proposal. Expect an advisor to note that a `SECURITY DEFINER` function in `public` is executable by `anon` (#1 and #6); that is the intended public contract and needs an explicit decision, not silence.
4. **API exposure of the tables (#4, #5):** that `public` tables with RLS-on, no policy and revoked grants are not readable through `/rest/v1` is shown on the replica only.
5. **Live `ingest_event` definition:** the proposal reproduces the definition read earlier; re-read and diff immediately before any migration (the PR's definition-equality test does this against the replica fixture, not the live database).
6. **Abuse behaviour under real Cloudflare/NAT traffic** is modelled from measured counts, not observed. A co-located abuser can starve one address for the rest of a minute (known limit, counted as `rate_limited_address`).
7. **No S2 evidence:** no negative tests against the live project, no CSP/transport review, no rollback drill. This inventory is an input to S1/S2, not a pass.

## Decisions this draft needs from ZURIEL (not taken)
- Is a public anonymous write RPC (#1) acceptable as an *intended public contract* under S2 ("intended public writes have explicit validation, bounded side effects and abuse/rate controls")?
- Should the existing PUBLIC EXECUTE on `ingest_event` (#6) be reviewed separately under S2? It is pre-existing and out of this PR's scope.
- Where the final inventory lives (this proposed folder, or the existing classified inventory the roadmap refers to). This file creates no new owner or registry.
