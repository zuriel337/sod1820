# Flagship unit permalink — contract acceptance note · 2026-11-14

> **NOTE ONLY.** Nothing here edits a live rule, `project_codex`, the DB, a route or a deployed file. It answers “where does each of the 7 approved rules already live in code, where is the gap, and what is the smallest change inside the EXISTING owners”. Read: `publicPostUrls.js`, `postSourceUpdates2029.js`, `postPreviewUnits2029.js`, `PreviewUnitExtras2029.jsx`, `Post2029Page.jsx`, `api/og.js`, `api/card.js`, `ShareActions` use. No contradiction with `publishing_conventions` / `SOD1820_CONTENT_FOUNDATION_CONTRACT` was *found in the code*; those two documents themselves were **not re-read in this audit** (the task asked me to reference them; they are routed by the Owner Index — flagged for the owner session).

## The contract (as approved by ZURIEL, restated exactly)
1. **Home/owner = the published Post**: `posts.id` + the immutable existing slug/route `/post/<post-slug>`. A unit is never a separate Post/row and there is **no standalone `/unit` route** at this stage.
2. **Identity** `posts:<postId>#<unitId>`; `unitId` is a stable opaque anchor independent of title, prose edits and order. A slug change would need an audited redirect plan (**do not rename now**).
3. **Share URL (published unit):** `https://sod1820.co.il/post/<post-slug>?unit=<unitId>#<unitId>` — `?unit` reaches server OG/share lookup, `#` focuses the unit in the browser. Generated **centrally** by one helper.
4. **Share surface:** existing `ShareActions` + `/api/card` + `/api/og`; a click enters the original Post at the exact unit, with return to the parent Post and back to the unit. Now/Series/Topic/Number/author cards **project** the unit, never duplicate it.
5. **SEO:** canonical stays the parent Post; a unit share may vary OG by permitted `?unit` and public content; no independent indexable page, no new route, no preview/SSO/private reveal; a local/draft unit never advertises a live link or fake OG.
6. Series membership and Topic/Graph connections stay separate; a unit has ONE parent Post and immutable source references.
7. Implementation note in the existing post/unit contract owner; no live-rule edit.

## Rule-by-rule status in the code (branch `ccr-b8e8ab12-9hoamu` @ `069f857c`, main `4c9630db`)
| rule | status | where | gap |
|---|---|---|---|
| 1 | **MET** | `publicPostHref/publicPostUrl` (`publicPostUrls.js`); 5107 has source `ai` → `/post/sharshar-elections-redemption-hints-draft` (modern address). No `/unit` route exists. | The slug ends in **`-draft`** although the Post is public. It must not be renamed; a future rename needs the redirect audit (rule 2). |
| 2 | **MET (identity), PARTIAL (central helper)** | fragment identity `posts:5107#<targetId>` is already produced by `publicProvenPostSourceUpdates` (`fragmentRef`) and by the preview Share (`entityId posts:5107#<unit>`). | There are TWO link builders: `unitShareUrl(origin, postPath, unitId)` (inside the preview-only module `postPreviewUnits2029.js`) and `publicPostHref(row,{hash})` (used for the six proven units, **hash only**). |
| 3 | **PARTIAL** | the preview unit builds `…/post/<slug>?unit=<id>#<id>`; the six live units link as `…/post/<slug>#<id>` (no `?unit`). | the six live units cannot be told apart by a server/crawler (a fragment never reaches the server). `?unit=<id>` without a hash is only honoured for the PREVIEW unit (`Post2029Page.jsx` effect matches `[data-preview-unit]`), not for the proven units. |
| 4 | **PARTIAL** | `ShareActions` + `/api/card?v=unit` exist for the preview unit; breadcrumb “← כל הפוסט / חזרה ליחידה” exists for the preview unit only. | no share card / breadcrumb for the six live units; the card needs the unit’s numbers, which are not stored anywhere for them (title only available: `label`). |
| 5 | **MET for canonical, GAP for robots/draft** | `api/og.js`: canonical = `publicPostUrl(post)` (parent) for every `?unit`; unit OG only via `previewUnitOgMeta`, gated by `VERCEL_ENV=preview` + the exact branch + known preview unit, with `noindex`. `publicPageShareUrl` strips `_vercel_share` and tokens but **keeps `?unit`**. | (a) public `?unit=` URLs have no `noindex` of their own (canonical to the parent is the only guard). (b) `?proto=admin` is NOT stripped by `publicPageShareUrl` (harmless when the flag is off; avoid sharing from a Preview with `proto`). (c) The preview Share block shows a link without saying it is Preview/SSO-only — it must not be presented as a public share until the unit is published. |
| 6 | **MET** | Series membership = exact tag `מפת המציאות` (`contentSeriesKeysForPost`); 5107/5112 are a preview-only acceptance exception (not DB-tagged); connections live in `postUnitModel2029` references, not in the unit text. | — |
| 7 | this note | — | the two contract documents were not opened here (see header). |

## Owner collisions / contradictions to flag
- **Two URL builders for units** (`unitShareUrl` vs `publicPostHref+hash`): one of them must be the only one. The natural owner is `publicPostUrls.js` (it already owns post addresses and the share sanitizer).
- **`unitShareUrl` lives in a text-gated preview module.** It carries no text, so it bundles safely, but placing a *public* helper inside `postPreviewUnits2029.js` couples public code to a preview module.
- **`homeFeaturedPost2029.js` keeps hand-copied unit content** (see DEDUP_MATRIX D-2/D-3) — a second owner of unit text, which contradicts “reuse, never duplicate”.
- **`posts.modified` vs revision 266** (DEDUP_MATRIX R-1): the “certified version” gate used by the proven-update projection relies on `modified`, which did not move when revision 266 changed the body.

## UPDATE 2026-11-14 — what is now implemented on the branch (branch-only, not merged/deployed)
Items 1, 2, 3 (published units), 4 (preview honesty) and 5 below are implemented; no route, DB, permission or Production change. `publicPostUnitHref` (`publicPostUrls.js`) is the only builder (used by `unitShareUrl` and the proven-update `targetHref`); `?unit=` lands on every registered unit and ignores unknown ids; `api/og.js` serves unit meta only for registered published units (`noindex, follow`, canonical = parent); `publicPageShareUrl` strips `proto`. Tests: `publicPostUnitHref.test.js`, `postUnitAmendments2029.test.js`, updated href expectations. **Not verified here:** the bot-UA OG fetch against a live Preview (the Preview edge is SSO-protected; `api/og.js` passes `node --check` only), and the Preview unit never gets a public card.

## Smallest implementation inside the existing owners (proposal — now applied on the branch, see UPDATE above)
1. **One helper** in `publicPostUrls.js`: `publicPostUnitHref(post, unitId, { origin })` → `<post address>?unit=<id>#<id>` (the existing `publicPostHref` already accepts `search` and `hash`). `unitShareUrl` and `provenSourceUpdates.targetHref` call it; no other concatenation anywhere.
2. **`?unit=` honoured for every registered unit** of the Post (proven ids and preview ids), landing + focus + breadcrumb, **unknown ids ignored silently** (page opens at the top; no error, no 404).
3. **OG** (`api/og.js`): for `?unit=<id>` where `<id>` is a *published* unit of that Post → unit title (+ numbers when the registry has them) via the existing `/api/card?v=unit`; otherwise the Post’s own meta. Canonical stays the parent; add `noindex, follow` to unit variants. The preview-unit path keeps its branch/`VERCEL_ENV` gate until the unit is published.
4. **Draft/preview honesty**: the Share block shows the link only as “קישור פריוויו מוגן — לא ציבורי” while the unit is not in the public `posts.content`; no OG claims for it.
5. **Sanitizer**: strip `proto` in `publicPageShareUrl` (public build only).
6. **Acceptance tests (when approved):** bot-UA fetch of `?unit=<id>` returns the unit OG; a normal browser lands exactly on the unit and the back/return controls work; the Preview/SSO host never appears in a public share; unknown `?unit` degrades silently; canonical equals the parent in every case.

Stop condition: none of the above is applied; each needs ZURIEL’s separate approval, and #3/#4 touch the OG/share path.
