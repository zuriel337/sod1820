import React, { useState, useCallback } from "react";
import { useLocation } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { track } from "../lib/tracking.js";
import { CHANNELS as CH, SHARE_SITE as SITE, canNativeShare, nativeShare, copyLink, floatingShareShown } from "../lib/share.js";

// 🔗 ShareActions — רכיב-השיתוף הקנוני היחיד באתר (canonical_ui_components_law).
// כל מסך (מספר/צופן/פוסט/גלריה/כל ישות) מעביר פרמטרים בלבד — לא משכפל קוד שיתוף.
//   type   — סוג הישות (number/code/post/gallery…) — לתיוג ואנליטיקס
//   url    — ה-URL הקנוני לשיתוף (ברירת-מחדל: הכתובת הנוכחית)
//   title  — הכותרת/טקסט השיתוף
//   image  — תמונת ה-OG (הרובוטים מושכים אותה דרך /api/og; נשמר כאן להקשר/עתיד)
//   channels — אילו ערוצים להציג (ברירת-מחדל: כולם) · compact — אייקונים בלבד · extra — פעולות נוספות
//   force — לכפות הצגה גם היכן שהווידג׳ט-הצף קיים (חריג נדיר; ברירת-מחדל: כבוי)
// שינוי אייקון/טקסט/ערוץ/באג = פעם אחת כאן → מתעדכן בכל האתר.
// 👑 share_placement_law: הבלוק מרנדר את עצמו **רק היכן שהווידג׳ט-הצף נעדר** (floatingShareShown=false)
//    → אפס כפילות עם הלשונית הצפה, ושורה-אחת נקייה. אף דף לא צריך להחליט — זה קורה לבד.
// הערוצים באים מ-CHANNELS (lib/share.js) — אותו מקור-אמת של הלשונית הצפה. עריכה שם → מתעדכן בשניהם.
const ALL = ["native", ...Object.keys(CH), "copy"];

export default function ShareActions({ type = "page", url, title = "", image = null, channels = ALL, compact = false, extra = null, force = false, style }) {
  const P = usePalette();
  const { pathname } = useLocation();
  const [copied, setCopied] = useState(false);
  const fullUrl = url || (typeof window !== "undefined" ? window.location.href : SITE);
  const text = title || (typeof document !== "undefined" ? document.title : "SOD1820");
  const canNative = canNativeShare();

  const logShare = useCallback((channel) => { try { track("share", String(type), channel, { url: fullUrl, image: image || undefined }); } catch { /* noop */ } }, [type, fullUrl, image]);

  const native = useCallback(async () => { logShare("native"); await nativeShare({ title: text, url: fullUrl }); }, [text, fullUrl, logShare]);

  const copy = useCallback(async () => {
    logShare("copy");
    if (await copyLink(fullUrl)) { setCopied(true); setTimeout(() => setCopied(false), 1600); }
  }, [fullUrl, logShare]);

  // 👑 share_placement_law — הבלוק מופיע רק היכן שהווידג׳ט-הצף נעדר (אלא אם force). אפס כפילות.
  if (!force && floatingShareShown(pathname)) return null;

  const btn = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none",
    background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: compact ? "8px 11px" : "8px 15px",
    fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, color: P.ink, minHeight: 40, whiteSpace: "nowrap", flexShrink: 0 };
  const label = (t) => compact ? null : <span>{t}</span>;

  return (
    // שורה אחת: לא נשבר; במסך צר נגלל אופקית עדין (WebkitOverflowScrolling) במקום להתפזר ל-2-3 שורות
    <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "nowrap", overflowX: "auto", WebkitOverflowScrolling: "touch", alignItems: "center", scrollbarWidth: "none", ...style }}>
      {channels.includes("native") && canNative && (
        <button onClick={native} title="שתף" style={{ ...btn, background: P.accentBtn, color: P.onAccent, borderColor: "transparent" }}>🔗 {label("שתף")}</button>
      )}
      {channels.filter(c => CH[c]).map(c => {
        const m = CH[c];
        // אייקון-מותג SVG בתוך תג-צבע (זהה ללשונית הצפה) — נשען על CHANNELS (svg+brand) כמקור-אמת יחיד.
        return (
          <a key={c} href={m.href(fullUrl, text)} target="_blank" rel="noopener noreferrer" onClick={() => logShare(c)}
            title={m.label} style={btn}>
            <span style={{ width: 22, height: 22, borderRadius: "50%", background: m.brand, color: "#fff", display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <svg viewBox="0 0 24 24" width="13" height="13" fill="currentColor" aria-hidden focusable="false"><path d={m.svg} /></svg>
            </span> {label(m.label)}
          </a>
        );
      })}
      {channels.includes("copy") && (
        <button onClick={copy} title="העתק קישור" style={btn}>{copied ? "✓ הועתק" : "📋"} {label(copied ? "" : "העתק")}</button>
      )}
      {extra}
    </div>
  );
}
