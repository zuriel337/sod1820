import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";

// 🚀 "כאן מתחילים" — אונבורדינג קצר למתחילים בדף הבית. נסגר ונשמר (localStorage).
const SURPRISE = [1820, 1237, 358, 86, 26, 541, "משיח", "גאולה", "אהבה", "אמת", "תורה", "בינה"];

export default function StartHereCard() {
  const P = usePalette();
  const nav = useNavigate();
  const [q, setQ] = useState("");
  const [hidden, setHidden] = useState(() => { try { return !!localStorage.getItem("sod-start-seen"); } catch { return false; } });
  if (hidden) return null;

  const close = () => { try { localStorage.setItem("sod-start-seen", "1"); } catch { /* ignore */ } setHidden(true); };
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };
  const surprise = () => nav(`/number/${encodeURIComponent(SURPRISE[Math.floor(Math.random() * SURPRISE.length)])}`);

  const stepNum = { width: 24, height: 24, borderRadius: "50%", background: P.accentBtn, color: P.onAccent, fontFamily: F.heading, fontSize: 13, fontWeight: 800, display: "inline-flex", alignItems: "center", justifyContent: "center", flexShrink: 0 };

  return (
    <section className="hn-wrap" style={{ padding: "0 18px 34px" }}>
      <div style={{ position: "relative", background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "18px 20px 20px", boxShadow: `0 6px 26px ${P.glow}` }}>
        <button onClick={close} aria-label="סגור" style={{ position: "absolute", insetInlineStart: 12, top: 12, cursor: "pointer", background: "none", border: "none", color: P.accentDim, fontSize: 16, fontWeight: 700 }}>✕</button>

        <div style={{ color: P.heroNum, fontFamily: F.regal, fontSize: "clamp(19px,3.4vw,25px)", fontWeight: 900, marginBottom: 3 }}>🚀 חדשים כאן? ככה מתחילים</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, fontWeight: 500, marginBottom: 16 }}>כל מספר מסתיר עולם — ו-1820 הוא הסוד. שלושה צעדים:</div>

        <div style={{ display: "grid", gap: 13 }}>
          {/* צעד 1 — קלט */}
          <div style={{ display: "flex", alignItems: "center", gap: 11, flexWrap: "wrap" }}>
            <span style={stepNum}>1</span>
            <span style={{ color: P.ink, fontFamily: F.heading, fontSize: 15, fontWeight: 800, flexShrink: 0 }}>🔢 בדקו מספר או שם</span>
            <form onSubmit={go} style={{ display: "flex", gap: 7, flex: "1 1 220px", minWidth: 180 }}>
              <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מספר / שם / פסוק…" dir="rtl"
                style={{ flex: 1, minWidth: 0, background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink, fontFamily: F.body, fontSize: 14.5, fontWeight: 600, padding: "9px 16px", outline: "none", textAlign: "center" }} />
              <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "0 18px", flexShrink: 0 }}>גלו ✦</button>
            </form>
          </div>

          {/* צעד 2 + 3 */}
          <div style={{ display: "flex", gap: 11, flexWrap: "wrap" }}>
            <Link to="/beit-midrash" onClick={close} style={{ flex: "1 1 200px", display: "flex", alignItems: "center", gap: 11, textDecoration: "none", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 14px" }}>
              <span style={stepNum}>2</span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>📚 למדו את הסוד — בית המדרש →</span>
            </Link>
            <button onClick={surprise} style={{ flex: "1 1 160px", display: "flex", alignItems: "center", gap: 11, cursor: "pointer", background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 12, padding: "11px 14px", textAlign: "right" }}>
              <span style={stepNum}>3</span>
              <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 800 }}>🎲 או הפתיעו אותי</span>
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
