# G4 — evidence on the final RC, baseline-failure classification, Analytics status (7.11.2026)

Scope: RC branch `claude/sod1820-audit-rc-g93w32` only. `main`, Production, aliases, Storage and permissions were not touched. The one Production database change is DEF-001 Migration A, applied on 7.11.2026 with ZURIEL's explicit approval and independent of this branch's content (see §7.4 and `DEF-001-APPLY-RECEIPT-20261107.md`); the RC code itself has not been merged or deployed.
A green workflow is **not** G4 closure (CLAUDE.md): this file records evidence per exact SHA and what is still open.

## 1. SHA chain (every row is evidence for that SHA only)

| SHA | What it is | Evidence |
| --- | --- | --- |
| `552b391c6` | RC with the Release Visual egress guard (round 2) | G4 Public Core, 2029 Isolation, Observability/SEO, Live Contracts, **Release Visual** — all `success` (§2) |
| `175009965` | + PG2 consumer contracts and the three analytics contracts wired into Live Contracts; stale route-effects proof repaired | Live Contracts run 42357364179 `success` |
| `b183243e3` | + four drifted contracts repaired and wired (§3). Tests and one workflow only — no application source | gates re-dispatched on this SHA (§4) |

Application source is identical between `552b391c6` and `b183243e3` (`git diff --stat` touches only `test/`, `scripts/test-integrated-preview-auth-guard.mjs` and `.github/workflows/live-contracts-2029.yml`), so the Release Visual evidence on `552b391c6` describes the same product code. It was not re-run on `b183243e3`.

## 2. Release Visual on `552b391c6` — read-only property proven in practice

Run 42357290729 (#3022), `workflow_dispatch`, `success`. Job "Mobile + Accessibility Acceptance": the blocking proof step "Prove the telemetry-write guard (fail-closed; no live network)" passed, then the 20 acceptance tests passed (`20 passed (1.4m)`).

The guard's own receipt after every spec ends `leaks=0 websockets=0`. Example (spec 19, the calculator viral loop, the heaviest): `reads=49 denied=93 … leaks=0 :: POST …/rpc/fn_relation_candidate x44; ingest_event x32; link_identity x9; track_visit x8`. Across the 20 specs the guard denied (answered locally, never sent) `track_visit`, `ingest_event`, `link_identity`, `lang_links_list`, `notification_prefs_guest_get_v1` and `fn_relation_candidate` POSTs. Before the guard the same routes wrote ~26 `track_visit`, 30 `ingest_event` and 14 `link_identity` rows per run.

Database check (read-only SQL, canonical project, run window 08:52–08:55Z): `site_visits` rows with `id > 531545` (baseline taken before the run): **0**; `events` since 08:50Z: **0**; `identity_edges` since 08:50Z: **0**. Caveat, stated plainly: the run was on a Saturday morning and in-house telemetry for organic visitors is deliberately collapsed (owner decision 7.11), so a zero is *consistent with* but not *independent proof of* the guard; the independent proof is the guard's own receipt (denied counts, `leaks=0`) plus the earlier unguarded measurement. Read RPCs that are POSTs (`lang_links_list`, `notification_prefs_guest_get_v1`, `fn_relation_candidate`) are denied by the default-deny policy too and the specs still pass — a possible follow-up is to move them to the explicit-read allow-list if the page behaviour under test should see real data (decision, not a defect).

## 3. The 15 "baseline-failing" test files — every one classified

All 15 failed identically on `origin/main` and on the RC before this work, so none is a regression introduced by the RC. Re-run in the sandbox with the same helpers CI installs (`react-test-renderer@19.3.0`, `@playwright/test@1.55.0`, both `--no-save --package-lock=false`):

| File | Cause | Action |
| --- | --- | --- |
| `scripts/test-research-sync-provider.mjs` | `react-test-renderer` not installed (CI step installs it) | none — passes with helper |
| `test/community-calculator-runtime-2029.test.mjs` | same | none — passes with helper; already in Live Contracts |
| `test/doc37-post-follow-admission.test.mjs`, `test/final-preparation-control-plane.test.mjs`, `test/home-context-code-admission-2029.test.mjs` | same helper | none — pass with helper |
| `test/public-launch-closure-preview-guards-2029.test.mjs` | `@playwright/test` not installed | none — 5/5 with helper. Not wired in any workflow; it spawns a Playwright runner, so it belongs in a job that already installs Playwright (Release Visual) — **decision**, not done |
| `test/public-reading-observability.test.mjs` | **real, stale**: sliced `src/App2029.jsx` with a deleted end marker, so the route-effects subtest evaluated `export default` | **fixed** on `175009965`, 10/10, wired in CI |
| `test/doc37-research-reading-access.test.mjs` | **real, stale fixtures**: `personalActionsLocked` now requires `auth.verified === true` (supplied by `AuthContext` after `Auth.getUser`); the fixtures never carried it, so the provider (correctly) stayed locked | **fixed** on `b183243e3`: fixtures carry `verified:true`; "revalidation" drops `verified`; new case: a signed-in admin that Auth has not confirmed stays locked with no IO. 3/3 + wired |
| `test/public-continuity-closure-2029.test.mjs` | **real, stale pin**: root `vercel.json` was compared to the blob at an old commit, but two approved main changes (#1191 `deploymentEnabled:false`, #1253 `/tzofen.html` redirects) legitimately changed it | **fixed** on `b183243e3`: pinned by SHA-256 of the last approved main blob (`42ff15120`), `62144d03…0887`; needs no git history (the CI checkout is shallow). Tamper mutation (one appended byte) fails it. 7/7 + wired |
| `scripts/test-integrated-preview-auth-guard.mjs` | **real, stale fixture**: the Preview builder source now reads `process.env`; the base-worker VM context lacked `process` | **fixed** on `b183243e3` (`process:{env:{}}`), 28/28 + wired |
| `scripts/test-account-access-preview.mjs`, `test-home-world-flight-preview.mjs`, `test-integrated-preview-login-route.mjs`, `test-world-complete-journey.mjs` | manual operator scripts: need a local preview server on :4174/:4178 | none — environment; not in any gate |
| `scripts/test-journey-source-integration.mjs` | needs the Docker daemon | none — environment; not in any gate |

Net: 5 files were product-neutral environment gaps with the CI helper, 4 were real stale tests (all repaired, none by loosening an assertion or a threshold), 5 are manual scripts that need a server or Docker and are not part of any gate.

## 4. Gate runs on `b183243e3`

Filled in from the run results below (dispatched `workflow_dispatch` on the branch ref, same approach as before):

| Gate | Run | Result |
| --- | --- | --- |
| G4 Public Core Gate | [42358331972](https://github.com/zuriel337/sod1820/actions/runs/42358331972) (#435) | `success` |
| 2029 Live Contracts | [42358336257](https://github.com/zuriel337/sod1820/actions/runs/42358336257) (#97) | `success`, all 4 jobs; the two new steps (21 reading-mode research/continuity, 22 Preview worker policy) and the PG2 + Analytics steps ran and passed in the shallow CI checkout |
| Observability/SEO Build Gate | [42358338818](https://github.com/zuriel337/sod1820/actions/runs/42358338818) (#2944) | `success` |
| 2029 Isolation Gate | [42358334192](https://github.com/zuriel337/sod1820/actions/runs/42358334192) (#2308) | `success` (6 min 14 s; browser theme, entry-orientation and World acceptance included) |
| Release Visual Gate | not re-run on this SHA | no application source changed since `552b391c6` (run 42357290729, `success`, §2) |

## 5. Analytics — what is proven, what is not

* **RUM (Web Vitals) — works, proven from the database.** Anonymous `performance/web_vital` events reach `ingest_event`; field p75 read directly: LCP `/` 3.8 s (needs improvement), `/post/:item` 5.6 s and `/community/chat` 4.6 s (poor), CLS within 0.1.
* **GA4 route — proven at the code and request-shape level only.** Worker `collect` allow-list + `readingTelemetryPath()`; `test/public-reading-real-gtag-shape.test.mjs` (3), `test/analytics-2029-one-tree-contract.test.mjs` (2) and `test/public-reading-observability.test.mjs` (10) now run in Live Contracts instead of nowhere. **Not proven:** receipt of events inside the GA4 property — that needs the owner's GA access (DEF-006 request list in `GSC-GA4-ACCESS.md`). I cannot honestly claim "GA4 works in production" without it.
* **In-house `site_visits`/`events` — deliberately collapsed** after the public-reading cutover (owner decision 7.11). `page_views` (DEF-012/DEF-026) stays a documented gap; closing it needs the DB approval already described in `DEF-026-PAGE-VIEWS-SERVER-SIDE.md`.
* **Performance (lab).** A `modulepreload` for the entry module, fetched in parallel with service-worker admission, measured ≈65–116 ms (slow-4G/CPU×4 and fast-4G/CPU×2, N=7, same artifact/server). Real but small; **not applied** (it changes the production bootstrap, a Production change). The field LCP on posts/chat is dominated by something the RUM payload cannot attribute (no LCP element in the schema; TTFB p50 ≈740 ms on posts, documents are `no-store` by design). Next step needs a decision: add LCP-element attribution to the RUM schema (small, Production-affecting).

## 6. What is still open after this round (exact, small)

1. **Owner decisions, not code:** merge of the RC; PG2 consumer receipts for the delta (+541 `channel_updates`, +18 posts since 7.10) and the P0-C direct test; `world-corpus-continuation-2029` snapshot (Zvi); GA route widening (privacy); GA4/GSC access for real receipt proof.
2. **Approvals needed for DB/Production-touching items:** DEF-001b/003/004/005/026/027 SQL/Storage applications (DEF-001 Migration A is already applied, 7.11.2026), `modulepreload`/LCP attribution, `handle_new_user` auto-enrolment trigger (Auth track, AUTH-3).
3. **Gate coverage choices:** wire `public-launch-closure-preview-guards-2029` into a Playwright job; optional move of three read-POST RPCs into the Release Visual allow-list.
4. **Not run here by design:** ELS Core (no path overlap), Post-Deploy Canary (Production-facing).

## 7. State on the final RC source `b0b09e179` (everything after it is documentation only)

Kept apart on purpose: what passed, what is not proven, what waits for ZURIEL, and what is a verified security problem. A green workflow is not G4 closure.

### 7.1 Gates that passed (workflow_dispatch on the exact SHA)

| Gate | Run | Result |
| --- | --- | --- |
| G4 Public Core | [42422996873](https://github.com/zuriel337/sod1820/actions/runs/42422996873) (#438) | success |
| 2029 Isolation | [42422999168](https://github.com/zuriel337/sod1820/actions/runs/42422999168) (#2311) | success |
| 2029 Live Contracts (now also runs ~63 repaired/new contract files, the PG2 and analytics steps, the performance contracts and the first-load graph guard) | [42423001331](https://github.com/zuriel337/sod1820/actions/runs/42423001331) (#101) | success |
| Observability/SEO | [42423003483](https://github.com/zuriel337/sod1820/actions/runs/42423003483) (#2947) | success |
| Release Visual (egress guard) | [42423005693](https://github.com/zuriel337/sod1820/actions/runs/42423005693) (#3025) | success: 20/20, `leaks=0` in every spec; no new `site_visits` row on the spec routes since the baseline taken before the run (id 531556) |

Local on the integrated tree: `npm run build` exit 0 (only the pre-existing >500 kB notice); Legacy-retired, module-boundary, isolation, built-graph, theme-isolation and first-load-graph gates pass; 60 added/changed test files pass; the five SQL proof suites (DEF-001, 001b, 003, 004, 005) and the new DEF-028 suite pass on a throwaway PostgreSQL 16.

### 7.2 Missing receipts (not proven; no claim made)

* Receipt of GA4 events inside the GA4 property (needs access); Search Console ownership method for the restored tags.
* PG2 consumer receipts for the delta since 7.10 (+541 `channel_updates`, +18 posts) and the P0-C direct test; `world-corpus-continuation-2029` snapshot (Zvi).
* Field effect of the performance and robustness changes (LCP, CLS, entry preload, stale-chunk recovery): RUM after an approved deploy only; Safari/Firefox/real devices never exercised.
* 95 browser/Playwright files and 6 PostgreSQL/Docker files are outside the sandbox's reach (several verified under a non-root PostgreSQL); Post-Deploy Canary and ELS Core were not run (Production-facing / no path overlap).

### 7.3 Decisions that wait for ZURIEL (no code can resolve them)

Merge of PR #1262 (and its order: SQL, Edge, then site); applying the DEF-001b / 003 / 004 / 005 / 026 / 027 / 028 SQL (DEF-001 Migration A is already applied); Edge redeploys (`els-search-bridge`, Raziel `_shared`); GA4/GSC access; GA route widening; PG2 receipts; Cardcom bridge, Companion cluster, orphan public assets, `theme.js`, gate-pinned dead exports; the 26 accent-contrast CSS lines and the Home date display; stale browser-test fixtures; running the branch-deletion script; extending the egress guard to the other Playwright gates; required status checks on `main`; Skew Protection and the `/assets` routing; the DB/CDN recommendations.

### 7.4 Verified security problems (live, read-only, 7.11.2026)

See [`EMAIL-EXPOSURE-VERIFICATION-20261107.md`](EMAIL-EXPOSURE-VERIFICATION-20261107.md). **P0 (as verified before the fix):** `resolve_visitor_email` returned e-mail addresses to anyone with the public anon key (21 of 21 reachable user UUIDs and 1 guest resolved to an address; counts only, nothing printed), and `notification_prefs_guest_get_v1` echoed the address for a readable visitor id. **Status after the fix: DEF-001 Migration A was APPLIED to Production on 7.11.2026** (migration `20261107233659`, approved by ZURIEL, file byte-identical to the tested version): `anon`/`authenticated` now get `42501` (HTTP 401 on the public API) on `resolve_visitor_email`, `service_role` and `els_analytics` are unchanged, and the guest RPCs no longer return the address (receipt and rollback: [`DEF-001-APPLY-RECEIPT-20261107.md`](DEF-001-APPLY-RECEIPT-20261107.md)). **Still open:** DEF-001b (the visitor ids and user ids themselves stay readable by `anon`) and DEF-028 are **not applied** and wait for separate approval. **Not e-mail leaks:** `legacy_top_pages` (unused statistics endpoint, P3), `redirect_map` (no bypass, lint only), `topic_cards_public` (intentional door).
