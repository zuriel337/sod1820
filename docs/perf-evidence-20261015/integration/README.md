# Integration of the two performance switches (PR1105) — Claude shift

Task `CLAUDE_PERF_TWO_SWITCHES_INTEGRATION_20261015` (passive journal BEFORE `edef50ea-8364-430b-97c7-2d829c425b35`, TO=ZURIEL).
Branch `claude/sod-perf-continuation-838w4h`. Integrated `origin/gpt/perf-two-switches-20261015@fd0e3eb1` (parent `6b72698e`) onto `84f6f7f0` in merge commit `0de29e31`.
State: IMPLEMENTED, TESTED (below), BRANCH_ONLY. MERGED=no, DEPLOYED=no, LIVE_FLAGS_CHANGED=no, SHARED_DB_MIGRATION_APPLIED=no.

## Integration
One textual conflict (`World2029Page.jsx` import line); resolved pointwise as the union `{ runtimeOff, frozenOr, readRuntimeSwitches }`. `runtimeSwitches2029.js` auto-merged with `frozenOr`, the five freeze modes, the 600 000-char snapshot limit and the PR's `defaultOn:false`/`requiresRpc`/strict readback intact. No file was replaced wholesale.

## Verification on the merged tree (`0de29e31`)
| Check | Result |
|---|---|
| `test/perf-two-switches-2029.test.mjs` + `test/runtime-switches-2029.test.mjs` (25 tests: switches, rollback, missing RPC, permission errors, strict readback, Legacy isolation, frozenOr, snapshots) | PASS |
| `npm run build` (Legacy + 2029), `test-2029-isolation`, `test-2029-bundle-budget` (5/5), `test-2029-control-plane`, `test-2029-system-frame` | PASS |
| `src/lib/research/*.test.js` | 23 fail, identical list to base (pre-existing) |
| PR's SQL parity runner re-run on PGlite 0.3.14 (93 ordered cases, 37 fields, anon/member/admin) | PASS; result identical to committed `sql-parity-results.json` apart from timestamps |
| PR's control-panel browser fixture (8 scenarios), Chromium 141 | PASS, 0 external requests |
| Legacy bundle behavior with `fx_number_lookup_page` and `fx_world_relation_identity` both ON in `site_flags` | Legacy `/`, `/number/1820`, `/world`: 0 requests to `fn_number_lookup_2029_page`, 0 page errors. The switch catalog strings are present in Legacy chunks but dead (`__SOD_2029_BUILD__` is compile-time false); this is also true of the earlier switches. |

## Candidate SQL on the real corpus (read-only, rolled back, role `anon`)
Candidate body from the migration, as a `pg_temp` function inside a rolled-back transaction, against the live `fn_number_lookup`:
14 cases (values 26, 92, 300, 500, 613, 1820, 5112; 20-row pages, first page and cursor page): **ordered JSONB output identical in all 14**, same row counts.
DB execution time (single call each, warm, **database time only, not website time**): 20-row first page 87→13 ms (26), 124→17 (92), 254→17 (300), 221→18 (500), 67→11 (613), 51→13 (1820); cursor pages 16→14, 27→17, 90→17, 89→18, 17→11, 54→14; 5112 (15 rows): 20→13 / 12→12. Single measurements, no repetition: indicative only.
The function is **not installed** in the shared database (probe → `PGRST202` path); installation needs the owner's release authorization.

## Website measurement — World relation deepening (`fx_world_relation_identity`)
Exact build: working tree = `0de29e31` plus nothing (2029 build, `dist`). Same build, same fixtures, only the flag differs. Mobile 390×844 DPR2, CPU×4, every Supabase read fulfilled from recorded real anonymous responses with a fixed 150 ms delay (not network-bandwidth/PostgreSQL time), new browser context per run, one discarded warm-up per series, 14 measured runs per cell (two interleaved series of 7). Start state: World subject number 1820, "קשרים" facet open, first matching "העמק" (target = number 776, or a non-number: the Post "הבחירות לכנסת ה־26 …").

| Scenario | click → context changed (identity step) | click → usable target content | requests after click | long tasks (sum) | CLS |
|---|---|---|---|---|---|
| to number, OFF | 1780 ms [1705–2376] | 3942 ms [3837–4601] | 92 | 59 ms [0–655] | 0.052 |
| to number, ON | **203 ms [190–384]** | **2329 ms [2265–2912]** | **55** | 0 ms [0–351] | 0.052 |
| to non-number, OFF | 1196 ms [1162–1799] | 2532 ms [2493–3258] | 29 | 0 ms [0–638] | 0.227 [0.227–0.278] |
| to non-number, ON | **216 ms [197–511]** | **1555 ms [1504–2062]** | **16** | 0 ms [0–327] | 0.278 [0.227–0.278] |

Equivalence (all 28 samples): same resulting subject (label/type), same `selection.entityId`, same lens, same `returnTo` (subject 1820, href `/world`), same final page text length (1644 / 1151), same **set of distinct requests** (ON only removes the duplicate full-projection reads: 92→55, 29→16). Ranges do not overlap for the context and content times. CLS is unchanged by the switch; the non-number destination already shifts layout at 0.23–0.28 in both modes (pre-existing, not caused by the switch).
These are replay measurements on fixtures; hosted Preview, a real phone and live PostgreSQL/network latency were not measured.

## Not measured (and why)
| Item | Status |
|---|---|
| `fx_number_lookup_page` ON in the website (DB-only and both-ON states) | **NOT TESTED**: the additive RPC is not installed in the shared DB; without it the transport falls back to the baseline, so a website number would be meaningless. DB-side numbers above are the only evidence. |
| Number pagination, back/forward, scrolling on identical commits | NOT TESTED (depend on the installed RPC and on the locked Number page). `returnTo` and context equality after deepening were verified; back/forward navigation itself was not exercised. |
| Deferred-error caveat on the real corpus | Reproduced only in the PR's SQL fixture (non-selected invalid composite is not evaluated; selected-row errors still propagate). Not scanned over the full corpus. |
| Hosted Preview / phone / cold cache / concurrency | NOT TESTED |

## Activation, rollback, and the single approval request
- World: owner turns `fx_world_relation_identity` ON in the existing control panel (default OFF, independent). Rollback: turn it OFF; the original full-projection path runs again. No data to roll back.
- Number lookup: needs `supabase/migrations/20261014220024_number_lookup_2029_page.sql` (additive function + seeded flag row `false`, no change to existing functions or grants). Panel refuses to enable until the RPC probe succeeds; writes are verified by a fresh read. Rollback: turn the switch OFF (baseline `fn_number_lookup` is used); to remove the candidate completely: `drop function public.fn_number_lookup_2029_page(bigint,integer,text); delete from public.site_flags where key='fx_number_lookup_page';`.
- **Approval requested (one):** apply the additive migration above to project `linswmnnkjxvweumprav`, so the DB-ON and both-ON website states can be measured with the flag staying OFF for visitors. Not applied.
