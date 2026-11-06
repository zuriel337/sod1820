# SOD1820 code inventory (read-only)

Basis: local checkout HEAD `42ff15120` (branch claude/sod1820-product-audit-g93w32). The brief named `1f0863938`; that SHA is not an ancestor of this HEAD and `origin/main` is not resolvable locally (no fetch was done). Treat every line citation as "at 42ff15120".
Live artifact = `public-reading-deploy/` (own vercel.json, api/, middleware.js re-exporting ../middleware.js). Root `vercel.json` and root `api/` are NOT the live deploy root. Legacy is not inventoried. No production service was called. Anything that lives only in the Vercel/Supabase dashboards is marked UNKNOWN.

Live build facts that govern the rest of this file (`scripts/build-public-reading-production.mjs:77-86`): `VITE_PUBLIC_READING_RELEASE=public-reading-20261101` is forced, so `PUBLIC_READING_RELEASE` is true (`src/lib/publicReadingRelease2029.js:5-6`). Eight preview flags are forced to "false" (`VITE_PUBLIC_FRAME_PREVIEW, _FOUNDATION_PREVIEW, _PUBLIC_LAUNCH_READ_ONLY_PREVIEW, _INTEGRATED_PREVIEW, _KINGDOM_PREVIEW, _BOOK_PUBLICATION_REVIEW_PREVIEW, _UNLOCKED_2029_PREVIEW, _FUNCTIONAL_UNIFIED_PREVIEW`). Because `publicFoundationPreview = ... || PUBLIC_READING_RELEASE` (`src/App2029.jsx:57`), the root-level public route block is registered in live.

---
## 1. ROUTES

### 1a. `<Route>` inventory, `src/App2029.jsx` (64 `<Route`, 60 literal `path=`; line = App2029.jsx)

Router-level gate for ALL routes: `PublicReadingBoundary` (L287-306) calls `publicReadingContinuation` / `publicReadingPath` / `publicReadingCapability` (`src/lib/publicReadingRelease2029.js`). States: continuation (client redirect), account, closed (status page, 503 for the temporarily-closed list), missing (404), admin-view (admin sees closed areas with a banner), public.

| L | path | element | gating |
|---|---|---|---|
| 319 | /2029 | HomeEntry2029 | public |
| 321 | / | PublicHomeEntry2029 (?p= -> PublicPostAddress) | `publicFoundationPreview` (true live) |
| 322 | /post | Posts2029Page | same block |
| 323 | /verified | Posts2029Page verifiedOnly | same block |
| 324 | /number | PublicServices2029Page kind=number-search | same block |
| 325 | /number/:value | NumberAddress2029Page | Locked lock_number requireFlag (open to everyone live: openFlags `publicReadingRelease2029.js:28`) |
| 326 | /gallery | Gallery2029Page | Locked lock_world (open live) |
| 327 | /gematria | GematriaEntry2029 (shared-result -> Calculator2029Page else CalculatorPro2029Page) | block |
| 328-329 | /tag/:slug, /category/:slug | PostsTaxonomy2029Page | block |
| 330 | /community | Community2029Page | block |
| 331 | /community/calculator | CommunityCalculator2029Page | block |
| 332, 333 | /community/researchers, /members | PublicContinuity2029Page kind=people | block |
| 334 | /community/comments | PublicContinuity kind=comments | block |
| 335-336 | /forum, /forum/:id | PublicContinuity kind=forum | block (Vercel+continuation also send /forum -> /community/chat) |
| 337 | 3 paths of `PUBLIC_HISTORICAL_LECTURE_PATHS` | PublicContinuity kind=historical-lectures | block |
| 338-339 | /or-geula, /or-geula/video/:id | PublicContinuity kind=or-geula | block |
| 340 | /contact | PublicContinuity kind=contact | block |
| 341-342 | /codes, /codes/:slug | PublicLibraryContinuity kind=codes | block |
| 343 | /privacy, /unsubscribe, /updates, /map | PublicServices2029Page (generated via map) | block; /unsubscribe public only for production artifact, /updates "service-closed" (`publicReadingRelease2029.js` publicReadingPath) |
| 344 | /:slug | PublicPostAddress2029Page (WP-style post address) | block |
| 346 | /2029/preview | IntegratedPreview2029Page | env `VITE_INTEGRATED_PREVIEW` (forced false live) |
| 347 | /2029/preview/follow-center | FollowCenterPreview2029Page | env `VITE_FOLLOW_CENTER_PREVIEW` (NOT forced false by build script; boundary still lists it as closed "experiment") |
| 348 | /2029/home-preview | HomePreview2029Page | none (boundary: closed experiment live) |
| 349 | /melech-hamisparim/718 | Campaign718Page2029 | public |
| 350 | /early-access | EarlyAccess2029Page | public |
| 351 | /2029/kingdom | Kingdom2029Page | env `VITE_KINGDOM_PREVIEW` (forced false) |
| 352 | /2029/gematria | GematriaEntry2029 | public |
| 353 | /2029/gematria/viral | Calculator2029Page | public |
| 354 | /2029/calculator | CalculatorPro2029Page | public |
| 355-362 | /beit-midrash, /beit-midrash/:method | BeitMidrash2029Page | public |
| 363 | /world | WorldEntry2029 (?view=gallery -> Gallery) | Locked lock_world (open live) |
| 364 | /topic/:slug | Topic2029Page | Locked lock_world |
| 365 | /2029/posts | Posts2029Page | public |
| 366 | /posts | Posts2029Page | env `VITE_FUNCTIONAL_UNIFIED_PREVIEW` (forced false live; live /posts is a redirect to /post) |
| 367 | /research | GematriaEntry2029 | env `VITE_FUNCTIONAL_UNIFIED_PREVIEW` OR `PUBLIC_READING_RELEASE` (registered live, but in `PUBLIC_TEMPORARILY_CLOSED_PATHS` -> 503 + Retry-After for public, admin-view for admin) |
| 368 | /login | AuthPage | account |
| 369 | /auth/callback | OAuthCallback2029 | account |
| 370 | /community/chat | CommunityChatTransition2029Page | public |
| 371 | /2029/journey | LifeJourney2029Page | FramedGate2029 lock_life_journey requireFlag allowAdminView (closed to public live) |
| 372 | /post/:slug | PostEntry2029 | public |
| 373 | /video/:assetId | Video2029Page | public |
| 374 | /books | BooksEntry2029 | `PUBLIC_READING_RELEASE && !isAdmin` -> PublicLibraryContinuity; admin -> Locked lock_books requireFlag allowAdminView |
| 375 | /books/:slug | CanonicalBookAlias2029 -> /book/:slug | alias |
| 376 | /book/:slug | BooksEntry2029 | as /books |
| 377 | /code | Els2029Page | FramedGate2029 lock_els requireFlag allowAdminView (lock_els is in openFlags -> open to everyone live) |
| 378 | /els | ElsAddressAlias2029 -> /code | alias |
| 379-380 | /heichal, /היכל | Heichal2029Page | Locked lock_heichal requireFlag allowAdminView (closed live; also 503 temp-closed list) |
| 381 | /community/researcher/me | WriterMe2029Redirect (in Sod2029Shell frame) | account |
| 382 | /2029/me/:module | WriterPersonal2029Page | account |
| 383 | /community/researcher/:slug | PublicContributor2029Page | public |
| 384 | /researcher/:slug | Researcher2029Page | Locked lock_world |
| 385 | /2029/number/:value | NumberAddress2029Page (live) / Number2029Page | Locked lock_number requireFlag |
| 386 | /entity-hub-preview/:type/:key | EntityHubPreviewPage | none in router; boundary lists it as closed experiment |
| 387 | /2029/control | ControlEntry2029 -> ControlPlane2029Page (sub-surfaces only if `VITE_BOOK_PUBLICATION_REVIEW_PREVIEW`, forced false) | private (boundary: login required; admin-view) |
| 388 | * | PublicServices2029Page kind=not-found | fallback |

Gate mechanics: `MaintenanceLock.jsx` `Locked` -> `useFeatureState` -> reads `site_flags` (`getSiteFlags`, `supabase.js:1905`). Live, `lock_world, lock_number, lock_gematria, lock_books, lock_els` are open to everyone by code (`publicReadingRelease2029.js:28`); `lock_heichal, lock_life_journey, lock_raziel_site` fall to a closed ceiling. Finding: `allowAdminView` is a no-op, because `useFeatureState` hard-codes `adminViewAllowed: false` (`MaintenanceLock.jsx:214, 233`; consumed at L242). Admin access actually comes from `resolveFeatureState` adminBypass and the boundary's admin-view state.

### 1b. route-legitimacy.js (edge 404 for unknown single-segment paths)
- `KNOWN_SINGLE_SEGMENT_ROUTES` (`route-legitimacy.js:7-117`): hand-kept list L8-95 (~87 entries, incl. 11 `sulamot*`, Hebrew aliases, preview pages) plus a derived block L97-115 (from vercel.json single-segment sources; synced by `npm run sync:route-legitimacy`).
- Used at `middleware-core.js:381`: a single-segment path not in the set triggers `public_post_slug_exists` RPC (`middleware-core.js:263-285`, 10-min cache, fail-open), else `routeNotFoundResponse` (404, noindex).
- Single-segment App2029 routes NOT in the known list (checked by running the module): `/updates`, `/raziel` (capability page in `publicReadingCapability`), `/auth`, `/tzofen.html`. Segment families `/video, /topic, /tag, /category, /researcher, /melech-hamisparim` are multi-segment so the check does not apply. Consequence for `/updates` and `/raziel`: the edge returns a hard 404 unless a post has that slug, so the document handler's own "service-closed"/capability status for them is probably never reached. UNKNOWN whether intended.
- Matcher: `/((?!api/|assets/|.*\\.).*)` (`middleware-core.js` config and `public-reading-deploy/middleware.js`).

### 1c. vercel.json vs public-reading-deploy/vercel.json

| Item | root `vercel.json` (NOT live) | `public-reading-deploy/vercel.json` (LIVE) |
|---|---|---|
| redirects | 94: 79 topic slug 301 (`/topic/*-conv-*`), 11 permanent (`/book`, `/books/(.*)`, `/(.+)/`, 2 Hebrew home aliases, 2 recent-posts aliases, 2 post redirects, 2 `/משיח-בשנת-התשעו` -> `/code`), 4 temporary (2 `/tzofen.html` conditional, `/whatsapp/kod-hametsiut`, `/tiktok/melech`) | 589: 484 WordPress attachment -> parent post with `?sourceAttachment=` (permanent/308), 79 topic 301, 24 misc (12 `/embed` aliases, `/book`, `/posts`, 2 Hebrew home aliases, 2 recent-posts aliases, 2 post redirects, 2 `/tzofen.html` conditional, `/whatsapp/kod-hametsiut`, `/tiktok/melech`), 2 patterns (`/books/(.*)`->`/book/$1`, `/(.+)/`->`/$1`); status mix: 506 x 308, 79 x 301, 4 x 307; 0 duplicate sources |
| rewrites | 86: 34 -> /2029.html SPA shell, 23 crawler-UA -> `/api/og?...&crawler=search`, 1 social/AI-bot catch-all -> `/api/og`, 27 -> `/api/honeypot` (wp-admin, .env, .git, ...), `/sitemap.xml` -> `/api/sitemap-public`, `/favicon.ico` -> `/logo.png`, final `/(.*)` -> /2029.html | 7: `/sitemap.xml` -> `/api/public-sitemap`; `/robots.txt` -> `/api/public-robots`; favicon + 2 apple-touch icons -> /brand/2029/*; `/2029.html` -> `/api/public-document?path=/2029`; catch-all `/((?!api(?:/|$)).*)` -> `/api/public-document` |
| headers | 29: 13 X-Robots-Tag noindex groups, immutable cache for /assets and images, 12 hashed background images, global (`/(.*)`: Cache-Control must-revalidate, nosniff, X-Frame-Options SAMEORIGIN, Referrer-Policy, HSTS 1y, Permissions-Policy camera/mic/geo off) | 7: global `/(.*)` = `Cache-Control: no-store`, Referrer-Policy, nosniff, CSP (see section 5); /assets immutable; icons 1 day; /unsubscribe no-referrer+noindex; /tzofen.html noindex + `Vary: Sec-Fetch-Dest`; /api/* noindex; service workers `no-store` + `Service-Worker-Allowed: /` |
| functions / crons | none / none | `functions: api/public-document.js includeFiles .generated/2029.html`; no `crons` |
| other | `git.deploymentEnabled=false` | `git.deploymentEnabled=false`, `framework:null`, `installCommand` `npm ci --prefix ..`, outputDirectory `dist` |

Redirect-target check (script run locally over both JSON files): every non-WordPress destination (`/early-access, /melech-hamisparim/718, /post/..., /post, /, /books, /book/$1, /code, /topic/...`) is an App2029 route. No self-loops and no 2-cycles. No destination equals another explicit redirect source. What exists:
- **Chain (not loop), 496 of 589 live redirects**: each WordPress attachment/embed redirect (and others) has a destination ending in `/`, which is then caught by the later pattern `/(.+)/ -> /$1` (index 585), so the client sees two 308s: `/slug/attachment/76` -> `/slug/?sourceAttachment=..` -> `/slug?sourceAttachment=..`. The document handler's `sourceDocumentContinuation` (`public-reading-deploy/api/public-document.js:20-27`) re-issues the same trailing-slash destination, so the chain survives there too. 248 explicit trailing-slash source twins are also shadowed by the same catch-all. Terminal pages cannot be verified without the DB: UNKNOWN whether each post slug exists.
- Root vs live conflict (root is non-live): root redirects `/משיח-בשנת-התשעו` to `/code`, while the live app serves it as a preserved historical lecture page (`publicReadingRelease2029.js:15-17`). Root also holds 27 honeypot rewrites and 23 `/api/og` rewrites whose targets do not exist in the live deploy (see 2).
- Client-side continuations (`publicReadingContinuation`, `publicReadingRelease2029.js`) duplicate some Vercel redirects (`/book`, `/posts`, `/דף-ראשי*`, `/פוסטים-אחרונים*`). All targets resolve to routes or capability pages; no cycles (`/els`<->`/code` is one-way, `/books/x`->`/book/x` one-way).

---
## 2. API ENDPOINTS

Live functions = the 11 files in `public-reading-deploy/api/`; each is a thin adapter around a root `api/*.js` module. Common live guard: `deploymentAuthorized()` (503 if not the protected-review/candidate build) and `publicReadingOriginAllowed` (421 for other origins) in `public-reading-deploy/authorization.js`. Env var NAMES seen in api/server code: GSC_SERVICE_ACCOUNT, GSC_SITE_URL, GA_PROPERTY_ID, VERCEL_API_TOKEN, VERCEL_ANALYTICS_PROJECT_ID, VERCEL_ANALYTICS_TEAM_ID, CARDCOM_TERMINAL_NUMBER, CARDCOM_API_NAME, CARDCOM_BRIDGE_SECRET, SUPABASE_URL, SUPABASE_ANON_KEY, VERCEL_ENV.

| endpoint | file:line | in LIVE deploy? | methods | auth | reads / writes / third party |
|---|---|---|---|---|---|
| /api/public-document | public-reading-deploy/api/public-document.js | yes (rewrite target of every page) | GET, HEAD | none | serves `.generated/2029.html` with metadata merged from root `api/og.js` handler; 308 to canonical origin; redirect table lookup; 503+Retry-After for closed areas; 404/noindex for missing |
| /api/public-robots | .../public-robots.js | yes | GET/HEAD | none | static policy: `Allow: /`, `Disallow: /api/`, `Disallow: /unsubscribe`, Sitemap; Disallow all when not indexable |
| /api/public-sitemap | .../public-sitemap.js -> api/sitemap.js | yes | GET/HEAD | none | Supabase REST (anon) paged 1000/page up to 100k rows: posts, nodes, galleries, channel_updates, contributors, rpc `sitemap_numbers`; single `<urlset>` (+video ns); `Cache-Control` kept only for canonical GET success else no-store |
| /api/card | .../card.js -> api/card.js (edge) | yes | GET/HEAD | none | 1200x630 (or 1080x1920 `format=story`) PNG via @vercel/og; reads `gematria_words` (anon REST); live adapter forces `Cache-Control: no-store` and `X-Robots-Tag: noindex` (card.js:12-13) overriding the 1-year cache the module sets (api/card.js:270) |
| /api/contributor-public-overview | .../contributor-public-overview.js | yes (read-only wrapper, strips Authorization/cookies) | GET | none | contributors, users.created_at, rpc `studio_list` |
| /api/public-contributor-rank | .../public-contributor-rank.js | yes (read-only wrapper) | GET | none | contributors, rpc `research_level_of` |
| /api/contributor-interactions | .../contributor-interactions.js | yes but GET-only (wrapper 405 on POST) | GET (live) / POST in module | wrapper drops auth; module POST needs Bearer + same-origin | rpc `dm_send` on POST (unreachable live) |
| /api/contributor-self | .../contributor-self.js | yes | GET, POST | Bearer token verified (`verifyReadingPrincipal`), same-origin | GET: users.avatar_url, profiles(xp,credits,streak,tier), rpc `research_level_of`, `dm_inbox`; POST: users.avatar_url update, rpc `update_my_dossier`, `update_my_page_config` |
| /api/ga-insights | .../ga-insights.js | yes (`publicReadingAdminApi`) | GET `?days=1..480` | admin (users.role='admin' via caller JWT); wrapper rejects unknown params | Google Analytics Data API (service account); live passes `refreshCountryHistory:false` so no ingest writes |
| /api/search-console | .../search-console.js | yes (admin wrapper) | GET | admin | Search Console API (searchAnalytics, sitemaps, urlInspection) |
| /api/vercel-insights | .../vercel-insights.js | yes (admin wrapper) | GET | admin | Vercel Web Analytics API with `VERCEL_API_TOKEN`; project/team IDs hard-coded (IDs, not secrets) |
| /api/og | api/og.js (1136 lines) | NO as an endpoint; imported in-process by public-document.js | GET | none | builds the meta/JSON-LD head for every URL; reads Supabase REST/RPC (anon). In live it is called for every visitor, not only crawlers (no UA split) |
| /api/sitemap, /api/sitemap-public | api/sitemap.js, api/sitemap-public.js | sitemap.js only via wrapper; sitemap-public NO (only root vercel.json rewrites to it) | GET | none | sitemap-public reads `site_flags` |
| /api/contributor-curation | api/contributor-curation.js | NO | POST | Bearer user | contributors, rpc `update_my_page_config, studio_list, studio_upsert` |
| /api/cardcom-start | api/cardcom-start.js (+server/cardcom.js) | NO | POST | Bearer user | CardCom checkout; rpc `cardcom_purchase_start_guard, credit_packages_list, cardcom_purchase_register` |
| /api/cardcom-webhook | api/cardcom-webhook.js | NO | POST | CardCom LowProfile id verified server-side + bridge secret | rpc `cardcom_purchase_webhook_lookup, _record_attempt, _finalize, _alert` |
| /api/honeypot | api/honeypot.js | NO | any | none | rpc `log_security` (anon), returns 403 |
| /api/world-finding-review | api/world-finding-review.js (`maxDuration:60`) | NO | GET | admin (users.role) | read-only Supabase REST pages (world findings/gematria/insights) |
| world-corpus-triage-audit.js, world-finding-medium-match-continuation.js, world-finding-triage-continuation.js, world-finding-triage-snapshot.js | api/ | NO | n/a | n/a | data modules with no default export, sitting in `api/` (not handlers) |

Separate artifact `preview-deploy/api/` (5 files: contributor-self, preview-capabilities, preview-raziel, public-document, public-sitemap) is the Preview deploy, not live.

**Frontend references to /api/* that do not resolve in the live deploy**
| caller | endpoint | live result | who is affected |
|---|---|---|---|
| `src/components/contributor2029/contributorCuration2029Model.js:13` (via ContributorReadingController2029) | /api/contributor-curation | not deployed -> 404 | admin only (`publicLaunchActionsLocked` is false only for admin in live, `publicLaunch2029.js:17-19`) |
| `src/lib/research/worldFindingReviewClient.js:50,69,85` (WorldAllResearchTable, `World2029Page.jsx:1259`, admin only) | /api/world-finding-review | not deployed -> 404 | admin World review table |
| `src/lib/visits.js:415` `syncGoogleAnalytics` | /api/ga-sync | no `api/ga-sync.js` exists anywhere; the export has no callers | none (dead code); GA sync moved to the `ga-sync-server` edge function |
| `src/lib/research/functionalPreviewTransport.js:9` | /api/preview-raziel | only in `preview-deploy/api/` | Preview only (loaded dynamically at `supabase.js:1478`) |
| `src/components/contributor2029/contributorInteractions2029.js:12` | /api/contributor-interactions POST (DM) | live adapter GET-only -> 405 | admin only (non-admin actions locked) |
| share/meta code (`thumbResolve.js:25`, `worldFindingShare.js:57`, `CommunityCalculatorPage.jsx:46`, og.js) | /api/card | works (deployed) | n/a |
No frontend caller exists for `/api/cardcom-*`, `/api/honeypot`, `/api/og` (the latter is a comment in ShareActions.jsx:18). The CardCom payment endpoints and `server/cardcom.js` are orphaned from the live product (credits/payment UI is "closed capability" in `publicReadingCapability`).

---
## 3. SUPABASE

Project `linswmnnkjxvweumprav`. **There is no `supabase/config.toml` in the repo**, so `verify_jwt` per function is UNKNOWN from source; only inline comments exist (below).

### 3a. Edge functions: 90 directories in `supabase/functions` (+ `_shared`); 19 are retired/tombstoned/disabled stubs
Retired/disabled (no runtime): admin-card-upload, admin-upload-once, capture-video-thumb, fb-audit, fb-hide-test, g3-openweb-import-once, ga-il-returning, migrate-media, notify-payment, reality-upload, send-test-mail, send-welcome-test, smart-search, storage-cleanup-oneoff, system-watchman, tmp-pancher-upload, tmp-upload, wa-christina, wa-daily-digest.
Called from `src/` (all exist): els-search-bridge(8 refs), newsletter-signup(4), ai-analyze(3), number-researcher(2), wa-system-outbox, send-newsletter, send-family-invitation-email, research-run, raziel-attention, post-save, post-ai-edit, openweb-sso, newsletter-unsubscribe, meta-capi, media-upload-intent, live-whatsapp-feed, link-preview, journey-message, gallery-ocr, email-reply, account-link-confirm.

| declared `verify_jwt` (inline comment only) | functions |
|---|---|
| false (on purpose) | gematria-api (public API, optional key `GEMATRIA_API_REQUIRE_KEY`), link-preview, live-whatsapp-feed, newsletter-signup, newsletter-unsubscribe, nl-track, openweb-sso, share-to-facebook, video-transcribe (needs x-fb-admin-key), wa-raziel, wa-system-outbox |
| true | facebook-publish, research-run; expression-extract "rejects unauthorized" |
| not deployed yet per header comment | account-link-confirm, link-preview ("NOT DEPLOYED until ZURIEL approves") |
| UNKNOWN (no comment, no config) | the other ~70 |

Purpose / secrets (names only) by group:
- AI (21 use ANTHROPIC_API_KEY; ai-analyze and post-ai-edit also GEMINI_API_KEY/GEMINI_MODEL): ai-analyze, field-router(ROUTER_*), gallery-ocr(OCR_*), journey-message, lab-reflect/teacher, number-researcher, post-ai-edit, post-to-storyboard(STORYBOARD_*), raziel-attention, research-extract, research-nurture, wa-* bots (ZURIEL_WA, FB_ADMIN_KEY). Text/vision/transcription only; see section 6 for images.
- Email/newsletter (RESEND_API_KEY, RESEND_WEBHOOK_SECRET, RESEND_READ_KEY, NEWSLETTER_SECRET, NEWSLETTER_FROM/REPLY_TO, NOTIFY_FROM, EMAIL_INGEST_SECRET): email-inbound, email-ingest, email-open, email-reply, newsletter-*, nl-track, send-newsletter, send-reengage, notify-*, welcome-backfill, send-family-invitation-email.
- Social/Meta (META_CAPI_TOKEN, META_PIXEL_ID, META_SYSTEM_TOKEN, FACEBOOK_PAGE_TOKEN/ID, FB_ADMIN_KEY): meta-capi, facebook-admin, facebook-publish, share-to-facebook.
- Analytics (GA_PROPERTY_ID, GSC_SA_KEY, GSC_SITE, GSC_SYNC_KEY): ga-sync-server (writes `ingest_ga_daily` / `ingest_ga_country_daily`, reads `ga_sync_config`, `gsc_secrets`), gsc-sync (-> `gsc_metrics`).
- Push (VAPID_PRIVATE_KEY, VAPID_PUBLIC_KEY, VAPID_SUBJECT, PUSH_ADMIN_KEY): send-push.
- Media (FB_ADMIN_KEY): gen-thumb, media-thumb-queue, sign-upload, storage-put(-raw), raw-put, upload-image, video-migrate, agent-upload, media-upload-intent, capture/transcribe.
- WhatsApp: wa-webhook, wa-poll, wa-process, wa-gabriel/hatishbi/michael/mora/uriel/raziel, wa-channel-ingest, wa-channel-research-intake, wa-avatars, wa-vip-backfill, wa-ocr, wa-video-enrich.
- Core/other: els-search-bridge, field-pack, post-save, research-run, account-link-confirm, link-preview, openweb-sso (OPENWEB_SSO_SHARED_SECRET), live-whatsapp-feed, system/sg-rate-limit.
All 52 distinct secret/config names: ANALYZE_MODEL, ANTHROPIC_API_KEY, CHAT_MODEL, ELS_MATRIX_READING_{ENABLED,FX_ILS_PER_USD,JOB_SECRET,MODEL}, EMAIL_INGEST_SECRET, EXTRACT_MODEL, FACEBOOK_PAGE_{ID,TOKEN}, FAMILY_INVITE_FROM, FAST_MODEL, FB_ADMIN_KEY, FB_SHARE_BATCH, GA_PROPERTY_ID, GEMATRIA_API_REQUIRE_KEY, GEMINI_{API_KEY,MODEL}, GSC_{SA_KEY,SITE,SYNC_KEY}, META_{CAPI_TOKEN,GRAPH_VERSION,PIXEL_ID,SYSTEM_TOKEN,TEST_EVENT_CODE}, NEWSLETTER_{FROM,REPLY_TO,SECRET}, NOTIFY_FROM, OCR_{MODEL,RUN_KEY}, OPENWEB_SSO_{SEND_AVATAR,SEND_EMAIL,SHARED_SECRET}, PUSH_ADMIN_KEY, RESEND_{API_KEY,READ_KEY,WEBHOOK_SECRET}, ROUTER_{DAILY_CAP,MODEL}, SITE_URL, STORYBOARD_{MODEL,RUN_KEY}, SUPABASE_{ANON_KEY,SERVICE_ROLE_KEY,URL}, VAPID_{PRIVATE_KEY,PUBLIC_KEY,SUBJECT}, ZURIEL_WA. Scheduling is by pg_cron (e.g. `20260912050604_g0_cron_root_of_trust_rewrite_v1.sql` registers ~16 jobs; GA sync in `20260909043000_ga4_server_side_sync_v1.sql:111`), not by Vercel crons.

### 3b. Migrations
423 files in `supabase/migrations`. Latest 10 (sorted by name): 20261103175116_public_s2_guarded_readers; 20261103175126_control_health_unknown_failures; 20261103223217_public_site_updates_purpose_bd; 20261104123515_community_repeatable_likes; 20261104135237_community_thread_follow_notifications; 20261104143226_community_replies_reading_continuity; 20261105150000_account_link_offers_v1; 20261105160000_community_guest_publish_v1; 20261105180000_community_guest_display_name_v1; 20261106090000_els_owner_manage_v1. No migration creates `site_flags` (it predates the tracked set), so live rows are UNKNOWN.

### 3c. Tables / views / RPCs / buckets referenced from src/ + api/ (+ public-reading-deploy, middleware), non-test files
Regex-based (`.from('x')`, `.rpc('x')`, `/rest/v1/rpc/x`, `storage.from('b')`); computed names are missed and a few `.from('...')` hits could be non-Supabase. 74 unique tables/views (417 refs), 296 unique RPCs (352 refs), 3 bucket names.

Tables/views with refs: posts 39, nodes 39, gallery_images 36, contributors 25, gematria_words 24, research_contributions 22, channel_updates 21, els_records 18, research_objects 16, topic_cards_public 12, search_log 11, research_items 9, users 8, edges 7, topic_cards 7, insights 6, world_contributor_research_v1 6, gematria_methods 5, number_sets 5, bidim 5, user_notifications 4, galleries 4, gematria_wall 4, hint_sets 4, hint_set_members 4, contact_messages 3, wa_bot_log 3, trails 3; 2 refs each: profiles, user_notes, visitor_events, wa_account_links, contribution_links, push_subscriptions, video_media_assets_v1, number_anchors, v_method_states, tanach_verses, home_videos, teder_stations, chat_messages, legacy_traffic, subscribers, notification_prefs, post_share_counts, user_activity, inbound_emails, relation_evidence, trail_members; 1 ref each: agent_identity, agent_research_stats, credit_ledger, community_hints, entity_types, cross_method_strength, number_readings, video_transcripts, site_updates, ai_style_profiles, stories, research_leads, owner_note_requests, site_flags, gallery_collections, comments, page_views, ticker_messages, site_visits, post_revisions, method_semantics, anchor_families, wa_bot_config, wa_deep_queue, translit_suggestions. Direct REST also: edge_blocked_countries (middleware), site_flags (sitemap-public).
RPCs with >=2 refs: ingest_event 10, gematria_method_trace 7, fn_method_value 7, link_identity 4, update_my_page_config 3, studio_list 3, community_message_context 3, fn_relation_candidate 3, lang_links_list 3, admin_topic_cards_full 3, and 2 each: studio_upsert, dm_send, dm_inbox, update_my_dossier, research_level_of, claim_my_founding_grants, claim_daily_credit, claim_wa_activity_credits, record_referral, award_share_credit, admin_all_contributions, convergence_meter, gematria_api, fn_number_lookup, fn_method_profile, admin_research_feed, convergences_for_author, get_category_videos, get_reality_videos, admin_lang_stats. The other 276 are single-ref (about 130 are `admin_*` RPCs used by the admin control plane; also public ones such as sitemap_numbers, public_post_slug_exists, log_security, log_edge, log_crawl, track_visit, account_link_*_v1, community_*, follow_subject_*, els_*, fn_family_*). Full list reproducible with the regex above.
Storage buckets: `gallery` (13 SDK refs + 12 URL refs), `media` (4 URL refs), `public` (1 URL ref). Edge functions touch more buckets (UNKNOWN names, private inbox paths per docs).

---
## 4. FEATURE FLAGS

### 4a. DB flags (`site_flags` table, `key,enabled,message,mode`; read by `getSiteFlags` `supabase.js:1905`, resolver `MaintenanceLock.jsx`)
Default when row absent: open for `Locked` without `requireFlag`; **closed** with `requireFlag` (`MaintenanceLock.jsx` resolveFeatureState). Live overlay: `publicReadingFeatureLock` (`publicReadingRelease2029.js:28-31`).

| flag | defined in repo | consumed at | live effect |
|---|---|---|---|
| lock_world | migration 20261012170000:8 (enabled=false) | App2029 L326/363/364/384; og.js; sitemap-public | open |
| lock_number | same:12 (true) | App2029 L325/385; og; sitemap-public | open by code override |
| lock_books | same:11 (true) | App2029 L230 | open by code override |
| lock_heichal | same:7 (true) | App2029 L379-380 | closed |
| lock_raziel_site | same:9 (true) | MaintenanceLock previewAdminOnly, RazielSessionMount | closed |
| lock_life_journey | same:10 (true) | App2029 L371 | closed |
| lock_els | NOT in repo migrations (only referenced by `server_capability_execution_gate_v1.sql` and edge fn els-search-bridge:159 `ELS_LOCK_FLAG`) | App2029 L377, ElsRotatingMatrixCard | open by code override |
| lock_gematria | NOT defined | only in `openFlags` set (`publicReadingRelease2029.js:28`); no `Locked` uses it | n/a |
| lock_convergence_tree | NOT defined | og.js:268-274, sitemap-public | UNKNOWN |
| 9 capability flags: lock_post_listen, lock_raziel_voice (x2), lock_research_audio_brief, lock_private_research_corpus, lock_research_to_media, lock_guided_spatial, lock_proactive_research_pulse, lock_cross_channel_companion | NOT defined anywhere in repo | only declared as `availabilityFlag` in `src/lib/experienceCapabilities.js:39-111`; no non-test code reads `availabilityFlag` | consumed-by-name-only / effectively dead |
Defined-but-unused: none of the 6 migration-seeded flags is unused. Consumed-but-undefined in repo: 12 (lock_els, lock_gematria, lock_convergence_tree + the 9 above); live DB rows UNKNOWN.

### 4b. Build-time flags (`import.meta.env`, `src/lib/publicLaunch2029.js:6`)
| flag | default | defined/forced | consumed |
|---|---|---|---|
| VITE_PUBLIC_READING_RELEASE | unset | forced `public-reading-20261101` by production build and `build-integrated-preview.mjs:38` | publicReadingRelease2029.js:5-6, Home2029Page:313/601, SystemFrame2029:158, calculators |
| CORE_PUBLIC_LAUNCH_2029 | `false` constant | `publicLaunch2029.js:6` (not env) | 16 refs (SystemFrame2029, Home2029Page...) |
| VITE_PUBLIC_FRAME_PREVIEW, _PUBLIC_FOUNDATION_PREVIEW, _PUBLIC_LAUNCH_READ_ONLY_PREVIEW, _INTEGRATED_PREVIEW, _KINGDOM_PREVIEW, _BOOK_PUBLICATION_REVIEW_PREVIEW, _UNLOCKED_2029_PREVIEW, _FUNCTIONAL_UNIFIED_PREVIEW | unset | forced "false" in prod build, set true by `scripts/build-integrated-preview.mjs:38-47` | App2029 L57/120-144/346-367, MaintenanceLock L16-21, publicLaunch2029 |
| VITE_FOLLOW_CENTER_PREVIEW | unset | NOT forced false in prod build; not set in repo | App2029:123/347 |
| VITE_LIFE_JOURNEY_PREVIEW_OPEN | unset | not set in repo | MaintenanceLock:21 (ignored when PUBLIC_READING_RELEASE) |
| VITE_HOME_2029_ENABLED | unset | workflows g4-public-core-gate:58, release-visual-gate:91 | Home2029Page:313 |
| VITE_GA_ID | "" (GA no-op) | prod build reads `process.env` or `.env.production` (`build-public-reading-production.mjs:77`); value is not in repo | analytics.js:5 |
| VITE_META_PIXEL_ID, VITE_GOOGLE_ADS_ID | unset | not in repo | marketing.js:8-9 (init skipped when PUBLIC_READING_RELEASE) |
| VITE_VAPID_PUBLIC_KEY | unset | not in repo | push.js:2/8 |
| VITE_WHATSAPP_CHANNEL | unset | test script only | Campaign718Page2029:16, EarlyAccess2029Page:13 |
| VITE_ACCOUNT_LINK_OFFER ("1"), VITE_COMMUNITY_LINK_PREVIEW ("1") | dark/off | not in repo | accountLink.js:1/6, linkPreviewClient.js:2/5 |
| VITE_ELS_GUIDED_DISCOVERY ("visible"), VITE_ELS_MATRIX_READING_MODE | hidden / mode default | not in repo | Els2029Page:120,146,213 |
| VITE_AUTH_VERIFIED_PREVIEW_ORIGINS | "[]" | prod build script | oauthReturn.js:56 |
Env-var consumption with no definition in the repo (Vercel dashboard, UNKNOWN): VITE_ACCOUNT_LINK_OFFER, VITE_COMMUNITY_LINK_PREVIEW, VITE_ELS_GUIDED_DISCOVERY, VITE_ELS_MATRIX_READING_MODE, VITE_FOLLOW_CENTER_PREVIEW, VITE_LIFE_JOURNEY_PREVIEW_OPEN, VITE_META_PIXEL_ID, VITE_GOOGLE_ADS_ID, VITE_VAPID_PUBLIC_KEY, VITE_WHATSAPP_CHANNEL, VITE_GA_ID. Defined (build/workflow) but never consumed in src: none found. Note: the production build forces only 8 of the preview flags, so unforced ones inherit whatever the Vercel build env holds.

---
## 5. ANALYTICS / TRACKING

| item | where | live behaviour |
|---|---|---|
| GA4 | `src/lib/analytics.js` (`initGA, trackPageview`, `VITE_GA_ID`; no-op if unset) | Live: only on `sod1820.co.il`/`www.` and only for paths passing `readingTelemetryPath` (`App2029.jsx:179-201`, `publicReadingTelemetry2029.js`); query/fragment stripped, account/research/ELS/etc. excluded; `allow_google_signals:false`, `allow_ad_personalization_signals:false`; loaded after idle / home-primary ready |
| Web vitals | `webVitals2029.js` | live: anonymous `ingest_event` (`p_surface=performance, p_event_type=web_vital`, null ids, bot false), not for admins (`App2029.jsx:168-169`) |
| First-party visits / engagement / identity / marketing | `visits.js trackVisit`, `engagement.js`, `identity.js ensureIdentity`, `marketing.js` (Meta Pixel, Google Ads, CAPI via edge `meta-capi`) | all skipped when `PUBLIC_READING_RELEASE` (App2029 L165-176, marketing.js:29, 127); active only in non-live builds |
| Vercel Web Analytics / Speed Insights | no package (`package.json`), no `/_vercel/insights` script in 2029.html or src | not installed in code; `api/vercel-insights.js` only reads Vercel's API (UNKNOWN if platform-level collection is enabled) |
| Microsoft Clarity | grep: no occurrence in src/public | none |
| Cookie/consent banner | grep for consent/CMP/consent-mode: none | no consent handling; GA relies on Signals-off + IP-less config only (UNKNOWN legal view) |
| Supabase analytics sync | `api/ga-insights.js` (GA Data API, optional `ingest_ga_country_daily`), `api/search-console.js`, `api/vercel-insights.js` (admin-only, live adapters pass `refreshCountryHistory:false`); edge `ga-sync-server`, `gsc-sync` on pg_cron | no Vercel cron; GitHub Actions schedules: daily-backup (03:00), media-thumbs (every 2h), post-deploy-canary (4x/day), update-sitemap (04:00) |
| CSP (live) `public-reading-deploy/vercel.json` global header | `connect-src 'self' supabase.co (https+wss) *.storage.supabase.co spot.im *.spot.im (wss too) www.google-analytics.com region1.google-analytics.com; form-action 'self' spot.im; frame-ancestors 'self'; object-src 'none'; base-uri 'self'` | no script-src/img-src/frame-src, so gtag.js (googletagmanager.com), YouTube/Vimeo embeds, external images are unrestricted. Code `connect` targets found: Supabase REST/RPC/functions (allowed) and GA collect. Possible blocks (GA4 may also beacon to analytics.google.com / stats.g.doubleclick.net): not allowed, impact UNKNOWN |
| Edge telemetry | `middleware-core.js` -> `log_edge`, `log_crawl`; country policy table `edge_blocked_countries` | runs on live (public-reading-deploy/middleware.js) |

Stale items: `update-sitemap.yml` still runs `scripts/gen-sitemap.mjs` daily and commits `public/sitemap.xml` (no such file exists now); the script header itself warns a static file shadows the dynamic sitemap (the live build deletes it at `build-public-reading-production.mjs:105-106`, so live is safe but the workflow can write to main).

---
## 6. SHARE & IMAGES

- `src/components/ShareActions.jsx` (167 lines): canonical share block (channels from `lib/share.js CHANNELS`; native share; file share with `shareImageFile` `share.js:79`; `createShareIntent` in `lib/share/shareObject.js`; telemetry `lib/share/shareTelemetry.js` emitShare). Used in Post, Topic, World, Calculator pages, CommunityCalculator, CanonicalMediaFigure, SystemFrame (15 files).
- `src/components/WatchButton.jsx` (276 lines): follow/subscribe funnel. In live it is inert ("מעקב ייפתח בהמשך") unless a verified user on a community thread (`WatchButton.jsx` communityThread) because `publicReadingActionsLocked`; uses `watchToggle`, push (`VITE_VAPID_PUBLIC_KEY`), `trackConversion` (no-op live).
- /api/card (edge, @vercel/og): params `n` number, `w` word, `t` title, `sub`, `cap`, `sig` (gem|els|finding text variants, not a cryptographic signature), `format=story`. Heebo font + logo loaded from `api/_assets/` via `new URL(..., import.meta.url)`. Fallback chain for number cards: `gematria_words` phrases else "מרכז ההתכנסות". Unauthenticated and open-parametric (any text can be rendered on a branded card on the domain); live adapter sets `no-store`, so every crawler/user fetch re-renders (the module's one-year cache is overridden). Tests stub the module (`test/public-reading-public-candidate.test.mjs:28`) and the canary does not fetch it; whether `_assets` is bundled into the live edge function is UNKNOWN.
- /api/og: HTML head generator (title, description, canonical, og:*, twitter:*, JSON-LD) used in-process by public-document for each URL; `DEFAULT_IMAGE = SITE + '/logo.png'` (og.js:28); falls back to `/api/card?...` when a post image is not a valid raster (og.js:312-313, 645-931 per route type), `ogImageDims` sets 1200x630 only for card URLs.
- AI image generation: **none in code**. Grep (openai, dall-e, gpt-image, imagen, replicate, stability, flux, gemini image, generate-image, midjourney, ideogram) over src, api, server, supabase/functions, scripts, public-reading-deploy found only: (a) OpenAI audio transcription (`supabase/functions/_shared/sttTranscribe.js`), (b) host allow-list entries `files.openai.com`, `images.openai.com` for the manual flow "ChatGPT file -> Dropbox URL -> `agent-upload mode=url` -> Supabase" (`agent-upload/remote-url.ts:10-11`, `docs/sod1820-media-ingress-storage-convention-v1.md:101`), (c) a design-policy descriptor `EXPERIENCE_SURFACE.AI_IMAGE` (`experienceContext.js:31, 269`) and a trace unit name `IMAGE_GENERATION_UNITS` (`operationalTraceContract.js:63`). No UI, endpoint, quota, or storage path exists for generating images; `post-to-storyboard` only picks existing `gallery_images`.
- Image optimization / proxy: no server route. Client rewrites Supabase `object/public` URLs to `render/image/public` with width/quality/resize=contain (`src/lib/img.js`, `src/lib/avatar.js`); static thumbs from `gen-thumb`, `media-thumbs.yml`, `media-thumb-queue`, `sign-upload` edge functions. CSP `connect-src` allows `*.storage.supabase.co`.
- Sitemap: `api/sitemap.js` (421 lines) single `<urlset>` with video namespace, up to 100k rows fetched, no 50,000-URL split / sitemap index (actual count UNKNOWN; the canary accepts `<sitemapindex>` but the code never emits one); `api/sitemap-public.js` is root-only. Live wrapper `public-sitemap.js` keeps source `Cache-Control` only for canonical GET success.
- Robots: live `public-reading-deploy/api/public-robots.js` (see section 2). `public/robots.txt` is labelled a Legacy fallback artifact and is deleted from the live output; it still contains `Crawl-delay: 10` and `Disallow` lines the live policy does not have.

---
## 7. SECRETS HYGIENE (values redacted)

Scanned tracked files in src, public, api, public-reading-deploy, preview-deploy, server, supabase (incl. migrations), scripts, tools, test(s), middleware*. Patterns: JWT `eyJ...`, `sk-`, `AIza`, `sb_secret_`, `sb_publishable_`, PEM private keys, `ghp_/xox/AKIA/r8_/vcp_`, Telegram/Facebook/Google OAuth tokens, "service_role" mentions.

| result | detail |
|---|---|
| **Privileged secret in source: NONE found** | no service_role JWT, no `sb_secret_` real value, no PEM key, no `sk-`, no `AIza`, no OAuth/vercel/GitHub/AWS tokens |
| Supabase anon JWT (`eyJhbG...`, role=anon, ref linswmnnkjxvweumprav, exp 2096204762): ACCEPTABLE, public client key | 14 files: `src/lib/supabase.js:18`, `public/heichal.html:113`, `api/card.js:51`, `api/sitemap.js:18`, `api/sitemap-public.js:7`, `api/honeypot.js:7`, `api/og.js:23`, `api/world-finding-review.js:33`, `middleware-core.js:30`, `scripts/fix-slugs.mjs:6`, `scripts/gen-sitemap.mjs:22`, `scripts/post-deploy-canary.mjs:10`, `supabase/migrations/20260812_video_transcripts_multilingual.sql`, `supabase/migrations/20260808_infra_load_async_fb_publish.sql`. Hygiene: duplicated 14 times (rotation touches all), and `api/ga-insights.js`/`search-console.js`/`vercel-insights.js` import it from `supabase.js` instead |
| `eyJhbG...` (first 6) at `test/g3-reliability-preclose.test.mjs:36` | truncated sanitizer fixture, not a key |
| `sb_secret_SYNT...` / `sb_publishable_SYNT...` | synthetic test strings: `scripts/test-ai-analyze-service-headers.mjs:20,32,42,52`, `src/lib/research/razielPhaseJCurrentSurfaceContent.test.js:129` |
| "service_role" mentions (678 lines) | comments, SQL grants, edge functions reading `Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")` by name, scripts reading env; e.g. `api/world-finding-review.js:6` states it does NOT use service_role |
| `-----BEGIN` | only regex literals stripping PEM headers in `supabase/functions/gsc-sync/index.ts:42`, `ga-sync-server/index.ts:27` |
| base64 blobs | `public/tzofen.html:1059`, `public/els-dynamic-lexicon-v1.gz64.txt` (data, "H4sI" gzip), not secrets |
| `.env*` / credential files | none tracked. `docs/reviews/**/secrets-check.json` are scan reports |
| Non-secret hard-coded IDs | Vercel team `team_vtfWHZfKvdbob8gvynQb5N89`, project `prj_43q7k7QFAcWnin1tcBjce5xOi7Cq` (`api/vercel-insights.js:11-12`); Meta pixel id in a comment `marketing.js:12`; Supabase URL |

---
## 8. TEST COVERAGE MAP

Totals (tracked): 792 `*.test.*` files, 101 `scripts/test-*`, 831 files under `test/`+`tests/`, ~1,067 test-like code files. `package.json` has no top-level `"test"` script (only many `test:*` entries); CI = 21 workflows in `.github/workflows` (isolation gate, g4-public-core-gate, route-seo-decision-2029, observability-seo-gate, live-contracts-2029, release-visual-gate, post-deploy-canary, legacy-production-lock(now "retired" gate), ...). Counts below are a filename/content heuristic.

| area | tests (examples) | gap |
|---|---|---|
| routes / legitimacy | `scripts/test-route-legitimacy-2029.mjs`, `test-2029-route-seo-behavior.mjs`, `test-2029-route-seo-decisions.mjs`, `middleware.test.js`, `test-public-reading-main-release-contract.mjs` (about 20 route files, 34 files touch vercel.json) | no check that every `<Route>` is in the known-segment set (`/updates`,`/raziel` gap), no redirect chain/loop test found |
| SEO (sitemap/robots/OG/document) | 16 files touch og/sitemap, 17 touch public-document; `test/public-reading-*.test.mjs`, `test-2029-server-seo-ai-parity.mjs`, canary `robots_200`,`sitemap_200` | `/api/card` render not tested (stubbed); sitemap URL-count limit not tested |
| share | 15 files for ShareActions, 7 WatchButton, `test/world-finding-share-og-2029.test.mjs`, `communityMessageShare.test.js` | OK |
| community | about 59 files (`test-g3-community-core-2029-*`, `test-community-*`, `communityGuestApi.test.js`) | strong |
| auth | about 33 (`test-integrated-preview-auth-guard.mjs`, `public-reading-full-account-transport.test.mjs`, `handle-new-user-consent.test.mjs`) | live admin-only paths calling non-deployed endpoints not covered |
| calculator / gematria | about 39 (`test-calculator-2029-*`, `test-beit-midrash-*`) | strong |
| ELS / code | about 105 (`src/lib/research/els*.test.js`, `test/els-2029-*`) | strong |
| number / world / topic | about 165 incl. `test-2029-world-surface.mjs`, `test/world-finding-review-api-2029.test.mjs` | strong |
| images / media / thumbs | about 39 (`test-media-upload-runtime.mjs`, `test-post-image-representations-v2.mjs`) | no test for `img.js` render URL rewrite found by name; /api/card pixels untested |
| analytics / telemetry | `test/analytics-2029-one-tree-contract.test.mjs`, `scripts/test-web-vitals-2029.mjs`, `engagement.test.js`, `public-reading-observability.test.mjs`, `public-reading-provider-readers.test.mjs` (ga-insights/search-console/vercel-insights) | no consent test (none exists); `marketing.js` only via side-effect guards |
| api handlers | contributor-curation (1 test), world-finding-review (3 tests), provider readers (2), card (3, stubbed) | **no test** for `api/honeypot.js`, dedicated `cardcom-start`/`cardcom-webhook` handler tests (only 2 files mention cardcom), `ga-sync-server`/`gsc-sync` edge functions (0 mentions); only 4 `*.test.*` under `supabase/functions` for 90 functions |
| security / middleware | `middleware.test.js`, `test/edge-country-*.test.mjs`, `test/bot-read-*.test.mjs`, `test-p0-f01-f02-security-patch.mjs` | OK |
| payments | none dedicated | endpoints are orphaned from the live product |

---
## Cross-cutting findings (priority order)
1. No privileged secret in tracked source; only the public anon key (14 copies).
2. Live deploy lacks 9 root `api/` handlers; frontend (admin-only) calls two of them (`/api/contributor-curation`, `/api/world-finding-review`) and DM POST hits a GET-only adapter (405). `/api/ga-sync` has no handler anywhere (dead client code).
3. 496 of 589 live redirects are 2-hop chains through `/(.+)/ -> /$1`; no loops.
4. Live `/api/card` is `no-store` and open-parametric; `/api/og` and `/api/honeypot` exist only in the non-live root, so the honeypot logging (27 rewrites) is not active live.
5. 12 lock flags consumed but absent from repo migrations (9 dead capability names); `allowAdminView` has no effect.
6. No AI image generation exists; share images are only the `/api/card` renderer.
7. No sitemap index / 50k split; `update-sitemap.yml` is a stale writer to main; no consent banner; CSP omits analytics.google.com.
