# Decision document (updated) — `ingest_reading_activity_v1` — DRAFT, READ-ONLY

**For ZURIEL. Nothing here is applied.** No migration, canary, deployment, ACL change, code change or merge is performed or implied.
Everything marked *sketch* is untested text. `ingest_event` is reviewed separately in `ingest_event_public_execute_risk_DRAFT.md`
and is not part of this decision.
Evidence tags: **V** live read-only query (6.11.2026) · **L** local replica · **P** proposal text · **—** not verified.

---
## 1. Verifying A1 — does `cf-connecting-ip` hold, and can it be forged?

A1 has two separate halves; different methods prove different halves.

| Half | Question | Proven by |
|---|---|---|
| **A1a — propagation** | Does PostgREST put the incoming `cf-connecting-ip` into `request.headers` (and JWT claims into `auth.uid()`)? | M3 (real PostgREST) or the post-migration canary (M4) |
| **A1b — unforgeability** | When a client sends its own `cf-connecting-ip`, is it replaced by the edge (so the function sees the true client address)? | M1 or M2 only. **M3 and M4 do not prove this** |

| # | Method | Needs | Writes? | Proves | Does not prove |
|---|---|---|---|---|---|
| **M1** | **Forged-header probe, before any migration.** Send one harmless `GET /rest/v1/?probe=<uuid>` to the public API with a forged `cf-connecting-ip: 203.0.113.77` (documentation range), then read the edge log (read-only `query_logs`, the same source as the earlier 497,960/497,960 count) for that marker and compare the logged client-address header with the sender's real egress address | an explicit OK to send one request to the production API; the log field that records the header | none in the database; one read request | A1b *as seen by the edge log layer*: if the log shows the real address, the edge replaced the forged one | whether the log is recorded before or after the rewrite (—); anything about the function |
| **M2** | **Black-box probe after the migration, with no event rows.** Send ~70 calls with a deliberately invalid body (e.g. `p_event_type='probe'`) from one real address, each with a *different* forged `cf-connecting-ip`. The limiter runs before schema validation, so each call spends address budget but writes no event. Read the counters with the service key | the DB step applied; ZURIEL's OK for ≤ 70 calls | counter rows only (`rejected_schema`, `rate_limited_address`) and limiter buckets (~2 h) | **A1b end to end:** forged values honoured → 70 × `rejected_schema`; replaced by the edge → first 60 `rejected_schema`, then 10 × `rate_limited_address`; appended/malformed → `no_address` (fail closed) | nothing beyond the header. It spends that address' budget for a minute |
| **M3** | **Real PostgREST run (PostgREST proof, currently OPEN).** `scripts/run-reading-activity-postgrest-test.sh` + `test/reading-activity-postgrest.test.mjs` (not yet written) against a throwaway local database. Cases: header → `recorded`; header-name case-insensitive; `x-forwarded-for`/`x-real-ip` only → `no_address`; `cf-connecting-ip` wins over a spoofed `x-forwarded-for`; IPv6 /64 key; JWT `sub` equal to the id → `account_id`; anon cannot call prune or read tables; oversize body rejected | **either** an official SHA256 for `postgrest-v12.2.8-linux-static-x86-64.tar.xz` **or** a Docker daemon plus an official image pinned by digest (neither available now). No bypass of the security environment | none (local) | A1a and the JWT-claim path through real PostgREST | A1b (the local run has no Cloudflare) |
| **M4** | **Canary after the migration** (`scripts/canary-reading-activity.mjs`). `recorded` then `duplicate`; optional `no_address` counter = 0 | DB approval | 1 event row + 1 key row (listed by explicit `activity_event_id`) | the header **is present** end to end on the real path | unforgeability |

**Recommended order:** M3 (A1a, no production contact) → decision on M1 (A1b, one read request) → migration → M4 → M2 (A1b, confirmed on the real function).
If neither M3 nor M1 can be done, A1a is proven only at M4 and A1b only at M2, i.e. *after* the objects exist. That is acceptable only as an explicit Human-Gate decision, with the global/daily bounds below as the safety net.

---
## 2. Caps — daily and global — with measured effect

**Measured baseline (V, last 30 days, `gematria/compute` legacy rows, 29 days with data):** busiest day **742**, average **356/day**, busiest minute **19** (earlier wider window: 22), p99 minute **12**; database size **2,100 MB**.
**Row cost (measured on the replica, L):** 424 B event + 48 B key = **472 B**. Events are kept 120 days; keys 130 days.
Arithmetic below is simple multiplication, not an observation of any attack.

| Setting | Max rows/day | Max/day | Max over 120 days | vs. DB now (2,100 MB) | Headroom over observed peak | Real loss at observed traffic |
|---|---|---|---|---|---|---|
| **Current: 60/addr/min, 120 global/min, no daily cap** | 172,800 | 81.6 MB | **9.8 GB** | 4.7× | 5.5× the 22/min peak | none |
| Global 60/min (no daily cap) | 86,400 | 40.8 MB | 4.9 GB | 2.3× | 2.7× | none |
| Global 40/min (no daily cap) | 57,600 | 27.2 MB | 3.3 GB | 1.6× | 1.8× | none |
| **Daily cap 10,000** | 10,000 | 4.7 MB | 566 MB | 27% | 13× busiest day | none |
| **Daily cap 5,000** (my suggestion) | 5,000 | 2.4 MB | **283 MB** | 13% | 6.7× busiest day, 14× average | none |
| Daily cap 3,000 | 3,000 | 1.4 MB | 170 MB | 8% | 4× busiest day | none |
| *Real traffic for scale* | 356 avg / 742 max | 0.17 MB | ~20 MB | 1% | — | — |

Reading the table:
- **No setting above loses real events at observed traffic** (all caps exceed the observed maxima); a lost event would appear as a `rate_limited_*` outcome, so loss is visible.
- **The trade-off of a daily cap:** it bounds inflation and storage hard, but an attacker who reaches it **starves real measurement until the day rolls over** (today per-minute starvation heals the next minute). Mitigations: a daily cap is only a ceiling that triggers an alarm (`rate_limited_daily > 0` should be investigated that day); keep per-address limits so one address cannot reach it alone; choose the cap with headroom so organic growth does not hit it. Public launch will raise traffic above the current baseline, so a review point after the first full day is needed.
- A **per-minute global of 120 was set by ZURIEL as an opening value**; at that value the ~5× headroom over the observed peak is the part that matters. Lowering it to 60 halves the worst-case inflation rate but does not bound the day.
- The existing limiter (`edge_rate_limit_check`) cannot express a daily cap: its window is clamped to 60–3600 s and its limit to 1–120. A daily bound therefore needs a small new counter (below), which is a new table and needs approval.

**Daily cap — sketch (NOT APPLIED, untested):**
```sql
-- new counts-only table (no address, no identity)
create table if not exists public.reading_activity_daily (
  day date primary key,                       -- UTC day
  n   bigint not null default 0
);
alter table public.reading_activity_daily enable row level security;
revoke all on public.reading_activity_daily from public, anon, authenticated, service_role;
grant select on public.reading_activity_daily to service_role;

-- outcomes: allow one more enumerated name
-- alter table public.reading_activity_outcomes drop constraint <check>, then re-add with 'rate_limited_daily' included

-- in ingest_reading_activity_v1, after the global ceiling and BEFORE the key insert:
--   if coalesce((select n from public.reading_activity_daily where day = (now() at time zone 'utc')::date), 0) >= c_daily_limit then
--     perform public.fn_reading_activity_count_v1('rate_limited_daily');
--     return jsonb_build_object('status','rate_limited','reason','daily_ceiling');
--   end if;
-- and AFTER a successful (non-duplicate) event insert:
--   insert into public.reading_activity_daily(day,n) values ((now() at time zone 'utc')::date, 1)
--   on conflict (day) do update set n = public.reading_activity_daily.n + 1;
-- Concurrency note: check-then-increment can overshoot the cap by at most the calls in flight (the global ceiling bounds that to ≤ 120/min).
```
Tests that would be required before use: cap reached → exactly `cap` recorded, remainder `rate_limited` with the `daily_ceiling` reason and counted; duplicate does not consume the cap; day rollover; rollback leaves the counter unchanged; privacy scan (T14) extended; mutation test of the new guard.

---
## 3. Removing `service_role` from EXECUTE — sketch only (NOT APPLIED)

Reason: the beacon is anonymous; no caller uses `service_role` for this RPC (the canary calls it with the anon key and uses the service key only for REST `select` on the counter table). Granting it adds an unneeded path.

In the proposal (line 178 today), the one-line change would be:
```sql
-- today
grant execute on function public.ingest_reading_activity_v1(text, text, text, jsonb) to anon, authenticated, service_role;
-- proposed
grant execute on function public.ingest_reading_activity_v1(text, text, text, jsonb) to anon, authenticated;
```
If it were ever applied first and needed undoing:
```sql
revoke execute on function public.ingest_reading_activity_v1(text, text, text, jsonb) from service_role;
```
Would also need updating (not done): the ACL comment block in the proposal header, `tests/sql/reading_activity_v1.sql` T8 (the `has_function_privilege('service_role', …)` assertion becomes a *denial* assertion), the README ACL table, `rpc_inventory_draft_…` row 1 and `threat_model_…` §2.
Effect on measurement or storage: none. Effect on callers: a service-key call to the RPC would fail with `42501` (no such caller exists in the repository).

---
## 4. Acceptance conditions before any migration (none met yet)

| # | Condition | Evidence required | Status today |
|---|---|---|---|
| 1 | **A1a proven** | M3 passes, or an explicit written decision to rely on M4 | open (M3 blocked: no official digest, no Docker daemon) |
| 2 | **A1b decision** | M1 result recorded, or an explicit written decision to accept A1b being proven only at M2 | open |
| 3 | **PostgREST proof** for the JWT claim path (`auth.uid()`), role switching, and the REST-level ACL denials (anon cannot call prune or read tables) | M3 test output | open |
| 4 | **ACL / RLS on the live project** after the migration, by direct query | `pg_proc.proacl` of the three functions and `ingest_event` unchanged; `relrowsecurity` and table grants of the two (or three) tables; expected ACLs are in `reading_activity_v1.sql` header | not possible before the migration |
| 5 | **`ingest_event` baseline** | Re-read immediately before applying: md5 of its definition must still be `ed1d68fee90d27818219a0c18121bace` (1295 chars; read today, V). After applying, the expected md5 is `0f954d6c63c8ca8822f7a8b7a5d10aa6` (1422 chars, computed locally from the proposal text, **to be confirmed** after the migration) | baseline read ✔ today; post-state open |
| 6 | **Advisors before/after** | `get_advisors(security)` diff: only the expected +1 `anon_…`/`authenticated_security_definer_function_executable` entry (295 today, V); no new ERROR | before ✔ (6 lint groups today), after open |
| 7 | **Transport / CSP** | (a) CSP `connect-src` already allows the project host `https://linswmnnkjxvweumprav.supabase.co` (P: `public-reading-deploy/vercel.json`), so no CSP change is expected — to be confirmed in a real browser run; (b) the built service-worker artifact exercised against a stub RPC: allowed body forwarded, wrong body refused, replay refused, size/rate caps, JWT `sub` guard, `ingest_event` handling unchanged; (c) CN/SG quarantine regression and bad-bot behaviour unchanged on the new route | unit/mutation tests exist (L-equivalent for the worker); the real-browser/built-artifact run and (c) **not done** |
| 8 | **Rollback drill** | The statements in the proposal header executed on the replica: `ingest_event` md5 returns to `ed1d68fe…`, the new objects are gone, and the old site/worker still work; plus the written order (site → Edge → DB) | statements written; **drill not run** |
| 9 | **Caps decision** | ZURIEL's choice of the global and daily values (§2) and of removing `service_role` (§3); the SQL and tests updated and re-run before approval | open |
| 10 | **Canary ready** | `scripts/canary-reading-activity.mjs` with `--confirm-write` and a matching `--expect-host`; stop conditions: `no_address` → stop, do not deploy the site, roll back the DB step; non-`duplicate` second call → stop | prepared, not run |
| 11 | **Ownership and inventory** | `work_log` ownership/AFTER for this task; inventory entry in the owner's list; the v12 law draft is still local only | open |
| 12 | **Separate approvals** | DB (with the exact SQL and ACL), then Edge, then site (exact SHA and deployment), each its own approval; merge separate | none given |

## 5. Post-launch checks (after any approved rollout)
First 24 h: `rate_limited_address`, `rate_limited_global`, (and `rate_limited_daily` if added) counters; `no_address` = 0; `recorded` vs. observed 19–22/min peak; row growth per day against the table in §2.

## 6. Decisions requested (none taken)
1. Which A1 route: M3 (needs a digest or a Docker daemon), M1 (one read request to production), or accept proving it at M4/M2.
2. Caps: keep 60/120 as set, lower the global, add a daily cap (suggested 5,000), or a combination.
3. Remove `service_role` from EXECUTE: yes / no.
4. Whether these changes are made in this PR (SQL + tests) or deferred.
