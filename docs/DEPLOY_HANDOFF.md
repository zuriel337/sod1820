# SOD1820 — חבילת מסירה: חיבור Gemini כמנוע שני (הוצאה לאוויר)

> **הקוד כבר כתוב, committed ונדחף** לענף `claude/gematria-claude-supabase-noqx2f`.
> **שכבת ה-DB כבר חיה** (לא דורשת פריסה). נשארו **2 פעולות אנושיות** להוצאה לאוויר.

---

## חלק א׳ — מה כבר קיים (אין מה לעשות)

### DB (חי עכשיו, שינוי-נתונים לא תלוי פריסה)
- תפקיד `ai_reader` — read-only, `BYPASSRLS`, GRANT SELECT רק ל: `gematria_words, nodes, edges, posts, topic_cards, insights, channel_updates, bidim`. **בלי PII.**
- פונקציה `ai_query(text)` — SELECT-יחיד-בלבד, בבעלות `ai_reader`, timeout 5s, חשופה ל-`service_role` בלבד. **4 בדיקות אבטחה עברו.**

### קוד (על הענף)
| קובץ | מה |
|---|---|
| `supabase/functions/ai-analyze/index.ts` | ניתוב engine=claude/gemini + hints compare/discovery |
| `src/lib/aiAnalysis.js` | נקודת-כניסה אחת `analyze(...)` לכל האתר |
| `src/lib/supabase.js` | `getAiAnalysis({...engine})` |
| `src/components/AiAnalyze.jsx` | מצב `compare` — לשוניות 🔵/🟣 |
| `src/pages/CommunityCalculatorPage.jsx` | Matchmaker כן (X/19) + Discovery card + בורר-מנוע |
| `docs/INTEGRATION.md · SCHEMA_content_layer.md` | תיעוד הצינור + הסכימה |

---

## חלק ב׳ — 2 הפעולות להוצאה לאוויר

### פעולה 1 — הוספת ה-Secret (ידני, רק בעל-החשבון)
```
Supabase → פרויקט linswmnnkjxvweumprav → Edge Functions → Secrets → Add:
   Name:  GEMINI_API_KEY
   Value: <המפתח מ-https://aistudio.google.com/apikey>
(אופציונלי) GEMINI_MODEL = gemini-2.5-flash
```

### פעולה 2 — פריסת פונקציית ai-analyze
**אפשרות א׳ (מומלץ):** תגיד ל-Claude כאן «הוספתי מפתח» → הוא פורס דרך ה-MCP ומאמת.
**אפשרות ב׳ (מפתח/CLI):**
```bash
supabase functions deploy ai-analyze --project-ref linswmnnkjxvweumprav --no-verify-jwt
```
> `--no-verify-jwt` חובה (פונקציה public שנקראת מהדפדפן).

---

## חלק ג׳ — הפרונט (Vercel) — רק בהוראת צוריאל
שינויי הפרונט (בורר-המנוע במחשבון) עולים ל-main רק כשצוריאל אומר «תעלה».
עד אז — הכל צובר על הענף. אין לדחוף ל-main אוטומטית (`deploy_on_request`).

---

## חלק ד׳ — אימות אחרי הפריסה
1. `select public.ai_query('select phrase from gematria_words where ragil=248 limit 3');` → מחזיר שורות.
2. במחשבון: כפתור 🟣 «נתח ב-Gemini» → מחזיר ניתוח (לא «לא זמין»).
3. כפתור 🔵 «נתח ב-Claude» → ממשיך לעבוד.
