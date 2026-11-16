# Article-first: approved direction and remaining acceptance

ZURIEL's 16 November instruction approves jsdom, changing fonts and their fallback, smaller image derivatives, and adapting historical yellow/white text for readable light and dark themes. These product choices no longer await another approval. Text-first is the priority; features remain available on demand. This note records the instruction and bounded source review, not completed implementation or a passing release review.

## Current candidate and ownership

- main / last released source: `ea7257598a5217b9a8de308cca1194ec4a027fbf`.
- Integrated implementation: `claude/old-post-article-first-20261116`, `1dc66cdd7dfbc6797fb86b96ef11ac500a7c3eec`.
- Includes #1358 at `221c26bc45bc51204d700e102cac22ec623557c1` and #1370 at `2165ec326d93936409c79fdfbea7895e9534b7a5`; neither is merged yet.
- Codex opened draft PR #1371 for CI and independent review of that exact integrated tree. The parent's green checks do not certify this tree. Changing a parent requires reconciliation before release; never publish the same changes again as separate source PRs.
- Claude remains the product implementation writer; this Codex work records approval, reviews source, and prepares release/CI. No product source, database policy, or deployment was changed in this step.

## Implement and verify within the existing presentation system

1. Historical emphasis: classify actual authored colors and backgrounds, including `font[color]`, inline styles and embedded stylesheet rules. Yellow/white must remain distinct emphasis or body roles, readable on the effective background. Do not apply a blanket dark foreground to text whose own panel is still dark. Preserve words, links, author attribution, original HTML and original media. Use existing theme tokens with measured contrast (4.5:1 ordinary text, 3:1 large text), plus visible distinction for links/emphasis.
2. Apply the same result before JavaScript and after article adoption, in light/dark and the supported parchment theme, mobile/desktop, direct/SPA/back/anchor navigation. Include examples with yellow emphasis, white text, black panels, mixed styles, Hebrew vowel marks, digits and long headings. Check font download failure and slow font arrival as well as the successful case.
3. First-paint CSS: extract the necessary article styles from the existing source of styling. Keep dimensions, font metrics and theme identity stable across adoption; do not maintain two drifting article designs. Measure text readiness, not only a smaller bundle.
4. Images: create responsive derivatives while preserving the source and an original/full-size view. Avoid cropping letters, diagrams and evidence screenshots; validate small image legibility. Reserve dimensions and aspect ratio. Give the actual opening image suitable priority; images below the reading viewport should not compete with the initial text. Measure complete-image time separately from LCP and text.
5. Tools: later background readiness is acceptable as a product tradeoff for earlier reading, but must not become a broken button or prolonged unexplained wait. Measure click-to-usable, loading/error/retry, and preservation of input. The reported background-ready metric does not settle this question.

## Source-review findings to resolve before release recommendation

- `public-reading-deploy/api/article-first.js`: the cold path calls `load().catch(() => {})` and returns immediately, with no awaited lifetime or `waitUntil` in that code. The local warmup measurement does not prove it completes in Vercel after a response. Verify actual cold/warm function behavior, bundling and memory in the authorized deployment environment. If background work is not reliable, use a supported bounded initialization strategy; retain safe fallback and report the proportion of requests that actually receive the server article.
- The proof manifest is keyed by a content-only FNV hash/length. `postArticleSourceHtmlFromRow2029` also depends on the transformation pipeline and voice metadata. Bind/rebuild proof evidence when relevant inputs, transformation code or DOM dependency change, especially during the newly authorized color/font work. Do not treat content-only equality as timeless proof. Classify the 63 excluded cases; preserve their existing readable path in the meantime.
- Existing `post2029-legacy-grade.css` maps several gold/cream colors for `data-post-character="matrix"`. The new server article is explicitly `plain`; those rules are not evidence that all imported yellow/white content is already readable. Audit the relevant plain article styles and representative source colors before claiming completion.
- Preview checks need public status/hidden-content parity, no-JS reading, selection and keyboard access, screen-reader heading/landmark order, anchors, and no reader movement/duplication at adoption. Old main defects remain identifiable, rather than being silently accepted as new behavior.

The source inspection above is bounded, not an exhaustive security/code review. No cold Vercel proof, theme screenshots, new image variants or full CI result were produced by writing this note. The next release candidate must carry those results and its exact source identity.
