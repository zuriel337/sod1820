# ELS multi-strategy benchmark (branch-only prototype)

Task `G3_ELS_MULTI_STRATEGY_BENCHMARK_PROTOTYPE_V1` · WRITE · `BRANCH_ONLY_NO_MERGE_NO_DEPLOY`.
One truth, multiple internal execution strategies **under the existing ELS boundary**
(`els_research_layer_law` v9 / `els_single_engine_law` v2). Nothing here is a second engine, store, registry or
corpus owner, and nothing is wired into the site, the DB, D2/docs/guards, or the browser tool.

## What is here
| file | role |
|---|---|
| `lib/corpus.mjs` | loads `tools/els/data/tk-letters.txt`; fails closed unless the live admission md5s match (all / torah prefix / NW suffix); zero-based positions |
| `lib/strategies.mjs` | `EXACT_EXHAUSTIVE_V1`, `ANCHOR_FAST_V1`, `HYBRID_COVERAGE_V1`; emits `els_search_result_v1`-shaped results with `execution_strategy` + explicit partial/selection-policy provenance |
| `lib/verify.mjs` | independent replay verifier (recomputes every letter from the corpus; checks ids, coordinates, dependency_group, and that sampled results never claim exhaustive/negative) |
| `lib/legacy.mjs` | observational baseline: legacy browser `findAll` (anchor + `fwdDisperseTopUp`) extracted **verbatim** from `els-code.template.html`, run in a killable worker |
| `run-benchmark.mjs`, `make-report.mjs` | harness + report generator |
| `fixtures/matrix.json` | term/class/cap/domain matrix and Golden occurrences |
| `results/raw-*.json`, `results/BENCHMARK.md` | raw per-row artifacts and the generated table |
| `test/strategies.test.mjs` | 13 tests (`node --test tools/els/bench/test/strategies.test.mjs`) |

Reproduce: `cd tools/els/bench && node --expose-gc run-benchmark.mjs --scope torah && node --expose-gc run-benchmark.mjs --scope tanakh && node make-report.mjs`
(≈10 min per scope, 16 cores not required; the two scopes were run in parallel).

## Strategies
* **A `EXACT_EXHAUSTIVE_V1`** — models `els_occurrences_internal_v1`: pair join on the first two term letters over the whole skip domain, verify letters 3..L, count ALL, order `(skip, start, fwd-first)`, LIMIT cap. `total_hits`/`truncated` exact.
* **B `ANCHOR_FAST_V1`** — rarest-two-letter anchor scan (legacy strength), forward then back (forward keeps ⌈cap/2⌉ on saturation), early exit at cap. Policy `ANCHOR_CORPUS_PREFIX_V1`.
* **C `HYBRID_COVERAGE_V1`** — same anchor generator sliced into cells = direction × 9 geometric skip bands (2,4,16,64,…) × 8 corpus segments, drained round-robin in a deterministic low-discrepancy order (quota ⌊remaining/active⌋, ≥1). Policy `STRATIFIED_CELL_ROUND_ROBIN_V1`.

Truth vs. selection are separated: enumerators only ever yield exact occurrences; the policy only decides which `cap` are returned.
Provenance rule enforced in code and by the verifier: a run that stopped early (cap or timeout) is `coverage=sampled_partial`, `partial=true`, `total_hits=null`, carries strategy id/version/policy, and can **never** set `negative`. `negative` requires a *completed* scan of the requested skip domain (then B/C are exhaustive and identical to A — tested). Timeout → `status=TIMEOUT`, never negative.

## Method / caveats (read before quoting numbers)
* Local Node 22 over the canonical stream, no database. **A models the SQL algorithm** (same join, same rows; `candidates` ≈ pair-join rows), it is not Postgres wall-clock. Absolute ms will differ in the DB; ratios and TIMEOUT/UNBOUNDED_COST behaviour are the transferable signal. Confirm on a local/branch Postgres before any production decision.
* Per-run budget 15 s (`TIMEOUT(>15000ms)` = not completed, latency unknown); ground-truth budget 40 s. Reps ≤5 (a strategy whose first run exceeds 1.5 s is run once); p95 of ≤5 samples ≈ max. A's latency is cap-independent (full count, then LIMIT) and is reported per cap from the same enumeration. Two scopes ran concurrently on a 4-core box.
* Ground truth = A when it completes, else an independent anchor exhaustive enumeration (tested equal to A), else `UNBOUNDED_COST` (no recall fabricated). 10 of 48 (scope,domain,term) groups are `UNBOUNDED_COST`.
* Canonical core clamps `max_hits` at 1000; caps 3000/4000 here mean the union of canonical pages (page core), as in the legacy tool.
* Legacy baseline exists only for the full skip domain (its `findAll` has no bounded domain) and includes skip 1, which is excluded from counts (`plainSkip1Excluded`).
* Matrix terms are normalized (final letters folded) before verification. (A first run false-flagged 29,182 "false positives" from the legacy baseline because the harness verified un-normalized `שלום/אברהם`; fixed and rerun — the reported numbers are from the rerun.)

## Headline results (from `results/BENCHMARK.md`, 672 result rows)
* Correctness: **0** exact-hit false positives over **842,458** replay-checked occurrences, 0 duplicates, 0 replay/provenance gate failures, 0 sampled rows claiming negative; min precision vs ground truth = 1 on 504 rows.
* Where A completes (144 term×scope×domain×cap cells): median speedup **B 13.1×, C 8.9×**. Where A times out (>15 s; 48 cells, all full-domain common/medium terms, e.g. Tanakh `אל` 7.07M occurrences bounded / unbounded full) **B and C never timed out** (0/192 each; worst B/C median 3.0 s, Tanakh full `צדקיהו` cap 3000).
* Bounded (skip≤500) common terms, cap 16: A 0.8–40 s → B/C 0.1–0.3 ms; Tanakh full `תורה` cap 16: A TIMEOUT → C 0.29 ms, B 41 ms; legacy 384 ms.
* Weakness (honest): rare terms and no-result probes on the full skip domain, where A's join is already selective: B/C up to ~2–3× slower than A (Tanakh full `צדקיהו` cap 3000: A 1.87 s vs B 3.03 s / C 2.89 s; Torah full `זזזזזזזז` no-result: A 13 ms vs B/C 31 ms; Tanakh 176 ms vs 459 ms). 22 (B) / 31 (C) of 144 A-completed cells are slower than A, always sub-3 s.
* Coverage (averages over cells with truth): canonical-first-cap overlap A 1.00 (by definition), B 0.29, C 0.44, legacy 0.21 → optimized strategies do **not** reproduce the canonical capped set (measured as compatibility only, not required). Corpus-segment spread of returned hits (of 8): A 4.1 (head-biased), B 2.6, **C 6.7**, legacy 5.8; skip-band spread: A 1.9, B 4.7, **C 5.8**, legacy 6.0. C therefore fixes the anchor-prefix bias that B has.
* Golden `תורה` skip 50 (Genesis `start=5`, Exodus `start=78071`): A always contains them; B keeps Genesis but not Exodus at any cap; C keeps Genesis from cap 400 and Exodus from cap 3000 (cap 16: neither). **Goldens/targeted replays must use exact lookup (skip,start,dir replay), not a sampled search.**

## Verdict
**PASS (bounded).** Both optimized strategies are materially faster than the current exhaustive path on capped searches, complete every full-domain case A cannot, with 0 false positives, exact replay and explicit partial semantics. **HYBRID wins as the default for capped exploratory search** because it matches B's latency class while removing the corpus-prefix bias and giving broad position/skip coverage; B is the cheaper fallback; A stays authoritative.

Recommended roles (production integration, smallest safe scope — a strategy parameter *inside* `els_search_core_v1`/page core; same result contract, corpus_id, dependency_group, replay function):
1. `EXACT_EXHAUSTIVE_V1` — required for `SOURCE_CLAIM_REPLAY`, `PRE_REGISTERED_TARGET`, any count/`NOT_FOUND`/negative claim, pagination, and when a cheap cost estimate (|P1|·|P2|·window) is small (it beat B/C on rare/no-result full-domain cases).
2. `HYBRID_COVERAGE_V1` — default for `POST_HOC_EXPLORATORY` / `HYPOTHESIS_DRIVEN_FOLLOWUP` capped browsing; result must carry `execution_strategy`, `completion.partial=true`, `coverage=sampled_partial`, `selection_policy`, `total_hits=null` and never feed a NOT_FOUND.
3. `ANCHOR_FAST_V1` — fallback/back-pressure tier when hybrid cell setup is not worth it; same partial labelling.
Not yet decided/tested: Postgres wall-clock (needs local/branch Postgres run of A and a SQL port of B/C), whether cap>1000 belongs on the page core, and a planner threshold for A vs C.
