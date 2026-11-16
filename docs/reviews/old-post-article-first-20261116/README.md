# Old Posts: the article first, the tools on request — dependency map, proposal and measured experiment (16 November 2026)

> **Later the same day:** the implementation on the combined base (#1358 + #1370), with its lab, is in [`IMPLEMENTATION.md`](IMPLEMENTATION.md); this file stays as the record of the proposal and the experiment.

**Status (when written): proposal and experiment only.** Nothing here is implemented on a mergeable branch. The experiment is a patch against `main` `ea7257598` (`experiment/article-first-experiment.patch`), run only in a scratch worktree and the lab. No merge, deployment, Preview, database, flag or permission change. This stage is separate from #1358 and #1370 and does not extend either.

## The requirement (ZURIEL, 16.11.2026)

- On an imported Post at its original address, show the title, the author credit, the date and the article body, including its own media, first. Reading must not wait for the research system, the contexts, the editor or the panels.
- The other tools stay reachable; their code loads when they are opened. Hiding them with CSS is not enough.
- Keep the addresses, canonical, internal links, anchors, credits and the article content; use the existing sources and publication rules.
- Examine serving the article body in the first document from the server, with the same display and filtering logic; the application must not delete, duplicate or move the article or the reader.
- The cover image is examined separately (size, when its download starts, its effect on LCP). Earlier text is not proof that the image is solved.
- Measure before and after on the same sample of old Posts, on a phone and on a desktop; check internal navigation, back and direct links.

## 1. What an old Post loads before its article today

`main` `ea7257598`, production public-reading build, gzip, from the Vite manifest and source maps (`lab/attribute.cjs`, `dependency-map-main-ea7257598.json`):

| layer | JS | CSS | files |
|---|---|---|---|
| entry (React, router, Auth, ResearchProvider, Supabase client, route table) | 225.6 KB | 1.5 KB | 18 |
| System Frame (dock, panels, context rail) | 93.3 KB | 34.2 KB | 7 |
| Post page graph (old address) | 134.7 KB | 17.4 KB | 38 |
| **before the article can render** | **453.6 KB** | **53.1 KB** | 63 |

Inside the Post page graph, about **93 KB** is tools and research contexts (largest: `topicSourceContext` 8.3, `worldContextualProminence` 5.2, `Lightbox` 5.0, `topicConvergence` 5.0, content-series projection 4.7, golden projector modes 4.5, posts catalog projection 4.5, system-feed public sources 4.0, research-object presentation 3.8, convergence measures 3.7, watch button 3.4, gematria 3.2…), and about 38.5 KB is the article side as it is today (the whole `Post2029Page` 13.9 and the reading projection 20.0, which also carries the golden and pilot regions).

The article transforms themselves (`postReadingHtml2029`, `markLegacyEqualityLines`) are about 2 KB, but they live in `post2029ReadingProjection.js`, which imports the Supabase client and parts of the research system. Where they are, they can run neither on the server nor in a small article chunk: this is the first dependency to cut.

The page's article pipeline for an ordinary imported Post: the projection applies `markLegacyEqualityLines`, the page applies `postReadingHtml2029` (DOM: `<template>`, `CSSStyleSheet` scoping of the post's `<style>` blocks, removal of scripts and stylesheets, WordPress embed and plugin clean-up, iframe `loading`/`title`) and `hardenPassiveMediaHtml` (string). After #1358 the page also applies `annotatePostSource` (semantic layer, DOM): the server pipeline would have to follow whatever lands.

## 2. Proposal — two levers and a separate image track

### 2.1 The article in the first document, adopted by the page (server)

- `api/og.js` already reads the admitted post row, content included, for the document's metadata. The document handler would take that same row (no extra read) and render, after the app root, the article: title, credit, date, the cover box and the body.
- **Same logic:** the article transforms move unchanged into a leaf module (`postArticleCore2029.js`) that the page and the server both import. Three property writes become the equivalent attribute writes (`setAttribute("loading")`, `("title")`, `("href")`): in a browser the markup is identical; a server DOM gets the same markup.
- **A server DOM is required** (`postReadingHtml2029` needs a DOM). Measured over all **1,176** public imported Posts, Chromium's own output against each server DOM, compared node by node in Chromium (`experiment/equivalence.mjs`, `equivalence-summary.json`):

| server DOM | identical article | different | scripts left in the output | build time, all posts |
|---|---|---|---|---|
| jsdom 25 (spec HTML parser) | **1,113 (94.6 %)** | 63 | 0 | 10.8 s |
| happy-dom 15 | 1,063 | 113 | 0 | 4.2 s |
| linkedom 0.18 | 664 | 512 | **181** | 3.4 s |

  linkedom is excluded (scripts survive). The remaining jsdom differences: whitespace text nodes next to removed elements (28), `<style>` blocks re-serialised by a different CSS engine (30), other (5, e.g. `<noscript>`).
- **Adoption, never two copies:** the page moves the document's nodes into its own article only when the post id, the stored-source key and the parsed output are identical; otherwise its own article replaces the document's in place, once. While the document article exists, the app root keeps the opening bar's height (CSS `:has`, no script), so the app's first frames never push the article down.
- **Costs:** a new server dependency (jsdom, 4.4 MB; about 9 ms per post, about 90 ms on a cold first call), 5–14 KB more HTML per old-post document, no extra database read.

### 2.2 The tools on request (client)

The old-address route renders an article-first page: the frame, title, credit, date, cover and body. The research contexts, follow, comments, ads, convergence measures, timeline, evidence media and lightbox load when they are opened (a dynamic import on the control), not hidden by CSS. This removes the ~93 KB of tool code from the path before interaction and from the bandwidth the cover competes with. **Not measured at runtime in this experiment** (bytes only); it touches `Post2029Page.jsx`, which is in #1358's active scope.

### 2.3 The cover image (separate track)

Measured separately below. The text moving earlier is not counted as an image result.

## 3. The experiment

**Setup.** The 15.11 lab (`lab2.mjs`/`labserver2.mjs` from `claude/perf-post-speed-evidence-20261115`, plus a body injection, `lab/*.diff`): production public-reading builds, recorded public reads replayed, cold cache every load, document think time 1,300 ms on `main` and 1,320 ms with the article (about 20 ms more for the server build). Phone: Pixel 7, Slow 4G (150 ms, 1.6 Mbit/s), 4× CPU. Desktop: 1440×900, 10 Mbit/s, 40 ms. Interleaved blocks A B B A, 3 loads per post per block: **n = 6 per post per arm per device**; observation 9 s after load. p is the two-sided Mann-Whitney test. Per-load rows: `runs.csv`; tables: `results.md`.

- **A** = `main` `ea7257598`.
- **B** = A + the experiment patch, with the document article for the four sample Posts built offline by the same functions under jsdom (`experiment/generate.mjs`) and served in the first document.

**Sample: four imported Posts at their original addresses**, different shapes: O1 (31, the top Search Console page; a banner cover and a larger body image), O3 (192, long bold text, a named anchor), V1 (1, a YouTube embed, an Instagram embed with its script, a 519 KB cover), M1 (5, a gallery of six images).

### Phone

| post | text visible A → B (ms) | LCP A → B (ms) | CLS max A / B | KB before the text A → B | requests before the text A → B |
|---|---|---|---|---|---|
| O1 | 6,754 → 1,918 (**−4,836**) | 8,204 → 4,636 (**−3,568**) | 0 / 0 | 707 → 19 | 88 → 14 |
| O3 | 6,606 → 1,898 (**−4,708**) | 7,806 → 3,500 (**−4,306**) | 0 / **0.050** | 707 → 22 | 88 → 13 |
| V1 | 6,764 → 1,878 (**−4,886**) | 9,558 → 1,906 (**−7,652**) | 0 / 0 | 728 → 22 | 89 → 14 |
| M1 | 6,842 → 1,872 (**−4,970**) | 9,684 → 6,228 (**−3,456**) | 0 / 0 | 718 → 18 | 88 → 12 |

### Desktop

| post | text visible A → B (ms) | LCP A → B (ms) | CLS max A / B | KB before the text A → B | requests before the text A → B |
|---|---|---|---|---|---|
| O1 | 2,318 → 1,503 (**−815**) | 2,616 → 2,254 (**−362**) | 0.005 / 0.005 | 721 → 55 | 89 → 20 |
| O3 | 2,323 → 1,506 (**−817**) | 2,682 → 1,906 (**−776**) | 0.006 / 0.019 | 721 → 66 | 89 → 20 |
| V1 | 2,341 → 1,504 (**−837**) | 2,560 → 1,524 (**−1,036**) | 0.006 / 0.006 | 721 → 51 | 89 → 19 |
| M1 | 2,320 → 1,503 (**−817**) | 2,680 → 2,168 (**−512**) | 0.006 / 0.006 | 721 → 63 | 89 → 20 |

Every difference above: p = 0.002 (all six B loads beat all six A loads).

### The cover image, separately

| post | cover | phone: download starts A → B | phone: finishes A → B | LCP element is the cover, phone A / B | desktop: finishes A → B |
|---|---|---|---|---|---|
| O1 | 151 KB | 6,618 → 1,411 | 8,262 → 4,698 | 0/6 / 0/6 | 2,776 → 1,826 |
| O3 | 151 KB | 6,445 → 1,398 | 7,752 → 4,344 | 6/6 / 0/6 | 2,713 → 1,828 |
| V1 | **519 KB** | 6,580 → 1,388 | 9,506 → **8,660** | 6/6 / 0/6 | 3,010 → 2,496 |
| M1 | 148 KB | 6,658 → 1,405 | 9,646 → 6,116 | 6/6 / 0/6 | 2,904 → 2,118 |

What this says, and what it does not:

- With the article in the document the cover's download starts with the document (about 1.4 s on the phone instead of about 6.5 s), but it still shares the slow link with the scripts: a 150 KB cover finishes 3.5 s earlier, the 519 KB cover of V1 only 0.85 s earlier, at 8.7 s.
- On the phone the LCP element in B is never the cover: it is a body image that now starts early (O1, O3, M1) or the text itself (V1, whose portrait cover is contained in the reserved box and paints a smaller area than a paragraph). So the LCP gains above come from the article and its body images arriving earlier, **not from the cover problem being solved**. A large cover still finishes late; making the file smaller is the separate image proposal (`docs/reviews/post-image-renditions-proposal-20261116`).

### Same article, adoption and the reader (`lab/afprobe.mjs`, `lab/reader-checks-*.json`)

- **Adoption** on all four Posts, phone and desktop: one `<article>`, one `<h1>`, one article body, no document article left; the page's own output was identical to the document's (strict node comparison).
- **No duplicate on a mismatch.** An earlier probe that wrote an attribute into the document article before adoption made the outputs differ: the page replaced the document article in place and the result was still one article. (A first version without this replacement rendered two articles; it is the reason the replacement exists.)
- **Navigation and back:** an internal link from the article and back again render one article from the page, on all four Posts, phone and desktop.
- **Direct link to a named anchor** (O3 `#_Toc10337527`): on `main` the anchor is never scrolled to (it stays 1,239 px below on the phone, 1,603 px on desktop). With the document article the browser goes to it at once; after adoption it stays within 37 px on the phone, but on desktop it ends 134 px above the screen, because adoption keeps the first visible block, not the link's target.
- **The reader's paragraph after adoption** (the reader scrolled during the document phase): moved −67 to +92 px on the phone and −137 to +185 px on desktop. The page's hero (categories, details, background) is 339–441 px taller on the phone than the experiment's header, and the desktop page reflows around its rails; adoption compensates by scrolling, which is not exact.

### Found and not yet solved

1. **Geometry:** the document article must reproduce the page hero and column (the same markup and critical CSS) so that adoption moves nothing, and adoption must anchor on the link's target when the address has one.
2. **Font swap:** O3's long title gains a line when the web fonts arrive (about 2.4 s), moving everything below by 32 px: CLS 0.050 on the phone, 0.019 on desktop. The fix is a metric-matched fallback face (`size-adjust` / ascent overrides); it must be measured again with #1370's font change (bold no longer preloaded).
3. **Server DOM:** jsdom reproduces the browser's article on 94.6 % of old Posts; the rest take the replacement path.
4. **Existing on `main`, not caused by this stage:** when a reader scrolls in the first seconds, a frame side panel moves twice (0.317 + 0.355 on the phone, 0.274 + 0.167 on desktop), probably the guest updates invitation; and named-anchor links on old Posts do not scroll.
5. **Not measured:** the tools-on-request split at runtime, signed-in readers, Firefox and Safari, the field, the Israel edge, a Post with a matrix opening or special character; one desktop reader check on `main` (V1) returned no output.

## 4. Ownership and order

- `src/pages/Post2029Page.jsx` and `api/og.js`: in the active scope of #1358 (owner: the Claude session of `ccr-b8e8ab12-9hoamu`). This stage writes nothing there now.
- `public-reading-deploy/api/public-document.js`: no active writer. `2029.html`: changed in #1370.
- Order: (1) #1358 lands, or its owner agrees to a shared scope; (2) decision on the server DOM; (3) an implementation branch from the updated `main`: the leaf-module move (no behaviour change, provable by the existing tests) → the document article and adoption → the tools on request → lab and browser acceptance (no delete, duplicate or shift; navigation, back, direct links, anchors; 200/404/503 and hidden content) → a protected Preview on approval → a release on approval of the exact commit and deployment.

## 5. Decisions for ZURIEL

1. jsdom as a server dependency for old-post documents (4.4 MB, about 9 ms per post), or no server article (client-only article-first, which still waits for the entry and the frame).
2. Start the implementation branch after #1358 lands (or in a shared scope agreed with its owner).
3. For the ~5 % of Posts whose stored HTML does not come out identical on the server: the page replaces the document article (one visible re-render), or those Posts get no document article.
