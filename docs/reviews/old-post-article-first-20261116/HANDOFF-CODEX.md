# Hand-off to Codex — old Posts, article first (16 November 2026)

From CLAUDE, at ZURIEL's request, before any merge or release. A document for review, not an assignment: nothing was dispatched, and only ZURIEL activates another agent. Journal: `OLD_POST_ARTICLE_FIRST_20261116` (proposal and experiment) and `OLD_POST_ARTICLE_FIRST_IMPL_20261116` (implementation); passive records to ZURIEL.

## State

- Branch `claude/old-post-article-first-20261116`. Base `origin/main` `ea7257598` + #1358 (`221c26bc4`) + #1370 (`2165ec326`), merged into this branch at ZURIEL's instruction; neither PR is in `main`. No PR for this branch, so **no CI run exists for it**; everything below is local unless marked otherwise.
- The experiment (`README.md`, `experiment/`) came first; the implementation (`IMPLEMENTATION.md`) replaces its prototype patch with real code.

## What changed (implementation)

See `IMPLEMENTATION.md` "What was built". In short: one article pipeline shared by the page and the server; the server path in the document handler on the already admitted row, gated by a proven list keyed by the exact stored source and by a warm server DOM (jsdom 25.0.1, a new dependency); the page adopts the same nodes, keeps the reader's place, replaces on any mismatch, and loads the research tools on open or on approach.

## What is proven (local)

All local, on `e500acb82` (the code of the lab's B arm), on this machine:

- **The server path.** `test/article-first-document-2029.test.mjs`, 3/3. It covers:
  - a cold instance answers `warming` and serves today's document, then `served`;
  - no article for a 404, a 503, a forum or hidden Post, a missing row, a query string, a `/post/` address, a Post that was not imported, a Post edited since the proof, or a Post that is not on the list;
  - a renderer that throws still gives today's document with status 200, never a 503.
- **The page.** `test/article-first-browser-2029.browser.mjs`, 5/5, in two separate runs. It covers:
  - on phone and on desktop, the page adopts the same body nodes, and after scrolling into the body the paragraph being read stays within 2 px;
  - the text is equal, and anchors and links are kept;
  - a direct link to a named anchor stays on it after adoption;
  - an output that differs is replaced once, with no duplicate;
  - leaving before adoption (a frame link while the read is held) removes the document article, and going back shows exactly one article.
- **The same article.** Chromium and jsdom were compared node-for-node on the full pipeline, including the semantic layer: 1,112 of 1,175 candidates are identical (`scripts/build-article-first-proofs.mjs`).
- **The gates** on the same head:
  - `test-legacy-retired`, `test-2029-control-plane` and the shell budget (enforced): the frame is unchanged.
  - The release-contracts set of step 7: 52/52.
  - `storage-lazy`: 7/7.
  - The two #1370 browser tests: personal panel 4/4, first upload 4/4; together with the article-first browser test, 13/13 in one run at 10:21 UTC (`impl-lab/local-verification-e500acb82.txt`).
- **The cold start** (IMPLEMENTATION.md): a cold instance never delays a document; a warm one adds about 15 ms.
- **The lab**, n = 6 per Post per arm per device, every text difference p 0.002:
  - text: about −3.5 s on the phone (to about 3.3 s) and −0.7 s on desktop;
  - CLS: unchanged;
  - the cover starts with the document;
  - images and tools are reported separately in IMPLEMENTATION.md, including the two regressions below.
- **Sizes.** The Post page graph went from 206.4 to 145.5 KB gzip JS (52 → 33 files) and from 32.0 to 25.5 KB CSS.

## What is not proven or still missing

- **No CI run**: the branch has no PR. **No Vercel Preview, no Vercel cold start, and no function bundle size or memory measured with jsdom.**
- **Regressions measured, not fixed:**
  - On the phone, tools-ready is +0.44 to +1.94 s later, likely from link contention with the images that now start early. Not proven by a separate run.
  - On the phone, all article images finish 0.1–1.2 s later.
- **Not built:**
  - The article's stylesheet rules for the first paint. The text waits for 62 KB gzip of render-blocking CSS; this is the main remaining lever.
  - A metric-matched font fallback for long titles.
  - Image priorities.
- **Not measured:**
  - The time from using a tool to that tool being ready.
  - A screen reader.
  - The effect on search engines.
- **Not classified:** the causes behind the 63 unproven Posts. There is also no process for rebuilding the proof list.
- **Decisions waiting for ZURIEL:**
  - jsdom as a dependency;
  - whether the phone's tools regression blocks a first release;
  - the CSS direction;
  - the font fallback (with the Visual Language owner);
  - the order: #1358 and #1370 first.

## What to review first

1. `public-reading-deploy/api/article-first.js` and the hook in `public-document.js`: eligibility (200, own original address, no query, proven source), failure isolation (it never throws; a cold instance serves today's document), and that nothing reaches a 404/503/hidden answer.
2. `src/pages/Post2029Page.jsx`: the adoption memo and the two layout effects (adopt / replace), the clean-up on error and unmount, the tools on request.
3. `scripts/build-article-first-proofs.mjs`: is node-for-node equality of the body the right gate (the header is not adopted; the page renders its own)?
4. The CSS template in the generated document: the article waits for 62 KB gzip of the page's own stylesheets before its first paint; the main remaining lever (IMPLEMENTATION.md, lab section 1).
6. The phone's later tools-ready (IMPLEMENTATION.md, lab section 3): is the contention explanation right, and what should the images' priority be?
5. jsdom as a production dependency, and the 63 Posts that stay on the existing path.

## Follow-ups (16 November 2026, afternoon) — after Codex's review note `0bb87ae5e`

What changed, what is proven and what is still open: [`FOLLOWUPS.md`](FOLLOWUPS.md). Fonts: [`FONTS.md`](FONTS.md). Review first:

1. **Frame and header** (`src/lib/research/postArticleFrame2029.js`, `postArticleDocument2029.js`).
   - The first-document article copies the System Frame's containers and token style, and the page's header markup.
   - It is held to the page by the browser acceptance (geometry, fonts, colours, header markup and tokens equal before and after adoption, in three themes, with the full stylesheets held).
   - Drift in `SystemFrame2029.jsx`'s `shellStyle` or the page's header fails that test.
2. **The first-paint stylesheet** (`scripts/lib/article-first-critical-css.mjs`, the build, `public-reading-deploy/api/article-first.js`).
   - It keeps every rule whose selectors may match the first document's vocabulary (`article-first-vocabulary.json`, written by the proof).
   - `scripts/check-article-first-critical-css.mjs` compares the first-paint stylesheet alone with the full stylesheets on real Posts.
3. **Proof binding** (`scripts/lib/article-first-fingerprint.mjs`, `test/article-first-proof-fresh.test.mjs`). Any change to a file of the document's import graph, or to jsdom, needs `node scripts/build-article-first-proofs.mjs`.
4. **Colours** (`postLegacyColor2029.js`, the end of `post2029-reading.css`) and **images** (`postArticleImages2029` in `postArticleCore2029.js`).
5. **Adoption timing** (`keepReaderInPlace2029`): corrections only in settled frames.
6. **Fonts** (`2029.html`, `public/fonts/Rubik-Hebrew-Common.woff2`, `fonts/rubik-faces.py`, `test/fonts-2029-faces.test.mjs`):
   - One Rubik file carries Hebrew text with its spaces, digits and punctuation. It is cut from the same Rubik 2.3 source as Google's files.
   - The Latin file covers Latin letters only.
   - The local stand-ins are matched per weight and per class.
   - Effects: the header of Post 192 is identical in every font state, and the phone CLS goes from 0.139 to 0.000. Rubik's own Hebrew–punctuation kerning now applies.
7. **Image copies know each original's real width.**
   - The widths are measured by `scripts/scan-article-image-facts.mjs` and stored in `public-reading-deploy/article-image-facts.json`.
   - `postImageRenditionSet2029` uses them: copies only below the original's width, and the original itself as the widest candidate.
   - The first document carries the widths of its own images (`data-ssr-image-facts`), and the page reads them with `documentImageFactsFor`.
   - The proof gives the server the whole list and the browser only the post's own widths, as at runtime. A browser acceptance case checks adoption and the cover copies with widths.
8. **The first-paint rules lead until every full stylesheet has arrived** (the `sod-af-first` class, `scripts/lib/article-first-critical-css.mjs`, `public-reading-deploy/api/article-first.js`).
9. **The cold start on Vercel** is NOT verified. `scripts/check-article-first-cold.mjs` is ready for a protected Preview of the exact commit, once ZURIEL approves that Preview.
