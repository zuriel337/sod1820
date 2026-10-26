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

## Continued source transcription — base 7c4e5b2e

BEFORE: resumed on ZURIEL's instruction, same isolated branch, clean tree and matching remote HEAD `7c4e5b2e25ba2b60b97be47e1fa88b12e6937069`. Remote main remains `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; fresh bounded live ownership read returned no overlap. Scope: existing letter/book data, focused tests and this note, with existing reader wiring only where exact-source behaviour requires it. Research Intake/Truth owners extended; no engine, permission, frame, DB/RLS, publication or Production change. The available ledger connector is read-only; no BEFORE write is claimed.

Zayin was re-examined, but several dense numerals remain unresolved. It stays readable through its bounded OCR/source fragment, without newly guessed numerical rows. Work continued on Chet and Tet rather than inferring values to force closure.

Chet: 54 visually read rows, PDF 36 left column → PDF 37 right column. Mas'ei is on 37 while the preceding nine Bamidbar rows are on 36; Bamidbar's cumulative checkpoint and all Devarim rows are on 37. Running totals: 1,844; 3,361; 4,481; 6,180; 7,189. All five row sums close. Enlarged source checks include בא ק״כ=120, תרומה קע״ב=172, תשא קצ״ה=195, the Shemot subtotal ג׳ אלף שס״א=3,361, ויקרא רמ״ה=245 and מסעי קע״ג=173. No corpus count/engine result is asserted.

Tet: 54 visually read rows, PDF 37 right column. Running totals: 308; 656; 1,148; 1,545; 1,804. Four book sums close. The current Vayikra row reading totals 491 against a checkpoint contribution of 492 (−1); תזריע remains נ״ו=56, not increased to fit the subtotal. The source checkpoint and source row reading are preserved separately. Examples: וירא מ״ד=44, תשא ל״ג=33, ויקהל נ׳=50, נשא נ״ז=57 and עקב ל״ג=33. Existing Gimel gaps remain unchanged.

Kaf: 54 visually read rows, PDF 37 left column. Running totals: 1,909; 3,683; 5,255; 6,833; 8,612; all five book row sums close. Direct enlarged re-readings include ויחי קי״א=111, משפטים קנ״ו=156, תרומה ק״כ=120, אחרי קמ״ו=146, בלק קכ״ה=125, מסעי ק״י=110, עקב רי״ד=214, ראה שכ״ג=323 and שופטים קנ״א=151. Kaf and final Kaf remain separate identities; final Kaf does not inherit numerical rows. A local Hebrew Tesseract read was used only as an additional reading aid alongside the source photograph/native OCR, never as engine verification or an automatic numerical import. No OCR model/runtime was added to the application or repository.

Yod and final Kaf were also inspected but not converted into numerical rows while their dense readings remain unsettled. Their complete existing OCR fragments and exact source actions stay available. Current coverage: nine structured forms / **486 source rows**, with 19 other forms still readable through the source/OCR layer. The retained OCR asset also preserves the newly structured forms' earlier transcripts as provenance; it is not used to generate their numbers.

Acceptance: **43/43 Books tests**, zero skips, including the 320/390/1440 browser flow (154s). The browser checks Chet's Bamidbar checkpoint on PDF 37 versus its first row on 36 and Mas'ei on 37, source/3D selection, Tet's actual downloaded CSV with the −1 gap, Kaf's 146 row and distinct final-Kaf fallback. The desktop reload test explicitly reopens the lazy 3D scene after reload; scene visibility is not falsely assumed to persist. Preview-enabled Build 2029 passed; dependency graph/weight passed (380,282 eager JS gzip bytes; 78,460 recovered); language 3/3; Auth Guard 4/4; Legacy Production Lock and whitespace checks passed.

Changed paths: letter source model, existing book dataset summary, focused letter model/browser tests and this note (five files). Dependencies: preceding isolated branch, existing PDF reader, existing lazy spatial renderer and retained source/OCR assets. Local OCR aid language-data SHA-256: `dbaa827aea6bc21215638447f17783a1004987c2d0bf5573d111fee397abdae5`; temporary tool input only, not an app dependency. AFTER at final handoff: bounded writer scope released to ZURIEL, branch-only output and protected Preview; no main merge, Production, Legacy, DB/RLS, permission or publication change. No live ledger write is claimed. Remaining: 19 numeric-form readings, three preserved reading gaps (Gimel −10/−9, Tet −1), other incomplete book datasets and central integration.

## Lamed and Mem continuation — base a98faa0c

BEFORE: ZURIEL requested continuation in the same isolated branch. Base `a98faa0c1caf9a3fd8190195d92a9b5071216745`, clean worktree and matching remote. Fresh bounded ownership query returned no overlapping Ahavat Torah writer. Bounded scope: existing letter source model, dataset summary, focused model/browser tests and this note. Existing Intake/Truth ownership applies; source readings are not engine results. No frame/design, Legacy, DB/RLS, permission, main or Production changes. The connector is read-only; no live work-log write is claimed.

Source photography/native OCR and temporary local Hebrew OCR were re-read for Zayin/Yod and the following forms. Unsettled glyphs remain in their existing OCR/PDF layer rather than acquiring inferred numerical values. This checkpoint structures Lamed and Mem only. Mem-final was also inspected, but unresolved cells remain for a later source-reading checkpoint.

Lamed: 54 explicit source numerals. Seven Bereshit numerals are on PDF 37; Vayishlach's numeral, the other 47 rows and all five printed checkpoints are on PDF 38. The split label/numeral boundary is explained in source details; row actions, parasha bars and CSV resolve the numeral's own page. Printed cumulative totals: 5,275; 9,566; 12,654; 17,482; 21,570. Row sums close in Bereshit, Shemot and Bamidbar. Vayikra is 3,087 versus a printed-checkpoint contribution of 3,088 (−1); Devarim is 4,087 versus 4,088 (−1). The direct readings ויקרא ת״ע=470, אחרי של״ז=337 and דברים ת״ו=406 are retained rather than silently incremented. Earlier Gimel/Tet gaps remain unchanged.

Mem: all 54 rows are on PDF 38's right column. Running totals: 3,421; 6,728; 8,762; 12,143; 14,465. All five row sums close. Enlarged source readings include וישב רע״א=271, יתרו קצ״ג=193, תרומה רל״ו=236, מצורע רט״ו=215, אחרי קנ״ט=159, במדבר תע״א=471 and מסעי שכ״ח=328. Mem-final remains a distinct form with its existing two-column OCR/PDF access, not numerical inheritance.

Coverage: **594 structured rows across 11 forms**; 17 other forms retain their source/OCR reader. The retained 22-section/32-fragment asset is unchanged provenance, not a numerical parser. All 28 forms remain readable, as do all 99 book PDF pages and their existing guides. Numerical source completion is not exhaustive research completion or public publication. No new application dependency, OCR model, engine or 3D implementation was introduced; the existing lazy scene renders these additional actual book tables.

Acceptance: **46/46 Books tests**, zero skips, including browser 320/390/1440 (156s). New assertions cover Lamed's 37/38 row/checkpoint boundary, preserved −1/−1 reading gaps, Mem's 54 rows/five checkpoints, distinct final-Mem OCR, source actions, 3D labels and no overflow. The earlier cross-page raw-OCR browser example now uses final Nun (38→39), since Lamed is structured. Preview-enabled Build 2029 passed; graph/weight passed (380,280 eager JS gzip bytes; 78,462 recovered); language 3/3; Auth Guard 4/4; Legacy Production Lock; whitespace check. Existing build warnings about large chunks/mixed static and dynamic imports are not introduced or changed by this source-only checkpoint.

Changed paths: `src/data/ahavatTorahLetters2029.js`, `src/data/ahavatTorahSystem2029.js`, `test/ahavat-torah-letter-reader-2029.test.mjs`, `test/ahavat-torah-spatial-tables-2029.browser.test.mjs` and this note. Dependencies: preceding isolated branch, existing unified source reader/spatial renderer and unchanged OCR/commentary assets. Remaining: 17 numeric-form readings; five preserved book-level reading gaps (Gimel −10/−9, Tet −1, Lamed −1/−1); other partial datasets, editorial deepening and central integration. Publication is not performed by this content checkpoint.

AFTER at final handoff: the bounded source/reader writer scope is released to ZURIEL. Commit/push is branch-only; any deployment is a separately checked protected Preview with `target=null`. No main merge/push, Production, Legacy, DB/RLS, permission or publication mutation; no live work-log write is claimed. Exact delivered HEAD/range and Preview are supplied in the handoff rather than a self-referential commit hash in this note.

## Source-gap reconciliation — base a4b5ac34

BEFORE: ZURIEL requested closing the remaining gaps before a new handoff. Same isolated branch, clean base `a4b5ac34162770e28da05d27d2c17aae45240785`, matching remote; central remains `0ab97e8bd6cde0792735d8e8b50e0577d2d861d5`, main `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Fresh bounded live ownership read returned no overlap. Scope: source data/occurrence readings, existing reader actions, source commentary, focused tests and this note; no visual redesign, frame, Legacy, main, Production, DB/RLS or publication changes. Intake/Truth ownership is reused. The ledger connector is read-only; no work-log write is claimed. First reconcile DS-06/DS-07/DS-08/DS-13 source identity and locator drift, then continue finite direct numeral readings. Historical research is provenance, not permission to copy uncertain values as verified rows.

### Closed reader/source gaps

DS-06 is now correctly identified as the **name Moshe**, not an unidentified verb/root table. A fresh PDF 70 render at 600 dpi directly confirms the ten printed Shemot rows: 37, 47, 26, 42, 38, 14, 1, **49**, **9**, 27; these close to the printed 290. The two material corrections are כי תשא מ״ט=49 and ויקהל ט׳=9, not the earlier 40/40. Tetzaveh is absent from this printed list; no zero row was invented. The printed book checkpoints 290/86/233/38 close to the author's final 647. Other parasha rows and the grammatical-form breakdown are **not** upgraded by this checkpoint.

The fresh reading is added as `current_reading` to the existing DS-06 table, not as a second source store. Its source identity, exact PDF hash, page, anchor and row shape are checked before display. A malformed current reading yields an error and leaves the PDF available; it does not silently fall back to stale rows. All 37 earlier rows remain unchanged as provenance, including their old disputed values: SHA-256 of `JSON.stringify(rows)` remains `109be382b325042dacebc4fbad49e89ca7f1a45799a2fa6478e6e31627eda602`. They are accessible only inside the source details' earlier-transcript disclosure, using the existing body-font/wrapped transcript treatment. Historical notes' arithmetic-selected glyph readings are not silently adopted.

DS-13 now has five directly read source rows at PDF 70: תרומה ס״ב=62, תצוה מ״ח=48, כי תשא כ״ד=24, ויקהל פ״ד=84, פקודי ל״ו=36. Their sum is 254, while the author's concluding רמ״ח is 248 after a separate discussion of excluded occurrences (divine acts / the Golden Calf). These stages remain separate; no complete form-by-form/exclusion reconciliation is claimed. The existing occurrence-table renderer now exposes this third table through the Aseh tab, with an exact PDF 70 action.

DS-07 and DS-08 no longer advertise their old estimated pages (78/90) as exact locators. Their pages arrays are empty and their projection status is unresolved. Selecting either keeps the current PDF/page URL intact instead of navigating to an estimate, undefined or a fabricated fallback. Historical estimates and the later finite search outcomes remain in source details. An unsuccessful finite search does not assert absence from the entire book. Dataset cards, detail, table, spatial legend and selected-stage label now agree on this distinction. The existing spatial renderer still represents the actual located-page count; no visual component or geometry was changed.

The shared Hebrew guide is reconciled on pages 70, 71, 78 and 90. PDF 70 now explains the separate Aseh and Moshe units; the next page no longer claims that the Moshe table continues there. The 78/90 guides no longer manufacture a verified transmission-chain/count-table link from topical adjacency.

### Source re-reading still open

Gimel's two gaps were rechecked against enlarged PDF 35 numerals; no independently justified correction was found. Lamed/Tet's existing gaps remain unchanged. Nun on PDF 38 was also inspected with native and local Hebrew OCR aids, but unresolved numeral glyphs were not promoted into a structured table. Coverage therefore remains **594 rows across 11 forms**, with all 28 forms readable and 17 still needing a reliable numerical transcription. This checkpoint closes real identification/navigation/transcription defects; it does not declare the whole book's research complete or publish it.

Verification so far: combined Books suite **265/265**, zero skips, including both eight-book and Ahavat Torah browser flows at 320/390/1440 (215s aggregate). Language 3/3 and Preview Auth Guard 4/4 passed. Preview-enabled Build 2029, graph/weight, Legacy Production Lock and whitespace checks passed. The existing transcript presentation was then reused for the historical disclosure; focused source/model tests passed 23/23, final Build/graph/Legacy checks passed (380,287 eager JS gzip bytes; 78,455 recovered), and the final focused browser run adds computed wrapping/overflow assertions. Its result is recorded below after completion.

Final browser acceptance: **PASS at 320/390/1440 (192s)**, including preserved PDF selection for both unresolved locators, the new 10-row Moshe reading, the unchanged earlier 37-row disclosure, wrapped/non-overflowing source text, all five Aseh rows, exact PDF 70 actions and the existing letter/3D/CSV/reload flows. No skipped tests or page errors. Changed paths: existing dataset model/reader, existing tables/commentary assets, existing spatial model/browser tests, new focused source-gap tests and this note (eight files). No new dependency, engine, canonical finding or visual owner.

AFTER at this checkpoint: scoped source/reader writer ownership is released to ZURIEL; the stable isolated branch is committed/pushed, with protected Preview verification permitted after all gates. Formal central integration/handoff remains deferred at ZURIEL's request while source research continues. No main/central merge, Production, Legacy, DB/RLS, permission or publication action; no live work-log write or notification to another session is claimed.

Hosted follow-up, base `da18b121ca0ac13981127727c1a487bfc68f2576`: protected Preview `dpl_FTWibVvkM8nmgVVDDWtTVUG2k8hU` was READY, `target=null`, exact SHA. Real browser checks passed at 320/390/1440, HTTP 200, zero page errors: current Moshe rows, preserved historical transcript, Aseh rows and both count stages, unchanged PDF 70 under unresolved-locator selection, noindex and no overflow. Visual inspection confirmed the actual native PDF page and caught an unstyled new source action. BEFORE follow-up: fresh ownership query returned no overlap; bound scope is only the existing occurrence action's class wiring, its focused assertion and this note. The action now reuses the established `ahavat29-ds01-controls` wrapper; no CSS, font, color, frame or visual owner changes. Formal integration remains deferred; ownership is released after the follow-up checkpoint.

Follow-up verification: focused tests 20/20; final Preview Build/graph/Legacy/whitespace passed (380,298 eager JS gzip bytes; 78,444 recovered). All non-browser Books/source tests were rerun after the class-wiring correction; hosted visual/action checks target the follow-up SHA separately. The preceding 265-test full run and 192s focused browser acceptance remain the functional baseline, not a claim that another full browser suite ran after this one-wrapper correction.

Final source-context correction, base `ff608ba2dd2fdcb2ed010c826dcce6771a5da79f`: an unresolved dataset may remain selected as a research topic, but it must not label the current PDF as its exact witness. The existing source-panel badge now uses a dataset ID only when that dataset's located pages actually include the open page; otherwise the current book section stays the context. This complements the already-tested no-navigation behavior. Scope remains the same existing reader/source test/note; no visual or truth owner changed. The final hosted probe checks this badge as well as the reused control styles before reporting a Preview result.

## Complete letter-table reading continuation — base da26d5d0

BEFORE: ZURIEL requested continuation through completion, not another approval loop. Clean same isolated branch at `da26d5d00ea585589ae272590553c30f1c300f36`; matching remote, central `0ab97e8bd6cde0792735d8e8b50e0577d2d861d5`, main `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. Fresh bounded live ownership read returned no overlap. Scope: remaining letter-table source transcriptions, existing letter model/reader/export, source notes and focused tests. Existing Intake/Truth ownership is reused. A visually unresolved cell must be nullable, never a guessed numeral or synthetic zero; charts/arithmetical checks must not silently coerce it. Completing a source reading interface is distinct from closing every editorial ambiguity. No new engine/store, visual redesign, frame, Legacy, DB/RLS, permission, main, central merge or Production action. The connector is read-only; no work-log write is claimed.

### Complete form coverage, with explicit source gaps

The 17 previously unstructured forms now use the same reader/model/export as the existing eleven: ז, י, ך, ם, נ, ן, ס, ע, פ, ף, צ, ץ, ק, ר, שׁ, שׂ, ת. All **28 forms × 54 parasha positions = 1,512 rows** are present. There are **1,492 numerical readings, 20 unresolved row cells and two unresolved cumulative checkpoints**. These are source readings, not engine results or a declaration of exhaustive research completion. The eleven preceding source arrays are JSON-equivalent to base `da26d5d0`; their previously recorded gaps remain intact. The original 22-section/32-fragment OCR asset is unchanged provenance, not a numeral parser. No OCR model or image is added to the repository or browser bundle.

Each row retains its printed numeral and exact PDF page. Final Nun's Tazria number is on PDF 39, not the PDF 38 catchword. Tzadi's Bereshit rows/checkpoint are on PDF 39; subsequent books are on PDF 40. Shin's Bamidbar rows remain on PDF 40 while its cumulative checkpoint is on PDF 41; Devarim is on PDF 41. Yod and left/right column continuations on the same physical page retain the same PDF number. Finals and shin/sin are independent source datasets, never aliases or sums of their regular form.

Unresolved cells: Zayin—Haazinu; final Mem—Vayetze, Vayeshev, Tetzaveh, Bamidbar, Chukat; Nun—Vayechi, Vayakhel, Bamidbar; Samekh—Re'eh; Ayin—Beha'alotcha; final Pe—Tazria; Kof—Tetzaveh, Tzav; Shin—Vayakhel; Sin—Re'eh; Tav—Vayishlach, Bo, Pekudei, Tzav. Unresolved cumulative checkpoints: Yod/Bamidbar and Tav/Devarim. An unresolved preceding checkpoint also leaves the following book contribution unresolved. These gaps were not filled from subtraction, a similar-looking glyph or an arithmetic target.

Unknowns are `null`, display as an em dash, export as empty numeric CSV cells, and never produce numeric 2D/3D bars. A sum including an unknown cell and its delta remain `null`; a genuinely read zero would remain zero. The source PDF action remains available on that same row. Source details distinguish unresolved readings from nonzero deltas and do not claim that an incomplete sum closes. Row/cumulative arithmetic is only a consistency check of the transcription, not an independent Torah corpus count. Residual nonzero deltas in the new source readings (including Tzadi/Resh/Shin) remain editorial review items, not corrections imposed on the book.

No CSS, font, color, layout, frame or new rendering dependency was introduced. The existing lazy source-count 3D scene receives only the known numerical values, and all 28 forms retain search, book selection, exact source navigation and research CSV. The existing 99-page PDF reader, 98 text pages, 99 companion guides and 15 earlier deep-read pages remain available. DS-06's corrected ten Shemot rows and DS-13's separate 254/248 stages remain unchanged; DS-07/08 remain unlocated rather than acquiring invented page numbers.

### Cumulative handoff scope

Central is still `gpt/2029-central-books-unified-reader-20261026` at `0ab97e8bd6cde0792735d8e8b50e0577d2d861d5` at the fresh remote check. This isolated branch contains the full unmerged chain, not just the latest letter-table patch: six Maamar Esther mapping/UI/browser commits (139 units / 84 PDF pages), the Daat Tevunot internal map (229 units / 99 PDF pages), Ahavat Torah spatial/source readers, full DS-01 source reading, 28-form source access, complete 99-page companion access, source-gap reconciliation and the present all-form structured reader. A coordinator must review the whole central-to-HEAD range; do not cherry-pick only its last commit or resurrect PR #1144 as a package. No central/main integration or notification is claimed here.

Changed paths in this checkpoint: this existing note; `src/data/ahavatTorahLetters2029.js`; `src/data/ahavatTorahSystem2029.js`; `src/pages/AhavatTorahSystem2029Page.jsx`; `test/ahavat-torah-letter-reader-2029.test.mjs`; `test/ahavat-torah-spatial-tables-2029.browser.test.mjs`. Dependencies are the preceding isolated chain, unchanged public PDF/hash and existing source reader/lazy scene. No new package, engine, database table, permission or source store is required.

Remaining book research is deliberately not hidden by the complete reader coverage: the 20 row cells/two checkpoints and residual deltas; DS-03/04 per-parasha tables; DS-05 people/attribution rows; remaining DS-06 books/form rules; exact DS-07/08 locators; DS-09/10 five-scroll matrices; DS-11 root dictionary; DS-12 links from nine errata entries to corrected passages; and DS-13 form/exclusion reconciliation. Prior research notes/registers are retained, but their older glyph guesses and estimated locators do not override later direct readings. “Closed” for a source total or source list does not mean all associated research/UI wiring is finished. No verification engine is required to read the book in Preview. Public publication is a separate authorized administrative transition, not an automatic outcome of this source checkpoint.

Full cumulative file manifest from the observed central base (30 paths; not only this checkpoint's six):

```text
docs/research-notes/AHAVAT_TORAH_LETTER_READER_20261026.md
public/book-data/ahavat-torah.commentary.json
public/book-data/ahavat-torah.letter-sections.json
public/book-data/ahavat-torah.tables.json
public/book-data/daat-tevunot.internal-map.json
public/book-data/maamar-esther.internal-map.json
scripts/build-ahavat-letter-sections-2029.mjs
scripts/build-maamar-esther-internal-map.mjs
scripts/generate-daat-tevunot-internal-map.mjs
src/components/books2029/AhavatTorahSpatialScene2029.jsx
src/components/books2029/BookSourceReader2029.jsx
src/components/books2029/MaamarEstherInternalMap2029.jsx
src/components/books2029/bookSourceReader2029.css
src/components/books2029/maamarEstherInternalMap2029.css
src/data/ahavatTorahDs01Source2029.js
src/data/ahavatTorahLetters2029.js
src/data/ahavatTorahSystem2029.js
src/data/bookReader2029.js
src/pages/AhavatTorahSystem2029Page.jsx
src/pages/ahavatTorahSystem2029.css
test/ahavat-torah-commentary-2029.test.mjs
test/ahavat-torah-ds01-source-2029.test.mjs
test/ahavat-torah-letter-reader-2029.test.mjs
test/ahavat-torah-source-gaps-2029.test.mjs
test/ahavat-torah-spatial-tables-2029.browser.test.mjs
test/ahavat-torah-spatial-tables-2029.test.mjs
test/ahavat-torah-system-2029.test.mjs
test/books-unified-reader-2029.browser.test.mjs
test/daat-tevunot-internal-map-2029.test.mjs
test/maamar-esther-internal-map-2029.test.mjs
```

Acceptance at the all-form checkpoint: **269/269 Books tests**, zero skips/cancellations, including the unified-reader browser and Ahavat Torah flow at 320/390/1440 (280.8s aggregate). The added nullable-cell/unknown-checkpoint paths, exact source boundaries, all 28 forms at desktop, research CSV and 3D switching passed. An initial run hit the old 240s global test budget after the expanded coverage; it is not recorded as a pass. The final browser test records viewport progress, closes its already-tested live WebGL scene before the exhaustive desktop table-switch loop, and has a 360s budget for the broader acceptance story. No assertions were removed or forced clicks added.

Preview-enabled Build 2029 passed; graph/weight passed (7 eager / 121 reachable records, 380,295 eager JS gzip bytes, 78,447 recovered); language 3/3; Preview Auth Guard 4/4; Legacy Production Lock and whitespace checks passed. The finite source refinements and final exact-SHA hosted check are recorded separately below; no hosted result is assumed from this local run.

### Final enlarged-source refinement — base 9f8c423d

BEFORE: same bounded letter data/test/note scope; the fresh ownership check in this turn returned no overlap. Direct second reading of the enlarged Resh checkpoint on PDF 40 shows **י״ד אלף תרצ״ה = 14,695**, correcting the first-pass 14,595/תקצ״ה. Four row glyph readings remain unsafe after the source/OCR comparisons: Resh/Chayei Sarah, Resh/Behar, Resh/Korach and Tzadi/Mas'ei. They are made nullable, not selected to fit a subtotal. The final coverage is therefore **1,488 numeric cells + 24 unresolved cells = 1,512 source positions**, with two unresolved cumulative checkpoints. Earlier counts in this chronological note remain snapshots, not the current total. The source PDF and unchanged raw OCR remain available for every open reading; no engine, source correction, publication or new implementation phase is implied.

Final source-refinement verification: **267/267 non-browser Books/source tests**, no skips, after the four nullable cells and corrected Resh checkpoint. Preview Build 2029, graph/weight (380,284 eager JS gzip bytes; 78,458 recovered), language 3/3, Auth Guard 4/4, Legacy Production Lock and whitespace checks all passed again. The 269-test local run above precedes this finite source-only refinement; it must not be misreported as a second full browser run on these last five data changes. The final exact-SHA hosted probe separately exercises 320/390/1440, null CSV, source row/checkpoint boundaries, partial-form 3D, noindex and overflow; its actual result/URL are supplied only after deployment verification.

AFTER / delivery contract: commit and push only the isolated branch. Deliver the entire `0ab97e8bd6cde0792735d8e8b50e0577d2d861d5..HEAD` range (27 commits after this follow-up), not just `da26d5d0..HEAD` (this turn's two commits). Exact final HEAD is reported outside this self-referential note. The cumulative file manifest above remains 30 paths; this turn changes six, and this source-only follow-up changes data/test/note only. At final handoff all active writer ownership of these paths is released to ZURIEL/the central session. No live coordination ledger write or message to another GPT is claimed. No main/central merge, Production deployment, Legacy change, DB/RLS change, permission change or public publication has been performed. Do not begin another book/stage until the central session acknowledges integration of the handed-off cut.

## DS-03 / DS-04 continuation — integrated base 3fe5f673

BEFORE: ZURIEL supplied central integration acknowledgement. Fresh fetch verifies merge `3fe5f67335c4e00fb47287cc685783ab999a3aa5`, with parents `0ab97e8bd6cde0792735d8e8b50e0577d2d861d5` and `59a3154e59009c277ee11e70c026fedddb75064d`, matching the remote Books branch. Main remains `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`. New isolated branch `codex/books-ahavat-torah-word-letter-counts-preview-20261026` starts directly from that merge, with no cherry-pick or central-branch edit. Canonical read-only connection verified; bounded current ownership query returned no overlapping assignment. Owner verdict: EXTEND_EXISTING — Intake v13, Truth Axes v3, source-native identity invariant v2 and coordination v17. The connector is read-only: this local chronological BEFORE is not a claimed live ledger write.

Scope: source-native DS-03 word-count and DS-04 letter-count rows/checkpoints on PDF 41/42; extend the established source reader, shared count helpers, exact-page actions, CSV and existing lazy count-based 3D representation; focused tests and this note. Preserve all preceding 28-form readings and source gaps. Reuse adopted classes/layout/geometry, without CSS, font, color, frame or presentation redesign. No new engine, owner, database/store, governed finding, DB/RLS/permission change, Legacy, main, central merge or Production action. Book source counts and subtraction/sum consistency checks are not engine verification. Unreadable cells remain null, never arithmetic-inferred values. Final deliverable is a tested branch checkpoint and protected Preview only; report to ZURIEL and release writer scope at handoff.

### Implemented source/reader cut

The two existing dataset identities now have **108 parasha positions, 103 numeric source readings and five explicitly unresolved cells**. DS-03's five printed running checkpoints are 20,612 / 37,324 / 49,275 / 65,683 / 79,976. The row-reading deltas are respectively −100 / +1 / −1 / 0 / 0; these are transcription consistency observations, not corrected book figures. כי תשא is directly read ב׳ אלף ב׳ = 2,002, not 2,020. Every word-table row/checkpoint is on PDF 41, including the right-to-left column continuation within the same physical page.

DS-04's printed running checkpoints are 78,068 / 141,596 / 186,386 / 249,918 / 304,812. Its five unresolved cells are מקץ, בא, מצורע, בהר, פנחס. The first five Bereshit parasha numerals are on PDF 41. Toldot's label is there, but its numeral is in the body of PDF 42; the repeated catchword below the PDF 41 body is not the row locator. The remaining 49 numerals are therefore anchored to PDF 42. Devarim's eleven source readings close to the 54,894 contribution derived from the printed checkpoints. No other incomplete row sum is declared closed or completed by subtraction.

The established source-book grammar, search, null-safe formatting, chart inputs and research CSV implementation are extended/reused rather than copied into a second table reader. The same reader component now supports the 28 individual letter forms and the two overall count series, with distinct section IDs, search labels and URL parameters (`countKind`, `countBook` vs `letter`, `letterBook`). The same lazy count-based 3D geometry is reused; only its semantic mode/accessible wording is extended so an overall word/letter count is never called “the letter” count. No CSS/font/color/geometry change is made. All 28 preceding source arrays and their CSV outputs were compared against the integrated base: zero differences.

Dataset selections, row/PDF actions, charts and deep-link state stay connected. The existing page action now optionally retains a dataset context only when its declared exact pages contain the selected page; ordinary source navigation still clears it, and an unlocated dataset cannot acquire a false PDF badge. Browser verification caught and fixed the initial context-clearing defect. The old tab test was scoped to its actual tab navigation when a dataset card also began containing the phrase “טבלת האותיות”; its source assertions were not weakened. External dataset synchronization is awaited as an observable pressed-button state, not an assumed synchronous React effect.

DS-03's primary table locator is corrected to PDF 41. The earlier contextual witnesses in PDF 25–31 are retained separately in `relatedSourcePages`, and the original research bundle/notes remain unchanged provenance. Its table completion state is partial, distinct from the already-known 79,976 source total. DS-04 likewise retains a verified author-total claim without representing its five unresolved cells as verified. Older bundle prose about earlier partial readings is historical and does not override this source-native row model.

The original public PDF was hash-checked: `895e9a720d984adf8ea453b644e3f6d0864e101238f348f418aa5fafa20e9c8b`. Temporary 600-dpi page renders and local Hebrew OCR were reading aids only, not numerical import/parsing authority; no OCR model/image was added to the application. The 99-page reader, earlier 24 letter-cell gaps/two checkpoints, DS-01, DS-06/13 and unresolved DS-07/08 behavior remain intact.

Changed files (nine): this existing note; `src/data/ahavatTorahParashaCounts2029.js`; `src/data/ahavatTorahLetters2029.js`; `src/data/ahavatTorahSystem2029.js`; `src/pages/AhavatTorahSystem2029Page.jsx`; `src/components/books2029/AhavatTorahSpatialScene2029.jsx`; `test/ahavat-torah-parasha-counts-2029.test.mjs`; `test/ahavat-torah-parasha-counts-2029.browser.test.mjs`; `test/ahavat-torah-spatial-tables-2029.browser.test.mjs`. Dependencies: integrated base, unchanged PDF, existing source reader/styles and lazy spatial renderer. No new runtime package, persisted research finding or global owner.

Final local acceptance: **278/278 Books tests**, zero failures/skips/cancellations (364.0s, serial browser execution to bound shared GPU contention). This includes the new DS-03/04 browser flow, the complete preceding Ahavat Torah flow and the unified eight-book reader, each covering 320/390/1440. The final flow checks two-way dataset/reader/URL synchronization, reload, exact row vs checkpoint pages, unknown-cell CSV, count/letter separation, 3D labels and absence of overflow/page errors. Earlier diagnostic runs exposed the context-clearing issue and an ambiguous test locator; they are not counted as successful acceptance. The corrected focused new browser also passed all three widths before the final complete run.

Final Preview-enabled Build 2029: PASS. Graph/weight: PASS, 7 eager / 121 reachable records, 380,275 eager JS gzip bytes and 78,467 recovered. Language 3/3, Preview Auth Guard 4/4, Legacy Production Lock and whitespace checks: PASS. All 28 prior source arrays and generated CSVs are byte-equivalent in JSON/string comparison to the integrated base. No CSS, frame, DB, package or deployment-configuration files changed.

AFTER / handoff: GPT · task_key=BOOKS_AHAVAT_TORAH_DS03_DS04_20261026 · owner=existing Intake/Truth/source-identity lane · status=IMPLEMENTED/TESTED/BRANCH_ONLY. Commit/push is only to `codex/books-ahavat-torah-word-letter-counts-preview-20261026`, directly based on `3fe5f67335c4e00fb47287cc685783ab999a3aa5`; exact delivered HEAD/range and final protected Preview evidence are supplied after commit, not guessed in this self-referential note. Active scoped writer ownership is released to ZURIEL at final handoff. The connector remains read-only; no live work-log write or notification to another session is claimed. No central/main merge, Production, Legacy, DB/RLS, permission, public-publication or new-book-stage action. Remaining: five DS-04 cells, the DS-03 reading deltas, preceding DS-02 editorial gaps and the other already-recorded book research backlog. Do not make up a source numeral or require Engine Verification to read the book in Preview. This cut is ready for central review/integration; another stage starts only after ZURIEL's integration acknowledgement.
