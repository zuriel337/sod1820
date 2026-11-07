# SOD1820 audit remediation — 2026-11-06

> Branch `claude/sod1820-audit-remediation-g93w32`, based on `origin/main` `1f0863938062d85757e93043f568ec5eeb0d72f2` (= Production at the time of writing).
> **Nothing here was merged, deployed or applied.** No production DB / Storage / Vercel setting was changed. SQL lives in `supabase/migrations/` (files only, not applied) and `supabase/proposed/` (needs approval before it may even be moved into migrations).
> Evidence of the diagnosis: [`SOD1820_FULL_PRODUCT_ACCEPTANCE.md`](../../SOD1820_FULL_PRODUCT_ACCEPTANCE.md), [`SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md`](../../SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md).

## 0. Status board

| Defect | State | What exists | Needs from ZURIEL |
|---|---|---|---|
| **DEF-001 (P0)** e-mail exposure | **Fix + tests ready, NOT applied** | `supabase/proposed/20261106120000_def001_revoke_resolve_visitor_email.sql`, `…121000_def001b_visitor_id_exposure_step1.sql`, `supabase/proposed/20261106121500_def001b_push_subscriptions_lockdown.sql`, `src/lib/push.js` (RPC calls), tests `tests/sql/def001*.sql`, `test/def001-email-exposure-contract.test.mjs` | **Approve applying the two migrations** (production DB). Step 2 after the frontend release. |
| DEF-002 sitemap 308 | **Fixed in code** | `api/sitemap.js`, `test/sitemap-no-redirecting-locs-2029.test.mjs` | Approve the one-line contract-test change in `test/public-foundation-seo.test.mjs` (see §2) |
| DEF-003 `/video/*` | **Partly fixed in code** (read once, bounded); root cause is DB | `src/lib/research/publicVideoAssetReader2029.js`, `api/og.js`, tests | Decide on the DB-side fix in §3 |
| DEF-004 Storage | **Proposal + tests ready, NOT applied** (finding corrected, §4) | `supabase/proposed/20261106130000_def004_…sql`, `tests/sql/def004_…sql` | Approve |
| DEF-005 public RPCs | **Proposal + tests ready, NOT applied** | `supabase/proposed/20261106131000_def005_…sql`, `tests/sql/def005_…sql`, `test/def005-rpc-grants-contract.test.mjs` | Approve; review §5 "kept public" list |
| DEF-006 GSC / DEF-011 GA4 | **Blocked on access** | §9 lists exactly what is needed | Provide access |
| DEF-007 CI gate | **Fixed** | `live-contracts-2029.yml`, `test/ci-workflow-references-exist.test.mjs` | — |
| DEF-008 gallery CLS | **Fixed (measured)** | `RealityRiver2029.jsx`, `realityRiver2029.css`, test | — (verify on Preview) |
| DEF-009 no `<h1>` in server HTML | Not changed (needs design decision) | §7 | Decide |
| DEF-010 CSP / OpenWeb | Not changed (security-surface decision) | §7 | Decide |
| DEF-011 GA4 on 5 routes | By design (privacy allow-list) — see §7 | | Confirm |
| DEF-012 `page_views` 403 | **Root cause found, fixed in code — PENDING COORDINATION with the analytics session (`claude/sod1820-ci-failures-diagnosis-6z9ej6`)** | `src/lib/supabase.js` (3 lines), `test/def012-page-views-public-build.test.mjs`, its name in the `live-contracts-2029.yml` contracts step | Kept unchanged on the RC branch for now. Do not change or revert before the other session reports. Isolating it later = one commit removing those three items; until then the public build still sends the denied `page_views` insert only if this fix is removed. |
| **DEF-026 (new, P2)** `page_views` anon INSERT still open server-side (`pv_insert`, `WITH CHECK true`) — separate S2 gap; analytics collection decline is a separate problem | **Findings + proposal only; nothing applied** | [`DEF-026-PAGE-VIEWS-SERVER-SIDE.md`](DEF-026-PAGE-VIEWS-SERVER-SIDE.md) (callers/consumers, R1–R3, rollback, test plan, S2 inventory entry) | Choice of R1/R2/R3 + live snapshot + DB change need separate approval; analytics-session confirmation first |
| Correction: `fn_log_name_research` **is** created by `supabase/migrations/20260728_namelab_quality_log.sql` (doc 08 of the failure-correction session says no migration creates it) | **Corrected in RC docs only**; their branch untouched | [`CORRECTION-fn_log_name_research-migration.md`](CORRECTION-fn_log_name_research-migration.md) | Their owner applies the corrected statement; drift check (live def vs file) is a separate read-only step |
| G4 closure map (what was checked, what is open, what to re-run on the RC) | **Mapping only — nothing run** | [`G4-MAP.md`](G4-MAP.md) | Approval to dispatch the gates on the exact RC SHA |
| G4 gate runs on the RC (G4 Public Core, 2029 Isolation, Live Contracts, Observability/SEO) at `352c560` + Release Visual hold analysis | **4 of 4 success — evidence only; G4 stays OPEN**; Release Visual **not run** | [`G4-RUN-RESULTS.md`](G4-RUN-RESULTS.md) | Decision on Release Visual (it has no write-blocking egress guard) |
| S2 inventory entries: `page_views` (S2-A), `fn_name_research_stats` (S2-B, DEF-027), `fn_log_name_research` (S2-C) | **Entries only — no ACL/SQL change** | [`S2-INVENTORY-ENTRIES.md`](S2-INVENTORY-ENTRIES.md) | Owner of the S2 inventory copies them; any DB change needs separate approval |
| Release Visual — **default-deny**, fail-closed egress guard for "Mobile + Accessibility" (round 2: third-party exact allow-list, no "unverified" aborts, CI wiring proof; **Release Visual not run**) | **Prepared for review; nothing run in CI** | [`RELEASE-VISUAL-EGRESS-GUARD.md`](RELEASE-VISUAL-EGRESS-GUARD.md) (identification, design, allow-list register §6, 25 + 10 + 3 proof checks on Node 24.21.0 + Playwright 1.55.0 + its headless shell, 13 mutants caught) | Owner review of the diff; optionally dispatch the proof-only workflow; then approval to dispatch Release Visual on the updated RC |
| DEF-013 sitemap 404 (`/community/researcher/panzer`) | Not changed | §7 | — |
| DEF-014 endpoints missing live | Analysed, not changed | §7 | Decide |
| DEF-015 `/api/card` | **Fixed in code** | `api/card.js`, `public-reading-deploy/api/card.js`, test | — |
| DEF-016/017 anon-insert policies, advisors | Not changed | §7 | — |
| DEF-018 503 family, preview routes | **Analysed — see §6** (no fix needed; owner decision on duration) | | Decide |
| DEF-019 stale sitemap cron | **Fixed** (schedule removed) | `update-sitemap.yml`, test | — |
| Deployment-source question | **Answered, CLAUDE.md updated** | §8 | — |

## 1. DEF-001 — e-mail exposure (P0)

**What was wrong (two paths, both reachable with the public anon key):**
1. `public.resolve_visitor_email(p_visitor, p_uid)` — SECURITY DEFINER, no caller check, default PUBLIC execute; returns `users.email` for a UUID or `notification_prefs.email` for a visitor id.
2. `notification_prefs_guest_get_v1` / `_save_v1` — return the saved e-mail for a guest visitor id. Visitor ids are readable by anon in `push_subscriptions` (policy `ps_anon_select`), `feedback` (policy `feedback_public_read = true`) and `els_records` (table-level SELECT). So "read a visitor id → call the guest RPC → e-mail" works even after path 1 is closed. (`trusted_contributor_uids()` also hands out user UUIDs for path 1.)

**Dependency check (all done read-only against production + repo):** no code in `src/`, `api/`, `public-reading-deploy/`, `server/`, `supabase/functions/`, `middleware*.js` references `resolve_visitor_email`; the only SQL dependent is `els_analytics` (admin-guarded, SECURITY DEFINER → runs as owner → unaffected by the revoke). No policy, view, trigger or cron job references it. No UI reads `email` from the guest prefs RPCs (`WatchButton`, `SystemFrame2029`, `CommunityPersonalActions2029` use topics/channels/intensity). Every other function in `public` that reads an e-mail/phone column or `auth.users` and is executable by a client role carries an admin/`auth.uid()` check (verified by body for `credit_purchase_pending`, `push_sub_list`, `link_visitor_identity`, `admin_*`, `approve_*`, `merge_els_variant`, `moderate_els_matrix`, `els_analytics`). Table-level: no table with an e-mail/phone column is readable by `anon`; `authenticated` can read `notification_prefs.email` only for its own row (policy `np_auth_select`), `users` exposes only `id, username, display_name, avatar_url, role, tier, created_at, is_researcher`.

**Fix:**
* `20261106120000_…`: `REVOKE` execute on `resolve_visitor_email` from PUBLIC/anon/authenticated, `GRANT` to `service_role`, empty `search_path`; both guest RPCs stop echoing the e-mail (`email: null`, `has_email: true/false`; the address stays stored and keeps receiving mail).
* `20261106121000_…` (step 1, backward compatible): `feedback` readable by admins only; `els_records` column-level SELECT without `visitor_id` (all current readers select explicit lists — verified by `test/def001-email-exposure-contract.test.mjs`); two new RPCs `push_subscription_upsert_v1` / `push_subscription_delete_v1` (a direct column-grant approach was tried first and **fails**: `ON CONFLICT DO UPDATE … excluded.*` needs SELECT on every written column — the SQL test caught it).
* `supabase/proposed/…121500` (step 2, **only after** the frontend using the RPCs is live): drop the four `ps_anon_*` policies and revoke anon table access on `push_subscriptions`.
* `src/lib/push.js` now calls the RPCs. In the public-reading build the request worker (`public-reading-deploy/transport.js`) denies every write that is not on its allow-list, and push subscribe/unsubscribe was never on it — behaviour there is unchanged (denied before and after).

**Tests (`scripts/run-def001-sql-test.sh`, disposable PostgreSQL only):** baseline reproduces the exposure; after the migration anon and authenticated are rejected on both call styles, service_role still resolves, the admin-guarded dependent keeps working and a non-admin stays rejected, guest RPC payloads never contain an address while topics/channels/intensity are unchanged, bad visitor ids are still rejected, `feedback`/`els_records`/`push_subscriptions` visitor ids are unreadable for anon/authenticated while the anonymous push RPC flow (insert, upsert-update, delete, no takeover of an account-owned endpoint) works. A negative control (migration skipped) fails as it should. Synthetic identifiers only (`example.invalid`). `scripts/sql/audit_email_exposure_v1.sql` is a read-only query to re-run on production **after** applying; expected: no rows.

**Rollout order (needs approval at each production step):** (1) apply `…120000` and `…121000`; (2) release the frontend that contains the `push.js` RPC calls; (3) apply the step-2 lockdown; (4) re-run `audit_email_exposure_v1.sql` and the Supabase security advisor. Rollback: re-grant execute to `anon, authenticated` (function), re-create `feedback_public_read`, `grant select on public.els_records to anon, authenticated`, drop the two RPCs.

## 2. DEF-002 — sitemap lists redirecting URLs

`publicPostAddress()` keeps the stored WordPress link path (`/<slug>/`) as the "preserved original address" and the sitemap emitted it, while the edge answers that form with a `308` to `/<slug>` and the served canonical is slash-free. GSC data agrees with the slash-free form (695 root URLs receive impressions, 3 slash URLs). Fix: the sitemap emits the slash-free form (`sitemapPostPath`, `api/sitemap.js`); the client-side address contract (`publicPostHref`) is untouched.

**Contract note for approval:** `test/public-foundation-seo.test.mjs` line 1 asserted `<loc>…/old-original/</loc>` (the slash form). It now asserts the slash-free form and that the slash form is absent, with a comment pointing here. The third test in that file (metadata owner canonical `/old-original/` on the preview adapter) is **not** changed. If you prefer the opposite policy (serve the slash form, redirect the other way), the fix is different — say so before merging.

## 3. DEF-003 — `/video/*`

Root cause (read-only `EXPLAIN ANALYZE`): `video_media_assets_v1` re-derives every video placement (a regexp scan over ~1,300 posts, CTE + window functions) **on each query: 1.29 s**. `fetchPublicVideo2029` reads it twice per request (identity, verification) → ~3.7 s per page, 503s when several requests overlap (the 8 s PostgREST timeout, 5 parallel requests).
Code fix (safe, shipped here): a per-request reader answers the verification read from the identity read (the call order and every comparison of `fetchPublicVideo2029` are unchanged — the existing contract test still passes), reads are bounded by an 8 s timeout. Expected: one view read (~1.3 s) instead of two.
**Real fix needs the DB (not done):** materialize the projection (e.g. `materialized view video_media_assets_mv` refreshed by pg_cron every few minutes, and point `video_media_assets_v1` at it) or index `post_media_raw`. That changes a production view used by sitemap/search → **needs a decision**.

## 4. DEF-004 — Storage (finding corrected)

My diagnosis said the `community_authenticated_media_paths_v1` policy was permissive and therefore ineffective. **That was wrong**: `pg_policy.polpermissive = false` — it is RESTRICTIVE, so anonymous *videos* and account-scoped paths are already blocked. What remains open (verified): (a) anon and authenticated may store **any non-video file of any size** at `gallery/community/<anything>` (three `image/svg+xml` objects exist from 2026-09-03; the anonymous flat path is a live feature — `ReportHint.jsx` — and the last flat upload is from 2026-09-03); (b) `public_upload` lets **any signed-in user create an object at any path** in the bucket. Bucket `gallery` has no size/MIME limit and holds admin video (max 115 MB), PDF, docx, vtt and html objects, so a bucket-wide MIME allow-list was **not** proposed (it would break service-role admin tooling).
Proposal (`supabase/proposed/20261106130000_def004_…`): replace the two broad INSERT policies by (1) anon+authenticated flat `community/<ts>-<rand>.<raster image ext>` and (2) authenticated, own prefixes only, per feature (community uid folder, `avatars/<uid>-…`, `sod1820/hints/<uid|anon>/…`, `sod1820/ciphers/c-….png`, `sod1820/<key>-thumbs/….jpg`), admin unchanged. Object size cannot be limited by Storage RLS — needs an upload-intent function (`media-upload-intent` exists) or a dedicated bucket with `file_size_limit`; not done. **Behaviour change to approve:** SVG/HTML etc. through the anonymous report form are rejected; unlisted client upload paths stop working (grep of `src/` found none).

## 5. DEF-005 — public RPCs without a guard

Method: every SECURITY DEFINER function in `public` executable by `anon` (295) → heuristic body check for an admin/`auth.uid()` guard (209 guarded or public reads) → for the remaining unguarded ones: write? repo callers (client / middleware / API / edge / ops)? DB dependents (functions, policies, views, triggers, cron)?

| Class | Functions | Decision |
|---|---|---|
| **A — server-side only** (no caller anywhere, or only service-role edge/cron) | `check_security_spike`, `fn_detect_pattern_contradictions`, `fn_detect_patterns`, `fn_raziel_claims_gc`, `fn_rls_grant_audit`, `fn_scan_reeval`, `snapshot_seo_wave`, `refresh_traffic_daily`, `enqueue_word_review`, `trusted_contributor_uids`, `push_sub_count`, `fn_metatron_gaps`, `fn_metatron_status`, `fn_cohort_acceptance`, `fn_decision_reeval_check`, `contrib_unlock` (boolean oracle on access codes), `record_feedback`, `vote_translit`, `log_translit_query`, `increment_post_share_by_slug`, `log_edge_geo` (both overloads), `fn_outbox_bump`, `fn_raziel_claim`, `router_rate_check`, `blocked_countries` | **Revoke from PUBLIC/anon/authenticated; grant service_role** (proposal) |
| **B — signed-in only** | `ai_quota_check` (edge `ai-analyze`) | Revoke from anon/PUBLIC, keep authenticated |
| **C — kept public, writes** (client or middleware calls them) | `ingest_event`, `track_visit`, `log_crawl`, `log_edge`, `log_security`, `log_journey_ab`, `log_journey_save`, `fn_log_name_research`, `recent_number_opens`, `propose_community_word`, `lang_link_add`, `ai_signal`, `increment_post_share`, `add_wall_word`, `save_wall_word_private` | Required public. Abuse surface = spam/size → needs rate limiting / argument caps at the edge (not done) |
| **D — kept, INVOKER dependency** | `fn_els_search` (called by the anon-executable INVOKER function `fn_els_for_name`) | Keep (revoking would break it) |
| **E — public reads** (≈110: name/number/ELS/community/people readers) | e.g. `community_feed_page`, `number_dossier_json`, `fn_name_multi`, `people_public_rows_v1` … | Keep. Heavy ones are bounded by the 8 s `authenticator` statement timeout; `anon` itself has no role timeout — a 3–5 s `ALTER ROLE anon SET statement_timeout` is recommended after measuring the slowest legitimate call (not done) |
| **F — secret-gated bridges** | `cardcom_*`, `membership_pilot_*` (`p_bridge_secret`) | Have a secret argument; left as is |

`test/def005-rpc-grants-contract.test.mjs` fails if any Set A/B name gains a shipped caller; `tests/sql/def005_…` proves privileges, service_role access and that the INVOKER chain survives. Edge functions that call Set A use the service role (`wa-*`, `field-router`; verified in source); `ai-analyze` was not verified, hence Set B.

## 6. Preview routes and the 503 family (DEF-018)

**`/galaxy`, `/lab`, `/stream`, `/sulamot*`, `/start`, `/join`, `/enter`, `/editor`, `/research-viewer`, `/meaning-lab`, `/credits`, `/buy`, `/2029/preview`, `/2029/home-preview`, `/2029/kingdom`** (browser check, 390 px): all answer 200 + `noindex, nofollow`; they render a static notice ("תצוגה ניסיונית שנשמרת להמשך ואינה פתוחה בגרסת האתר הזאת. למפת הזמינות", or for `/editor`: "זהו מסך פרטי. הגישה דורשת חשבון והרשאה…"), contain **no form or input**, make **no write request** (the only POST is the shell's read RPC `world_group_source_arrivals_v2`), read only the same public `posts`/`topic_cards_public` the whole site reads, and do not touch the public product. They meet every condition you listed → **kept as is**. (`/2029/kingdom`, `/2029/home-preview` carry the same gate in production; the env-flagged routes in `App2029.jsx` are not mounted.)

**`/heichal`, `/היכל`, `/archive`, `/broadcasts`, `/cross`, `/languages`, `/name`, `/name-lab`, `/numbers`, `/reality`, `/spatial-gematria`, `/research`:** this is **not a fault**. `PUBLIC_TEMPORARILY_CLOSED_PATHS` (`src/lib/publicReadingRelease2029.js:130`) deliberately answers `503 + Retry-After: 259200` with an explanatory page ("ההיכל נמצא בבנייה… האזור סגור זמנית וייפתח בקרוב", with a link to the available alternative). Findings: (a) the home page links to `/archive` and `/heichal`, `/map` links to `/heichal` and `/name`, so visitors do reach them; (b) `/gallery-updates → /archive` and `/gematria-3d → /spatial-gematria` are **308 (permanent) redirects to a 503 page**; (c) `x-robots-tag: index, follow` on a 503 keeps the URL in play for as long as Google tolerates it (days, then drop).
**No code change** — which of these are "opening soon" and which are retired is a product decision (Legacy retired 5.11). Recommended policy once you decide: *coming soon, ≤ 2–3 weeks* → keep the 503 + banner; *no date* → serve the same banner as 200 + `noindex` (like the preview routes); *retired* → 410 or redirect to the replacement. In all cases change the two redirects to 307 while the target is closed. I did not open any system or permission.

## 7. Items analysed but not changed (and why)

* **DEF-009 no `<h1>` in server HTML** — the shell is a deliberate loading document; a global `<h1>` would repeat on every route. A per-route server snippet is a design decision (SEO/AI-discovery plan).
* **DEF-010 CSP / OpenWeb** — `realtime.openweb.com` and `ads-configs-cdn.openweb.com` are blocked by `connect-src`; the contract test pins the `spot.im` origins and the request worker passes only `*.spot.im`. Allowing the new vendor hosts is a security-surface change (and `ads-configs-cdn` implies ads) → needs your decision; the exact patch would be `connect-src … https://realtime.openweb.com` in `public-reading-deploy/vercel.json` plus the same host in `transport.js` line 217 and `test/public-reading-full-account-transport.test.mjs`.
* **DEF-011** — `readingTelemetryPath()` is an explicit allow-list (privacy by design, D37:12.57): `/login`, `/2029/journey`, `/heichal` are intentionally unmeasured; `/code` and `/community/researchers` are the two questionable ones.
* **DEF-013** — one researcher slug in the sitemap has no public profile; the filter belongs to the community-people owner.
* **DEF-014** — `cardcom-*`, `honeypot`, `og`, `contributor-curation`, `world-finding-review` are not in the live deploy root; admin screens that call them get 404/405 and `/buy` has no payment endpoint. Whether payments/admin tools should be live is a product decision.
* **DEF-016/017** — the open anon-insert policies (`WITH CHECK true`) and the advisor items need per-table owners; `redirect_map` / `topic_cards_public` are SECURITY DEFINER views by design.

## 8. Why a "second" Production deployment appeared (CLAUDE.md updated)

Checked in Vercel and GitHub, not from documents. **Every** Production deployment from 5.11 22:29 to 6.11 06:52 (11 of them) was created by **Vercel MCP under the `zuriel337` account** (`list_user_events`: "You deployed … to production (via Vercel MCP)"), none by Git Integration. The build log of `dpl_7Hn7…` runs the per-deployment Ignored Build Step `if [ "$VERCEL_ENV" = "production" ] && [ "$VERCEL_GIT_COMMIT_SHA" = "<exact sha>" ]; then exit 1; elif [ "$VERCEL_GIT_COMMIT_REF" = "main" ]; then exit 0; else exit 1; fi` — i.e. a build is allowed only for the exact SHA in the request and every other `main` build is skipped, exactly as CLAUDE.md describes. `git.deploymentEnabled=false` holds in both roots; the two workflows that run on push/deployment do not publish. So the protection is **not broken**; what I saw was another session executing the documented procedure ~60–90 s after a merge. `ssoProtection=all_except_custom_domains`: previews protected, public domains open — as expected. CLAUDE.md now records this, the evidence, and the rules (merge and deploy are separate approvals; re-read the alias before reporting; a deployment without the exact-SHA command or "via Vercel MCP" is an anomaly). `AGENTS.md` differs from `CLAUDE.md` and was not touched. The deployment mechanism was not changed.

## 9. What I need from you (exact list)

**Google Search Console** (property `sod1820.co.il`; domain property if it exists) — read access for the audit account, or exports: *Pages → Indexing* report (CSV, incl. "Why pages aren't indexed"), *Sitemaps* (status + discovered URLs for `/sitemap.xml`), *Performance* last 90 days by page and by device, *URL Inspection* of 10 URLs I will list (home, one post, one number, one video, one root-slug), *Core Web Vitals* report, *Crawl stats*. Note: the synced `gsc_metrics` stops at 2026-11-03, i.e. before the 4.11 cutover.
**GA4** (property `GA_PROPERTY_ID`, measurement `G-V3H3E20FLY`) — Viewer access or exports: *Realtime* snapshot while I load 3 pages from a browser; *Reports → Pages and screens* last 7 days (the 5 routes without GA); *Admin → Data streams* (domain list, enhanced measurement, consent mode), *Events* list and *DebugView* access for one test session.
**Vercel** — *Speed Insights / Web Analytics* for the project (LCP/INP/CLS field data), *Observability → Functions* (duration, errors for `/api/card`, `/api/public-document`).
**Test accounts** — one ordinary Google account and one Facebook account used only for testing (and a non-admin and an admin test user) so the signed-in journeys (community post, personal area, saves) can be verified on a Preview.
**Preview** — approval to create a Preview deployment of this branch (the repo's gates require a protected Preview; none was created).
**Decisions** — §2 (sitemap contract), §3 (video DB fix), §4 (Storage behaviour), §5 (class A/B list), §6 (which closed areas reopen), §7 (CSP, `/code` analytics, payment/admin endpoints).

## 10. Verification run in this session

* Local: all new JS tests (42 assertions across the new/changed suites), the four SQL suites on a disposable PostgreSQL 16 (negative control included), `scripts/test-2029-server-seo-ai-parity.mjs`, `scripts/test-unified-video-projection-2029.mjs`, `test/bot-read-*` pass. Pre-existing failures that are **identical with and without these changes**: `test/doc37-closed-side-effects.test.mjs`, `test/public-reading-production-artifact.test.mjs`, `test/public-reading-public-candidate.test.mjs`, `test/public-reading-protected-review.test.mjs` (need a built artifact / receipt).
* CLS on a local public-reading build (same harness reproduces production numbers: 0.263 phone): `/gallery` 0.263 → 0.061 (phone), 0.238 → 0.057 (desktop); home unchanged (0.000 / 0.007). Tools: `docs/reviews/audit-remediation-20261106/tools/`.
* GitHub Actions `2029 Live Contracts` dispatched on the branch (see the report).
* Not verified: anything that needs a deployment (the CLS result on a real Preview, `/video` latency, `/api/card` caching headers on the CDN), and the SQL against the real Supabase schema (fixtures mirror the dumped policies/definitions, not the whole database).


---

# Round 2 (after ZURIEL's decisions of 2026-11-06)

| Item | State | Where |
|---|---|---|
| P0 package for point approval (final SQL, impact, order, rollback, proof matrix) | **Ready — awaiting your approval** | [`P0-APPROVAL-PACKAGE.md`](P0-APPROVAL-PACKAGE.md); rollbacks `supabase/proposed/ROLLBACK_*` are executed inside the SQL tests |
| Storage + RPC (policy diff, who is affected, proof) | **Ready — awaiting approval** | [`STORAGE-RPC-APPROVAL.md`](STORAGE-RPC-APPROVAL.md) |
| `/video` DB solution (materialized projection, indexes, refresh, cost, rollback) | **Ready — awaiting approval**; code switch dormant (`SOD_VIDEO_ASSETS_MV=1`) | `supabase/proposed/20261106140000_def003_…`, `tests/sql/def003_…`, `src/lib/research/publicVideoAssetReader2029.js` |
| OpenWeb / CSP | Analysed, no change | [`OPENWEB-CSP-ANALYSIS.md`](OPENWEB-CSP-ANALYSIS.md) |
| GSC / GA4 / Vercel / test accounts — exact instructions | Done | [`GSC-GA4-ACCESS.md`](GSC-GA4-ACCESS.md) |
| Series plan, auto-registration, archive, legacy, `/heichal` | Findings + one open question | [`SERIES-AUTOREGISTRATION.md`](SERIES-AUTOREGISTRATION.md) |
| `/sulamot*` marked legacy | Done (comment + guard test) | `route-legitimacy.js`, `test/legacy-routes-served-as-notice-2029.test.mjs` |
| New defect found: `/updates` (home nav) and `/raziel` (map) returned a bare edge 404 although a designed page exists | **Fixed** (allow-list) | `route-legitimacy.js`, `test/route-legitimacy-service-pages-2029.test.mjs` |
| Internal-link crawl (18 key pages, 123 internal links) | 115 × 200, 3 × 308 (aliases), 3 × 503 (closed areas, by design), 2 × 404 → both fixed above | `docs/audit-evidence/20261106/` |
| JSON-LD validity (70 live pages, Article/VideoObject/WebPage/Breadcrumb) | 70/70 parse and carry the required properties | — |
