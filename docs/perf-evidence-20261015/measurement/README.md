# Four-mode measurement of the two performance switches — exact build `4b8855f3`

Task `CLAUDE_PERF_TWO_SWITCHES_MEASURE_20261015` (passive journal BEFORE `ae3a7cb8-fc34-4cf4-a57e-965774b9bcd8`, TO=ZURIEL).
Build: 2029 production build of branch `claude/sod-perf-continuation-838w4h` at `4b8855f3` (working tree clean). Main `503b52ef` and PR1100 `01ac7706` untouched. DB state read before the work: `fn_number_lookup_2029_page` installed by the owner-approved GPT install (journal `aadc505c…`), SECURITY INVOKER, EXECUTE for anon/authenticated/service_role, `fx_number_lookup_page=false`, `fx_world_relation_identity` absent. **No shared `site_flags` row was written or changed**; the four modes were produced by a local, test-only interception of the `site_flags` read inside the test browser (no product bypass added).

State: IMPLEMENTED, TESTED, BRANCH_ONLY. MERGED=no, DEPLOYED=no, LIVE_FLAGS_CHANGED=no, MIGRATION_APPLIED_BY_ME=no.

## 1. Acceptance of the installed function (R3)
| Identity | Result | Evidence |
|---|---|---|
| Guest (anon key, real HTTP) | **PASS** | `verify-number-lookup-page.mjs`: 12 checks, 0 failed — NULL probe 200+empty; values 26, 92, 300, 1820, 5112, 99999 first page and cursor page byte-identical (ordered, all fields) to `fn_number_lookup`. `raw/acceptance-guest.json` |
| Signed-in non-admin member (real session) | **BLOCKED** | No authorized member session exists in this environment and none was requested or minted (no passwords/tokens asked for, no authentication bypass). The runner returns INCOMPLETE until `MEMBER_ACCESS_TOKEN` of a real non-admin is supplied by the owner's authorized mechanism. GPT's role-simulation (31/31 under `authenticated`, not an HTTP login) and my pre-install simulation (12/12) remain the only member evidence. |

## 2. Four modes, same commit — World relation deepening (390×844, DPR2, CPU×4)
Modes: **off** = both OFF · **world** = `fx_world_relation_identity` only · **db** = `fx_number_lookup_page` only · **both**. Start state: World subject 1820, "קשרים" open, first matching "העמק". Medians with [min–max]. "Content" = click → the target's own "העיקר סביב …" content visible and no busy state. CPU = renderer `TaskDuration` between click and settle (CDP). CLS and long tasks measured from the click.

### 2a. REPLAY (recorded fixtures, fixed 150 ms per read, 8 runs/cell in two interleaved passes, one discarded warm-up per series) — client-side effect only
| Target | Mode | click→identity step | click→usable content | requests after click | of which number lookup (fast RPC) | CPU | CLS |
|---|---|---|---|---|---|---|---|
| number 776 | off | 1760 ms [1706–2120] | 3931 ms [3818–4423] | 92 | 2 (0) | 1362 ms [1117–2123] | 0.052 |
| | world | **210 ms** [197–409] | **2328 ms** [2262–2693] | **55** | 1 (0) | **891 ms** [755–1553] | 0.052 |
| | db | 1766 ms [1692–1837] | 3863 ms [3801–4831] | 92 | 2 (2) | 1351 ms [1106–2878] | 0.052 |
| | both | 208 ms [200–730] | 2328 ms [2263–3131] | 55 | 1 (1) | 904 ms [749–2108] | 0.052 |
| post (non-number) | off | 1219 ms [1208–1779] | 2573 ms [2538–3254] | 29 | 0 | 637 ms [567–1630] | 0.227 [0.227–0.278] |
| | world | **218 ms** [204–614] | **1562 ms** [1545–2071] | **16** | 0 | **487 ms** [467–1244] | 0.227 [0.227–0.278] |
| | db | 1210 ms [1196–1629] | 2558 ms [2540–2924] | 29 | 0 | 613 ms [558–1259] | 0.227 [0.227–0.278] |
| | both | 203 ms [196–227] | 1589 ms [1539–1879] | 16 | 0 | 522 ms [425–894] | 0.278 [0.278–0.278] |

Replay fixes every read at 150 ms, so it **cannot show database-time savings**: the `db` rows equal `off` by construction. Its value is request counts, CPU and identity.

### 2b. LIVE server reads (local 2029 build, real HTTPS to the canonical project from this sandbox, anonymous, CPU×4, **3 runs/cell**, no added latency; ≈2,900 sequential read requests in total, no load run) — this is **not** the production website and not a phone/Israel measurement
| Target | Mode | click→identity step | click→usable content | requests | CPU | CLS |
|---|---|---|---|---|---|---|
| number 776 | off | 3147 ms [3131–3585] | 7653 ms [7130–7822] | 92 | 2200 ms [1613–2440] | 0.053 |
| | world | **545 ms** [366–749] | **4737 ms** [4627–5512] | 55 | 1515 ms [1504–2453] | 0.053 |
| | db | 3575 ms [3162–4633] | 8527 ms [7776–9351] | 92 | 2032 ms [1738–3199] | 0.053 |
| | both | 366 ms [344–558] | 5001 ms [4584–5342] | 55 | 1578 ms [1450–2511] | 0.053 |
| post | off | 2429 ms [2121–3095] | 4844 ms [4429–5893] | 29 | 1205 ms [1012–1256] | 0.278 [0.227–0.278] |
| | world | **342 ms** [331–384] | **3728 ms** [3289–3926] | 16 | 969 ms [900–1910] | 0.227 |
| | db | 2634 ms [2534–2785] | 5363 ms [4977–5591] | 29 | 1026 ms [938–1960] | 0.227 [0.227–0.278] |
| | both | 354 ms [331–779] | 2807 ms [2677–3320] | 16 | 906 ms [635–1018] | 0.278 [0.227–0.278] |

### Equivalence (all replay and live samples, 4 modes)
Same resulting subject (label/type), same `selection.entityId`, same lens, same `returnTo` (subject 1820, href `/world`), same final page text length (1644 number / 1151 post) and same heading text length — **exactly one identity variant per target across all modes and all runs**. The set of distinct request kinds is the same in all modes (18 for the number target, 8 for the post); the world switch removes duplicate reads (92→55, 29→16), the db switch changes only the RPC name of the number lookup (`fast` column).

## 3. Number lookup with continuation pages — LIVE HTTPS, guest, sequential (`raw/lookup-pages-live.json`)
Walking all rows page by page by cursor, existing RPC vs additive RPC, 1 warm walk + 3 alternating repetitions per cell. Ordered rows identical in every cell. Each call includes ~190 ms of sandbox network time.
| Number (rows) | page size | pages | existing: total / per call | additive: total / per call |
|---|---|---|---|---|
| 26 (197) | 20 | 10 | 2294 ms / 196 ms | 1963 ms / 194 ms |
| 300 (330) | 20 | 17 | 4923 ms / 272 ms | **3694 ms / 198 ms** |
| 1820 (185) | 20 | 10 | 2325 ms / 231 ms | 1972 ms / 194 ms |
| 26 | 500 | 1 | 357 ms | 344 ms |
| 300 | 500 | 1 | 448 ms | 432 ms |
| 1820 | 500 | 1 | 358 ms | 385 ms |
Database time (anon, rolled back, 3 repetitions, DB execution only): 20-row page 1820 53→14 ms, 300 99→18 ms; **500-row page 1820 61.2→61.4 ms, 300 119→115.5 ms** (no gain).

**Finding that limits the benefit:** every current caller asks for `p_limit` 500 (`entityHubProjection` default window) or unlimited, and no number has more than 500 verified rows (query: 0 numbers). A 500-row page is the whole population, so the "enrich only the returned page" optimization has nothing to defer: the website number lookup is a single call with ≈ identical cost. The benefit exists only for consumers that page with small windows (~20), which the product does not currently do.

## 4. Behavior checks
| Check | Result |
|---|---|
| Content identity, order, count across modes | PASS (above; SQL: ordered 37-field equality in 93 PGlite cases + live-corpus cases) |
| Pagination (cursor pages, limit clamp) | PASS in SQL/live walks; not exercised through a UI because no UI pages with small windows |
| Errors: missing RPC remembered once per page load; permission/SQL/timeout errors not hidden | PASS (unit tests `number-lookup-transport-memory-2029`, 6) |
| Switch OFF always uses the existing path | PASS (unit test; replay `off`/`world` show 0 fast-RPC calls) |
| Legacy ignores both flags | PASS (0 requests to the additive RPC with both flags ON, earlier run on `dd898ed2`; transport code unchanged since) |
| Deferred-error caveat on real data | NOT TESTED beyond the PR fixture |
| Back/forward, scrolling | NOT TESTED — owned by the transitions/scroll session (App2029, scroll restoration); not touched |
| Member acceptance (real session) | BLOCKED (see §1) |
| Production website / hosted Preview / real phone | NOT TESTED |
| Home | not measured (priority last) |

## 5. Recommendation
1. **Accept `fx_world_relation_identity`** for owner activation: consistent in replay and live-server reads (≈ −40% click→content, 92→55 and 29→16 requests, lower CPU), with identical content. Still lab/local-build evidence: re-verify on a hosted Preview before enabling for visitors.
2. **Do not enable `fx_number_lookup_page` for the current product**: no measurable website benefit with the existing 500-row windows (live `db` rows are not faster; the 8527 vs 7653 ms difference is within noise at n=3 and unproven as a slowdown). Keep the function installed and the flag OFF; reconsider only if a consumer adopts ~20-row paging, where the live walk of 17 pages dropped 4.9→3.7 s and DB time 99→18 ms per page.
3. Before any enabling: run the member acceptance with an authorized non-admin session.

## 6. Rollback
Switch OFF in the existing control panel (default OFF; independent). Page already open: ≤ 30 s (settings window); new page load: immediate. Candidate removal (owner action only): `drop function public.fn_number_lookup_2029_page(bigint,integer,text); delete from public.site_flags where key='fx_number_lookup_page';`.
