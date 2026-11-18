# 2029 sharing — current contract, gaps, and this branch's fixes (ZURIEL 18.11.2026)

Status: BRANCH-ONLY (`ccr-dcadb071-v1z5ol-share`, base `origin/main` 270bfab6a). Not merged, not deployed.

## Owner chain (existing; nothing new)

| Layer | Owner | Implementation |
|---|---|---|
| Share UI primitive | `canonical_ui_components_law` v12 (Experience) | `src/components/ShareActions.jsx` + `src/lib/share.js` |
| What is shared / evidence | Share Intent (description only, not an owner) | `src/lib/share/shareObject.js` |
| Attribution (`rid`, `src`) | `traffic_intelligence_law` v11 | `src/lib/share/shareTelemetry.js` → `src/lib/propagation.js` |
| Post identity / canonical address | `project_codex.publishing_conventions` | `src/lib/publicPostUrls.js`, `api/og.js` |
| Server preview (title, description, image) | the same publication owners | `api/og.js` via `public-reading-deploy/api/public-document.js`; image `/api/card` |
| Frame placement | System Frame contract | `SystemFrame2029.jsx` (More panel, inspect panel) |

Consumers: More panel, inspect panel, post details, post units, Now feed, Or HaGeula video, gallery/media, community message, world finding,
calculators, ELS matrix. Journey is not an active product: no share mechanism is built or restored for it.

## Per content type

| Item | What is shared | Identity (canonical) | Kept in the link | Never in the link | Recipient / preview | On failure |
|---|---|---|---|---|---|---|
| Post (old WordPress or new) | the post | `publicPostUrl` (old posts keep the root address; no move on redesign) | `?unit=` + `#unit` for a unit, the reading hash | `returnTo`, `back`, credential keys; draft/private/preview posts show no share | guest and member see the public post; preview = og.js post title/image | og.js falls back to a branded card |
| Post unit | the unit inside the post | the post's canonical (no second identity) | `?unit=<id>#<id>` | as post | preview shows the unit only when registered, else the post | as post |
| Number | the number page | `/number/N` | — | — | `/api/card?n=N` (reads published phrases) | card 504 at 10 s, never cached |
| Expression | the expression page | `/number/<expression>` — **never replaced by its value** | — | — | card `w=<expression>` | as number |
| Gallery / media | the media item in its gallery | `/world?view=gallery&gallery=N&image=<uuid>#gallery-source-<uuid>` | gallery, image, anchor | — | server preview is the generic gallery (noindex, follow for item queries) | — |
| World finding | the finding | `/world?finding=<id>#finding-<id>` | finding id | — | finding card (query card, no DB read) | — |
| Community message | the message | `/community/chat?thread=&reply=&path=` | thread/reply/path | — | verified-chain title | — |
| Calculator result | the calculation | `/gematria?q=&m=&v=` | expression, method, value | — | **generic** calculator preview in production (see D3) | — |
| ELS matrix | the matrix state | `/code?mode=classic#els-matrix=<state>` | state in the fragment only (never reaches a server) | — | `/code` static preview | own messages, copy fallback |
| Any frame page | the page | `framePublicShareHref` → `publicPageShareUrl` | query + hash minus private keys | account paths, `claim`, `dm`, `returnTo`, `back` | page preview | "אין קישור ציבורי…" on private pages |

Distinctions kept: expression ≠ its number; old post address never moves for design; a unit anchor adds no identity; sharing never publishes
private content; a crawler preview gets public text only and runs no research tool (`/api/card` reads only the public phrase list).

## Fixed in this branch

1. **Inspect panel** shared the raw `window.location.href` (any `returnTo`, `claim`, `dm`, token-like query could travel) with a title naming a
   different item than the link. Now it shares the same sanitized link as the More panel (`framePublicShareHref`), with the page's own title, and
   shows nothing on a page with no public link.
2. **Share text** was the shell's static label ("פוסט", "SOD1820"). Now it is the page's own SEO title — only once that page applied it (its
   canonical points at this route), so a previous page's title never labels the link (`pageOwnShareTitle`, in the lazily loaded share library).
3. **System share failure** was silent. A sheet that fails to open now falls back to the existing copy action and says
   "השיתוף לא נפתח. הקישור הועתק." (or "…אפשר להעתיק את הקישור."). A cancelled sheet says and records nothing. No "shared successfully" message
   exists: the page cannot know.
4. **Image share dropped the link.** The image file now travels with its page link (`shareImageFile` already supported it).
5. **Gallery kept the previous page's title and canonical** after SPA navigation. At `/gallery` it now applies the same title, description and
   robots the server sends.

The frame file gained no import and no new logic beyond passing the existing sanitized link (the title helper lives in `src/lib/share.js`,
loaded with ShareActions on demand).

## Decisions for ZURIEL (not implemented)

- **D1 · `rid` in every shared link.** Every outbound link carries the visitor's persistent device id (`propagation.js`). It also makes every
  shared post link miss the post-document CDN cache (it caches only an empty query). Options: keep; replace with a per-share random id; strip
  `rid`/`src` at the edge after recording the arrival. Analytics change → your decision.
- **D2 · Third-party parameters** (`fbclid`, `gclid`, `utm_*`) are kept when a page is re-shared. Recommendation: drop them from shared links.
- **D3 · Calculator previews** are generic in production; the rich card exists but is gated off. A rich preview would show the typed name
  (often a person's name) in WhatsApp. Privacy decision.
- **D4 · Community calculator links** carry names and a Gregorian date by design (the page says so). Keep or move to a server-held share id.
- **D5 · Topic and Contributor share buttons never render** (they lack `force`; the floating widget they deferred to no longer exists).
  Recommendation: show them (visible change, needs a visual check).
- **D6 · `/code` and `/els` are treated as private** by the frame share, so the frame says "no public link" on the public cipher page.
  Recommendation: allow the bare page address, never the search query.
- **D7 · Duplicates:** the Lightbox shares the raw storage file URL (no page, no attribution); the ELS matrix has its own share code.
  Recommendation: route both through ShareActions after a compatibility check; no deletion before that.
- **D8 · Now feed** offers no share for root-address WordPress posts and accepts the `/posts/` form. Needs a data check of the item shape.
- **D9 · Image download counted as a share** (`platform="image"`). Analytics semantics → your decision.
- **D10 · Signed card addresses** (see API_CARD_ROOT_CAUSE.md D1).

## Tests

`test/share-contract-2029.test.mjs` (new, in `live-contracts-2029.yml`); `test/or-geula-video-share-2029.test.mjs` updated to the outcome-aware
native share (same rule: recorded only after it happened). Existing share suites: 40/40 locally.
Not tested here: real share sheets on devices, CORS of the image fetch, behaviour inside in-app browsers.
