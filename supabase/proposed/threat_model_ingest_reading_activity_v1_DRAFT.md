# Threat model — `ingest_reading_activity_v1` (public anonymous write RPC) — DRAFT

**DRAFT. Not an approval, not an S2 result, not a security claim.** Nothing here changes a database, an Edge Function, the
site or GA4. The RPC does not exist on any project yet.

## Evidence legend (kept separate on purpose)
| Tag | Meaning |
|---|---|
| **P** | Proposal text (`supabase/proposed/reading_activity_v1.sql`), read as text only |
| **L** | Local replica: a disposable Postgres built from live definitions. Proves the function and its privileges *on the replica* — **not** the live project, **not** PostgREST |
| **V** | Live, read-only query on `linswmnnkjxvweumprav`, 6.11.2026 (queries are listed at the end) |
| **—** | Not verified |

A local-replica pass is never used below as proof that the live system is secure.

## 1. What the function does (P)
Anonymous caller sends `(event_type, path, app_context, props)`. It reads the address from `request.headers->'cf-connecting-ip'`
(fail closed if absent), applies a per-address limit (60/min) then size bounds, a closed schema, an account-id guard, a global limit
(120/min), then writes one key row (`activity_event_id` PK) and one `events` row with server-set `actor_class='unknown'`.
Every refusal increments a counter row. It is `SECURITY DEFINER`, owner `postgres`.

## 2. Control-by-control
| Control | Proposal (P) | Local replica (L) | Live (V) | Not verified (—) / residual |
|---|---|---|---|---|
| **SECURITY DEFINER** | needed: `anon` cannot write `events` or the key table | T1, T8 | live owner of comparable functions is `postgres` (V) | the new function's owner on the live project will be whoever runs the migration |
| **search_path** | `public, pg_temp`; all tables schema-qualified; `auth.uid()` qualified; other calls resolve from `pg_catalog` first | — | `anon` and `authenticated` have **no** `CREATE` on schema `public` (V), so they cannot plant shadowing objects there | search-path hijack by another role holding CREATE was not enumerated (—) |
| **ACL** | `revoke … from public`; `execute` to `anon, authenticated, service_role`; helpers owner-only / service_role-only | T8 (anon/authenticated denied on prune and counter helper, tables unreadable) | functions created by `postgres` default to **no PUBLIC execute** (default ACL `postgres:f:{postgres=X}`) (V), so the explicit `grant` is what opens the RPC | live ACL of the new objects cannot exist yet (—). **`service_role` execute on the RPC is not needed by any caller (the beacon is anonymous); removing it is a least-privilege option, not applied** |
| **RLS / direct table access** | RLS on both tables, no policy, `revoke all` from public/anon/authenticated/service_role, `select` to `service_role` | T8 (42501 for anon/authenticated read & write; service_role cannot write) | default table privileges for `postgres`-created tables give `service_role` full rights and **not** `anon/authenticated` (V); for `supabase_admin`-created tables they also give `anon/authenticated` (V) — the explicit revoke in the same transaction covers both | live RLS/grants after migration (—) |
| **Validation** | closed schema, enums, UUID v4 regex, text ≤ 32 chars, props ≤ 1024 bytes | T4 (20 deviations rejected, nothing written), T11 | observed legacy `events.props` maximum in 7 days is 967 bytes (V) — a 1024-byte cap is not tight for *this* RPC's 6-key body, which is far smaller | the maximum request-body size accepted by the gateway/PostgREST before the function runs (—). Parsing happens before the function's size check |
| **Rate limits** | 60/min per address (IPv6 by /64), 120/min global for well-formed calls; both via the existing `edge_rate_limit_check` | T6, T6b–T6e, concurrency 100/150-way | `edge_rate_limit_check` is executable only by `postgres` and `service_role` (V), so `anon` cannot call it directly | whether `cf-connecting-ip` can be forged or is always rewritten by the edge for every path to the project (—); behaviour under real NAT (—) |
| **Duplicates** | PK on `activity_event_id` in the same transaction | T2, T3, T9, T10 | — | dedupe is **not live-verified** until the canary and acceptance |
| **Counters** | enumerated outcomes only; no address, no identity | T13, T14 | — | — |

## 3. Abuse scenarios
| # | Scenario | What an attacker can do (P/L reasoning) | Bound | Residual / decision needed |
|---|---|---|---|---|
| A1 | **Forged or missing address header** | If an attacker can set `cf-connecting-ip` they pick their own bucket key and escape the per-address limit | still capped by the global limit (120/min); missing header → refused, counted as `no_address` | **Not verified** that every path to the project rewrites the header. Supporting evidence only: present on 497,960/497,960 edge requests; an existing live function relies on it. The canary shows presence, not unforgeability |
| A2 | **Metric inflation with valid fake beacons** | Anyone can send well-formed beacons; they are recorded as `unknown` and cannot be told apart from real ones | ≤ 60/min per address, ≤ 120/min total = up to **172,800 rows/day**; real traffic peaked at 22/min (p99 13) | The limits are ZURIEL's temporary opening values. 120 is ~5× the observed peak. A lower global cap or a daily cap would reduce the inflation ceiling; `measurementHealth` makes under-counting visible but **cannot detect over-counting** |
| A3 | **Storage growth** | Sustained abuse at the ceiling | ≈ 424 + 48 bytes per recorded row → about **80 MB/day, ~9.8 GB over the 120-day event retention** (arithmetic from measured per-row size, not an observed event). Keys are kept 130 days | No daily cap exists. Database size headroom was not checked (—) |
| A4 | **Starving the global budget** | Two cooperating addresses (60 + 60) can use the whole 120/min and make real users' beacons `rate_limited_global` | measurement loss only, for one minute at a time, counted | Accepted in design; it is a denial of *measurement*, not of the site |
| A5 | **Shared-address (NAT) starvation** | A co-located abuser can exhaust one address for the rest of the minute | same as A4, per address | Known and tested (L: T6e); counted as `rate_limited_address` |
| A6 | **Limiter-row cardinality** | Many distinct addresses (IPv6 /64 rotation) create many bucket rows | rows live ≈ 2 hours; each call costs 2–4 writes | Same exposure class as the existing guest-post limiter. Not load-tested against a real distributed source (—) |
| A7 | **Hot counter rows** | Calls without a header all update one `(minute,'no_address')` row | only reachable if the header is absent; ordinary refusals are capped per address | Low; not load-tested live (—) |
| A8 | **Existence oracle** | `recorded` vs `duplicate` tells a caller whether an id was seen | ids are random v4 UUIDs, nothing sensitive stored | Low |
| A9 | **Account-id as random id** | A signed-in caller reusing their own user id as an id | rejected (`rejected_account_id`, L: T5) | An attacker could "burn" another user's id only if they knew it; effect is nil |
| A10 | **Error disclosure** | Unexpected exceptions return PostgREST error text to `anon` | the live `events` table has partitions `events_2026_10…12` **and** a default partition (V), so a missing monthly partition does not raise | Message content of other exceptions not enumerated (—) |
| A11 | **Bypassing the RPC through the generic `ingest_event`** | Anyone can call `ingest_event` directly (see the separate risk note). The guard blocks only `surface='gematria'` with the three reserved types | other surfaces are not blocked | **Design requirement:** any compute projection must select `surface='gematria'` **and** the three reserved event types **and** join to `reading_activity_ids` on `activity_event_id`. Existing live compute-type rows use other surfaces/types (3 rows `calculator_2029/first_compute` in the last 30 days; 1,929 rows `gematria/compute` — a different, older event type — in the last 7 days; V). That projection is not written yet (Phase 2) |
| A12 | **Replaying a captured beacon** | Same id again | `duplicate`, counted | — |

## 4. Does it meet S2? (my reading of `docs/2029-security-hardening-gate-plan-v1.md`; for ZURIEL to confirm)
S2 is the **blocking gate before the Public Cutover Human Gate**, evidence-based. It is not a precondition for applying this proposal,
but it is the standard this RPC will be judged against, so each S2 database/API line is mapped below.

| S2 requirement | Status for this RPC |
|---|---|
| Every externally reachable privileged RPC used by the public slice is classified | **Partial:** draft inventory exists (`rpc_inventory_draft_reading_activity_v1.md`); not recorded in the owner's inventory |
| anon/authenticated EXECUTE removed from admin/server-only mutations | n/a — this is an *intended public* write. Its two helpers are not callable by anon (P, L) |
| Intended public writes have explicit validation, bounded side effects and abuse/rate controls | **Designed (P) and exercised on the replica (L); not live-verified (—).** Bounded per minute, **no per-day bound**, and the address-trust assumption (A1) is unproven |
| Owner-bound writes prove ownership with negative tests | n/a — no ownership |
| Admin actions prove an explicit admin boundary | n/a |
| SECURITY DEFINER reachable from public roles: fixed `search_path`, least privilege | `search_path` fixed (P). Least privilege: **not minimal** — `service_role` execute is unnecessary |
| RLS + grants + function privileges tested together | **Replica only (L).** Live: not possible before the migration |
| No service-role secret shipped to the browser | Site/worker use the anon key only (code, P). The canary's service key is an operator argument, not shipped |
| Edge/route and browser/transport items (CN/SG quarantine regression, CSP) | **Not tested** for the new worker route (—) |
| Release/recovery: rollback tested | Rollback is written (P); **not drilled** (—) |

**Conclusion:** the RPC is a *designed-as-bounded intended public write*, which S2 allows in principle, but it **cannot be recorded as
meeting S2**: live evidence does not exist, A1 is unproven, there is no daily bound, and the transport/CSP and rollback items are untested.
Context: the live advisors already list **295** `SECURITY DEFINER` functions executable by `anon` (V), so this would be the 296th, not the first.
It does not by itself trigger an S0 stop-and-fix condition (it has an intended public contract and guards). Adding it to the anon-executable
surface is a decision for the Human Gate, to be recorded explicitly; it does not need an "S2 exception" unless ZURIEL wants to apply it
*before* A1 is verified or without a daily bound — in that case I recommend the decision say so in writing.

## 5. Options for ZURIEL (none applied)
1. **Proceed as designed**, accepting A1/A2/A3 as stated, with the canary and a post-launch review of the limits.
2. **Tighten first (SQL-only edits in this proposal):** remove `service_role` execute from the RPC; consider a lower global cap (e.g. 60/min, since the observed peak is 22) and/or a daily cap; keep everything else.
3. **Hold** the DB step until A1 is verified (PostgREST run or a forged-header check on a branch), then decide.

## 6. Live queries used (read-only)
`pg_proc` ACL/`prosecdef`/`proconfig` for `ingest_event`, `edge_rate_limit_check`, `add_guest_community_message`; `has_schema_privilege` on `public`;
`pg_default_acl`; partition names of `public.events`; presence of the new tables (absent); `md5(pg_get_functiondef)` of `ingest_event`
(`ed1d68fee90d27818219a0c18121bace`, 1295 chars — **identical** to the proposal's recreated body minus the `GUARD` line); aggregate counts of recent
`events` by `surface/event_type` (no row contents); `get_advisors(security)`. No write of any kind.
