# EXP-12 pilot — does a model recognise several words as one shared structure?

Isolated experiment (branch `claude/els-guided-ledger-and-tests-20261027`; no PR, no merge, no `main`, no site deployment, no new engine, Provider, conversation or AI route).
Question (ZURIEL, 28.10.2026): if a cipher contains a finding such as two words running parallel to each other, will the system find it and understand that it is a strong structure of the cipher, rather than picking single words?
Pre-registration and its three amendments: [`PREREGISTERED-EXP12P.md`](PREREGISTERED-EXP12P.md). Offline results (no model called): [`results/offline-q1-q2.md`](results/offline-q1-q2.md).

## What is here

| path | what |
|---|---|
| `lib/geometry.mjs`, `lib/lexicon.mjs`, `lib/relations.mjs`, `lib/pool.mjs`, `lib/controls.mjs`, `lib/verify.mjs` | candidate generator (exhaustive over 11 line families), word list, relation definitions, shortlist rule, control tiles, engine confirmation (`els_verify_occurrence_v1`) |
| `build-pools.mjs`, `data/pools/*.json` | the real region's pool, the 12 control tiles and the diagnostic pool `real-d1`; every item engine-confirmed; window md5 equal to `public.torah_stream` (`review/window-md5-canonical.json`) |
| `check-generator.mjs`, `review/generator-vs-engine.json` | the generator equals the engine on a seeded sample (600 engine calls) |
| `evaluation/*` | the saved cipher's words (`saved-cipher-u1.json`, read only after the pools were committed), where they lie in the region, the relation of the pair, the diagnostic pool builder, pool statistics. **Never imported by the library, the prompts or the runner** (a test enforces it) |
| `lib/packet.mjs`, `lib/validate.mjs`, `lib/plan.mjs`, `lib/prepare.mjs`, `lib/pilot.mjs`, `run-pilot.mjs` | the prompt (fixed prose + data rows), the validator (ids and letters shown only), the 22-run plan, request construction with hashes and cost bounds, one run's life (EXP-16's `callOnce`), the runner |
| `controls/plan-review.{json,md}`, `controls/budget-ledger.seed.json` | what is reviewed before any call: every request's SHA-256 and lock SHA-256, token estimates, expected and worst-case cost; the pilot ledger seed |
| `test/els-pool-selection.test.mjs`, `test/els-pool-pilot.test.mjs` | tests (pool, relations, metrics, controls, packet, validation, pipeline with fakes, guard) |

## Reproduce (offline)

```
node experiments/els-pool-selection/build-pools.mjs          # needs network for the engine confirmation (public key)
node experiments/els-pool-selection/evaluation/locate-saved.mjs && node experiments/els-pool-selection/evaluation/analyse-saved.mjs
node experiments/els-pool-selection/evaluation/build-d1.mjs && node experiments/els-pool-selection/evaluation/pool-stats.mjs
node experiments/els-pool-selection/run-pilot.mjs plan       # writes controls/plan-review.*
node --test test/els-pool-selection.test.mjs test/els-pool-pilot.test.mjs
```

A live run needs the temporary request-locked pass-through (deployed only after ZURIEL's explicit approval naming the hashes and caps) and `ELS_PROXY_URL`, `ELS_PROXY_TOKEN`, `ELS_PROXY_JWT`:
`node experiments/els-pool-selection/run-pilot.mjs selftest | run --concurrency 3`.

## Status

Offline stage done and committed; no model has been called. Spend so far: USD 28.72293 of the USD 40 total cap (pilot cap USD 8 on top of that).
