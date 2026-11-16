# Old Posts, article first — implementation on the combined base (16 November 2026)

Branch `claude/old-post-article-first-20261116`. Base: `origin/main` `ea7257598` with #1358 (`221c26bc4`) and #1370 (`2165ec326`) merged into this branch at ZURIEL's instruction ("on the combined base after #1358 and #1370"); neither PR is merged into `main`. **Branch only:** no merge, deployment, Preview, database or flag change. If #1358 or #1370 change, this branch must take their new heads again.

## Acceptance (ZURIEL, 16.11.2026) and where each is proven

| requirement | how | proof |
|---|---|---|
| the text arrives early | the article (title, credit, date, cover, body) is in the first document | lab below; browser acceptance 1 |
| the paragraph being read stays in place | the page adopts the same nodes; the reader's place (the address's target, else the block at the reading line) is measured before and after and compensated, with the browser's own anchoring suspended for the swap | browser acceptance 1 (phone and desktop, ≤ 2 px), 2 |
| anchors are kept | the browser opens a named anchor natively; adoption keeps it | browser acceptance 2; server test (the `<a name>` survives) |
| no duplicate, no content change | adoption only when the page's own output is node-for-node identical; otherwise an in-place replacement, once | browser acceptance 1, 3, 4; server test |
| a real server path, jsdom as the candidate | `public-reading-deploy/api/article-first.js` in the document handler, on the row the metadata reader already admitted | server test; cold start below |
| Posts not yet proven stay on the existing path | a list keyed by the exact stored source (`article-first-proven.json`, `scripts/build-article-first-proofs.mjs`) | server test ("not on the list", "edited since the proof") |
| tools on request | the editors, unit extras, share, save and matrix opening load when used; timeline, follow and comments when approached | build sizes below; the page tests |

## What was built

- `src/lib/research/postArticleCore2029.js`: the article transforms, moved unchanged out of `post2029ReadingProjection.js` (three property writes became the equivalent attribute writes). `postSpecialReadings2029.js`: the four special-reading addresses, moved unchanged.
- `src/lib/research/postArticlePipeline2029.js`: the ONE article pipeline, used by the page and by the server: `postReadingHtml2029` → `hardenPassiveMediaHtml` → `annotatePostSource` (the semantic layer from #1358).
- `src/lib/research/postArticleFirstPolicy2029.js`: candidates (an imported Post with the plain reading, not in the reality-map series, no proven source updates, not a special reading) and the proof check.
- `src/lib/research/postArticleDocument2029.js`: the document article with the page's own classes; `postArticleAdoption2029.js`: the page side (match, reader's place, compensation).
- `api/og.js`: hands the row it admitted to the document handler (no second read; drafts and forum Posts never reach it). `public-reading-deploy/api/public-document.js`: asks `article-first.js`, response header `X-Sod-Article-First`.
- `scripts/build-public-reading-production.mjs`: the page's stylesheets in load order in an inert template of the generated document; only an article-first document turns them into stylesheets.
- `src/pages/Post2029Page.jsx`: the shared pipeline, adoption or replacement, a credit-and-date line under the title for imported Posts, and the tools on request. `RouteScrollReset2029.jsx`: leaving the address removes a document article that was not adopted.
- `package.json`: `jsdom` 25.0.1 (exact). **A server dependency is a ZURIEL decision before any release.**

## Proof of "the same article"

`scripts/build-article-first-proofs.mjs` (Chromium and jsdom, node-for-node, full pipeline with the semantic layer): **1,112 of 1,175** candidate imported Posts are identical and listed; 63 differ and keep the existing path. The page checks again at run time, so a change made in the browser before adoption (an extension, a translation tool) is replaced, never shown twice.

## Cold start (local, five fresh processes)

| step | time |
|---|---|
| loading the document handler (with the article path) | 105–130 ms; the combined base without it: 142 ms, so no measurable cost |
| loading jsdom and its window | 279–350 ms, **in the background**: a cold instance serves today's document meanwhile (`warming`) |
| the first article in an instance | 98–139 ms |
| every later article | 13.5–16 ms median, 32–42 ms worst (four sample Posts × 5) |
| HTML added to the document | about 12 KB before compression |
| memory of the process | about 152 MB |

So a cold start never delays a document; a warm instance adds about 15 ms of server time to an old-Post document. Measured on this machine, not on Vercel; the Vercel cold start of the function itself is not included.

## Lab: text, images and tools, separately

**Setup.** The same lab as the experiment (`impl-lab/lab2.diff`, `impl-lab/labserver2.diff` against the 15.11 tools; `impl-lab/run-impl.sh`, the four configs). Production public-reading builds, recorded public reads replayed, cold cache on every load, document think time 1,300 ms in both arms. In B the document of each sample Post is built at request time by the **real** `withArticleFirst2029` of the tree under test (a warm instance), so its own server time is included. Phone: Pixel 7, Slow 4G (150 ms, 1.6 Mbit/s), 4× CPU. Desktop: 1440×900, 10 Mbit/s, 40 ms. Interleaved blocks A B B A, 3 loads per post per block: **n = 6 per post per arm per device**, observation 9 s after load. p is the two-sided Mann-Whitney test; with 6 against 6 the smallest possible p is 0.002 (every B load beats every A load).

- **A** = the combined base `978662134` (main `ea7257598` + #1358 + #1370).
- **B** = this branch, `e500acb82` (the server article, the adoption and the tools on request).

The sample is the experiment's four imported Posts at their original addresses: O1 (31), O3 (192, a named anchor), V1 (1, a YouTube and an Instagram embed, a 519 KB cover) and M1 (5, a gallery of six images). Per-load rows are in `impl-lab/runs.csv`; the per-post tables are in `impl-lab/results.md`. Below, each range covers the four Posts and each value is a median.

### 1. Time to the text (the Post's own title and opening text visible)

| | phone | desktop |
|---|---|---|
| text visible A → B | 6,826–7,010 → **3,316–3,386 ms** (−3,510 to −3,655; p 0.002 for each Post) | 2,376–2,436 → **1,637–1,688 ms** (−688 to −799; p 0.002 for each Post) |
| downloaded before the text A → B | 773–794 → 181–184 KB | 787 → 181–184 KB |
| requests before the text A → B | 102–103 → 30 | 103 → 30 |
| CLS, worst load A / B | 0 / 0 | 0.005–0.006 / 0.005–0.006 (equal) |
| adoption | — | every B load adopted (24/24 on each device); the reader's place was the title or the credit line |

**Why the phone is at 3.3 s and not at the experiment's 1.9 s.** The experiment painted with an inline style of about 20 KB. The implementation paints with the page's own stylesheets, so the result is the same as the page's own render. Those stylesheets are about 62 KB gzip, they block render, and they are loaded through the template. On the phone the text appears when the largest of them finishes: `Sod2029Shell` is 41 KB and finishes at about 3.27 s, and `postReadingStyles` is 25 KB and finishes at about 2.86 s. They share the 1.6 Mbit/s link with downloads that start at the same moment as the document:

- 17 scripts, 225 KB;
- 4 fonts, 72 KB;
- the cover and a body image, 167 KB.

This is the main lever left for the text. It is **not built**; see "Not done".

### 2. Completion of the images (measured separately; earlier text is not an image result)

| | phone | desktop |
|---|---|---|
| cover download starts A → B | 6,714–6,841 → **1,392–1,430 ms** | 2,312–2,366 → 1,331–1,374 ms |
| cover finishes A → B | 150 KB covers: −2,738 to −3,400 ms (to 4,755–7,101 ms); V1, 519 KB: 9,722 → **8,716 ms** (−1,006) | −552 to −1,080 ms |
| **all** requested article images finished A → B | **later**: O1 +294 (p 0.041), O3 +445, V1 +1,174 (p 0.002), M1 +98 (p 0.39, not significant) | ±100 ms (O1 −52, O3 +98, V1 +96, M1 −12) |
| LCP A → B | O1 −2,324, O3 −3,682, M1 −1,502 (body images); V1 −6,378, **but there the LCP element is a paragraph**, not an image | not significant (p 0.09–0.70); the LCP element is the article itself |

So the cover starts with the document and finishes earlier. A large cover still finishes late: V1 ends at 8.7 s on the phone. On the phone, all the images together finish slightly **later**, because they now share the link with the page's scripts and stylesheets from the first second. The phone's LCP gains come from the article and its body images arriving earlier, not from the cover problem being solved. The size of the files is the separate image proposal (`docs/reviews/post-image-renditions-proposal-20261116`, in #1370).

### 3. Loading of the tools

In A the page renders the article and its tools together, so "tools ready" is the text time. In B "tools ready" is the moment the page's code has run and adopted the document article. From then on the tools are usable, and each tool's own code loads when the reader uses it.

| | phone | desktop |
|---|---|---|
| tools ready A → B | **later**: O1 +546 (p 0.009), O3 +442 (p 0.009), V1 +526, M1 **+1,941** (p 0.002); 6,826–7,010 → 7,372–8,914 ms | −36 to +152 ms (O1 and V1 not significant; O3 +64, M1 +152, p 0.002) |
| page JS downloaded before tools ready A → B | 583 → 511 KB | 583 → 511–518 KB |
| all bytes finished before tools ready A → B (phone) | O1 773 → 983, O3 794 → 921, M1 783 → **1,264** KB (V1's 519 KB cover is still downloading) | — |

The page needs less JS than before (the Post page graph is 206.4 → 145.5 KB gzip JS, 52 → 33 files). On the phone it is still ready later, by about 0.5 s and by 1.9 s on M1, a gallery whose six images now start at once. More bytes finish before the page is ready, about 1,264 KB against 783 KB on M1. This points to the link being shared with the early images and the stylesheets. That is a likely cause, consistent with the bytes, **not proven by a separate run**. On desktop the difference is ≤ 0.15 s.

The cost of each tool on use was **not measured** in the lab: the time from opening or approaching to the tool being ready. Each tool's own chunk is small: timeline 0.3 KB, follow 2.5 KB, comments 0.9 KB and save 0.9 KB gzip, plus shared chunks. The editors (15 KB) and the unit extras (36 KB) are for series and Preview only. On use, each tool shows the live loading state.

## Not done or not proven

In order of what it changes for the reader:

1. **The stylesheets before the first paint (the main lever for the text, not built).** The article waits for about 62 KB gzip of render-blocking stylesheets that share the link with the scripts, fonts and images (section 1). There are two directions, neither built nor measured:
   - The article's own rules, extracted at build time from the page's stylesheets and inlined. This needs a proof that the extracted rules give the same computed style; the experiment's inline style reached about 1.9 s on the phone.
   - A lower priority for the scripts and body images until the text paints.
2. **Tools ready later on the phone** (+0.44 to +1.94 s, section 3). The likely cause is link contention with images that now start early. It is not proven and not fixed. Possible directions are `fetchpriority` and lazy loading for body images below the first screen, with high priority for the cover only. **Decision: whether a later tools-ready on the phone is acceptable for a first release, or must be fixed before it.**
3. **All the article images finish later on the phone** (+0.1 to +1.2 s), even though the cover finishes earlier. A large cover still ends late (V1 at 8.7 s). The file sizes are the separate image proposal.
4. **Font swap on long titles.** On the phone the Hebrew fonts finish at 2.3–3.6 s, so a title painted at 3.3 s can still change shape. The CLS measured 0 in every load, but a visible reflow of a title is not CLS. A metric-matched fallback (`size-adjust`) is a presentation decision for the Visual Language owner; it was not tried.
5. **jsdom 25.0.1 as a production server dependency.** It loads in 279–350 ms in the background, and the process uses about 152 MB. **ZURIEL's decision before any release.** These were not measured on Vercel:
   - the function's cold start;
   - the function bundle size with jsdom;
   - memory on Vercel.
6. **63 of 1,175 candidate Posts are not proven** and stay on the existing path. Their ids are in `article-first-proven.json` → `differ`. The causes of each difference were not classified.
7. **The proof list is a committed, generated file.** `scripts/build-article-first-proofs.mjs` needs an anonymous REST read and Chromium, and it is not part of the release build. A Post edited after the list was built is detected by its source key and served on the existing path until the list is rebuilt. Who rebuilds it, and when, is undecided.
8. **Not verified:**
   - No CI: this branch has no PR. Everything here is a local run.
   - No Vercel Preview, which requires approval.
   - No real network or CDN; only the lab.
   - The time from opening or approaching a tool to that tool being ready.
   - A screen reader before and after adoption.
   - What search engines do with the article now present in the document. The canonical and the metadata are unchanged and are covered by the existing tests.
9. **Seen on the combined base, not caused here, not fixed here:**
   - A side-panel shift when the reader scrolls very early.
   - On the base, a direct link to a named anchor does not scroll, because the article renders late. With the article in the document, the browser opens the anchor natively (browser acceptance 2).
10. **Order.** #1358 and #1370 come first: they are not in `main`. If they change, this branch takes their new heads again. Then the decisions above. Then a PR with CI on the exact head, a protected Preview on approval, and a release on approval of the exact commit and deployment. Analytics is untouched.
