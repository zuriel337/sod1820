# SOD1820 — Search / Indexing Closure Map 2029 v1

**Date:** 2026-09-28  
**Owner posture:** EXTEND_EXISTING — no new SEO registry/system.  
**Canonical owners:** `api/sitemap.js`, `src/lib/seo.js`, 2029 route owners, canonical indexability projections, `route-legitimacy.js`, edge crawler policy and Vercel routing.

**G3 scope correction · 2026-09-28:** this closure map targets the **2029 product tree only**. Legacy routes/data remain source, compatibility and provenance only where still required. Existing Legacy containment may stay live until retirement, but new Search/Video work must converge on 2029 routes rather than receiving Legacy parity work.

## Goal

One decision chain:

```
ADDRESSABLE
  -> INDEX_WORTHY
  -> DISCOVERABLE
  -> GOOGLE-ACCESSIBLE
  -> CANONICAL
  -> RECrawl VERIFIED
```

A URL is not "healthy" merely because Google discovered it, and an excluded URL is not automatically a defect.

## GSC reasons -> 2029 contract

| GSC reason / signal | 2029 treatment | State |
|---|---|---|
| Video `uploadDate` invalid / missing timezone | all VideoObject paths pass through ISO-8601 timezone normalization; unified video sitemap emits ISO timestamps | IMPLEMENTED · GSC RECrawl PENDING |
| Blocked by `robots.txt` | allowed only for intentionally private/expensive routes; public/index-worthy paths must not be disallowed | CONTRACT ACTIVE |
| 403 | acceptable only for private/expensive/bad-bot paths; public goodbot/search crawler must reach public content | CONTRACT ACTIVE · monitor |
| 404 | unknown legacy single-segment `/:slug` is validated at Edge and returns true HTTP 404; valid posts/routes keep 200/redirect behavior | IMPLEMENTED · LIVE VERIFY REQUIRED |
| Soft 404 | unmatched SPA wildcard renders a dedicated `noindex` Not Found page instead of redirecting home; nested dynamic-entity HTTP status remains owner-specific | MAJOR SOURCE CLOSED · residual monitor |
| Server error 5xx | public index-worthy surfaces must be 5xx-free across release verification | RELEASE GATE |
| Redirect | valid legacy redirect is not an error; sitemap/internal links must point directly to the final canonical 200 URL | CONTRACT ACTIVE |
| Duplicate without user-selected canonical | entity/media owner must emit one canonical; unified video projection chooses one primary placement | VIDEO IMPLEMENTED · global monitor |
| Google chose different canonical | inspect sample URLs; canonical + sitemap + internal links must converge; no mass assumption from aggregate count | GSC SAMPLE REVIEW |
| Excluded by `noindex` | correct when intentional; must use the same indexability owner as sitemap | CONTRACT ACTIVE |
| Crawled/discovered currently not indexed | review representative samples only after index-worthiness/canonical/access checks | GSC SAMPLE REVIEW |

## Legacy phrase containment — compatibility only

The phrase SSOT released in PR #779 prevents arbitrary Legacy phrase URLs from remaining blindly indexable and preserves verified phrase provenance. It is containment, not the target 2029 Expression surface. Native 2029 Expression/Number routes must consume the same canonical owners rather than inherit Legacy URL identity.

### Released containment

Previous state:
- arbitrary `/number/<phrase>` was addressable and indexable;
- verified phrase pages were not declared in sitemap;
- sitemap and page robots disagreed.

2029 state:
- `public.sitemap_phrases_v1` = verified + published + visible phrases only;
- `public.is_phrase_indexable(text)` derives only from that view;
- `EntityPageBase` is fail-closed for both number and phrase pages;
- `api/sitemap.js` emits the same admitted phrases;
- arbitrary phrase URLs remain addressable for users but are `noindex,follow`.

No new content registry was created.

## Video pages — 2029 target

Unified Video Projection rules:
- one media asset can have many placements;
- one primary Google landing page;
- Video Sitemap reads the deduplicated asset projection rather than the `וידאו` category;
- post-owned video converges on the 2029 `/post/:slug` route;
- media without a richer 2029 owner uses the 2029 `/video/:assetId` route;
- generic/orphan video is not Google-ready until grounded metadata exists;
- `uploadDate` is timezone-normalized;
- legacy media is not copied merely for SEO;
- new public WhatsApp video follows the 2029 media tree.

## Public Googlebot / goodbot access

Public + index-worthy means:
- not intentionally disallowed by `robots.txt`;
- no country hard-block for goodbot/AI public paths under the active CN/SG contract;
- bad bots may still receive 403;
- private/expensive/admin paths may remain blocked.

A crawler challenge/proof is not Human proof; this contract is about public crawl access only.

## Route legitimacy / 404 — 2029 routing boundary

`ROUTE_LEGITIMACY_2029_V1` is the existing Edge routing primitive. It runs **after** security/quarantine decisions and therefore does not alter CN/SG semantics.

Released base:
- exact static single-segment routes/redirects are projected by `route-legitimacy.js`;
- unknown Legacy single-segment candidates use indexed `public.public_post_slug_exists()`;
- false -> true Edge HTTP 404; Supabase uncertainty -> fail-open.

G3 2029 extension:
- `/post/:slug` reuses the **same indexed slug existence check** before the 2029 SPA document is committed;
- malformed `/video/:assetId` (not a 32-char hex public asset id) returns Edge HTTP 404 without DB work;
- a well-formed but nonexistent video id remains fail-closed/noindex until a bounded existence lookup can be proven without recomputing the heavy media Projection on every request;
- Topic/Book/Number false-IDs remain owner-specific residuals until their canonical route owners expose equally cheap legitimacy checks.

Closure rule:
- current 2029 route -> 200;
- retired route with replacement -> 301;
- known nonexistent route -> 404;
- uncertainty at an external dependency -> fail-open for availability but page metadata remains fail-closed/noindex where applicable.

Do not move these checks into CN/SG country-policy logic; Route Legitimacy is routing validity, not bot/Human classification.

## Canonical convergence

For every public entity:
1. one canonical URL;
2. sitemap points to canonical only;
3. internal links should converge on canonical;
4. redirects terminate at canonical;
5. duplicate media placements do not create competing Video Sitemap entries.

Google selecting a different canonical remains an external verification signal, not a second source of truth.

## GSC closure rule

A code fix is **not** the same as a Search Console closure.

For each resolved issue:
1. deploy;
2. verify live HTTP/robots/canonical/schema;
3. request/allow recrawl;
4. inspect GSC validation/sample URLs;
5. only then mark `GSC_VERIFIED`.

Current Search Console screenshots are evidence snapshots, not live API state.

## Current release blockers / waiting

- **LIVE_VERIFY:** Edge HTTP 404 for 2029 `/post/:missing-slug` after the G3 cutover release.
- **RESIDUAL:** well-formed nonexistent `/video/:assetId` and other owner-specific dynamic false-IDs still need bounded domain legitimacy checks; hydrated pages remain noindex on missing data.
- **WAITING_EXTERNAL:** Google recrawl/validation for historical Video `uploadDate` warnings.
- **WAITING_EXTERNAL:** representative sample review for "Google chose different canonical".
- **ACTIVE MONITOR:** public 403/robots/5xx must be investigated only when the affected URL is intended public/index-worthy.

## Recovery acceptance after the 2026-10-13 rollback

**Human direction: ZURIEL, 2026-10-14 Asia/Jerusalem — implement in dependency order.**
This extends the existing Search/Indexing boundary; it does not create a new SEO owner or reopen G3. Earlier implementation labels above are historical evidence, not proof of current crawler parity. Production recovery and 2029 readiness require separate verification.

### Content and admission — existing route / publication owners

- A public index-worthy reader document must contain the main public text and relevant source links, not only title/description/OG/JSON-LD or a self-link. Verify the response served through the actual crawler route as well as the underlying handler. Compare it with the anonymous reader; never pull private, draft or locked content to improve SEO.
- Number and phrase server documents consume the same `is_number_indexable` / `is_phrase_indexable` decisions as the client and sitemap. Only boolean `true` admits indexing; unknown/error/malformed results stay noindex and non-cacheable. Numeric prefixes such as `123abc` are expressions, not number 123.
- Publication signals remain the existing post draft/forum tags. No new length, popularity or quality threshold is introduced. Access/RLS remains the anonymous public boundary.
- Required negative cases: closed capability makes zero content/admission reads; unpublished post leaks no body; nonexistent path does not become indexable home metadata; dependency failure does not cache a false successful admission.
- Phase 1 implementation candidate adds the full **text** and HTTP(S) source-link representation for published posts. It is not complete rich-media/rendered parity: media/transcripts, Home/World/Topic/Book content and actual Googlebot route acceptance remain explicit follow-up gates. Social share cards retain their existing compact representation.

### Canonical convergence — existing publishing / route owners

- Audit root `/:slug` and `/post/:slug` pairs against actual reader canonical, media primary placement, inbound links and the two authorized POST-A pilots. Do not bulk redirect or select a new post URL convention from sitemap evidence alone.
- For each resolved identity, align sitemap, crawler/client canonical and internal links to the authorized preferred URL. Preserve inbound compatibility. A unique URL string count is not an entity deduplication proof.
- Reconcile sitemap membership with robots and capability state, including `/journey`. Neither silently opening a locked area nor blocking an already-public area is an acceptable shortcut.

### Bounded dependency and release acceptance — existing reliability owners

These are scoped acceptance requirements under `system_suggestions_law` and `deploy_on_request`, not new owner bodies or a claim that live DB law versions changed:

- Every external dependency that blocks the public response must have a finite time budget and an explicit failure policy. Preserve security/authorization decisions; distinguish public route availability from index admission. Exercise latency/timeout paths and record the affected dependency, not just a generic 5xx count.
- Release, rollback and domain-alias reassignment evidence must identify the deployment **actually resolved by the public domain** and its SHA. GitHub's latest successful deployment history alone is insufficient after rollback.
- The bounded post-release test checks final URL/redirect chain, response status, expected public content, canonical, robots/header agreement, representative sitemap membership and a missing/locked negative fixture. A generic 200/root div/bundle is not content acceptance.
- Checks run within the existing deterministic canary/incident pipeline and its cadence budget; no new scheduler, monitoring store or AI health loop. Preview remains non-indexable and is not production evidence.
- Closure labels stay separate: BRANCH_TESTED → exact-head CI/preview → authorized release → LIVE_VERIFIED → GSC_VERIFIED. Search Console recrawl/index/canonical evidence remains external; passing code tests never implies restored rankings.

