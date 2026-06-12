# SOD1820 — הנחיות פרויקט

## יומן העבודה — מקור האמת
כשצוריאל מבקש "לפתוח את היומן" / "יומן" / "רשומות אחרונות" וכו' —
**המקור הוא טבלת `work_log` ב-Supabase** (project `linswmnnkjxvweumprav`), לא הקובץ `docs/work-journal.md`.

- לפתיחה/קריאה: `select * from work_log order by created_at desc limit N;`
- הקובץ `docs/work-journal.md` הוא יומן ישן/רטרוספקטיבי — לא לפתוח אותו כברירת מחדל ולא להתייחס אליו כיומן הפעיל.
- לרישום רשומת עבודה חדשה: `insert into work_log (session_date, topic, numbers, what_we_did, status, open_threads) ...`

## חוקי מערכת (nodes type='rule') — לכבד תמיד
החוקים נשמרים בטבלת `nodes` (`type='rule'`, עם `rule_id`, `rule_version`, `is_active`).
לפני שינוי לוגיקה מהותית — לקרוא חוקים רלוונטיים: `select rule_id, label, metadata from nodes where type='rule' and is_active;`
שינוי חוק = גרסה חדשה (לפי `rule_versioning`), לא מוחקים.

### חוקים שמומשו בקוד (בית המדרש)
- **`verified_badge_law`** — הסמל המאומת = לוגו + סימן אימות בינלאומי (✓). רכיב: `src/components/VerifiedBadge.jsx`.
  variants: `ai` (🔵✓ ליד חידושי AI), `post` (ליד פוסט מאומת), `gematria` (ליד גימטריה מאומתת).
- **`insight_card_law`** — מבנה חידוש קצר ונפתח. רכיב: `src/components/InsightCard.jsx`.
  אם החידוש מקושר לפוסט (`insights.source_ref`) — לחיצה מנווטת לפוסט במקום לפתוח.
- **`subscribe_gate_law`** (v2) — שער הרשמה עם **אימות מייל אמיתי** (Supabase Auth OTP).
  2 חידושים חינם → רישום + אימות קוד במייל פותח את ההמשך (משתמש מאומת = יש session). **לא** בני ההיכל.
  רכיבים: `SubscribeGate.jsx`, `EmailVerify.jsx`, `lib/auth.js`, `AuthProvider.jsx` (`useAuth`).
  הגדרת דאשבורד: Email provider פעיל; בתבנית Magic Link להוסיף `{{ .Token }}` לקוד 6 ספרות; SMTP מותאם לפרודקשן.
- **תיבת עדכונים כללית** — `src/components/UpdatesBox.jsx` (רשימת תפוצה, `variant` panel/inline). ניתנת להצבה בכל מקום.

## בית המדרש (`/beit-midrash`)
עמוד: `src/pages/BeitMidrashPage.jsx`. שלושה מדורי חידושים + שיטות הלימוד:
1. **חידושי AI** — `insights` עם `origin='ai'` (סמל מאומת, 2 חינם ואז שער).
2. **חידושי גולשים** — "בקרוב" (קהילה).
3. **חידושי המערכת** — התראות התכנסות/1820 (`insights` עם `has_1820` או `convergence_score>0`).

## עמוד הבית (`src/pages/HomePage.jsx`)
הפרדת זרמים (`stream_separation_law`):
- **עדכונים אחרונים** = פוסטים (רק צוריאל מעדכן פוסטים). הרכיב `LatestPostsRail`.
- **חידושי AI** = תיבה מכובדת עם 3 חידושים אחרונים (`origin='ai'`) + "עוד בבית המדרש →". הרכיב `AiInsightsBox`.
- היכל השערים (`heichal.html`) — הוסר ה-overlay "סוד1820" שהסתיר את המרכז.

פוסט היסוד: `wp_id=17` ("שם ה' בתורה 1820 פעם") מוצג בראש בית המדרש כ-«פוסט היסוד» (כבוד לסוד 1820).
כשנוצר חידוש AI מפוסט/גלריה — הוא נשמר ב-`insights` (origin='ai'), מופיע בתיבת ה-AI בבית המדרש, ולחיצה מנווטת לפוסט/גלריה (`source_ref`).

## כללי
- האתר: React 18 + Vite, פרוס ב-Vercel. נתונים מ-Supabase. בדיקת build: `npm run build`.
- ענף פיתוח נוכחי: `claude/sweet-galileo-w6sj71`.
