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
