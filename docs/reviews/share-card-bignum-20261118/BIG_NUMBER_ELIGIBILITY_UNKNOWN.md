# Big-number crawler eligibility — the uncertain state (ZURIEL 18.11.2026)

Status: BRANCH-ONLY (`ccr-dcadb071-v1z5ol-bignum`, base `origin/main` 270bfab6a). Not merged, not deployed.

## Scope of the decision

A focused decision for **one state only**: the edge cannot tell whether a pure big-number page (`/number/NNNNN`, five digits or more)
is eligible for crawlers, because the eligibility source failed and there is no copy that may be relied on.
It does not change the bot policy, the eligibility rule, or any other block.

| State | Answer to the crawler | Before |
|---|---|---|
| Eligible (value in a usable list) | page served | same |
| Not eligible (usable list without the value) | **403**, no-store | same (not changed to 404: "not eligible for indexing" is not "no content") |
| Unknown (source failed / timed out / unusable answer, no copy under 24 h) | **503**, `Retry-After: 120`, no-store, body "Temporarily unavailable" | 403 (fail-closed), or an unbounded wait |
| Already refused for an independent reason (bad bot, private path, country) | unchanged; the eligibility source is not called | the source was called and could overwrite nothing, but cost a read |

Rejected: pass-through on failure ("the bot gets the page when the DB does not answer") — not approved by ZURIEL.

## Owner chain

`public.sitemap_numbers()` (canonical Number publication/indexability gate, Human Gate 7.9.2026, migration
`20260907040000_big_number_one_publication_gate_v1.sql`) → compatibility adapter `public.content_big_numbers()` (integer[] > 9999) →
`edge-big-number-eligibility.js` (timing and the three-way decision only, no list of its own) → `middleware-core.js` → crawlers.
The DB comment there still says "fails closed when this RPC is unavailable"; the 503 keeps that intent (nothing is served) and only
tells crawlers the refusal is temporary. No DB change.

## Timing and why

Measured on the live project (Vercel observability, outgoing requests to `rpc/content_big_numbers`, 11–18.11.2026):
330 reads, all HTTP 200, p50 244 ms, p99 700 ms, **max 786 ms**. Payload 25 bytes (4 values on 18.11).

- Fresh copy: 60 min (unchanged).
- Copy 1–24 h old: decides at once; one background read replaces it. A failed read never removes a usable copy.
- No copy / copy over 24 h: the crawler waits for one read, at most **1,500 ms**. 800 ms (the post-route value) sits just above the
  slowest real read and would turn ordinary slow reads into 503s, now that failure means 503; that path is fail-open, this one is not.
  1,500 ms ≈ 2× the observed max and is paid only by the first crawler on a cold instance.
- After a failed read: 30 s without new reads; crawlers in that window get the 503 at once.
- Concurrent crawlers on a cold instance share one read.
- Validation: HTTP ok, JSON array, every value a safe integer > 9999, at most 100,000 values. Anything else is unusable.

## Crawl log

`log_crawl` has one boolean (`p_blocked`). The 503 is logged as `p_blocked = true` (not served). Separating "unknown" from
"not eligible" in `crawl_daily` would need a DB change — not proposed here.

## Tests

`test/edge-big-number-eligibility.test.mjs` (unit + the real middleware, one fresh instance per test), in `live-contracts-2029.yml`.
