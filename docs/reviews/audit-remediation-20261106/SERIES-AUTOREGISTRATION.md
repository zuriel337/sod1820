# The series plan and "everything new enters the system automatically" — what exists, what does not

Source: read-only investigation (`docs/audit-evidence/20261106/series-autoreg.md`, with file:line evidence). Nothing in this section was implemented — it needs one product decision (§4).

## 1. Where the series plan is
* **Not in this branch and not on `main`.** Today's audit/remediation documents contain no series plan.
* The only series plan dated 6.11.2026 is on the sibling branches `origin/ccr-9fba3323-g3hd6t` and `origin/ccr-c096916c-nxv7te`: `SOD1820_CONTENT_FOUNDATION_CONTRACT.md` §12 / §12.9 "תוכנית הסדרות ודף הבית" — **branch-only, not merged, not deployed** (per CLAUDE.md I did not import it). It adds `reality-map` (מפת המציאות) as the primary series, renames the shared series to "מסרים", a Home area for posts that belong to no series (6 items / 90 days, awaiting your approval), and an audit stating series **Follow is not active** on the server. **It contains nothing about SEO, sitemap, OG, JSON-LD or sharing**; if the plan you made today with the series was a chat-only plan that adds those, it is not in any branch.
* On `main`: a series is a code descriptor (`CONTENT_SERIES_2029`, 4 entries) with exact tag/category membership; there is **no series table and no public series route** — a "series page" is the filter `/2029/posts?series=<key>`, which is `noindex`, has the generic `/post` canonical, and is not in the sitemap. Contract rule §12.4 forbids auto-assigning posts to a series (human gate), so only the *registration into SEO/share/analytics* can be automatic, not membership.

## 2. What enters each Google/share system automatically today
| Content type | Sitemap | Metadata / OG | JSON-LD | Share card | Analytics |
|---|---|---|---|---|---|
| Posts, tag, category, topic, number, video, codes, books, researchers | **yes, from DB rows** | needs a branch in `api/og.js` (exists for these) | only Article, converged-topic WebPage, VideoObject | `/api/card` generic (works for any title) | `readingTelemetryPath` allow-list |
| Static pages (`/map`, `/privacy` …) | hand-kept `STATIC` list | hand-kept | none | generic | allow-list |
| **A new route family** | no | **404 until `publicReadingPath` is edited** | no | generic | **silently dropped** if unknown multi-segment |
| **A new series** (descriptor in code) | no | no | no | no | `?series=` is stripped |

## 3. Gaps that would stop "everything new is automatic"
1. No indexable series route / sitemap entry / canonical / OG / JSON-LD exists anywhere.
2. About five hand-kept lists with no link between them: `STATIC` (`api/sitemap.js`), `publicReadingPath` (`src/lib/publicReadingRelease2029.js`), `readingTelemetryPath` (`src/lib/publicReadingTelemetry2029.js`), the `api/og.js` branch table, the `/map` page.
3. `readingTelemetryPath` drops unknown multi-segment paths without a signal (pageviews and web-vitals lost).
4. A new route returns 404 from the edge until `publicReadingPath` is edited (a safe default, but easy to forget).
5. CI gate `route-seo-decision-2029` only checks that every `<Route>` has *some* search/indexing decision — not sitemap, JSON-LD, share or telemetry — and it runs on PRs to `main` only (whether it is a required check is UNKNOWN).

## 4. Proposed contract (extend, don't add a registry — CLAUDE.md §7 EXTEND_EXISTING)
* Extend `src/lib/systemSelfModel2029.js`, which already has `seo.sitemapEligibility`, `canonicalOwner`, `shareOwner` but no production registrations, with **one entry per route family / content type / series key**: path pattern, SEO decision (index / noindex / closed), sitemap source, metadata builder, JSON-LD type, share card kind, telemetry label, `/map` visibility.
* Step 1 (safe, no behaviour change): a CI test that fails when a `<Route>`, a sitemap source, a DB content type or a `CONTENT_SERIES_2029` key has **no** registration, and that checks each hand-kept list against the registry.
* Step 2: generate the hand-kept lists from the registry (as `scripts/sync-route-legitimacy.mjs` already does for the edge allow-list).
* Step 3: make the CI check required on every PR.
**Decision needed from you before any of this is built:** should a series get its own **indexable page** (`/series/:key`, canonical, in the sitemap, OG image, `CollectionPage` JSON-LD), or stay a `noindex` filter of `/post`? Everything else follows from that answer.

## 5. Archive and legacy routes (your decisions 6)
* **No "new archive" exists in this branch or on `main`.** `src/App2029.jsx` has no `/archive` route and no component or flag renders one; the old `ArchivePage` was deleted in `623b8d38a`. `/archive` is closed on purpose by `PUBLIC_TEMPORARILY_CLOSED_PATHS` (503 + "הזרם ההיסטורי בתהליך התאמה"). **Please point me to the branch or page that contains the new archive** — I did not invent one, and I did not touch the gate.
* Links to `/archive` lead to that closed page — **none leads to an old system** (the old code is gone): the home "ארכיון" tile (`HomeComposition2029.jsx:326`), the `/gallery-updates` 308, the HomePreview tiles, `notifications.js:121`, `systemEvents.js:89`. The footer shows it as plain text and the live sitemap omits it. Reopening it needs: a real route + page, removing the constant entry and the capability text, and updating the tests that pin it closed (list in the evidence file).
* `/sulamot*`: marked legacy/obsolete (comment in `route-legitimacy.js`, guard test `test/legacy-routes-served-as-notice-2029.test.mjs`); they remain a harmless noindex notice; no fix, no revival. Other old-generation names (`/galaxy`, `/lab`, `/stream`) are listed in the evidence file; `/spatial-gematria` is a 2029-era feature — your call whether it counts as old.
* `/heichal`: gate unchanged; the test asserts it stays closed. **Finding:** the static file `public/heichal.html` is live at `200`, indexable and **not gated** — it contradicts "closed until decided". Not changed; tell me whether to gate/noindex it.
* Stale doc: CLAUDE.md §1 still says the Legacy removal "is not merged"; `623b8d38a` is on `main`. Not edited (needs your wording).
