# Old-address Post documents: no edge database lookup for browsers — 16 November 2026

Branch-only. Base `origin/main` `ea7257598a5217b9a8de308cca1194ec4a027fbf`; live site read at the start: aliases on `dpl_EFNqJ27phRRhWQsC6fGTo9zELVRU` (source `d1f1e3252`). Owner: the existing Route Legitimacy 2029 edge check (`middleware-core.js`, `route-legitimacy.js`, `public_post_slug_exists`). No new owner, rule, table, RPC or threshold. A merge is not a deployment; both need ZURIEL's explicit approval for the exact commit.

## What was wrong

Every Post document — an old WordPress address `/<slug>` first (the address Google serves), and `/post/<slug>` too — waited at the edge for one Supabase RPC, `public_post_slug_exists`, before the document function ran. The document function (`public-reading-deploy/api/public-document.js` → `api/og.js`) then reads the same post again and already answers a missing or suppressed post with **404 + noindex** and an unavailable source with **503** (`test/public-reading-production-artifact.test.mjs`, 25/25). For a browser the edge lookup was a second read on the same question, paid serially before the first byte. Its only cache is per edge instance (10 minutes, 512 addresses), so the long tail of old posts pays it almost always.

## Measured cost (live, read-only, sequential, 16.11.2026 ~02:20 UTC, US edge through the sandbox proxy)

A fresh, never-seen address per request forces an uncached lookup; `/contact` is a known route with no lookup and no database read. Server wait = time to first byte minus TLS.

| request | n | server wait, median [min–max] ms |
|---|---|---|
| `/contact` (no lookup) | 8 | 99 [75–114] |
| fresh missing address (one uncached lookup, edge 404) | 8 | 253 [232–574] |
| **cost of the lookup** | | **154 ms** |

Raw rows: `live-lookup-cost-20261116.txt`. From Israel the edge is farther from the Tokyo database than this US edge, so the cost there is probably larger; it was not measured.

Same session, the already released packages (A one request for both spellings, D static cache) checked live (`live-post-documents-20261116.jsonl`, n=5 each, noisy bimodal reads): old posts O3/O4 server wait medians 348 / 329 ms (15.11 baseline 770 / 1,056 ms); `/fonts/*` `max-age=604800`, `/brand/*` `max-age=86400`, a missing `/fonts/zzz-missing.woff2` and `/sw.js` stay `no-store`.

## Change

- `edgePostLookupRequired(kind)`: only `goodbot` and `ai` requests run the lookup. They keep the cheap, CDN-cacheable edge 404 (no function invocation per crawled miss). Blocked bots are already answered 403 earlier; browsers go straight to the document handler.
- The crawler lookup is bounded at 800 ms (`AbortSignal.timeout`), fail-open exactly like an unavailable lookup: the document handler then decides.
- Security, country and quarantine order is unchanged (route legitimacy still runs after them); `/video/<id>` impossible-id 404 is unchanged for everyone.

## Tests

- `test/public-reading-middleware-entry.test.mjs` 8/8: crawler 404 at the edge for missing old and `/post/` addresses; browser documents (old address, encoded Hebrew address, `/post/`) pass with **no** lookup call, GET and HEAD; the bounded lookup fails open; impossible video id stays 404.
- `scripts/test-route-legitimacy-2029.mjs` PASS, with new pins for the crawler-only rule and the bound.
- `test/public-reading-production-artifact.test.mjs` 25/25 (the document handler's 404/503 ownership), route SEO decisions, main release contract, edge country/quarantine/SG, DEF-001/005, M0a, RPC deploy order: all pass. CI result belongs to the PR head, not to these local runs.

## Costs and limits

- A scanner that sends a browser user agent to random addresses now reaches the document function instead of the edge 404: one function invocation and the same single read per miss (before: one edge read). Real crawlers are unaffected.
- The browser 404 page is now the 2029 not-found document (with navigation) instead of the bare edge page; status and noindex are the same.
- Not measured: the saving from Israel, and the field effect. After an approved release, compare field TTFB for `/<slug>` and `/post/<slug>` 7 days before/after with the existing read-only RUM query (all devices; RUM has no device class).
