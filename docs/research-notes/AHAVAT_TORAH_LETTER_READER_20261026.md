# אהבת תורה — קורא אותיות, 26.10.2026

Base: `ee2362a36c2581879ffb415eb841da9c0e1f7fc3`.
Branch: `codex/books-ahavat-torah-letter-reader-preview-20261026`.
Owner: source extraction under research intake; local Preview projection only.
BEFORE scope: new letter-source model and its test, existing AhavatTorahSystem2029Page / CSS, existing AhavatTorahSpatialScene2029 and focused browser regression. Live work_log_current query returned no overlapping active scope. The available database connector is read-only; no passive ledger row is claimed as written.

## Direct source reading

Source: `book:hebrewbooks:5635`, PDF 35–41. Full-page visual inspection plus native PDF crops. The detailed letter table begins on page 35, below the roots list, and ends on page 41 before the separate words table.

The source distinguishes 28 printed forms: 22 alphabetic letters, five final forms, and separate שׁ / שׂ paragraphs. In particular, the second כ / מ / נ / פ / צ-shaped sections are finals, not duplicate ordinary-letter entries. The new map preserves both shin marks and finals as distinct keys. Historical source reconstructions remain unchanged.

Aleph is printed entirely in the right column of PDF 35. All 54 parasha rows were re-read visually with their Hebrew numeral strings. Their five running checkpoints are:

| Through book | Printed running total | Decimal | Book contribution (difference) |
| --- | --- | ---: | ---: |
| בראשית | ז׳ אלף תרל״ד | 7,634 | 7,634 |
| שמות | י״ב אלף תתצ״ד | 12,894 | 5,260 |
| ויקרא | ט״ז אלף תתקמ״ט | 16,949 | 4,055 |
| במדבר | כ״ב אלף קע״ג | 22,173 | 5,224 |
| דברים | כ״ז אלף נ״ט | 27,059 | 4,886 |

Each book's row sum equals its contribution. Thus these subtotals must be read as **cumulative**. The historical thousands-scale hypothesis in P35_LETTER_CLOSURE is not needed to explain Aleph's apparent large gaps: its numeral readings and its treatment of running totals were mistaken. No typography-based multiplier has been added. Important directly re-read examples include נח תקס״ג=563, לך תרל״ו=636, תולדות תקכ״ח=528, ויקהל תפ״ה=485, תצא תקנ״ה=555.

The source claim is 27,059, preserved as printed. Arithmetic closure confirms the transcription's internal consistency; no independent corpus count or engine verification is asserted. The remaining forms have a complete source-page map; this checkpoint does not claim complete per-parasha transcription for them.

## Implemented / tested / handoff

Source-model checkpoint: `99411b84`. Interactive-reader checkpoint: `09e701cb`.
The final content checkpoint extends seven explanations in the shared book companion, PDF 35–41. These are source-linked companion explanations, not source quotations.

Implemented: 28-form selection with exact PDF page(s), deep-link form/book persistence across reload, Aleph's 54 rows with printed numerals, five book contributions and cumulative totals, book filtering, Hebrew-numeral/parasha search, count-proportional 2D and lazy 3D projections. Both projections use the same source model. Keyboard buttons and the complete table remain available independently of 3D interaction. Existing raw reconstruction rows are retained unchanged.

Verified: 31 non-browser Books tests; the browser flow at 320/390/1440 with finals, shin/sin, exact PDF anchors, search, 3D and keyboard/reload restoration; 3 public-language tests; 4 Preview Auth Guard tests; normal Build 2029 and a build explicitly enabling the protected Books preview; built dependency graph/weight gate (78,462 gzip bytes recovered); Legacy Production Lock; diff whitespace check. Browser screenshots were inspected outside the repository.

Remaining: full per-parasha transcription of the other 27 printed forms. No count for an untranscribed form is inferred from alphabet order, a corpus or a historical candidate. Historical dossiers remain provenance. The central books branch still requires integration of the preceding DS-01 branch and this dependent continuation; this branch performs no merge.

AFTER scope: released at handoff; actor GPT reports to ZURIEL in the active conversation. The branch and its Preview are reviewable outputs; no live work-log write, main change, Production action, Legacy edit, DB/RLS or permission change was made.

## Continued at ZURIEL's request — Bet, from checkpoint 63167fd8

The same bounded scope was resumed after a fresh live coordination read found no overlapping active writer. Bet's paragraph begins in the right column of PDF 35 and continues at the top of the left column. All 54 rows were visually re-read, including the printed numerals. The five cumulative checkpoints are 4,332; 7,437; 9,845; 13,393; 16,345. Their book contributions are 4,332; 3,105; 2,408; 3,548; 2,952. Every book row sum closes to its contribution. Examples directly re-read include שמות שט״ו=315, ויקרא ש״ו=306, מסעי ש״נ=350 and דברים של״ט=339.

The letter reader now selects a source reading by form, rather than always rendering Aleph data. The table, Hebrew printed numerals, search, five cumulative checkpoints, 2D bars, 3D bars and accessible labels all update together when switching between א and ב. The first checkpoint's generic source-location view remains available for the other forms. Both complete letter readings have exact PDF 35 anchors, independent data arrays and 108 source rows in total.

Updated remaining scope: full per-parasha reading of the other **26** printed forms. No other form is assigned a numeric total by inference. The source-model tests check both letters' complete cumulative chains and verify that a Bet search cannot return Aleph data. The browser regression exercises switching letters, Bet's 315 row, its 16,345 total and the updated 3D accessible label at 320/390/1440.

The previous checkpoint's protected hosted Preview was additionally verified in a real browser: HTTP 200, 28 forms, 54 Aleph rows, correct PDF 35/37 navigation, 3D, runtime noindex and no page errors. The generic Git Preview omitted the experimental surface; a deployment-specific build command enabled it without altering project environment settings. Headless browser requests were rejected by the existing bot classifier; ordinary-browser emulation passed, with no middleware or security change.

Bet checkpoint acceptance: **33/33 Books tests**, including the browser flow at all three widths, passed without skips; Preview-enabled Build 2029, graph/weight gate (78,458 gzip bytes recovered), language 3/3, Auth Guard 4/4, Legacy Production Lock and whitespace checks passed. Scope is released again at final handoff. The parent checkpoint remains intact; continuation is additive on the same isolated branch.

## Gimel and research export — continuation from 2cd52e6c

BEFORE: same isolated branch and bounded files, resumed on ZURIEL's instruction after a fresh live work_log_current query returned no overlapping active scope. The remote branch matched `2cd52e6c7b83a916332deef2c075589357bc1125`. The source PDF SHA-256 matches the shared companion manifest: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`.

Gimel's full paragraph is in the **left** column of PDF 35. All 54 parasha rows were visually read, with Hebrew numeral strings retained. The printed running totals are 577, 945, 1,332, 1,726 and 2,109. Bereshit, Shemot and Bamidbar row readings close to the corresponding contribution derived from consecutive printed checkpoints. Vayikra's row reading is 377 against a printed-checkpoint contribution of 387; Devarim's is 374 against 383. These residual reading gaps (−10, −9) remain unresolved: they are not a finding that the book is wrong, and no cell was changed to force closure. Total row reading is 2,090; the printed final claim remains 2,109.

The reader now has 162 rows across א/ב/ג. The form-specific source location is displayed in source details. It no longer makes an unconditional arithmetic-closure claim for every added letter. Book-level bars represent printed-checkpoint contributions; parasha bars represent row readings. Numerical comparisons and the unresolved gaps stay in the expandable source details. The PDF is available throughout.

Research export downloads the **current filtered rows** as a UTF-8-with-BOM CSV. Each row carries source identity, form, parasha, book, printed numeral, decimal reading, exact PDF page/link, the printed cumulative total, the book contribution, row sum and reading delta. It does not create a canonical finding, publish a record or write to the database. All three letters use the same export path; unread forms do not acquire inferred rows.

Remaining: full row reading for the other 25 printed forms, plus re-reading the two Gimel gaps. Historical reconstruction files and the preceding checkpoints are preserved.

Acceptance: **35/35 Books tests**, no skips, including full browser interaction/download at 320/390/1440; Preview-enabled Build 2029; built graph/weight gate (78,446 gzip bytes recovered); public language 3/3; Preview Auth Guard 4/4; Legacy Production Lock; whitespace check. The CSV browser test reads the downloaded bytes and verifies all 54 source rows plus the preserved reading delta. AFTER: bounded scope released at final handoff, branch-only output, no main merge, Production action, Legacy edit, DB/RLS or permission change. No live work-log write is claimed.

### Desktop visual follow-up from 41a8a040

Hosted visual inspection caught a real overlap hidden by the document's horizontal clipping: the story grid was 790px wide but its implicit child track expanded the tables to 918px. The letter reader began at x=463 while the PDF panel ended at x=530. The page-scoped story grid now uses an explicit `minmax(0,1fr)` column, allowing the existing table scroll containers to handle dense rows inside their own column. No SystemFrame or Legacy layout is changed. A desktop browser assertion checks the PDF panel's right boundary against the letter reader's left boundary, in addition to the existing 320/390/1440 overflow and source-navigation checks.

The extended browser flow passed at all three widths after the column fix, including the no-overlap assertion and CSV download. Preview build, graph/weight (78,468 gzip bytes recovered), Legacy Production Lock and whitespace checks passed. The browser timeout is 240s to accommodate the expanded three-width/three-letter/WebGL/download flow, which passed in 171s; assertions are unchanged. Final scope is released after this follow-up.

## Dalet — continuation from d16aaeab

BEFORE: resumed the same isolated branch on ZURIEL's request, base `d16aaeaba158cef4d9206d98978b7cb17f26ecc5`, clean tree and matching remote. A fresh bounded live ownership query returned no overlapping active Ahavat Torah scope. Bounded files: letter source model, existing reader wiring and dataset summary, focused model/browser tests and this note. No layout redesign, Legacy, database or permission changes. The database connector is read-only; no ledger write is claimed.

Dalet starts at the bottom of PDF 35's left column and continues at the top of PDF 36's right column. All 54 rows were visually re-read from the source scan, including enlarged numeral crops. Vayikra's first row is on PDF 35; its other nine rows and cumulative checkpoint are on PDF 36. Bereshit/Shemot are on 35; Bamidbar/Devarim are on 36. Exact row pages and the page of each book checkpoint are retained separately.

Printed cumulative checkpoints: 1,848; 3,312; 4,228; 5,851; 7,036. Derived book contributions: 1,848; 1,464; 916; 1,623; 1,185. All five row sums close. Re-read examples: תרומה ק״ב=102, קרח ק״נ=150, מטות קכ״א=121, מסעי קמ״ג=143, דברים קמ״ט=149, ראה קכ״ז=127 and האזינו ס״ה=65. Closure is a transcription check, not an independent corpus/engine result. Gimel's existing reading gaps remain unchanged.

Implementation scope: 216 source rows across א/ב/ג/ד, exact cross-page table/chart/3D navigation, both source pages exposed for the split Vayikra section, and CSV rows carrying their own PDF page rather than a letter-wide fixed page. Remaining full row readings: 24 printed forms, plus the two Gimel reading gaps.

Browser verification exposed forced smooth scrolling in the existing exact-source action despite reduced-motion preference, leading to unstable/occluded targets during long-table navigation. The source action now uses instant scrolling for that preference and preserves smooth scrolling otherwise. No frame/layout owner was changed.

Acceptance: **37/37 Books tests**, zero skips, including the 320/390/1440 browser flow (115s), split-book source navigation, actual CSV byte inspection and Dalet/book/page persistence after reload. Preview-enabled Build 2029 passed; dependency graph/weight passed (380,303 eager JS gzip bytes; 78,439 recovered); public language 3/3; Preview Auth Guard 4/4; Legacy Production Lock and whitespace checks passed. The unchanged source PDF was also fetched with HTTP 200 / application/pdf.

Changed files: `src/data/ahavatTorahLetters2029.js`, `src/data/ahavatTorahSystem2029.js`, `src/pages/AhavatTorahSystem2029Page.jsx`, `test/ahavat-torah-letter-reader-2029.test.mjs`, `test/ahavat-torah-spatial-tables-2029.browser.test.mjs`, and this research note. Dependencies: existing unified PDF reader, existing lazy spatial renderer and the preceding isolated branch checkpoints. Central integration is still a separate coordinator operation; this branch neither cherry-picks nor merges. AFTER: bounded writer scope released at final handoff to ZURIEL. No main, Production, Legacy, DB/RLS or permission change; no live ledger write is claimed.

## Full-material continuation — base 430f83eb

BEFORE: ZURIEL requested material completion first, with publication deferred until after completion. Same isolated branch; clean tree, remote HEAD `430f83eb1abae5128db9b4b8288e0dd34b9870fb`; remote main `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Fresh bounded live ownership read: no overlapping writer. Scope: existing Ahavat Torah source data/reader, source-text assets, focused tests and this note. Extend existing Intake/Truth owners only; no new engine, truth store, permission model, frame or visual design. Source numerals remain distinct from engine results. No publication/DB/RLS action is part of this material checkpoint; the read-only connector cannot write the ledger.

Heh and Vav were read visually across PDF 36's two columns, retaining all 54 printed numeral strings for each. Heh checkpoints: 6,283; 12,403; 17,069; 22,757; 28,055. Vav: 8,449; 14,630; 19,138; 25,133; 30,516. All five book row sums close in each letter. Examples requiring enlarged direct reading: Heh ויצא תר״כ=620, יתרו תכ״ה=425, תשא תשל״ט=739, אמור תקע״ה=575 and פנחס תר״ס=660; Vav יתרו שס״ח=368, ויקהל תקנ״ז=557, נשא תר״ג=603, בהעלותך תשכ״ב=722 and ברכה רמ״ב=242. Source closure is not a corpus count or engine match.

All 28 forms now have directly reachable reading material: 324 structured source rows across six forms; the remaining 22 forms have 32 ordered OCR fragments. The new asset is mechanically extracted from bounded column rectangles on the exact PDF hash. The reproducible extraction script rejects any different PDF. Column/page boundaries were inspected visually on PDF 36–41; footer catchwords below the main text are excluded. Final forms and shin/sin remain separate. OCR text is not numerically parsed, corrected to fit a sum, converted into quotations or upgraded to engine output. Missing/mismatched assets leave the PDF available and report an error rather than inventing material.

The dedicated Ahavat Torah surface now reuses the **existing** shared 99-page commentary asset, not a second explanation store. Each selected page displays its own title, companion explanation and reading points, with an exact-source action. The generic arc stays a fallback only. Page 45 remains blank/visual in the source-text layer; its guide explains the transition without inventing source text.

DS-04 direct re-reading: at the end of PDF 42's left column, enlarged photography reads **ש״ד אלף תתי״ב = 304,812**. The previous single-glyph uncertainty is resolved for the printed author total. The finding's existing identity is preserved, its exact source action now opens 42, and its presentation is source-verified (not engine-verified). The overall dataset remains partial because the per-parasha cells are not fully extracted. The older candidate in the historical source dossier remains provenance. PDF 42's shared companion was expanded to explain the cumulative book table and the separate five-scroll letter matrix below it.

Remaining research work is explicit: 22 forms still need numerical cell-by-cell transcription; two Gimel reading gaps remain; other partially extracted datasets and exact-witness/deep-research coverage are not declared complete. Reading access to the complete book is distinct from exhaustive research completion. Public publication remains deferred, not simulated with a UI label or a share token.

Acceptance: **40/40 Books tests**, zero skips, including full browser interaction at 320/390/1440 (127s). Browser assertions cover Heh/Vav row switching, correct totals, 3D, split-column/split-page OCR, exact PDF actions, CSV bytes, reload persistence and page-specific guides on 26/42/45/99. Source/model tests cover all 28 forms and all 99 commentary anchors, foreign-source/hash rejection and no numerical invention from OCR. Preview-enabled Build 2029 passed; graph/weight passed (380,279 eager JS gzip bytes, 78,463 recovered); public language 3/3; Auth Guard 4/4; Legacy Production Lock; whitespace check.

Files: existing letter and book data modules, existing Ahavat Torah page, shared commentary asset, new bounded letter-sections asset and reproducible builder, four focused source/model/browser test files, and this note (11 paths). AFTER at final handoff: source/reader scope released to ZURIEL; branch-only commit/push and protected Preview allowed, no merge, main, Production, Legacy, DB/RLS, permission or publication mutation. No passive ledger write is claimed. Existing unified reader/spatial renderer and preceding branch checkpoints remain dependencies; central integration is a separate authorized operation.
