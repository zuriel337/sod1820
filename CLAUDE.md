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
- **`subscribe_gate_law`** — שער הרשמה. רכיב: `src/components/SubscribeGate.jsx`.
  2 חידושים חינם → הרשמה חינם לעדכונים (`subscribers`, `source='beit-midrash'`). **לא** בני ההיכל.

## בית המדרש (`/beit-midrash`)
עמוד: `src/pages/BeitMidrashPage.jsx`. שלושה מדורי חידושים + שיטות הלימוד:
1. **חידושי AI** — `insights` עם `origin='ai'` (סמל מאומת, 2 חינם ואז שער).
2. **חידושי גולשים** — "בקרוב" (קהילה).
3. **חידושי המערכת** — התראות התכנסות/1820 (`insights` עם `has_1820` או `convergence_score>0`).

## כללי
- האתר: React 18 + Vite, פרוס ב-Vercel. נתונים מ-Supabase. בדיקת build: `npm run build`.
- ענף פיתוח נוכחי: `claude/sweet-galileo-w6sj71`.
