# Posts 2029 — legacy-grade finish (Preview only, not merged, not released)

Base: origin/main 2195c9784 · branch claude/posts-2029-legacy-design-5fvsyw · scope: Post components/styles only.
Live data: 5105 koach-hashtika-dim5 · 5018 chibur-bein-hasafot-mafteach-lagan · 5003 matrix-506 (read from Supabase at preview time).

## What changed
- `src/pages/post2029-legacy-grade.css` (new): typography, hero rule, framed cover, pull-quotes, framed media, claim boxes, per-character illustrations. Only `--s29-*` tokens: night/day/parchment unchanged site-wide.
- `src/lib/postCharacters2029.js` (new): character derived from the post itself (`-dim5` slug, `sgx` markup, POST_FX slug). A new post of the same kind needs no list edit.
- `src/pages/Post2029Page.jsx`: `data-post-character`; matrix opening reuses POST_FX + MatrixRain (static under reduced motion); one closed «מקורות וקשרים» entry wraps the existing convergence measures, connections, timeline and source footnote; section map / hash entries open it before scrolling.
- `scripts/test-post-characters-2029.mjs` (new).

## Character
- quiet (Dimension Five): narrow calm measure, diamond-marked pull-quotes, rounded sharp media.
- lexicon (language paths): the post's night-only `.sgx` panels re-seated on tokens (day/parchment now correct), tiles/letters/equations with gentle non-layout motion.
- matrix: contained dark opening with the existing rain, green only in the opening, the central cipher and the dotted operands; chapters get eyebrow + hairline.

## Truth/quality boundaries kept
- Legacy captions («עובדה מאומתת במנוע», «מאומת במנוע (רגיל)») stay as authored text and are labelled «טענת הפוסט»; no verified mark was added.
- No external-quality mark and no card rating shown as post quality: the convergence measures moved inside the closed entry (their own caveat unchanged). Gold is decoration only.

## Checks run
legacy-production-lock PASS · 2029-cheap-hardening PASS · public-2029-language PASS · experience-context PASS · post-characters PASS · `SOD_BUILD_TARGET=2029 vite build` OK.
Browser (Playwright, live data): dark/parchment/light × 1440 and 390 — `shots/`.
Flow: clicking 506 in matrix-506 opens the shared calculation drawer; section-map jump opens the closed entry (mobile); «עולם» → exact-return control restores /post/matrix-506.

## Not done / needs ZURIEL
- Commit b2302df44f5295f70ed67b21a2f8bff199999648 is not reachable from this checkout or origin (fetch: "not our ref"): the metrics/transitions infrastructure was NOT compared or merged.
- Exact-section return and "new finding appears without a manual list" were not proven here: matrix-506 has no mapped regions (return lands on the post top) and no new finding was injected (that needs a product write).
- Cover and first in-body image duplicate on 5105 (existing content/cover behaviour, left alone).
- No work_log DB record written (no DB writes in this task).
