# OR-GEULA — SEO + Share Audit (targeted)

> **actor=CLAUDE · status=read-only SEO-share audit · date=2026-08-14**
>
> READ-ONLY. No WRITE, no DB, no deploy, no Story-UI change. Scope = 4 specific areas Zuriel named (share preview · share-tracking bug · share UX · SEO copy drift) + share-image fallback + the real share chain. Not a general audit.
> Every claim cited `file:line`. Findings tagged **FACT · INFERENCE · GAP · RECOMMENDATION**.

---

## 1. STORY SHARE PREVIEW — what a crawler gets for `/or-geula?v=<id>`

**FACT — crawler routing works.** `vercel.json:157-166`: a catch-all rewrite gated on `user-agent` (`facebookexternalhit|Facebot|Twitterbot|WhatsApp|TelegramBot|LinkedInBot|Slackbot|Discordbot|Pinterest|redditbot|Applebot|SkypeUriPreview|vkShare|Embedly|Iframely|W3C_Validator`) → `/api/og?path=/$1`; humans fall to `/index.html` (`vercel.json:167-170`). The `?v=<id>` is preserved (Vercel merges original query; `api/og.js:141-146` reads `req.query.v`, with a fallback parse from `path`).

**FACT — dedicated per-story branch.** `api/og.js:208-228`, condition `key === '/or-geula' && vParam`, fetches `channel_updates?id=eq.<v>&select=text,image_url,thumb_url&limit=1` (`og.js:212`). Template emits at `og.js:435-463`.

**FACT — the 8 fields for a matched story:**

| Field | Value | Source |
|---|---|---|
| og:title | `<text sliced 70> · SOD1820`, else `אור הגאולה — סרטון · SOD1820` | `og.js:219-221` |
| og:description | `cleanDesc(text or STATIC['/or-geula'].desc, 180)` | `og.js:222` |
| og:image | `waSafeImage(thumb_url ?? non-video image_url ?? default)` | `og.js:216-218` |
| og:url | canonical `https://sod1820.co.il/or-geula` — **`?v` is STRIPPED** | `og.js:127,136,447` |
| og:type | `video.other` | `og.js:223,444` |
| twitter:card | `summary_large_image` | `og.js:453` |
| twitter:title / description / image | mirror the og:* values | `og.js:454-456` |

Also: `og:site_name`, `og:locale=he_IL`, canonical `<link>`, and a `<meta http-equiv=refresh>` to the canonical (`og.js:441-458`). No JSON-LD for the story branch (only for `article`/`forumThread`).

**FACT — og:image fallback chain (`og.js:216-218`):** `isVid = /\.(mp4|mov|webm|m4v|avi|mkv)/i.test(image_url)`; `img = thumb_url || (!isVid ? image_url : null)`; if `img` → `waSafeImage(img)` (Supabase `.webp` → rendered JPEG 1200w q82, `og.js:98-103`).

Per Zuriel's scenarios:
- **(A) thumb_url present** → `og:image = waSafeImage(thumb_url)`. ✅ best case.
- **(B) image_url only (image)** → `og:image = waSafeImage(image_url)`. ✅
- **(C) VIDEO, no thumb_url** → `img = null` → `og:image` keeps the value set earlier in the function, which is the **homepage card** (`og.js:132`), **not** the or-geula card and **not** a broken video URL. **GAP** — off-brand (generic homepage card for an or-geula video). Not broken, but not "אור הגאולה".
- **(D) meaningful text** → drives title (70) + description (180). ✅
- **(E) default text `📷 עדכון`/`🎬 עדכון וידאו`** → blanked (`og.js:220`); title → `אור הגאולה — סרטון · SOD1820`, description → `STATIC['/or-geula'].desc`. ✅ acceptable branded generic.
- **No DB row / fetch fail** → branded or-geula card + STATIC title/desc (`og.js:224-228`). ✅

**INFERENCE.** For A/B/D the preview reads like "אור הגאולה — real content worth opening." The weak case is **(C) video-without-thumb** (homepage card) — how often it triggers depends on whether `channel_updates` reliably has `thumb_url` on video rows. **UNKNOWN** from static code (data-dependent).

**GAP (minor, by-design).** `og:url` canonicalizes every story to `/or-geula` (strips `?v`). Good for SEO dedup; means the shared preview is per-story but the canonical is the section page. Not a bug.

---

## 2. SHARE-TRACKING BUG — `share_story` counts cancels in StoryViewer

**FACT — three `share_story` emit sites:**
- `src/pages/OrGeulaPage.jsx:52` — `const r = await shareVideoToStory(...); if (r) { storyEvent(...,"share_story",...) }` → **guarded (correct).**
- `src/components/OrGeulaStoryColumn.jsx:350` — `if (res) { track(...,"share_story") }` → guarded, but this is the **DEAD default export** (not mounted anywhere).
- `src/components/StoryViewer.jsx:161` — `await shareVideoToStory({url, text}); storyEvent(brandTrackKey, cur.id, "share_story", {surface, entry, index, channel:"link"})` → **UNGUARDED.**

**FACT — `shareVideoToStory` return contract** (`src/lib/share.js:78-86`): returns `"link"` on successful `navigator.share`, `"copy"` on copy fallback, **`null` on cancel/failure/unsupported** (the `catch` returns null; a user dismissing the native share sheet throws → null).

**BROKEN.** `StoryViewer.jsx:161` fires `share_story` **regardless of the result** → a user who opens the native share sheet and **cancels** still records a `share_story`. `OrGeulaPage` does not have this problem. → `share_story` from the StoryViewer surface (HOME/CHAT/VIDEO_CATEGORY/POST_PAGE stories) is **inflated by cancels/failures**.

**FACT — ShareActions channels do NOT emit `share_story`.** `ShareActions.jsx:31` `logShare` → `track("share", type, channel, …)` = the generic **`share`** event (section=`share`), fired on click for native/wa/tg/fb/x/email/copy/image (`:33,37,46,83,92`). So:
- WhatsApp / Telegram / Facebook / X / Email / image shares of a story → counted as generic `share` (type=`video`), **never as `share_story`.**
- Only the standalone 🔗 button (native/copy of the link) emits `share_story`.
- External channels (wa/tg/fb/x) fire `share` on **click intent** — completion is undetectable by design (they open a new tab). That is standard and acceptable for the generic `share` metric.

**RECOMMENDATION (report only — no write):**
1. **Fix the bug:** in `StoryViewer.jsx:161`, guard `share_story` on the result exactly like OrGeulaPage — `const r = await shareVideoToStory(...); if (r) storyEvent(...,"share_story",...)`. One-line change, mirrors the existing correct pattern, no new tracking.
2. **Measurement completeness (optional, separate decision):** `share_story` currently captures only the 🔗 link-share, not per-channel story shares. If per-channel story shares should count, add a `share_story` emission on the channel path (intent-based for external channels) — but that changes what `share_story` means, so decide deliberately. **Do not build now.**

---

## 3. SHARE UX — two mechanisms in StoryViewer

**CURRENT (what the user sees)** in the StoryViewer share area (`StoryViewer.jsx:161-165`):
- (a) a prominent 🔗 button **"שתפו קישור לצפייה"**.
- (b) below it, `<ShareActions type="video" compact force url={shareUrl} … />` — a row of icons: native "🔗 שתף" (if `navigator.share`), 🖼️ share-image (if image + native), WhatsApp, Telegram, Facebook, X, Email, 📋 copy.

**PURPOSE**
- The 🔗 **"שתפו קישור לצפייה"** button → `shareVideoToStory` (native share sheet, else copy) of the story link, **tracked as `share_story`** (the story taxonomy metric). Its job is story-specific measurement + the "share the link, not the video file" rule (`share.js:75-86`).
- **ShareActions** → the canonical per-channel share row (`canonical_ui_components_law`): explicit WhatsApp/Telegram/FB/X/Email/copy/share-image choices + a native button, **tracked as generic `share`**, with `taggedShareUrl` (rid+src) for attribution.

**DUPLICATION — partial, real in one spot.**
- The per-channel icons (wa/tg/fb/x/email/image) are **not** duplicated — only ShareActions offers them.
- BUT ShareActions **also renders its own native "🔗 שתף" button** when `navigator.share` exists (`ShareActions.jsx:72-74`). That duplicates the standalone 🔗 "שתפו קישור לצפייה" button → on mobile the user sees **two native-share buttons** for the same link. That is a genuine, visible duplication.

**RECOMMENDATION (report only — no write):** keep both mechanisms (they serve different tracking + the channel row is valuable), but remove the redundant native entry so there's exactly one native-share affordance. Cleanest: in StoryViewer pass `channels` to ShareActions **without `"native"`** (e.g. `channels={["whatsapp","telegram","facebook","x","email","copy"]}`), leaving the tracked 🔗 "שתפו קישור לצפייה" as the single native/copy entry. No component rewrite, no lost channels. (Alternative, bigger: drop the standalone button and route `share_story` through a ShareActions callback — more work, defer.)

---

## 4. SEO COPY DRIFT — "N שנות מחקר"

**FACT — canonical value is `14`** (SPA + static HTML + footer):
- `index.html:18` (meta description), `index.html:29` (og:description), `index.html:38` (twitter:description) — "**14 שנות מחקר**".
- `src/lib/seo.js:8` `DEFAULT_DESC` — "**14 שנות מחקר**" (SPA runtime default via `applySeo`).
- `src/routes.jsx:40` (home route desc), `src/pages/StartHerePage.jsx:16`, `src/components/layout/Footer.jsx:210` — all "**14 שנות מחקר**".

**FACT — `api/og.js` is stale at `13`** (what crawlers get as the default/fallback):
- `api/og.js:11` `DEFAULT_DESC` — "**13 שנות מחקר**".
- `api/og.js:32` `STATIC['/'].desc` (homepage card/preview) — "**13 שנות מחקר**".

**FACT — older marketing copy says "ten / 10+"** (separate, likely also stale):
- `public/preview.html:231` "**עשר שנות מחקר**"; `src/pages/HomePage.jsx:373` "**עשר שנות מחקר**"; `src/legacy/legacy.jsx:113,923` "למעלה מ-**10 שנות מחקר**"; `legacy.jsx:977` stat tile `["10+","שנות מחקר"]`.

**DRIFT.** Live pages + `index.html` say **14**; the crawler OG function (`api/og.js`) says **13** in two places → a social share that falls back to the OG default (**including an or-geula story with default text**, §1E) advertises "13 שנות מחקר" while the page itself says "14". Legacy home copy still says "10/עשר". **Per instruction: not deciding which number is correct — reporting the drift only.** Canonical *intended* source appears to be `seo.js`/`index.html` (14); `api/og.js` is the outlier to reconcile once Zuriel picks the number.

---

## 5. SHARE IMAGE QUALITY — can `/api/card` be a story fallback?

**FACT (`api/card.js`, edge `@vercel/og`):**
- **1200×630** by default (`card.js:118-119`); `format=story` → 1080×1920 portrait.
- **Hebrew:** satori is LTR-only → Hebrew renders reversed; compensated by a **manual `rev()` string-reversal** (`card.js:22-48`) applied to hero/sub/brand/teaser/signature (numbers left un-reversed). **Documented caveat** at `card.js:22-24` ("satori מרנדר שמאל-לימין בלבד — עברית נראית הפוכה…"). No `get_display`/`raqm`/HarfBuzz (it's JS). Brittle for punctuation-heavy / mixed-bidi strings.
- **Params:** `n` (number), `w`/`t` (hero/title), `sub` (subtitle), `cap` (teaser), `sig` (signature), `format`. Branding (crown + "סוד 1820" + domain) always drawn (`card.js:159,192-216,265`).
- **Wired for or-geula stories? NO.** The `?v` story branch (`og.js:208-228`) never routes to `/api/card`; it uses thumb/image, and video-no-thumb falls to the homepage card (§1C). `/api/card` IS used for homepage, `/number/*`, `/topic/*`, `/codes/*`, researcher/forum, etc.

**RECOMMENDATION (future improvement — no write):** `/api/card` is a viable **branded 1200×630 fallback for stories without a usable thumbnail** (replacing the off-brand homepage card in §1C), e.g. `cardUrl({ w: <story title>, sub: 'אור הגאולה' })`. Caveat: the `rev()` Hebrew hack must be **visually verified** on real story titles before adopting (the project already flags Hebrew-image reversal as a recurring failure — `legacy_content_protocol §2`). Recommendation only; do not wire without a visual check + approval.

---

## 6. REAL SHARE CHAIN

**FACT — the chain works end-to-end:**
`Story → 🔗 share → shareVideoToStory → shares SITE_URL/or-geula?v=<id> → crawler hits /api/og (per-story preview, §1) → user click → OrGeulaPage deep-link (?v handler, OrGeulaPage.jsx:67-72) auto-opens that item → beginStory (:28-32) fires storyOpen + story_view(advance:"open"), surface="OR_GEULA_PAGE", entry="deeplink".` So the landing records **story_open + story_view** correctly.

**GAP — attribution (share → landing) not wired for story shares.** The 🔗 button shares the **untagged** `shareUrl` (no `rid`/`src`) — `StoryViewer.jsx:105`, `OrGeulaPage.jsx:49`. So a click from a story share cannot be attributed to the share. By contrast, **ShareActions channels tag the URL** via `taggedShareUrl` (adds `rid`=visitorId + `src`=channel, `propagation.js`), and the arrival capture (`captureArrivalSource`/`captureAcquisition` in `tracking.js`) already reads `src`/`rid`. → The **infrastructure to measure share→landing exists**; only the story 🔗 button doesn't emit a tagged URL. Future (no build now): have the story link-share append `?src=story&rid=…` so story-driven landings become attributable — reuses `taggedShareUrl`, no new attribution system.

**GAP — preview↔open mismatch (edge case).** OrGeulaPage loads only the latest **200** rows with non-null `image_url` (`OrGeulaPage.jsx:61-62`). A `?v=<id>` whose row is older than that window (or has null image_url) won't auto-open client-side, even though the crawler preview (queries by `id` directly, `og.js:212`) still generated. Rare, but a real inconsistency between the preview a sharer sees and what opens on click.

---

## SUMMARY

### 1. Works — do not touch
- **Crawler UA→/api/og routing + per-story OG branch** (`vercel.json` + `og.js:208-228`) — all 8 OG/twitter fields populated; thumb→image fallback correct for A/B/D/E; branded no-row fallback. Solid.
- **Deep-link `?v=<id>`** auto-opens the specific story and fires `storyOpen`+`story_view` (`OrGeulaPage.jsx:67-72`). Chain intact.
- **Canonical share engine** (`lib/share.js` `CHANNELS`/`shareOrCopy`/`shareVideoToStory`) + **ShareActions** per-channel row with `taggedShareUrl` attribution. One source of truth.
- **OrGeulaPage `share_story` guarding** (`:52`) — the correct pattern.

### 2. Actually broken
- **`share_story` inflation in StoryViewer** (`StoryViewer.jsx:161`): fires even when the native share is **cancelled/failed** (`shareVideoToStory` returns null on cancel). OrGeulaPage guards; StoryViewer does not. → story-surface `share_story` overcounts.

### 3. Needs a fix (small, isolated)
- Guard `StoryViewer` `share_story` on the result (mirror `OrGeulaPage.jsx:52`).
- Remove the **duplicate native-share button** in the StoryViewer share area (ShareActions renders its own native "🔗" alongside the standalone 🔗 "שתפו קישור לצפייה") — pass `channels` without `"native"`.
- **SEO copy drift 13 vs 14:** reconcile `api/og.js:11,32` (13) with the canonical 14 — **Zuriel picks the number**; then a one-place edit. (Legacy "10/עשר" copy is separate.)

### 4. Future improvement only (not now)
- **(C) video-without-thumb → homepage card** off-brand: give stories a branded `/api/card` 1200×630 fallback (verify Hebrew `rev()` visually first).
- **share→landing attribution** for story shares: append `?src=story&rid=…` (reuse `taggedShareUrl`) so story-driven landings are measurable — infra already exists.
- **`share_story` for per-channel story shares** (currently only the link 🔗 counts) — deliberate decision, intent-based for external channels.
- **preview↔open mismatch** for `?v` outside the 200-row window — widen/parameterize the deep-link fetch if it proves real.

### NEXT ACTION
Read-only audit complete — no code/DB/deploy/Story-UI change. Recommended smallest safe fix to do first (on approval): **guard `StoryViewer` `share_story` + drop the duplicate native button** (§3, isolated, reversible). The SEO number (13↔14) needs Zuriel's decision before editing `api/og.js`. Everything in §4 is future work pending a separate go-ahead.
