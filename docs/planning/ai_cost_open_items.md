# 🧾 AI Cost — Open Items (תיעוד בלבד · לא לבנות עדיין)

> נגזר מ-Cost Audit של 14.8.2026. **מאושר כבסיס תכנוני** (החלטת צוריאל):
> - כל עובדה שכבר קיימת ב-DB/engine חייבת להיות ניתנת להצגה **ללא AI**.
> - `cross-resonance` הוא שכבת **Fact חינמית** — אסור שיהיה gated מאחורי `aiText`.
> - AI = שכבת **Interpretation בלבד**.
> - Sonnet/Deep = פעולה מפורשת ויקרה, **לא שער להצגת עובדות**.
>
> **לא לבצע כרגע שינוי UI/קוד בנושא זה.** להלן שני הפערים כ-open items.

## Open Item #1 — שחרור cross-resonance החינמי מה-gate של AI
- **הצומת המדויק:** `src/pages/EntityPage.jsx`
  - עוטף: `const aiCrossBlock = aiCross && (...)` (שורה ~986).
  - מילוי `aiCross`: רק ב-useEffect עם `if (key && aiText)` (שורה ~860), או בתוך `runAiNumber` אחרי קריאת-AI (שורה ~881). מאותחל `null` (שורה ~838).
- **המהות:** `aiCross = getWordCrossFacts(key)` — דטרמיניסטי לחלוטין (`number_cross_resonance` RPC מעל `bidim` + `crossMethodPairs` + אטלס). אפס AI. מתויג בקוד «עובדה ניטרלית» / «הערכים = עובדה מהמנוע».
- **מה נדרש (עתידי):** לטעון `aiCross` ב-mount (כמו `getNumberDossier` בשורה ~851), ולהסיר את התלות ב-`aiText`. חושף **רק** מידע קיים בחינם. «🔬 מעמיק» (Sonnet) נשאר opt-in נפרד.
- **סטטוס:** OPEN — לא לבנות.

## Open Item #2 — cache/dedup/guard להרצות-AI חוזרות («טרי» / «מעמיק»)
- **הצומת המדויק:** `src/pages/EntityPage.jsx`
  - `runAiNumber` (שורה ~867) **לא בודק קאש לפני קריאה** — תמיד קורא ל-`analyzeWordDeep`.
  - כפתורים: «טרי» (`runAiNumber(aiEngine, aiDeep)`, ~1099), «מעמיק» (`runAiNumber("claude", true)`, ~1070/1089), «החלף מנוע» (~1094) — כל אחד יורה קריאה טרייה.
  - `loadAiCache`/`saveAiCache` עוזרים רק ב**ניווט-חוזר**, לא בלחיצות-כפתור. `if(aiBusy) return` חוסם רק דאבל-קליק במקביל.
- **מה נדרש (עתידי):** בדיקת-קאש/dedup לפני הרצה (או השבתת «טרי» כשהתוצאה זהה), כדי למנוע הרצות-Sonnet כפולות מעבר לתקרת-השרת.
- **סטטוס:** OPEN — לא לבנות.

## הערה — נאכף בנפרד (14.8.2026)
תקרת השרת של המנוע-העמוק שונתה ל-**2/יום לכולם (כולל רשומים)** ב-RPC `ai_quota_check` (ראה `work_log`). זה בלם-עלות מיידי; Open Item #2 (dedup בצד-לקוח) עדיין רלוונטי לחוויית-משתמש (למנוע לחיצות-סרק שנחסמות).
