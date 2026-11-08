# Site errors, Legacy cleanup audit and remaining Legacy dependencies (7.11.2026)

Scope: RC branch `claude/sod1820-audit-rc-g93w32` (base `cfda877a1` = `origin/main` = the live `sourceSha`). Read-only discovery first (15 investigators, raw evidence in the session scratchpad), then code-only fixes and staged removals on the RC, each in an isolated worktree with an independent adversarial review. **No DB, Storage, Auth, permission, Production, deployment or branch-deletion action was taken.** Merge is not deployment (CLAUDE.md).

## 1. Headline

* **Nothing the owner could have seen on the site is attributable to the Legacy removal (#1239, `a5ef82cce`, live since 5.11 19:29Z).** Server errors per hour are flat across the removal (~6.2/h before, ~6.0/h after); the browser sweep (98 routes x 2 viewports x cold/warm = 392 loads) produced 61 distinct console/network signatures on the RC and the identical 61 on the tree before the removal; no API/auth/storage failure started with the removal; 60 of 60 `main` CI runs after the merge are green; 1 existing test broke (the analytics route-effects proof) and is already repaired on the RC.
* **What the owner most plausibly saw is an older, real failure that the removal did not cause but also did not fix: a stale-bundle blank screen.** ~33 production deployments in 42 h (4-6.11) swapped hashed assets under open tabs; a lazy route chunk that no longer exists blanks the whole app with no message (24/24 lab runs, identical before the removal). The only recovery code (`appHeal.js`) existed only in the deleted Legacy entry; 2029 never had one. Fixed on the RC (§4, A1).
* Everything else found is classified below as preexisting or unrelated, with an exact origin proof.

## 2. Errors found, by source and origin

| Source | Finding | Count / evidence | Origin |
| --- | --- | --- | --- |
| Vercel runtime (72 h, 698 lines) | `DEP0169 url.parse()` Node deprecation warnings | 542 of 547 "errors", first seen 16.6, also on the Legacy deployment | preexisting, platform noise |
| Vercel runtime | `/api/card` 300 s timeouts | 5, all on 6.11; cluster first seen 1.7; file untouched by the removal | preexisting |
| Vercel runtime + browser | stale `/assets/*` 404s after deploy swaps; app blank | Legacy-shell bursts on 4.11 (before the removal) and stale 2029 hashes after alias swaps | preexisting (cutover + frequent deploys) |
| Browser (lab) | lazy chunk missing -> blank app | 24/24 runs, identical on the pre-removal tree | preexisting |
| Browser (lab) | returning visitor after a deployment can hit the 10 s worker-activation timeout ("העמוד לא נפתח") | 15-35% in headless Chromium after an update, 0/30 on the removal merge, correlated with favicon links added later (`3cc3d7a77`) | unrelated to the removal; **not fixed** (touches Worker bytes/handshake: owner + deploy decision) |
| Supabase API | `cross_method_strength` queried from the browser though granted only to `service_role` | ~1,100 permission-denied/day (Meta crawler amplifies), 18 in the day before the removal | preexisting |
| Supabase Auth | `els-search-bridge` forwards the anon key to `/auth/v1/user` | 213 `bad_jwt` 403/day, rising with ELS usage | preexisting |
| Supabase API | `notification_prefs_guest_get_v1` executable by anon only; members get 403 | 12 in the day before the removal, 1 after | preexisting |
| Supabase API | `/video` data view times out in bursts; heavy RPC timeouts (Cloudflare 520/522, 9 real-user at 09:03-09:04Z 7.11) | see SBR-06/07/08 | preexisting; the `/video` materialized reader is already on the RC (DEF-002), SQL unapplied |
| Supabase RC hazard | RC `push.js` calls `push_subscription_*_v1` which exist only as unapplied SQL | deploy-order hazard, zero live traffic | introduced by the RC itself (DEF-001b); mitigated in A6 |
| Supabase | stale cached Legacy bundles still call removed-code endpoints | 1 RPC, 3 calls in 24 h, all 200 | caused by the removal (expected tail, harmless) |
| Supabase | `els_search_v1`, `admin_people_identity_review_v1` called by code but absent in the DB | dormant paths | preexisting |
| Client telemetry | `runtime_error` channel silent since 4.11 23:41Z; boot failures leave no trace in public-reading mode | 36 events in 96 h, none since | preexisting (owner decision 7.11 narrowed telemetry); **not changed** |
| CI | 178 failures 4-7.11 of 1,208 runs; none on `main` since the removal; the four failures caused by the cleanup appeared only on the removal branch and were fixed inside #1239 | run ids in the session evidence | see §3 |
| CI | CI/test traffic hits **production** Supabase: ~63,700 requests/day incl. `ingest_event` and `track_visit` writes (headless runners on :4173/:4174/:4180) | W1 edge logs | preexisting; the Release Visual guard on the RC fixes one spec; the other Playwright gates need their own guard = gate change, **owner approval** |

## 3. The Legacy cleanup: what it removed, what it broke, what it left

* Removed (#1239, 635 files): 415 true deletions + 3 moves (net src -394: components 247, lib 77, pages 68), `index.html`, the Legacy build target, 18 test files, 9 scripts. Verified independently: 0 dangling imports from `src/main2029.jsx` (878 modules), 0 workflow/package-script paths missing, `vercel.json` has no `/index.html` destination, `api/`, `middleware*`, `public-reading-deploy`, `supabase`, `public` are byte-identical across the merge, build clean.
* **Caused by the cleanup (all small):** (1) the analytics route-effects proof lost its slice marker (repaired on the RC, `175009965`); (2) a workflow step named a deleted script and was silently skipped for ~1 day until #1255, and the guard that now prevents it has a path-prefix gap (fixed, B1); (3) the 120-day telemetry-cap SQL assertions were dropped with the AdminPage test (restored, B1); (4) two bot-migration content guards were not re-homed (added, B1); (5) the last copy of the stale-chunk recovery and of the app error boundary went with the Legacy files, and the last copy of the GSC/Facebook verification tags and the WebSite/Organization JSON-LD went with `index.html` (A1, A8); (6) the human-gate / moderation / credits admin UIs have no 2029 replacement: 53 RPCs and 7 deployed edge functions have no caller (owner decision, below); (7) one `xlsx` dependency with no importer and a known vulnerability (removed, C2); (8) dormant 2029 files with broken imports (EntityHub functional pair removed, C3; Companion cluster kept, below); (9) gate coverage: the lightbox "whole image, never crop" visual contract has no 2029 replacement (owner decision).
* **Test baseline across three trees** (803 / 791 / 812 non-browser files; 95 browser files excluded): exactly 1 file passes before and fails after the removal (item 1 above). 40 files fail on all three trees (6 need PostgreSQL/Docker, 34 are contract drift from owner-approved changes; 35 of the 40 are wired into no workflow). 14 files fail on the pre-removal and post-removal trees and pass on the RC (10 already on `main`, 4 RC-only). The 18 deleted test files were all deleted for removed subjects; the preserved assertions were replayed (16 of 17 pass; the 17th hits a negative-guard path).

## 4. Fixes and removals on the RC

Every item below was implemented in its own worktree off the RC, reviewed by an independent agent that re-ran the tests and tried to refute it (rejected items got one revision and a second review), and then cherry-picked without conflicts. Verification on the integrated tree: `npm run build` exit 0 (only the pre-existing >500 kB notice), the Legacy-retired, module-boundary, isolation, built-graph, theme-isolation and first-load-graph gates pass, and every added or changed test file passes (60 files, three consecutive runs in a depth-1 clone for the newly wired ones). Nothing was deployed and no DB/Storage/Auth/permission/Production state was touched.

### 4.1 Fixed (code on the RC)

| ID | What | Evidence |
| --- | --- | --- |
| A1 | Stale-bundle recovery (`appRecovery2029`: one automatic reload per entry build, fail-closed when storage is unavailable) + `ErrorBoundary2029` around the lazy routes with a Hebrew fallback; restores the dropped reliability assertions | Lab: before = blank app (`#root` empty, no reload); after = 14/14 browser scenarios at 390 and 1440; 8 of 9 mutations killed (the 9th was redundant code, removed) |
| A2 | `/api/card` hard deadline (504 no-store) and font-safe glyph normalisation | 5 production timeouts of 300 s on 6.11; stalled-render and `∩⊂` contract tests |
| A3 | Browser no longer queries the service_role-only `cross_method_strength` view | ~1,100 permission-denied requests/day removed at the source; same `available:false` result shape |
| A4 | `els-search-bridge` does not ask Auth about the anonymous key | 213 `bad_jwt` 403/day; source only, **Edge deploy needs approval** |
| A5 | Guest preferences RPC only for guests | members got 403 on the anon-only RPC |
| A6 | Push RPC deploy-order hazard: graceful fallback + `supabase/proposed/APPLY-BEFORE-DEPLOY.json` and a CI contract that every client RPC exists or is listed | the RC's own DEF-001b change would have broken subscribe if deployed before the SQL |
| A7 | Missing `/assets/*` answered as a cheap plain 404 at handler level | `vercel.json` routing untouched |
| A8 | GSC/Facebook verification metas + WebSite/Organization JSON-LD restored on `/` only | needs the owner's confirmation and a deploy |
| A9 | ELS registry aligned with the router (public, Classic) | needs a Raziel Edge redeploy to take effect |
| B1 | Workflow-reference guard now covers `src/ supabase/ api/ tools/`; 120-day retention-cap assertions restored; bot-migration guards re-homed | mutation-checked |
| C1 | Removed retired 3D stubs, broken stage3 harness, `design-backup-441.js`, three dead analysis tools (11 files) | dist byte-identical to the parent build |
| C2 | Removed the unused, known-vulnerable `xlsx` dependency | package.json + lockfile only; `npm ci --dry-run` ok |
| C3 | Removed the orphan EntityHub functional page, its controls and two orphan CSS files (4 files) | route unchanged; dist identical |
| C4 | Removed 239-export-class dead client wrappers orphaned by #1239 (guard-neutral set only; −1,950 lines in `supabase.js`/`visits.js`) | build + 88 related tests + 80-load browser smoke; **171 chunk hashes change, so A1 must ship before or with it (it does: same RC)** |
| C5 | Trimmed the obsolete Legacy/Companion blocks from five unwired browser tests | each file run before/after |
| D1-D8 | 34 contract-drift test files triaged: **28 stale expectations repaired, 10 stale references repaired**, 2 pass now, 8 environment-only (PostgreSQL/Docker/root; verified under a non-root PostgreSQL 16 where possible), 3 real product violations and 4 owner decisions left failing and described | no assertion deleted or loosened; mutation checks |

### 4.2 Found but deliberately not changed (owner decision)

* **Real product violations the repaired tests now describe** (not changed because they change visible design): 26 `color:var(--s29-accent)` declarations that should be `--s29-accent-text` (6 CSS files, test `accent-text-contrast-2029`); Home shows a calendar date next to relative time (`HomeComposition2029.jsx:124,136`, test `date-display-rule-2029`).
* **Stale browser-test fixtures** (hero post without the documentation category; series-shaped posts; contributor first-load research read) in four unwired browser tests: need a fixture/expectation refresh by the Home/contributor owners.
* **The Heichal scripture-capabilities test** is stale too (inline token after the panel refactor); Heichal is excluded from this work, so it was restored byte-for-byte and left failing exactly as before.
* **Side effect to disclose:** two verification scripts run by an agent while checking C4 (`scripts/test-journey-source-integration.mjs`, the posts-map audit scripts) write fixed paths outside the repo (`/workspace/artifacts/...`, `/workspace/shared/downloads/...`) and read live Supabase anonymously; those files live on this ephemeral sandbox disk only and no repository file changed.


## 5. What stays, with the reason (not Legacy code, or not deletable without an owner decision)

* **Name-only "legacy" (keep):** `legacy_id` and archive data, `LEGACY_TAXONOMY_ALIASES`, `publicReadingContinuation` (old WordPress URLs), identity `legacy_seed` edges and `contributors_claim_legacy`, `worldLegacyReplayProjection`, `LegacyOpenWebChat2029` (pinned by the G4 release spec), the `sod-theme` seed key, `sod_legacy_newsletter_invite_until` keys, `public/legacy-dark-bg-2026-09-30.png`. Shared infrastructure listed in CLAUDE.md. Historical docs are never deleted.
* **Needs ZURIEL (decision, not code):** Cardcom payment bridge (`api/cardcom-*`, `server/cardcom.js`; not a Legacy artifact: one real approved payment 25.10, S4 gate); Companion cluster (approved Design V2 §11.8, hidden by ZURIEL 1.11; REMOVAL.md residual 1); `nameCard.js` (Foundation logic parked by REMOVAL.md); three orphan public assets (`els-logo.png`, `gate-bg.jpg`, `shofar.mp3`: external hotlinks cannot be excluded); `public/` static pages and the PWA/SW/manifest group (install behaviour, pinned by tests); gate-pinned dead exports (edits fixed gate pins); `theme.js` (edits live-function packaging and its guard); `CommunityCalculatorPage` default tree and `PersonJourney`/`TzofenEmbed` dead variants (behaviour-neutral but medium/high risk); `og.js` default-mode metadata; `2029.html` meta-description wording; replacing the human-gate/moderation admin UIs with `/2029/control` surfaces; the lightbox contract; deploy-time items (Vercel Skew Protection, `/assets` routing, the CI-traffic guard for the other Playwright gates, required status checks on `main`).
* **Branches:** 1,537 remote branches; `claude/2029-legacy-separation-e8j9tf` is merged and gone; 241 fully merged, 39 superseded by the cleanup, 1,233 carry unmerged content. Nothing was deleted; the proofs and candidate classes are in the session evidence (`branch-inventory.md`). Deleting branches needs ZURIEL (CLAUDE.md) and archiving first (REMOVAL.md item 9).

## 6. Not verified (stated plainly)

* Real-user browsers other than headless Chromium 141; real data-dependent render paths (all Supabase reads were stubbed empty in the lab sweep); Safari/Firefox/iOS/Android.
* Per-request HTTP status counts for the live site (the observability query API returned 400); client errors that never log server-side.
* Google Search Console ownership by another method (the tags are restored in code but need the owner's confirmation and a deploy).
* The 95 browser/Playwright test files per tree and 6 PostgreSQL/Docker tests (inconclusive in this sandbox).
