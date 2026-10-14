# RPC draft correctness repair (task CLAUDE_2029_RPC_DRAFT_CORRECTNESS_20261014)
LOCAL LAB ONLY · BRANCH_ONLY · nothing applied to any live DB · base PR1100 `5dd4afaa` (d34a910c is NOT an ancestor of that base → originals copied verbatim to `provenance-d34a910c/`, unchanged).
Reproduce: `./run_all.sh` on a local Postgres 16. Lab = synthetic data, live function/registry/RLS *definitions* (read-only catalog queries), no live rows.

## Results (counterexample → reproduced on old draft → repaired → result)
| # | Issue | Old draft (d34) | Corrected candidate | Evidence |
|---|---|---|---|---|
| 1 | posts number boundary semantics (leading zero, 00/0, 10-digit ints, negatives) | `posts_by_number_strict_v2`: **44 / 11,363** cases differ (e.g. -787, -2147483648 missed) | `posts_by_number_strict_v3`: text keys = maximal digit run (+`-run` when `-` not preceded by a digit) ⇒ exactly the old regex; **0 / 11,363** differ | 24/25 |
| 2 | nullable `wp_id` key drops posts | keyed by wp_id | keyed by `posts.id` (PK); `wp_id` only an output column; NULL-wp_id posts kept | corpus has NULL wp_id rows; 0 diff |
| 3 | InitPlan generator collapses to 1 method | reproduced: 1 distinct method / 1000 rows (`00_repro_initplan.sql`) | hash-seeded per-row generator + hard assertion before any timing; 36 methods incl. unregistered, NULL | 01 |
| 4 | `mflags` inner join drops NULL-method rows | `fn_number_lookup_v2`: **72 / 169** cases differ per role (e.g. 787: 93 vs 88 rows) | `fn_number_lookup_v3`: NULL-safe join (`is not distinct from`) — only change vs d34 v2; **0 / 169** differ for owner, anon, authenticated | 10/11 |
| 5 | CREATE TABLE AS snapshot | snapshot | `post_number_keys` + trigger (insert/delete/update of title,tags) + `pnk_rebuild()` + `pnk_verify()` drift detector; insert/update/tags→null/unrelated update/delete/injected drift→rebuild all 0/0; anon + RLS-inheritance (hidden post's keys invisible) | 26 |
| 6 | weak equivalence checks | EXCEPT (set), own cursor | `EXCEPT ALL` two-way on whole-row jsonb + ordered-array equality + total_count; identical input cursor (taken from OLD page 1); limit NULL/0/-5/1/20/500/501/100000; cursors none/mid/page row/unknown/NULL-method row; values incl. none/0/-1/NULL | 10 |
| 7 | roles | — | lookup (INVOKER) tested as owner/anon/authenticated with replicated live RLS policies (bidim policy needs verified+published word; words policy hides encrypted). Dossier groups block JSON-equal for 9 values × 3 roles. **Not proven:** live `fn_number_dossier` is SECURITY DEFINER (bypasses RLS); the composite stub `fn_composite_calc` means timings are not end-to-end | 12 |
| 8 | `get_category_videos_v2` | — | limit-before-regex equal: date-sequence equal, subset-of-full, full multiset equal when unlimited; limits NULL/0/1/5/60/100/1000 with heavy date ties and NULL dates | 27 |

## Genuine old nondeterminism (reported, not strengthened)
- `posts_by_number_strict` / `get_category_videos`: ties on (rank,date) have unspecified order in the old code. v3 adds `p.id` as final tiebreak (a refinement inside the old's allowed outputs); tests therefore compare (rank,date) sequences and subset-of-full-set, not row identity, for limited pages.
- Old negative `lim` raises error; v3 identical (limit passed through). Lookup `bid_id` is unique so lookup order is total (ordered equality holds).

## Timing (local lab, owner role, warm cache, 3 runs each, ms; same seed/data; composite calc is a STUB ⇒ lower bound for old, not end-to-end)
Distribution (rows / methods / NULL-method / unknown-method): 787: 132/35/10/10 · 7871: 1,076/36/70/65 · 7872: 10,606/36/711/580.
| value (hits) | old `fn_number_lookup(v,20)` | v3 | 
|---|---|---|
| 787 (132) | 11.7–11.9 | 3.2–3.5 |
| 7871 (1,076) | 102–106 | 9.0–9.7 |
| 7872 (10,606) | 942–1130 | 65–88 |
Dossier convergences, 7872: cur 1067–1184 → grouped 25–26. Raw: `results_number_dossier_timing.txt`.
Not measured here: posts (x100) timings (correctness only at 3,000 posts; d34's 423→0.13 ms is NOT re-verified), concurrency, cold cache (environment can't model honestly). Hit counts differ from d34 (background rows add to test values). These numbers do not show RPC fixes alone solve the 4–7 s entry; they address one helper-growth cause.

## Remaining gaps before any live use (Human Gate + GPT domain-owner review)
1. Migration for `post_number_keys`/trigger/functions not written as migration (DRAFT SQL only: 22/23 + 02); trigger/backfill rollout, locking and write-path cost on live `posts` untested; live `posts.id` may be bigserial (lab used identity; `id` updates not tested).
2. Live fn_number_dossier (SECURITY DEFINER) not retested end-to-end with v3; callers still use old names (switch is separate gated step).
3. NULL-method rows: live count 0 observed, contract not proven; v3 preserves old behavior regardless.
4. Rollback: nothing deployed; drop lab objects / delete branch. If later applied: drop trigger, functions v3, `post_number_keys`.

## States
DOCUMENTED yes · IMPLEMENTED (local lab SQL) yes · TESTED (local lab only) yes · BRANCH_ONLY yes · MERGED no · DEPLOYED no · LIVE_VERIFIED no.
