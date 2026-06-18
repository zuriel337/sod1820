import React, { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useThemeMode, toggleTheme } from "../lib/themeMode.js";
import { resolve, buildMessages } from "../lib/engine.js";
import { shareNumberSmart } from "../lib/numberCard.js";
import SearchTabs from "../components/SearchTabs.jsx";

// ===== 🔥 השער הויראלי — /name "מה השם שלך מסתיר?" =====
// שיתוף-קודם, רגשי, פשוט. מוביל לאותו עץ (/number/:value) — מנוע אחד, שני שערים.

export default function NamePage() {
  const P = usePalette();
  const mode = useThemeMode();
  const [name, setName] = useState("");
  const [revealed, setRevealed] = useState(null);
  const [busy, setBusy] = useState(false);
  const inputRef = useRef(null);

  const reveal = e => { e.preventDefault(); const n = name.trim(); if (n) setRevealed(n); };
  const { value } = revealed ? resolve(revealed) : { value: 0 };
  const msgs = revealed ? buildMessages({ term: revealed, value, isNumber: false, phrases: [] }) : [];
  const share = async () => { if (busy) return; setBusy(true); try { await shareNumberSmart(value, []); } finally { setBusy(false); } };

  return (
    <div style={{ background: P.pageBg, minHeight: "92vh", direction: "rtl", position: "relative", zIndex: 1,
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px 70px" }}>
      <button onClick={toggleTheme} title="החלפת תמה" aria-label="החלפת תמה" style={{
        position: "absolute", top: 16, insetInlineStart: 16, cursor: "pointer", width: 38, height: 38, borderRadius: 999,
        border: `1px solid ${P.borderStrong}`, background: P.cardSoft, color: P.accentText, fontSize: 17 }}>
        {mode === "light" ? "🌙" : "☀️"}
      </button>

      <SearchTabs />

      {!revealed ? (
        <div style={{ textAlign: "center" }}>
          <div style={{ fontSize: "clamp(30px,7vw,54px)", fontWeight: 900, fontFamily: F.regal, color: P.heroNum,
            textShadow: `0 0 36px ${P.glow}`, lineHeight: 1.1 }}>✨ מה השם שלך מסתיר?</div>
          <div style={{ marginTop: 12, color: P.inkSoft, fontFamily: F.body, fontSize: "clamp(15px,2.6vw,18px)", fontWeight: 500, maxWidth: 470, marginInline: "auto" }}>
            הקלידו את שמכם — וגלו את הסוד הגימטרי שמאחוריו.
          </div>
          <form onSubmit={reveal} style={{ marginTop: 26, display: "flex", gap: 8, width: "min(520px,92vw)", marginInline: "auto" }}>
            <input ref={inputRef} autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="השם שלך…" dir="rtl"
              style={{ flex: 1, background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink,
                fontFamily: F.body, fontSize: 18, fontWeight: 600, padding: "16px 24px", outline: "none", textAlign: "center", boxShadow: `0 4px 22px ${P.glow}` }} />
            <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none",
              borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 16, padding: "0 24px" }}>גלו ✨</button>
          </form>
          <div style={{ marginTop: 14, color: P.accentDim, fontFamily: F.body, fontSize: 13.5, fontWeight: 600 }}>נסו: דוד · שרה · משה · רחל</div>
        </div>
      ) : (
        <div style={{ textAlign: "center", maxWidth: 560 }}>
          <style>{`@keyframes name-rise{from{opacity:0;transform:translateY(14px)}to{opacity:1;transform:none}}`}</style>
          <div style={{ animation: "name-rise .6s ease both" }}>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14, fontWeight: 800, letterSpacing: 2 }}>השם שלך מסתיר</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, marginTop: 6 }}>{revealed}</div>
            <div style={{ color: P.heroNum, fontFamily: F.mono, fontSize: "clamp(54px,12vw,98px)", fontWeight: 800, lineHeight: 1, textShadow: `0 0 44px ${P.glow}` }}>{value}</div>
          </div>
          {msgs[0] && <p style={{ animation: "name-rise .8s ease both", color: P.ink, fontFamily: F.body, fontSize: "clamp(16px,2.6vw,20px)", fontWeight: 600, lineHeight: 1.65, margin: "14px auto 0" }}>{msgs[0].text}</p>}
          {msgs[1] && msgs[1].layer !== "F" && <p style={{ color: P.accentText, fontFamily: F.body, fontSize: 14.5, fontWeight: 600, margin: "6px auto 0" }}>✦ {msgs[1].text}</p>}
          <div style={{ marginTop: 24, display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
            <button onClick={share} disabled={busy} style={{ cursor: busy ? "wait" : "pointer", background: "#25D366", color: "#06310f",
              border: "none", borderRadius: 999, fontFamily: F.heading, fontSize: 16, fontWeight: 800, padding: "14px 30px" }}>
              {busy ? "מכין…" : "📲 שתפו את השם שלכם"}
            </button>
            <Link to={`/number/${encodeURIComponent(revealed)}`} style={{ textDecoration: "none", display: "inline-flex", alignItems: "center",
              background: P.card, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999,
              fontFamily: F.heading, fontSize: 15, fontWeight: 700, padding: "14px 22px" }}>🌳 גלו את כל עולמו →</Link>
          </div>
          <button onClick={() => { setRevealed(null); setName(""); setTimeout(() => inputRef.current?.focus(), 60); }}
            style={{ marginTop: 18, cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700 }}>↺ נסו שם אחר</button>
        </div>
      )}
    </div>
  );
}
