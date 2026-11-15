# מעבדת גימטריה מרחבית — ניסוי ראשון: 3060 של צבי (`yesharim-cube-3060`)

סטטוס: **BRANCH-ONLY** (ענף `claude/anatomy-pilot-spatial-8ueak4`). אין שינוי במסד, בחוזים, ב־Edge, בהרשאות, ב־`main` או ב־Production. פריסה מוגנת (Preview) — ראו "פריסה" בסוף.

## 1. מה כבר היה (נבדק לפני הבנייה — לא נבנה מחדש)

| רכיב | מה הוא נותן | שימוש כאן |
|---|---|---|
| `docs/spatial-gematria-v2-contract.md` + נספח v3 (`research_intake_foundation_contract_law` v14) | הקרנה/עדשה, מקור כמויות, "אל תזייף גאומטריה", 3D הוא מצב תצוגה נגזר | החוזה היחיד; לא נוסף חוזה |
| `spatialModels.js` (`yesharim-cube-3060`, 1020, 620) | המודל: צורה, אזורים, כמויות | מקור כל כמות במעבדה |
| `spatialRenderModel.js`, `zviSpatialWorldProjection.js` | נגזרת מסלולים, הערכה מול המנוע | הורחב (ראו להלן) |
| `SpatialMethodStage2029` / `SpatialConvergenceStage2029` | סולם עומק S0–S4, שער יכולת GPU, `S4ErrorBoundary`, fallback | נקודת הכניסה היחידה; WebGL רק אחרי "תלת־ממד" |
| `MistaterScene3D2029` (ערכת S4 משותפת) | טוקני צבע, גליפים (SVG path-only), Controls | הורחבה (ערכת Royal) |
| R3F 9.8 / three 0.186 / OrbitControls | מנוע התלת־ממד הקיים | לא נוסף מנוע; `@react-three/drei` נשאר אסור (dependency radar) |
| `gematria_method_trace` + `isVerifiedMethodTrace` | המחשבון הקנוני | כל ערך ביטוי מגיע ממנו |
| `.r29` / `royal2029.css` (שכבת Royal משותפת) | מסגרת, צ'יפים, כפתורים, כללים; ספיר וזהב מ־`--s29-brand-*` | מצב "רויאל" של המעבדה |
| רזיאל (`use2029Shell().openRaziel`, `razielSessionRequest2029`) | הצ'אט הקיים והחוזה המוגבל שלו | המסלול הנבחר עובר בערוצים הקיימים |

בעלות: נבדקו ענפים/PRים פעילים; לא נגעתי בענף עורך היחידות / PR #1358.

## 2. מה נוסף

- `src/lib/spatialRenderModel.js` (הרחבה): `compoundStructureSpec`, `bindPathsToStructure`, `describeStructurePart`. הקוביה דורשת 6 פאות מהמודל; **צלעות המחומש (5) ≠ כמות המסלול (180)** — מוצגים כשני עובדות נפרדות עם מקור.
- `src/lib/spatial/structureLayout3D.js` (טהור, בלי three/React): מיקום, פירוק שכבות, תנוחות מצלמה (סקירה/מיקוד), `structureExtent`.
- `src/lib/spatial/spatialLabRaziel.js` (טהור): הקשר המסלול הנבחר + 5 שאלות לדוגמה.
- `StructureScene3D2029.jsx` (חדש, lazy): הסצנה. `SpatialLabPanel2029.jsx` (חדש, DOM): בקרות ופאנל החלק הנבחר.
- הרחבות קטנות: `SpatialConvergenceStage2029` (מצב מעבדה), `ConvergenceScene3D2029` (Apex/PathConnector משודרגים — משותפים לשתי הסצנות), `MistaterScene3D2029` (ערכת Royal), CSS, `WorldKnowledgeTypes2029` (חיבור רזיאל), כרטיס צבי (`quantities`, `structure`).

### חמשת המסלולים (בלי גאומטריה מומצאת)

| מסלול | פעולה | חלק במבנה |
|---|---|---|
| ישר | 510 × 6 | קובייה (6 פאות) |
| ברית | 612 × 5 | מחומש חיצוני (5 לוחות) |
| טוב | 17 × 180 | מחומש פנימי (5 לוחות; 180 = כמות מקור) |
| (765) | 765 × 4 | ארבעה משולשים; **ללא ביטוי מאומת** — מוצג, מעומעם, לא נספר (4/5) |
| השגחה פרטית | 1020 × 3 | **שכבת קשר** נפרדת — אין לה גאומטריה מאושרת, לכן אינה צורה |

## 3. מצב "רויאל" (ספיר · שחור · זהב)

המעבדה עוטפת את עצמה ב־`.r29 .r29-hall` (השכבה המשותפת, `royal2029.css`) ומשתמשת ב־`r29-chip` / `r29-btn` / `r29-rule`. בסצנה: חומרי ספיר (`MeshPhysicalMaterial`, clearcoat) וזהב מתכתי, תאורת סביבה (`RoomEnvironment` + PMREM מ־three עצמו — לא drei), תאורת מפתח/שפה/נקודה, אבן־חן מפוספסת כקודקוד עם הילה וטבעת זהב, כנה מוזהבת לקובייה, חוטי זהב למסלולים, תוויות "× כמות" כמדליונים. כל הצבעים נגזרים מ־`--sms-gold` ← `--s29-brand-gold` ו־`--sms-sapphire` ← `--s29-brand-sapphire` (גוון כהה/בהיר של אותו טוקן — לא קבוע חדש). שינוי עתידי בפלטה הקנונית מתפשט לסצנה ולכרטיסים. במה התצוגה כהה בכל ערכת נושא (Day/Parchment/Night) כדי שהזהב והספיר יקראו אותו דבר.

## 4. הוכחת חיבור למנוע ולרכיבים הקנוניים

- ערכי הביטויים: `gematria_method_trace` דרך `fetchGematriaMethodTraceRaw` ← `isVerifiedMethodTrace`; אף ערך לא מחושב בסצנה (בדיקת מקור: `test/spatial-structure-lab-3060.test.mjs`, "no arithmetic on model numbers / no fetch / no color literals").
- כמויות: מהמודל, עם `quantityProvenance` (סימון "מקור/תרשים" ≠ תוצאת מנוע).
- הקשר לרזיאל עובר דרך `createRazielRequestContextSnapshot` הקיים (בדיקות 8–10).
- אותו רכיב משותף: הכרטיס ב־`/world` נפתח דרך `ConvergenceOpen` הקיים; אין route חדש.

## 5. בדיקות

- יחידה/חוזה: `spatial-structure-lab-3060` (12), `spatial-convergence-3060-stage`, `spatial-convergence-3d-3060`, `spatial-ribua-5787-stage`, `spatial-scene-v1-m0..m3` (כולל הסט הסגור של מודולי three), dependency radar, number-method-experience, beit-midrash-methods, world-knowledge, typography, palette — **112 עברו, 0 נכשלו** (הרצה מקומית).
- שערים: `test-legacy-retired` PASS; `test-2029-isolation`, `built-graph`, `first-load-graph`, `cheap-hardening`, `canonical-presentation` (59/0) — exit 0.
- דפדפן (Playwright, SwiftShader — **תוכנה, לא GPU של טלפון**): `scripts/anatomy-pilot/lab-3060-browser-check.mjs` — 6 מקרים PASS, 0 שגיאות קונסולה. `receipt.json`.

### ביצועים (SwiftShader; לא מייצג מכשיר אמיתי)

| מדד | תוצאה |
|---|---|
| draw calls / geometries / textures (פריים יציב) | 105 / 54 / 12 (תקציב draw calls < 160) |
| זמן עד canvas אחרי "תלת־ממד" | ≈4.4–4.9 שנ' (היה ≈3.9 לפני Royal; ההפרש הוא יצירת PMREM בתוכנה) |
| גרירה במובייל 320/390 עם CPU×4 | פריימים p95 = 17ms, 0 פריימים > 100ms |
| דליפת GPU | 6 מחזורי פתיחה/סגירה: כל ה־contexts שוחררו; heap 23→23MB |
| משקל lazy אחרי הקלקה | Structure 15kB (gz 6.1) · Mistater-ערכה 39kB (gz 13.4) · Convergence 8kB (gz 3.3) · three/OrbitControls 927kB (gz 242; היה 906kB — תוספת RoomEnvironment/RoundedBox) |
| ברירת מחדל (בלי לחיצה) | אין three ולא WebGL בחבילה הראשונה (`first-load-graph`) |

לא נמדד: ביצועים על GPU אמיתי של טלפון, ו־Safari/iOS.

### נגישות
כל פעולת מעבדה היא `<button>` (מקלדת/קורא מסך); רשימת מסלולים מלאה ב־`sr-only`; `aria-label` למבנה; `prefers-reduced-motion` — בלי תנועה ובלי סיבוב; האנימציה נעצרת מחוץ למסך/בלשונית מוסתרת (`IntersectionObserver` + `visibilitychange`); `frameloop="demand"` — שום דבר לא רץ במנוחה; יעדי מגע ≥44px; `forced-colors` נתמך. fallback דו־ממדי: אין WebGL, אובדן context, שגיאת רינדור — עם הודעה כנה.

## 6. רזיאל — מה עובד ומה לא

המסלול הנבחר (ביטוי, פעולה, כמות+מקור, סטטוס, מקור) עובר ל־`readingFocus`/`numberCoreFocus` של הצ'אט **הקיים**; אין צ'אט, סוכן, שדה בקשה או חוזה חדשים. חמש שאלות לדוגמה מופיעות ככפתורי "העתקה" — השאלה מוקלדת בשיחה. **מגבלות:** (א) בסביבת הבדיקה רזיאל נעול לאורחים ("רזיאל נעול זמנית"), לכן לא הודגמה תשובה חיה — הוכח רק שההקשר מגיע לפאנל ועובר את ה־normalizer; (ב) מילוי מראש של שאלה בתיבת הצ'אט דורש שינוי ב־SystemFrame — לא נעשה.

## 7. הערכות

- **Drei:** לא נדרש (RoomEnvironment/RoundedBox/OrbitControls הם addons של three) ואסור בחוזה הרדאר. **Theatre.js:** לא הוכח צורך (תנועות פשוטות: tween מצלמה + גלישת שכבות) — לא נוסף.
- **קובייה 1020 ועשרימון 620:** שניהם `spec` ריק (לא compound) ופעולה בודדת; הקובייה הקיימת אינה מכסה "6 × 10 × 17" (אינו נפרש כ־a×b), ועשרימון דורש משפחת צורות חדשה (איקוסהדרון: 20 פאות × 31). תשתית הבחירה/פירוק/מצלמה/רזיאל/Royal ניתנת לשימוש חוזר; נדרשת רק משפחת צורה חדשה לכל אחד. לא נבנה.

## 8. המלצות לשלב הבא
1. קובייה 1020 — לאחר שהמודל יגדיר פעולה מרובת גורמים (חוזה, לא קוד).
2. עשרימון 620 — משפחת איקוסהדרון (טהורה + בדיקות שורה־מול־מודל) לפני רינדור.
3. מסתתר — להעביר את אותה ערכת Royal ל־`MistaterScene3D2029` (סצנת Mistater עצמה לא שונתה; ייתכן שיש בה את תיקון ה"אובדן context" הכוזב שנעשה כאן).
4. מדידה על מכשיר אמיתי לפני קידום מעבר ל־Preview.
5. החלטת צוריאל: פתיחת רזיאל לאורחים/מילוי שאלה מראש.

## 9. פריסה (Preview מוגן — לא Production)

- קומיט שנפרס: `030f668335e6668683b71ecfe7f19356667497de` (ענף `claude/anatomy-pilot-spatial-8ueak4`); פריסה `dpl_FCS1T563Xv1ELyuQpL2zmQTpLDFz`, מצב **READY**; כתובת `sod1820-152vvyoio-sod1820-s-projects.vercel.app`.
- נבנה במצב `--protected-review` (יומן הבנייה: "Protected Preview review artifact built. Production/cutover remain denied."); `target=null` (Preview), בלי alias ובלי נגיעה בדומיינים. ה־`sourceSha` בתוך ה־HTML הפרוס הוא הקומיט הנ"ל.
- נתיב הבדיקה: `/world?view=explore&kind=spatial#spatial-yesharim-cube-3060` → "פתח המחשת התכנסות" → "תלת־ממד".
- לא נבדק בדפדפן אוטומטי על הכתובת החיה: הדפדפן הבלתי־מזוהה של הסביבה קיבל "Access denied" (403) מהאתר. אימות מצב ה־Preview נעשה דרך Vercel (READY, יומן בנייה, `sourceSha`); אימות ההתנהגות — מול אותו קוד בבנייה מקומית (סעיף 5).
- ההרצות המקומיות אינן CI; לא הורצה אצלי בדיקת CI ל־SHA זה.
