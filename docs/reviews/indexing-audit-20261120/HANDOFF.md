# מסירה לאינטגרציה ב־#1462 — "המילים הראשונות" וביקורת האינדוקס

**אל:** Claude הראשי (בעל האינטגרציה של #1462), לפי הוראת ZURIEL מ־20.11.2026. **מאת:** סשן `ccr-62250444-voptzj`.
**ענף:** `ccr-62250444-voptzj` · https://github.com/zuriel337/sod1820/tree/ccr-62250444-voptzj
**בסיס:** #1462 `f5af86bffdba3ef573d52b00fa9a803e6efe8322` (ממוזג לענף בלי התנגשויות), מעל `origin/main` `7e7cc4b34`.
**מצב:** COMMITTED, BRANCH-ONLY. לא נדחף ל־#1462, לא מוזג ל־main, לא נפרס, אין שינוי במסד, אין Preview.
**השינויים עצמם:** `git diff f5af86bff..ccr-62250444-voptzj` (9 קבצים, מלבד המסמכים).

## מה השתנה

| קובץ | שינוי |
|---|---|
| `public-reading-deploy/first-words.js` (חדש) | גוף קריא במסמך השרת לדפים ציבוריים שאינם פוסט: מספר, ביטוי, `/gematria`, `/community/calculator`, `/codes`, `/codes/<slug>`, `/topic/<slug>`, תגית וסיווג |
| `public-reading-deploy/api/public-document.js` | קריאת המילים במקביל ל־metadata, הכנסתן למעטפת הפתיחה, כותרת `X-Sod-First-Words`. פרמטר הזרקה `firstWords` לבדיקות |
| `api/og.js` | ענף התגיות/סיווגים: נוספו לשאילתה `slug,wp_id,source,link,date`, והשורות נמסרות דרך `req.publicReadingFirstWords`. אין שינוי בכותרות, ב־robots או ב־canonical |
| `supabase/functions/_shared/siteLinkRegistry.js` | `/category/סוד החשמל` ← `/category/סוד-החשמל`, `/category/מימד חמש` ← `/category/מימד-חמש` (הכתובת הקנונית שבמפת האתר). אותו מספר בתים |
| `test/site-link-registry.test.mjs`, `test/footer-2029.test.mjs` | התאמת הציפייה לשתי הכתובות |
| `test/first-words-2029.test.mjs` (חדש) | 6 בדיקות, מקורות סינתטיים בלבד |
| `docs/reviews/indexing-audit-20261120/README.md` | הביקורת והראיות |
| `supabase/proposed/indexing-audit-20261120/sitemap_numbers.after.sql` | **הצעה בלבד, לא הוחלה:** כלל כניסה חדש לדפי מספר (450 ← 1,294 מספרים, אף מספר לא יוצא) |

אין שינוי בקוד הלקוח (מלבד שני קישורים ברישום), ואין ייבוא חדש בכניסה או במסגרת.

## חפיפות מול #1462

1. **קורא פעילות אחד.** "חיפשו השבוע" במחשבונים נקרא רק מ־`research_pulse_2029` עם `p_hours: 168`, לפי אותו חוזה ש־`getWallRecent` קורא ב־#1462 (`version === 1`, `phrases[{ phrase, value, events }]`). אין קריאה ל־`gematria_wall`, ל־`search_log` או ל־`visitor_events`, ויש בדיקה שמוודאת זאת. כל עוד ה־SQL של החבילה לא הוחל, ה־RPC מחזיר 404 והבלוק נעדר.
   - **לבדיקתך:** הקריאה היא ישירה מהשרת ל־PostgREST עם המפתח האנונימי, לא דרך ה־worker. אם תעדיף שם אחר, חלון אחר או שדה אחר, המקום היחיד לשנות הוא `calculatorFacts` ב־`first-words.js`.
   - **לבדיקתך:** רצפת הפרטיות (`gematria_public_word_eligible`) נאכפת בתוך ה־RPC. הרכיב שלי מציג את מה שה־RPC מחזיר, בלי סינון משלו.
2. **`public-document.js`.** #1462 הסיר את ענף `numberAlias`; המיזוג נקי. הקריאה שלי משתמשת ב־`metadataPath` שנשאר.
3. **אין חישוב גימטריה חדש.** ערך של ביטוי הוא `gematria_words.ragil` של השורה המאומתת והמפורסמת. אין מנוע, אין טבלת אותיות ואין קריאה ל־`api/og.js#ragil`.
4. **קוראי מידע.** הקריאות הן לאותם מקורות ציבוריים שדף המספר כבר קורא: `gematria_words` (מאומת ומפורסם), `number_anchors`, `posts_by_number_strict`, `posts`, `els_records` (published + public), `topic_cards_public`. הן כפולות לקריאות של `api/og.js` באותה בקשה (שתי קריאות למסמך מספר, אחת לצופן ולנושא). אם תרצה לאחד, אפשר להעביר את השורות דרך `req.publicReadingFirstWords`, כמו שנעשה לתגיות.
5. **אין מדד חדש.** לא נוסף אירוע, שם אירוע או טבלה. כותרת התשובה `X-Sod-First-Words` היא אבחון בלבד.
6. **תגית קנונית.** #1462 כולל `8667a5dcd` ("expect the hyphenated canonical"). שינוי הרישום שלי הולך באותו כיוון: הקישורים הפנימיים תואמים עכשיו לקנוני.

## תוצאות בדיקות (הרצה מקומית על הענף הממוזג; אין ריצת CI עדיין)

- `npm run build`: עבר, כולל שער Legacy פרש ו־`2029 shell budget: PASS`. הגידול ש־השער מדווח (frameJs ‎+858, frameCss ‎+479, בתוך הגבול) קיים כבר ב־#1462; השינויים שלי לא מוסיפים בתים ללקוח.
- `node scripts/build-public-reading-production.mjs`: עבר.
- 17 קובצי בדיקה, 173 בדיקות: 172 עברו, אחת נכשלה.
  - **הכישלון קיים גם ב־#1462 עצמו** (`f5af86bff`, 26/27): `test/raziel-canonical-navigation-actions.test.mjs`, "hrefs come only from the closed table". הבדיקה מחפשת ב־`razielSessionRequest2029.js` את הביטוי `/2029/number/([1-9]\d{0,5})`, והוא כבר לא שם. לא נגעתי בקובץ ולא בבדיקה.
- `test-2029-server-seo-ai-parity`, `test-2029-route-seo-decisions` (58), `test-2029-route-seo-behavior` (60), `test-2029-opening-shell`: עברו.
- בדיקת עין: מעטפת הפתיחה עם המילים, 390px, JavaScript כבוי, ל־`/number/787`, `/number/נטע`, `/community/calculator`.

## מה לא נבדק

- אין Preview מוגן: הענף לא ברשימת ההיתר ב־`review-admission.js` (דורש אישור ZURIEL לענף).
- CLS ו־LCP של המעבר ממילים ראשונות לדף המלא לא נמדדו בדפדפן עם JavaScript פעיל. המילים נמצאות בתוך `.sod29-opening`, שמוחלף כולו ב־mount; ה־Suspense fallback (`Opening2029.jsx`) לא מכיל אותן, כך שייתכן הבהוב קצר.
- זמן התגובה של המסמך בפריסה אמיתית (מקומית: 210–700ms לקריאה, במקביל ל־metadata, מגבלה 1,500ms).
- לא הורץ כל סבב הבדיקות של המאגר, רק הקבצים שנוגעים בשינוי.

## החלטות שממתינות ל־ZURIEL

1. החלת כלל הכניסה החדש לדפי המספר (SQL מוצע).
2. פתיחת בית המדרש לאינדוקס (`noindex, nofollow` קבוע ב־`api/og.js`).
3. `/category/שיעורי-שמע-סוד-החשמל` מחזיר 404; יעד מוצע: `/שיעורי-שמע-סוד-החשמל`.
4. הפוסט `/post/sharshar-elections-redemption-hints-draft` והביטוי "טסט" בערך 78.
5. Preview מוגן לענף הזה, או רק אחרי השילוב ב־#1462.
