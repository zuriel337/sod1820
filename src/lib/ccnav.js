// src/lib/ccnav.js — CC · בונה-קישור לצומת הקנוני הקיים /number/:phrase (מספר או ביטוי),
// עם קונטקסט-הגעה אופציונלי כ-query. ⛔ לא route/מערכת-ניווט חדשה — רק העשרת-הקישור.
// ctx = {method, expr, src} = provenance/ניווט בלבד: לא משנה את משמעות המספר, לא הופך ל-Fact.
export function numLink(key, ctx) {
  let u = `/number/${encodeURIComponent(String(key))}`;
  if (ctx) {
    const qs = new URLSearchParams();
    if (ctx.method) qs.set("method", ctx.method);
    if (ctx.expr) qs.set("expr", ctx.expr);
    if (ctx.src) qs.set("src", ctx.src);       // תווית-מקור (מקור·כותב) — לתצוגה
    if (ctx.srcUrl) qs.set("srcUrl", ctx.srcUrl); // URL-מקור קיים → קישור-חזרה (רק אם קיים; לא ממציאים)
    const s = qs.toString();
    if (s) u += `?${s}`;
  }
  return u;
}
