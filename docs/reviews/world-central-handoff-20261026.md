# World 2029 — מסירה מצטברת לאינטגרציה המרכזית, 26.10.2026

נמען: ZURIEL. מצב: **IMPLEMENTED / TESTED בענפים; מסירה מוכנה.
לא MERGED / LIVE מכוח המסירה הזו.**
אין הפעלת סשן אחר, אין ACK נדרש ואין הרשאת DB/Production.

## זהות החתך

- ענף המסירה: `gpt/world-zvi-clarification-handoff-20261026`.
- בסיס האינטגרציה האחרון שאושר לעולם: `662a4d9fa73750ac14a93a0c96cd7cd4c5285b85`.
- בסיס חתך הסגירה הנוכחי: `93ec6dafc0fba52bb551b0f0ea02d754515aacd8`.
- הטווח המצטבר: `662a4d9fa73750ac14a93a0c96cd7cd4c5285b85..origin/gpt/world-zvi-clarification-handoff-20261026`.
- 67 קומיטים קודמים, ועוד קומיט הסגירה הנוכחי; 107 נתיבים קודמים ועוד ששת נתיבי הסגירה = 113 נתיבים.
- ה־HEAD הסופי המדויק נמצא ברשומת AFTER ובמסירת המשתמש. יש לאמת אותו ב־ls-remote לפני שילוב. לא מכניסים למסמך SHA של הקומיט שמכיל אותו.
- אין למזג אוטומטית את כל היסטוריית הענף. קודם לזהות אילו בסיסים כבר שולבו ולשמר את הבסיס המרכזי העדכני.

## מה כבר היה בבסיס המאושר — לא להחיל שוב

662a4d9f כלל לפי מסירת האינטגרציה: הקורא הציבורי הממוקד לממצא;
205 נושאים ציבוריים ובהם 78 נושאי צבי; 132 פרסומי סוד החשמל כמקורות,
לא נושאים; 20 דפי כותבים אחרונים וגישה לכל 27; תאריכים עבריים ולועזיים;
קישור מדויק מהכתב למקור בעולם וחזרה; ניסוח ציבורי ואזור עדכונים.
המספרים הם מצב הבסיס המתועד, **לא ספירה חיה חדשה בכל האתר**.

יש לשמר את אותו DTO ציבורי לאורח ולמנהל בנתיב הציבורי, חסימות
private/candidate/person_only/old_chat/or-geula וכן locked/building
בהקשרים המתאימים. אין החזרת ממצא חלופי כשמזהה חסר/אסור.
sourceRef/sourceRefs/occurrences וכתובת המקור המאומתת לא נשמטים.
שינוי הצגת תור מנהל אינו מרחיב הרשאות.

## מה נוסף בשרשרת העולם אחרי הבסיס

1. תורי מיון מנהל באותה מערכת: קורפוס/ELS, גלריות ו־OCR, גימטריה,
   שפה ותובנות; הפרדת סוגי מידע, מקורות, מועמדים, חסרים וביקורת.
2. הרחבת ההקרנות הקיימות למרחבים, קבועים ורצפים, ומצב שלמות מטא־דאטה.
   החשבון, המבנה, התמונה והפרשנות נבדקים בנפרד. תור אינו אישור ממצא.
3. שחזור חישובים במנועים הקיימים וניתוב תוצאות; שמירת הופעות, המקור
   המדויק והבדלים בין טענות. מקור+מספר לבדם אינם זהות טענה.
4. הכנת חבילות קידום/הקרנה לענף, ואז ביקורת שתפסה סיכון בהשמטת
   ביטויים ובייצוג. v2–v5 נעצרו במכוון; אין לראות את commits הראשונים
   כהוראת ביצוע חיה או כמסקנה שגוברת על הביקורת המאוחרת.
5. דוחות כיסוי, תיקון פרובננס אופרנדים מספריים במחלץ המשותף,
   הכנת ייצוגי טענה ותיקונים ללא הפעלה; מתועדות מגבלות הקבלה.
6. בדיקות מקור מדויקות, שתי מנות מספריות, ביקורת שבע תמונות,
   מיפוי ההמשך המלא ומנות של 40/162/119 רשומות.
7. קליטת תשובת צבי וארבע תמונות: מרכז המשולש תוקן ל־765;
   המחומש משתחזר ל־3060; שתי נוסחאות הוגדרו כקירובים;
   איות המשולש העליון ושאלות נוספות נשארו פתוחים.
   התמונות נשמרו ב־Dropbox, לא צורפו עדיין למקור חי באתר.

אין כאן עוד reader/store/cache/API מחקר חדש בחיתוך הסגירה. קובצי JSON
של הביקורת הם ראיות קפואות, לא מאגר ציבורי חלופי. יש לשלב את קוד
השרשרת רק עם תלויותיו והביקורות המאוחרות, לפי בעל האינטגרציה.

## כמה נשאר — בלי להציג מיפוי כאימות

| מדד | היקף מתועד | המשמעות |
| --- | ---: | --- |
| מפת שארית ראשונית | 3,190 רשומות | חיתוך מתועד, לא כל חומר האתר |
| שחזורים קודמים ומנות מספריות | 219+80 = 299 | היקפי בדיקה שונים, לא אישור מלא לכל המקור |
| מפת ההמשך | 2,891 רשומות / 763 מקורות | כולה עברה סינון וניתוב |
| עיון ידני תחום בתוך מפת ההמשך | 330 = 9+40+162+119 | גם כאן יש סתירות, חוסרים והמלצות בלבד |
| טרם עברו עיון ידני בחיתוכים הללו | 2,561 | מספר מחושב על המפה הקפואה; לרענן לפני המשך |
| סמני מדיה הדורשים טיפול | 431 רשומות | לא 431 תמונות ייחודיות; חופף למסלולים אחרים |
| צפנים במפת ההמשך | 35 רשומות | זקוקים לשחזור ELS קנוני; גימטריה אינה אימות שלהם |
| ניתוב מרחבי קודם | 71 רשומות, 42 פערי גיאומטריה ראשיים | מסלולים חופפים למלאי, לא סכום נוסף |
| קבוצות טקסט זהה | 57 קבוצות / 124 הופעות מקור | 67 הופעות עודפות; לא מקורות עצמאיים |
| בירור זהות קנונית | 6 זוגות במיפוי ההמשך | kind/terms שונים: אסור לאחד אוטומטית |

קליטת ארבע התמונות אינה מנה חדשה מתוך ה־2,561 ולכן אינה מפחיתה את
המלאי הזה. מפת חזרות אינה מחיקה. אין להבטיח שכל הכפילויות טופלו.

המנה האחרונה של 119: 86 דורש בדיקה, 14 דורש מקור, 8 כפילות,
5 לא מתאים כראיה מאומתת (שאלות שנשמרות), 6 המלצות מספריות על 4 יעדים
קיימים — 444,204,1365,760. **לא שישה מקורות עצמאיים ולא שישה פרסומים.**
פרטים ומזהים: world-compact-source-review-20261026.md.

## חסמים שאסור לעקוף באיחוד

- **v2–v5 HARD STOP:** ראו world-pending-batch-safety-20261026.md.
  הייצוג הישן לפי מקור+ערך עלול להשמיט 47 ביטויים. גם זוג 513
  עם „אברהם רחל מבכה”=553 אינו אישור קבוצתי. אין להסיר STOP,
  לסמן migration כאילו הוחל, או לבצע db push. כל v2–v10 הם מחוץ
  להרשאת הפעלה של מסירה זו, גם אם בדיקות סטטיות עוברות.
- **47 ביטויים אטומיים:** חבילת החלפה נבדקה ברמת preflight/rehearsal;
  22 מקורות ו־23 יעדים. זו אינה החלה חיה.
- **6 תיקוני מקור:** fn_research_object_correct יוצר candidate,
  אך standing-approval trigger צפוי לשמור approved. מטא־דאטה ומצב
  האימות גם אינם מועתקים אוטומטית ליורש. כולם execute=false.
  נדרשת הכרעת בעל הממשל והרשאה נפרדת; אין להסתמך על סטטוס תשובת RPC.
- **רגרסיית המחלץ:** f591395f מתקן פרובננס R26/R35 באופן תוספתי,
  בלי לשנות חשבון. 45 מקורות / 41 משוואות נשמרו; 20 מקטעים:
  0 complete /20 partial →17 complete /3 partial. זה אינו
  שחזור הרגרסיה ההיסטורית של 378 הודעות: manifest/runner חסרים.
  קבלת בעל המנגנון נדרשת לפני rollout. ראו §12 בחוזה המשותף.
- **צבי:** המשולש השלם מוחזק עד אישור „אתם/אותם”; קבועים מוצגים
  רק כקירוב. שאלות 4–7 טרם נענו. אישור חלק מספרי אינו אישור רוחני.
- אין מומחה שקיבל מסירה חיה או ACK מומצא; SPECIALIST_DISPATCH_UNAVAILABLE.
  המשך תיאום פסיבי לצוריאל בלבד.

## חפיפות ובסיס מרכזי

בדיקה זו צפתה ב־origin/main ב־
`2195c9784c5c9f0b1ec3cd3c1137fbd76045845b`.
ענף מרכזי אחר שנראה ביומן:
`gpt/2029-central-raziel-safe-actions-integration-20261026`
ב־`db1f8009d6af3631e03a114ea5bba3b1ef26abe1`.
**זו תצפית, לא אישור להשתמש בו כבסיס המשך.**

- merge-base מול אותו מרכזי: `59cca6fc34f06d42417ff180cd58fa9717044be8`.
- חפיפת נתיבים בין שינויי המרכזי מאז האב המשותף לבין דלתת העולם:
  `src/lib/supabase.js`. יש לשמר את שני השינויים
  בקורא המשותף; בידוד ענף אינו העברת בעלות.
- מול שינויי main מאז האב המשותף `e73687221aa2ab639930643e5cc8c99666adce88`: אין חפיפת
  נתיבים עם דלתת העולם. אין בכך קבלת אינטגרציה.
- git cherry על 67 קומיטי העולם אחרי 662a4d9f מול המרכזי המצוין:
  67 ללא patch זהה שנמצא, 0 שקולים. זה אינו שולל שילוב חלקי/שקילות
  ידנית בקבצים. הבסיס הציבורי עבר קודם אינטגרציה אחרת; אין להחיל
  אותו מחדש מפני שאינו ancestor זהה.
- נבדק work_log_current לפני כתיבה: אין בעלות חופפת על ששת נתיבי
  הסגירה. לא שונו קבצי בעלי Workspace/Raziel/Community הפעילים.

## בדיקות שבוצעו בחתך הסגירה

- 9/9 בדיקות ההבהרה החדשות עברו.
- ריצה מצטברת של 47 קובצי בדיקה: **388 עברו, 0 נכשלו, 1 דולגה מתוך 389**.
  הדילוג: PostgreSQL rehearsal אופציונלי ללא WORLD_TEST_PG_CONTAINER;
  אין לטעון שתרגול הכותב מול DB הורץ כאן.
- בריצה זו נכלל גם דפדפן בית המדרש המקומי: 5 תרחישים עברו, כולל
  320/390/מחשב ויום/קלף/לילה. זה fixture מקומי, לא קבלה חיה משולבת
  של העולם/הכותבים. לא נגעו בקובצי בית המדרש.
- World Surface, Researcher Corpus, Public Language 3/3,
  Legacy Containment ו־git diff --check עברו.
- build:2029 עבר ב־2.50 שניות. אזהרות large chunks וייבוא
  dynamic/static קיימות נותרו. אין שינוי runtime בחתך זה ולכן
  אין תוספת קוד/בקשות ממנו; לא נמדדה מחדש מהירות ניווט חיה.
  קובץ World לפי manifest הבנייה: World2029Page-H_cZuaPU.js,
  149,322 bytes; gzip מקומי 39,469 bytes. אין לסכום קובצי build ישנים
  שנשארו בתיקיית dist כמדידת חבילת הבנייה הנוכחית.
- לא נוצר Preview, אין טענת בדיקת אורח/מנהל באתר החי מתוך בדיקות
  fixture, ואין צילומי קבלה חדשים של העולם.

## סדר שילוב מומלץ לבעל האינטגרציה

1. לקרוא AGENTS/CLAUDE/Owner Index ויומן חי; לאמת את ענף/HEAD המסירה
   ואת HEAD המרכזי בפועל, כולל בסיס 662a4d9f שכבר התקבל.
2. לבחון את הדלתה המצטברת מול המרכזי ולהימנע משכפול בסיסים; לשמר
   את src/lib/supabase.js העדכני והקורא הציבורי הממוקד. אין merge כפוי.
3. לקבל קוד/בדיקות/ראיות עם כל תיקוני ההחזקה המאוחרים. **אין להפעיל
   migrations כחלק מאיחוד קוד**, ואין להוציא commit מוקדם מהקשרו.
4. להכריע בנפרד בקבלת שינוי הפרובננס ובשאלת קורפוס הרגרסיה החסר.
   איחוד קוד אינו הרשאה לפריסה, כתיבת DB או שינוי פרסום.
5. להריץ שוב בדיקות עולם/חוזים/בית מדרש/קורא ממוקד, build ושערי
   פרטיות. לבצע קבלה משולבת של מקור מדויק וחזרה, ממצא חסר/חסום,
   אורח/מנהל, 20→כל הכותבים, תאריכים, מובייל ושלוש ערכות.
6. למסור לצוריאל BASE_BRANCH ו־BASE_SHA חדשים מאושרים, דרך האיחוד
   (ancestry/patch) ומה הוחרג. רק אחר כך לפתוח סשן עולם חדש.
7. אין main push/merge ל־main/Production מכוח מסירה זו.
   Preview חדש דורש אישור ל־HEAD המדויק.

## ששת הקבצים בחתך הסגירה

- `test/world-zvi-clarification-2029.test.mjs`
- `docs/reviews/world-zvi-clarification-evidence-20261026.json`
- `docs/reviews/world-zvi-clarification-receipt-20261026.json`
- `docs/reviews/world-zvi-clarification-closeout-20261026.md`
- `docs/reviews/world-central-handoff-20261026.md`
- `docs/reviews/world-post-integration-session-20261026.md`

## כל 113 הנתיבים בדלתה המצטברת

- `api/world-corpus-triage-audit.js`
- `api/world-finding-medium-match-continuation.js`
- `api/world-finding-review.js`
- `api/world-finding-triage-continuation.js`
- `api/world-finding-triage-snapshot.js`
- `docs/reviews/world-central-handoff-20261026.md`
- `docs/reviews/world-claim-coverage-20261026.md`
- `docs/reviews/world-claim-coverage-evidence-20261026.json`
- `docs/reviews/world-compact-source-receipt-20261026.json`
- `docs/reviews/world-compact-source-review-20261026.json`
- `docs/reviews/world-compact-source-review-20261026.md`
- `docs/reviews/world-compound-provenance-20261026.json`
- `docs/reviews/world-compound-provenance-20261026.md`
- `docs/reviews/world-corpus-continuation-20261026.md`
- `docs/reviews/world-corpus-continuation-evidence-20261026.json`
- `docs/reviews/world-corpus-continuation-receipt-20261026.json`
- `docs/reviews/world-corpus-residual-audit-20261026.md`
- `docs/reviews/world-corpus-residual-evidence-20261026.json`
- `docs/reviews/world-exact-claim-replacement-20261026.md`
- `docs/reviews/world-exact-claim-replacement-receipt-20261026.json`
- `docs/reviews/world-exact-claim-writer-snapshot-20261026.json`
- `docs/reviews/world-image-source-receipt-20261026.json`
- `docs/reviews/world-image-source-review-20261026.json`
- `docs/reviews/world-image-source-review-20261026.md`
- `docs/reviews/world-numeric-residual-batch-20261026.json`
- `docs/reviews/world-numeric-residual-batch-20261026.md`
- `docs/reviews/world-numeric-residual-batch2-20261026.json`
- `docs/reviews/world-numeric-residual-batch2-20261026.md`
- `docs/reviews/world-numeric-residual-receipt-20261026.json`
- `docs/reviews/world-numeric-residual-receipt2-20261026.json`
- `docs/reviews/world-pending-batch-preflight-20261026.json`
- `docs/reviews/world-pending-batch-safety-20261026.md`
- `docs/reviews/world-post-integration-session-20261026.md`
- `docs/reviews/world-source-bound-corrections-20261026.json`
- `docs/reviews/world-source-bound-corrections-20261026.md`
- `docs/reviews/world-source-bound-receipt-20261026.json`
- `docs/reviews/world-source-family-receipt-20261026.json`
- `docs/reviews/world-source-family-review-20261026.json`
- `docs/reviews/world-source-family-review-20261026.md`
- `docs/reviews/world-source-text-receipt-20261026.json`
- `docs/reviews/world-source-text-review-20261026.json`
- `docs/reviews/world-source-text-review-20261026.md`
- `docs/reviews/world-typed-claim-receipt-20261026.json`
- `docs/reviews/world-typed-claim-representation-20261026.json`
- `docs/reviews/world-typed-claim-representation-20261026.md`
- `docs/reviews/world-zvi-clarification-closeout-20261026.md`
- `docs/reviews/world-zvi-clarification-evidence-20261026.json`
- `docs/reviews/world-zvi-clarification-receipt-20261026.json`
- `docs/reviews/world-zvi-clarification-request-20261026.md`
- `docs/shared-expression-extraction-v1-contract.md`
- `scripts/audit-world-claim-coverage.mjs`
- `scripts/audit-world-corpus-residual.mjs`
- `src/components/research/WorldAllResearchTable.jsx`
- `src/components/research/WorldKnowledgeTypes2029.jsx`
- `src/lib/elsMatrices.js`
- `src/lib/research/worldElsTriageProjection.js`
- `src/lib/research/worldFindingReviewClient.js`
- `src/lib/research/worldGalleryTriageProjection.js`
- `src/lib/research/worldGematriaTriageProjection.js`
- `src/lib/research/worldInsightTriageProjection.js`
- `src/lib/research/worldLanguageTriageProjection.js`
- `src/lib/research/worldLegacyReplayProjection.js`
- `src/lib/research/zviSpatialWorldProjection.js`
- `src/lib/research/zviSpatialWorldProjection.test.js`
- `src/lib/spatialModels.js`
- `src/lib/supabase.js`
- `src/lib/triage.js`
- `src/lib/triage.test.js`
- `src/pages/world2029-human.css`
- `supabase/migrations/20261026121011_zvi_context_number_auto_tree_promotion_v3.sql`
- `supabase/migrations/20261026121450_zvi_structured_value_auto_tree_promotion_v4.sql`
- `supabase/migrations/20261026121500_zvi_safe_auto_tree_promotion_v2.sql`
- `supabase/migrations/20261026131528_zvi_explicit_match_auto_tree_promotion_v5.sql`
- `supabase/migrations/20261026132133_zvi_deterministic_regular_auto_tree_promotion_v6.sql`
- `supabase/migrations/20261026134034_zvi_deterministic_terms_auto_tree_promotion_v7.sql`
- `supabase/migrations/20261026134556_public_contributor_verified_graph_projection_v8.sql`
- `supabase/migrations/20261026141352_public_contribution_published_graph_projection_v9.sql`
- `supabase/migrations/20261026142516_public_contributor_curated_numeric_graph_projection_v10.sql`
- `test/world-claim-coverage-2029.test.mjs`
- `test/world-compact-source-review-2029.test.mjs`
- `test/world-compound-provenance-2029.test.mjs`
- `test/world-corpus-continuation-2029.test.mjs`
- `test/world-corpus-residual-audit-2029.test.mjs`
- `test/world-corpus-triage-audit-2029.test.mjs`
- `test/world-els-triage-projection-2029.test.mjs`
- `test/world-finding-review-api-2029.test.mjs`
- `test/world-finding-triage-snapshot-2029.test.mjs`
- `test/world-gallery-triage-projection-2029.test.mjs`
- `test/world-gematria-review-api-2029.test.mjs`
- `test/world-gematria-triage-projection-2029.test.mjs`
- `test/world-image-source-review-2029.test.mjs`
- `test/world-insight-review-api-2029.test.mjs`
- `test/world-insight-triage-projection-2029.test.mjs`
- `test/world-knowledge-types-2029.test.mjs`
- `test/world-language-triage-projection-2029.test.mjs`
- `test/world-legacy-replay-projection-2029.test.mjs`
- `test/world-numeric-residual-batch-2029.test.mjs`
- `test/world-numeric-residual-batch2-2029.test.mjs`
- `test/world-pending-batch-safety-2029.test.mjs`
- `test/world-public-contribution-published-graph-projection-2029.test.mjs`
- `test/world-public-contributor-curated-numeric-projection-2029.test.mjs`
- `test/world-public-contributor-verified-graph-projection-2029.test.mjs`
- `test/world-source-bound-corrections-2029.test.mjs`
- `test/world-source-family-review-2029.test.mjs`
- `test/world-source-text-review-2029.test.mjs`
- `test/world-typed-claim-representation-2029.test.mjs`
- `test/world-zvi-clarification-2029.test.mjs`
- `test/zvi-context-auto-tree-promotion-2029.test.mjs`
- `test/zvi-deterministic-regular-auto-tree-promotion-2029.test.mjs`
- `test/zvi-deterministic-terms-auto-tree-promotion-2029.test.mjs`
- `test/zvi-explicit-match-auto-tree-promotion-2029.test.mjs`
- `test/zvi-safe-auto-tree-promotion-2029.test.mjs`
- `test/zvi-structured-value-auto-tree-promotion-2029.test.mjs`

## 67 קומיטי השרשרת לפני הסגירה — בסדר תלות

הקומיט הסופי נוסף מעל הרשימה; SHA שלו ביומן AFTER וב־HEAD המרוחק.
זהו manifest ביקורת, **לא פקודת cherry-pick אוטומטית**.

```text
8adad25a049af754f65c592b7c8c79a828bb4e89 feat(world): reconcile strong corpus triage
86f1a2898d61687d630f7a34344588df1d7048c3 feat(world): add corpus and ELS review queues
e23df242d718db45dd958ac7a47bb846f32a2b82 feat(world): add language bridge review queue
8f6ceed5a04002dbec6c615029db5ba9a01785da feat(world): add gallery and OCR review queue
7b98dd3ec32bd068fa4172c2cbc5979514ed7461 feat(world): add governed gematria review queue
55782e04acfa960e62327cd1ed9b202bf691eada feat(world): add insight source review queue
22fe593e6706f4a1bf64528047b343647fb542e6 feat(world): map full finding review batches
41e20bd29d06bd32e4876c70c247a6f7c0c87c08 feat(world): reconcile medium explicit matches
8b484429aeca77702689c7971ca02502ed9e4297 feat(world): expose Zvi legacy replay batch
03365e9059b0a597391f17ae5cb332c10217e83f feat(world): replay legacy Zvi calculations
5afe726eb04c93caf4eac01c001f5d2a66e3de5a feat(world): replay arithmetic and compound findings
8aab647a993237bd7460decd551b2e7e887b4891 feat(world): classify explicit verification envelopes
89cca76ce622747b3aade8ff11f43fc9237c90ba feat(world): replay legacy method matrices
0e5efff5fe60a477038b88557769cda29cb972ef feat(world): classify missing engine assessments
739196aaceebfb7db024f53a8b3bf6281dd08e1a feat(world): separate candidate corpus queues
47acd864f9f590f1a2271ec0086457bb68b6e95b feat(world): classify legacy ELS replay envelopes
263e1fa4cacd0e39722174229eb18b30f26857d4 feat(world): expand gallery corpus triage
2fad183ad5cdbb3d0095aa92c91ebc349f223c2d feat(world): split gematria review batches
f627a35733708dccfee07400e08427e7ec54a0e8 feat(world): close language and insight corpus batches
3dca01e9086a38dd9ec1355ce8717fc5106b2713 feat(world): route missing-engine Zvi batches
57a157a6698f85c84b5ea2ed0dea45a00a48a65d docs(world): reconcile writing catalog triage
32e5e1efc3a3a85cb6345df9c8798ecc7fe9334a fix(world): reconcile live Zvi corpus total
8596e733b5f0fc0693fa40b78c699b8061a40017 feat(world): separate replay source and target review
ca83628b248658ba0d583938e8e82ebb2254301c feat(world): verify single number targets
0e2f08e22a31b2aae6760073c9f701718f4026ec feat(world): separate primary number target evidence
010ce20641b3baea8abaec6381fa9e1867cc9463 feat(world): propose number targets from structured values
e66360bc01fabaa9a2a62a5ded526901be90ac6c docs(world): verify active connected number nodes
0c9ba0b0076c9d9c86771b5263c9f914064e7d78 fix(world): resolve alternate exact source locators
af242a75188710026e9f0804882fc65169768e85 feat(world): route missing-engine source target context
071ef12ff3af75d61da7a9985b2c0715bff4ae09 feat(world): separate spatial structures from constants
6d8f44e0c16715fef916eff867967ff93304f8c6 feat(world): split spatial review into exact subqueues
bc66033b422941073c422a47eb1c89c88b9610e3 feat(world): expose spatial metadata completeness
f36d85463c855b793b9b4add3dbb61c410cbfb45 feat(world): replay constant and sequence claims
0d2c8f75358336d1a5638c83884ea2fadf63b98b feat(world): replay spatial calculations for review
33391cc8452cdf793d38c68cfd97e2315f63c259 feat(world): route spatial review batches
b1c3fdab685b5590a2ae31ae1388d417abaffa0b feat(world): separate represented spatial findings
8640222faed236193308170d4e096a001b34bc8c fix(world): isolate spatial quantity claims
fdeb8294ee84b4ae6d5d7a7f88bab071f9155ff9 feat(world): route spatial corpus review lanes
7e38b60328a6061ff38e49907ee5780b1f84c9ff feat(world): cluster ELS research findings
aaf10ce845be7eb9a5453a049cc6f15b0b27356d feat(world): classify language source cluster
aa1e39bc30d939a622f28639ca8117044f12171b feat(world): route formula corpus review
d2fc0f0d3206c11a14f6da39cfd8bd8bde721d79 feat(world): separate numeric finding contexts
3a7289f49e2ca47707ad8c2dec917b55e66457ee feat(world): route textual corpus review
eb50c21f0c9ce852e5f86361ef9a0d052af357cd feat(world): stage safe Zvi auto-promotion batch
59e2c9944bebf0f7f2a84b0dd7648a8ccc257fd1 feat(world): stage contextual Zvi auto-promotion
b7999ba1dd79dc5d2cd8c5a8448a985fc9d427d9 feat(world): stage structured-value Zvi promotion
34e5e504a03abc837959cec8e46c6e5cbd197634 feat(world): stage explicit-match Zvi promotion
3a5c4fdde4a42e59582157103efc3d06d53dc66a feat(world): stage deterministic Zvi promotion
2eaf27ab793e1af74800b9423f31230ab1c02c3d feat(world): stage deterministic Zvi term promotion
224517ad8fa9bd8d8a802ebd1030669da048b63f feat(world): stage verified contributor graph projection
77b402a8c78d5123533d5522b42e02b1a07d13b8 feat(world): project verified published writer sources
cd1db1840f5f353feac5e7bbb6174eabce3f0b71 feat(world): stage curated writer numeric projection
935b76ef78b8ec8df6beeb385a8c3497c3c6c123 audit(world): reconcile residual corpus and preserve distinct claims
c427e237e0ccfc7d24d0f2b342091d0be014e248 audit(world): preserve claim coverage and verify mixed expressions
15716bbf10d8fb2de3470b7ac438b4f3476e2f26 fix(world): hold unsafe pending batches and preflight exact claims
930d86e6218f6cb284aa50c91e2bcab07c70cf14 feat(world): rehearse exact atomic claim replacement safely
fddb6eefd6fd76d91a77c5501df29dc317a6b3c4 audit(world): preserve typed claims and governed correction boundaries
f591395f20d1f076956bbfecfcc5b09dbb7e071b fix(intake): preserve compound numeric occurrence provenance
b9c25844a5098513f5d2247d5ea24ec863fc1b29 docs(world): record packaged extractor parity and acceptance limits
0a79d57ebb8f1bd736f71de00852680981879163 feat(world): prepare exact source bindings and governed corrections
d80ec7777a4d3c4466c3ba0c0fbdb14976279789 feat(world): review next forty source-bound numeric findings
16d21a57da5c0ed242f5ac4baf8dd2e65295a46e feat(world): review seven exact image-bound findings
7562c6660c2c6e0135f22d3504c6b25bd24de471 Review next 40 World numeric findings with source-bound receipts
43914a63c8d25e5161012cd570434dcc6fe3ce4c audit(world): screen remaining corpus and prepare source clarification
b803a520164142487f174d8c8b340a7beb738945 audit(world): review 40 source-bound numeric candidate scopes
b1bd540643c8b0231ecfa0fa30a6ae48ab14b22c audit(world): review 162 source-family records with exact provenance
93ec6dafc0fba52bb551b0f0ea02d754515aacd8 Audit 119 World source-family records with canonical receipts
```

## שחזור ריצת הבדיקות המצטברת

```sh
node --test \
  src/lib/research/zviSpatialWorldProjection.test.js \
  src/lib/triage.test.js \
  test/world-claim-coverage-2029.test.mjs \
  test/world-compact-source-review-2029.test.mjs \
  test/world-compound-provenance-2029.test.mjs \
  test/world-corpus-continuation-2029.test.mjs \
  test/world-corpus-residual-audit-2029.test.mjs \
  test/world-corpus-triage-audit-2029.test.mjs \
  test/world-els-triage-projection-2029.test.mjs \
  test/world-finding-review-api-2029.test.mjs \
  test/world-finding-triage-snapshot-2029.test.mjs \
  test/world-gallery-triage-projection-2029.test.mjs \
  test/world-gematria-review-api-2029.test.mjs \
  test/world-gematria-triage-projection-2029.test.mjs \
  test/world-image-source-review-2029.test.mjs \
  test/world-insight-review-api-2029.test.mjs \
  test/world-insight-triage-projection-2029.test.mjs \
  test/world-knowledge-types-2029.test.mjs \
  test/world-language-triage-projection-2029.test.mjs \
  test/world-legacy-replay-projection-2029.test.mjs \
  test/world-numeric-residual-batch-2029.test.mjs \
  test/world-numeric-residual-batch2-2029.test.mjs \
  test/world-pending-batch-safety-2029.test.mjs \
  test/world-public-contribution-published-graph-projection-2029.test.mjs \
  test/world-public-contributor-curated-numeric-projection-2029.test.mjs \
  test/world-public-contributor-verified-graph-projection-2029.test.mjs \
  test/world-source-bound-corrections-2029.test.mjs \
  test/world-source-family-review-2029.test.mjs \
  test/world-source-text-review-2029.test.mjs \
  test/world-typed-claim-representation-2029.test.mjs \
  test/zvi-context-auto-tree-promotion-2029.test.mjs \
  test/zvi-deterministic-regular-auto-tree-promotion-2029.test.mjs \
  test/zvi-deterministic-terms-auto-tree-promotion-2029.test.mjs \
  test/zvi-explicit-match-auto-tree-promotion-2029.test.mjs \
  test/zvi-safe-auto-tree-promotion-2029.test.mjs \
  test/zvi-structured-value-auto-tree-promotion-2029.test.mjs \
  test/world-zvi-clarification-2029.test.mjs \
  test/world-public-reader-contract-2029.test.mjs \
  test/world-public-finding-reader-2029.test.mjs \
  test/world-landing-navigation-2029.test.mjs \
  test/world-people-sources-2029.test.mjs \
  test/world-2029-zvi-hashmal-subjects.test.mjs \
  test/world-public-copy-updates-2029.test.mjs \
  test/beit-midrash-world-sections-2029.test.mjs \
  test/beit-midrash-world-study-ui-2029.test.mjs \
  test/beit-midrash-world-study-browser.test.mjs \
  src/lib/research/worldLandingNavigation.test.js
node scripts/test-2029-world-surface.mjs
node scripts/test-2029-researcher-corpus.mjs
npm run test:public-2029-language
npm run test:legacy-research-containment
npm run build:2029
git diff --check
```
