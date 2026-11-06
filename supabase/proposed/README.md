# supabase/proposed — NOT migrations, NOT applied

Nothing here is applied by any tool. A file moves to `supabase/migrations/` only after ZURIEL approves its exact statements.

| File | What | Proof |
|---|---|---|
| `reading_activity_v1.sql` | RPC `ingest_reading_activity_v1`, key table `reading_activity_ids`, counter table `reading_activity_outcomes`, prune function, one-line guard in `ingest_event` | `bash scripts/run-reading-activity-sql-test.sh` (throwaway local Postgres; replica of the live objects) |
| `els_search_metric_v1.sql` | read-only reference query of the ELS search metric | `bash scripts/run-reading-activity-sql-test.sh --with-els` (runs the real `els-search-bridge` handler) |

## Limits (one place, tuned from live data of 2026-11-06)
- per address: **60 / minute** (`cf-connecting-ip` only; IPv6 by /64). Live site-wide maximum compute in any minute: 22; p99: 13; at most 3 sessions in the same minute.
- global: **120 / minute** (the maximum `edge_rate_limit_check` allows). Evaluated only for well-formed calls.
- size: text arguments 32 characters, props 1024 bytes (the worker refuses a body over 1024 bytes first).
- cost per call (measured): recorded 4 row writes, duplicate 3, global refusal 3, address/schema/size refusal 2, no address 1; about 0.2 ms; 424 + 48 bytes stored per recorded event.
- a refusal never changes the calculator: the call is fire-and-forget, never retried, and its answer is ignored.

## Deployment order (each step needs its own explicit approval)
1. **DB** — apply the proposal as a migration. Check: `ingest_event` differs from the live definition by exactly the line marked `GUARD`; ACL matrix (below); one controlled call from the owner's browser returns `recorded`, the same id again returns `duplicate`, and the `no_address` counter stays 0 (proves the trusted header reaches the function).
2. **Edge** — deploy `els-search-bridge` as two files (`index.ts`, `activity.js`). Independent of the site; only adds a label to engine spans.
3. **Site** — deploy the exact merged SHA with the documented Production procedure. The site calls the new RPC, so the DB step must already be live; before it, those calls fail closed (404) and nothing else breaks.
4. **Acceptance** — the owner's test computes are identified ONLY by an explicit list of `activity_event_id` copied from the network panel; never by time window, address or session.
GA4 (stage A) is separate and is not part of this order.

## ACL
| Object | anon | authenticated | service_role | PUBLIC |
|---|---|---|---|---|
| `reading_activity_ids` (RLS, no policy) | – | – | SELECT | – |
| `reading_activity_outcomes` (RLS, no policy) | – | – | SELECT | – |
| `ingest_reading_activity_v1` | EXECUTE | EXECUTE | EXECUTE | – |
| `fn_reading_activity_count_v1` | – | – | – | – (owner only) |
| `fn_reading_activity_prune_v1` | – | – | EXECUTE | – |
| `ingest_event` | unchanged: executable by PUBLIC, as today | | | |

## Rollback
See the header of `reading_activity_v1.sql`. The three new objects can be dropped without touching any other family; restoring `ingest_event` removes only the guard. Rows written by the beacon are identified by `props->>'beacon' = 'v1'` and are deleted only on explicit approval.
