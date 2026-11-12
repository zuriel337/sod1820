# M0 — השוואת תשע פונקציות ה־Edge הפרוסות, ו־rollback מהמקור הפרוס בפועל (12.11.2026)

> **קריאה בלבד.** הקוד הפרוס נקרא ב־`get_edge_function`, והגרסאות וה־hash של כל bundle ב־`list_edge_functions`. בדיקה חוזרת ב־12.11 אחרי הסבב: אותן גרסאות. לא נפרס דבר, ולא נקרא ולא נכתב אף secret.
> **בסיסים:** ‏`949c24ad5` הוא הבסיס שממנו נבנה הענף. ‏`146f2f0e7` הוא `origin/main` ו־Production כרגע: לפי Vercel, ‏`sod1820.co.il` ← ‏`dpl_9sJPZEwhbu7a13cakoeTbjXasm3A` ← ‏`146f2f0e7`. בין שני הבסיסים השתנו ב־`supabase/functions` רק `wa-channel-ingest` ו־`_shared/waGroupMedia.js`, שאינן מהתשע. לכן כל השוואה ״לבסיס״ כאן נכונה לשניהם.
> **בלי secrets במאגר:** ב־manifest נשמרים רק **שמות** משתני סביבה. בשני קבצים פרוסים הופיע מידע אישי: ב־`ai-analyze` שתי כתובות דוא״ל בהערות בלבד, והן הוחלפו במחרוזת קבועה (ה־hash של הקובץ הפרוס ושל קובץ ה־rollback רשומים בנפרד). ‏`contact-notify` v1 מטמיע כתובת נמען בקוד, ולכן נשמר במקומו שווה־ערך פונקציונלי שקורא את הנמען מ־`CONTACT_NOTIFY_TO`.

## 1. השוואה: פרוס ↔ בסיס ↔ הצעת M0

| פונקציה | פרוס (גרסה · `verify_jwt` · `ezbr_sha256`) | פרוס מול הבסיס | מקור ה־rollback | מה פריסה מהענף מוסיפה, מעבר ל־M0 |
|---|---|---|---|---|
| `lab-teacher` | v3 · false · `5ba666a2…` | **זהה** (index ו־materialGate, השוואת בתים) | git ‏`949c24ad5` | — |
| `journey-message` | v13 · false · `ef48bb94…` | **זהה** (index ו־materialGate בבתים — `1f602000…`) | git ‏`949c24ad5` | — |
| `field-router` | v10 · false · `bb3c913b…` | **זהה** (index ו־materialGate בבתים — `1f602000…`) | git ‏`949c24ad5` | — |
| `number-researcher` | v12 · false · `c94555c1…` | **ישן מהבסיס**: ‏= `065aa022` (#856, 30.9); materialGate בבתים = `1f602000…` | git ‏`065aa022` | N1–N5 ב־`non-m0-edge-deltas.md` (ראיון מנהל, סדר היסטוריה, `persisted`) |
| `wa-raziel` | v21 · false · `61677665…` | **ישן מהבסיס**: ‏index = ‏`b4d5ec47` (6.10); ‏`waGreen` ו־`waRazielRender` = הבסיס | git ‏`b4d5ec47` + ‏`949c24ad5` | N6 (ניווט קנוני בוואטסאפ, בלי מודל) + N14b (הקישור הוא `/number/<n>`) |
| `els-search-bridge` | v5 · true · `0343aef4…` | **ישן מהבסיס**: ‏= `cf16b8cf` (11.10) | git ‏`cf16b8cf` | N7 (`bearerMayIdentifyUser`; תוצאה זהה) |
| `ai-analyze` | v91 · true · `2c810072…` (bundle) | **לא ניתן לשחזור מההיסטוריה**; ישן מהבסיס. השוואת bundles: פרוס→בסיס 87 שורות, בסיס→הצעה 163 | artifact ‏`ai-analyze.v91.index.ts.gz` (שתי הערות הוסתרו) | N8–N10: **אין שינוי התנהגות** מעבר ל־M0 (קבועים שווים) + `edgeCallerLimits.js`. **N14a:** קישורי המספר בתשובה הם `/number/<n>` (החלטה נפרדת) |
| `research-run` | v9 · true · `6118384a…` (bundle) | **לא ניתן לשחזור** (נבדקו 20 מועמדים; הפרש של 2,537–2,779 שורות) | artifact ‏`research-run.v9.index.ts.gz` (**הבתים המדויקים**) | N11–N13: שער כוונה מורחב לרזיאל, הצלבה ציבורית בלי נרמול קשרים, `theme.js` יצא; ועוד `edgeCallerLimits` |
| `contact-notify` | v1 · false · `3e0e293b…` | **אין מקור במאגר** | artifact שווה־ערך ‏`contact-notify.v1-equivalent.index.ts.gz` | הפונקציה כולה (M0-E) |

**משמעות:** בחמש פונקציות, פריסה מהענף מעלה לחי גם קוד מ־`main` שעוד לא נפרס. הפירוט, לכל שינוי עם התנהגות, תלות ובדיקת קבלה: **`non-m0-edge-deltas.md`**. **הם אינם חלק מאישור M0.** כל ה־RPC שהקוד המוצע קורא להן קיימות היום בחי: 39 שמות ישירים ושש `els_matrix_reading_job_*_v1`, שנבדקו ב־`pg_proc` ב־12.11. מבחן ״Edge before SQL״ אוכף את זה. עדיין נדרשת בדיקת התנהגות לכל אחת אחרי הפריסה (README שלב 5). אין לה תחליף ב־rollback.

## 2. ה־rollback

שלושה סוגי מקור, רשומים לכל פונקציה ב־`manifest.json` (`rollback_kind`):

| סוג | פונקציות | מה בדיוק נשמר | ראיה |
|---|---|---|---|
| **מקור זהה** (`exact_source`) | `lab-teacher`, ‏`journey-message`, ‏`field-router`, ‏`number-researcher`, ‏`wa-raziel`, ‏`els-search-bridge`, ‏`research-run` | הבתים הפרוסים של **כל** קובץ, כולל עותקי `_shared/materialGate.js` | ‏SHA-256 של הקובץ הפרוס = SHA-256 של קובץ ה־rollback, לכל קובץ. שלושת עותקי `materialGate` שבסבב 2 נבדקו רק בעין (`journey-message`, ‏`field-router`, ‏`number-researcher`) הועתקו מתשובת `get_edge_function` ונגזרה מהם חותמת: **`1f60200076d3d653…`, ‏11,710 בתים, זהה לבסיס** (`949c24ad5`, ללא שינוי מאז `065aa022`) |
| **מקור עם צנזור הערות** (`source_with_comment_redaction`) | `ai-analyze` | הבתים הפרוסים, חוץ משתי שורות **הערה** שבהן כתובות דוא״ל אישיות, שהוחלפו בסימון קבוע | מבחן: בדיוק שתי שורות מסומנות, וכל אחת היא הערה בלבד (`// <redacted personal address>`). אף אסימון קוד לא שונה. החותמת הפרוסה (`2ac19e11…`) והחותמת של קובץ ה־rollback (`b6713b4e…`) רשומות בנפרד |
| **שחזור התנהגותי** (`behavioral_equivalent`) | `contact-notify` | לגרסה v1 הפרוסה אין מקור במאגר, והיא מטמיעה בקוד כתובת נמען אישית. נשמר קובץ שמשחזר את הוולידציה, ה־escape, קריאת הספק וצורות התשובה, וקורא את הנמען מ־`CONTACT_NOTIFY_TO` | הבתים המדויקים של v1 קיימים רק בפריסה החיה ולא נשמרים כאן. מבחן התנהגות עם ערכי דמה בלבד: **בלי `CONTACT_NOTIFY_TO` → ‏503 ואפס קריאות לספק; איתו → בדיוק שליחה אחת, לנמען הזה** |

- **תלות ה־rollback ב־`CONTACT_NOTIFY_TO`:** אומתה **סטטית ובהרצה** (המבחן למעלה), בלי ערך אמיתי. **לא אומת בחי** אם הסוד מוגדר: הכלים שלי לא מציגים secrets, אפילו לא את שמותיהם. לכן, לפני פריסת ההצעה **וגם** לפני rollback של `contact-notify`: יש לוודא בלוח הבקרה ש־`CONTACT_NOTIFY_TO` קיים. אם רוצים את v1 המדויק: לקרוא אותו מהפריסה החיה ברגע ה־rollback (`get_edge_function`) ולפרוס אותו משם. הוא לא נשמר במאגר, בכוונה.
- `node scripts/m0-edge-rollback-assemble.mjs <slug|all> <out-dir>` בונה מחדש את מבנה הקבצים הפרוס, בודק SHA-256 לכל קובץ, ועוצר בכל אי־התאמה. **הוא לעולם לא פורס.** מקורות git דורשים את הקומיטים (`git fetch --shallow-since=2026-09-20 origin main`, או משיכה לפי SHA כמו ב־CI).
- לכל פונקציה רשומים: גרסה, ‏`verify_jwt`, ‏entrypoint, ‏`import_map=false`, ‏`ezbr_sha256` של ה־bundle הפרוס, ושמות (בלבד) של משתני הסביבה שהיא קוראת (`env_names_read`) ושל אלה שההצעה מוסיפה (`proposal_env_names_added`). אין secrets במאגר.
- **הגדרות:** ‏`verify_jwt` לא משתנה באף פונקציה. rollback מחזיר את אותו entrypoint ואותו `verify_jwt`.
- **שער סטייה לפני פריסה** (`manifest.drift_gate`): ‏`list_edge_functions` חייב להראות לכל אחת מהתשע את אותה גרסה ואותו `ezbr_sha256`. כל הבדל: עוצרים ומדווחים.
- **סדר rollback מחייב** (`apply-plan.json` → `rollback_order`): (1) הסרת ה־view ‏v2 של התורם; (2) האתר; (3) ‏Edge; (4) שאר ה־SQL בסדר הפוך.

## 3. בדיקות
- `test/m0-edge-rollback-manifest.test.mjs` (7): התשע מכוסות; גרסה, ‏`verify_jwt`, ‏entrypoint ו־hash של ה־bundle; ה־artifacts תואמים; מקורות git בונים מחדש את הבתים הפרוסים בדיוק; אין secret ואין מידע אישי; לכל פונקציה סוג מקור, ולמקור זהה — חותמת פרוסה = חותמת rollback לכל קובץ; הצנזור נוגע בהערות בלבד; התלות ב־`CONTACT_NOTIFY_TO` בהרצה.
- `test/m0-intermediate-states.test.mjs`: הסדר בין SQL, ‏Edge והאתר (ראו `intermediate-states.md`).
- ב־CI הקומיטים נמשכים לפי SHA (עומק 1). בלעדיהם הבדיקות שתלויות ב־git מדווחות **SKIP** ולא PASS. סימולציה מקומית על clone רדוד, עם שורת המשיכה מה־workflow עצמו, לשלושת קובצי המבחן (rollback, מצבי ביניים, ‏v2): לפני המשיכה — 21 עוברים ו־12 בדילוג; אחרי — 33 עוברים ו־0 בדילוג (סבב 3).
