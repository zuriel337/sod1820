# Old Posts, article first — the follow-ups requested for PR #1371 (16 November 2026, afternoon)

ZURIEL's follow-up requirements (recorded by Codex in `docs/reviews/cls-performance-diagnostic-20261116/ARTICLE_FIRST_READABILITY_APPROVAL.md`, codex/cls-diagnostic-20261116 `0bb87ae5e`) were:
- text first: shorten the wait for the first paint, without paragraphs or anchors jumping;
- yellow and white from the old site keep their meaning and read in light and dark, including passages with their own black background;
- fonts: Hebrew, vowel marks and digits readable, nothing moves when a font arrives;
- images: small and responsive copies, the source kept, text and diagrams still clear;
- tools: they may load later, in the background, but must respond when opened;
- check the cold start on Vercel;
- rebuild the proof after the design changes.

ZURIEL approved the directions (jsdom, fonts and their fallback, colours, smaller images); this file records what was built and measured. **Branch only.** PR #1371, branch `claude/old-post-article-first-20261116`. No merge, deployment, Preview, database, flag or alias change.

## What was built (commits on the branch, oldest first)

| commit | what |
|---|---|
| `23c70ddfd` | **One design before and after adoption.**<br>The document article now sits in the page's own frame (`postArticleFrame2029.js`: `.sod29-root` with the System Frame's token style for the reader's preset, `.sod29-main`, `.sod29-main-stage`, `main.sod29-content`). It carries the page's own header: chips, details, the frame's orientation mark, the legend, the cover and the section navigation, inactive until the page takes over. The reader's theme is set on `<html>` before the first paint.<br>A **portable pipeline:** comments and noscript fallbacks leave the displayed copy; authored `<style>` blocks are scoped as text, not through the CSSOM; the semantic layer edits style attributes as text. Proven Posts went from 1,112 of 1,175 to **1,175 of 1,175**.<br>The **proof is keyed** by source and voice, and bound to the fingerprint of the code and of jsdom. A stale proof means the build serves nothing ("off"), and a CI test fails until the proof is rebuilt.<br>**waitUntil** for the cold load. |
| `14cb794db` | **Historical colours** (`postLegacyColor2029.js`): an authored text colour below 4.5:1 on a theme's reading surface gets its family's tone in that theme. Yellow keeps a highlighter under a darker amber. A passage with its own background keeps its colours, and its plain text reads on it. The same applies to authored stylesheet rules. The source is unchanged. Also `scripts/check-article-first-cold.mjs`. |
| `63e64f98a` | **Smaller copies of the article's images** from the Storage render endpoint at 480, 768, 1080 and 1600 px (contain, quality 80, never enlarged). They apply only where the markup reserves the size; the original stays the `src` and what the viewer opens; the cover gets the same. Also `scripts/warm-article-image-renditions.mjs`. |
| `d9798b699` | **Fonts:** the body face as WOFF2 (11.2 KB instead of 27 KB), plus local faces with matched metrics per face, weight and script (`FONTS.md`). |
| `14b1027fe` | **First-paint stylesheet:** the page's own stylesheets, without the rules that cannot match the first document. It is 50.8 KB raw (about 9.6 KB gzip) instead of 397 KB (63 KB gzip) and sits in the head; the full stylesheets come after the article. Every other document drops the template. |
| `98d5c062c` | The reader's place is corrected only in settled frames, never inside the adoption itself (the lab showed one frame 48 px off). Also no-JS, landmark and per-frame acceptance tests. |
| `41cc98778` | The timeline loads when "מקורות וקשרים" opens, not on approach. This fixes the Release Visual Gate, which expected it there (locally 20 of 20). |
| `26c1add98` | The first-paint rules lead until every full stylesheet has arrived. They sit under a temporary class on `<html>`, raised by exactly (0,1,1), and a script after the last full stylesheet removes it. So an earlier file can never beat a later one while the parser applies them one by one. |
| `9852baf0b` | **Fonts:** one Rubik file for Hebrew text, with its spaces, digits and punctuation (`Rubik-Hebrew-Common.woff2`, 15.1 KB, preloaded), and local stand-ins per weight. This removed the phone layout shift in Post 192, CLS 0.139 → 0.000 (`FONTS.md`, follow-up section). The proof was rebuilt: 1,175 of 1,175. |
| *(this commit)* | **Image copies know each original's real width** (ZURIEL: "תעשה", 16.11.2026).<br>Supabase never enlarges an image, so a "1080" or "1600" copy of a narrower original was the original re-encoded, and sometimes heavier: O1/O3's cover was 157 KB against 151 KB. Of the 3,268 originals of the 1,175 proven Posts, 3,266 were measured. 18% are 565 px wide or less and need no copy at all; 39% need only the 480 copy, 27% the 480 and 768 copies, and 16% are wider than 1,270 px.<br>`scripts/scan-article-image-facts.mjs` reads the real width from the first bytes of each original. This is a range request on the public file, not a transformation, so nothing is billed but the bytes read.<br>A copy is then offered only up to 85% of that width, and the original itself is the widest candidate at its real width. An original too small for any copy keeps no set.<br>The copies to generate and warm fall from 13,076 to 4,782 (`scripts/warm-article-image-renditions.mjs --all --dry-run`), and 596 originals need none at all. The list is `public-reading-deploy/article-image-facts.json` (408 KB, read by the server function only).<br>The first document carries the widths of its own images (`data-ssr-image-facts`), so the page offers exactly the same copies. Without a known width the four copies remain, as before. |

## What is proven, and how

| claim | evidence | where |
|---|---|---|
| the server builds the browser's article | 1,175 of 1,175 candidates node-for-node (Chromium and jsdom) | `scripts/build-article-first-proofs.mjs`, `article-first-proven.json` |
| the proof cannot outlive its code | fingerprint of every file of `postArticleDocument2029.js` plus the jsdom version; the build is "off" when stale; CI test | `scripts/lib/article-first-fingerprint.mjs`, `test/article-first-proof-fresh.test.mjs` |
| the same design before and after adoption | every block keeps its place and size; title, credit, chips, details, body, emphasis and link keep their fonts and colours; the header markup is the page's own. Checked in dark, light and parchment, on phone and desktop, **with the full stylesheets held** | `test/article-first-browser-2029.browser.mjs` |
| the first-paint stylesheet is enough for real Posts | 120 real Posts × phone and desktop, 48,780 elements: the computed style and box of every element are equal with the first-paint stylesheet alone and with the full stylesheets. Light and parchment, 40 Posts each: equal, except one 1 px late-layout difference in one long Post (no style difference) | `scripts/check-article-first-critical-css.mjs` (local run; reads public rows) |
| no paragraph or anchor jumps | frame by frame around adoption, at the title and while reading paragraph 5: no frame shows the place elsewhere; a named anchor stays after the browser's smooth jump; the reader's paragraph stays within 2 px | browser acceptance |
| historical colours read | every tone at least 4.5:1 on its theme (yellow also on its marker); in Chromium, a mixed sample in three themes before and after adoption reads at least 4.5:1 (3:1 for large text), with the same colours | `test/post-legacy-color-2029.test.mjs`, browser acceptance |
| fonts | fallback width difference: title +4.9% → −1.2%, mean 1.0% → 0.3–0.4%, no line-count change (loaded vs every font failing) | `FONTS.md` |
| no-JS reading | one main landmark, its first heading the title, right-to-left, links reachable by keyboard, the hold leaves only the opening bar | browser acceptance |
| status and hidden content | not proven, edited, special, hidden, missing, unavailable, another address or a query string: today's document, never an article; 404/503/hidden as before | `test/article-first-document-2029.test.mjs`, `test/post-document-status-edge-2029.test.mjs` |

## Lab: text, images and tools, separately

Lab harness: `lab2.mjs`, in Chromium with the real built artifact, a fixture of the public rows, and the server function with jsdom. Each post is a cold load in a fresh context.
- **Phone:** Slow 4G with 4× CPU.
- **Desktop:** broadband.
- **Arms:** A = the combined base `978662134`; B = `98d5c062c`, the follow-ups before the fonts fix. They ran in interleaved blocks A B B A.
- **Sample:** n = 6 per post and arm. p is Mann–Whitney.
- **Posts:** O1 and O3 are imported prayers; V1 is a video Post; M1 is a long Post with many images.
- **Text:** the browser's paint record of the title (largest-contentful-paint of the H1). The lab's own probe waits for an animation frame, which the document delays to `DOMContentLoaded`; it is reported as well.

**1. Text (the title and opening paragraphs visible)**

| | phone A → B | desktop A → B |
|---|---|---|
| text visible | 6.84–7.14 s → **1.66–1.78 s** (−5.2 to −5.4 s, p 0.002) | 2.38–2.75 s → **1.63–1.89 s** (−0.70 to −0.94 s, p 0.002) |
| finished before the text | 784–794 KB, 106–107 requests → **23–28 KB, 5–8 requests** | 787–836 KB, 106–108 requests → 161–360 KB, 29–32 requests |
| lab probe | 6.84–7.07 s → 3.57–4.29 s | 2.38–2.46 s → 1.76–2.13 s |
| first contentful paint | 1.79–1.86 s → 1.66–1.78 s | 1.49–1.50 s → 1.63–1.89 s (+130 to +400 ms: the first paint is now the article itself, not the opening bar) |

**2. Images (separately; earlier text is not an image result)**

| | phone A → B | desktop A → B |
|---|---|---|
| cover starts | 6.7–6.9 s → **1.46–1.51 s** | 2.33–2.40 s → 1.35–1.40 s |
| cover finishes | −3.2 to −4.8 s (p 0.002) | −0.8 to −1.2 s (p 0.002) |
| cover bytes | V1 519 → 229 KB, M1 148 → 84 KB; O1/O3 151 → 157 KB | V1 519 → 126 KB, M1 148 → 84 KB, O1/O3 151 → 109 KB |
| largest contentful paint | −3.2 to −4.8 s, the cover | −0.45 to −0.85 s, the article |
| all requested images finished | O1 +550, O3 +284, V1 −848, M1 −1,114 ms | −134 to +576 ms |

After adoption the lab requests the cover a second time; that is why B shows one image file more. The lab intercepts every request, which turns off the browser's memory cache for it. A real browser answers the same candidate from memory. Not measured on a real device.

**3. Tools (they load when used)**

| | phone A → B | desktop A → B |
|---|---|---|
| the page code has run and adopted the article | +0.30 to +1.06 s | +0.11 to +0.59 s |
| open "פרטי הפוסט" → share usable | 0 → 335–347 ms | 0 → 318–324 ms |
| go to the end → comment archive usable | 0 → 454–502 ms (O1 has none) | 0 → 408–692 ms |
| adoption | adopted at title or byline, reader's place corrected by 0 px, 24 of 24 | adopted at title, 0 px, 24 of 24 |

Layout shift (CLS, max per arm): phone A 0.000, B 0.000 except O3 0.139. That was the Rubik mixed state, fixed in `9852baf0b`. Desktop 0.005–0.007 in both arms.

**Confirmation on `9852baf0b` (the fonts fix), and what changed against B:**
- **The first series was not fair** (`followups-lab/impl3-results.md`).
  - C was built with the production analytics IDs and A and B without them. So gtag and fbevents (about 600 KB) loaded only in C, from 5.1 s on the phone, competing with the page's code. C's page-ready on the phone came out 0.5–0.9 s later than B.
  - **This is information only; analytics were not touched.** On the live site, on a slow phone, these scripts take the line just when the page's code loads.
- **The fair re-run** (`followups-lab/impl4-results.md`: phone, C rebuilt without the IDs, A C C A, n = 6) gave:
  - **text** 1.77–1.83 s, against 6.89–7.07 s for A. That is 55–105 ms later than B in the earlier series; the Hebrew Rubik file is 5.8 KB larger.
  - **CLS** 0.000 in all 24 runs except V1 (0.002, as in A). O3's 0.139 is gone.
  - **page ready** +0.52 to +1.21 s against A (B was +0.30 to +1.06 s).
  - **share usable** 333–350 ms after the click; **comments** 476–506 ms.
  - every run adopted the article at its title or byline, correction 0 px.
- **Is the first-paint guard costly?** (`followups-lab/impl5-results.md`; the same documents with and without it, C U U C, n = 6)
  - No measurable difference: page ready −74 to +68 ms and long tasks −36 to −162 ms, none significant (p 0.31–0.82).
  - The same build measured in two separate series differs by 140–320 ms in page ready. So the 120–240 ms against B, measured in another series, is within that variation.
  - An interleaved B against C run was not made.

<!--LAB4-->

## Not done, not measured, decisions

**Not verified (needs an approval, or not yet run):**
- **Vercel cold start, function bundle and memory.**
  - Whether a cold instance finishes loading jsdom after it has answered (`waitUntil`) has to be checked on a protected Preview of the exact commit, with `scripts/check-article-first-cold.mjs`.
  - The bounded check is ready. The Preview needs ZURIEL's approval.
  - Until it runs, the share of documents that really carry the article is unknown. The `X-Sod-Article-First` header counts it per response.
- **Android.** Android has no Arial, so the local stand-ins cannot load there. Until Rubik arrives, the phone's own Hebrew font draws the text (Noto on most phones; Noto is about 5% wider than Rubik).
  - The header measured here does not change on Linux/Chromium with Arial-compatible fonts. On Android the swap was not measured.
  - This is true of the current production site as well.
  - A next step that can be measured: a second stand-in on the phone's own Noto Sans Hebrew and Roboto, with their metrics, checked in a Chromium whose only fonts are those.
- **A screen reader:** only the structure was tested (landmarks, heading order, keyboard).
- **Search engines:** the article is in the HTML of the document. The canonical and the metadata are unchanged, and nothing was measured.

**Decisions for ZURIEL:**
- `public/fonts/Rubik-Hebrew.woff2` is no longer used: no rule, no preload and no cache rule refer to it. Deleting it is a file deletion, so it waits for a decision.
- **Rubik's own kerning** between a Hebrew letter and punctuation now applies once the font has loaded. Examples: `ר:`, `ד?`, `ל-`. This is up to 1.4 px narrower on a long line; the glyphs and advances are unchanged (`FONTS.md`).

**Release steps (each needs an explicit approval of the exact commit):**
- **The order:**
  1. #1358 and #1370 (parents, not in `main`). #1358 is being changed by another session; this branch will take its final head when that work is done.
  2. This PR, reconciled to them, with the proof rebuilt if the document's import graph changed.
  3. A protected Preview and the cold check.
  4. The image warm-up for the Posts being released (`scripts/warm-article-image-renditions.mjs`). With the measured widths, there are 4,782 copies of about 2,670 originals for the 1,175 proven Posts (13,076 before); these are billed transformations. Supabase counts origin images transformed; check the price list before approving. Until a copy is warm, its first reader waits 0.9–1.9 s for that image only.
  5. The deployment by the documented procedure, then the canary.
- **The proof list is rebuilt** with `node scripts/build-article-first-proofs.mjs`:
  - after every change to the document's import graph or to jsdom (CI fails until then; `designTokens.js` is part of it);
  - after content edits, since an edited Post leaves the list until then and keeps the existing path.

**Known remaining differences:**
- **A reader who dismissed the orientation mark** gets the compact mark from the page at adoption. The first document always shows the full mark. Not measured.
- **The 1 px late-layout difference** in one long Post in light and parchment, with no style difference.
- **`DOMContentLoaded` now waits for the stylesheets after the article.** Before, they were in the head, so this was already true. The application starts after them in both cases.
- **The local stand-ins are matched by class means** (a running sample of each class), not glyph by glyph. While Rubik is on its way, a Rubik label can be slightly narrower or wider than it will be: the header chips of Post 192 are 1.7% narrower, with an identical header. A line that breaks only a fraction of a pixel from its edge can still break differently when Rubik lands. The browser acceptance and the lab measure this on the tested Posts only.
