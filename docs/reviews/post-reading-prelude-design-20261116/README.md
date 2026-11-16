# Old-address Posts: article text in the first paint — design for decision (16 November 2026)

Proposal only. Nothing here is implemented, merged or deployed. Owners it extends (no new owner): the public document handler (`public-reading-deploy/api/public-document.js` with `api/og.js`), the Post reader and its admission (`post2029ReadingProjection.js`, `publicPostBoundary.js`), the opening shell (`2029.html`, `Opening2029.jsx`) under the System Frame contract.

## Why

On an old WordPress address the visitor sees no article text until the browser has downloaded and run the entry (about 120 KB brotli), the System Frame and the Post page graph (about 330 KB gzip in 57 files). In the lab (emulated phone on Slow 4G with a 4x CPU slowdown) the text appears at about 7.4 s and the largest paint (the cover, or its full-width body copy) at about 10 s; the field p75 LCP for these addresses is about 6.1 s (all devices). The server already reads the post for its metadata, but the document keeps only the `<head>`: the body is the opening shell.

Everything shipped or prepared so far shortens that chain (one read instead of two on the server, the source read with the code, the edge lookup removed for browsers, a smaller frame; the cover hint was measured and reverted). None removes it. Google's Core Web Vitals "good" LCP is 2.5 s at p75.

## What would change

The document for an admitted public Post at its original address carries a **reading prelude**: the opening bar, the title, the cover image (`post.image_url`, the same element and priority the page uses) and the first part of the text as plain paragraphs. It paints with the document, before any script. When the Post page has rendered its own article, the prelude is removed in the same frame.

- **One source, one admission.** The prelude is rendered from the row the document handler already read, admitted by the same `isPublicPostReadingSource` rule the page uses (it now lives in `publicPostBoundary.js` and is importable by the server). A post the page would not show gets no prelude.
- **No HTML from the source in the document.** The server has no DOM and no sanitizer today, so the prelude carries text only: tags stripped, entities decoded, paragraphs from block boundaries, a length cap (proposal: about 1,200 characters or the first three paragraphs), then a "the full article is loading" line. Images other than the cover, embeds, gematria marks and links come only with the page. Adding a server sanitizer would be a new dependency and is not proposed for the first step.
- **Same text the reader sees.** The prelude is the beginning of the same article, so it is not cloaking; crawlers that do not run JavaScript (and AI crawlers) get the title and the opening text in the HTML.
- **No layout jump.** The prelude sits outside `#root` (React replaces `#root` on its first render), positioned exactly where the article column starts under the opening bar, with a small inline stylesheet (budget: 3 KB) that reproduces the article column's width, font, size and line height. The page removes it in a layout effect when its own article mounts. The swap must keep CLS within the existing 0.1 limit; the current field CLS p75 for these addresses is 0.001.
- **Removal is certain.** A timeout (proposal: when the page reports an error or not-found state, or after 20 s) removes the prelude too, so a failed page never leaves stale text. A signed-in visitor gets the same prelude; nothing personal is in it.

## Expected effect (to be measured, not promised)

FCP is unchanged (about 1.8 s in the lab, the opening bar already paints then). Text visible moves from about 7.4 s toward the FCP, because the text no longer waits for any script.

**The prelude does not by itself fix the late image** (corrected 16.11.2026; an earlier version of this section said it would bound LCP by the document plus the cover download, which the evidence does not support):

- On a slow link the cover in the document still shares the bandwidth with the entry, the frame and the Post page code (about 700 KB before the text today). The cover hint measured exactly this competition (`docs/reviews/post-cover-hint-20261116`): the cover started 3 s earlier, and the text of every old post came 0.35–0.5 s later. With the text in the document the text no longer pays for it, but when the cover finishes is not known until it is measured.
- On many old posts the largest paint is not the cover but a body image (O1, the top Search Console page: a wide banner cover, a larger body image). A text-only prelude carries no body images, so their LCP stays where the page code puts it, about 10 s in the lab.
- The image itself is the full-size original: on 410 migrated posts every `srcset` candidate is the same file. Making it smaller is the separate image proposal (`docs/reviews/post-image-renditions-proposal-20261116`), not this one.

So the expected, measurable gain of the prelude is the text (and what crawlers that do not run scripts receive). Any LCP gain is a hypothesis for the cover-only posts (about half of the WordPress posts have no body image) and must come from a measurement, not from this design.

## Costs and risks

- About 1–2 KB more per document (text + inline style), every old-address document.
- The swap is the risk: a visible jump if the prelude column and the real article column differ (theme, font loading, the frame's top bar height). It has to be built and measured on the real page at 360/390/430/768/1440 px in the three themes before any decision to release.
- The cover now competes with the entry script for the first second of bandwidth. This was measured for a document-level LCP preload on 15.11 and was a net loss for the text **because the text still waited for the scripts**; with the text in the document it is the other way round, but it must be measured again.
- Two renderings of the beginning of the article exist for a few seconds. They come from the same row; the page's own rendering wins.

## Decisions for ZURIEL

1. Whether old-address Posts may carry a text-only prelude of their opening (yes/no), and its length.
2. Whether the prelude includes the cover image.
3. Whether a later step may add a vetted server-side HTML sanitizer so the prelude can keep paragraphs' formatting, images and links.
4. After a measured protected Preview: release, or not.

## Plan if approved (branch only until then)

1. Server: a prelude builder next to the existing metadata reader, unit-tested for admission, escaping, the length cap and the absence of any source HTML.
2. Client: removal in the Post page's layout effect, plus the failure/timeout path; a contract that the prelude never survives the page's article.
3. Lab: the 15.11 instrument (Slow 4G and Regular 4G, cold and returning, O1/O3 and controls), plus CLS at five widths and three themes; then a protected Preview of one exact SHA and a browser acceptance there.
4. Release only on an explicit approval of the exact commit and deployment.
