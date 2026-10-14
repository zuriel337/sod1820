# Unified preview (PR #1092) load measurement, 2026-10-14

BEFORE = `e2068eef` (PR #1092 head as first published). AFTER = `0e4e2d57` (adds the shell owner's Home CLS fixes `abea2ef5`/`71b13de9` and the perf lane's lazy-loading commits). PR #1091 (`site_flags` coalescing) and Number #1087 `b47ed9f0` are in BOTH builds. Raw runs: `mu.jsonl` (one JSON line per run, 10 repetitions per scenario, builds interleaved). Script: `scripts/measure-2029-unified.mjs`.

Conditions: local production build (`npm run build:2029`) on a static server with SPA fallback, fresh browser context per run (cold cache), writes and analytics blocked, real Supabase reads, `site_flags` mocked open so the gated Number page renders. Mobile 390x844, CPU x4, 150 ms / 1.6 Mbps. Desktop 1366x768, CPU x1, 40 ms / 10 Mbps. Usable content: home = `[data-experience-capability=home-composition]`, post = `post-master-reading-stage`, number = `.sod29-number-page`, world = a new h1 plus 600+ characters. Laboratory numbers, not field data.

## Cold entry

| profile | page | usable before (median / p75, range) | usable after | FCP before > after | JS gzip KB | requests | TBT ms |
|---|---|---|---|---|---|---|---|
| mobile | world | 14.7s / 14.7s, 14.6-14.8s (n=10) | 12.3s / 12.3s, 12.2-12.3s (n=10) | 10.7s > 4.4s | 600 > 506 | 77 > 103 | 396 > 255 |
| mobile | home | 13.2s / 13.2s, 13.2-13.4s (n=10) | 10.3s / 10.3s, 10.2-10.4s (n=10) | 10.6s > 4.3s | 549 > 432 | 71 > 94 | 431 > 292 |
| mobile | post | 14.9s / 15.1s, 14.6-16.1s (n=10) | 11.8s / 12.2s, 11.3-13.2s (n=10) | 10.6s > 4.3s | 521 > 400 | 48 > 71 | 636 > 462 |
| mobile | number | 13.4s / 13.7s, 13.3-14.1s (n=10) | 11.8s / 11.9s, 11.6-12.4s (n=10) | 10.7s > 4.4s | 484 > 415 | 69 > 111 | 375 > 235 |
| desktop | world | 2.6s / 2.6s, 2.6-2.6s (n=10) | 2.1s / 2.1s, 2.1-2.1s (n=10) | 1.9s > 0.8s | 600 > 506 | 83 > 110 | 44 > 46 |
| desktop | home | 2.3s / 2.3s, 2.3-2.4s (n=10) | 1.8s / 1.8s, 1.8-1.8s (n=10) | 1.8s > 0.8s | 549 > 486 | 80 > 103 | 17 > 4 |
| desktop | post | 3.8s / 3.8s, 3.6-4.6s (n=10) | 3.3s / 3.7s, 3.1-4.0s (n=10) | 1.8s > 0.8s | 521 > 400 | 54 > 77 | 29 > 21 |
| desktop | number | 3.0s / 3.1s, 3.0-3.4s (n=10) | 2.7s / 2.7s, 2.6-3.2s (n=10) | 1.9s > 0.8s | 484 > 415 | 81 > 115 | 19 > 18 |

## In-app navigation (ms to usable destination content, median / p75)

| profile | step | before | after |
|---|---|---|---|
| mobile | world->home | 1736 / 1835 (n=10) | 1994 / 2081 (n=10) |
| mobile | home->post | 2058 / 2074 (n=10) | 2309 / 2382 (n=10) |
| mobile | post->back(home) | 164 / 181 (n=10) | 153 / 188 (n=10) |
| mobile | home->world | 148 / 163 (n=10) | 170 / 184 (n=10) |
| mobile | world->number | 2370 / 2412 (n=10) | 3232 / 3274 (n=10) |
| mobile | number->back(world) | not measured (harness could not detect the destination) | not measured (harness could not detect the destination) |
| desktop | world->home | 234 / 253 (n=10) | 248 / 257 (n=10) |
| desktop | home->post | 530 / 568 (n=10) | 513 / 624 (n=10) |
| desktop | post->back(home) | 53 / 59 (n=10) | 54 / 57 (n=10) |
| desktop | home->world | 60 / 62 (n=10) | 49 / 64 (n=10) |
| desktop | world->number | 847 / 874 (n=10) | 972 / 990 (n=10) |
| desktop | number->back(world) | 30 / 33 (n=10) | 34 / 36 (n=10) |

## Result
- First load improved on every page and both profiles. Mobile usable content is 12-22% earlier (world 14.7 > 12.3 s, home 13.2 > 10.3 s, post 14.9 > 11.8 s, number 13.4 > 11.8 s); first contentful paint is about 6 s earlier because the entry chunk went from about 365 KB to 107 KB gzip. Desktop is 0.3-0.5 s earlier.
- Cost, not claimed away: request count rises by 23-42 per page (more, smaller chunks) and the FIRST in-app navigation to a not-yet-loaded surface is slower on mobile: world > home +0.26 s, home > post +0.25 s, world > number +0.86 s (2.37 > 3.23 s). Desktop -0.02 to +0.13 s. Repeat navigations and back/forward are unchanged.
- `site_flags` is already coalesced in both builds (#1091): 1-2 requests per page.
- Not measured: mobile number > back(world) (the harness could not detect the destination in either build), real phones, Safari/Firefox, field data.

## Where the remaining time goes (static analysis of the clean build, `chunkdeps`)
| page | first-load JS gzip after (entry + page + shared) | before |
|---|---|---|
| world | 504 KB | 596 KB |
| home | 430 KB | 546 KB |
| post | 383 KB | 514 KB |
| number | 409 KB | 477 KB |
Shared `Sod2029Shell` is now a 67 KB gzip chunk fetched by every surface after the entry (was inside the entry); `post2029ReadingProjection` (47 KB) is needed by home, world and post; `timeFlow`/`@hebcal` (53 KB) still loads on Home because `fetchHome2029Projection` needs the Hebrew year.

## Requests worth fixing next (real Supabase, unified build)
- Home `/`: 14-16 `posts` requests, about 730 KB uncompressed. Three category lists use `select=*` (limit 24, 30 and 60: "שבילי שפה", "הצופן בסרטים", "מימד חמש") and pull whole rows including `content`; two identical `limit=21` lists are sent twice. Selecting only the card fields and sharing the duplicate would remove most of this.
- World `/world`: 8 `posts` (172 KB), 4 `gallery_images` (101 KB, includes `ocr_text`/`ocr_meta`), 13 `topic_cards_public` (several overlapping lists with different limits), 8 `nodes`.
- Number gated routes: `lock_number` must be open (or an admin session) for the page to render; with the real flag closed the preview shows the preparation lock.

## Prioritised improvements
1. Idle prefetch of the next-route chunks (`Home`, `Post`, `Number` pages and `Sod2029Shell`) after first content, skipped on Save-Data/slow connections: removes the first-navigation penalty above. Needs the shell owner (`App2029.jsx`).
2. Persistent shell: one layout route with `<Outlet/>` so `SystemFrame2029` is not remounted on every navigation (the structural cause of the 1.7-2.4 s mobile world > home and home > post steps, which are almost entirely shell + data work, not network). Shell owner.
3. Home post lists: narrow selects (no `content`) and one shared request for the duplicate; same for `gallery_images` on World. Data lane.
4. Render main content before secondary reads (World discovery rails, topic lists) finish; show verification marks only after the check completes.
5. Keep `npm run test:2029-bundle-budget` in CI and add a request/payload budget per page using `scripts/measure-2029-unified.mjs`.

