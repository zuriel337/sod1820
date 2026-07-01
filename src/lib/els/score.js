// 🎯 מנוע-ניקוד אחד ל-ELS (צעד 1 בארכיטקטורה) — כל ה«קשרים» (חיתוך · מקביל · קרבה · עתידי)
// עוברים דרך אותה הערכת-מובהקות. זה מה שהופך «פשוט היום» ל«מתקדם בלי גבול»: כל type חדש
// משתמש באותו scorer. יושר מחקרי (חוק): מציאה = עובדה, נדירות = אינדיקציה — לא הוכחה.

// בונה אומדן «צפוי-במקרה» לפי תדירות-האותיות בפועל בחלון (לא אחיד). מחזיר סוגר expectedOf.
// expectedOf(term, skips[], dirsCount) = הסתברות-התאמה × מספר-מיקומים × כיוונים.
export function makeExpected(letters, from, to) {
  const M = Math.max(1, to - from);
  const freq = new Map();
  for (let i = from; i < to; i++) freq.set(letters[i], (freq.get(letters[i]) || 0) + 1);
  return (term, skips, dirsCount = 1) => {
    let pm = 1;
    for (const c of term) { const f = (freq.get(c) || 0) / M; if (!f) return 0; pm *= f; }
    let placements = 0;
    for (const s of skips) { const p = M - s * (term.length - 1); if (p > 0) placements += p; }
    return pm * placements * dirsCount;
  };
}

// דרגת-פלא אחידה (אורך + נדירות): מילים קצרות = רעש; ארוכות ונדירות = פלא אמיתי.
// מוחזר { r, t, c }: r=דרגה (0 נדיר · 1 בינוני · 2 שכיח) · t=תווית · c=צבע.
export function wonderTier(expected, len) {
  if (len <= 3) return { r: 2, t: "⚪ קצר", c: "#9a8a5e" };
  if (expected < 2 && len >= 5) return { r: 0, t: "🟢 פלא נדיר", c: "#1f7a4d" };
  if (expected < 60) return { r: 1, t: "🟡 לא־שכיח", c: "#b07d12" };
  return { r: 2, t: "⚪ שכיח", c: "#9a8a5e" };
}
