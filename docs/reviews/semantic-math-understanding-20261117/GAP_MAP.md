# Semantic Mathematical Understanding — מיפוי פערים ומסלול מימוש (קריאה בלבד)

תאריך: 17.11.2026 · ענף `claude/anatomy-pilot-spatial-8ueak4` · **מסמך מיפוי בלבד. לא נכתב קוד מימוש, לא נגעתי ב־DB/חוזים/Edge/הרשאות/main/Production, ולא שיניתי את המימוש הפעיל של העשרימון 620.**
כל הממצאים להלן נקראו מהקוד, מ־`rules_active` / `project_codex` (קריאה בלבד) ומהרצת קטעי קוד אמיתיים; כשמשהו הוא היסק — מסומן.

## 0. תשובה קצרה
1. **אין מפענח ביטויים אריתמטיים קנוני בשום מקום** — לא בריפו, לא ב־DB (נבדקו שמות הפונקציות והטבלאות ב־`public` לפי חיפושי `operation/expression/arith/formula/equation/math/evaluate/parse/relation`: אין מפענח או מעריך; `fn_expression_*_multiset_key` ו־`fn_relation_*` שייכות לגילוי יחסים/אנגרמות ולא להערכת ביטוי). לכן אין "מפענח מתחרה" שצריך להימנע ממנו; **צריך ליצור אחד, פעם אחת, אצל הבעלים הנכון** ולהפוך אותו לצרכן יחיד.
2. **הבעלים כבר קיים והוגדר בחוק:** `research_intake_foundation_contract_law` §6.10 ("Mathematical Symbol / Operation Identity Law"), §6.11 ו־v14 §14.3 (Numeric Operation Keys). החוק קובע: לכל פעולה מתמטית `operation_key` מפורש, **מובחן מהגליף המוצג**; שני סמלים זהים חזותית עם משמעות שונה = שני מפתחות; `gematria_methods` נשאר לשיטות גימטריה בלבד; פעולה אינה שיטה; מימוש "Numeric Operation Registry" הוא **EXTENSION POINT** ("ייתכן בתוך Sequence Lens / Numeric Research Router"). v14 רושם `multiply`, `faces_sum`, `regions_sum`, `times_ten_sefirot`. **אין רגיסטרי בקוד** — רק מחרוזת `operationKey` בנתוני המודלים.
3. **הפער הוא שהחוק קיים והמימוש לא:** הנתונים (`spatialModels.js`) והצרכנים (`deriveConvergencePaths`, התצוגות, רזיאל) עובדים על **מחרוזות**, עם regex יחיד, וסימני הפעולה מקודדים בתוך תבניות JSX.

## 1. מה נבדק ומה הוא עושה (בעלות וכפילות)

| רכיב | מה הוא באמת | רלוונטיות / הערה |
|---|---|---|
| `spatialModels.js` | נתוני צבי: `operations[{operationKey, expression, result}]`, `structuralProperties[{key,value,provenance}]`, `assignments`, `structure[]` (טקסט חופשי), `cube.reveal[]` (מחרוזות) | **שלוש הצגות של אותה מתמטיקה** (פעולה / פרוזה / reveal) ללא קשר ביניהן |
| `spatialRenderModel.deriveConvergencePaths` | regex יחיד `^\s*(\d+)\s*[×x*]\s*(\d+)\s*$` | ראו §2 |
| `evaluateConvergencePaths` | מאמת את ערך **הביטוי** מול `gematria_method_trace`; את התוצאה בודק רק כ־`operand × quantity === result` (בוליאני) | אין "הערכה" ואין שלבים |
| `labRows.js` / `describePathSource` / `describeStructurePart` | מציגים; ללא סמנטיקה של אופרטור | צרכנים |
| `gematria_method_trace` + `gematriaTracePresentation.js` | **כבר נושא `operator: sum\|diff` מובנה** לשיטות מורכבות (`COMPOSITE` עם `components[]`) — מאומת במנוע | זו כל המתמטיקה המובנית הקיימת, והיא שייכת למנוע; **לא לשכפל** — לצרוך |
| `numericRelationOperations.js` | קטלוג `operation_key` עם `owner`, `contract_owner`, `executor_ref`, `semantic_class: derivation`, `truth_boundary` — אבל כולו **גילוי יחסים** בקבוצת מספרים (additive_identity, progression, pythagorean…), לא הערכת ביטוי | **הקרוב ביותר לרגיסטרי של §6.10** — המקום הטבעי להרחבה |
| Research router `numeric_operators` | "אופרטורים" = יישום **כללי מספר** (zero_scale, leading_one_split, zero_navigation) | **משמעות שלישית של "operator"** — ראו G2 |
| `researchFacetProjection` (`facets.operation.{factors,operators}`) | מסנני חיפוש | קיים, לא קשור להערכה |
| `numberMathProfile` / `numberMathFingerprint` | פירוק לגורמים ותכונות של **מספר** | (היסק) ניתן להשתמש להצלבה דטרמיניסטית של תוצאה; אינו מפענח |
| `semanticSceneCompiler` (`scene.v1`) | `compileConvergenceScene`: צמתי `convergence_route` = **מסלול שיטה** (`methodKey` + `engineTrace`) להתכנסות של ביטוי אחד; `engine_result`, `number` | **אין צומת אופרטור — וזה נכון**; אבל המילה "convergence" מוטענת (ראו G2) |
| `razielSessionRequest2029` | normalizer חסום: `numberFocus {root≤40, expression≤80, method≤60, result:number, crossingPartner≤80}`, `readingFocus {label≤120, primary≤160, sourceLabel≤120, reference≤120}` | ראו G8 |

**בעלות:** `git log --all` ל־8 הקבצים הרלוונטיים (שבוע אחרון): נגיעות רק בענף שלי, פרט לקומיט ממוזג אחד ב־`main` מ־11.11 ב־`razielSessionRequest2029.js` (Number page); `diff origin/main...<branch>` לכל הענפים המרוחקים — אף ענף אחר אינו נוגע בהם. יומן העבודה (`work_log_current`) מכיל רק רשומות שלי בתחום. כלומר לא נמצא סשן פעיל אחר → אין חסם בעלות לכתיבה. (מימוש עדיין ממתין לסיום 620 ולאישור, כפי שביקשת.) (מימוש עדיין ממתין לסיום 620 ולאישור, כפי שביקשת.)

## 2. ראיה: מה הפענוח הנוכחי עושה בפועל (הרצה אמיתית של `deriveConvergencePaths`)

| קלט | `parsed` | הערה |
|---|---|---|
| `20 × 31`, `20×31`, `20 x 31`, `20 * 31`, `  20  ×  31  ` | ✔ | רווחים נסבלים |
| `20 X 31`, `20 · 31` | ✘ | X גדולה ונקודה אמצעית לא מוכרות |
| `6 × 10 × 17` (1020) | ✘ | שלושה גורמים |
| `208 + 702`, `100 − 31`, `100 - 31`, `620 ÷ 20` | ✘ | אין חיבור/חיסור/חילוק |
| `(6+4) × 17`, `-5 × 3`, `20 × 31.5` | ✘ | אין סוגריים, שליליים, עשרוניים |
| `20 × 31 = 620` | ✘ | אין צד שוויון |
| `רזא+שבת = סוד×אחד` (910) | ✘ | אופרנדים עבריים |

**ההשלכה החמורה:** כל כשל פענוח מסתיים ב־`status: "inconsistent"` — "הפעולה המוצהרת אינה עקבית". אבל נוסחה **שלא נתמכת** אינה **לא עקבית**. כרגע המערכת מציגה נוסחה לא נתמכת כאילו נבדקה ונכשלה (תנאי קבלה 5).

## 3. מפת התפקידים הסמנטיים

| תפקיד | איפה הוא קיים היום | מה חסר |
|---|---|---|
| **Expression** | `gematria[[phrase,value]]`, `assignments[].expression`, `path.phrase` | אין סימון בנתוני הפעולה איזה אופרנד הוא ביטוי |
| **Value** | `path.operand` (ערך שאומת במנוע) | הכינוי "operand" מתייחס רק לגורם הראשון; הערך אינו תפקיד מוצהר |
| **Operator** | אין | הסמל מקודד ב־JSX (`×`, `=`, "כפול"); `operationKey` הוא מחרוזת ללא רגיסטרי ללא סמל |
| **Result** | `operation.result` (מוצהר) | אין תוצאה **מחושבת** לצד המוצהרת, ואין שלבי ביניים |
| **Geometry** | `shapeIdentity`, `regions[].sides`, `structuralProperties` (`faces`, …) | הקשר "הגורם 20 הוא faces" נקבע ב**ניחוש לפי שוויון ערכים** (`quantities.find(value===q)`) |
| **Quantity** | `structuralProperties` + `provenance`; `assignments[].repetitionsPerPart` | `repetitionsPerPart:10` של 1020 לא מקושר לגורם `10` בפעולה |
| **Source** | `spatial.provenance.refs`, `quantityProvenance` | מקור ברמת הכרטיס בלבד |
| **Interpretation** | `midrash`, `structure[]` (פרוזה) | מעורבב עם נוסחאות בתוך אותן מחרוזות |
| **UIControl** | כפתורים/צ'יפים בלבד | אין בלבול כרגע — **להשאיר מופרד** (תפקיד חסום מהעץ המחקרי) |

מסקנה: התפקידים מוגדרים בפועל **בעיקר במבנה הנתונים של הסצנה והצרכנים**, לא בנוסחה עצמה; האופרטור והשוויון אינם מיוצגים בכלל.

## 4. הפערים (לפי חומרה)

| # | פער | חומרה | בעלים (EXTEND_EXISTING) |
|---|---|---|---|
| **G1** | אין ייצוג מובנה לפעולה: `operations[]` מחזיק מחרוזת; אין `inputs`; הפענוח הוא regex של שני מספרים שלמים | קריטי | חוק §6.10/§14.3 + `spatialModels.js` (נתונים) |
| **G2** | אוצר מילים מתנגש: "operation/operator" = (א) פעולה מתמטית (`spatialModels`), (ב) גילוי יחס (`numericRelationOperations`), (ג) יישום כלל מספר (`numeric_operators`), (ד) הרכבת שיטות (`COMPOSITE sum/diff`); ו־`operationKey:"convergence"` ב־910 **אינו פעולה** אלא יחס בין שתי נגזרות (208+702 ו־70×13) | גבוה | חוק §6.10 (הבחנה) |
| **G3** | אין רגיסטרי: `add/subtract/multiply/divide` ו־`faces_sum/regions_sum/times_ten_sefirot` מוזכרים בחוק אך אינם בקוד; אין סימן לכל מפתח | גבוה | `numericRelationOperations.js` / Numeric Research |
| **G4** | סימני פעולה מקודדים ב־JSX/Raziel: `×`, `=`, "כפול" ב־stage, `labDirections.EQUATION`, `spatialLabRaziel` (primary, שאלות). חיבור יוצג בטעות כ־×. | גבוה | צרכנים (stage, directions, raziel builder) |
| **G5** | `=` נושא שתי משמעויות: שוויון **אריתמטי** (`20×31=620`) מול **שוויון ערך גימטרי** (`620 = כתר`) — בלי טיפוס יחס (§3/§6.11: `equals*` / `derived_from`) | גבוה | חוק §3, §6.11 |
| **G6** | שלוש ייצוגים לאותה מתמטיקה (`operations` / `structure` / `cube.reveal`) — ללא אכיפת עקביות. דוגמה אמיתית: `כרמים (310) × 2 = 620` קיים רק ב־`structure` ולכן **אינו מסלול** (תוקן נכון: לא הומצא). | גבוה | `spatialModels.js` |
| **G7** | סטטוסי אימות: אין `unsupported` נפרד מ־`inconsistent` (§2) | גבוה | `evaluateConvergencePaths` |
| **G8** | **רזיאל מקבל מחרוזות בלבד**, והערוץ חסום. ובנוסף ממצא על העבודה שלי: `readingFocus.signals` (מקור הכמות, "לא נספר") **מוצג בפאנל אך אינו נשלח** — `createRazielRequestContextSnapshot` משמיט אותו (הורצה בדיקה). | גבוה | חוזה רזיאל הקיים |
| **G9** | תפקיד האופרנד נקבע ב**התאמת ערכים** (`quantities.find(v===q)`) ובהיפוך סדר היוריסטי (העשרימון) — לא מוצהר במודל; כשל אפשרי כששני מאפיינים חולקים ערך (כיום מסומן `ambiguous`) | בינוני | `spatialModels.js` |
| **G10** | אין כללי דקדוק: סוגריים (קיבוץ מול ביאור ערך: `(6+4)×17` מול `שבת (702)`), מקף/מינוס/en-dash/maqaf, "−5", `÷` לא־שלם | בינוני | המפענח (חדש, אחד) |
| **G11** | גאומטריה: 910 ו־1020 הן "קובייה" ולכן לא מצוירות (אין משפחה); הכמות `10` ב־1020 היא "חזרות לכל פאה" (תפקיד Quantity מקור: assignment, לא גאומטריה) | בינוני | משפחות צורה (שלב נפרד) |
| **G12** | `scene.v1` אינו אמור לייצג אופרטורים כעצמים — **תקין**; אך `convergence_route` דורש ביטוי+שיטה ולא מתאים לנגזרת מספרית: יש להשאיר את הסצנות לצרוך מבנה מאומת מבלי להוסיף צומת | נמוך | `semanticSceneCompiler` — ללא שינוי |

## 5. מסלול מימוש מוצע — דרך הבעלים, בלי מערכת חדשה

עיקרון: **עץ פעולה מובנה הוא מקור האמת; המחרוזת המוצגת נגזרת ממנו ומאומתת מולו.** לא AI; לא eval; דקדוק סגור; חישוב BigInt דטרמיניסטי.

**S0 — החלטה בלבד (אין קוד):** (א) לאשר שה־Numeric Operation Registry ייושם **בקוד** ליד `numericRelationOperations.js` (ללא DB; אחסון `meta.ext.numeric_op` נשאר החלטה נפרדת), (ב) לאשר פירוק `convergence` ל"יחס בין שתי פעולות", (ג) אישור הוספת שדות לנתוני `spatialModels.js`.

**S1 — רגיסטרי פעולות (EXTEND_EXISTING):** ערכי קטלוג `add`, `subtract`, `multiply`, `divide`, `faces_sum`, `regions_sum`, `times_ten_sefirot`: `operation_key`, `symbol` (מוצג, **נפרד** מהמפתח), `arity`, `commutative`, `associative`, `executor_ref`, `truth_boundary` (כבר קיים בתבנית). מפתחות חדשים נבדלים מגילוי היחסים הקיימים (`semantic_class: derivation` נשמר).

**S2 — מפענח + מעריך יחיד (חדש, פעם אחת, באזור הבעלים):** `parse(text) → tree` ו־`evaluate(tree, leaves) → {value, steps, status}`; leaves של סוג Expression מגיעים **רק** ממפה שהמנוע אימת (אותו `fetchGematriaMethodTraceRaw` + `isVerifiedMethodTrace`). דקדוק: מספרים שלמים (BigInt), `+ − × ÷` (+ `x * ·` כאלייסים של ×), סוגריים, n־ary לכפל/חיבור, מינוס אונארי; חילוק שאינו שלם ⇒ `unsupported`. **כללי עמימות מוצהרים:** `(` אחרי טוקן ביטוי/שם = ביאור ערך (תפקיד Value), לא קיבוץ; `−`/`-` הוא חיסור רק בין אופרנדים; en/em-dash ו־maqaf (`־`) לעולם אינם אופרטור; `=` מפוצל לשני טיפוסים: `arithmetic_equality` (אחרי הערכה) ו־`value_equality` (ערך ביטוי = מספר, מאומת במנוע). סטטוסים: `verified | pending | unavailable | no_phrase | inconsistent (תוצאה מוצהרת ≠ מחושבת) | unsupported (דקדוק/חילוק)`.

**S3 — נתונים (`spatialModels.js`, תוספת בלבד):** לכל פעולה `inputs: [ref…]` כאשר ref ∈ `expression:<phrase>` · `quantity:<key>` (מ־`structuralProperties`, כולל provenance) · `assignment:<target>.repetitionsPerPart` · `operation:<id>` (תת־תוצאה) · `literal` (רק עם מקור). `expression` נשמר (לרנדרר הישן) אך **מחושב מהעץ ומאומת שווה** בבדיקה — מבטל את הסחף בין `operations` / `structure` / `reveal` (שורות הפרוזה ממשיכות להיות פרשנות, והנוסחאות בהן נבדקות מול העץ).

**S4 — צרכנים:** `deriveConvergencePaths` מפסיק לפענח regex ונעשה עטיפה דקה מעל S2; `evaluateConvergencePaths` מפריד `unsupported` מ־`inconsistent`; `labRows`/stage/directions מציירים אופרטור **מהרגיסטרי** (סמל + תווית נגישות "סימן חיבור"), לעולם לא כצומת/אובייקט; `zviSpatialWorldProjection` מעביר את העץ ב־DTO; הכרטיס/המדף מציגים מהעץ.

**S5 — תלת־ממד:** הסצנות מקבלות **מבנה מפורש ומאומת** (גורמים עם תפקיד: Geometry מקבלת את מספר הפאות מהמודל הגאומטרי, Value מהמנוע) — לא מחרוזת. כבר כך בעשרימון (spec מהמודל); S4 הופך זאת לכלל לכל המשפחות. אין אובייקט תלת־ממדי לאופרטור.

**S6 — רזיאל, בחוזה הקיים בלבד:** סריאליזציה דטרמיניסטית של המבנה הסמנטי לתוך השדות החסומים (`label`/`primary`/`numberFocus`), בעברית מובנית ("כפל · 20 = פאות (גאומטריה של עשרימון) · 31 = «אל» (מנוע, רגיל) · 620 = תוצאה"). **מגבלה אמיתית:** הקיבולת ~120–160 תווים לשדה ו־`signals` נחתכות ב־normalizer; מבנה עשיר (תפקידים+מקורות+שלבים) לא ייכנס. אפשרויות: (א) דחיסה חכמה לתוך השדות הקיימים (יספיק ל"איך מגיעים ל־620" ו"מה מקור 20"), (ב) הוספת שדה מוגבל ל־normalizer — **דורש בדיקה אם ה־Edge מקבל שדות נוספים ואישור בעלים של חוזה רזיאל** (אינני משנה Edge).

## 6. דוגמאות — איך הייצוג המוצע מפרק אותן

| דוגמה | תפקידים |
|---|---|
| **620** `אל = 31` · `20 × 31 = 620` · `כתר = 620` | `אל` Expression → 31 Value (מנוע) · `20` Quantity/Geometry (faces, `icosahedron geometry`) · `×` Operator (`multiply`) · `620` Result (מחושב ומוצהר, שווים) · `כתר = 620` = `value_equality` (ביטוי, לא פעולה) · הסצנה: 20 פאות; אין עצם ל־× |
| **910** `208 + 702 = 910` (ובמודל: `רזא+שבת = סוד×אחד`) | שני Value (מנוע: `רזא`=208, `שבת`=702) · Operator `add` · Result 910; ו־`סוד × אחד` נגזרת שנייה ⇒ **יחס** התכנסות בין שתי פעולות (לא `operationKey:"convergence"` כפעולה) |
| **1020** `6 × 10 × 17 = 1020` | שלושה גורמים, `multiply` n־ary: `6` Geometry (faces) · `10` Quantity (assignment: repetitionsPerPart) · `17` Value (`טוב`, מנוע); תת־תוצאה אפשרית `60 = 6×10` (שורה ב־`structure`) כ־`operation:` מקונן; שני `×` אינם שתי ישויות |
| **חיסור/סוגריים** `100 − 31`, `(6+4)×17`, `−5 + 8` | `subtract` · קיבוץ מול ביאור לפי הכלל · שלילי כמספר Value, לא כאופרטור · ו־`620 ÷ 20` שלם נתמך; `620 ÷ 7` ⇒ `unsupported` (לא ממציאים תוצאה) |

## 7. בדיקות קבלה — מיפוי למבנה הבדיקות המתוכנן
(1) הפעולות אינן ישויות: בדיקת מקור שהסצנות/העץ לא יוצרים צומת מאופרטור · (2) חיבור/חיסור/n־ary/סוגריים: טבלת קלטים תקינים/לא תקינים (כולל רווחים, פיסוק, מקפים, `x`/`X`/`·`) · (3) ערכי גימטריה רק מהמפה שהמנוע אימת · (4) כל כמות מחזיקה `provenance` או `not_stated` · (5) `unsupported` ≠ `verified` ≠ `inconsistent` · (6) מידע חסר ⇒ אין צורה (כבר קיים לגבי `sidesOf`/`faces`) · (7) החלפת סמל/פעולה ברגיסטרי משתקפת בכל הצרכנים (בדיקת צרכנים) · (8) 3060 ו־620 נשארים ירוקים (חבילות קיימות כשער) · (9) ביטויים עבריים, סימני פעולה, רווחים ופיסוק.

## 8. החלטות שנדרשות ממך
1. אישור S0 (רגיסטרי בקוד ליד `numericRelationOperations`, ללא DB).
2. פירוק `convergence` ב־910 ליחס בין שתי פעולות (שינוי נתונים בלבד).
3. רזיאל: דחיסה בתוך השדות הקיימים (ברירת מחדל מומלצת), או בקשה נפרדת לבדוק הרחבת הערוץ מול בעלי החוזה/Edge.
4. הרשאה להתחיל מימוש מבודד **רק אחרי** סיום 620 (הושלם — ראו README של 620) ומסירת בעלות.

## 9. מה לא נעשה
לא נכתב מפענח; לא שונה `spatialModels.js`/הרנדררים/רזיאל; לא נעשתה מיגרציה; לא שונה DB/Edge/הרשאות/main/Production; לא הומצאו פעולות (`כרמים × 2` נשאר מחוץ למסלולים).
