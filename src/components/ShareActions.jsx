import React, { useState, useCallback } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { track } from "../lib/tracking.js";

// 🔗 ShareActions — רכיב-השיתוף הקנוני היחיד באתר (canonical_ui_components_law).
// כל מסך (מספר/צופן/פוסט/גלריה/כל ישות) מעביר פרמטרים בלבד — לא משכפל קוד שיתוף.
//   type   — סוג הישות (number/code/post/gallery…) — לתיוג ואנליטיקס
//   url    — ה-URL הקנוני לשיתוף (ברירת-מחדל: הכתובת הנוכחית)
//   title  — הכותרת/טקסט השיתוף
//   image  — תמונת ה-OG (הרובוטים מושכים אותה דרך /api/og; נשמר כאן להקשר/עתיד)
//   channels — אילו ערוצים להציג (ברירת-מחדל: כולם) · compact — אייקונים בלבד · extra — פעולות נוספות
// שינוי אייקון/טקסט/ערוץ/באג = פעם אחת כאן → מתעדכן בכל האתר.
const SITE = "https://sod1820.co.il";
const ALL = ["native", "whatsapp", "telegram", "facebook", "copy"];

const CH = {
  whatsapp: { label: "וואטסאפ", emoji: "💬", color: "#25d366", href: (u, t) => `https://wa.me/?text=${encodeURIComponent(t + " " + u)}` },
  telegram: { label: "טלגרם", emoji: "✈️", color: "#2aabee", href: (u, t) => `https://t.me/share/url?url=${encodeURIComponent(u)}&text=${encodeURIComponent(t)}` },
  facebook: { label: "פייסבוק", emoji: "📘", color: "#1877f2", href: (u) => `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(u)}` },
};

export default function ShareActions({ type = "page", url, title = "", image = null, channels = ALL, compact = false, extra = null, style }) {
  const P = usePalette();
  const [copied, setCopied] = useState(false);
  const fullUrl = url || (typeof window !== "undefined" ? window.location.href : SITE);
  const text = title || (typeof document !== "undefined" ? document.title : "SOD1820");
  const canNative = typeof navigator !== "undefined" && !!navigator.share;

  const logShare = useCallback((channel) => { try { track("share", String(type), channel, { url: fullUrl, image: image || undefined }); } catch { /* noop */ } }, [type, fullUrl, image]);

  const native = useCallback(async () => {
    logShare("native");
    try { if (navigator.share) { await navigator.share({ title: text, url: fullUrl }); return; } } catch { /* cancelled */ }
  }, [text, fullUrl, logShare]);

  const copy = useCallback(async () => {
    logShare("copy");
    try { await navigator.clipboard.writeText(fullUrl); setCopied(true); setTimeout(() => setCopied(false), 1600); }
    catch {
      try { const ta = document.createElement("textarea"); ta.value = fullUrl; ta.style.position = "fixed"; ta.style.opacity = "0"; document.body.appendChild(ta); ta.select(); document.execCommand("copy"); ta.remove(); setCopied(true); setTimeout(() => setCopied(false), 1600); } catch { /* noop */ }
    }
  }, [fullUrl, logShare]);

  const btn = { display: "inline-flex", alignItems: "center", gap: 6, cursor: "pointer", textDecoration: "none",
    background: P.card, border: `1px solid ${P.border}`, borderRadius: 999, padding: compact ? "8px 11px" : "8px 15px",
    fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, color: P.ink, minHeight: 40, whiteSpace: "nowrap" };
  const label = (t) => compact ? null : <span>{t}</span>;

  return (
    <div dir="rtl" style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", ...style }}>
      {channels.includes("native") && canNative && (
        <button onClick={native} title="שתף" style={{ ...btn, background: P.accentBtn, color: P.onAccent, borderColor: "transparent" }}>🔗 {label("שתף")}</button>
      )}
      {channels.filter(c => CH[c]).map(c => {
        const m = CH[c];
        return (
          <a key={c} href={m.href(fullUrl, text)} target="_blank" rel="noopener noreferrer" onClick={() => logShare(c)}
            title={m.label} style={{ ...btn, color: m.color, borderColor: `color-mix(in srgb, ${m.color} 45%, ${P.border})` }}>
            {m.emoji} {label(m.label)}
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
