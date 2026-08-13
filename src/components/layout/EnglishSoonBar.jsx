import React, { useEffect, useState } from "react";

// 🌍 טיקר-אנגלית עבה — מוצג רק למי שנכנס עם דפדפן באנגלית או מארה״ב/יבשת אמריקה.
//    הודעה באנגלית: «בקרוב האתר יהיה באנגלית». עבה, גדול, בולט. ניתן לסגירה לדפדפן.
const DISMISS_KEY = "en_soon_bar_dismissed_v1";

function isEnglishOrUS() {
  try {
    const langs = (navigator.languages && navigator.languages.length)
      ? navigator.languages : [navigator.language || ""];
    const en = langs.some(l => /^en(\b|-|_|$)/i.test(String(l)));
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
    const us = /^America\//.test(tz); // פרוקסי ל-ארה״ב/אמריקה (אין geo-IP בצד-לקוח)
    return en || us;
  } catch { return false; }
}

export default function EnglishSoonBar() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }
    // 🔎 תצוגה-מקדימה לצוריאל (עברית/ישראל): הוסף ?enbar=1 לכתובת כדי לראות את הטיקר בכל שפה.
    let force = false;
    try { force = /[?&]enbar=1\b/.test(window.location.search); } catch { /* ignore */ }
    setShow(force || (!dismissed && isEnglishOrUS()));
  }, []);

  if (!show) return null;

  const dismiss = (e) => {
    e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setShow(false);
  };

  return (
    <div
      dir="ltr" role="region" aria-label="English version coming soon"
      style={{
        position: "relative", minHeight: 48, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 12, padding: "8px 46px", overflow: "hidden",
        background: "linear-gradient(90deg,#0a2a6b,#1e4fd1 45%,#2f6df6 70%,#1e4fd1)",
        borderBottom: "2px solid #f2c94c",
        boxShadow: "0 2px 14px rgba(0,0,0,.35)",
      }}
    >
      <style>{`@keyframes ensb-shine{0%{transform:translateX(-120%)}100%{transform:translateX(220%)}}
        @keyframes ensb-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}`}</style>
      {/* ברק נע — תחושת «טיקר» חי */}
      <span aria-hidden style={{
        position: "absolute", top: 0, bottom: 0, width: "28%",
        background: "linear-gradient(90deg,transparent,rgba(255,255,255,.22),transparent)",
        animation: "ensb-shine 4.5s ease-in-out infinite", pointerEvents: "none",
      }} />
      <span style={{
        flex: "0 0 auto", background: "#f2c94c", color: "#0a2a6b",
        fontFamily: "sans-serif", fontWeight: 900, fontSize: 12, letterSpacing: 1,
        padding: "3px 10px", borderRadius: 999, animation: "ensb-pulse 2.2s ease-in-out infinite",
      }}>NEW</span>
      <span style={{
        color: "#fff", fontFamily: "sans-serif", fontWeight: 800, fontSize: 16.5, letterSpacing: 0.2,
        textShadow: "0 1px 6px rgba(0,0,0,.4)", textAlign: "center", lineHeight: 1.25,
      }}>
        🌍 Coming soon — <b style={{ color: "#ffe9a8" }}>SOD&nbsp;1820 in English</b>. Stay tuned!
      </span>
      <button
        onClick={dismiss} aria-label="Dismiss"
        style={{
          position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)",
          background: "rgba(255,255,255,.18)", border: "none", color: "#fff", cursor: "pointer",
          width: 26, height: 26, borderRadius: "50%", fontSize: 15, lineHeight: 1, display: "grid", placeItems: "center",
        }}
      >×</button>
    </div>
  );
}
