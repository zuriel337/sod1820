# ספר יצירה — העמקת מקור ומבנים

## BEFORE · SEFER_YETZIRAH_SOURCE_AND_STRUCTURE_DEPTH_ONLY

2026-10-27 · actor GPT · report to ZURIEL only. Approved base `40382ae21b9ca2d6ca38f58c387542b993d18f69` exists as a commit in `https://github.com/zuriel337/sod1820.git`. Isolated branch `codex/sefer-yetzirah-source-structure-depth-20261027`, worktree `/workspace/sefer-yetzirah-depth`, starts directly at that exact base. No replacement base, reset, cherry-pick or integration. Current fetched `origin/main` is `2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`; it is not the task base.

Read AGENTS.md, CLAUDE.md and current owner routing. Existing owners: Intake v13, Truth Axes v3, source-native identity invariant v2, coordination v17; verdict EXTEND_EXISTING. Dedicated `sod1820_supabase_readonly` connection reports `supabase_read_only_user`, `transaction_read_only=on`. Bounded live `work_log_current` checks found no Sefer Yetzirah semantic/path writer overlap. Other integration/acceptance scopes remain separate. This is a local BEFORE, not a live ledger write or cross-agent notification; the read-only connector cannot write that ledger. No delegation is needed for this source-data task.

Authorized scope: deepen existing Sefer Yetzirah assets into printed-work/commentator/chapter/unit data and source-backed structure/illustration specifications. Preserve existing 220-page companion, 207-page search and nine-voice overview as provenance; do not rebuild them. Inspect all thirteen textless pages visually and retain missing text honestly. Only Sefer Yetzirah data, focused tests and this note may change. No reader/manifest/UI/style, other-book data, global systems, DB/RLS/permissions, main, merge or deployment changes.

Verification planned: focused source/anchor/content tests; complete Books suite, serial browser work only after checking contention; language gates; Preview-enabled Build 2029; built weight/graph; Auth Guard; Legacy Production Lock; exact branch-only commit/push, remote equality and clean tree. Engine verification stays `not_tested` unless an actual canonical engine execution is evidenced. Book structure and illustration choices remain separate from source statements and printed commentary.


## IMPLEMENTED · מפת היחידות ומפרט המבנים

המסירה היא שכבת נתוני מקור תחומה: 319 יחידות תוכן ב־21 רשומות חיבור/מדור, 47 רשומות פרק/חטיבה ו־158 עמודי PDF בעלי עוגן יחידה מדויק. המדורים כוללים הופעות נפרדות של נספחים, ואינם טענה ל־21 מחברים עצמאיים. מספר העמודים הזה אינו אחוז מיצוי. אין טענה לתעתיק מלא או למיפוי כל דיבור־מתחיל בכל טור.

`public/book-data/sefer-yetzirah.units.json` מפריד בין `source_content` (תקציר תוכן המקור המסומן במפורש שאינו תעתיק), `exact_quote` (מעט מובאות קצרות שנקראו חזותית, בפיסוק מנורמל), `companion_explanation`, `source_connections` ו־`book_structure`. מזהה יחידה יציב בנוי מחיבור/קול/פרק/מפתח תוכן; עמוד PDF הוא עוגן ולא זהות. `source_ref` משתמש בזהות ובאזורי הכרך הקיימים בדוסייה. סמיכות דפוס בלבד מתועדת כמיקום עריכתי עם `semantic_relation_asserted=false`, ולא כקשר מקור. הבדלי נוסח אינם מתוקנים זה מתוך זה.

`public/book-data/sefer-yetzirah.structures.json` מכיל 33 מפרטים בלבד: רכיבים, סדר, כיוונים כשיש להם עדות, קשרי מקור ועוגן לכל רכיב וקשר. בחירות ציור/קואורדינטות נפרדות. המפרט מפנה לחמשת המצבים של סצנת ספר יצירה הקיימת, ללא שינוי בקוד הסצנה, ללא import חדש, ללא manifest וללא UI. אין מנוע להצגת מקור. לא הורץ מנוע קנוני: כל השדות נשארים `not_tested`, ומספר ריצות המנוע הוא אפס.

### כיסוי לפי חיבור/מדור מודפס

| מזהה | חיבור/מדור | יחידות |
|---|---|---:|
| `frontmatter` | מעטפת, שער והסכמות | 2 |
| `raavad-preface` | הקדמת הראב״ד | 6 |
| `botril-preface` | הקדמת ר׳ משה בוטריל | 1 |
| `synoptic` | ספר יצירה והפירושים המשולבים | 136 |
| `chachmoni` | ספר חכמוני | 35 |
| `gra-edition` | ספר יצירה עם פירוש הגר״א ופרי יצחק | 92 |
| `gra-gleanings` | ליקוטי הגר״א | 7 |
| `gra-gates` | סדר רל״א שערים לפי דעת הגר״א | 2 |
| `gra-letter-diagram` | ציור כ״ב אותיות וקווי הספירות | 2 |
| `peri-gates` | סדר רל״א שערים מבעל פרי יצחק | 9 |
| `peri-paths` | ל״ב נתיבות מבעל פרי יצחק | 3 |
| `ari-commentary` | פירוש מהאר״י הקדוש | 4 |
| `kelil-tochnit` | כליל תכנית | 3 |
| `maamar-kadishin` | מאמר קדישין להאר״י | 1 |
| `tamarlish` | ביאור מאמר קדישין | 1 |
| `amash-v1` | ספר אמ״ש בכליל תכנית | 1 |
| `bagad-v1` | ספר בג״ד כפר״ת בכליל תכנית | 1 |
| `amash-v2` | ספר אמ״ש בדף מאמר קדישין | 1 |
| `bagad-v2` | ספר בג״ד כפר״ת בדף מאמר קדישין | 1 |
| `old-recension` | ספר יצירה נוסחא ישנה | 10 |
| `gra-gleanings-tail` | ליקוטי הגר״א בדף הנספחים | 1 |

בגוף המשולב, בחכמוני, בנוסח הגר״א ובנוסח הישן נשמרו ששת הפרקים של כל הדפסה בפני עצמם. חכמוני כולל את הקדמתו ואת שני חלקיו לפני/בתוך פרקי הפירוש. בליקוטי הגר״א מובחנים מקור כתב היד, מאמר הבריאה, סוד החדשים והליקוט הנוסף ב־213. נספחי אמ״ש ובג״ד כפר״ת ב־212 וב־213 נשארו ארבע הופעות נפרדות.

### כיסוי תשעת הקולות הקיימים

| קול | יחידות | פרקים/חטיבות | עמודי PDF מובחנים |
|---|---:|---:|---:|
| חכמוני | 32 | 9 | 26 |
| הראב״ד | 25 | 7 | 25 |
| הרמב״ן | 6 | 3 | 6 |
| רס״ג | 13 | 6 | 13 |
| ר׳ אליעזר מגרמייזא | 13 | 6 | 13 |
| בוטריל | 15 | 7 | 15 |
| אוצר ה׳ | 13 | 6 | 13 |
| הגר״א | 29 | 9 | 28 |
| פרי יצחק | 34 | 8 | 27 |

אלו יחידות תחומות, לא ספירת כל הפסקאות של המפרש. רמב״ן ממופה בפרקים א׳–ג׳ שבהם נקרא, ואינו משוכפל לפרקים ד׳–ו׳ ללא עדות. קיימים גם טקסטי מסדר ומדפיס, ייחוסי האר״י ופירוש תמרליש, מחוץ למניין תשעת הקולות.

### בדיקה חזותית של 13 העמודים ללא OCR

| PDF | זיהוי חזותי | תרשים? |
|---|---|---|
| 1 | כריכה קדמית — כריכה חומה מוטבעת, מסגרת ועיטורים וכותרת הספר במרכזה. | לא |
| 2 | פנים הכריכה — דף מודבק בהיר וסימני כריכה; אין תרשים או גוף חיבור מודפס. | לא |
| 3 | דף מגן קדמי — דף מגן עם סימני עיפרון קטנים בפינה; אין טקסט ספר מודפס. | לא |
| 27 | חתימת הקדמת הראב״ד — שני טורי טקסט מודפס, חתימה וקישוט מפריד. אין תרשים. | לא |
| 33 | פירושים בפרק א׳ — עמוד טקסט בגוף המשולב: טורים עליונים ובלוקים תחתונים ובהם בוטריל ואוצר ה׳. אין תרשים. | לא |
| 110 | סיום המלכות הכפולות — תיבות רי״ש ותי״ו, פירוש וטבלת התאמות קצרה בחלק התחתון. אין תרשים מרחבי. | לא |
| 114 | רשימת גבולי אלכסון — המשך רשימת הגבולות בתיבת המשנה וטורי פירוש מתחתיה. אין קובייה מצוירת. | לא |
| 115 | המשך פירושי הפשוטות — המשך טורי פירוש ובוטריל ואוצר ה׳; אין תרשים נראה. | לא |
| 202 | חתימת ליקוטי הגר״א — שני טורים, כותרת סוד החדשים, תם ונשלם וקישוט חתימה; אין תרשים. | לא |
| 217 | דף מגן אחורי — דף מגן ללא גוף טקסט מודפס; כתמי נייר וכריכה בלבד. | לא |
| 218 | פנים הכריכה האחורית — דף בהיר עם סימני כריכה ושוליים; אין תרשים. | לא |
| 219 | דף מגן אחורי נוסף — דף בהיר ומעט סימני נייר; אין גוף טקסט מודפס. | לא |
| 220 | כריכה אחורית — כריכה חומה מוטבעת ועיטורים, ללא כותרת מרכזית. | לא |

אין הזרקת טקסט לעמודי OCR ריקים: `machine_text` נשאר ריק ו־`transcription=null`. זיהוי עמוד כעמוד טקסט אינו תעתיק של גוף העמוד. ב־110 יש לוח קטן בתוך עמוד טקסט; הוא ממופה בנפרד ואינו תרשים מרחבי.

### המבנים וההמחשות שנבדקו

- עשרת העומקים וחמשת הזוגות; חמש כנגד חמש וברית; קבוצות 3/7/12; חמשת מוצאות הפה.
- ששת החותמות: נוסח הגוף המשולב ב־73 ונוסח הגר״א ב־175, עם מערכי אותיות שומרי סדר וכיוונים. בחירת אותיות אמ״ש בהקשר נוסח הגר״א אינה מחליפה את אותיות החותמות המודפסות יה״ו.
- אמ״ש בעולם/שנה/נפש; המלכות הכפולות בשני הנוסחים; אבנים ובתים כמניין מקור; י״ב גבולי האלכסון בנוסח הגר״א; תלי/גלגל/לב ומשלי המלכות.
- צורות זעירות ב־31; מעגלים קונצנטריים ב־39; מעגלי יסודות ב־40; רשימות דברים ותמורות ב־41; גלגל שמות ב־42; לוח שמות ב־44.
- לוחות בוטריל ב־85–87; המעגל ב־102; שני לוחות נפרדים של אוצר ה׳ ושל בוטריל ב־105; לוחות קטנים ב־106 וב־110; לוח בתוך ר׳ אליעזר ב־123.
- לוח הזוגות בחכמוני ב־139, ושרשרות הצירופים מרובות האותיות ב־142–143, שאינן טבלת זוגות רל״א.
- שני גושי לוח רל״א של הגר״א וההערות ב־203; תרשים האותיות והקווים ב־204. ב־204 קודדו 13 מיקומים נראים ו־24 מקטעי קו, בלי לטעון שאלו י״ג ספירות או כ״ד/כ״ב נתיבים סמנטיים. חלק מהכתובות נשארו חסרות. הקואורדינטות הן תיאור ציור עריכתי מנורמל, לא מידות מקור.
- שמונת לוחות פרי יצחק: כתר/חכמה פנים ואחור ב־205, בינה/דעת פנים ואחור ב־206. אין השלמת לוחות חסד–מלכות; 207 פותח ל״ב נתיבות. זהויות 32 הנתיבות ומקומן נקבעו: 1–19 ב־207, 20–32 ב־208. הגדרות הנתיבות אינן מילון מתועתק.

### תיקונים ופערים

12 רשומות `CORRECTS` מוסיפות עדות לעוגנים או קריאות שגויים ברישומים הקודמים, בלי לשכתב אותם: סיום פרק א׳ ב־76; גלגל רל״א ב־83; חקקן חצבן ב־79; שי״ן ב־99 ופתיחת פרק ד׳ ב־100; כ״ף/חמה/רביעי ב־109; המלכות הפשוטות ב־117–119; טיב תרשים 40; מקומות אופני הגר״א; תיבות מקור בפרק א׳ של הגר״א; מים/אש/חותמות ב־173–175; אברהם ב־195; סיום לוחות פרי יצחק. דוגמת הבדל נוסח שנשמר: בי״ת־שבתאי בגוף המשולב לעומת בי״ת־לבנה בגר״א.

פערים מפורשים: הקדמת הראב״ד ממופה בשש יחידות נושא ולא פסקה־פסקה; טורי המפרשים המשניים אינם תעתיק מלא; שדות רי״ש ותי״ו ב־110 וכמה מהמלכות ב־185 טרם תועתקו ברמת שדה; כיתובים היקפיים ותאי לוחות רבים נשארו חלקיים או `null`; הגדרות ל״ב הנתיבות טרם הוזנו; אין חיבור לריצה ואין אימות מנוע. אין להשלים פער מנוסח אחר. `open_gaps` ו־`open_readings` מקומיים מסמנים את גבולות הקריאה.

נשמרו ללא שינוי: ה־PDF (SHA256 `2cc0710667dde3db94745b4f652d4b2e3eb8ea9c64424ab52f1f2ce44281c13a`), המדריך לכל 220 העמודים, חיפוש 207 העמודים, מפת תשעת הקולות, כל רישומי המקור הקודמים, כל הקוראים והספרים האחרים. רשומת הדוסייה היא קישור למקטע העומק הזה, לא אינטגרציה של הנתונים לתוצר.

## TESTED / AFTER · מסירה מוגבלת לענף

Final source/content/anchor tests: **7/7**, also included in the serial surface suite. The first focused diagnostics caught two assertions incorrectly expecting literal words in paraphrase fields; the tests now check the short source quotation for חקקן חצבן and the actual fire/water/spirit summary. No existing assertion, gate or timeout was weakened.

Complete available Books coverage was executed in bounded invocations, rather than re-running the heavy browser stories:

- `node --test --test-concurrency=1 $(rg --files test | rg '(book|sefer-|ahavat|daat|maamar)')`: **140/140** across 33 files, 413.7s, including all four browser stories, each at 320/390/1440. Zero failures, skips or cancellations. The new data reached its final state before its test module was loaded by this serial run.
- `node --test src/data/bookReader2029.test.js src/lib/research/book*.test.js`: **142/142** across 13 library/model test files. Zero failures, skips or cancellations.
- `node --test test/bentov-reader-search-translation-2029.test.mjs src/lib/research/contributorPublicationCatalog.test.js`: **12/12** (3 remaining Bentov book tests plus 9 related catalogue tests). Thus **285 Books tests + 9 catalogue tests**, all passed. These are actual invocation totals on the approved base, not a copied historical acceptance count.
- `npm run test:public-2029-language`: **3/3**.
- `node --test scripts/test-integrated-preview-auth-guard.mjs`: **4/4**.
- `node scripts/test-legacy-production-lock.mjs`: **PASS**.
- `VITE_BOOK_PUBLICATION_REVIEW_PREVIEW=true npm run build:2029`: **PASS**. Existing ineffective-dynamic-import bundler warnings are retained; they are not errors and were not suppressed.
- `node scripts/test-2029-built-graph.mjs`: **PASS**; 121 reachable records, 7 eager records, **380,289 eager JS gzip bytes**, 78,453 bytes recovered from the gate baseline. Both existing Raziel chunks remain lazy; no Raziel code changed.
- `git diff --check`: **PASS**. Only the five authorized Sefer Yetzirah data/test/note paths below differ from the approved base. No dependency or lockfile changed.

The PDF was inspected through local PyMuPDF renders, contact sheets and selected full-resolution crops; the source bytes match the existing recorded SHA256. No OCR was regenerated. Source inspection and content checks are distinct from canonical engine verification. The existing data assets and all prior register hashes are preserved and checked by the focused suite.

### Exact delivery scope

Actor GPT · task_key `SEFER_YETZIRAH_SOURCE_AND_STRUCTURE_DEPTH_ONLY` · domain existing Books / Sefer Yetzirah · status IMPLEMENTED / TESTED / BRANCH_READY. NOT MERGED / NOT LIVE. No integration is requested or performed.

Five paths:

1. `public/book-data/sefer-yetzirah.units.json`
2. `public/book-data/sefer-yetzirah.structures.json`
3. `test/sefer-yetzirah-source-structure-depth-2029.test.mjs`
4. `docs/research-library/sefer-yetzirah/DOSSIER_INDEX.md`
5. `docs/research-notes/SEFER_YETZIRAH_SOURCE_STRUCTURE_DEPTH_20261027.md`

Branch: `codex/sefer-yetzirah-source-structure-depth-20261027`. Base: `40382ae21b9ca2d6ca38f58c387542b993d18f69`. The complete delivery range is that exact base through the final HEAD, supplied in the final handoff; it is not a partial later range. HEAD is intentionally not self-embedded in a file that belongs to its own commit. No reset, cherry-pick, replacement base, main edit/push, merge, deployment, live DB/RLS/permission change or browser conflict occurred.

A fresh bounded live ownership read before delivery again returned no overlapping Sefer Yetzirah task/scope. The read-only connector cannot create BEFORE/AFTER rows or release a live ledger claim. BEFORE and AFTER here are passive local documentation for ZURIEL/the authorized coordinator, not fabricated live records. At final handoff all local scoped writer ownership is released; no next stage starts. Final handoff confirms the branch-only push, remote HEAD equality and clean worktree after this note is committed. Remaining open threads are the source-reading gaps above and a separately authorized future integration; no automatic follow-up is scheduled.
