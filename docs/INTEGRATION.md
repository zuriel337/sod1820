# SOD1820 — מערכת החיבור האחת ל-AI (Claude + Gemini)

> **צינור אחד לכל האתר.** כל מערכת (מחשבון · דף מספר · מרכז מחקר · בית מדרש · כלי-השוואה) שולחת את אותו מבנה קנוני. המנוע (SQL/JS) מייצר עובדות; ה-AI מפרש בלבד.

## הארכיטקטורה (3 שכבות, לא יותר)
```
מערכת באתר (React)
   │  analyze({ subject, kind, engine, methods|parallels|pair, userGoal })
   ▼
src/lib/aiAnalysis.js   ← נקודת-הכניסה האחת (בונה facts קנוני)
   │  getAiAnalysis({ kind, subject, facts, engine, fast })
   ▼
Edge Function ai-analyze  ← SYSTEM אחד + hints לפי kind + ניתוב engine
   │  claude → Anthropic REST   |   gemini → Google REST (systemInstruction)
   ▼
{ analysis, engine, model }   ← אותו פורמט פלט לשני המנועים (ל-Tabs 🔵/🟣)
```

## נקודת-הכניסה האחת — `analyze(...)`
```js
import { analyze } from "@/lib/aiAnalysis.js";

// דף מספר / מחשבון (שם יחיד + גילוי מקבילות)
const txt = await analyze({
  subject: "אברהם", kind: "discovery", engine: "gemini",
  methods: [{ key: "רגיל", value: 248 }, { key: "מסתתר", value: 429 }],
  parallels: ["במדבר", "רחם", "אוריאל"],   // מ-getAllValuePhrases, מדורג-הפתעה
});

// השוואת שני שמות (Matchmaker)
const txt2 = await analyze({
  subject: "צוריאל פולייס מול אסתר מלכה", kind: "compare", engine: "claude",
  pair: { a: { name: "צוריאל פולייס", value: 533 }, b: { name: "אסתר מלכה", value: 756 }, shared: [] },
});
```

## מיפוי ה-payload של Gemini → החוזה שלנו
| בקשת Gemini | אצלנו |
|---|---|
| `context: "analysis_request"` | `kind` (number/compare/discovery/…) |
| `engine_data.subject` | `subject` |
| `engine_data.raw_results` | `methods: [{key,value}]` |
| `engine_data.parallels` | `parallels: [{phrase}\|string]` |
| `user_goal` | `userGoal` |
| `compliance.no_predictions / fact_vs_hint` | **אוטומטי** — נאכף ב-SYSTEM של `ai-analyze` (5 חוקי-ברזל). לא צריך לשלוח דגלים. |

> **חשוב:** ה-`raw_results` תמיד מגיעים **מהמנוע** (SQL `*_calc` / JS `gematria.js`). ה-AI לעולם לא מחשב — רק מפרש. זה מובנה: `buildAiFacts` מסמן «ערכי המנוע (מאומתים, אל תחשב מחדש)».

## המנועים (engine)
- `claude` (ברירת-מחדל) — Anthropic. `ANTHROPIC_API_KEY` = Edge secret.
- `gemini` — Google. `GEMINI_API_KEY` = Edge secret · `GEMINI_MODEL` (ברירת-מחדל `gemini-2.5-flash`).
- אותו SYSTEM + אותו `facts` לשני המנועים → השוואת A/B הוגנת.

## סטטוס
- ✅ `aiAnalysis.js` (נקודת-כניסה) · `getAiAnalysis(engine)` · `ai-analyze` (ניתוב + hints compare/discovery) · לשוניות 🔵/🟣 במחשבון.
- ⏳ נותר: הוספת `GEMINI_API_KEY` (Edge secret) + פריסת `ai-analyze`.
