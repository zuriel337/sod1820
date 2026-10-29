# אהבת תורה — הגהת טורי השרשים מול המקור

BEFORE · actor GPT · to ZURIEL · task `AHAVAT_ROOTS_SOURCE_PROOFREADING_20261029`.

- Base: `15b587f7bfb45bc2af7462b3426c4bdef942272c`; isolated branch `codex/ahavat-torah-roots-source-proofreading-20261029`.
- Fresh canonical read-only coordination check: `supabase_read_only_user`, transaction read-only `on`; bounded relevant current scope scan found a documentation-only contract claim and no overlapping roots/runtime writer. No live BEFORE row is claimed.
- Owners: Intake v13, source identity v2, Truth Axes v3, Experience v10; coordination v17. Reuse existing reader and adopted presentation. No new owner, lexical registry, engine, visual surface or CSS redesign.
- Scope: visually compare physical PDF pages 31–35 with the ten existing OCR columns; append only source-readable glyph adjudications, preserve all earlier correction IDs and raw OCR, connect evidence to the existing lazy reader/search, and verify affected source/return flows. Read preceding context only as needed.
- Original PDF SHA-256: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b` (`book:hebrewbooks:5635`). This is not an independent proof of 1,820 entries, modernization or a full lexical segmentation.
- Planned paths: `src/data/ahavatTorahRootsCorrections2029.js`, existing roots data helper/reader only as required, roots tests, this report and bounded acceptance evidence. Original source PDF/OCR, unrelated commentary, Yetzirah, Legacy, main, DB/RLS/permissions and Production remain untouched.

## Result

Visually compared all ten original bounded columns (PDF 31–35), including higher-resolution follow-up for misleading glyphs. Appended **259** local source readings to the adopted fifteen, for **274** before/after windows. A window can span more than one word or glyph; these are not 274 lexical roots, engine results or fully verified quotations. Earlier fifteen record objects/IDs remain byte-identical when serialized; all raw OCR/source assets and earlier commentary remain unchanged.

| PDF | Column | Reading windows, including earlier fifteen | Bounded unresolved windows |
| --- | --- | ---: | ---: |
| 31 | right | 28 | 1 |
| 31 | left | 23 | 1 |
| 32 | right | 33 | 1 |
| 32 | left | 48 | 1 |
| 33 | right | 37 | 1 |
| 33 | left | 27 | 2 |
| 34 | right | 31 | 1 |
| 34 | left | 36 | 1 |
| 35 | right | 4 | 1 |
| 35 | left | 7 | 1 |

The existing lazy reader/search presents both spellings under the same ten source-native column identities. Source details retain the untouched machine text, eleven bounded unresolved windows with `proposedReading: null`, and an explicitly expanded before/after record list. Each comparison identifies its original **OCR** line (not a printed source line) and opens the exact PDF page while keeping the column's existing return/deep-link identity. Comparison lists are not mounted until explicitly expanded. No styles, source tables, numerical values, spatial renderer or shared frame were modified.

Source comparison rejected misleading regularizations as well as accepting corrections: printed `הרחים` was not changed to `הרדים`; the unclear `ובאורח` was left unresolved rather than silently shortened. The eleven open windows are a bounded follow-up list, **not** an exhaustive inventory of all residual errors. The ten columns remain partially proofread reading aids. No automatic tokenizer, modern three-letter-root rule, independently counted 1,820-entry dictionary, new 3D geometry or canonical verification claim was introduced.

Raw OCR SHA-256: `c4dc52ea138c99ed33bee9de274e78b0c041fc69fa60b25e95f0224be28108f8`.
Adopted first-fifteen serialized-record SHA-256: `0357d557ef97ceda336650102b38d87ea59e821add321b37073c6131fc1f00e0`.

## Acceptance

Source, native and existing-reader acceptance completed. Final external Preview acceptance is recorded separately, after the immutable checkpoint is pushed. No external hosted result is inferred from local fixtures.

### Native PDF acceptance correction, not a product change

The initial native assertion required Chromium's `pageSelector` counter to equal the requested page. It failed at 320 pixels although the verified original loaded all 99 pages: the native viewer showed several complete pages at once under FitH. A bounded geometry probe measured physical page 31 (zero-based index 30) at `y=0.775862` with height `255.982759`; the previous page ended at `y=-4.293103`. Chromium's central/most-visible page counter read 32, because the following page occupied the viewport centre. This was not evidence that the source anchor had moved to 32.

The acceptance-only predicate now checks the loaded native viewer's actual rectangle for the **requested physical page**, its top alignment (native inset/subpixel tolerance at most 8 CSS pixels), the preceding page ending above that inset, positive rendered dimensions and the full 99-page document. It does not use the central page counter or accept a matching iframe URL alone. A regression rejects the adjacent page at `y=261.83`, even if the central counter matches that adjacent page. No reader navigation, stylesheet, source URL, timeout or test budget was weakened for this correction.

The revised native story passed **9/9 display contexts**, 45 physical-page checks (31–35), nine fullscreen transitions and nine returns with focus held for 250 ms; 1/1 test, zero failures/skips, 115,632 ms. The ten-column comparison/search/evidence matrix separately passed all nine contexts, 90 column visits, 2,466 row comparisons, 180 source/return checks and 90 reloads. Its PDF requests were aborted and it is not native evidence. The local native story serves hash-matched original bytes through a fixture and does not itself prove an externally hosted deployment. A post-return full-locator capture can precede native-compositor repaint; those captures are not used as visual PDF proof. Protected hosted viewport captures are a separate acceptance step.

### Completed verification

- **391/391 Books non-browser tests**, zero failures/skips. The full selected Books inventory covers both `src/` and `test/`, not just the newly added file. It includes preservation of original OCR/earlier fifteen IDs, exact application, dual-layer search for all 274 windows, unresolved-null preservation, malformed/duplicate/missing-source rejection, and the native geometry negative cases.
- Existing browser stories: **5/5**, zero failures/skips, 385,151 ms total. Original Books-entry/exact-unit test passed all nine contexts in 145,815 ms within its unchanged 180,000 ms budget; people/roots/megillot 88,330 ms; eight unified readers at all three widths 61,322 ms; two-book wide layout (18 book/width/theme contexts) 73,224 ms; original native PDFs (99 and 220 pages) 14,380 ms.
- Language **3/3**; Auth Guard **4/4**; Legacy Production Lock, isolation, cheap hardening and `git diff --check` passed, including a final guard rerun. No test, budget, flag, permission or source check was weakened.
- Normal 2029 and two-flag Preview builds/graph gates passed: **379,579 / 376,906 eager gzip bytes** respectively (Preview 7 eager / 144 reachable records). The **actual integrated protected-Preview build** also passed its graph gate: **377,228 bytes**, 8 eager / 151 reachable records. Its extra existing Preview flag is measured separately, not presented as the two-flag output. Existing chunk/dynamic-import warnings remain warnings; no warning-free claim.
- Fresh live coordination recheck before the final documentation write found no overlapping source/runtime writer. Site/main was independently checked with `ls-remote`: still `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; no main merge/fetch integration was performed. Vercel's pinned Legacy deployment was READY at `99249526e91f1d720fae1aa43e82bbbe51ee5c45` with all three canonical aliases before Preview creation.

Commands and receipts: full non-browser inventory via `rg --files test src` → Books-family tests excluding `.browser.` → `node --test`; new comparison matrix and corrected native partition in `test/ahavat-torah-roots-proofreading-2029.browser.test.mjs`; existing reader/source/wide/unified browser files run serially; `npm run build:2029` normally and with the two Preview flags; actual `preview-deploy` build plus the graph test rooted at that output; existing language/auth/Legacy/isolation/hardening scripts. Bounded machine receipt: `ahavat-roots-source-proofreading-20261029.acceptance.json`. Local raw logs remain in `/tmp/ahavat-roots-*-20261029.log`; protected external receipts/captures are under `/workspace/artifacts/ahavat-roots-proofreading-preview-20261029`, outside Git and without a committed share token.

## Stable handoff

- Branch: `codex/ahavat-torah-roots-source-proofreading-20261029`.
- Base: `15b587f7bfb45bc2af7462b3426c4bdef942272c`.
- Source checkpoint: `2b363b10b4133f3e62783f1bc13779813127a91d`.
- Acceptance correction: `4eb9a5a2fe4325e2692959d62cc0765a2bdcaa9f`.
- The following documentation-only commit completes this checkpoint; exact final HEAD, full range and remote/clean verification are supplied to ZURIEL after push. No self-referential HEAD or share credential is embedded here. All nine changed paths are enumerated in the machine receipt.
- Dependencies: the existing React reader, original 99-page source and ten bounded OCR columns, existing Vite/Playwright/Chromium test tooling and protected static Preview build. No dependency/lockfile, source asset, shared renderer, database, permission or contract migration is required.
- Remaining: further source-letter and OCR-format proofreading, the eleven bounded unresolved windows (not exhaustive), the author's lexical-unit criterion, an independent 1,820-entry count if separately commissioned, and book-level numerical/spatial work carried by earlier handoffs. No new model or whole-book 100% completion is claimed here. Earlier 189 expanded companion units and both books' existing experiences remain unchanged.

AFTER · actor GPT · to ZURIEL · task as above · owners EXTEND_EXISTING Intake/Identity/Truth/Experience · **IMPLEMENTED / TESTED / BRANCH_ONLY**. Source/test/documentation writing ends at this checkpoint; local file ownership is released for handoff. The verified connector is read-only: no live BEFORE/AFTER row or live ownership release is claimed. Protected Preview creation/verification may follow from this exact immutable commit; it does not authorize another content stage, integration, main, Production, Legacy, DB/RLS or permission changes.
