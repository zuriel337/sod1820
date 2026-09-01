# Hebrewbooks_org_5635 — Coverage / Provenance Map

> **NON-CANONICAL, DOCS-ONLY DELIVERABLE.** This file is a coverage/provenance audit only. It performs **no** new content research, **no** interpretation, **no** gematria computation, **no** canonicalization, and **no** engine/schema/UI/Master-State/Roadmap change. It does not insert anything into the website or into any live content table. Branch: `claude/hebrewbooks-coverage-provenance-map-qdl1xo` — **docs-only, no merge, no deploy.**

## 0. Source identification

- File: `Hebrewbooks_org_5635.pdf`, uploaded to this session.
- PDF metadata (read directly from the file): title *אהבת תורה*; author פנחס זלמן הלוי איש הורוויץ; subject "ID 5635 – Available for FREE at www.hebrewbooks.org"; keywords "פאדגורזא תרס״ה / על התורה ומגילת אסתר ע״ד פשט ורמז"; producer iText 5.5.8 (2016 HebrewBooks re-scan of the original).
- **Page count: 99 PDF pages, confirmed programmatically** (`pymupdf`, `doc.page_count == 99`). The task's "99 PDF pages" figure is correct. Note for the record: this session's PDF-reading tool initially reported "21 pages" in its pre-read estimate — that estimate was **wrong** and is superseded by the direct page-count read; all analysis below uses the confirmed 99-page document.
- Page 1's closing text block corroborates the original 1905 imprint: *"AHAWAS TORA … Verlag v. P. S. Horowitz, Krakau … Druck von S. L. Deutscher, Podgorze bei Krakau. 1905."*

## 1. Dependencies read

Per instructions, all existing `AHAVAT_TORAH_RESEARCH_*` documents were located and read in full before mapping. **They do not exist on `main` or on this branch's base** — they live only on remote research branches from a prior (GPT-session) pass:

| File | Found on branch | Lines |
|---|---|---|
| `AHAVAT_TORAH_RESEARCH_LEDGER.md` | `gpt/ahavat-torah-research-ledger` → superseded by `-v2`,`-v3`,`-v4` (content identical across v2-v4) | 347 |
| `AHAVAT_TORAH_RESEARCH_CHECKPOINT_2.md` | `gpt/ahavat-torah-research-ledger-v3` and `-v4` | 107 |
| `AHAVAT_TORAH_RESEARCH_CHECKPOINT_3.md` | `gpt/ahavat-torah-research-ledger-v4` (new in v4, plus already in v3) | 135 |
| `AHAVAT_TORAH_RESEARCH_CHECKPOINT_4.md` | `gpt/ahavat-torah-research-ledger-v4` only (newest) | 141 |

The `-v4` branch is the most complete superset and is what this map is built against. **These files were read via `git show` for reference only and were not copied or merged into this branch** — this deliverable does not touch those research branches, does not canonicalize their content, and does not merge anything to `main`.

Critical structural fact from the ledger itself (§1): **none of the four research documents record a PDF page number, a printed page number, or any other page-level locator for any finding.** All findings are anchored only by topical section name (e.g. "אוריין תליתאי", "שרשים בתורה") and by quoted Hebrew phrases. This is the central reason page-level provenance below required independent reconstruction against the primary scan (per DEPENDENCIES instruction: "התאמה באמצעות עוגנים טקסטואליים") rather than simple citation-copying — and it is also why several items must be marked **UNKNOWN** (§6 below) rather than assigned a confident page.

## 2. Method

1. **Section/parasha map** — built from the book's own running headers (top of every page repeats *"אהבת [section-name] תורה"*), extracted via `pymupdf`. This is a **direct, repeatable observation** of the primary source, not an inference — every section boundary below was confirmed by locating the first and last PDF page carrying that exact header string.
2. **Printed-page numbering** — the OCR text layer intermittently exposes an Arabic-numeral page number glued to the header text. Cross-tabulating all pages where this numeral appears (15 confirmed points in Part 1, 13 confirmed points in Part 2, zero exceptions) shows two independent pagination runs:
   - **Part 1** (guf ha-sefer, PDF pages 6–43): printed page = PDF page − 5 (PDF 6 = printed 1).
   - **Part 2** (parasha-ordered layer, PDF pages 46–99): printed page = PDF page − 45 (PDF 46 = printed 1).
   This offset is an **arithmetic inference from a fully consistent OCR pattern**, not a re-guess per page — it is flagged "(OCR-ambiguous)" at the one point (PDF 43) where the OCR numeral glyph didn't cleanly fit the pattern.
3. **Finding-to-page anchoring** — for each numbered claim in the four research documents (§3.1–§3.12 of the LEDGER, §A–§J of each checkpoint), targeted searches were run against the PDF's extracted text for the underlying Hebrew gematria-numeral spellings and named entities the claim depends on (e.g. searching for קס״ה/שצ״ח/שי״א/שצ״ו/תק״ן to locate the Tetragrammaton book-totals of §3.1; searching for שרח/בנות צלפחד/רל״ט to locate §3.11/§3.9). **A match was only accepted as provenance when the located text reproduces the specific numbers or named entities the ledger cites — not merely a thematic resemblance.** Every such match is documented with its exact textual basis in §4 below.
4. **OCR-quality caveat (governs the whole map):** this scan's text layer is heavily corrupted at the character level (RTL word-order artifacts, letter transpositions, e.g. "מגדל" → "מגרל"/"מנדל"/"סנדל" across different pages of the *same* running header). Because of this, **exact-string search for many of the ledger's cited gematria totals is unreliable** (some searches return false positives from unrelated words, e.g. a search for the numeral-string "רכה" collided with dozens of unrelated occurrences of the word ברכה/כרכה). Per the task's STOP CONDITION, wherever this made a page-level match unsafe, the item is left **UNKNOWN** rather than guessed (see §6).

## 3. Coverage table — 99/99 PDF pages

Columns: **PDF page** · **printed page** (inferred per §2, or "front matter"/"blank" where the book itself carries no body pagination) · **section/parasha** (from verified running headers) · **opening/closing anchor** (raw OCR text fragments, first/last ~10 tokens of the page — authentic to the scan, not cleaned up, since RTL/letter-order corruption is part of what makes them a genuine fingerprint of *that* page) · **existing-research references** (which LEDGER §/CHECKPOINT § cites this page, if any) · **status** (SCANNED_RESEARCH / PARTIAL_RESEARCH / SEARCH_HIT_ONLY / NOT_RESEARCHED).

| PDF | דף מודפס | מדור/פרשה | עוגן פתיחה (raw OCR) | עוגן סיום (raw OCR) | הפניות מחקר קיים | סטטוס |
|---|---|---|---|---|---|---|
| 1 | — (front matter) | שער/דף-שער + פרסומת מו״ל (הדפסה מחודשת HebrewBooks, לא טקסט הורוויץ) | i ספר אהבת תורה ממני הצעיר פנחס pSr איש מ״ל הורווי״ז | RA Verlag v. P. S. Horowitz, Krakau Josefsgasse Nr. 5■ Druck von S. L. Deutscher, Podgorze bei Krakau. 1905. i | — | **NOT_RESEARCHED** |
| 2 | — (front matter) | שער/דף-שער + פרסומת מו״ל (הדפסה מחודשת HebrewBooks, לא טקסט הורוויץ) | This Sefer has been made available by: n g S G jy I CORNER 5314 13th Avenue Brooklyn, NY 11219 TEL !718)972-07 | מכורך, במחיר סביר, אצל: בימ״ס ביגלאייזן 4409 le*’’ Avenue (718) 436-1165 | — | **NOT_RESEARCHED** |
| 3 | — (front matter) | הסכמות (approbations, מהדורה חוזרת) | הסכמתי בלבבי שלא ליקח הסכמות טנדולי ישראל ואמרתי לספרי מעשיך | FAX. (718)972-0178 מכירה הראשיוז אצל: בימ׳׳ס בינלאייזן 4409 16th Ave. Tel. (718) 4 3 6 1 1 6 5־ | — | **NOT_RESEARCHED** |
| 4 | — (front matter) | אקדמות מלין — הקדמת המהדיר המודרני (תשס״ג/תשל״ה), לא טקסט הורוויץ המקורי | אקדמות מלין ספר אהבת תורה יצא לאור בפאדגרהע אצל קראקא, | ,( ובמקורות שנרשמו ע״י הינער, שם, הערה 4. | — | **NOT_RESEARCHED** |
| 5 | — (front matter) | אקדמות מלין — הקדמת המהדיר המודרני (תשס״ג/תשל״ה), לא טקסט הורוויץ המקורי | בשנת תשל״ה יצא לאור מאמרו ר׳ של אברהם קורמן על "מספר | ר׳ יצחק צבי ליימן כ״ו שבט, תשס״ג לפ״ק | — | **NOT_RESEARCHED** |
| 6 | 1 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | חלמ א׳ אהבת מגי ל עי׳ שם י■ תורה י ת ב ר ך ךןיוצר | ותתט׳׳ו אותיות וחסר ה׳ לא.לף הת״ך ! ואמרו | LEDGER §3.1 | **SCANNED_RESEARCH** |
| 7 | 2 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגדל עוז תורה ואמרו חכז״ל על נהכראם שנאות ה׳ | השם ברוך והי׳ זאת אחרי שונו מהנות את | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 8 | 3 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרר עוז תורה אה ארם שמונה עשר אלף את בי | כי בגלות מצרים א.ך נתקנו יו״ר צירופים לא לך גם לי גם י | LEDGER §3.2, §3.3 | **SCANNED_RESEARCH** |
| 9 | 4 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרל עוז תורה צירופים מן הי״ב צירופים שם של הוי״ר, | היה כתוב בהם נ״ב אות טית ח׳׳י פעמים | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 10 | 5 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מנרל עו^ תורה פעמים היו נתורה אלף הת״ך אות | מאות ך׳ אטה יהיו אלף תר,״ך כמכוון: ולא | LEDGER §7 (correction/withdrawal) | **SCANNED_RESEARCH** |
| 11 | 6 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת סנדל nyתירה והא איש שתו עדיו עליו נראה חוץ כי לי התפילין | לתפארה כידוע. כמדבר ג' ספיים כננד נצח הוד | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 12 | 7 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרל עוז תורה הור יפור ופפר רכרים מרמז על | י״כ מאות כ״ד, ואמרתי כי כשם שיום החמשים | LEDGER §3.8; CHECKPOINT_2 §E; CHECKPOINT_3 §E,G | **SCANNED_RESEARCH** |
| 13 | 8 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 8אהבת מגדל עוו תורה החמשים אינו מן ר,מנין יום כן כ״ה | כרח העם נ' היכות החכמים י״א ובת פרער, | CHECKPOINT_3 §D | **SCANNED_RESEARCH** |
| 14 | 9 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרל עוז תורה ה פרעה אחרי שלקחה לו לכן | השם יתכרך כמנין ישראל ולכן כר.יכ 2 כאז | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 15 | 10 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 10אהבת מנדל עח תורה כאן ההנוכי להראות שד׳ עמם ולו | אלף הה״ך הין נמו אלף תר,״ך שמות של | LEDGER §3.11 | **SCANNED_RESEARCH** |
| 16 | 11 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מנרל עח תורה ו של הוי״ה בהורה וניסוך המים | התורה שליש ער עשרים נרה וירוע שמרוכע עורף | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 17 | 12 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 12אהבת מגרל עו( תורה עורף על העיגול •צליש נמצא אם | מקרשם ק״ר, תיבור, ועור מן רבר אל אהרן | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 18 | 13 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרל עוז תורה ז אהרן ער מקרשם רכ״ר היכות | הת״ך השלימו אה המנין כמו שהבאתי שם בשם | LEDGER §3.9 | **SCANNED_RESEARCH** |
| 19 | 14 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 14אהבת מנדל עוז תורה בשם הדבינו בחיי שכתב בפדשת עקב | כפר״ת וכן במחזור של י״ט שנים יש י״ב | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 20 | 15 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגדל עוז תורה י״ב שנים פשוטות וז׳ מעוברות ואסרתי | שאמרו חבז״ל ישר בחך ששברת את הלחות: במזמורים | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 21 | 16 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 16אהבת מגרל עוז תורה ב מז מו רי ם שאומרים כשכת כהכנסה לכו נרננה | אלף תרפ״ח מן אלף ער יו״ר עולה נ״ה | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 22 | 17 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגדל עוז תורה ט נ״ה מן אלף הי ער עולה | לר' אלקינו עיין שם, וירוע מה כי 3 שהיא | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 23 | 18 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | 18אהבת מגדל עו( תורה שהוא נקוד אינו מן הטנין נמצא | תםר לטנין הראשון אלף תת״ך. וטהפלא ששטות ראוכן | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 24 | 19 | חלק א׳ — מגדל עוז (חשבונות/גימטריאות מפוזרים, בעיקר סביב 1820/1830) | אהבת מגרל עוז תורה ראוכן נר אפרים בנימין אשר נפתלי | הללו נמצאו בתר,לים ם״ח שרומז על התודה הקדושה: | LEDGER §4 (כללי) | **PARTIAL_RESEARCH** |
| 25 | 20 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | 20אהבת אורין תליהא' תורה אורין תליתאי. )שבת פ׳יח( ד ר ש ההוא | ב״א ומהם רבר נ' ה׳ פעמים ם״ח תיבות. תורה | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 26 | 21 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | אהבת אורין תליהאי תורה יא תורה עי( נועםים אלף ואחד | פעם אחד ב׳ תיבות. אנשי סדום ג׳ פעמים | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 27 | 22 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | 22אהבת אוריין תליהא' תורה פעטים נ״א היבות, אכיטלך י״ג פעטים | ד׳ דבר ב׳ פעמים אלף רל״ז תיבות. תורה | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 28 | 23 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | אהבת אוריין תליתאי תורה יב תורה ז׳ פעמים קפ״ו תיבות. | תיבות. תורה מ״ז פעמים אלף רנ״ד תיבות. משד, | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 29 | 24 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | 24אהבת אוריין תליהא' תורה משה י׳ פעמים ש״י חיכות. אהרן | תיבות. שרי בלק השניים פעם אחר כ״ו ר.יכוח | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 30 | 25 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | אהבת אוריין תליתא' תורה יג תיבות. אתון ב׳ פעמים נ״נ | תימה. בני תר, פעם אחר ב' 4 תיבות | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 31 | 26 | אוריין תליתאי (שבת פ״ח) — טבלאות פעמים/תיבות לפי דמויות וקבוצות | 26אהבת אוריין תליתאי תירה תיבות. שלשה עדרי צא; ד׳ פעם | היקום. בחורש נבקעו טעינות וארובות הנשם בעצם צפיר | LEDGER §3.5; CHECKPOINT_4 (כולל) | **SCANNED_RESEARCH** |
| 32 | 27 | שרשים בתורה (רשימת 1820 שרשים/יחידות לקסיקליות, לפי סדר הופעה) | אהבת שרשים בתורה תורה יה צפור בערו ותרם ויכםו. ההרים | יגיע לקטו. ינר נל שהרותא. והמצפה יריתי — שור | LEDGER §3.6 | **PARTIAL_RESEARCH** |
| 33 | 28 | שרשים בתורה (רשימת 1820 שרשים/יחידות לקסיקליות, לפי סדר הופעה) | 28אהבת .שרשים בתורה תורה שור ויחץ פרות ועירים ורוח, יפנשך | מלמטה בריחים פרכת וויהם רוקם פנתיו. לדשנו ויעיו | LEDGER §3.6 | **PARTIAL_RESEARCH** |
| 34 | 29 | שרשים בתורה (רשימת 1820 שרשים/יחידות לקסיקליות, לפי סדר הופעה) | אהבת שרשים בתורה תורה טו ויעיו ומזרקותיו ומולנותיו מכבר רשת | יחסלנו תאנור הצלצל יראה ובמצוק והענוג וכשליהה. שש | LEDGER §3.6 | **PARTIAL_RESEARCH** |
| 35 | 30 | שרשים בתורה (רשימת 1820 שרשים/יחידות לקסיקליות, לפי סדר הופעה) | 30אהבת שרש'ם בתורר, תורה שש ונםחתם תרניע וראכון — שורש | ק״ט. ם״ר, נ׳ אלף שי״ב. ויקרא קי״ב צו | LEDGER §3.6 | **PARTIAL_RESEARCH** |
| 36 | 31 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | אהבת אותיות ר,תורה תורה טז צו ק״ט שמיני פ״ר תזריע | חקר, ק״א כלק ע״ה פנהם שמ״ג מטות ק"מ | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 37 | 32 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | 32אהבת אותיות התורה תורה פטעי קע״נ. ם״ה ו׳ אלף ק״פ. | חיי שע״ח תולדות שי״ב ויצא תר״ט וישלח תקמ״ח | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 38 | 33 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | אהבת אותיות ההורר! תורה תקמ״ח וישב שע״ח מקץ תע״ט ויגש | קי״ח צו פ״ב שמיני נ״ח תזריע 6 צ״ח | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 39 | 34 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | 34אהבת אותיות הר״ורה תורה צ״ח מצורע ק' אחרי מ״ב קדשים | ע״ח וינש ע״א ויחי ל״ח. ס״ה תש״מ. שטות | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 40 | 35 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | אהבת אוהדות ההורה תורה יח שמוה פ״ו וארא ק״ב ק״י בא | קל׳׳ט פנחם תי׳ג מטות רעי׳ה מסעי ק״צ. ם״ר, | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 41 | 36 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | 36אהבת אותיות התורה תירה ס״ה ט׳ אלף תתקפ״נ. רכרים ר״ל | שרה ה' אלף שי״ר תולרור. ה' אלף תכ׳יו | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 42 | 37 | סופר ומונה אותיות התורה (מטריצת אות×פרשה, סה״כ 304,812 אותיות) | אהבת אוהיות וזתורה תורה ייט תכיו ויצא 1׳ אלף תקי״ב | רות ק״ו ל״ו איכה קי״ר קהלת ק״א ; אםו־1ר | LEDGER §3.7 | **PARTIAL_RESEARCH** |
| 43 | 38 [OCR-ambiguous] | חמש מגילות — מניין פסוקים (אסתר/שה״ש/רות/איכה/קהלת) | 36אהבת חמש סנילות ^ אסתר י״ח שיר השירים י״א רות | הצטרך להפיל ל״ו אלף רפ״ח ורוק: 1 m | — | **NOT_RESEARCHED** |
| 44 | — (blank/transition leaf) | דף מעבר/ריק בין חלק א׳ לחלק ב׳ | חלה ב׳ | חלה ב׳ | — | **NOT_RESEARCHED** |
| 45 | — (blank/transition leaf) | דף מעבר/ריק בין חלק א׳ לחלק ב׳ |  |  | — | **NOT_RESEARCHED** |
| 46 | 1 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בראשית | אהבת בראשית תורה פרשת ברא^טיר^ ב פ ר ש ת נדאשית כהיב ג׳ פעמים | לסבול ואם תיטיב מעשיך תוכל לשאת 1 המשא | CHECKPOINT_2 §A,§E; CHECKPOINT_3 §G | **PARTIAL_RESEARCH** |
| 47 | 2 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — נח | אהבת נח תורה ר,מ»א ואם לא ותכעום לפתח חטאת רובץ | פירושו כן וכתיב זנור, יין ותירוש יקח לב | — | **NOT_RESEARCHED** |
| 48 | 3 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — נח/לך לך/וירא | אהבת נח לך וירא תורה לב )ר,ושע ד׳ י״א( ועל | כן דרשו חכז״ל ואפשר שרומז נ״כ על מד, | — | **NOT_RESEARCHED** |
| 49 | 4 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וירא/חיי שרה | אהבת וירא חיי תורה »ה שבתנו הספרים הקדושים שמקודם סנתוספד! | מכם מאה ידחפו אחד על עשדים : קכ״ז | — | **NOT_RESEARCHED** |
| 50 | 5 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — תולדות | אהבת הולרות תורה ר,כ״ז שגר, שהיתר. שרה אמנו ולא נוכר | לכן חכה עד שיהי׳ כן ארכעים לכינה: ותאמר | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 51 | 6 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — תולדות | אהבת הולדות תורה לתאמר כן אם למר, זה אנכי ותלך לדרוש | נם קצת רוחניות מעל וכדכתיב ומלאה הארץ דער, | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 52 | 7 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — תולדות/ויצא | אהבת הולדות ויצא תורה רעה כמים לים מכסים אף כי שתראה | הכעו אותן אם כי שלחו להן פרחים לסימן התניעה | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 53 | 8 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ויצא/וישלח | אהבת ויצא וישלח תורה התביעה ויען שנהפך לאבל מחולינו זורקי! | שטן כי היה כו קצת טוב כירוע: ויבא | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 54 | 9 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וישלח/וישב | אהבת וישלח וישב תורה ה ליבא יעקב לוזה אשר בארץ | היה שונא לארם ומזה היהה נסבה 2 שנתגלגלו | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 55 | 10 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וישב | 10אהבת וישב תירה שנתנלנלו למצרים וכזה נפרש המררש וישלח שכתכ | כספר שמות תרץ פעם במפר ויקרא תכ״ח כספר | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 56 | 11 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וישב | אהבת וישב תורה ו בםפר במדבר תל״ח ובםפר דברים תל״ה | זה יוסף ונראין לבאורה בסותרין זה לזה: ויהי | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 57 | 12 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — מקץ/ויגש | 12אהבת מקץ ויגש תורה * פרעת מר,ץ ןיד**׳ מקץ שנתים | פניך עוד הפעם י״ז שנים במו שראיתיך בהיותך | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 58 | 13 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ויגש/ויחי | אהבת ויגש דחי תורה ז בהיותך נער ונקראת חי ולא | כי המילוי מן אפרים מנשה עלה תרל״ז וחסר | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 59 | 14 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ויחי (המשך, ללא כותרת ברורה) | 14אהבת וחסר אחד לתרל״ח במנין אברהם יצחק יעקב כמו שבתבו | השבעה לי וישבע לו שלא בנקיטת חפץ: יעקב | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 60 | 15 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ויחי/שמות | אהבת ויח' שטות תורה י ע ס ב אטר לרחל ההחת אלקים אנכי | שרו של מצרים להרוג את משה וכשם שנראה | CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B | **PARTIAL_RESEARCH** |
| 61 | 16 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — שמות/וארא | 16אהבת שמוה וארא תורה שנראה שם כתמונת איש כרכתיב ויאבק | השם כ״ר. וזאת הכין משה רכינו : העתירו | — | **NOT_RESEARCHED** |
| 62 | 17 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וארא | אהבת וארא כא תורה ט הכ תי רן ורב ר׳ אל מהיות קולות אלקים | נתל אחר שראשי תיבות של "ורחמיו 3 על | — | **NOT_RESEARCHED** |
| 63 | 18 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בא/בשלח | 18אדגת בא נשלח תורה ״על יכל ״מעשיו הוא עכו״ם ואמרו | ואמרו הערב רב נככים הם כארץ מרח חכא | — | **NOT_RESEARCHED** |
| 64 | 19 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בשלח | אהבת ׳נשלח תורה רובא דרובא מערב רב בישראל והיינו שהוגד | כתיב וימד שש לה השעורים ואמרתי שש כי השעורים כמו | — | **NOT_RESEARCHED** |
| 65 | 20 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בשלח/יתרו | 20אהבת בשלח יתרו תורה בסו ששית סן האיפת ברבתיב בשנת | ואז הצילם ר׳ מיריהם ומאלהיהם הרי שר׳ גדול | — | **NOT_RESEARCHED** |
| 66 | 21 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — יתרו/משפטים | אהבת יתרו משפטים תורה יא גרול מנל האלקים וכן כנחמיה | איש ומכרו כין מנה אכיו ואמו וכין מקלל | — | **NOT_RESEARCHED** |
| 67 | 22 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — משפטים/תרומה | 22אוזבת משפטים תרומה תורה מקלל אכיו ואמו וכפ׳ כי תצא | ברום שלש עולה עיה אמור. נמנין כהן: זה | — | **NOT_RESEARCHED** |
| 68 | 23 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — כי תשא | אהבת בי תשא תורה * פרשת פ תשא. ז ה יתנו | כזו פ' שתהיה כל ד,פ׳ דכרי הש״י כלכדו; ומשרתו | — | **NOT_RESEARCHED** |
| 69 | 24 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — תשא/ויקהל/פקודי | 24אהבת תשא ויקהל פקודי תורה ו מ ש ר תו יהושע נון כן נער לא | הענל עיין שנ^ ואני מצאתי רנ״ר עשיין כפרשת | — | **NOT_RESEARCHED** |
| 70 | 25 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — פקודי/ויקרא | אהבת8קורי ויקרא תורה נפרשת תרומה ם״ב פעם בפ׳ תצור, ח’ם׳ DVb | אפילו הכי מוסיף חומש ולא פלוג ; על | — | **NOT_RESEARCHED** |
| 71 | 26 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — צו/שמיני | 26אהבת צו שמיני תורה פר>צ1צו. ת על־ שקורין שכת שלפני הפסח | על פקורי החיל כיון שכא לכלל כעם בא | — | **NOT_RESEARCHED** |
| 72 | 27 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — שמיני/תזריע/קדושים | אדזבת שמוני תזו״מ קדושים תורה כא לכלל טעות ע״ש ונראה | לחכירו הוא כי כמו נזילה אלא שאף שחכירו מרוצה | — | **NOT_RESEARCHED** |
| 73 | 28 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — קדושים/אמור/בהר | 28אהבת קדושים אטור נהר תורה מרוצה לזה ור,»קיר את אשתו | אחזתכם גאלר. תתנו לארץ ירוע שכאשר ישראל מלות | — | **NOT_RESEARCHED** |
| 74 | 29 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בהר/בחוקותי/נשא | אהבת נהר בחקתי נטרנר תורה טו בגלות נם הקנ״ה גולה | כארץ הוא ד' כי נחלתם ואמרו חנז״ל הזהרו כבני עניים | — | **NOT_RESEARCHED** |
| 75 | 30 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — נשא/בהעלותך | 30אהבת נשא בוועלותו תורה עניים שמהם תצא הורה אמנם הבכורים | משה עמדו ואשמער, מר, יצור, ה׳ לכם: זכרנו | — | **NOT_RESEARCHED** |
| 76 | 31 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בהעלותך/שלח | אהבת נחעלותך שלח תורה טז זכרנו את הרנה אשר נאכל | ר,ר,יר, לר, שום הויה נמת אשר נצא.תו מרחם | — | **NOT_RESEARCHED** |
| 77 | 32 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — שלח/קרח | 32אהבת י8!לח קרח תורה מרחם ויאנל חצי נשרו דהיינו שהמחר, | פרעה וקאי מהם על רתן ואנירם ; את | — | **NOT_RESEARCHED** |
| 78 | 33 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — קרח/חוקת | אהבת קרח חקת תורה אףן מחתת החטאים האלה כנפשוהם כי | שוד, אל הסלע ונם רחה הרמכ״ן 6 רכרי | — | **NOT_RESEARCHED** |
| 79 | 34 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — חוקת/בלק | 34אהבת חקת בלק תורה רברי הרטב״ם שאמר שהחטא היה במה | הרנתי ואותה החייתי, אולי כמקום לולי נם תיבות | — | **NOT_RESEARCHED** |
| 80 | 35 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בלק | אהבת בלק תורה יח תיבות גם יהחייתי קשה טאר, ונראה | ויחוסו כתורה ולא נתקיים ושם בו רשעים ירקב: בלעם | — | **NOT_RESEARCHED** |
| 81 | 36 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — בלק/פנחס/מטות/מסעי | 36אהבת בלק פנח 6 מטות םסעי תורה בלעם הרשע ריכר כתורת | פי על ר׳ ואלה מסעיהם למוצאיהם לא רחוק בעיני | — | **NOT_RESEARCHED** |
| 82 | 37 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — מסעי | אהבת מםעי תורה יט כעיני לפרש מוצאיהם מה שהשיגם כמו | של ישראל ואז יצא וישוב לעיר אחוזרזו ואי: | — | **NOT_RESEARCHED** |
| 83 | 38 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — מסעי/דברים/ואתחנן | 38אהבת טםעי רכרים ואתחנן תורה ואין אדם אשר יעשה טוב | פרשתי מה שאמר כעל המניד והיא שעמדר, לאבותינו | — | **NOT_RESEARCHED** |
| 84 | 39 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ואתחנן/עקב | אהבת ואתחנן עקב תורה לאבותינו ולנו דהיינו טעת יציאת טצרים | לארם לנצח את החיות הנרולור, כמו אריה, ולביא | — | **NOT_RESEARCHED** |
| 85 | 40 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — עקב | 40אהבת עקב תורה ולביא כקשת ולברואים קטנים שירכו בגוף ר,ארם | הענל וסנך לא. מנעת מהם נמציא שילא אכלו | — | **NOT_RESEARCHED** |
| 86 | 41 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — עקב/ראה | אהבת עקב ראה תורה כא אכלו מן נרוחניי אם ני תשעים | חנז׳׳ל שהמלאכים רצו לומר שירה והקב״ה 6 אמר | — | **NOT_RESEARCHED** |
| 87 | 42 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — ראה/שופטים | 42אהבת ראר, שוווטים תורה אמר לתם מעשה ירי טוכעים כים | אשר כנה נטע כרם נשא אשה כהן מדבר | — | **NOT_RESEARCHED** |
| 88 | 43 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — שופטים/כי תצא | אהבת שופטים תצא תורה כב מרבר ושוטר משמיע מי האיש | ונסמך לזה לא ר,ביא אתנן זונר, ומחיר כלב | — | **NOT_RESEARCHED** |
| 89 | 44 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — כי תצא/כי תבוא | 44אהבת תצא תנא תורה כלב בית ד' אלקיך אף שבוודאי | נראה שד' יש לו שמחה לשלם להם כעולם | — | **NOT_RESEARCHED** |
| 90 | 45 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — כי תבוא/ניצבים/וילך | אהבת תנא נצנים וילך תורה כג בעולם ר,(ר, את עונותיהם | אמד את מן ר׳ האמרר, היום נקשו פני אה | — | **NOT_RESEARCHED** |
| 91 | 46 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וילך | 46אהבת וילך תורה אה פניך ר' אבקש אף כי שהוא שר | נצבים וילך הרנינו גוים עמו פ׳ על האזינו ובפר | — | **NOT_RESEARCHED** |
| 92 | 47 | חלק ב׳ — חידושים לפי סדר פרשיות השבוע (בראשית עד וזאת הברכה) — וילך/האזינו/וזאת הברכה | אהבת וילך האדנו כרכה תורה כד וכפר אדמתו עמו פ' על | כאשמנו או שנרמז הו' בשש תיכות העודפים על | — | **NOT_RESEARCHED** |
| 93 | 48 | מגילת אסתר — חידושים | 48(>הבת מגילה «&הי תורה על אותיות האל״ף כי״ה רהייגו רופי | ומונן לפרעניות כדכתיב משגיא לנוים ויאנרם : אמרו | — | **NOT_RESEARCHED** |
| 94 | 49 | מגילת אסתר — חידושים | אהבת מגילת אסתר תורה כה א ט רו חכז״ל חייב אדם לכסומי | בי מצאנו אני חן ועמך הלוא בלכתך ך עמנו | — | **NOT_RESEARCHED** |
| 95 | 50 | השמטות (addenda/תוספות בסוף הספר) | 50אהבת השמטות תורה עמנו ונפלגו אני ועמך לשון פחות כמררנה | אכל ככני נרשון כתיב נשא נם הם: פרשת | — | **NOT_RESEARCHED** |
| 96 | 51 | השמטות (addenda/תוספות בסוף הספר) | אהבת העחטות תורה כד פרשת בר,עלתך. לא נתפרש בתורר. למר, | עליהם אף שלא היה כראי למלכות וניחא לפי | — | **NOT_RESEARCHED** |
| 97 | 52 | השמטות (addenda/תוספות בסוף הספר) | 52אהבת השמטות תורה לפי זה שכהוב כסוף הפרשה ונם כלק | אמנם כאשר ראיתי כפירוש הנאון מווילנא על ישעיהו | — | **NOT_RESEARCHED** |
| 98 | 53 | השמטות (addenda/תוספות בסוף הספר) | אהבת השמטותrmnבז ישעיהו קפיטל ג׳ פמוק נ׳ שכהכ כי שרי | רש׳י ז״ל בעצמו כתב ביחזקאל מ׳ז י״ח וזד. | — | **NOT_RESEARCHED** |
| 99 | 54 | השמטות (addenda/תוספות בסוף הספר) | &.4אהבת השמ)«ות ווה לשונו ואין עבר הירדן בתוך סגרים הללו | וכו׳. - עצת מררכי היא כמפורש במם׳ מגילה יג• | — | **NOT_RESEARCHED** |

## 4. Provenance detail for every SCANNED_RESEARCH page and flagged PARTIAL_RESEARCH page

Only pages with a positively-matched textual basis are listed; see §3 for the one-line version of each.

- **PDF p.6 → LEDGER §3.1 (SCANNED_RESEARCH).** Direct textual hit: the page states, in sequence, "בם' בראשית קס״ה" (Genesis 165), "נספר שמות שצ״ח" (Exodus 398), "בם' ויקרא שי״א" (Leviticus 311), "נספר במדבר שצ״ו" (Numbers 396), "נספר דברים תק״ן" (Deuteronomy 550), and then explicitly: *"ובכל התורה אלף ושמונה מאות ועשרים פעמים שם יהו״ה יתברך שמו"* — "and in the whole Torah, one thousand eight hundred twenty times, the Name YHVH." This is a verbatim match to all five book subtotals **and** the 1,820 total claimed in LEDGER §3.1. Highest-confidence match in this entire map.
- **PDF p.8 → LEDGER §3.2 / §3.3 (SCANNED_RESEARCH).** "אות סמך בתורה אלף תת״ל פעמים ותרגום על אדני" — "the letter samekh in the Torah [occurs] 1,830 times, and [YHVH in this context] is rendered by Targum as Adonai." This is the samekh↔Adonai linkage the ledger's §3.2/§3.3 method-significance section explicitly describes ("comparing that total to his Adonai count").
- **PDF p.10 → LEDGER §7, correction/withdrawal entry (SCANNED_RESEARCH).** Content: a discussion of the letter *tet* count "אלף תת״ך… שחסרו ט״ז אות טי״ת… בעשרת הדברות השניות" (1,820 tet-letters "intentionally," missing 16 tets, with a note about the second set of the Ten Commandments). This is precisely the claim the LEDGER's own §7 records as **withdrawn** ("NOT VERIFIED FROM SOURCE — do not carry it forward"). The page *was* read; the conclusion built on it was later retracted. Counted as SCANNED_RESEARCH (research occurred; the correction is itself part of the provenance trail, not evidence of non-research).
- **PDF p.12 → LEDGER §3.8; CHECKPOINT_2 §E; CHECKPOINT_3 §E,§G (SCANNED_RESEARCH).** Two ledger findings sit on the same physical page: "דרש דרש באמצע התיבות שהוכפלו" (the דרש-דרש repeated-word midpoint of §3.8) appears immediately before "בהגדה מן בהא לחמא עד גאל ישראל יש אלף תת״ך תיבות" (the Haggadah הא-לחמא→גאל-ישראל 1,820-word span of Checkpoint 2 §E / Checkpoint 3 §E,§G).
- **PDF p.13 → CHECKPOINT_3 §D (SCANNED_RESEARCH).** "…בשער החמשים… היום ב״ת לעומר…" — the 49th/50th-day Omer framing that Checkpoint 3 §D discusses (sum 1…49 = 1,225; the day-50 bridge explicitly left open in the ledger).
- **PDF p.15 → LEDGER §3.11 (SCANNED_RESEARCH).** "…תת״ך היינו מחלה נערה חגלה מלכת תרצה שרח… וחשבתי שרח… ונראה שדעתו שאשר קראה שרח" — an explicit discussion of Serah's identity (invoked three times on this page), matching §3.11's "Entity-identity reasoning (Serah example)" exactly, alongside a 1,820-construction using the names of Zelophehad's daughters plus Serah.
- **PDF p.18 → LEDGER §3.9 (SCANNED_RESEARCH).** "…מן את קח הלוים אל עד הקדש רי״ב תיבות, ומן זאת עד במשמרתם ל״ז תיבות, הרי רל״ט תיבות" — a bounded span (Levites passage) totaling exactly **239 words**, matching §3.9's "culminates in 239 words" verbatim.
- **PDF pp.25–31 → LEDGER §3.5; CHECKPOINT_4 in full (SCANNED_RESEARCH).** Running header "אוריין תליתאי" confirmed on every page in the range. Content includes the named entity/attribution table cited throughout Checkpoint 4: יעקב, לבן, רחל, לאה (p.26); אבימלך, יצחק, רבקה (p.27); משה, העם, אהרן (p.28-29); אתון, מלאך, משה ואלעזר, **בנות צלפחד** (p.30, matching Checkpoint 4 §A's explicit example list); שלשה עדרי צאן, בת שוע, המילדת (p.31). This directly corroborates Checkpoint 4 §A–§I's description of the פעמים/תיבות dual-metric table.
- **PDF pp.32–35 → LEDGER §3.6 (PARTIAL_RESEARCH).** Running header "שרשים בתורה" confirmed; content is a running word list (per-page fragments like "צפור בערו ותרם ויכסו…", "שור ויחץ פרות…"), matching the *shape* of §3.6's "1,820 units… ordered by first appearance." Marked PARTIAL rather than SCANNED because the ledger itself states "open work: extract the full list" — i.e. the source document's own author admits the list was not exhaustively transcribed/verified.
- **PDF pp.36–42 → LEDGER §3.7 (PARTIAL_RESEARCH).** Running header "אותיות התורה" confirmed; content is a letter×parasha numeric table (e.g. p.36: "צו ק״ט שמיני פ״ד תזריע נ״ו…"). Matches §3.7's structure. Marked PARTIAL because LEDGER §3.7 explicitly says "CELL VALUES NOT YET FULLY EXTRACTED… Open work: exhaust all letters א–ת."
- **PDF p.46 → CHECKPOINT_2 §A,§E; CHECKPOINT_3 §G (PARTIAL_RESEARCH).** This is the single PDF page carrying the "בראשית" running header before the header switches to "נח" on p.47 — i.e., all of Horowitz's Bereshit-parasha commentary is concentrated here. It is the natural location for the "ordinal position" example (`והאדם ידע את חוה`, Genesis 4:1) and the "ויהי אור…בין האור" bounded span (Genesis 1), both explicitly Bereshit-chapter content. **No exact-string grep match was obtained** for either phrase on this page (OCR corruption), so this is graded PARTIAL with the specific line-level location left **UNKNOWN** (§6) rather than claimed as certain.
- **PDF pp.50–60 → CHECKPOINT_2 §B,§C; CHECKPOINT_3 §A,§B (PARTIAL_RESEARCH).** Running headers confirm this range covers exactly the parasha sequence the ledger names in prose — "Toldot, Vayetze, Vayishlach, Vayeshev, Miketz, Vayigash, Vayechi" (Checkpoint 3 §A) — for the entity/attribution and Jacob-speech-decomposition material. pp.57–58 carry the מקץ/ויגש header and p.58 carries "ויגש…דחי" (Vayigash transitioning into Vayechi with no intervening parasha-break header), consistent with Checkpoint 3 §B's "textual boundary state" observation about the missing Vayigash→Vayechi break. Graded PARTIAL, not SCANNED, because: (a) the exact figures Checkpoint 3 §A cites for this cluster (Miketz=124, Vayigash=40, Vayechi=532) were **not** independently re-confirmed by exact-string search against this OCR layer; (b) the precise page for LEDGER §3.4's separate 1,820-word Jacob+Rachel+Leah claim, and for Checkpoint 3 §C's Asenath/Dinah discussion, remains **UNKNOWN** within this ten-page range (see §6).

## 5. Section-level rollup

| Section (running-header-verified) | PDF pages | Pages | Dominant status |
|---|---|---|---|
| Title/publisher insert (2016 re-scan front matter) | 1–2 | 2 | NOT_RESEARCHED |
| Approbation | 3 | 1 | NOT_RESEARCHED |
| Modern editor's foreword (אקדמות מלין) | 4–5 | 2 | NOT_RESEARCHED |
| חלק א׳ — מגדל עוז | 6–24 | 19 | 7 SCANNED, 12 PARTIAL |
| אוריין תליתאי | 25–31 | 7 | 7 SCANNED |
| שרשים בתורה | 32–35 | 4 | 4 PARTIAL |
| אותיות התורה | 36–42 | 7 | 7 PARTIAL |
| חמש מגילות (verse counts) | 43 | 1 | NOT_RESEARCHED |
| Blank/transition leaf | 44–45 | 2 | NOT_RESEARCHED |
| חלק ב׳ — פרשה-ordered chiddushim | 46–92 | 47 | 1 PARTIAL (p.46) + 10 PARTIAL (pp.50-60, less p.57-60 already in that span → see table) + 36 NOT_RESEARCHED |
| מגילת אסתר commentary | 93–94 | 2 | NOT_RESEARCHED |
| השמטות (addenda) | 95–99 | 5 | NOT_RESEARCHED |
| **Total** | **1–99** | **99** | — |

## 6. Pages/claims where existing documentation does not allow a safe page-level determination — marked UNKNOWN per STOP CONDITION

The task's stop condition applies squarely here: the four research documents record **no page numbers**, so every mapping above is a *reconstruction*, not a citation. Some reconstructions are solid (§4); others are not safe to assert. These are explicitly left unresolved rather than guessed:

1. **LEDGER §3.4** (יעקב + רחל + לאה = 1,820 spoken words, with the specific decomposition Jacob 1,597 / Rachel 107 / Leah 116) — thematically belongs somewhere in the Toldot→Vayechi parasha range (PDF 50–60), but its numbers do **not** match the different פעמים/תיבות table found on PDF p.26 (Jacob 14×/490, Rachel 12×/71 — a different, already-identified table per Checkpoint 4 §A's explicit warning not to conflate these two kinds of tables). Exact page: **UNKNOWN**.
2. **CHECKPOINT_2 §D** (1,820 "holy names," category/representation-membership count) — could belong to the divine-name-counting material in "מגדל עוז" (PDF 6–18, where Tetragrammaton/Adonai/samekh counts already cluster) or to the Bereshit page (46). No safe string match found either place. Exact page: **UNKNOWN**.
3. **CHECKPOINT_3 §C** (Asenath/Dinah/Joseph identity resolution) — thematically fits the Joseph-story parashiot (Vayeshev–Vayigash, PDF ~55–58) but no exact match for "אסנת" or "דינה" was found in the OCR text (likely OCR corruption of these names, not absence of the passage). Exact page: **UNKNOWN**.
4. **LEDGER §3.10** (cross-text numerical reconciliation between parallel biblical passages) and **§3.12** (30 two-letter words → 1,830/2,501/671 multi-path convergence) — both plausibly sit somewhere in the general "מגדל עוז" zone (PDF 6–24) alongside the other confirmed 1,820/1,830 constructions, but no specific page returned a safe exact-string match. Exact page: **UNKNOWN**.
5. Two additional 1,820-style gematria constructions were located by search but **could not be tied to any specific cited ledger claim** — PDF p.9 ("שני שמות … מקדש אדנ״י") and PDF p.11 ("חטא/וחטאה/נקה/ונקה … עולין אלף תת״ך … אדניה"). These are real content on the scan, consistent with LEDGER §4's general statement that "the early pages contain many 1,820 correspondences," but since neither the LEDGER nor any checkpoint quotes these specific phrases, they cannot be credited as provenance for a **named** finding. Both pages remain PARTIAL_RESEARCH in the table (general-zone engagement), not upgraded to SCANNED_RESEARCH for a specific §.
6. **No page in this map was assigned SEARCH_HIT_ONLY.** This is a reporting limitation, stated explicitly rather than silently omitted: the four research documents preserve only *extracted findings*, not a search-query log. There is no artifact in this repository (or on the `gpt/ahavat-torah-research-ledger-*` branches) recording which pages were merely returned by a search and not read. If such a log exists outside what was supplied to this task, it was not available here, and this map cannot manufacture that distinction — it can only distinguish "content with a positively matched, cited finding" (SCANNED_RESEARCH), "content in a zone the ledger discusses only in general/structural terms, or a specific finding whose exact page is unconfirmed" (PARTIAL_RESEARCH), and "no citation or textual trace found at all" (NOT_RESEARCHED).

## 7. Already-researched pages (SCANNED_RESEARCH) — 14 / 99

**6, 8, 10, 12, 13, 15, 18, 25, 26, 27, 28, 29, 30, 31**

## 8. Partial / general-zone-only pages (PARTIAL_RESEARCH) — 35 / 99

**7, 9, 11, 14, 16, 17, 19, 20, 21, 22, 23, 24** (מגדל עוז general zone — engagement per LEDGER §4, no page-specific citation) · **32, 33, 34, 35** (שרשים בתורה, structure confirmed, list not exhausted per LEDGER §3.6) · **36, 37, 38, 39, 40, 41, 42** (אותיות התורה, structure confirmed, cells not exhausted per LEDGER §3.7) · **46** (בראשית, thematic match, no exact-string confirmation) · **50, 51, 52, 53, 54, 55, 56, 57, 58, 59, 60** (Toldot→Vayechi, range named in Checkpoint 3 §A, exact-page detail unconfirmed).

No pages qualified for **SEARCH_HIT_ONLY** — see §6 item 6 for why.

## 9. Not-researched pages (NOT_RESEARCHED) — 50 / 99

**1–5** (front matter/publisher insert/approbation/modern foreword — outside the book's own research scope) · **43** (חמש מגילות verse-count table — never cited) · **44–45** (blank/transition leaf) · **47, 48, 49** (Noach, Lech Lecha, Vayera/Chayei Sarah — no citation found) · **61–92** (Shemot-through-Vezot HaBerachah parasha commentary, i.e. essentially the entire back half of חלק ב׳ beyond the Toldot–Vayechi cluster — no citation found for any page in this 32-page span) · **93–99** (Megillat Esther commentary + addenda — Book Map §C explicitly deprioritized this layer, and no checkpoint content was found here).

## 10. % researched — computed explicitly, with formula

Let `S` = SCANNED_RESEARCH pages, `P` = PARTIAL_RESEARCH pages, `H` = SEARCH_HIT_ONLY pages, `N` = NOT_RESEARCHED pages, `T` = 99 total pages.

Counts: `S = 14`, `P = 35`, `H = 0`, `N = 50`. Check: `14 + 35 + 0 + 50 = 99` ✓.

**Strict formula** (only fully-provenanced pages count as "researched"):

```
% researched (strict) = S / T = 14 / 99 = 14.14%
```

**Weighted formula** (credits partial engagement at half weight and a hit-only page at low weight, per the task's own status ontology — SEARCH_HIT_ONLY never counts as scanned, so it is weighted far below PARTIAL):

```
% researched (weighted) = (S×1.0 + P×0.5 + H×0.1) / T
                         = (14×1.0 + 35×0.5 + 0×0.1) / 99
                         = (14 + 17.5 + 0) / 99
                         = 31.5 / 99
                         = 31.8%
```

Both numbers are reported because the task does not specify which convention to use; **14.14% is the conservative/defensible figure for "pages with a fully cited, source-verified existing finding,"** and **31.8% is the more generous figure that also credits structurally-engaged-but-unexhausted sections** (שרשים בתורה, אותיות התורה, the general מגדל עוז zone, and the Toldot–Vayechi cluster).

## 11. Next-unscanned page/section — where continuation should resume

The LEDGER's own §8 "Open research queue" (written by the prior research session, before this map existed) gives an explicit priority order. Cross-referencing that order against this page map:

- **Primary recommendation — PDF pp.36–42 ("אותיות התורה")**: LEDGER §3.7 and queue item #4 ("Exhaust letter × parasha tables א–ת, including book totals and all textual/masoretic exceptions") flag this as open work in a section whose location is now precisely known and whose structure is already partially engaged. This is the highest-value, best-localized next target.
- **Secondary — PDF pp.19–24** (remaining un-cited מגדל עוז zone) and **PDF p.43** (חמש מגילות, never touched at all) — both sit inside the "quantitative layer" the LEDGER's Book Map §2 says should be exhausted before deep parasha work, and both are now precisely localized by this map.
- **Tertiary — PDF pp.47–49 and PDF pp.61–92**: this is the genuinely untouched majority of חלק ב׳ (parasha-ordered chiddushim). Per LEDGER Book Map §2's own stated priority ("mined after the quantitative layer is exhausted"), this should be the **last** frontier, not the next one — flagged here so a future session does not jump ahead of the source's own stated research order.
- **PDF pp.93–99** (Megillat Esther + addenda) remain explicitly lowest priority per Book Map §C.

## 12. Explicit non-actions (per DO-NOT-TOUCH)

This deliverable does **not**: perform new content research or interpretation; compute or verify any gematria value through the canonical engine; canonicalize any finding; modify engine/schema/UI/Master State/Roadmap; insert content into the website or any live table; merge any branch into `main`; or deploy. It is a docs-only coverage/provenance report on this feature branch, built from (a) direct, reproducible structural facts read from the PDF itself (page count, running headers, OCR page-number pattern) and (b) cross-references to the four existing `AHAVAT_TORAH_RESEARCH_*` documents (read via `git show` from `gpt/ahavat-torah-research-ledger-v4`, not merged). Where those two sources together could not safely establish a page-level fact, the item is marked UNKNOWN (§6) rather than resolved by inference or new interpretation.
