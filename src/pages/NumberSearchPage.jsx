import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, toggleTheme } from "../lib/themeMode.js";
import { getRecentSearches, getHotNumber } from "../lib/supabase.js";

// ===== "הגוגל של המספרים" — דף נחיתה /number =====
// שורה אחת ממורכזת (רגע הגוגל) → הקלדת מספר/שם → /number/:value (3 העומקים).
// + חיפושים אחרונים חיים · מספר חם · הפתיעו אותי · חיפוש מתקדם · צ'יפים מנחים.

const SURPRISE = [1820, 1237, 358, 424, 86, 26, 541, 137, 314, 776, "משיח", "גאולה", "אהבה", "אמת", "תורה", "בינה"];
const HINTS = [
  { e: "👤", l: "שם", ex: "דוד" },
  { e: "🔢", l: "מספר", ex: "1820" },
  { e: "📖", l: "פסוק", ex: "שמע ישראל" },
  { e: "🧩", l: "ביטוי", ex: "משיח בן דוד" },
  { e: "🌍", l: "באנגלית", ex: null }, // בקרוב
];

export default function NumberSearchPage() {
  const nav = useNavigate();
  const P = usePalette();
  const mode = useThemeMode();
  const [q, setQ] = useState("");
  const [adv, setAdv] = useState(false);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [recent, setRecent] = useState([]);
  const [hot, setHot] = useState(null);
  const inputRef = useRef(null);

  useEffect(() => { document.title = "מנוע המספרים · הגוגל של המספרים · סוד 1820"; }, []);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 200); return () => clearTimeout(t); }, []);
  useEffect(() => {
    let live = true;
    getRecentSearches(6).then(r => { if (live) setRecent(r); }).catch(() => {});
    getHotNumber().then(h => { if (live) setHot(h); }).catch(() => {});
    return () => { live = false; };
  }, []);

  const goVal = v => { const t = String(v).trim(); if (t) nav(`/number/${encodeURIComponent(t)}`); };
  const go = e => { e.preventDefault(); goVal(q); };
  const goAdv = e => { e.preventDefault(); const both = [a1.trim(), a2.trim()].filter(Boolean).join(" "); if (both) goVal(both); };
  const surprise = () => goVal(SURPRISE[Math.floor(Math.random() * SURPRISE.length)]);

  return (
    <div style={{ background: P.pageBg, minHeight: "92vh", position: "relative", zIndex: 1, direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px 70px" }}>
      <button onClick={toggleTheme} title="החלפת תמה" aria-label="החלפת תמה" style={{
        position: "absolute", top: 16, insetInlineStart: 16, cursor: "pointer", width: 38, height: 38, borderRadius: 999,
        border: `1px solid ${P.borderStrong}`, background: P.cardSoft, color: P.accentText, fontSize: 17 }}>
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      {/* לוגו + טאגליין (סיבה להקליד) */}
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ fontSize: "clamp(38px,8.5vw,68px)", fontWeight: 900, fontFamily: F.regal, color: P.heroNum,
          textShadow: `0 0 36px ${P.glow}`, lineHeight: 1 }}>🔢 מנוע המספרים</div>
        <div style={{ marginTop: 9, color: P.accentText, fontFamily: F.heading, fontSize: "clamp(14px,2.6vw,18px)", fontWeight: 800 }}>
          הגוגל של המספרים
        </div>
        <div style={{ marginTop: 6, color: P.inkSoft, fontFamily: F.body, fontSize: "clamp(13.5px,2.4vw,16px)", fontWeight: 500, maxWidth: 460 }}>
          🌳 הקלידו שם, מספר או פסוק — וגלו את עץ הקשרים הנסתר שלו.
        </div>
      </div>

      {/* תיבת חיפוש + גלו + הפתיעו אותי */}
      <form onSubmit={go} style={{ width: "min(620px, 94vw)", display: "flex", gap: 8 }}>
        <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} dir="rtl"
          placeholder="הקלידו מספר (1820) או שם (דוד)…"
          style={{ flex: 1, background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999,
            color: P.ink, fontFamily: F.body, fontSize: 17, fontWeight: 500, padding: "15px 24px", outline: "none", textAlign: "center",
            boxShadow: `0 4px 22px ${P.glow}` }} />
        <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none",
          borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 16, padding: "0 24px" }}>גלו ✦</button>
        <button type="button" onClick={surprise} title="הפתיעו אותי" aria-label="הפתיעו אותי" style={{
          cursor: "pointer", background: P.card, color: P.accentText, border: `1px solid ${P.borderStrong}`,
          borderRadius: 999, fontSize: 20, width: 52, flexShrink: 0 }}>🎲</button>
      </form>

      {/* צ'יפים מנחים — מה לחקור */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center", marginTop: 16, maxWidth: 580 }}>
        <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, alignSelf: "center" }}>מה תרצו לחקור?</span>
        {HINTS.map(h => (
          <button key={h.l} disabled={!h.ex} onClick={() => h.ex && (setQ(h.ex), inputRef.current?.focus())}
            title={h.ex ? `דוגמה: ${h.ex}` : "בקרוב"}
            style={{ cursor: h.ex ? "pointer" : "default", opacity: h.ex ? 1 : 0.5,
              background: P.card, border: `1px solid ${P.border}`, borderRadius: 999,
              color: P.accentText, fontFamily: F.body, fontSize: 14, fontWeight: 600, padding: "6px 13px" }}>
            {h.e} {h.l}{!h.ex ? " · בקרוב" : ""}
          </button>
        ))}
      </div>

      {/* חיפוש מתקדם (מוסתר) */}
      <button onClick={() => setAdv(v => !v)} style={{ marginTop: 14, cursor: "pointer", background: "none", border: "none",
        color: P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>
        🔍 חיפוש מתקדם {adv ? "▲" : "▼"}
      </button>
      {adv && (
        <form onSubmit={goAdv} style={{ width: "min(620px,94vw)", marginTop: 10, display: "flex", gap: 8, flexWrap: "wrap", justifyContent: "center" }}>
          <input value={a1} onChange={e => setA1(e.target.value)} placeholder="שם / מספר ראשון" dir="rtl"
            style={{ flex: "1 1 200px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, color: P.ink, fontFamily: F.body, fontSize: 15, padding: "11px 16px", outline: "none", textAlign: "center" }} />
          <span style={{ alignSelf: "center", color: P.accentText, fontWeight: 800, fontSize: 18 }}>+</span>
          <input value={a2} onChange={e => setA2(e.target.value)} placeholder="שם / מספר שני" dir="rtl"
            style={{ flex: "1 1 200px", background: P.card, border: `1px solid ${P.border}`, borderRadius: 12, color: P.ink, fontFamily: F.body, fontSize: 15, padding: "11px 16px", outline: "none", textAlign: "center" }} />
          <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 12, fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "0 20px" }}>חברו ✦</button>
          <div style={{ flexBasis: "100%", textAlign: "center", color: P.accentDim, fontFamily: F.body, fontSize: 12.5, marginTop: 2 }}>
            שני ביטויים מתחברים לערך אחד · חיפוש לפי שיטה ובאנגלית — בקרוב
          </div>
        </form>
      )}

      {/* 🔥 מספר חם עכשיו */}
      {hot && (
        <button onClick={() => goVal(hot.value || hot.term)} style={{ marginTop: 26, cursor: "pointer",
          background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "10px 18px",
          display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔥</span>
          <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>חם עכשיו</span>
          <span style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 19, fontWeight: 800 }}>{hot.term}</span>
          <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}>· {hot.n} חקרו היום</span>
        </button>
      )}

      {/* 🕒 חיפושים אחרונים — מה אנשים חוקרים עכשיו */}
      {recent.length > 0 && (
        <div style={{ marginTop: 18, width: "min(620px,94vw)", background: P.card, border: `1px solid ${P.border}`,
          borderRadius: 16, padding: "12px 16px" }}>
          <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 9 }}>🕒 נחקר לאחרונה באתר</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
            {recent.map((r, i) => (
              <button key={i} onClick={() => goVal(r.term)} style={{ cursor: "pointer", background: P.cardSoft,
                border: `1px solid ${P.border}`, borderRadius: 999, color: P.accentText, fontFamily: F.body,
                fontSize: 14, fontWeight: 600, padding: "6px 13px" }}>{r.term}</button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
