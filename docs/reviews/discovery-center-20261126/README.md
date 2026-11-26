# מרכז הגילויים הקנוני: קורא מאוחד, בחירת גילוי ושיוך לקליטה עתידית

> **טיוטות לאישור מדויק. שום קובץ ב־`supabase/proposed/discovery-center-20261126/` לא הוחל.** כל אחד הוא שינוי מסד נפרד. החלטות ZURIEL: מדור קבוע בחלק העליון של הבית (אחרי "עדכונים אחרונים" ומפת המציאות), סטטיסטיקות כלל־מערכתיות, גילויים חדשים/תרומות/כותבים/גימטריות, בחירת גילוי למנהל, אין נעיצות ב"עכשיו", עיצוב רויאל כחול וזהב ומהירות.

| קובץ | מה | שינוי מסד |
|---|---|---|
| `D0-shared_helpers.sql` | `gematria_word_method_value_v1` (זהות: ביטוי+שיטה+ערך מהמנוע), `home_featured_picks_v1`, `public_discovery_writer_v1` (תנאי יחיד לבחירה ולהצגה) ו־`rc_unique_contributor_for_user_v1` (כלל שיוך יחיד) | `CREATE FUNCTION` ×4 |
| `D1-discovery_center_v1.sql` | `discovery_center_feed_v1` (מהיר, 91ms) ו־`discovery_center_stats_v1` (מטמון 10 דקות). שער פרופילים ציבוריים בלבד | `CREATE FUNCTION` ×2 |
| `D2-writer_public_material_v1.sql` | כל החומר הציבורי של כותב לפי סוג (כולל פוסטים ותגובות), עימוד יציב לפי `(created_at, dedupe_key)` | `CREATE FUNCTION` |
| `D3-admin_set_home_featured_discovery_v1.sql` | בחירת הגילוי הנבחר ושל מה שלצדו (עד 3, כל אחד עם שיטה), למנהל, כותבת ל־`site_flags` הקיים, אותו תנאי כמו ההצגה | `CREATE FUNCTION` + כתיבה ל־`site_flags` דרכה בלבד |
| `D3b-initial-featured.sql` | הבחירה הראשונית: תפרצי בתשפז = 5787 (ריבוע) ולצדו ימין ושמאול תפרצי = 2026 (מילוי); מוגנת בבדיקת ערכים | כתיבה אחת ל־`site_flags` |
| `D4-trg_rc_resolve_author_contributor.sql` | שיוך נכון בקליטה לפי הכלל היחיד | `CREATE FUNCTION` + `CREATE TRIGGER` |
| `D5-add_contribution_single_attribution_rule.sql` | `add_contribution` על אותו כלל (5 שורות, מוגן ב־md5) | `CREATE OR REPLACE FUNCTION` |
| `E1-gematria-root-gate-check.sql` | בדיקת אכיפה (קריאה בלבד) לחוק gematria_auto_registry_law v2: גימטריה בגוף פוסט חייבת שורש ב־gematria_words | אין |
| `docs/reviews/discovery-center-20261126/verify/` (לפי השלב) | בדיקות הרשאה ופרטיות אחרי החלה | אין (קריאה בלבד) |

הביקורת המלאה: [AUDIT.md](AUDIT.md). כל אחד מהקבצים דורש אישור מדויק נפרד.

## מה אומת בקריאה בלבד מול המסד החי
- גוף D1 הורץ כשאילתה על נתוני אמת (בלי יצירת פונקציה): גימטריות ציבוריות 12,579 · רשומות מחקר ציבוריות 10,292 · תרומות ראשיות 5,187 ותגובות 17,742 (`approved`+`published`, כלל דף הכותב) · עדכוני ערוץ חיים 2,460 · צפנים 116 · כותבים עם חומר ציבורי משויך 1,115.
- גוף D2 הורץ לסלי מור (17 תרומות, 9 גימטריות) ולצבי (45 תרומות, 242 גימטריות, 7,408 רשומות מחקר, 1,267 עדכונים חיים); `distinct = count`: אין כפילויות.
- הגילוי הנבחר: "מעבדות לחירות היום" = 1237, מאת סלי מור, מקושר ל־`sali-mor` לפי השם הייחודי.

## כללי פרטיות והרשאות
מוסתר, ממתין ופרטי לעולם לא מוחזרים. אין טלפון, מייל, הודעה גולמית או מדיה לא ציבורית. חשבון האתר `sod1820` מסומן `is_site_account` ומוצג בנפרד. מקורות תוכן ("בדרך לנצח", "אור הגאולה") מסומנים בלקוח ולא כאדם. קרדיט "מאת" מוצג רק לכותב מזוהה; תווית פנימית (למשל `ZURIEL_GPT_SESSION`) לעולם לא מוצגת.

## הערה על עדכוני ערוץ
ב־RLS הציבורי עדכון ערוץ גלוי רק במצב `live`. עדכוני `published` (135) שהתיקון B2 עדכן אינם `live`, ולכן אינם נספרים בסטטיסטיקה ואינם מוצגים עד שיהפכו ל־`live`.


## עדכון 26.11.2026: זהות גילוי (ביטוי + שיטה + ערך) ומונים אוטומטיים
- הגילוי הנבחר נושא `phrase`, `method` (מפתח ברשימה הקנונית), `method_label` ו־`value`. הערך נקרא מעמודת המנוע של אותה שיטה (`gematria_methods.db_column`), לא תמיד `ragil`; שיטה שאינה רשומה נדחית בבחירה ונופלת ל"רגיל" רק בהצגה ללא בחירה מפורשת.
- בחירה מרובה: הנבחר ועד שניים לצדו (`featured`, `featured_with`). נשמרת בשורת `site_flags` הקיימת כמערך `{id, method}`; הפורמט הישן (מזהה בלבד) נקרא כמו קודם.
- מונים: הכול נגזר חי מ־`gematria_words` לפי תנאי הזכאות הקיים, ללא הזנה ידנית. הסטטיסטיקה ודף הכותב סופרים **ביטוי ייחודי** פעם אחת (בנתונים הציבוריים אין כפילויות כיום; ההגנה לעתיד). עדכון ערוץ שאינו `live` לא נספר.
- בדיקות: `test/run-sql-test.sh` (Postgres מקומי זמני, בלי מסד חי) מריץ את D0–D3 על סכמה מדומה: זהות שיטה, בחירה, הרשאות, אובדן זכאות, מונה אוטומטי וללא כפל, דף הכותב. תוצאה: PASS.

## סדר ההחלה המדויק (כל שלב באישור נפרד; אחרי כל שלב מריצים את ה־verify המתאים ועוצרים בחריגה)
| # | קובץ | תלוי ב | בדיקה אחריו | החזרה |
|---|---|---|---|---|
| 1 | `supabase/proposed/discovery-center-20261126/D0-shared_helpers.sql` | rd_is_admin, gematria_public_word_eligible, gematria_methods (קיימים) | `docs/reviews/discovery-center-20261126/verify/VERIFY-D0.sql` | `DROP FUNCTION` לארבעת העזרים |
| 2 | `supabase/proposed/discovery-center-20261126/D1-discovery_center_v1.sql` | D0 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D1.sql` | `DROP FUNCTION` ×2 |
| 3 | `supabase/proposed/discovery-center-20261126/D2-writer_public_material_v1.sql` | D0 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D2.sql` | `DROP FUNCTION` |
| 4 | `supabase/proposed/discovery-center-20261126/D3-admin_set_home_featured_discovery_v1.sql` | D0 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D3.sql` | `DROP FUNCTION` |
| 5 | `supabase/proposed/discovery-center-20261126/D3b-initial-featured.sql` | D0, D1, D3 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D3b.sql` | `supabase/proposed/discovery-center-20261126/D3b-rollback.sql` |
| 6 | `supabase/proposed/discovery-center-20261126/D4-trg_rc_resolve_author_contributor.sql` | D0 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D4-D5.sql` | `DROP TRIGGER` + `DROP FUNCTION` |
| 7 | `supabase/proposed/discovery-center-20261126/D5-add_contribution_single_attribution_rule.sql` | D0 | `docs/reviews/discovery-center-20261126/verify/VERIFY-D4-D5.sql` | הגרסה הקודמת של `add_contribution` (בגוף הקובץ מוגנת ב־md5) |

## תיקוני ביקורת (26.11.2026)
1. הרשאות D0: `gematria_word_method_value_v1`, `home_featured_picks_v1` ו־`public_discovery_writer_v1` פנימיים (REVOKE מ־PUBLIC, anon, authenticated); נקראים רק מפונקציות definer. בנוסף שער הפרטיות הקנוני בתוך עזר השיטה: רק גימטריה ציבורית, מאומתת, לא מוצפנת וזכאית מחזירה שורה. נבדק במסד מקומי זמני עם התפקידים anon ו־authenticated.
2. `D3b-rollback.sql` מוגן בהתאמה לטקסט המדויק ש־D3b כתב; בחירת מנהל מאוחרת אינה נמחקת (נבדק).
3. בדיקות האימות מפוצלות לפי שלב; אף אחת אינה דורשת פונקציה שטרם אושרה.

## גבול הכיסוי של אכיפת gematria_auto_registry_law v2 (לא להכריז שהחוק נאכף בכל האתר)
`E1-gematria-root-gate-check.sql` ובדיקת הקוד המקבילה מזהות רק טענות שמופיעות בצורת הבלוקים "הביטוי / השיטה / התוצאה" בגוף פוסט (הצורה שבה מסלול פרסום היחידות מפרסם פריט גימטריה). מצב נקרא 26.11.2026: 2 טענות בפוסט אחד, 0 ממצאים. **לא מכוסה:** גימטריה שנכתבת בטקסט חופשי בגוף פוסט, בתגובות, בוואטסאפ, בספרים, בצפנים או בכל מקור אחר, ויחידות שאינן עוברות במסלול הפרסום הקיים. לא בוצעה סריקת עולם רחבה, ואין כוונה לפתוח אחת במסגרת זו. מה שכן נאכף בנוסף: מסלול פרסום היחידות הקיים (`insertUnitAtTop`) אינו מכניס יחידה עם טענת גימטריה בלי שורש ציבורי תואם (ראו בדיקות ב־`src/lib/research/unitPublishedHtml2029.test.js`).
