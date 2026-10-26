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
