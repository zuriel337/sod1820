# Number / expression page: Typography V2 and legacy-focus addresses (branch only)

Base `71709e4ba` (origin/main). Branch `claude/number-typography-v2-20261111`. Not merged, not deployed, no DB change.
Production at the time of writing: `dpl_3FKYGdd3vZzg4WH3Y5d2CDp9bMmq`, source `f250da9f7`.

## What changed

| Commit | Scope |
|---|---|
| Typography V2 | CSS only plus one `data-expression-size` attribute in `NumberCore2029.jsx`. Every `font-size` literal below 14px on the number, expression and drawer surfaces (and the timeline, verse cards and method lens they embed) is replaced by an alias of the canonical `--s29-type-*` token. Former 11.5-13.9px sentences and controls use the small/ui token (16px); smaller labels use the micro floor (14px; 15px for supporting labels and 16px for tiny controls at 1024px and wider). The compact drawer keeps the 14px floor. The expression heading follows its length (short 46px desktop / 28px phone, down to 21px for a verse) and wraps. Regular-expression chips get a second line before they are cut. The focal number keeps its sizes (74-126px default); only the fit-to-container floor for very long numbers rises from 16px to 28px. |
| Number URLs | `?focus=dna` (the legacy "open the convergence axes" pointer from the old calculator links `/number/N?from=calc&focus=dna&method=...`) was shown as the expression "dna". It and its method are now ignored, so the page opens as the plain `/number/N`; `cross` still works. "Show N without focus" navigated to `/2029/number/N` on public addresses; it now uses the public-release prefix. |
| og | A number beyond 32 bits cannot be admitted by `sitemap_numbers()`; the integer reader was still called and the page answered 503 (`/number/196500000000`). It now answers 200, `noindex, follow`, without calling the reader. |

## Measured (local public build of this tree vs. the same build of base; Chromium, live Supabase data)

Cases: 1440 / 390 / 320px; dark, light, parchment; `358`, `משיח`, a 36-letter and a 200-letter expression (28 cases).

| | Before | After |
|---|---|---|
| Visible text below 14px (share of characters) | 63-76% | 0.2% (shared surface-map label "אתה כאן" and decorative glyphs) |
| Text at 16px or more, phone | 15-23% | 49-58% |
| Text at 16px or more, 1440px | 16-30% | 70-73% |
| Focal number | 104px (1440), 65.6px (390), 40.2px (320) | unchanged |
| Expression heading | 18px (1440), 22px (phone) | 46 / 28 / 21 by length (1440 short/mid/long), 28 / 21 / 21 (phone) |
| Horizontal page overflow | none | none |
| Page height | 8,908px (1440), 11,487px (390) | 9,597px (+8%), 12,561px (+9%) |
| Focal number position on a 390px phone | 490px from the top | 516px |

## Not done / limits

- No hosted Preview: the protected review build is pinned to the review branch name in `public-reading-deploy/review-admission.js` (`REVIEW_BRANCH`), so a deployment of this branch is rejected by design. Changing that guard needs its own approval.
- `surfaceMapBar2029.css` (shared frame chrome) still has 8px/11px labels; it is outside the number scope.
- Browser tests `number-mobile-order`, `number-connections-route`, `number-zvi-public-research` were not run (they need the Playwright fixture and mock barrier); the 69 node tests that cover the number page, the focus parser and the type roles pass.
- `test/number-typography-v2-2029.test.mjs` is not yet listed in a workflow.
- Leading-zero addresses (`/number/0358`, `/number/00358`) are not changed; see the audit.
