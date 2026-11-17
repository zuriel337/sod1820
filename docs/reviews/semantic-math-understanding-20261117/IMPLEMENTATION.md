# Semantic Mathematical Understanding — רשומת מימוש

סטטוס: **BRANCH-ONLY + Preview מוגן** (`claude/anatomy-pilot-spatial-8ueak4`). אין שינוי במסד, בחוזים, ב־Edge, בהרשאות, ב־`main` או ב־Production. ההחלטות S0 (רגיסטרי בקוד, בלי DB), פירוק `convergence` ב־910, ודחיסת רזיאל בתוך השדות הקיימים אושרו מראש על ידי צוריאל ("אני מאשר מראש"); גבולות המשימה נשארים בתוקף. המיפוי שקדם למימוש: `GAP_MAP.md`.

## מה נבנה (דרך הבעלים הקיימים)
| שכבה | קובץ | מה |
|---|---|---|
| רגיסטרי פעולות (law §6.10/§14.3) | `src/lib/research/numericArithmeticOperations.js` | `add, subtract, multiply, divide, faces_sum, regions_sum, times_ten_sefirot`: `operation_key` **נפרד** מ־`symbol`; אותם שדות ובעלים כמו `numericRelationOperations` (הקטלוג הקיים לא שונה); `spoken` ("כפול", "ועוד") כנתון; `keyForGlyph` לסימנים מוכרים בלבד; `listNumericOperations()` — מבט אחד על שתי המשפחות |
| מפענח/מעריך יחיד | `src/lib/research/numericOperationTree.js` | tokenizer + דקדוק סגור + BigInt; טוקנים עם **תפקיד סמנטי**; `unsupported ≠ inconsistent`; ערכי ביטוי רק מהמנוע (מתקבלים כפרמטר); בלי `eval`/AI/רשת |
| נתונים | `src/lib/spatialModels.js` | `inputs[]` מפורשים; 910: `convergence`←`add`+`multiply` + `convergences[{of}]`; 1020: שלושה גורמים; 765 נשאר ערך חשוף (לא ניתן לאימות) |
| נגזרת מסלולים | `src/lib/spatialRenderModel.js` | `deriveConvergencePaths`/`evaluateConvergencePaths` על העץ המשותף; `path.terms` עם תפקידים, `operationKey`, `operatorSymbol`; סטטוס `unsupported` |
| הצגה | `src/lib/spatial/pathSemantics.js` | `pathPresentation / pathEquationText / pathOperandsText / pathTagText / pathAriaLabel / semanticSummary / razielSemanticFocus` — **המקום היחיד** שמפיק סימן/משוואה לכל הצרכנים |
| צרכנים | stage, directions, panel, labRows, Convergence/Structure/Icosa scenes, shelf | הסימן מהרגיסטרי; אין `×`/`=` מקודדים (נבדק בקוד המקור) |
| רזיאל | `src/lib/spatial/spatialLabRaziel.js` | ראו להלן |

## הכרעות סמנטיות (מוצהרות בקוד ובבדיקות)
- **סוגריים:** אחרי ביטוי = ביאור ערך (`שבת (702)`), לא קיבוץ; בתחילת אופרנד = קיבוץ; כפל משתמע/סוגריים אחרי ביטוי עם תוכן אחר ⇒ `unsupported`.
- **מקפים:** `−` (U+2212) ו־`-` הם חיסור רק בין אופרנדים; `-` בין שתי אותיות עבריות, `–`, `—`, maqaf `־` ⇒ `unsupported` ("לא מנחשים"); מינוס אונארי = סימן של מספר.
- **`=`:** יחס בין צדדים עם סוג — `arithmetic_equality` או `value_equality` (ביטוי מול מספר) — ולא ממצא נוסף.
- **חילוק:** רק מדויק בשלמים; לא שלם / אפס ⇒ `unsupported`, אין תוצאה מומצאת.
- **ביטוי בלתי־מוצהר:** רצף מילים שאינו בגימטריה המוצהרת (למשל "על כל פאה «אל»") הוא **משפט**, לא ביטוי: `no_phrase`/לא מאומת.
- **הסימן אינו עצם:** אין תפקיד `operator` בין `terms`, אין שורה ואין צומת/רשת בסצנות תלת־ממד.

## רזיאל (בחוזה הקיים בלבד)
ה־normalizer מעביר רק `label ≤120`, `primary ≤160`, `sourceLabel`, `reference` ושדות number-focus; `signals` אינו נשלח. לכן המבנה נארז דטרמיניסטית ב־`primary`/`label`:
`כפל: אל (31, מנוע) × 20 (גיאומטריה) = 620` · `עשרימון · כפל · מנוע: אל=31 · 20 גיאומטריה: icosahedron geometry`.
שאלות לדוגמה (כפתורי העתקה): "למה יש כאן סימן כפל?" · "מה המקור של המספר 20?" · "איזה ערכים מחושבים בגימטריה ואילו מגיעים מהגיאומטריה?" · "איך מגיעים ל־620?" · "מה ההבדל בין שני מסלולים?" (רק כשיש כמה). **מגבלה:** הקיבולת קטנה — פירוק שלבי מלא אינו עובר; הרחבת ערוץ דורשת בדיקת Edge ואינה מבוצעת.

## בדיקות קבלה — מצב
| # | תנאי | הוכחה |
|---|---|---|
| 1 | פעולות אינן ישויות | `semantic-formula-spatial` #1 (אין term/שורה/צומת מאופרטור; סצנות לא מייבאות רגיסטרי) |
| 2 | חיבור/חיסור/n־ary/סוגריים | `numeric-operation-tree` + #2 (910 `add`, 1020 שלושה גורמים, טקסט ישן) |
| 3 | ערכי גימטריה מהמנוע | #3 + דפדפן: 910 אומת מול המנוע האמיתי (שני מסלולים `verified`) |
| 4 | מקור לכל כמות | #4 (כל term גיאומטריה/כמות בכל מודל מחזיק `origin`; חסר ⇒ "לא צוין מקור") |
| 5 | לא נתמך ≠ מאומת | #5 (סטטוס `unsupported`, לא נספר, לא `inconsistent`) |
| 6 | חוסר ⇒ אין גאומטריה | #6 (מסלול לא נתמך/לא פתור נקשר ל־`relation`; spec נכשל־סגור) |
| 7 | שינוי משותף משתקף | #7 (רגיסטרי מותאם ⇒ שורות/תגיות/aria/רזיאל/מדף; אין סימן בקוד צרכן) |
| 8 | 3060/620 לא נשברו | #8 + כל חבילות הרגרסיה + דפדפן |
| 9 | עברית/סימנים/רווחים | `numeric-operation-tree` + #9 (שורות `structure[]` של כל המודלים) |

## מגבלות ידועות
אין בדיקה על טלפון אמיתי; הרצות הדפדפן ב־SwiftShader; Preview חוסם דפדפן אוטומטי (403) ולכן READY אינו הוכחה חזותית; רזיאל נעול לאורחים בסביבה — נבדק רק שההקשר עובר את ה־normalizer האמיתי. קוביית 1020 ו־910 עדיין ללא משפחת צורה תלת־ממדית (הפירוק שלהן מוצג בטקסט ובמסלולי ההתכנסות); שורות `structure[]` עם תווית־קידומת ("מחומש חיצוני: …") נשארות פרוזה ולא נפענחות.
