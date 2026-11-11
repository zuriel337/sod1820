# Number / expression page: Typography V2, canonical addresses and `focus=dna` (acceptance handoff)

The one handoff document of this work. Branch only: **not merged, not deployed, no DB change, no change to the indexing policy.** Merge, Production deployment, the Production SEO-policy change and any DB change each need ZURIEL's separate approval for an exact SHA.

| | |
|---|---|
| Branch | `claude/number-typography-v2-20261111` (PR #1311) |
| Base | `origin/main` `367bd62ee` (merged in once, no conflicts; the branch is 0 commits behind) |
| Head | see the PR; the exact SHA under review is given with the Preview link in the hand-over message |
| Protected Preview | built from the head SHA with `scripts/build-public-reading-production.mjs --protected-review` on the Preview target. Noindex, Production and cutover denied. The share link is given in chat only. |
| Production when written | still the old behaviour (read with a Googlebot user agent): `/number/0358` answers 200 and `/2029/number/358` answers 200 |

**Historical material.** Everything measured or photographed before the last visual commits (`487a74cd8` chips wrap, `128eb1f22` life-seal label pill) is a historical snapshot and not the state under review: the first measurement table below, the first local before/after screenshots, and the artifact "טיפוגרפיה V2 בדף המספר" (head `22d2c54`, no Preview). The current screenshots are the ones delivered with the Preview of the head.

## What changed

| Area | Change | SEO policy touched? |
|---|---|---|
| Typography V2 | CSS only plus `data-expression-size` and one semantic `<h1>` (the expression or the number) in `NumberCore2029.jsx`. Every `font-size` literal below 14px on the number, expression and drawer surfaces (and the timeline, verse cards and method lens they embed) is an alias of the canonical `--s29-type-*` tokens: 14px micro floor (15px supporting labels, 16px tiny controls from 1024px), 16px small/ui. The expression heading follows its length (46px desktop / 28px phone, down to 21px for a verse) and wraps. Regular-expression chips get a second line; the activity chips wrap; the "life" seal is 74px with the label on its own pill so it reads over the coverage ring in day, parchment and night. The focal number is unchanged (only its fit-to-container floor rose from 16px to 28px). The compact drawer keeps the 14px floor. | No |
| Canonical address | One resolver (`src/lib/research/numberPageAddress.js`, with the rule itself in `publicReadingRelease2029.js`). See the table below. About 40 files link through the shared base; the shared frame recognises `/number/`. | No (redirects only) |
| `focus=dna` | The legacy calculator pointer `?focus=dna` (and its method) means "convergence axes": the page opens as the plain `/number/N` and scrolls to the existing convergence ("עולמות") section. It is never shown as an expression. `cross` still works. | No |
| Robots | After render the browser tag is `noindex, follow` for a public page that is not admitted (it was `noindex, nofollow`, against the server tag); private and closed pages keep `nofollow`. A number beyond 32 bits answers 200 `noindex, follow` (it answered 503). | **Only this follow fix.** The admission rule is not changed. |
| Preview | `review-admission.js` accepts an exact allowlist of additional review branches (Preview target only; the receipt is bound to branch, SHA, deployment and host; the sign-in host stays with the original branch). No impersonation, no bypass. | No |
| Prime Lens | Deterministic prime families (definition only) as chips under the lens, with OEIS pointers. | No |

### Addresses

| Address | Result |
|---|---|
| `/2029/number/<a>` | one permanent redirect (308 on the server, `replace` in the client) to `/number/<canonical>`; query and fragment kept |
| `/number/0358`, `/number/00358` | one hop to `/number/358` (the real zero of a value such as `10` stays) |
| `/number/<expression>` | kept exactly; never replaced by the number it computes to. Pointed text, spaces, Hebrew and long text are supported |
| `/number/196500000000` | 200, `noindex, follow` |
| `/number/358?from=calc&focus=dna&method=…` | the plain number page, convergence section in view |
| the canonical target | final: no chain |

## Tests and CI

Run at the head (the CI result is per SHA; see the PR checks):

| What | Where | Runs in CI |
|---|---|---|
| Typography floor, type roles, H1, chips, life seal | `test/number-typography-v2-2029.test.mjs` | yes (`live-contracts-2029.yml`, "Number page, Typography V2 and public addresses") |
| Canonical address, 308, leading zero, both-spelling consumers | `test/number-address-canonical-2029.test.mjs` | yes |
| Robots follow, one admission decision | `test/seo-robots-follow-2029.test.mjs`, `test/public-canonical-parity-repair.test.mjs` | yes |
| `focus=dna` | `test/gematria-focus-foundation-2029.test.mjs` | yes |
| **Number links under the public-release flag** (producer and consumer in both spellings; forged addresses rejected) | `scripts/test-2029-number-links-public-flag.mjs` (Vite SSR in Node, no browser, no network) | yes, same step |
| Old and new addresses, expression kept, exact return, in a real browser | `test/number-links-both-spellings-2029.browser.cjs` | **no** (run by hand, below) |
| Connection row to Number/method and back; mobile order; Post to Number to exact return; Number to World | `test/number-connections-route-2029.browser.cjs`, `test/number-mobile-order-2029.browser.cjs`, `test/public-reading-routes-2029.browser.cjs`, `test/public-frame-context-2029.browser.cjs` | no (run by hand) |
| World release suite (the Number cases read the expression from the H1) | `tests/world2029-release.spec.cjs` | yes (2029 Isolation Gate) |

Browser tests are read-only (deny-by-default transport, no account, no write, any model endpoint fails the test). By hand, against a public-release build served at `SOD_ACCEPTANCE_ORIGIN` (default `http://127.0.0.1:4251`): `npx playwright test <file> --config <config that matches *.browser.cjs>`.

Not run: the browser tests that need `preview-deploy/dist` (`number-fullpage-*`, `number-loading-mobile`, `number-progressive-material`, `number-root-profile-race`) and the Python Zvi fixture. `galleryMediaEnvelope.test.js` ("Projector media") fails on `main` too (`ProjectorMediaCards2029.jsx` is identical to `main`).

### Found by CI and fixed on this branch

Moving the producers to `/number/<n>` made five consumers that validated only `/2029/number/<n>` drop the link in the public release (Raziel navigation and one-shot actions, the Raziel suggested-action normaliser, Post reading connections, the Life Journey finding receipt). Plain node tests do not set the public-release flag, so they could not see it; `scripts/test-2029-number-links-public-flag.mjs` now does, and fails if the old validators are restored. A second CI failure (World release spec reading the expression from a `strong`) was fixed by reading it from the H1.

## Changed connections: evidence

All in the public-release mode unless noted. "Both spellings" is `/number/<n>` and `/2029/number/<n>`.

| Connection | Evidence | Result |
|---|---|---|
| Open a number from **Raziel** (navigation action, suggested `open_number`, one-shot click guard) | `scripts/test-2029-number-links-public-flag.mjs` (real modules, flag on and off) | both spellings render and are accepted; the normaliser emits the build's base; forged addresses (`/number/073`, `/number/0`, `/number/1000000`, a query, a foreign host, `/numbers/…`) are dropped. No model call (deterministic navigation) |
| A **saved Raziel conversation** that stored a number link | same script | both spellings restore exactly as stored; forged or mismatched ones are rejected |
| Open a number from a **Post** (declared connections; the number signal and drawer) | same script (connections keep both spellings; a query or foreign address is withheld; a number page is never read as a Post). Browser: `public-reading-routes-2029` "actual Post Number full page and exact source-region return" at 390 and 1440 | pass |
| From **saved research** (Life Journey finding, saved path, exact return) | same script: a finding opens `/number/73`, saves as a path, restores with the address exactly as saved, returns to the Person; both spellings are valid receipts and behave identically for every address | pass. Opening a saved path through a signed-in account in a browser was **not** run (it needs a real account); the module-level check and the redirect test cover it |
| Old and new links | `number-links-both-spellings-2029.browser.cjs` (client path) and the Preview (server 308); `test/number-address-canonical-2029.test.mjs` | `/2029/number/1820?…#…` and `/number/01820?x=1` end at `/number/1820` in one `replace` with query and fragment kept; `/number/10` stays; `/number/משיח` and `/2029/number/משיח` end at `/number/משיח` |
| **Expression kept and the return context** | `number-links-both-spellings-2029.browser.cjs` (from either spelling, 390 and 1440): choose the chip "משיח" on 358 → `?focus=משיח`, H1 "משיח", the stored context holds it, a reload keeps it, "↩" restores `/number/358` without the focus. Also `number-connections-route-2029` (connection row → canonical Number/method → back to the same row) | pass |

## Screens that share the changed CSS

| CSS file | Used by | Screens affected |
|---|---|---|
| `numberCore2029.css`, `number2029.css`, `numberLivingWorld2029.css`, `numberDeepView2029.css` | Number page only (`Number2029Page`, `NumberCore2029`, `NumberLivingWorld2029`, `NumberDeepView2029`) | `/number/*` |
| `numberCore2029.css`, `numberDrawer2029.css` | `NumberDrawer2029` in the shared frame | the **Number drawer** on every screen that opens it (Post, Topic, World, Home, the Number page itself) |
| `timeline2029.css` | `Timeline2029` in the Number living world and in `PostTimeline2029` | the Number page, **Post pages**, the **World flight story** |
| `canonical-verse-cards-2029.css` | `CanonicalVerseCards2029` in the Number living world and in `PersonJourney` | the Number page and the **Life Journey** (closed to visitors: lock flag) |
| `methodLens2029.css` | `MethodLens2029` in `NumberCore2029` and in the calculator pages | the Number page and **Calculator** (`/gematria`, Pro) |

**What was checked on these screens:** in progress at the time of this commit (before/after measurement of text sizes and overflow on the Post timeline, the World timeline, the calculator method lens and the drawer opened from a Post). The result is added to this section when it is complete.

## Measured on the Number page

Historical (first local build of this branch against a local build of the base `71709e4ba`; Chromium, live Supabase data; 1440 / 390 / 320px, dark, light, parchment; `358`, `משיח`, a 36-letter and a 200-letter expression, 28 cases). Taken before the H1, the chip wrap and the life-seal pill.

| | Before | After (at that time) |
|---|---|---|
| Visible text below 14px (share of characters) | 63-76% | 0.2% (shared surface-map label "אתה כאן" and decorative glyphs) |
| Text at 16px or more, phone | 15-23% | 49-58% |
| Text at 16px or more, 1440px | 16-30% | 70-73% |
| Focal number | 104px (1440), 65.6px (390), 40.2px (320) | unchanged |
| Expression heading | 18px (1440), 22px (phone) | 46 / 28 / 21 by length (1440 short/mid/long), 28 / 21 / 21 (phone) |
| Horizontal page overflow | none | none |

Current re-measurement at the head: in progress at the time of this commit; added here when complete.

## Acceptance checklist on the Preview (desktop and phone, three themes)

Switch the theme with the header button "מראה: …" (יום / קלף / לילה). Do each item at a desktop width and at about 390px, in all three themes. Throughout: no horizontal scroll, no clipped text, the number is not smaller than before.

1. **Regular number** `/number/358`: one H1 ("רמז פלא"); the number is large; the "חיים · N שכבות" seal and its label are readable; the activity chips wrap; the six methods show and "עוד 26 שיטות" opens.
2. **Short expression** `/number/משיח`: H1 "משיח"; the address keeps the expression (it is not replaced by 358).
3. **Long expression** (the verse of 158 letters, `/number/<verse>`): it wraps in full, the heading steps down in size, nothing is cut, the number stays next to the seal.
4. **Drawer**: on `/number/358` open the bottom-bar button "גימטריה" and see the compact number; on the Post `/post/flydubai-fz1073-363-14000-remzei-geula` tap a number signal, then "פתח דף מלא ↗" opens the full page and the exact-return button goes back to the Post region.
5. **Deeper and back**: on `/number/358` tap the chip "משיח" in the regular-expression row: the address gets `?focus=משיח` and the heading changes; reload keeps it; "↩" returns to `/number/358`.
6. **Old addresses**: `/2029/number/358?focus=משיח` and `/number/0358` each end at one canonical `/number/…` address.
7. **`focus=dna`**: `/number/358?from=calc&focus=dna&method=גדול` opens the plain number page with the convergence section in view and no expression "dna".

## Not done and open

- Browser tests needing `preview-deploy/dist`, the Python Zvi fixture, and an in-browser open of a saved research path through a real signed-in account were not run.
- A request path containing `;` is rejected at the edge (403, matrix-parameter) for headless Chromium; not checked with a real browser or Googlebot.
- The 60 pointed/unpointed expression twins are not merged: both sides are verified, have the same value and both have Search Console impressions (593 / 288). A per-pair decision is needed.
- Items 18 and 24 of the 27-item plan have no implementable contract.
- `surfaceMapBar2029.css` (shared frame chrome) still has 8px and 11px labels; it is outside this scope.
- Another open pull request (#1307) also edits `.github/workflows/live-contracts-2029.yml`. It is not imported here and no other agent was activated. The merge order is for ZURIEL and the main session; the branch that merges second should be checked again against the updated `main`, keeping both additions (this branch adds one step, "Number page, Typography V2 and public addresses", and one line to it).

## Separate proposals (not part of the acceptance package)

- `INDEXING-EXPANSION-PROPOSAL.md`: comparison for numbers with five or more verified phrases. No DB or policy change; the rule is not activated.
- `LEFT-RAIL-AND-TREE-MAPPING.md`: mapping of the "ההקשר הפעיל" rail and the tree material on the Number page. Not built.
