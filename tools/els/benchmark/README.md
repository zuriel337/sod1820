# ELS multi-strategy benchmark (branch-only prototype)

Assignment `G3_ELS_MULTI_STRATEGY_BENCHMARK_PROTOTYPE_V1` (work_log 5787ecbb…). **Not an engine, store, registry or truth owner.**
One truth (exact occurrence: letters at `start ± k·skip` equal the term, zero-based coordinates, `corpus_id`, replay verifier);
multiple *execution strategies* under the existing single ELS boundary (`els_single_engine_law`).

| id | what it is |
|---|---|
| `EXACT_EXHAUSTIVE_V1` (A) | complete occurrence set, canonical order (skip, start, dir desc), cap = first-N. No early exit. |
| `ANCHOR_FAST_V1` (B) | rarest-letter-pair anchor, corpus-order scan, early exit at cap (half-cap per direction, leftover flows). Prefix ⇒ SAMPLED when cap hit. |
| `HYBRID_COVERAGE_V1` (C) | same anchor generator + stratified policy: direction × 8 corpus-position segments × 4 log-spaced skip bands, work-fair round-robin with doubling work slices, leftover quota redistributed, work budget 3e7 pair-examinations. Every hit exact-verified. |
| legacy baseline | `findAll` extracted **verbatim** from `els-code.template.html` (incl. `fwdDisperseTopUp`), run in a worker. Observational only. |

Completeness semantics: a scan that finishes without hitting the cap or budget is `EXHAUSTIVE_COMPLETE` (results re-sorted canonical; only then may `not_found_authoritative` be true).
Otherwise `SAMPLED_PARTIAL_CAP | SAMPLED_PARTIAL_WORK_BUDGET | TIMEOUT` with `strategy/policy/version` in `meta`, `exhaustive:false`, `not_found_authoritative:false`.

## Run
```bash
node --expose-gc tools/els/benchmark/run.mjs --runs 5 --deadline 30000   # matrix → results/benchmark-results.json
node tools/els/benchmark/pg-baseline.mjs                                # canonical SQL generator on throwaway local PG
node tools/els/benchmark/report.mjs                                     # → results/BENCHMARK_RESULTS.md
node --test test/els-strategy-benchmark.test.mjs                        # 12 tests (oracle equality, 0 FP, provenance, Goldens)
```
Inputs: canonical `tools/els/data/tk-letters.txt` (hash-admitted: 1,204,583 letters, md5 `baf16185…`, torah `0066c243…`, suffix `f62203f8…`). No Supabase access, no writes.

## Matrix
Scopes torah (304,805) + tanakh (1,204,583); 13 terms (short/common, medium, rare, palindrome, reverse-sensitive, no-result) + 4 torah Goldens (exact skip);
skip domains B40, B500, FULL (`floor((N-1)/(L-1))`); caps 16/400/3000/4000; ≤5 repeats (median/p95). A materialisation guard (4e6 hits) and a 30 s deadline
report `UNBOUNDED_COST`/`TIMEOUT` instead of fabricating recall (15 ground-truth cells).

See `results/BENCHMARK_RESULTS.md` for tables and the AFTER in work_log for the verdict.
