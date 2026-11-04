# NOW-CENTRAL-HANDOFF-20261103 — ״עכשיו״ בסרגל התחתון של 2029 (ענף בלבד, ללא פריסה)

Task key (existing log): `NOW-CENTRAL-HANDOFF-20261103` · log record `5c6b56b2-69c5-4050-a651-bebaa0bff2b8`
Also read: `HOME-UPDATES-VISUAL-20261103` (`37256e34…`, `a11cd2b8…`), the Doc37 chain, and the 3.11 decision on public Zvi material.

## Base and live state (verified, not assumed)

| Item | Value |
|---|---|
| Live 2029 Production (log `c8e4f471…`, `268c6a37…`) | source `1bc8260a`, deployment `dpl_CkoiEsaT1UJ7rAZuzYE7i79noi9A`; later observed live source `bde0a822` / `9mWv` on the three domains |
| Continuation branch used as base | `gpt/2029-public-cutover-final-preparation-20261103` @ `ae8deb7ae1775046dc616a41f66307a7881dfe70` (descends from `bde0a822`; after it only community likes, zero overlap with this scope) |
| `main` | `2195c978` untouched |
| Reference `1bc8260` | used as a reference point only, not a revert target |
| Active writers on the touched files | none found in the work_log (no non-AFTER record naming `SystemFrame2029` / `systemFeed` / `useSystemFeed` / `worldDiscoveryStream`) |

No Production / alias / domain / merge / DB / Edge / RLS / source-data action was taken. `node scripts/test-legacy-production-lock.mjs` → PASS.

## What changed (files)

- `src/lib/nowPublications2029.js` (new, pure) — compact row model, short titles, raw MP4/storage address cleanup, lenses (הכול / סדרות / מסרים / רמזי גאולה וקוד המציאות), secondary choices (series / source / media), filtering.
- `src/components/experience2029/NowPublications2029.jsx` + `nowPublications2029.css` (new) — the window itself; lazy-loaded.
- `src/components/experience2029/SystemFrame2029.jsx` — `AttentionProjection` now renders the window; panel kicker no longer repeats "עכשיו"; long lead paragraph and the two "unavailable" personal placeholders removed. The dock button, `NowTabs2029`, ELS "סורק/תוצאות" behaviour, `PanelShell`, SystemFrame position logic are **unchanged**.
- `src/lib/research/systemFeedPublicSources2029.js` — adds the Human-Gated approved series occurrence (same channel id ⇒ same row, enriched with series + exact `/video/<id>` + media) and the Home series post previews; `thumb_url`.
- `src/lib/research/contentSeries2029Projection.js` — additive `mediaUrl` on the approved projection (same public-media policy as `imageUrl`).
- `src/lib/research/worldDiscoveryStream.js` — public post select also carries `categories`, `image_url`, `thumb_url`; item carries `author/categories/tags/thumbUrl` (classification evidence only).
- `src/lib/research/worldGroupSource.js` — `redactGroupText`: calendar dates and exact public links (`sod1820.co.il`, YouTube) are no longer replaced; phones, e-mail and every other link remain redacted.
- `src/lib/systemFeed2029.js` — items with an approved series identity are capped per series, so a series is represented even when the recent window is full.
- Tests: `test/now-publications-2029.test.mjs`, `test/now-publications-2029.browser.cjs`; adjusted `test/system-feed-public-sources-2029.test.mjs`, `test/companion-2029-one-feed-and-projector-rail.test.mjs`, `scripts/test-2029-system-frame.mjs` (source-shape assertions followed the moved code).

Shared-file note (central review): `worldGroupSource.js` redaction and `worldDiscoveryStream.js` select are shared with World; `legacy` does not import them (the Legacy lock passes).

## Requirement table

| # | Requirement | Prior state | Fix | Proof | Remaining gap |
|---|---|---|---|---|---|
| 1 | Verify base / gaps; coordinate shared files | — | Live source + branch identified from the log; base `ae8deb7ae`; no active writer on the files | log reads above | Hosted Preview of this branch not built by this session |
| 2 | Keep place and behaviour | Fixed dock button next to Raziel | Unchanged; sheet opens above the bar | browser: dock hit-test inside the dock at 320/390/1440 × 3 themes; sheet bottom ≤ dock top on mobile; ELS "סורק/תוצאות" label code untouched | The existing blurred backdrop (closes on outside tap) is pre-existing and was not redesigned |
| 3 | All public publications in one window | Posts + Zvi + 5 channels + gallery only; no series presence; stale approved video capped out | Series previews via the Home series reader; approved Or HaGeula occurrence merged by id; one row per publication | live read-only check (anon): posts, Zvi, gallery, 5 channels, 4 series, the approved video all present; 1 row per id | Post↔video of the *same* publication is merged only when ids/sourceRefs prove it; no such proof exists in data today |
| 3 | Zvi public material in interim | Shown; but dates became `[מספר]` | Opening words, source, time, "מקור · טרם נבדק"; click → `/world#group-source-<id>` | unit + browser (date kept, phone/foreign link redacted, anchor reached, back works) | Private e-mail excluded; e-mail ingestion still unverified |
| 4 | Words of the message + visible media (follow-up on ZURIEL feedback) | Headline only, media hidden until opened | Rows show the message text (up to 4 lines) and a 16:9 preview of the video/image inside the row; video never autoplays; Zvi/unverified rows stay two lines with no preview | unit + browser (excerpt present, preview present, Zvi row ≤100px) | A video without a poster shows its first frame (metadata only) |
| 4 | Compact rows / filters | Large buttons, 2 long paragraphs, per-channel chips | 1-line title (≤2 lines), source/series, time, type, 44px thumb; chips only when they have rows; secondary series/source/media | screenshots 320/390/1440 | — |
| 4 | Public name "מסרים" | "מסרים מצדיקים" | Display name in Now (series key and historical titles untouched) | unit + browser | Global rename (Home/Series/nav/meta/follow) belongs to the series/home owner; tests there still assert the old title |
| 4 | Video on choice | native `<video preload=none>` inside details | Poster + play button; `<video>` mounted only after the user presses play; "לפרסום המלא" and "לסדרה" | browser: no `<video>` and nothing playing before choice; controls after; both actions present | — |
| 5 | Exact opening | Some rows had no link | post → `/slug`, Zvi → world anchor, approved video → `/video/<id>`, gallery → exact image; text-only channel rows open in place | browser: refresh keeps destination, back returns | Or HaGeula videos not approved for the series have no exact public page → shown in place (no invented link) |
| 5 | Raw MP4 / over-filtering | MP4 addresses in excerpts; dates/links redacted | `cleanNowText`; redaction fix | live data: 0 rows with raw MP4/storage text | Other-host public links (not in the allow-list) stay `[קישור]` — a decision for ZURIEL |
| 5 | "בשבילי", activity meter, timeline, smart follow stay future | placeholder cards | removed from the sheet; not claimed active | test: model exposes no such fields | — |
| 6 | Verification | — | see below | see below | real login / real admin / hosted Preview not verified |

## Tests run

- `node --test test/now-publications-2029.test.mjs test/system-feed-public-sources-2029.test.mjs test/content-series-approved-source-2029.test.mjs test/companion-2029-one-feed-and-projector-rail.test.mjs src/lib/research/worldGroupSource.test.js` → pass.
- `node scripts/test-legacy-production-lock.mjs` → PASS; `node scripts/test-one-tree-content-contract.mjs` → pass.
- `SOD_BUILD_TARGET=2029 npx vite build` and the Public-Reading profile build (`VITE_PUBLIC_READING_RELEASE=public-reading-20261101`) → built.
- Browser (`test/now-publications-2029.browser.cjs`, compiled Public-Reading profile, synthetic responses only, no live call forwarded): 12 cases — 320/390/1440 × day/parchment/night, guest, reduced motion, keyboard, filters, loading-free error and empty states, video on demand, exact opening, refresh, back. Evidence in `evidence/`.
- Live read-only check with the anonymous public client: 101 rows, series `dimension-five`, `mah-kore-habora`, `messages-from-righteous`, `sod-hashmal` all present, 37 unverified source rows each with a world anchor, 0 raw MP4 texts.
- Pre-existing failures, identical (same failing assertions) at base `ae8deb7ae` and on this branch, not caused by this change: `scripts/test-2029-system-frame.mjs`, `test-2029-control-plane.mjs`, `test-connected-golden-2029.mjs`, `test-my-workspace-2029.mjs`, `test-public-2029-language.mjs`, `src/lib/publicContinuityReaders2029.test.js`, `razielOneShot2029.test.js`, `worldDiscoveryStream.test.js`, `test/companion-2029-public-source-shortcuts`, `date-display-rule-2029`, `doc37-mixed-page-readiness`, `doc37-runtime-admission`, `doc37-series-layout-stability`, `personal-area-balanced-rtl-2029`, `public-continuity-closure-2029`, `raziel-center-workspace-2029`. Older browser suites were not run (they need the integrated Preview build).

## Not verified / open

Hosted protected Preview URL and its deployment id (not created by this session); real signed-in user and real admin; e-mail ingestion and opt-out; full Or HaGeula coverage; post↔video identity proof; global "מסרים" rename; other-host public links in source text.
