# SOD1820 — Search / Indexing Closure Map 2029 v1

**Date:** 2026-09-28  
**Owner posture:** EXTEND_EXISTING — no new SEO registry/system.  
**Canonical owners:** `api/sitemap.js`, `src/lib/seo.js`, route owners, `public.sitemap_numbers()`, `public.is_number_indexable()`, `public.sitemap_phrases_v1`, `public.is_phrase_indexable()`, edge crawler policy, Vercel routing.

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

## Phrase pages — closed SSOT drift

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

## Video pages

Unified Video Projection rules:
- one media asset can have many placements;
- one primary Google landing page;
- Video Sitemap reads the deduplicated asset projection rather than the `וידאו` category;
- orphan public video may use `/video/:assetId`;
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

## Route legitimacy / 404

The largest soft-404 source is the legacy single-segment catch-all `/:slug`.

2029 route-legitimacy layer:
- exact static single-segment App/redirect routes are projected by `route-legitimacy.js`;
- unknown single-segment candidates are checked through indexed `public.public_post_slug_exists()`;
- existing post slug -> normal SPA 200;
- configured legacy redirect -> existing Vercel redirect;
- nonexistent single-segment slug -> **HTTP 404 at Edge**, before `index.html`;
- Supabase/RPC uncertainty -> fail-open, preserving availability;
- the check runs after existing CN/SG/bot enforcement and changes no country-policy semantics.

SPA residual:
- wildcard unmatched nested routes render `NotFoundPage` with `noindex` instead of silently navigating home;
- a dynamic route whose *pattern* is valid but whose entity does not exist still needs its own domain owner to produce a server-side 404 if required.

Closure rule:
- the single-segment soft-404 blocker is closed only after a live external request confirms HTTP 404;
- nested/dynamic entity false-IDs remain a residual monitor, not falsely marked globally closed.

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

- **LIVE_VERIFY:** true Edge HTTP 404 for unknown single-segment legacy post slugs.
- **RESIDUAL:** valid dynamic route patterns with nonexistent entity IDs/slugs still depend on their domain owner for server-side 404; SPA fallback is noindex.
- **WAITING_EXTERNAL:** Google recrawl/validation for historical Video `uploadDate` warnings.
- **WAITING_EXTERNAL:** representative sample review for "Google chose different canonical".
- **ACTIVE MONITOR:** public 403/robots/5xx must be investigated only when the affected URL is intended public/index-worthy.

Everything else above is either implemented or an explicit intentional exclusion rule.
