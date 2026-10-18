# Number 2029 compact opening projection

Date: 2026-10-18
Exact base: `gpt/perf-unified-wave3-20261018@6124db8d7ddac82654a09c49abf8ed60fe999d47`

## Result

This branch adds an unwired, repository-only capability for the full 2029 Number page:

- one `SECURITY INVOKER` JSON RPC over the existing `bidim`, `gematria_words`, `gematria_methods`, `nodes`, and Registry functions;
- complete, exact family membership counts and final display order;
- at most 12 displayed phrases per method by default (hard maximum 20), including the component, governance, and Registry fields the opening consumes;
- stable sample checkpoints plus explicit `has_more` / `complete` state;
- an explicit depth contract that leaves the complete 37-field population and Universal Findings to the existing canonical `fn_number_lookup` only after a depth request;
- a strict JavaScript adapter that performs one RPC, has no full-read fallback, and refuses inconsistent completeness/count envelopes.

No page, component, CSS, runtime flag, RLS policy, live database, deployment, or Production setting changed. `fx_number_lookup_page` remains OFF. The new function was not installed in the live project; a read-only check returned `function_installed=false` and `migration_recorded=false`.

The design was checked against the current Supabase Database Functions, Row Level Security, and Data API security guidance. The current platform changelog was also checked before choosing an explicit `SECURITY INVOKER` function plus explicit role grants; the migration does not rely on implicit exposure of new tables or schemas.

## Response contract

The root contains `value`, the bounded limit, source/family/opening totals, ordered `families`, `completeness`, and `depth`. Every family contains exact `count`, Registry/governance/component metadata, bounded `phrases`, and:

```json
{
  "sample": {
    "limit": 12,
    "returned_count": 12,
    "total_count": 31,
    "cursor": { "method": "רגיל", "phrase": "…", "bid_id": "…" },
    "has_more": true,
    "complete": false,
    "cursor_scope": "opening_sample_checkpoint"
  }
}
```

`depth.cursor` is deliberately `null`: the existing full lookup starts from its canonical beginning when depth is explicitly requested. Compact samples must not be promoted into Universal Findings or treated as a complete 37-field population.

## Parity and access proof

The exact migration SQL was executed in PGlite with invoker RLS fixtures. It passed guest, ordinary member, and authorized-admin visibility: unpublished rows remained hidden for all roles, encrypted published rows appeared only for the authorized admin, and no role was inferred in the function.

Read-only queries against the live project compared the proposed SQL directly with `fn_number_lookup` for 0, 376, 718, and 1820. For all four values, source row totals, family totals, exact family order, distinct per-method counts, and each bounded phrase sequence matched. Local cases also cover negative/large empty inputs, SQL NULL metadata, duplicate `(method, phrase)` rows, stable representative `bid_id`, and sample/depth completeness.

The live comparison ran through the maintenance connector, so it proves parity at that connector's visibility. Role separation is proven by the exact migration in PGlite; an anonymous HTTP cross-check was attempted but outbound HTTP from the executor was refused. No live write or fallback fixture was used.

## Measurements

These are UTF-8 byte lengths of database-side JSON text, without HTTP headers or compression:

| Value | Full 37-field JSON | Compact opening JSON | Reduction |
|---:|---:|---:|---:|
| 0 | 23,003 B | 5,259 B | 77.1% |
| 376 | 216,538 B | 48,831 B | 77.4% |
| 718 | 228,852 B | 52,882 B | 76.9% |
| 1820 | 249,438 B | 55,632 B | 77.7% |

For 718, three warm `EXPLAIN (ANALYZE, BUFFERS)` runs measured projected execution at 55.038 / 55.102 / 57.150 ms and full JSON execution at 65.955 / 62.210 / 64.426 ms. The projected plan used 2,550 shared-hit blocks versus 3,463; both used zero temporary blocks. Projected planning was higher (7.299–7.537 ms versus 0.137–0.150 ms). These measurements establish payload and database-plan deltas only. The capability is not wired or hosted, so they do not establish network, render, READY, or LCP improvement.

Machine-readable values are in `measurements.json`.

## Validation

- Exact migration + adapter test in PGlite: 5/5 passed.
- Existing focused Number/entity/numeric tests: 66/66 passed.
- `node scripts/test-2029-number-preview.mjs`: passed.
- Full Legacy + 2029 production build: passed.
- 2029 bundle budget: 5/5 passed.

## Claude surface handoff

Adopt only after this migration receives separate review and is applied to the intended non-Production environment.

1. In the Number projection/data lane, start `fetchNumberOpeningProjection(root)` alongside the existing anchor read and publish `projectNumberOpeningCore(...)` as the first usable Number core.
2. Do not call `researchNumber` or the full `fetchEntityHubProjection` population merely to render the opening. Start the existing depth pipeline only from an explicit depth action or observation of a depth section.
3. When depth starts, call the existing canonical full lookup from cursor `null`. Treat compact phrases as opening samples only; do not construct Universal Findings from them and do not merge them into the full cursor stream as if they were 37-field rows.
4. Preserve the current URL focus/return model and current error/retry boundary. A missing compact RPC must produce a retryable unavailable state; it must not silently restore the full payload on the opening path.
5. Keep `fx_number_lookup_page` OFF. Installation, surface wiring, hosted guest/member/admin acceptance, and any flag decision remain separate owner-gated steps.

The implementation intentionally does not edit `Number2029Page.jsx`, `NumberCore2029.jsx`, `NumberDrawer2029.jsx`, `SystemFrame2029.jsx`, or any visual/CSS owner.
