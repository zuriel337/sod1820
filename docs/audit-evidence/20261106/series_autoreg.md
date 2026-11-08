# Series plan and auto-registration: read-only investigation

Repo /home/user/sod1820. Working branch claude/sod1820-audit-remediation-g93w32 (HEAD 881e7760e). origin/main = 1f0863938 (fetched). No repo files were edited and nothing was published.

## 0. Where "today's plan" lives (important)

- The audit and remediation docs the user called "today's plan" (docs/SOD1820_FULL_PRODUCT_ACCEPTANCE.md, docs/SOD1820_FULL_PRODUCT_DEFECT_REGISTER.md, docs/reviews/audit-remediation-20261106/README.md) contain NO series plan. A grep for "series" or "סדרות" in them returns only an unrelated line in the defect register (line 63, "קריאות סדרתיות", meaning sequential calls).
- The only "series plan" dated today (6.11.2026) is on SIBLING branches, not on this branch and not on origin/main:
  - `origin/ccr-9fba3323-g3hd6t` (tip 6cf106c0f, 07:48Z): SOD1820_CONTENT_FOUNDATION_CONTRACT.md §12 and §12.9, titled "תוכנית הסדרות ודף הבית — מימוש שלבי (6.11.2026, ענף בלבד)".
  - `origin/ccr-c096916c-nxv7te`: the same commits, and commit 7da467a31 "Hold back unfinished sibling work (Home/series session ...) per owner request".
  - I read the contract with `git show origin/ccr-9fba3323-g3hd6t:SOD1820_CONTENT_FOUNDATION_CONTRACT.md` (copy: /tmp/claude-0/-home-user-sod1820/b00f2877-d6d7-5463-a863-4e954c7652a3/scratchpad/cfc_g3hd6t.md). §12 starts at line 183, §12.9 at about line 262, §5 at lines 91-110.
- Whether ZURIEL's "plan we made today" also means a chat-only plan that feeds SEO, Google and sharing: UNKNOWN. No file in any branch ties the series plan to the sitemap, OG tags, JSON-LD or share.
  - Evidence: `git diff --stat origin/main...origin/ccr-9fba3323-g3hd6t` touches 25 files: the contract, the roadmap pointer, Home composition, series identity and projection, homeLaunchPosts, tests.
  - It does NOT touch api/sitemap.js, api/og.js, route-legitimacy.js, publicReadingRelease2029.js, publicReadingTelemetry2029.js or any share code.
  - The word "sitemap" or "SEO" appears in the contract only in old, unrelated lines (Representation includes "OG/share", line 44).

## 1. What "the series plan" is, and its status

### 1.1 Data model (on this branch and on main)
- A series is defined in code only. `src/lib/research/contentSeries2029Identity.js` exports `CONTENT_SERIES_2029`, a frozen array of 4 descriptors: `mah-kore-habora`, `dimension-five`, `sod-hashmal`, `messages-from-righteous`.
  - Each descriptor has key, label, decisionId, writerLabel, publisherLabel, priorityLane, `membership` [{field: tags|categories, value}], and `exactAuthor`.
  - `messages-from-righteous` also has `approvedSources` (a channel_updates row).
- The file's own header says it is a "bounded presentation contract ... not a registry, taxonomy, store or publication authority" (lines 3-6).
- A post joins a series through exact membership in `posts.tags` or `posts.categories` (plus an exact author for some series): `hasExactMembership` and `contentSeriesKeysForPost`.
  - `contentSeriesMembershipFilter` builds the PostgREST filter `tags.cs.{"..."}`.
  - Video and gallery items join through `approvedSources` (explicit, per-item Human Gate).
- There is NO series table, no `series` column and no series_keys field in the DB.
  - The contract says "אין שדה/טבלת series. נשאר EXTENSION POINT (לא-בונים)" (§5, sibling-branch copy).
  - Earlier text, still on this branch: SOD1820_CONTENT_FOUNDATION_CONTRACT.md lines 91-94, 119.
- Decision source: PLAN37 (`project_codex` id 37), DEC-SERIES-003/004/005/006, and CONTENT-AUDIENCES-HYBRID-NOW-20261102/SERIES-01. The `project_codex` DB was not read (no Supabase call made): UNKNOWN beyond what the docs quote.

### 1.2 Today's additions (sibling branches only, not merged)
- Stage 1: `reality-map` (מפת המציאות) added as the primary series. Membership is the exact tag "מפת המציאות" only. No post is tagged yet, and there is no auto-assignment by category (§12.9, §12.4).
- Stage 2: a Home area "פוסטים אחרונים" lists posts that are in no series.
  - Up to 6 items in a 90-day window.
  - Constant `HOME_STANDALONE_WINDOW_DAYS` in `homeLaunchPosts2029.js`.
  - Awaiting ZURIEL approval of 90 days / 6 items.
- Stage 3: audit only. Follow for series is NOT active on the server for any series.
  - The migration `20261031091248_follow_content_series_only_v1.sql` is branch-only and not applied.
  - `reality-map` and "מסרים" are outside the approved migration.
- Stage 4: reserved future "families" (סוד 1820, הצופן בסרטים, שבילי שפה, תכני גאולה). No selector, field or assignment is built.
- Public name of the shared series changed to "מסרים" (key unchanged).
- Rule §12.4: never auto-assign a series. "חסר-שיוך נשאר חסר-שיוך."
  - This is a deliberate human-gate rule that conflicts with a naive "everything auto-registers into a series".
  - Registration into SEO, sitemap and share is a separate matter from series membership.

### 1.3 Routes and UI surfaces
- There is NO dedicated public series route. A "series page" is a query-param filter of the posts catalog: `/2029/posts?series=<key>`.
  - Built in `Posts2029Page.jsx` lines 35-85 (SeriesEntrances2029), `siteSearch2029.js` line 32, `notifications.js` line 117.
  - `postsTaxonomy2029Route.js` line 26 has `seriesLink`, used on the category page for series-named categories.
- App2029.jsx route table, lines 319-388, has `/tag/:slug`, `/category/:slug`, `/topic/:slug`, `/post`, `/2029/posts`, `/:slug` and others. It has no `/series` and no `/series/:key`.
- UI surfaces: Posts index "לגלות דרך הסדרות" cards; Home series cards; site search group "סדרות"; Follow center "series:" group; Now publications lens.
- Follow: Follow center and notifications understand `series:<key>`. The server producer is not applied (`PostFollowBox.jsx` line 55 says "עדכוני הסדרה עדיין אינם פעילים").
  - Docs: docs/reviews/follow-category-series-alignment-20261026.md and docs/reviews/follow-series-release-20261031.md say "branch-only, not applied".
  - I did not verify the live DB: UNKNOWN whether it is still unapplied.
- Status: series identity and projection are IMPLEMENTED on main (4 series).
  - Today's reality-map, "מסרים" rename and Home changes are BRANCH-ONLY (not merged, not deployed).
  - Series Follow is BRANCH-ONLY / not applied.
  - A dedicated indexable series page, series sitemap, series OG and series JSON-LD are NOT PLANNED anywhere in the repo.

## 2. Auto-registration as it exists today

"Data-driven" means a new DB row appears with no code edit. "Code-driven" means it needs a code edit, allow-list or migration.

### (a) Sitemap
- Files: api/sitemap.js (425 lines) and public-reading-deploy/api/public-sitemap.js (a thin wrapper that sets `publicReadingProductionArtifact`).
- Type by type:

| Type | Source | Mode | In sitemap |
|---|---|---|---|
| Static pages | `STATIC` array (api/sitemap.js ~lines 148-173) plus `foundationStatics` allow-list | CODE | yes, only if listed |
| Posts `/<slug>` | `posts?select=...` with `publicPostOnlyFilter`, line ~220 | DATA | yes, automatic |
| Tag and category pages `/tag/x`, `/category/x` | derived from the tags and categories of fetched posts (api/sitemap.js lines 280-292), production only | DATA | yes (audit: 1,913 tag + 37 category) |
| Number pages | RPC `sitemap_numbers` (n >= 10) | DATA | yes |
| Phrase pages | view `sitemap_phrases_v1` | DATA | yes |
| Topics `/topic/:slug` | `topic_cards_public` | DATA | yes |
| Forum threads | `research_contributions` | DATA | not in the public-reading foundation (`throw outside-public-foundation`) |
| Codes `/codes/:slug` | `els_records` published and public | DATA | yes |
| Books `/book/:slug` | `nodes` type=book is_active, plus a reader-ready check | DATA | yes |
| Researchers `/community/researcher/:slug` | `contributors` (active, not locked, visible) | DATA | yes |
| Video pages | `video_media_assets_v1` plus the post video projection | DATA | yes (`video:video`) |
| Series `/2029/posts?series=` | none | n/a | NO |
| Images | none (no image sitemap; audit §7 says 404) | n/a | NO |

- A new series, or a new page type, appears automatically only if it is a tag or category on a published post. A genuinely new content type or route needs a code edit in api/sitemap.js.
- Production artifact: `sitemap.xml` is dynamic. The daily cron `update-sitemap.yml` was removed (DEF-019); the static `public/sitemap.xml` would shadow the dynamic one.
- Audit counts in docs/SOD1820_FULL_PRODUCT_ACCEPTANCE.md line 100: 16,761 URLs.

### (b) Server metadata, OG, JSON-LD, route legitimacy
- Document path: public-reading-deploy/api/public-document.js (lines 82-91) calls `publicReadingPath()`, then api/og.js as the metadata handler, then merges title, meta and canonical into the SPA shell.
  - Unknown address: `publicReadingPath` returns "missing" and the document answers 404 with `noindex, nofollow` (public-document.js lines 69-70, 108).
- `src/lib/publicReadingRelease2029.js` `publicReadingPath()` (lines ~170-189) is a hand-kept allow-list:
  - literal list of public paths (line ~186);
  - a regex of families `^/(post|number|topic|researcher|video|tag|category|book|codes|forum)/[^/]+/?$` (line ~187), plus a few special regexes;
  - any single-segment path becomes "post-lookup";
  - everything else is "missing", which is 404.
  - A new route family such as `/series/:key` is therefore a 404 until a code edit adds it. CODE-driven.
- api/og.js (1143 lines):
  - a `STATIC` table keyed by path (title and description per path);
  - a taxonomy branch for `/tag/` and `/category/` driven by `postsTaxonomyRoute2029` (line ~367);
  - special branches for /gallery, /verified, topics, posts, video, codes, researchers.
  - New static pages need an og.js entry. DB-driven families work only where og.js already has a branch.
- JSON-LD in og.js (lines ~1034-1102):
  - `Article` for posts;
  - `WebPage` + `BreadcrumbList` for converged topics;
  - `VideoObject` for videos.
  - No JSON-LD for tag, category, number, codes, books, researchers, home or series (confirmed by audit §7, JSON-LD 215/510 pages).
- Edge route legitimacy:
  - `route-legitimacy.js` has a hand-kept single-segment set plus a block derived from vercel.json and App2029 by `scripts/sync-route-legitimacy.mjs` (CI-checked via `npm run sync:route-legitimacy`). Only the SINGLE-segment routes are covered.
  - Multi-segment families are covered only by the regex in `publicReadingPath` and by og.js.
- Series: `/2029/posts?series=` is noindex by three layers.
  - vercel.json lines 667 and 1045 give `/2029/posts` a noindex header.
  - og.js line 830: `/post` with `q` or `series` gives robots `noindex, follow`.
  - Canonical stays `/post`.
  - Posts2029Page.jsx lines 181-186 and 217-222 set the client-side robots flag.
  - So a series is deliberately NOT indexable today.
  - Caveat: I did not run the handler; this is read from code.

### (c) Share cards and URLs
- Page-level share: `ShareActions.jsx`, and `SystemFrame2029.jsx` lines 142-156 `framePublicShareHref` -> `publicPageShareUrl` (`src/lib/publicPostUrls.js` line 98).
  - It is generic for any route inside the frame, except a deny-list of private paths (auth, login, admin, 2029/me ...). DENY-list based, so a new public page gets a share URL automatically.
  - It shares the canonical path plus the current query string, so a series filter shares as `/2029/posts?series=x`.
  - That URL's OG metadata is the generic `/post` card, because of the og.js mapping `/2029/posts` -> `/post`.
- OG images: `/api/card?w=&sub=` (public-reading-deploy/api/card.js, DEF-015: public cache on canonical 200 GET only).
  - Image selection is per type inside og.js (24 `cardUrl(...)` call sites).
  - A new type falls back to a static or default card only if og.js has a branch for it. CODE-driven per type.
- Audit §8: crawler OG PASS for posts and numbers; image sizes are inconsistent (DEF-021); no sitemap for images.

### (d) Analytics
- `src/lib/publicReadingTelemetry2029.js` `readingTelemetryPath()`: an ALLOW-list with explicit regexes (lines 4-26).
  - Known: /post, /number, a fixed list of statics, and one-level families `/(post|tag|category|topic|book|video|researcher)/:item`.
  - Any single segment `/x` is labelled `/post/:item`.
  - Any other unknown multi-segment path returns `null`, so GA pageviews, web vitals and `track()` are DROPPED (analytics.js line 11, App2029.jsx line 182).
  - A new route such as `/series/x` yields no pageview (silent loss). CODE-driven.
- `/2029/posts?series=x` is labelled `/post` (the query string is stripped), so series views are indistinguishable from the posts index in GA. There is a separate `postContentEntry2029` track call for series context (Posts2029Page.jsx ~line 175).
- Audit §15: GA4 missing on /code, /community/researchers, /login, /2029/journey, /heichal (DEF-011, reported as "by design" in the remediation README).

### (e) Robots and noindex decisions
- Gate: `.github/workflows/route-seo-decision-2029.yml` runs `scripts/test-2029-route-seo-decisions.mjs` (103 lines), `scripts/test-2029-route-seo-behavior.mjs` (221 lines), `scripts/test-2029-server-seo-ai-parity.mjs` and `scripts/test-route-legitimacy-2029.mjs`.
  - Rule: EVERY `<Route path>` in src/App2029.jsx needs an explicit decision. Allowed decisions: A og.js registration, B route-legitimacy entry, C vercel.json noindex header, D page `applySeo({noindex:true})`, E build-time preview flag.
  - "There is no baseline and no allow-list: a new route without a decision fails this job" (workflow header, lines 3-8).
  - The behaviour step asks the real document handler what it answers for each route.
- The gate runs only on `pull_request` to main (+ workflow_dispatch). It is CI-required only if branch protection requires it: UNKNOWN.
- Doc: docs/w0-2027-route-seo-addressability-matrix-v1.md (§3.2 "New top-level route collision gate" exists as policy; §8 is the 3.11.2026 reconciliation). Not read in detail.
- What the gate does NOT check: sitemap membership, canonical correctness, JSON-LD, share image, telemetry allow-list, or DB-driven types (tags, series, topics). It is route-centric.

### (f) Internal search and /map
- `src/lib/research/siteSearch2029.js`: groups posts, topics, series (from `CONTENT_SERIES_2029`, so DATA-adjacent: a new descriptor appears automatically), writers.
- `/map` (PublicServices2029Page.jsx line 33) is a HAND-KEPT list of links (CODE-driven; a new page does not appear automatically).
- A separate hand-kept registry: `supabase/functions/_shared/siteLinkRegistry.js` (SITE_LINKS, footer and Raziel link answers). `test/site-link-registry.test.mjs` checks it against the 2029 router, one-directionally.

### (g) Follow and watch topics
- Follow subjects are `cat:<name>`, `series:<key>` and others, canonicalised in SQL (`canonical_follow_subject`, `follow_topic_aliases`).
- The series branch of these is in a branch-only migration, so series are NOT live for follow.
- Posts, tags and categories: `trg_posts_notify` produces `post_new` from the post insert (data-driven).
- A new series needs a descriptor edit, regenerating the migration (`scripts/generate-follow-category-series-alignment.mjs --check` guards drift between JS and SQL), and a DB apply. CODE + DB migration.

### (h) A related existing contract that nobody uses yet
- `src/lib/systemSelfModel2029.js` (435 lines): the "Surface Registration / Launch Contract" compiler.
  - Registration fields include `routeFamily`, `canonicalSubjectTypes`, `seo.{indexability, sitemapEligibility, crawlerBehavior, canonicalOwner, shareOwner}`, `observability`, `privacyClass`.
  - `buildSystemSelfModel` rejects duplicate route patterns.
  - Its header: "NOT a new semantic owner, route registry, truth store ...". Spec: docs/2029-control-plane-attention-observability-plan-v1.md §4 (line 228) and docs/2029-implementation-dependency-plan-v1.md 7H (line 513).
  - Used only by test/system-self-model-2029.test.mjs (plus one import of the owner constants in oneTreeBranchContract2029.js). There are zero production registrations. This is an unused validator and the natural place to attach a registration contract.

## 3. GAPS

### 3.1 Per-type table: does a NEW item of this type get each system automatically?

| New thing | Sitemap | Canonical and OG | JSON-LD | Share | Analytics |
|---|---|---|---|---|---|
| Post (DB row) | yes | yes | Article | yes | `/post/:item` or `/<slug>` |
| Tag / category value on a post | yes (auto) | yes, via taxonomy branch | none | yes | `/tag/:item` |
| Series (descriptor in code) | NO | none (generic /post card, noindex) | none | shares a filter URL | merges into `/post` |
| Series, new descriptor + new tagged posts | NO | NO | NO | filter URL only | `/post` |
| Topic (`topic_cards_public`) | yes | yes | WebPage+Breadcrumb (converged topics) | yes | `/topic/:item` |
| Number / phrase | yes | yes | none | yes | `/number/:value` |
| Video (`video_media_assets_v1`) | yes | yes | VideoObject | yes | `/video/:item` |
| Book, codes, researcher | yes | yes | none | yes | partial: `/codes/*` drops (not in the telemetry list) |
| NEW static page (App2029 `<Route>`) | only if added to STATIC | only if og.js has an entry | none | share by deny-list: yes | dropped unless in the telemetry list |
| NEW route family `/xyz/:id` | only if added | 404 until `publicReadingPath` regex edit | none | yes | dropped (null) |

### 3.2 Top gaps (with code citations)
1. No public, indexable series route at all. `/series/*` does not exist (App2029.jsx 319-388). The series filter is noindex by design (vercel.json 667/1045; og.js line 830). No series appears in the sitemap, and there is no series canonical, OG image or JSON-LD (`CollectionPage`/`ItemList`) anywhere. The series plan does not mention SEO, so this is unplanned, not merely unbuilt.
2. Series existence is code-only (`CONTENT_SERIES_2029`), while membership is data. Adding a series needs a code edit plus (for follow) a regenerated, DB-applied migration. Nothing validates a new descriptor against SEO, sitemap or telemetry. The "no auto-assignment" rule (§12.4) means "everything enters a series automatically" would contradict the contract; only the SEO/sitemap/OG/share/analytics registration can safely be automatic.
3. The hand-kept lists are the real "registry" and nothing links them: `STATIC` in api/sitemap.js, `foundationStatics`, og.js `STATIC`, the `publicReadingPath` allow-list and families regex, the `readingTelemetryPath` allow-list, route-legitimacy.js, `/map` links, and `siteLinkRegistry.js`. A new family needs ~5 separate edits. The existing CI gate (`route-seo-decision-2029`) proves a route has A decision, not that all of sitemap, JSON-LD, share and telemetry are consistent.
4. Analytics silently drops unknown multi-segment paths (`readingTelemetryPath` returns null). A forgotten family loses pageviews and vitals with no test failing. Also `?series=` is erased to `/post`.
5. JSON-LD and image coverage are thin: only posts, converged topics and videos have JSON-LD; no `CollectionPage`, no image sitemap, OG sizes inconsistent (audit §7/§8, DEF-021).
6. (Related, lower) Dynamic sitemap is a single file with 16,761 URLs, 4.2MB, no index file. The 50,000-URL / 50MB limit is close in count terms (api/sitemap.js builds one `urlset`). Sitemap fetch failures return 503 (api/sitemap.js `foundationSourceFailed`), which is fail-closed and good.
7. (Related) The CI route gate triggers on pull requests to main only, and is not stated as a required check anywhere I read: UNKNOWN.

### 3.3 What existing tests/CI would and would not catch
- WOULD catch: a new `<Route>` in App2029.jsx with no og.js / route-legitimacy / vercel-noindex / applySeo-noindex / preview-flag decision (route-seo-decision-2029); stale route-legitimacy derived block (`sync:route-legitimacy --check`, CI); a new single-segment route missing from route-legitimacy (test-route-legitimacy-2029.mjs lines 28-38); a redirecting `<loc>` in the sitemap (test/sitemap-no-redirecting-locs-2029.test.mjs, DEF-002); drift between series descriptors and the follow SQL (generate-follow-category-series-alignment --check).
- WOULD NOT catch: a new route that satisfies the gate only through its option A/B/C/D/E wording but is missing from the sitemap, from telemetry, from JSON-LD, or from `publicReadingPath` families (the behavior test calls `publicReadingPath` only for routes that exist); a new DB content type with rows but no route or sitemap source; a new series with no SEO decision; a tagged series membership with no OG; telemetry gaps. I did not run these gates, so "WOULD" is from reading the scripts.

## 4. Proposed minimal registration contract (design only, EXTEND_EXISTING)

Principle: one declarative description per public route family, in the existing Surface Registration compiler, from which the existing hand-kept lists are DERIVED or CHECKED. No new registry, store or table. It must stay a "bounded projection" per CLAUDE.md §7 and §12.4 (no auto-assignment of series membership).

1. Populate `src/lib/systemSelfModel2029.js` (`defineSurfaceRegistration` / `buildSystemSelfModel`) with real registrations in a new `src/lib/surfaceRegistrations2029.js` (plain data, importable by node scripts, api/*.js and src). One registration per route family: path pattern, subject type, `seo.indexability`, `seo.sitemapEligibility` plus a sitemap source name, `seo.canonicalOwner`, `seo.shareOwner` (card kind), `observability` (telemetry label), `privacyClass`, `jsonLd` type.
2. Derive, do not duplicate:
   - `readingTelemetryPath` label table, from the registrations (observability labels);
   - the `publicReadingPath` families regex, from the registrations (public routeFamily);
   - the sitemap `STATIC` / `foundationStatics` list, from `sitemapEligibility` of static surfaces;
   - the `/map` link list, from public + OPEN surfaces.
   - First step, minimal-risk: make these derivations CHECKS (tests assert registry equals the hand-kept list) before turning them into generators, mirroring how `sync-route-legitimacy.mjs` derives a marked block.
3. Series as a registered surface, not as an automatic membership: add a surface `series` and decide first (ZURIEL, human gate) whether it is indexable. Options:
   - (a) keep `/2029/posts?series=` noindex and register it as such;
   - (b) add an indexable `/series/:key` route (CollectionPage + ItemList JSON-LD, canonical, card, sitemap entries iterated from `CONTENT_SERIES_2029`, and only for series with at least 1 public member).
   - Either way, `CONTENT_SERIES_2029` stays the single source for series identity, and sitemap, search and follow derive from it.
4. New CI test (add to `route-seo-decision-2029.yml`, new `scripts/test-2029-surface-registry.mjs`) that fails when:
   - an App2029.jsx `<Route>` has no matching registration (extend `scripts/test-2029-route-seo-decisions.mjs`, which already parses the router);
   - a registration with `sitemapEligibility: eligible` has no source in `api/sitemap.js`, or has `indexable` but no og.js branch;
   - a registered surface has no telemetry label;
   - a `CONTENT_SERIES_2029` key is missing from the series surface's sitemap/search/follow derivations;
   - a table or view that the sitemap reads gains a content type without a registration (DB side: list of `sitemap_*` sources must equal the registrations' source names).
5. Files to extend: `src/lib/systemSelfModel2029.js` (add `jsonLd`, `sitemapSource`, `telemetryLabel` fields, plus a check that every `routeFamily` pattern parses), new `src/lib/surfaceRegistrations2029.js`, `src/lib/publicReadingTelemetry2029.js`, `src/lib/publicReadingRelease2029.js` (`publicReadingPath`), `api/sitemap.js` (`STATIC`, `foundationStatics`), `api/og.js` (`STATIC` table and JSON-LD branch), `route-legitimacy.js` + `scripts/helpers/route-legitimacy-sources.mjs`, `src/pages/PublicServices2029Page.jsx` (/map list), `scripts/test-2029-route-seo-decisions.mjs`, `scripts/test-2029-route-seo-behavior.mjs`, `.github/workflows/route-seo-decision-2029.yml`, and the contract doc (SOD1820_CONTENT_FOUNDATION_CONTRACT.md §12.9, a new "SEO registration" clause that explicitly separates registration from series membership). Every change goes through ZURIEL approval; DB or deployment actions are out of scope here.

Because publication of anything is a human decision, an "automatic system" should mean: automatic registration into discovery surfaces (sitemap, OG, share, analytics) for items already published and public, never automatic series assignment or automatic publication.

## 5. Unverified items (UNKNOWN)
- Live state: live Production deployment, live DB (series follow migration applied?), the live sitemap contents. I did not call Vercel or Supabase.
- PLAN37 and `project_codex` content (the DB was not read).
- Whether `route-seo-decision-2029` is a required status check on main.
- Whether the sibling branches' series work is merged anywhere other than origin/ccr-9fba3323-g3hd6t and origin/ccr-c096916c-nxv7te.
- I did not run any test, build or gate; all "would/would not catch" statements come from reading scripts.
