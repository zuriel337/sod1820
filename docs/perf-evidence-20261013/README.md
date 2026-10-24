# 2029 load measurement, before/after (2026-10-13)

Before = `main` 4651042d. After = `perf/shell-lazy-handoff-20261013` 59ca4053 (adds lazy @hebcal/timeFlow, narrow Post connection reads, lazy calculators/NumberDrawer/GoldenProjector). Raw data: `m10.jsonl` (one JSON line per run). Script: `scripts/measure-2029-load.mjs`.

Conditions: local production build served statically, real Supabase reads, writes/analytics blocked, fresh browser context per run (cold cache), 10 repetitions per scenario, builds interleaved. Mobile: 390x844, CPU x4, 150 ms / 1.6 Mbps. Desktop: 1366x768, CPU x1, 40 ms / 10 Mbps. Usable content = an h1 plus >600 characters of text for the destination page. These are laboratory numbers, not field data.

## Cold entry

| profile | page | usable before (median / p75 / range) | usable after | FCP before > after | JS gzip KB before > after | requests before > after | TBT ms before > after |
|---|---|---|---|---|---|---|---|
| mobile | world | 15.1s / 15.2s / 15.0-15.5s (n=10) | 12.8s / 12.8s / 12.6-13.2s (n=10) | 11.2s > 4.9s | 593 > 504 | 83 > 109 | 391 > 272 |
| mobile | home | 13.5s / 13.5s / 13.2-13.7s (n=10) | 10.5s / 10.6s / 10.3-10.7s (n=10) | 10.5s > 4.2s | 534 > 418 | 58 > 79 | 340 > 181 |
| mobile | post | 14.6s / 14.7s / 14.3-15.1s (n=10) | 11.5s / 11.5s / 11.2-11.8s (n=10) | 10.5s > 4.3s | 514 > 398 | 53 > 76 | 539 > 401 |
| desktop | world | 3.1s / 3.2s / 3.1-3.2s (n=10) | 2.6s / 2.7s / 2.6-2.7s (n=10) | 2.5s > 1.3s | 593 > 504 | 90 > 116 | 26 > 1 |
| desktop | home | 2.3s / 2.3s / 2.2-2.3s (n=10) | 1.7s / 1.7s / 1.7-1.7s (n=10) | 1.8s > 0.8s | 534 > 418 | 65 > 86 | 41 > 19 |
| desktop | post | 4.1s / 4.5s / 3.6-4.9s (n=10) | 3.2s / 3.3s / 3.0-3.5s (n=10) | 1.8s > 0.8s | 514 > 398 | 59 > 82 | 43 > 24 |

## In-app navigation (ms to usable destination content)

| profile | step | before median / p75 | after median / p75 |
|---|---|---|---|
| mobile | world->home | 1870 / 2020 (n=10) | 2053 / 2180 (n=10) |
| mobile | home->post | 2875 / 2984 (n=10) | 2870 / 3014 (n=10) |
| mobile | post->back(home) | 558 / 583 (n=10) | 530 / 569 (n=10) |
| mobile | home->world | 514 / 529 (n=10) | 518 / 532 (n=10) |
| desktop | world->home | 182 / 202 (n=10) | 198 / 239 (n=10) |
| desktop | home->post | 1498 / 1722 (n=10) | 1434 / 1476 (n=10) |
| desktop | post->back(home) | 42 / 43 (n=10) | 40 / 48 (n=10) |
| desktop | home->world | 299 / 308 (n=10) | 303 / 307 (n=10) |

## Reading the result
- First load improved on every page and both profiles: mobile usable content 15-22% earlier, desktop 16-26% earlier; first contentful paint about 6 s earlier on mobile because the entry chunk went from 358 KB to 103 KB gzip.
- Request COUNT went up (about +20 to +26 per page) because code is split into more chunks. Bytes went down. This is a trade-off, not a free win.
- In-app navigation between surfaces did not improve. The one visible difference is mobile world->home, about +180 ms (1.87 s -> 2.05 s median; ranges overlap but the p75 also rose) because chunks that used to sit in the entry are now fetched on the first in-app visit. Everything else is within noise. The remount of the shared shell on every route change (SystemFrame2029) is a separate structural cause and is not addressed here.
- Not included: the site_flags request coalescing (owned by GPT PR #1091; 8 identical requests per /world remain in this build), duplicate/overlapping topic_cards_public, gallery_images and nodes reads, and rendering the main content before secondary reads finish.
- Narrow Post connection reads: /world Post-table payload 293 KB -> 172 KB (same number of requests).

