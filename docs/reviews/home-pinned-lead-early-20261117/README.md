# The Home's pinned card: its read and cover start with the entry (17.11.2026)

**Status: test branch and protected Preview only.** ZURIEL 17.11.2026: "מאשר, תתחיל בסעיף 2". Task key `HOME_PINNED_LEAD_EARLY_20261117`, draft PR #1381. No merge, no Production, no database change.

## 1. What was slow (the live Home, 17.11.2026)

Phone profile: 390×844 at 2×, Slow 4G (150 ms RTT, 1.6 Mbps down, 750 kbps up), 4× CPU, fresh profile, 3 runs on `sod1820.co.il`.

| Step | Time |
|---|---|
| Document (kept CDN copy) | first byte ~0.1 s, first paint ~0.6 s |
| Entry code | ~0.2 → 2.9 s |
| Home code (preloaded with the document) | ~0.2 → 2.6 s |
| The Home component mounts and asks for the series catalog | ~4.8 s |
| The catalog answers; the pinned card appears | ~5.4–5.7 s; card ~5.8 s |
| The card's cover is requested; it is the page's largest paint | requested ~5.8 s, painted ~6.4 s |

The cover itself takes ~0.55 s. The wait is the chain before it: entry, mount, then the read.

## 2. What changed

- **`src/lib/homePinnedLeadEarly2029.js`:**
  - starts the **same** series catalog read the Home reads (`fetchContentSeriesCatalog2029({ homeOnly: true, homeDisplay: true })`). The catalog already shares one read between its callers for a minute, so when the Home component asks, it gets this read. Nothing is read twice.
  - when the read answers, it adds one preload for the card's cover, with the card's own `src`, `srcset` and `sizes` (`fetchpriority="high"`). The card's image request is then served by this download.
- **`src/components/experience2029/homePinnedCover2029.js`:** the cover rule (copy widths 480/768 at quality 80, `sizes`, the newest member of the primary series), moved out of `HomeComposition2029.jsx`. The card and the early start use the same code.
- **`src/lib/homeAtmospherePreload2029.js`** already runs in the entry. It starts the early read on the Home address of the public release, but not on `?p=` (a WordPress address that opens a Post).
  - It reaches the code through the Home route module, which the router loads anyway (`import("../pages/Home2029Page.jsx")`). The entry gains no static import, and no other page's code changes.
  - A first version imported the early module directly. The build then split a shared helper out of the frame and the frame gained a file. The shell budget gate refused it, and that version was not kept.
- **The document is unchanged.** It is still the same bytes for everyone, so the kept CDN copy of `/` stays valid. Nothing is written into it on the server.

## 3. Tests

| Test | Result |
|---|---|
| `test/home-pinned-lead-early-2029.test.mjs` (new; in `live-contracts-2029`) | 7/7: scope; the same member, `src`, `srcset` and `sizes` as the card; one definition; idempotent preload; the Home's read options; **one network read per series** for the early call and the Home's call; no static import into the entry |
| Home unit tests (24 files) | 142/147. The 5 failures: the `home-live-updates` harness needed the moved helper (fixed, 76/76 on the Home set; assertions unchanged), and 4 that fail the same way on clean `main` (record-time formatters, ELS integration slot, Home code admission, public build model) |
| `npm run build` with the shell budget | PASS: frame files 5 (the same set as `main`), entry +90 B gzip, within tolerance |

## 4. Protected Preview A/B (17.11.2026, ~22:25 UTC)

The two arms differ only in this change; both use the same build pipeline (`--protected-review`), the same branch and the same database:

- **Control:** `dpl_HdRnQYqeJQ3USc27W7dnQ2Sf3Sc8`, `main` `19e0cafe7`.
- **Treatment:** `dpl_WAJNK9ZiVGFZvmbeN7ApD28o84A9`, `1cd3d6fdf`.

Method: the phone profile of section 1, 6 rounds, arms alternating. The script is `home-ab.cjs`; the raw rows are in `home-ab-results.json`.

| Moment (ms from navigation) | Control p50 / p75 | Treatment p50 / p75 | Change at p50 |
|---|---|---|---|
| First paint | 640 / 644 | 584 / 644 | same |
| Series catalog reads start | 5,211 / 5,317 | 4,376 / 4,381 | **−835** |
| Series catalog reads end | 6,167 / 6,264 | 5,081 / 5,086 | **−1,086** |
| The pinned card appears | 6,196 / 6,211 | 5,454 / 5,669 | **−742** |
| The cover is requested | 6,282 / 6,316 | 5,392 / 5,394 | **−890** |
| The cover has arrived | 6,859 / 6,946 | 6,189 / 6,389 | **−670** |
| Largest paint (the cover in every run) | 6,684 / 6,796 | 6,272 / 6,460 | **−412** |
| Reads of `posts` per load | 9 | 9 | same: nothing read twice |
| Requests for the cover per load | 1 | 1 | same: one download |
| The early preload present | no | yes, in 6 of 6 | |

What it means:

- The card appears about 0.7 s earlier, and the cover arrives about 0.4–0.7 s earlier. Nothing is read twice, and nothing else on the page changes.
- In the treatment the read now answers before the Home component mounts. The card appears about 0.25 s after mount, so the remaining wait is the code (entry and mount, ~5.2 s on this profile) and the cover download itself (~0.8 s on Slow 4G).
- These are lab numbers from one machine through edge `cle1`. They are not field data. The field check is the Home's largest paint and the share of samples by build in the speed centre.

## 5. Possible next step (not done)

Start the same reads from the document itself, before the code arrives. The document's script would make the exact requests the app makes, and the app's shared read layer (`readDedupe`) would adopt them.

- Then the cover could be in the browser before the card appears. The expected largest paint is about the card's appearance time, ~0.8 s better again on this profile.
- It needs the exact request list from the build and a handoff into the read layer. It is a separate, larger change, and this first step does not need it.
