# Search Console and GA4 — exact instructions (short)

## Google Search Console (property `sod1820.co.il` — prefer the **Domain** property)
**Option 1 — read access (best):** Settings → Users and permissions → Add user → `<the address ZURIEL names for the audit account>` → permission **Restricted** (read-only).
**Option 2 — send exports (CSV/screenshots) of:**
1. Indexing → **Pages**: the totals, and "Why pages aren't indexed" (all reasons, expand each, export).
2. Indexing → **Sitemaps**: status, last read, discovered URLs for `https://sod1820.co.il/sitemap.xml`.
3. Performance → last **90 days**, tab Pages (export) and Devices.
4. Experience → **Core Web Vitals** (mobile + desktop) and Settings → **Crawl stats**.
5. **URL Inspection → "Test live URL" + "Page indexing"** for: `/`, `/post`, one post, `/number/1820`, one `/video/<id>`, one legacy root slug (`/<slug>`, no trailing slash). Note "Google-selected canonical".
Why: the synced `gsc_metrics` ends at 2026-11-03, before the 4.11 cutover; indexing state cannot be inferred from the sitemap alone.

## GA4 (measurement ID `G-V3H3E20FLY`)
**Option 1:** Admin → Property access management → add the audit account as **Viewer**.
**Option 2:** send: Admin → Data streams → web stream (domains, Enhanced measurement, consent settings); Reports → Engagement → **Pages and screens** (7 days) filtered to `/code`, `/community/researchers`, `/login`, `/2029/journey` (the routes with no GA requests in the browser audit); Reports → **Realtime** screenshot while a tester opens 3 pages; Admin → **DebugView** with `?debug_mode=1` for one session.
Not required but useful: Search Console ↔ GA4 link status; whether `GA_PROPERTY_ID` in Vercel equals this property.

## Vercel
Project → **Speed Insights** (LCP/INP/CLS by route, p75, mobile) and **Observability → Functions** (duration/errors for `/api/card`, `/api/public-document`) — screenshots or Viewer role.

## Test accounts (for the signed-in journeys)
One ordinary Google account and one Facebook account created for testing, one non-admin and one admin test user; no real personal data.
