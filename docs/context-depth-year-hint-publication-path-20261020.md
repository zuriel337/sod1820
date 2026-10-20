# רמז השנה — נתיב פרסום קיים ואישור ברמת יחידה (בדיקות קריאה בלבד, 20.10.2026)

כל הבדיקות: SELECT בפרויקט `linswmnnkjxvweumprav`; תפקידים נבדקו בתוך טרנזקציות `set local role` שבוטלו (`rollback`). לא שונה דבר.

## 1. מה נמצא ב־`research_objects`
| בדיקה | תוצאה |
|---|---|
| RLS | פעיל; אין `GRANT SELECT` ברמת הטבלה ל־anon/authenticated (רק service_role) |
| הרשאות עמודה | יש `SELECT` ברמת עמודה ל־anon ול־authenticated על 17 עמודות (ל־anon בלי `privacy_scope`; בלי `owner_person_id`/`parent_id`) |
| מדיניות | `ro_admin_read` (authenticated + `rd_is_admin()`), ו־`ro_dossier_read` (`public_candidate` + `writer_dossier.visible='true'` + תורם גלוי) |
| שורות שה־dossier חושף | 297 שורות עם `writer_dossier.visible`, **0** מהן `public_candidate` ⇒ המדיניות לא חושפת שורה היום |
| אורח (anon) | **0 שורות** |
| משתמש רשום, לא אדמין | **0 שורות** ישירות, **0** דרך `admin_research_feed` |
| אדמין | 2,302 שורות; רואה את `db28c232…`; `admin_research_feed('approved','relation',500)` מחזיר 243 קשרים מאושרים, כולל אותה |
| שורות עם `privacy_scope='public'` | **אין אף אחת** |
| RPC פרסום (`admin_research_set_publication_v1`) | **אינו קיים בבסיס הנתונים** (הקוד ב־`researchViewMode.js` מפנה אליו) |
| הקרנה ציבורית | אין; המיגרציה `20260923213000` מכשילה את הקורא הציבורי סגור במכוון |

**מסקנה:** אין נתיב פרסום קיים ל־`research_objects`. גם `privacy_scope='public'` לא היה מאפשר לקורא ציבורי לקרוא שורה, ואין דרך חיה להגדיר אותו.

## 2. הקרנות ציבוריות קיימות (anon יכול לקרוא)
| בעלים | מה | מתאים להחלטת אישור ליחידה? |
|---|---|---|
| `topic_cards_public` (205 שורות) | נושאים מאושרים בלבד, ללא `_do_not_publish`; אין נושא שמכיל 787 | נתיב DB ציבורי קיים לנושא מאושר; דורש יצירת נושא (כתיבה) והוא קבוצת אירוע, לא יחידה |
| `relation_evidence` (132 שורות, מדיניות קריאה ציבורית) | קשרי ביטויים (זוגות), `status` candidate/confirmed/rejected | לא: ברמת זוג ביטויים, בלי יחידה/מכיל/שנה; שימוש בו היה הרחבת משמעות |
| `gematria_words.is_published` (12,584 ציבוריות) | פרסום של ביטוי | פרסום ביטוי בלבד, לא אישור קישור |
| `number_dossier_json` | ביטויים מפורסמים ונושאים ציבוריים למספר | לא נושא החלטת אישור |
| מפרטי עד (witness) מסוקרים בקוד (`REVIEWED_SOURCE_WITNESSES`, `REVIEWED_POST_LOCATORS`) | היחידה היחידה שנבדקה לפי guards חיים, ציבורית ללא שינוי סכימה/RLS | **כן, זה נתיב ההחלטה הצר היחיד שקיים ופועל היום**: ההחלטה נרשמת בקוד המסוקר (ו־work_log), לא ברשומת מחקר |

## 3. מסקנות ל־PR
- **הסמן הציבורי נשאר חסום.** `PUBLIC_YEAR_HINT_PROJECTION.available = false`. שורת `research_objects` (גם `public`) אינה נתיב ציבורי.
- **אישור ברמת יחידה בלבד:** שורה נחשבת כמכסה את יחידת השנה/החג/ההודיה רק אם יש בה `source_ref` של היחידה (`posts:5112#block:plane-787-year-joy`), קשר למכיל ושמות **כל** שכבות היחידה (787, תשפ״ז, ושמחת בחגך, מי שגמלך…). `db28c232…` (סינתזה רחבה, `source_ref` ברמת פוסט) מחזירה `container_level_only`: מועמד בתצוגת מנהל, לא אישור היחידה, ולא נחשפת ולא מועתקת.
- **קריאה:** רק בסשן אדמין, בעמודות מפורשות (בלי `statement`/`contributor`/`meta`), ושגיאה נכשלת סגור. אורח ומשתמש לא מבצעים שאילתה כלל.

## 4. נתיב אפשרי לפרסום מצומצם (דורש החלטת ZURIEL; לא בוצע)
1. **ללא שינוי סכימה/RLS/כתיבה:** לרשום את ההחלטה על יחידת 787 כמפרט עד מסוקר בקוד (הנתיב הקיים), עם הפניה להחלטת DEC-TIME-004 וה־work_log. רק החלטה מפורשת של צוריאל מפעילה אותה.
2. **נתיב DB ציבורי קיים:** נושא מאושר ב־`topic_cards_public` (דורש כתיבה דרך זרימת האישור הקיימת).
3. אישור ברמת יחידה ב־`research_objects` (שורה צרה חדשה דרך ה־intake/human gate הקיים) רלוונטי לתצוגת מנהל בלבד, עד שיהיה בעלים להקרנה ציבורית.

## 5. בדיקות קבלה שחסרות
1. בדיקת אינטגרציה אוטומטית מול בסיס נתונים אמיתי (ענף/Staging) לשלושת התפקידים: anon, משתמש רשום, אדמין, כולל הוכחה שאף תפקיד ציבורי לא קורא את `db28c232…`. כרגע הוכחה ידנית בלבד (למעלה).
2. הרשומה הצרה ברמת היחידה אינה קיימת: `approved_unpublished` מוצג רק בהדמיה.
3. בדיקת דפדפן מול האפליקציה המלאה (סשן אמיתי: אורח, משתמש, אדמין), לא בהרנס.
4. אחרי שיוחלט על נתיב פרסום: קבלה שהציבור קורא רק את החלטת היחידה, בלי הסינתזה הרחבה.

## Update 20.10.2026 — option A chosen (unit decision in the reviewed witness spec)
- `REVIEWED_POST_LOCATORS['plane-787-year-joy']` is the unit `posts:5112#block:plane-787-year-joy` (stable locator + guards, three layers: תשפ״ז / ושמחת בחגך / מי שגמלך כל טוב הוא יגמלך כל טוב סלה) and now carries `yearHint.review` (`reviewed_in_witness_spec`, scope `admin_preview`, `publication: 'blocked'`).
- `witnessSpecApproval` turns that into `approved_unpublished` on channel `witness_spec` only when the locator matches the unit ref and every layer is named in the terms. It can never publish: the public marker still needs `published` on `public_projection`, which does not exist. The broad row `db28c232…` adds nothing and is neither published nor relied on.
- Admin preview shows "רמז השנה · תשפ״ז" with four separate facts: source (unit ref + open-in-source), calculation (gematria 787 vs calendar year 5787), interpretation (year / holiday joy / gratitude) and publication status (blocked).
- Not done (still missing for a public marker): an authorised public projection of the decision; a stable authored `id` on the 787 block (content edit, needs separate approval); an integration test against the real DB with real sessions.
