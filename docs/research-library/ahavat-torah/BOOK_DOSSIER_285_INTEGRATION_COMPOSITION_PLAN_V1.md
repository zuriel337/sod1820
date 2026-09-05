# אהבת תורה / ספרים — תוכנית-חיבור Source→Screen (INTEGRATION_OWNER, פאס 1)

> **מעמד:** מסמך-תיאום/תכנון בלבד — **לא** חוזה קנוני, **לא** מיזוג, **לא** הטמעה. תגובה לפקודת-התיאום `work_log 807d439f-085d-4956-8f63-4af21ddd3907` (task=BOOK_DOSSIER_285_RECONCILIATION_V1), בתפקיד **role=INTEGRATION_OWNER**.
> **תלות:** חלקים המסומנים **[SOURCE_OWNER — TBC]** ממתינים למניפסט הרשמי של role=SOURCE_OWNER (הסשן המחזיק PR#285) שטרם נכתב ב-work_log נכון לזמן כתיבת מסמך זה. אינם מוצגים כאן כעובדה סגורה.
> **לא נעשה בפאס הזה:** אין scan מחדש, אין מחיקת מחקר, אין merge, אין deploy, אין schema/DB/RLS/engine write, אין canonicalization, אין הטמעת-מוצר חדשה.

---

## 0. מצב חי מאומת (בעת כתיבה, 5.9.2026)

| רכיב | מצב | הערה |
|---|---|---|
| `origin/main` | `bae282da2c8f910b1b50ca8a597f87e832b92f16` | מאומת-חי |
| PR #285 (`claude/ahavat-torah-letter-dataset-closure`) | `004fc421399a2ea67a30be402d1ee54c8a8e0417`, OPEN/NOT MERGED | 13 קבצי docs, +2330/-0 |
| ענף-הטבלאות (PR #331, `claude/ahavat-torah-closure-matrix-lf161n`) | `a5b635f3766582ee4908072bdbb7a4386256b894`, 1 ahead/0 behind main, NOT MERGED | `public/book.html` + `public/book-data/ahavat-torah.tables.json` |
| ענף GPT (`gpt/book-research-context-spatial-v1`) | `8545a29200262e4ebd52340396ced716ff2cb432`, 8 ahead/0 behind main, NOT MERGED | `BookHubPage.jsx`, `BookSpatialView.jsx`, `bookResearchProjection.js`, migration SQL, App/vercel routing |
| `entity_types.type='book'` | **חי, כבר-מיושם** (1 שורה) | המיגרציה שבענף GPT כבר הורצה בפועל — לא להריץ שוב |
| `nodes.type='book'` | **חי** — 2 שורות: `book:ahavat-torah`, `book:sefer-hapliah`, שתיהן `is_active=true` | זהות-ספר קיימת ב-DB כבר עכשיו |
| `research_objects` עם `source_ref` שמתחיל ב-`book:hebrewbooks:5635`/`hebrewbooks:5635` | **2 שורות בלבד** | לעומת עשרות datasets/187 שורות-אותיות/70 content_blocks/10 סתירות שקיימות **רק ב-git** (PR#285 ואחיו) ולא-הוזנו-מעולם ל-`research_objects` |

**מסקנה קריטית אחת:** יש כרגע **שלושה** "מסכי-ספר" נפרדים שמתחרים על אותו נתיב `/book`, ואף אחד מהם לא ממוזג:
1. **הסטטי** (`public/book.html`, GPT, כבר **חי בפרודקשן** דרך Vercel rewrite `/book*→/book.html`).
2. **הטבלאות שלי** (תוספת על גבי #1, PR#331, לא-ממוזג).
3. **ה-React Book Hub** (GPT, PR הענף `gpt/book-research-context-spatial-v1`) — **מוחק את ה-Vercel rewrite של #1/#2** ומחליף ב-React Router `/book`,`/book/:slug`. **אם זה ימוזג כמו-שהוא, #1 ו-#2 הופכים לקוד-מת בלתי-נגיש** — לא קונפליקט-git, קונפליקט-ניתוב.

זו בדיוק הבעיה שהתוכנית הזו נועדה לפתור — **מסלול אחד**, לא שניים-שלושה.

---

## 1. מיפוי-יכולות KEEP / ADAPT / PARK

### KEEP — לשמר כמו-שהוא, לבנות מעליו

| יכולת | מקור | למה KEEP |
|---|---|---|
| זהות-ספר ב-DB (`nodes.type='book'`, 7 דרגות-זהות Book≠Edition≠Witness≠Digital Object≠Locator) | GPT migration, **כבר חי** | תואם §9.2 במדויק; זה עוגן-הזהות שהכל-אחר צריך להיתלות-עליו |
| `bookResearchProjection.js` (`pageFromSourceRef`, `fetchBookResearch`, `summarizeBookResearch`) | GPT | קוד נקי, RLS-aware (`permissionLike` fail-closed), לא-מרחיב-ACL |
| אינטראקציית "קליל על עמוד → קופץ PDF" | שני הענפים (התכנסו-עצמאית לאותו פתרון) | UX מוכח, לשמור מימוש-אחד לא-שניים |
| טיפוגרפיה `Frank Ruhl Libre` + גוון-זהב מדויק `#d4af37` בכותרות | `BookHubPage.jsx` CSS | היחיד מבין שלושת-המסכים שבאמת-תואם את **שפת-העיצוב — ההיכל המלכותי** (הצבע/הגופן; לא כל-המוטיבים) |
| סכמת ה-JSON הגנרית (datasets/calculations/exceptions/relations/sources/occurrence_tables/page_register/content_blocks/number_families/contradictions) | ענף-הטבלאות שלי | **מאומת-בפועל שהיא book-agnostic**: `/book/sefer-hapliah` (בלי bundle) מציג הודעת-ריק נקייה, לא שגיאה — נבדק ב-headless browser, לא רק-נטען |

### ADAPT — קיים, צריך תיקון/מיזוג לפני מסלול-אחד

| נושא | הבעיה | מה-לעשות |
|---|---|---|
| **בעלות-נתיב** | שני מימושים שונים תובעים `/book`,`/book/:slug` | GPT's React Book Hub הוא הבסיס-הנכון להישאר (מבוסס-זהות-DB, תואם-מוסכמות Entity Hub/Explorer שהזיכרון מבקש reuse) — יכולת-הטבלאות-הגנרית שלי **עוברת פנימה** כטאב חדש/הרחבה, לא נשארת כדף-סטטי נפרד |
| **טאב "המחקר" (live)** | קורא רק `research_objects` (2 שורות!) — נראה כמעט-ריק למרות עומק-מחקר עצום שקיים ב-git | לתקן ניסוח: להבחין במפורש "X מתוך הקורפוס-המתועד כבר הועלה ל-Research Objects חי" מ"אין מחקר" — ולהצמיד קישור לטאב-הטבלאות (#4 למטה) לקורפוס-המתועד המלא |
| **שני snapshots ידניים כפולים** | `BookHubPage.jsx`'s `SNAPSHOTS.datasets` (13 שורות תמציתיות) **וגם** `ahavat-torah.tables.json` שלי (13+187+70+... שורות) — שניהם נבנו-ידנית **בנפרד** מאותו PR#285, כבר יש ניסוח-סטטוס לא-זהה (DS-06: "CLOSED/ANOMALY" מול "PARTIAL") | לאחד למקור-אחד — **[SOURCE_OWNER — TBC]** מי-מהניסוחים משקף-נכון-יותר את המניפסט הרשמי; לא-לפתור-כאן ידנית |
| **גרנולריות-ציטוט** | `pageFromSourceRef` שולף רק מספר-עמוד; טבלת ה-content_blocks שלי שומרת `block_id`+`source_ref` מדויק | בהעברה-פנימה: לשמר את רמת-הבלוק, לא-לצמצם ל-עמוד-בלבד (זה בדיוק הפער שה-Pre-Ingest Handoff של PR#285 כבר-דגל: "שתי גרנולריות-ציטוט שונות") |

### PARK — נכון להשאיר בצד עכשיו

| יכולת | למה PARK |
|---|---|
| `BookSpatialView.jsx` (3D, react-three-fiber) | ניסיוני, lazy-loaded, לא-חוסם; הזיכרון מפורש אוסר "no expanding 3D" בפאס הזה |
| מוטיבים מלאים של שפת-ההיכל (כתרים ♛, מפרידי-יהלום ◆, שפת "היכל"/"בני ההיכל") | פס-עיצוב נפרד, לא-חוסם את שכבת-האינטגרציה; המצב-הנוכחי (חלקי — צבע/גופן כן, מוטיבים לא) מתועד ביושר, לא מתוקן כאן |
| בליעה מלאה (bulk ingestion) של קורפוס-ה-git ל-`research_objects` | אסור-במפורש בפאס-הזה; שכבת-הטבלאות הגנרית משמשת **גשר-תצוגה** עד שהחלטת-Human-Gate נפרדת תאשר ingestion |

---

## 2. תוכנית-מסך מוצעת (עברית, טאב-אחד-מאוחד)

בסיס: מבנה-הטאבים הקיים ב-`BookHubPage.jsx` (עדיף על-פני שני-אפליקציות-ספר), עם טאב אחד חדש/מורחב:

```
/book                              ← אינדקס (קיים, KEEP)
/book/:slug
 ┌─ מבט־על          (קיים, KEEP — כרטיסי-מדדים + Coverage + זהות 7-שכבות + פתוח-כרגע)
 ├─ המקור            (קיים, KEEP — PDF+page-jump; ADAPT: לקבל גם page+block deep-link)
 ├─ הדוסייה המתועדת  (חדש/מוצע — מכיל את 10 הסקציות מהטבלאות: Datasets,
 │                    Calculations, Exceptions, Relations, Sources,
 │                    Occurrence Tables, Page Register, Content Blocks,
 │                    Number Families, Contradictions. מתויג "תיעוד git,
 │                    לא research_objects חי" בבירור, לא בשקט)
 ├─ המחקר החי        (קיים, ADAPT — ניסוח-מחדש שמבחין live-count מ"כלום"
 │                    + קישור להדוסייה המתועדת כמקור-המלא)
 ├─ שכבות            (קיים, KEEP — 9-השכבות, Book/Witness/Digital Object/...)
 └─ 3D / מרחב        (קיים, PARK — ללא-שינוי)
```

הנתיב האחד: **React Book Hub הוא המסלול הנשאר**; ה-Vercel rewrite הסטטי `/book*→/book.html` מוסר **רק כשה-DOSSIER הפנימי (הטאב החדש) כבר מכיל בפועל את כל מה שהדף הסטטי הציע** — לא לפני. עד אז שני-המסלולים נשארים בענפים נפרדים, לא-ממוזגים.

**Public / Premium / Research / Admin (נפרד מ-truth):** כל המסך נשאר Public-קריא (תואם-מציאות: ה-PDF כבר ב-Storage ציבורי, קבצי-ה-git כבר ב-repo ציבורי). בקרת-הגישה האמיתית נשארת **ברמת ה-DB** (RLS על `research_objects`, `permissionLike` fail-closed שכבר-קיים) — לא "הסתרת-טאב". טאב "הדוסייה המתועדת" (JSON סטטי) **אינו** מכיל דבר שמסומן privacy_scope מוגבל — קבצי PR#285 הם markdown/JSON גלויים ב-repo ציבורי מלכתחילה, לא `research_objects` rows עם privacy_scope. **פתוח לספרים עתידיים:** אם קורפוס עתידי כן יישא privacy_scope מוגבל, ה-bundle הסטטי חייב לסנן אותו לפני-בנייה — לא-נבדק-רלוונטי כרגע כי אין-כזה-שדה בקורפוס-הנוכחי.

---

## 3. תיקי-אימות שיש-להקים לשלב-ההטמעה (לא-הורצו — רשימת-חובה, לא PASS מזויף)

- [ ] תיקון-p35 מיוצג עם p36-scope-הישן נשמר כהיסטוריה, לא-נמחק
- [ ] רמות-סגירה של DS-06 (book-level סגור, row-level פתוח) לא-מוסתרות זו-מזו
- [ ] ציטוט-מדויק מול-פרפרזה נשארים מובחנים ויזואלית
- [ ] רשומות לא-פתורות (`unresolved_readings`) נשארות גלויות כשמורשה
- [ ] אין נתון-מקור שנעלם רק בגלל היעדר `research_object` תואם
- [ ] זהויות/locators/גרסאות שורדות בחירה→שמירה→פתיחה-חוזרת
- [ ] דאטה פרטי לא מגיע ל-bundle ציבורי (ר' §2 לעיל — ריק-רלוונטי כרגע)
- [ ] מצב-ריק כן של ספר-שני (`sefer-hapliah`) — **✅ כבר-נבדק בפועל** (headless browser, ענף PR#331): הודעת-ריק נקייה, לא-שגיאה
- [ ] טעינה-חסומה-בגודל (לא client dump מלא) — 251KB ל-אהבת-תורה עדיין-סביר; לספר-הפליאה (327 עמ') לבדוק-מחדש בהיקף

---

## 4. מה-לא-נעשה בפאס-הזה (חוזר-ומודגש)

אין scan מחדש, אין merge, אין deploy, אין schema/DB/engine write, אין canonicalization/publication, אין ingestion המוני ל-`research_objects`, אין הרחבת-3D, אין עבודת-טיפוגרפיה/P1/ELS. זהו תכנון-חיבור בלבד, ממתין לביקורת ZURIEL ולמניפסט SOURCE_OWNER לפני שלב-הטמעה.

---

## 5. תוספת (additive, לא-שינוי-הגוף למעלה) — התאמה לחוזי-מסגרת קיימים, per GPT crosswalk `work_log 9343b19f`

לאחר כתיבת §1-§4, התקבל crosswalk מ-GPT (`work_log 9343b19f-59ba-4e10-b2ae-41b573b1f844`) שהפנה לשני חוזים קיימים שהתוכנית-למעלה לא-ציטטה במפורש. הסעיף הזה **מוסיף** התאמה, לא-מוחק/לא-כותב-מחדש דבר מ-§1-§4 (שנשארים תקפים כלשונם).

### 5.1 `docs/sod1820-system-frame-contract-v1.md` — שלוש שכבות-על גלובליות

האתר כבר-מחזיק חוזה: **Top Navigator** (לגלות/לחקור/היכל/קהילה/ארכיון) + **Context Rail** + **Bottom Control Layer**. תוכנית-המסך ב-§2 (טאבי מבט-על/המקור/הדוסייה/המחקר/שכבות/3D) היא **ניווט-פנימי-לעמוד-ספר בלבד** — היא **אינה** שכבת-על רביעית, ולא מתחרה ב-Top Navigator/Context Rail הקיימים. זה תואם את החוזה כפי-שהוא (BookHubPage וה-tab-bar הפנימי שלה כבר-בנויים כך). **נקודה-פתוחה, מוסכמת עם GPT:** "ספרים" עדיין-לא מופיע כסעיף מפורש תחת "לגלות" ב-Top Navigator — ר' §23.30/הפניה זו כ-EXTENSION POINT-עתידי (לא-מיושם כאן), לא-Gate חדש.

### 5.2 `docs/research-os-canonical-lock-v1.md` — Research OS אחד, Universal Research Bus אחד

**מגבלה מחייבת שלא-הוזכרה מפורש ב-§1-§4:** `➕ הוסף למחקר` על כל ישות בדף-הספר (כולל שורה בודדת בטבלת-DS-02/DS-06 שב"הדוסייה המתועדת") **חייב** לפלוט Universal Finding לתוך ה-Workspace הקיים (`research_items`/`user_research`/`research_objects`) עם envelope מינימלי (`entity_type`,`entity_ref`,title,link,source,timestamp,metadata) — **`book` כבר-רשום** ברשימת-המשפחות-הקנוניות; שורת-dataset/occurrence-table בודדת **אינה** משפחה קנונית נפרדת. **המלצה:** קליק-➕ על שורה-בודדת מהדוסייה המתועדת פולט Finding עם `entity_type='book'`, `entity_ref=book:hebrewbooks:5635`, ו-`metadata` הנושא את ה-`source_ref`/`block_id`/page המדויקים (לא ישות-חדשה `dataset_row`). זה שומר על **אחד** Research OS, לא-ממציא bucket-שמור-חדש.

### 5.3 מה זה משנה בפועל ל-KEEP/ADAPT/PARK (§1)

שום שינוי-שורה — ה-KEEP/ADAPT/PARK נשאר כלשונו. זו **הבהרת-ציטוט** בלבד, שמראה שהתוכנית כבר-תואמת שני-החוזים-הקיימים בפועל (רק לא-ציטטה אותם בשמם בפאס-הראשון).

**Provenance נוסף:** `work_log 9343b19f` (GPT crosswalk) · `work_log bd0c2ea3` (SOURCE_OWNER manifest, `docs/research-library/ahavat-torah/AHAVAT_TORAH_SOURCE_MANIFEST_285.md`, commit `074013d6`) · `docs/sod1820-system-frame-contract-v1.md` · `docs/research-os-canonical-lock-v1.md` — כל הארבעה נקראו-חי לפני כתיבת-סעיף-זה.

---

## 6. פאס-אישור (Phase A) — תיקונים מחייבים + מטריצת-יכולות, per Human-Gate ZURIEL + GPT review (`work_log 81611e63`)

> **מעמד:** ZURIEL אישר-כיוון ("אני מקבל את התוכנית... נעשה את החיבורים ונשים במפה... עץ אחד מלמטה למעלה") — אישור-כיוון + תיעוד-מוגבל + עבודת-חיבור מבוקרת, **לא** merge/deploy/publication/canonicalization/ingestion המוני. הסעיף הזה **מוסיף** תיקונים ל-§1-§5 (שנשארים כלשונם) לפני שהתוכנית נחשבת ACCEPTED/READY.

### 6.1 פסק-תלות (Dependency Verdict) — עץ-אחד ≠ עמוד-אחד/סוכן-אחד-בכל-רגע

חוזי Intake/זהות/Research-OS הקיימים כבר-מתירים שחזור-מקור, datasets, witness-research ו-docs **במקביל** ל-P1 (המספר). **השלמת דף-המספר, ווידג'טים אופציונליים, פתיחת-היכל ציבורית ו-3D מלא אינם תנאי-מקדים** למחקר-ספרים/שימור-מקור. Roadmap P1 (1237) נשאר Golden Case משותף; P2/P3 נשארים בסדרם. Book **אינו** הופך ל-P1 מתחרה ולא מחליף P2 בשקט. **FOUNDATION SUFFICIENT AT EXISTING CONTRACT LEVEL; ADAPTER/INTEGRATION NOT YET VERIFIED** — לא נפתח audit-Foundation גורף מחדש.

### 6.2 תיקונים מחייבים (6, כל אחד סוגר-פער קונקרטי ב-§1-§5)

**(1) זהות-Book ≠ זהות-בחירת-מקור — תוקן:** §5.2 (הפאס-הקודם) המליץ על אותו `entity_ref` ברמת-הספר לשורות-דאטהסט שונות. **אומת-חי:** `research_items` נושא `UNIQUE(user_id,bucket,entity_type,entity_ref)` — ה-`metadata` **אינו** חלק מהמפתח, ו-`ResearchProvider.jsx`'s `addToResearch`/`saveItem` מבצעים dedupe לפי `entity.id` בלקוח. שתי שורות-דאטהסט שונות עם אותו `entity_ref` **יתנגשו** (לא יישמרו כשתי-בחירות נפרדות). **תיקון:** Book Entity (`entity_type='book'`, `entity_ref='book:ahavat-torah'` — זהות-הספר, נשמר פעם-אחת) **נבדל** מ-Source Selection (`entity_type='book'` עדיין — לא-משפחה-חדשה — אך `entity_ref` הוא ה-locator הספציפי-והיציב של הבחירה עצמה, לדוגמה `book:hebrewbooks:5635#p36:letter_dalet_row_12`, תוך-שימוש באותה מוסכמת source_ref שכבר-קיימת ב-`pageFromSourceRef`/הדוסייה). **טסט-נדרש (לא-הורץ, לביצוע ב-Phase B):** שמירת 2 שורות-שונות → שתיהן שורדות רענון/reload-ופתיחה-חוזרת של הבחירה-המדויקת-שלהן; שמירה-חוזרת של אותה בחירה = אידמפוטנטית; קריאה-מתוקנת לאותו locator תחת מדיניות-snapshot נבחרת לא-דורסת-בשקט ראיה-שמורה-קודם.

**(2) הוסף-למחקר ≠ קידום-אוטומטי ל-`research_objects` — תוקן:** ➕ הוא חברות/הפניה ב-Workspace הקיים (`research_items`) בלבד. `Universal Finding/reference != research_object != canonical/public`. טבלאות-מקור גולמיות עשויות-להיות נגישות במצב-מחקר-מורשה **לפני** שקיימת כלל טענה (`claim`).

**(3) אין "מנצח-אמת" בין שני ה-snapshots — תוקן:** לא `SNAPSHOTS.datasets` הידני של GPT ולא `tables.json` שלי הוא סמכות-יחידה. **המקור:** קבצי-git + ראיית-תיקון/supersession מפורשת + מניפסט-ראש-קבוע (`AHAVAT_TORAH_SOURCE_MANIFEST_285.md`) — מספקים **קריאת-פרויקציה-אחת ניתנת-לשחזור**. ה-JSON יכול-להיות **ארטיפקט-מסירה מיוצר** (עם גרסאות-קלט+פרובננס), **לא** סמכות-שנייה-ידנית-מקבילה. חובה-לשמר: תיקון-p35, הבחנת DS-06 ברמת-ספר-מול-שורה, ציטוט-מילולי-מול-פרפרזה, קריאות-לא-פתורות והיסטוריה — **אסור** לתייג טקסט כ-verbatim/lossless כשרשומת-המקור עצמה אומרת פרפרזה (כפי-שכבר-מתועד ב-Pre-Ingest-Handoff: pp.6-15 הן `SUBSTANTIAL_PARAPHRASE_WITH_VERBATIM_NUMBERS_AND_CITATIONS`, לא transcription מלאה).

**(4) PDF ציבורי ≠ רישיון-לפרסם ניתוח/דוסייה/bundles פרטיים — הודגש-מחדש:** הסתרת-טאב ב-UI **אינה** בקרת-גישה על JSON ציבורי (כבר-נאמר ב-§2). **תוספת:** אם הפרימיטיבים-הקיימים לא-יכולים-להבטיח-זאת-בבטחון לסוג-תוכן עתידי — **עוצרים** לכריע-גישה/אחסון מפורש, לא-פותרים-כאן. אין הרפיית-ACL/RPC-חדש בהיקף-הזה.

**(5) חוסר-enum-אחיד/`promotion_eligible`/טבלת-סתירות אינו MUST-FOUNDATION-חדש — תוקן:** נשמרים-צירים-נפרדים + relations/provenance קיימים. מצב-ריק בספר-שני **אינו** הוכחה-לתאימות-מלאה של ספר-שני-מאוכלס — לבדיקה אמיתית יש-להשתמש בנתוני-פליאה הקיימים-והמורשים כצורה-שנייה-חסומה, לא rescan/שורות-מומצאות.

**(6) מניפסט SOURCE_OWNER נמסר — הוסר `DEPENDENCY_PENDING`:** ר' §5 למעלה — `bd0c2ea3`/`AHAVAT_TORAH_SOURCE_MANIFEST_285.md` נקרא ונוסף-בציטוט. **סגירה = מניפסט-נקרא-ומותאם, לא כל-שאלת-מקור-נפתרה.** הטקסט-ההיסטורי (§1-§5, כולל "DEPENDENCY_PENDING" בפאס-הקודם) **אינו-נמחק** — זו תוספת-מתקנת-בלבד, לא rewrite.

### 6.3 מטריצת-יכולות מקוצרת (owner → מקור → מצב-נוכחי → תלות → owner-הבא → פעולה-הבאה → אימות)

| # | יכולת | מקור/owner קנוני | מצב-נוכחי | תלות | owner-הבא | פעולה-הבאה | אימות |
|---|---|---|---|---|---|---|---|
| a | חוזה-סריקת-מקור אוניברסלי + pinning-גרסה | `research_intake_foundation_contract` §9 (DB-live, v8) | קיים, ללא-שינוי | — | SOURCE_OWNER | להמשיך-להשתמש, לא-לשכתב | פרוטוקול נקרא-חי בכל BEFORE |
| b | scopes/בעלות-מיזוג רב-סוכנים | `inter_agent_coordination_law` v4 | קיים, יושם-בפועל בסבב-הזה | — | הכל | להמשיך-כפי-שהוא | ACK/AFTER מלא לפני WRITE |
| c | דוסייה קיימת + טווחים-נותרים (אהבת תורה) | PR#285 + מניפסט `074013d6` | pp.1-15 register-depth; pp.16-57 owner=`ce978932` (בתהליך); pp.58-99 = BLOCKED/no reconstruction (`712c2f08`,`6abd5b89`) | SOURCE_OWNER batch הבא (pp.58-62, queued) | SOURCE_OWNER | ACK עם branch/base/fingerprint לפני batch | witness/image-access מוכח לפני claim |
| d | ספר הפליאה — מחקר קיים + פיילוט-ספר-חדש עתידי | `research_objects` (42 שורות live) | קיים, לא-נוגעים | — | SOURCE_OWNER (עתידי) | להשתמש כ-bounded-second-shape ל-parity-test, לא rescan | ללא-שינוי בסבב-הזה |
| e | טבלאות/מטריצות/חישובים/סתירות source-native | `tables.json`(Claude, generated) + `SOURCE_MANIFEST_285.md` | שני-מקורות, טרם-אוחדו (ר' 6.2.3) | מניפסט SOURCE_OWNER | INTEGRATION_OWNER | לאחד-למקור-generated-אחד ב-Phase B | טסט p35/DS-06/paraphrase (6.2.3) |
| f | זהות Book/Edition/Witness/source-selection | `nodes.type=book` (live) + §9.2 | Book-level חי; source-selection-level טרם-מיושם | תיקון (1) לעיל | INTEGRATION_OWNER | לממש entity_ref נבדל לבחירה | טסט 2-שורות-נשמרות (6.2.1) |
| g | קשרי מספר/פסוק/אדם/נושא/מקור | Reality Graph הקיים (`edges`) | לא-מיושם לספרים עדיין | (f) | INTEGRATION_OWNER (עתידי) | לא בסבב-הזה | — |
| h | Explorer/facets/time/method dimensions | Roadmap 5.9 (§23.29) | לא-מיושם לספרים | — | (עתידי, אחרי P1/P2) | לא בסבב-הזה | — |
| i | Top Navigator/Context Rail/Bottom Control + כניסת-"ספרים" מפורשת | `sod1820-system-frame-contract-v1.md` | טאבי-ספר פנימיים=תואם; כניסה-גלובלית ב-"לגלות"=חסרה | — | INTEGRATION_OWNER (עתידי) | EXTENSION POINT, לא Gate | — |
| j | Add/Save/Reopen/Continue/History/Journeys | `research-os-canonical-lock-v1.md` (`research_items`/`user_research`) | חוזה-קיים; יישום-ספר תלוי-ב-(1) | (f) | INTEGRATION_OWNER | Phase B | טסט 6.2.1 |
| k | היכל כפרויקציית-גילוי | `HeichalPage.jsx` הקיים | קיים, נפרד; לא-store-חדש | — | — | לא-נוגעים | — |
| l | הרשאות/פרסום/אימות | RLS fail-closed קיים (`permissionLike`) | תקין ל-`research_objects`; JSON-ציבורי-סטטי דורש-בדיקה-נפרדת ל-privacy_scope עתידי | תיקון (4) | INTEGRATION_OWNER | לוודא-לפני-כל bundle-עתידי | אין דליפת-privacy_scope |
| m | אירועי-מעקב/עדכון-מקור | לא-קיים עדיין | לא-מיושם | — | (עתידי) | לא-לטעון-כ"עובד" | — |
| n | Layered/3D עתידי | `BookSpatialView.jsx` (GPT, ניסיוני) | PARK (ר' §1) | — | (עתידי) | לא-להמציא-גיאומטריה-סמנטית | — |

### 6.4 מה-לא-נעשה עדיין (Phase B ממתין)

השלב-הבא (Phase B: vertical-slice מוגבל Book source/dataset→locator→Workspace) **ממתין** לטסטי (6.2.1)+(4) ומתבצע על **ענף-מוצר נפרד** מ-`main` — לא בענף-התיעוד-הזה. אין merge/deploy/schema/RLS/RPC/canonicalization בסבב-הזה. אין נגיעה בקבצי P1/Number/nav משותפים — כל שינוי-שם עובר דרך owner-בקשה ב-work_log, לא-writer-שני.

**Provenance נוסף:** `work_log 81611e63` (Human-Gate ZURIEL + GPT review/corrections) · `research_items` schema (אומת-חי: `UNIQUE(user_id,bucket,entity_type,entity_ref)`, `metadata jsonb` לא-חלק-מהמפתח) · `src/lib/research/ResearchProvider.jsx` (`addToResearch`/`saveItem`, dedupe לפי `entity.id`).

---

## 7. תוספת (additive, לא-שינוי-הגוף למעלה) — Pointer ל-Cross-Surface Experience Contract Delta V1

> per `work_log 7f371048` (CROSS_SURFACE_EXPERIENCE_CONTRACT_V1, Human-Gate `decision_ledger=1499bf8f-c584-4400-8711-2aafc33ef5b8`). זהו **מצביע בלבד** — הגוף המלא נכתב תחת `## Cross-Surface Experience Contract Delta V1 (additive — 5.9.2026)` ב-`SOD1820_DESIGN_CONTRACT_V1.md`, לא-מוכפל כאן. §1-§6 למעלה נשארים כלשונם.

**מה זה קובע ל-Book Hub, לפני שממשיכים ל-Phase B (visual preview):**

- **Surface Mode = `research_clean`.** Book Hub (`/book`, `/book/:slug`) חייב להצהיר במפורש על מצב-שטח `research_clean` כשההטמעה-הוויזואלית תתחיל: **בלי** Footer, **בלי** ווידג'ט-שיתוף צף/אינליין אוטומטי ברמת-העמוד (ר' תקדים הפוך של Share Placement Law בחוזה), **בלי** שער-Follow גלובלי. שיתוף/מעקב נשארים זמינים **רק** כפעולה-מפורשת-קונטקסטואלית על ישות-נבחרת אמיתית (למשל: "שתף את הבחירה-המדויקת-הזו"), לא כ-chrome אוטומטי.
- **Book Follow = EXTENSION POINT, לא MUST-NOW.** אין להמציא יעד-מעקב `book:<slug>` — זה בדיוק התבנית-שכבר-פורקה ב-`subscription_funnel_law` v10 (`post:`/`thread:` בודדים). אם/כשיהיה ל-Book מפיק-אירוע אמיתי (עדכון-דוסייה/סריקה-חדשה) — היעד ייקבע דרך `subscription_funnel_law`'s decision-log עצמו, לא ad-hoc כאן.
- **התוסף §6.2(1)'s `entity_ref` נבדל לבחירת-מקור (Book Entity ≠ Source Selection) כבר-תואם במדויק** את ה-Universal Finding envelope שה-Delta מצטט (`docs/research-os-canonical-lock-v1.md` §2) — אין-סתירה, אין-שינוי-נדרש ל-§6.2(1) בעקבות ה-Delta.
- **פרטיות:** תבנית ה-fail-closed שכבר-ממומשת ב-`bookSelectionAdapter.js` (`isPublicRow`/`buildPublicBundle`, ר' §6.2(4)/(5) למעלה) היא **בדיוק** מה שה-Delta's "Privacy" section דורש באופן-כללי — אין-פער.
- **SEO/sitemap:** "הדוסייה המתועדת" (JSON סטטי, §2/§83 למעלה) אינה-נכנסת ל-`api/sitemap.js`/`api/card.js` באופן-אוטומטי מעצם-קיומה — רק דרך נתיב-ציבורי-אמיתי-קיים (`/book/:slug`), תואם ל-Delta's "SEO / OG / sitemap boundary".

**אין שינוי-קוד/עיצוב מוטמע כאן או ב-Delta עצמו** — שני המסמכים דוקומנטציה/חוזה בלבד. Phase B (visual preview של Book Hub) ממתין לאישור-GPT/ZURIEL על ה-Delta לפני שמתחיל להטמיע `research_clean` בפועל.

---

## Provenance

actor=CLAUDE role=INTEGRATION_OWNER · פקודת-מקור: `work_log 807d439f-085d-4956-8f63-4af21ddd3907` · ACK: `work_log 214348c3` · נבדק-חי: origin/main, PR#285, ענף-הטבלאות (PR#331), ענף GPT (`gpt/book-research-context-spatial-v1`), טבלאות `nodes`/`entity_types`/`research_objects` (ספירה-חיה). **עדכון (§5):** מניפסט SOURCE_OWNER **נמסר** אחרי כתיבת-הפאס-הראשון — `work_log bd0c2ea3`, `docs/research-library/ahavat-torah/AHAVAT_TORAH_SOURCE_MANIFEST_285.md` — נצוטט ב-§5.2/§5.3, לא-הוטמע-בחזרה ל-§1-§4 (נשארים כלשונם, additive-בלבד).
