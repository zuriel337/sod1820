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
| Legacy **behavior** (isolation of behavior, not removal of code) with `fx_number_lookup_page` and `fx_world_relation_identity` both ON in `site_flags` | Legacy `/`, `/number/1820`, `/world`: 0 requests to `fn_number_lookup_2029_page`, 0 page errors, i.e. neither acceleration sent a new RPC from Legacy even with both flags ON. The code is **not** removed from the Legacy build: the switch catalog and transport strings are still present in Legacy chunks but inert (`__SOD_2029_BUILD__` is compile-time false); the same is true of the earlier switches. |

## Candidate SQL on the real corpus (read-only, rolled back, role `anon`)
Candidate body from the migration, as a `pg_temp` function inside a rolled-back transaction, against the live `fn_number_lookup`:
14 cases (values 26, 92, 300, 500, 613, 1820, 5112; 20-row pages, first page and cursor page): **ordered JSONB output identical in all 14**, same row counts.
DB execution time (single call each, warm, **database time only, not website time**): 20-row first page 87→13 ms (26), 124→17 (92), 254→17 (300), 221→18 (500), 67→11 (613), 51→13 (1820); cursor pages 16→14, 27→17, 90→17, 89→18, 17→11, 54→14; 5112 (15 rows): 20→13 / 12→12. Single measurements, no repetition: indicative only.
The function is **not installed** in the shared database (probe → `PGRST202` path); installation needs the owner's release authorization.

## Lab measurement — World relation deepening (`fx_world_relation_identity`)

**These are laboratory (fixture-replay) measurements with a fixed 150 ms read delay, not proof of an improvement on the live site.** A reviewer who repeated the comparison saw the same direction.
Exact build: working tree = `0de29e31` plus nothing (2029 build, `dist`). Same build, same fixtures, only the flag differs. Mobile 390×844 DPR2, CPU×4, every Supabase read fulfilled from recorded real anonymous responses with a fixed 150 ms delay (not network-bandwidth/PostgreSQL time), new browser context per run, one discarded warm-up per series, 14 measured runs per cell (two interleaved series of 7). Start state: World subject number 1820, "קשרים" facet open, first matching "העמק" (target = number 776, or a non-number: the Post "הבחירות לכנסת ה־26 …").

| Scenario | click → context changed (identity step) | click → usable target content | requests after click | long tasks (sum) | CLS |
|---|---|---|---|---|---|
| to number, OFF | 1780 ms [1705–2376] | 3942 ms [3837–4601] | 92 | 59 ms [0–655] | 0.052 |
| to number, ON | **203 ms [190–384]** | **2329 ms [2265–2912]** | **55** | 0 ms [0–351] | 0.052 |
| to non-number, OFF | 1196 ms [1162–1799] | 2532 ms [2493–3258] | 29 | 0 ms [0–638] | 0.227 [0.227–0.278] |
| to non-number, ON | **216 ms [197–511]** | **1555 ms [1504–2062]** | **16** | 0 ms [0–327] | 0.278 [0.227–0.278] |

Equivalence (all 28 samples): same resulting subject (label/type), same `selection.entityId`, same lens, same `returnTo` (subject 1820, href `/world`), same final page text length (1644 / 1151), same **set of distinct requests** (ON only removes the duplicate full-projection reads: 92→55, 29→16). Ranges do not overlap for the context and content times. CLS is unchanged by the switch; the non-number destination already shifts layout at 0.23–0.28 in both modes (pre-existing, not caused by the switch).
These are replay measurements on recorded fixtures (lab); hosted Preview, a real phone and live PostgreSQL/network latency were not measured.

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


## Follow-up fixes after review (this commit)
- **R2 — missing RPC memory.** `numberLookupTransport2029.js` remembers a `PGRST202` answer for the rest of the page load (module scope): one probe request, then every search goes straight to the existing `fn_number_lookup`. Only "function not found" is remembered; permission (`42501`), SQL and timeout (`57014`) errors are never remembered, hidden or retried. A refresh starts empty, so installing the function takes effect on the next page load. Tests (`test/number-lookup-transport-memory-2029.test.mjs`): five searches with the function missing (returned and thrown forms) → 1 probe, 5 baseline calls, all answered; other errors reach the caller every time; fresh memory retries; OFF always calls the existing RPC directly.
- **R3 — acceptance before enabling the DB switch.** `docs/perf-evidence-20261015/acceptance/verify-number-lookup-page.mjs` (read-only; only the two lookup RPCs) checks two identities after the migration is installed: GUEST (anon key) and MEMBER (a signed-in **non-admin** token in `MEMBER_ACCESS_TOKEN`; an admin token is rejected via `rd_is_admin`). Per identity: NULL-probe executable (200, empty), and for values 26, 92, 300, 1820, 5112, 99999 the first page and a cursor page of 20 rows are byte-identical (ordered, all fields) to `fn_number_lookup`. Verdicts/exit codes: PASS 0 · NOT_INSTALLED 2 (PGRST202) · FAIL 1 (including a permission error) · missing member token = INCOMPLETE, never PASS. Logic is unit-tested with fakes (6 tests). Run against the live project today: guest → `NOT_INSTALLED`, as expected (nothing installed).
  Pre-install evidence for the same identities, read-only and rolled back (candidate body as a `pg_temp` function): GUEST 14/14 ordered-identical (section above); signed-in non-admin (`rd_is_admin()=false`, synthetic sub) 12/12 ordered-identical over values 26, 92, 300, 1820, 5112, 99999, first and cursor pages. This is parity of the SQL, not proof that the installed function's grants work; the runner above is that proof and must pass after installation and before the owner enables the flag.
- **R4 — rollback and when it takes effect.** Test: with the switch ON the fast RPC is used; after OFF is read, the existing RPC is used every time (`R4` test). Timing: the switch reader (`readRuntimeSwitches`) keeps a 30-second in-memory window per page. The tab where the owner flips the switch updates immediately; any other open page keeps its previous value until its window expires (≤ 30 s, on its next lookup — there is no polling); any page load starts with an empty window and reads the current value. So "OFF + refresh" never uses the fast RPC, and "OFF without refresh" stops using it within 30 s. Requests already in flight are not cancelled.
- **Documentation wording.** The earlier statement "compile-time isolated from Legacy" in the handoff README now says behavior is isolated and the inert code may remain in Legacy chunks.
- **Visual findings** (CLS, scrolling) are recorded separately in `visual-findings.md`; no design or visual contract was changed.
