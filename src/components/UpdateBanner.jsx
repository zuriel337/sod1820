import React, { useEffect, useState } from "react";

// ── באנר "גרסה חדשה זמינה" ──
// מזהה פריסה חדשה בלי Service Worker: משווה את קובץ ה-entry (/assets/index-HASH.js)
// שהדפדפן טען כרגע מול זה שמופיע ב-index.html החי בשרת. שונה → עלתה גרסה חדשה.
// בודק כל ~90 שניות וגם בכל פעם שחוזרים ללשונית (focus). אין צורך בחלון סתר.

const CHECK_MS = 90 * 1000;

// קובץ ה-entry שהדפדפן טען כרגע (מתוך תגי <script> בדף).
function currentEntry() {
  const srcs = Array.from(document.querySelectorAll("script[src]")).map(s => s.getAttribute("src") || "");
  return srcs.find(src => /\/assets\/index-[\w-]+\.js/.test(src)) || null;
}

async function liveEntry() {
  const res = await fetch("/", { cache: "no-store" });
  if (!res.ok) return null;
  const html = await res.text();
  const m = html.match(/\/assets\/index-[\w-]+\.js/);
  return m ? m[0] : null;
}

export default function UpdateBanner() {
  const [ready, setReady] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    const mine = currentEntry();
    if (!mine) return; // dev / לא זיהינו — לא מציגים (מונע התרעות שווא)
    let stopped = false;

    const check = async () => {
      if (stopped) return;
      try {
        const live = await liveEntry();
        if (live && live !== mine) { setReady(true); stopped = true; }
      } catch { /* רשת — מתעלמים, ננסה שוב */ }
    };

    const id = setInterval(check, CHECK_MS);
    const onVis = () => { if (document.visibilityState === "visible") check(); };
    document.addEventListener("visibilitychange", onVis);
    window.addEventListener("focus", check);
    const first = setTimeout(check, 8000); // בדיקה ראשונה זריזה אחרי הטעינה

    return () => {
      stopped = true;
      clearInterval(id); clearTimeout(first);
      document.removeEventListener("visibilitychange", onVis);
      window.removeEventListener("focus", check);
    };
  }, []);

  if (!ready || dismissed) return null;

  return (
    <div dir="rtl" style={{
      position: "fixed", insetInline: 0, bottom: 0, zIndex: 99999,
      display: "flex", justifyContent: "center", padding: "10px 12px",
      pointerEvents: "none",
    }}>
      <div style={{
        pointerEvents: "auto", display: "flex", alignItems: "center", gap: 12,
        maxWidth: 520, width: "100%",
        background: "linear-gradient(135deg, rgba(20,14,4,0.97), rgba(8,5,2,0.97))",
        border: "1px solid rgba(212,175,55,0.55)", borderRadius: 14,
        boxShadow: "0 8px 30px rgba(0,0,0,0.5), 0 0 18px rgba(212,175,55,0.15)",
        padding: "12px 14px",
      }}>
        <span style={{ fontSize: 20, flexShrink: 0 }}>✨</span>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ color: "#f0d77a", fontFamily: "system-ui, sans-serif", fontSize: 14, fontWeight: 700 }}>גרסה חדשה זמינה</div>
          <div style={{ color: "#c9b78a", fontFamily: "system-ui, sans-serif", fontSize: 12 }}>עדכנתי את האתר — לחצו לרענון כדי לראות.</div>
        </div>
        <button onClick={() => window.location.reload()} style={{
          flexShrink: 0, cursor: "pointer",
          background: "linear-gradient(135deg, #d4af37, #b8941f)", color: "#1a1206",
          border: "none", borderRadius: 999, padding: "8px 16px",
          fontFamily: "system-ui, sans-serif", fontSize: 13, fontWeight: 800,
        }}>🔄 רענן</button>
        <button onClick={() => setDismissed(true)} title="סגור" aria-label="סגור" style={{
          flexShrink: 0, cursor: "pointer", background: "none", border: "none",
          color: "#8a7a55", fontSize: 18, lineHeight: 1, padding: "0 2px",
        }}>✕</button>
      </div>
    </div>
  );
}
