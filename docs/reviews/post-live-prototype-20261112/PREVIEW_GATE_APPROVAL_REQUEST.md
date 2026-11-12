# בקשת אישור שער — Preview מוגן לענף `ccr-b8e8ab12-9hoamu` (12.11.2026)

**לגורם המוסמך (ZURIEL / בעל שער ה־Preview).** המסמך הזה אינו מחיל דבר. הוא מציג את שינוי השער המדויק, את הבדיקות שנדרשות, ומה הוא מתיר ולא מתיר.

## מה מבוקש
ZURIEL ביקש Preview מוגן אחד של אב־הטיפוס ״מפת המציאות״ (הוראות 12.11.2026). מנגנון ה־Preview המוגן בונה רק ענפים שרשומים ב־`ADDITIONAL_REVIEW_BRANCHES` (`public-reading-deploy/review-admission.js`), ושם כתוב ״each further branch needs its own recorded approval״. נדרש לכן אישור מתועד לענף אחד בדיוק.
- **הענף המבוקש:** `ccr-b8e8ab12-9hoamu` (שם מדויק; לא תבנית ולא קידומת).
- **ה־SHA לבנייה:** ה־commit שיחיל את ה־patch על ראש הענף (ראש הענף הנוכחי נמסר בהודעת המסירה; ה־Preview ייבנה מ־SHA מדויק אחד בלבד, ו־`--review-source` מצמיד אותו).

## השינוי (קובץ: `PREVIEW_GATE_APPROVAL.patch` באותה תיקייה; נבדק: `git apply --check` נקי)
1. `public-reading-deploy/review-admission.js` — הוספת `REALITY_MAP_PREVIEW_BRANCH = "ccr-b8e8ab12-9hoamu"` כרשומה שנייה (ויחידה נוספת) ב־`ADDITIONAL_REVIEW_BRANCHES`.
2. `scripts/build-public-reading-production.mjs` — `define` של `import.meta.env.VITE_REALITY_MAP_PREVIEW` שהוא `"true"` **רק** כש־`--protected-review` על target `preview` ו־`VERCEL_GIT_COMMIT_REF` שווה בדיוק לענף הזה; בכל בנייה אחרת (כולל Production) הוא `"false"`.
3. עדכון שני מבחני הרשימה המדויקת (`test/public-reading-protected-review.test.mjs`, `scripts/test-public-reading-main-release-contract.mjs`) לרשימה בת שני הענפים. **אין החלשת בדיקה**: הרשימה נשארת בדיקת שוויון מדויקת, ומבחני ״אף תבנית/קידומת/אות גדולה/נתיב refs אינם מתקבלים״ ו״Production לא מקבל ענף נוסף״ נשארים ללא שינוי.

## מה הוא מתיר
- בנייה מוגנת (Preview בלבד) של הענף הזה, עם קבלה ש״נקשרת״ לענף, ל־SHA, ל־deployment ול־host (הקיים), noindex, ללא Production, ללא הזזת דומיין/alias.
- הפעלת החריג של 5107/5112 וה־Companion **רק** באותו Preview. בנייה רגילה/Production בונה את הדגל כ־`false` ולכן לא מפעילה שום דבר מזה.

## מה הוא אינו מתיר
מיזוג ל־`main` · פריסה ל־Production · alias/דומיין · שינוי DB/הרשאות/Edge · מתן הרשאת Bash כללית · הרחבת חריג 5107/5112 לאתר · כל ענף אחר.

## בדיקות שנדרשות (ובמה הן נבדקו)
נבדק בעותק זמני מחוץ למאגר (הנתיב ב־`scratchpad`; לא נגע בעץ העבודה):
- `scripts/test-public-reading-main-release-contract.mjs` — **PASS** עם ה־patch (ועם המצב הקיים).
- `test/public-reading-protected-review.test.mjs` — 12 בדיקות; עם ה־patch **8 עוברות ו־4 נכשלות**, והיו **אותן 4 נכשלות גם על המאגר ללא כל שינוי** (6, 7, 9, 10: קבלה סטטית/מתאמי hosting/dirtiness/auth alias — ככל הנראה סביבתיות במכונה הזו). בדיקת הרשימה המדויקת (״an additional review branch is an exact, Preview-only allowlist entry״) והבדיקה של host ה־Auth — **עוברות** עם ה־patch. נדרש להריץ את הסט המלא ב־CI של הגורם המוסמך לפני האישור.
- אחרי ההחלה: `npm run build` (כולל שערי Legacy-retired ו־one-tree) וסבב הבדיקות של הענף; בנייה מוגנת של ה־Preview עצמה (`--protected-review --review-source=<SHA>`).
- אחרי העלייה: ודאי שה־Ignored Build Step ב־create_deployment מכיל את ה־SHA המדויק; ודאי `readyState` כ־40 שנ׳ אחרי היצירה (CANCELED = דילוג ה־Ignored Build Step); קריאה חוזרת של ה־aliases של הדומיינים החיים כדי להוכיח שלא השתנו.

## בקשת האישור
לאשר, בתיעוד, את ה־patch לענף `ccr-b8e8ab12-9hoamu` בלבד ולקומיט המדויק שיחיל אותו. עם האישור: יוחל ה־patch בקומיט נפרד, יוצר ה־Preview המוגן (target preview, ללא alias), ויימסר הקישור יחד עם ה־SHA.
