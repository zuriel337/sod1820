# M0 — השוואת תשע פונקציות ה־Edge הפרוסות, ו־rollback מהמקור הפרוס בפועל (12.11.2026)

> **קריאה בלבד.** הקוד הפרוס נקרא ב־`get_edge_function`, והגרסאות וה־hash של כל bundle ב־`list_edge_functions`. בדיקה חוזרת ב־12.11 אחרי הסבב: אותן גרסאות. לא נפרס דבר, ולא נקרא ולא נכתב אף secret.
> **בסיסים:** ‏`949c24ad5` הוא הבסיס שממנו נבנה הענף. ‏`146f2f0e7` הוא `origin/main` ו־Production כרגע: לפי Vercel, ‏`sod1820.co.il` ← ‏`dpl_9sJPZEwhbu7a13cakoeTbjXasm3A` ← ‏`146f2f0e7`. בין שני הבסיסים השתנו ב־`supabase/functions` רק `wa-channel-ingest` ו־`_shared/waGroupMedia.js`, שאינן מהתשע. לכן כל השוואה ״לבסיס״ כאן נכונה לשניהם.
> **בלי secrets במאגר:** ב־manifest נשמרים רק **שמות** משתני סביבה. בשני קבצים פרוסים הופיע מידע אישי: ב־`ai-analyze` שתי כתובות דוא״ל בהערות בלבד, והן הוחלפו במחרוזת קבועה (ה־hash של הקובץ הפרוס ושל קובץ ה־rollback רשומים בנפרד). ‏`contact-notify` v1 מטמיע כתובת נמען בקוד, ולכן נשמר במקומו שווה־ערך פונקציונלי שקורא את הנמען מ־`CONTACT_NOTIFY_TO`.

## 1. השוואה: פרוס ↔ בסיס ↔ הצעת M0

| פונקציה | פרוס (גרסה · `verify_jwt` · `ezbr_sha256`) | פרוס מול הבסיס | מקור ה־rollback | מה פריסה מהענף מוסיפה, מעבר ל־M0 |
|---|---|---|---|---|
| `lab-teacher` | v3 · false · `5ba666a2…` | **זהה** (index ו־materialGate, השוואת בתים) | git ‏`949c24ad5` | — |
| `journey-message` | v13 · false · `ef48bb94…` | **זהה** (index בבתים; ‏materialGate בבדיקה עינית) | git ‏`949c24ad5` | — |
| `field-router` | v10 · false · `bb3c913b…` | **זהה** (index בבתים; ‏materialGate בבדיקה עינית) | git ‏`949c24ad5` | — |
| `number-researcher` | v12 · false · `c94555c1…` | **ישן מהבסיס**: ‏= `065aa022` (#856, 30.9) | git ‏`065aa022` | פעולת `interview` ו־`razielInterview.js`, תיקוני סדר ושמירה (קוד שכבר ב־`main` ולא נפרס) |
| `wa-raziel` | v21 · false · `61677665…` | **ישן מהבסיס**: ‏index = ‏`b4d5ec47` (6.10); ‏`waGreen` ו־`waRazielRender` = הבסיס | git ‏`b4d5ec47` + ‏`949c24ad5` | `razielNavigationActions.js`, ‏`siteLinkRegistry.js` (פעולות ניווט קנוניות) |
| `els-search-bridge` | v5 · true · `0343aef4…` | **ישן מהבסיס**: ‏= `cf16b8cf` (11.10) | git ‏`cf16b8cf` | `bearerMayIdentifyUser` (בדיקת bearer לפני Auth) |
| `ai-analyze` | v91 · true · `2c810072…` (bundle) | **לא ניתן לשחזור מההיסטוריה**; ישן מהבסיס. השוואת bundles: פרוס→בסיס 87 שורות, בסיס→הצעה 163 | artifact ‏`ai-analyze.v91.index.ts.gz` (שתי הערות הוסתרו) | ‏16 מודולים ← 19: ‏`publicReadingRelease2029.js`, ‏`numberPageAddress.js`, ‏`edgeCallerLimits.js` |
| `research-run` | v9 · true · `6118384a…` (bundle) | **לא ניתן לשחזור** (נבדקו 20 מועמדים; הפרש של 2,537–2,779 שורות) | artifact ‏`research-run.v9.index.ts.gz` (**הבתים המדויקים**) | ‏29 מודולים ← 30: נוסף `gematriaCore.js` ו־`edgeCallerLimits`, ירד `src/theme.js` (פרוס→בסיס 573 שורות, בסיס→הצעה 110) |
| `contact-notify` | v1 · false · `3e0e293b…` | **אין מקור במאגר** | artifact שווה־ערך ‏`contact-notify.v1-equivalent.index.ts.gz` | הפונקציה כולה (M0-E) |

**משמעות:** בחמש פונקציות, פריסה מהענף מעלה לחי גם קוד מ־`main` שעוד לא נפרס. כל ה־RPC שהקוד המוצע קורא להן קיימות היום בחי: 39 שמות ישירים ושש `els_matrix_reading_job_*_v1`, שנבדקו ב־`pg_proc` ב־12.11. מבחן ״Edge before SQL״ אוכף את זה. עדיין נדרשת בדיקת התנהגות לכל אחת אחרי הפריסה (README שלב 5). אין לה תחליף ב־rollback.

## 2. ה־rollback

- `node scripts/m0-edge-rollback-assemble.mjs <slug|all> <out-dir>` בונה מחדש את מבנה הקבצים הפרוס בדיוק, בודק SHA-256 לכל קובץ, ועוצר בכל אי־התאמה. **הוא לעולם לא פורס.** מקורות git דורשים את ארבעת הקומיטים (`git fetch --shallow-since=2026-09-20 origin main`, או משיכה לפי SHA כמו ב־CI).
- לכל פונקציה רשומים ב־`edge-rollback/manifest.json`: גרסה, ‏`verify_jwt`, ‏entrypoint (נתיב הקובץ כפי שנפרס), ‏`import_map=false`, ‏`ezbr_sha256` של ה־bundle, ושמות משתני הסביבה שהגרסה הפרוסה קוראת (`env_names_read`). בנוסף נרשמו השמות **שההצעה מוסיפה** (`proposal_env_names_added`): ארבעת `WA_RAZIEL_*` ב־`wa-raziel`, ו־`SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` ב־`contact-notify`.
- **הגדרות:** ‏`verify_jwt` לא משתנה באף פונקציה. rollback מחזיר את אותו entrypoint ואותו `verify_jwt`. secrets שההצעה מוסיפה לא מפריעים לקוד הישן (הוא לא קורא אותם), ולכן לא צריך להסיר אותם ב־rollback. **חריג:** ה־rollback של `contact-notify` (שווה־הערך) צריך את `CONTACT_NOTIFY_TO`, בדיוק כמו ההצעה.
- **שער סטייה לפני פריסה** (`manifest.drift_gate`): ‏`list_edge_functions` חייב להראות לכל אחת מהתשע את אותה גרסה ואותו `ezbr_sha256` שרשומים כאן. כל הבדל: עוצרים ומדווחים. מקור ה־rollback כבר אינו הקוד הפרוס.

## 3. בדיקות
- `test/m0-edge-rollback-manifest.test.mjs`: התשע מכוסות; לכל אחת גרסה, ‏`verify_jwt`, ‏entrypoint ו־hash של ה־bundle; ה־artifacts נבנים מחדש ותואמים; מקורות git בונים מחדש **את הבתים הפרוסים בדיוק**; אין secret ואין מידע אישי ב־manifest או ב־artifacts.
- `test/m0-intermediate-states.test.mjs`: הסדר בין SQL, ‏Edge והאתר (ראו `intermediate-states.md`).
- ב־CI הקומיטים נמשכים לפי SHA (עומק 1). בלעדיהם הבדיקות שתלויות ב־git מדווחות **SKIP** ולא PASS. סימולציה מקומית על clone רדוד, עם שורת המשיכה מה־workflow עצמו: לפני המשיכה — 13 עוברים ו־11 בדילוג; אחרי — 24 עוברים ו־0 בדילוג.
