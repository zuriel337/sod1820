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

## Does `cf-connecting-ip` reach the function? (evidence, in order of strength)
1. **Production, existing behaviour (read-only):** the live `add_guest_community_message` reads `request.headers`, takes `cf-connecting-ip` first, **fails closed when there is no address** (`v_ip is null`), and 8 guest posts succeeded through it between 2026-11-05 13:40 and 20:18 UTC. Every success needed an address; `x-real-ip` never appears at the edge and `x-forwarded-for` appears on 0.17% of requests, so the address came from `cf-connecting-ip`.
2. **Edge logs:** `cf-connecting-ip` is present on 497,960 of 497,960 edge requests (100%).
3. **Supabase documentation:** "Securing your API" documents `current_setting('request.headers', true)` and its own example reads `headers->>'cf-connecting-ip'`.
4. **Still missing: an end-to-end run through the real PostgREST.** A staging run was prepared (a pinned PostgREST binary against the local database) but executing a downloaded binary was not permitted in this session, so it was not run and nothing was extracted. What the tests do prove: the function's behaviour for every header combination (`test/reading-activity-canary.test.mjs` and the SQL cases T6b/T6c), using an HTTP shim that copies incoming headers into `request.headers` *as the documentation describes* — this proves the function and the canary, not PostgREST itself.
   **Status (6.11.2026): the PostgREST proof stays OPEN.** Decision: no tarball without a verified official SHA256 (none obtainable here, search closed); the Docker route (official image pinned by digest) is not available either: the Docker client is installed but there is no daemon in this session (`/var/run/docker.sock` absent) and none was started. `scripts/run-reading-activity-postgrest-test.sh` is prepared but refuses to run until `test/reading-activity-postgrest.test.mjs` exists and an official digest is supplied. The shim and the documentation above are **partial evidence, not a full proof**.
5. **The decisive proof is the canary after the DB step is approved** (below): its first call must be `recorded`, never `no_address`.

## Canary (runs only after the DB step is approved and applied)
```
node scripts/canary-reading-activity.mjs --url https://<project>.supabase.co --anon-key <publishable key> \
     --expect-host <project>.supabase.co --confirm-write [--service-key <key>]
```
- Refuses without `--confirm-write` and without `--expect-host` equal to the target host; sends nothing in those cases.
- Two real calls with the same closed body: the first must be `recorded` (so `no_address` = 0: the header reached `request.headers`), the second `duplicate`.
- With `--service-key` it also reads `reading_activity_outcomes` and requires the `no_address` counter to be 0 since one minute before it started.
- Prints the explicit `activity_event_ids` it wrote; those ids are the only way these rows are told apart from real traffic. It writes one event row.
- Never prints a key. Exit code 0 pass, 1 assertion failed (the message says which rollout step is wrong), 2 refused.
- If the first call returns `no_address`: do not deploy the site; the header is not reaching the function.

## What the counter table stores
`reading_activity_outcomes` has exactly three columns: `minute`, `outcome` (one of seven enumerated names, enforced by a CHECK) and `n`. No address, no hash of an address, no identity, no free text. `reading_activity_ids` has exactly a random UUID and a time. SQL case T14 scans every stored row of every application table for the test addresses and finds none. The only address-derived value anywhere is the existing limiter's `key_hash` (a SHA-256 of a namespaced address, kept at most about two hours, not readable by API roles).
