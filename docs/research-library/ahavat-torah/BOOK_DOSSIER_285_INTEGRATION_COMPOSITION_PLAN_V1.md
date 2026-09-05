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

## Provenance

actor=CLAUDE role=INTEGRATION_OWNER · פקודת-מקור: `work_log 807d439f-085d-4956-8f63-4af21ddd3907` · ACK: `work_log 214348c3` · נבדק-חי: origin/main, PR#285, ענף-הטבלאות (PR#331), ענף GPT (`gpt/book-research-context-spatial-v1`), טבלאות `nodes`/`entity_types`/`research_objects` (ספירה-חיה). **עדכון (§5):** מניפסט SOURCE_OWNER **נמסר** אחרי כתיבת-הפאס-הראשון — `work_log bd0c2ea3`, `docs/research-library/ahavat-torah/AHAVAT_TORAH_SOURCE_MANIFEST_285.md` — נצוטט ב-§5.2/§5.3, לא-הוטמע-בחזרה ל-§1-§4 (נשארים כלשונם, additive-בלבד).
