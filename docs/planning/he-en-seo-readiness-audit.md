# he + en SEO Readiness — targeted READ-ONLY audit

> **actor=CLAUDE · status=read-only he/en SEO audit · date=2026-08-14**
>
> Scope: routes → language → seo.js → canonical → OG → sitemap → robots → middleware → existing English infrastructure. Question: **can full SEO be auto-generated from the existing Entity/tree for he + en (incl. canonical + hreflang), or is only a small connection missing?**
> No WRITE / DB change / deploy / translation. Deliverable: **FACT / GAP / DUPLICATION / RECOMMENDATION** + a minimal architecture. Verified against live DB.

---

## FACT — the crawl/index + language layer today

**Routing (he-only).** `src/App.jsx` has ~120 routes; **no `/en`, no `/:lang/…`, no locale param.** The he/en "alias slugs" (e.g. `/languages` + `/קשרי-שפות`, `App.jsx:306-307`) are duplicate aliases for the *same he page*, not locales. `src/routes.jsx` `ROUTE_META` (`:39-63`) carries only `title/description/noindex` — **all Hebrew**, no `lang`/`hreflang`/variant field.

**Client SEO (`src/lib/seo.js`) — he-locked.** `applySeo` sets title/description/**canonical = `SITE_URL + path`** (self-referential, no lang variant, `:71`), `og:locale="he_IL"` (`:81`), and every JSON-LD block `inLanguage:"he-IL"` (`:125,156,214,261`). **No `hreflang`, no `alternate`, no `lang` param.**

**Crawler OG (`api/og.js`) — he-locked.** `<html lang="he" dir="rtl">` (`:436`), canonical self-referential he (`:136,441`), `og:locale=he_IL` (`:443`), JSON-LD `inLanguage:he-IL`. **No `<link rel="alternate" hreflang>`, no `og:locale:alternate`.**

**Sitemap (`api/sitemap.js`) — DYNAMIC, he-only, no hreflang.** Wired via `vercel.json:44-47` (`/sitemap.xml → /api/sitemap`); no committed `public/sitemap.xml`. On every request it enumerates from Supabase: 23 static routes + posts `/slug` + **every number `/number/:n`** (RPC `sitemap_numbers`) + topics `/topic/:slug` + forum `/forum/:id` + codes `/codes/:slug` + contributors (`api/sitemap.js:73-148`). BUT the `<urlset>` namespace has **no `xmlns:xhtml`** and `urlTag()` emits only `loc/lastmod/changefreq/priority` (`:19-28,152`) — **zero hreflang alternates.**

**robots (`public/robots.txt`).** Public content open; blocks SEO-scraper bots + `/admin,/traffic,/profile,/research,/api/…`; `Sitemap: …/sitemap.xml` (`:35`). **No language rules.**

**Middleware (`middleware.js`) — geo + bot only.** Reads `x-vercel-ip-country` + UA; classifies bot kind; logs; sets cookies `vc=<country>`, `vb=<kind>`. **No Accept-Language, no locale detection, no `/en` rewrite** (grep: zero hits).

**vercel.json.** Sitemap rewrite + UA→`/api/og` prerender rewrite + SPA fallback + legacy he-slug redirects. **No locale rewrites/headers.**

**Whole-repo grep:** `hreflang` = **0 hits**, `og:locale:alternate` = **0**, `rel="alternate"` = **0**. `en_US` only in the FB pixel URL. → **No multi-language SEO infrastructure exists anywhere.**

### FACT — existing English infrastructure

- **No i18n library** (no i18next/react-intl/lingui in package.json), no translation string catalogs.
- **English UX = a "coming soon" bar.** `EnglishSoonBar.jsx` detects en via `navigator.languages ^en` or `America/*` timezone (`:7-16`), shows one banner "🌍 Coming soon — SOD 1820 in English"; `?enbar=1` force-preview. That is the entire English-facing surface.
- `src/lib/lang.js` — a heuristic language detector (`CANON_LANGS=[he,en,ar,es,fr,ru,pt,de]`) for the **WhatsApp translation-reply** flow, not UI i18n.
- `EnglishDiscovery.jsx` (`/languages`) accepts **English input** for gematria discovery but its UI + output are Hebrew.

### FACT — translation data model (verified against live DB)

- **`video_transcripts`** (migration `20260812_…`): `(video_key, lang, title, transcript, summary, is_original, translated_by, model, status)`, unique `(video_key,lang)`, RLS exposes `status='published'`. **Live DB: 24 rows across 8 langs `ar,de,en,es,fr,he,pt,ru` ≈ 3 videos.** → **en actually exists — for videos only.** Rendered by `VideoTranscript.jsx` (per-lang tabs).
- **Translation ENGINE exists & is reusable:** Edge fn `video-transcribe` (`action:'translate'` auto-translates to every canonical lang with Claude; an unwired `action:'raw'` detect+translate mode too) + SQL wrapper `public.video_translate(jsonb)` + `lang.js` detector. (Note: the function dir is `video-transcribe`; `video_translate` is only the SQL wrapper.)
- **Posts:** he-only — no translation columns (live DB confirmed: `posts` has no `*_en`/`lang`/`title_*` columns).
- **Entities/tree (`nodes`, `gematria_words`, `number_anchors`, `topic_cards`):** he-only labels/facts/hints; **no `lang`/`*_en` column** on any (live DB: `nodes` has no lang/translation columns). `page_content`: 9 rows, **all `he`**.
- **`language_links`** (langs `en,ru`, 13 rows) = the cross-language *research* feature (Hebrew↔foreign-word gematria), **not** site translation.
- **Language-neutral core:** gematria **values/numbers**, convergence values, method names — inherently locale-independent; `translit.js`/`fn_en_search` already map English input → Hebrew.

---

## GAP — what's missing to auto-generate he+en SEO from the tree

1. **No hreflang / alternate anywhere** — `seo.js`, `og.js`, and the sitemap emit a single he URL with no `<link rel="alternate" hreflang="en">` / `x-default` / `og:locale:alternate`. This is pure plumbing, and it's absent.
2. **No en URL to point a canonical/alternate at** — no `/en` route, no `?lang=en`, no locale render path in `App.jsx`/`EntityPage`.
3. **No en TEXT for posts/entities** — labels, facts, hints, post prose are all Hebrew; nothing analogous to `video_transcripts` exists for `nodes`/`number_anchors`/`gematria_words`/`posts`. So en SEO tags for those have **nothing to fill them** without translation.
4. **`ROUTE_META` has no en variants** — the static super-pages can't be localized from the current metadata.
5. **Sitemap namespace** lacks `xmlns:xhtml` — even the dynamic enumerator can't carry alternates as-is.

**Key distinction:** the **plumbing gap** (1,2,4,5) is small and additive. The **content gap** (3) is large for prose but **near-zero for the language-neutral number/entity spine** (numbers are the same in every language) and **already solved for videos** (en transcripts exist).

---

## DUPLICATION — existing overlaps worth noting

- **Alias-slug duplicate content:** `/languages` and `/קשרי-שפות` (and other he/en alias pairs) render the same page; client canonical = current `pathname` (`seo.js:71`), so the two aliases can emit **two different self-canonicals** → mild duplicate-content signal. A canonical should pin alias pairs to one URL (independent of i18n).
- **Two language detectors:** `EnglishSoonBar` (navigator/timezone) and `lang.js` (`detectLanguage`) — different purposes (UI banner vs WhatsApp reply) but overlapping concept; a future locale layer should not add a third.
- **Tagline drift (from the SEO/share audit):** "N שנות מחקר" = **14** in `index.html`/`seo.js` vs **13** in `api/og.js:11,32`. Any en variant must not fork this a third time — reconcile first.
- **No new-system duplication yet** — because nothing multilingual exists; the risk is *building* a parallel translation store when the `video_transcripts` pattern + `video-transcribe` engine already exist and should be reused.

---

## RECOMMENDATION — minimal architecture (reuse, don't rebuild)

**Answer to the framing:** it is **NOT** "one small connection" for *full* he+en SEO of *all* content — post/entity **prose en text doesn't exist** and needs translation (explicitly out of scope). **BUT** three things ARE a small connection and deliver most of the SEO value **without any mass translation**:

### Phase 0 — the small connection (high SEO value, no prose translation)
Do these; they reuse existing infra and add no translation debt:

1. **hreflang plumbing (small).** Add a `lang`/`altUrls` option to `applySeo` (client) and the `api/og.js` template so both emit, per page:
   `<link rel="alternate" hreflang="he" href="…">` + `hreflang="en"` + `hreflang="x-default"`, and `og:locale:alternate` = `en_US`. One helper, two call-sites.
2. **Pick the en URL scheme (small decision).** Recommend **`?lang=en`** (or `/en/…` subpath) — either lets the *same* React page render en without duplicating routes. `?lang=en` is the lowest-friction (no router changes; `EntityPage`/SEO read the param). Canonical for he stays clean; en canonical = the en URL; alias pairs get a single canonical.
3. **Sitemap alternates (small).** In `api/sitemap.js` add `xmlns:xhtml` to `<urlset>` and, for entity/number/topic URLs, emit paired `<xhtml:link rel="alternate" hreflang="he|en|x-default">`. The enumerator already produces every URL — this is a formatting change only.
4. **Templated en SEO for the language-neutral spine (small, the big win).** For `/number/:n` and `/topic/:slug`, generate en `title`/`description`/JSON-LD from a **fixed en template + the numeric/value data** (which is locale-independent) — e.g. *"Gematria value {n} — meanings, convergences & Torah hints · SOD1820"*. No prose translation; the number carries the meaning. This makes the **largest, most SEO-valuable surface** indexable in en immediately.
5. **Videos already have en** — wire their pages' hreflang/en SEO now (data exists in `video_transcripts`).

Phase 0 = SEO plumbing + a template + already-translated videos. No new table, no new engine, no mass translation. **This is the "small connection."**

### Phase 1 — deferred (reuses the existing engine; NOT now, needs its own go-ahead)
Only if/when Zuriel wants en **prose** content indexed:
- Add an **entity/post translation store** mirroring the `video_transcripts` pattern (`(entity_type, entity_id, lang, title, body, translated_by, status)`), populated by the **existing** `video-transcribe`/`video_translate` Claude engine (its `detect+translate` mode is already coded, just unwired). Then the same hreflang plumbing (Phase 0) auto-fills from stored en rows.
- This is "reuse engine + add a store + en render," i.e. **more than wiring but well short of building translation from zero** — and it is the "mass translation" the current step explicitly excludes.

---

## SUMMARY

1. **Works / do not rebuild:** the **dynamic sitemap** (enumerates every entity/number/post URL from DB), the **UA→/api/og** prerender, the **client `applySeo`/JSON-LD** layer, and a **working, reusable translation engine** (`video-transcribe` + `video_translate`, 8 langs, proven on videos). The pieces to hang i18n on already exist.
2. **Actually missing (small):** hreflang/alternate emission (0 hits repo-wide), an en URL scheme, sitemap `xmlns:xhtml`, en `ROUTE_META`.
3. **Actually missing (large, out of scope now):** en **prose** for posts/entities (no store, no text) — requires translation. Numbers/entities are language-neutral and can be **templated** instead.
4. **Duplication to fix regardless of i18n:** alias-slug self-canonicals, the 13↔14 tagline drift.
5. **Verdict on the question:** *Full* he+en SEO auto-from-the-tree is **not** just a small connection (prose en doesn't exist). But **he+en SEO for the language-neutral number/entity spine + videos IS a small connection** — hreflang plumbing + a template + wiring the videos, all reusing existing infra. **Do not build a new translation system for this step.**

### NEXT ACTION
Read-only audit complete — no code/DB/deploy/translation. Recommended smallest safe first step (on approval): **Phase 0** — hreflang+alternate plumbing in `seo.js`/`og.js`, `?lang=en` scheme, sitemap `xmlns:xhtml`, and **templated en SEO for `/number/:n` + `/topic`** (+ wire the already-translated videos). Phase 1 (entity/post translation store via the existing engine) is a separate, explicit decision — the "mass translation" this step excludes.
