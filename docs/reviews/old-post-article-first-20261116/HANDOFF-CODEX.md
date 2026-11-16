# Hand-off to Codex — old Posts, article first (16 November 2026)

From CLAUDE, at ZURIEL's request, before any merge or release. This is a document for review, not an assignment: nothing was dispatched, and only ZURIEL activates another agent. Journal: `OLD_POST_ARTICLE_FIRST_20261116` (passive records to ZURIEL).

## What changed

- **No product branch changed.** This branch (`claude/old-post-article-first-20261116`, from `main` `ea7257598`) holds documents, the experiment patch and the lab tools only.
- The experiment ran in a scratch worktree with `experiment/article-first-experiment.patch` applied to `main` `ea7257598`:
  - `src/lib/research/postArticleCore2029.js` (new): the article transforms moved unchanged out of `post2029ReadingProjection.js` (which now imports and re-exports them), with three property writes turned into the equivalent attribute writes.
  - `src/lib/research/postArticleDocument2029.js` (new): the document article (title, credit, date, cover box, body) from those functions, a source key, and the CSS that holds the app root at the opening bar's height.
  - `src/pages/Post2029Page.jsx`: adoption of the document article's nodes (identity + source key + identical parsed output), otherwise an in-place replacement; the cover image is adopted into the page's cover box.
  - The lab server gained a body injection (`lab/labserver2-injectBody.diff`, `lab/lab2-injectBody.diff`); the document article was produced offline with jsdom (`experiment/generate.mjs`) and served for the four sample Posts.

## What is proven (local lab and scripts; no CI, no Preview, no Production)

- **Dependency map** (`main` `ea7257598`, production build, gzip): before an old Post can render its article the browser loads 453.6 KB of JS and 53.1 KB of CSS in 63 files; about 93 KB of the Post page's own 135 KB is tools and research contexts. The article transforms live in a module that imports the Supabase client.
- **Same logic on the server is possible for most, not all, old Posts:** with the article transforms moved unchanged into a leaf module and three property writes turned into attribute writes, jsdom gives Chromium's exact article on 1,113 of 1,176 public imported Posts (94.6 %); happy-dom 1,063; linkedom leaves scripts in 181 outputs and is unfit. Method: `experiment/equivalence.mjs`, result `experiment/equivalence-summary.json`.
- **Timing, four old Posts, n = 6 per post per arm, p = 0.002 everywhere:** text visible 4.7–5.0 s earlier on a slow phone (about 6.7 s → 1.9 s) and 0.8 s earlier on desktop; LCP 3.5–7.7 s earlier on the phone and 0.4–1.0 s on desktop; before the text the phone downloads 18–22 KB in 12–14 requests instead of 707–728 KB in 88–89. `results.md`, `runs.csv`.
- **The cover is not solved by this:** it starts with the document but a 519 KB cover still finishes at 8.7 s on the phone; the LCP element is no longer the cover.
- **Adoption without duplication** on all four Posts, phone and desktop; navigation and back render one article; a mismatch replaces in place.
- **Open defects of the experiment itself:** the reader's paragraph moves −137 to +185 px at adoption; an anchor link loses its target on desktop; a long title's font swap gives CLS 0.050 on the phone.

## What is not proven or still missing

- A real server path: `public-document.js` receiving the admitted row from `api/og.js` and rendering the article; error handling (a jsdom failure must leave the document exactly as today).
- The page hero rendered on the server with the same geometry (categories, details summary, background, matrix opening), so adoption moves nothing; in the experiment the page hero is 339–441 px taller on a phone and adoption compensates by scrolling.
- `annotatePostSource` (#1358's semantic layer) in the server pipeline; the equivalence must be re-measured on the base where #1358 has landed.
- The tools-on-request split of `Post2029Page` (bytes are mapped; runtime not measured).
- The cover box for Posts with special characters (`data-post-character`, matrix opening), signed-in readers, the admin editor, Firefox and Safari, the field.
- Browser acceptance and CI wiring for: no delete or duplicate, the reader kept in place, navigation, back, direct and anchor links, 200/404/503 and hidden content with the document article present.

## What to review

1. The adoption rule (`Post2029Page` patch): is "identical parsed output" the right gate, and is the replacement path safe for the ~5 % of Posts that do not round-trip?
2. The server DOM choice (jsdom vs none) and its failure mode.
3. That the document article uses only the existing publication rules (the same admitted row as the metadata, the same suppression of drafts and forum Posts, 404/503 unchanged).
4. The measurement method (`lab/`, `results.md`, `runs.csv`) and whether the sample of four old Posts is enough before a protected Preview.
