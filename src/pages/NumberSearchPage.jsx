import React, { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { F, calcGem } from "../theme.js";
import { applySeo } from "../lib/seo.js";
import { usePalette } from "../lib/palette.js";
import { getHotNumber, searchPhrases } from "../lib/supabase.js";
import SearchTabs from "../components/SearchTabs.jsx";
import NumberEngineLogo from "../components/NumberEngineLogo.jsx";
import RecentSearches from "../components/RecentSearches.jsx";

// ===== "הגוגל של המספרים" — דף נחיתה /number =====
// שורה אחת ממורכזת (רגע הגוגל) → הקלדת מספר/שם → /number/:value (3 העומקים).
// + חיפושים אחרונים חיים · מספר חם · הפתיעו אותי · חיפוש מתקדם · צ'יפים מנחים.

const SURPRISE = [1820, 1237, 358, 424, 86, 26, 541, 137, 314, 776, "משיח", "גאולה", "אהבה", "אמת", "תורה", "בינה"];

export default function NumberSearchPage() {
  const nav = useNavigate();
  const P = usePalette();
  const [q, setQ] = useState("");
  const [adv, setAdv] = useState(false);
  const [a1, setA1] = useState("");
  const [a2, setA2] = useState("");
  const [hot, setHot] = useState(null);
  const [suggestions, setSuggestions] = useState([]);
  const [showSug, setShowSug] = useState(false);
  const inputRef = useRef(null);
  const sugRef = useRef(null);

  useEffect(() => { applySeo({ title: "מנוע המספרים · הגוגל של המספרים", path: "/number" }); }, []);
  useEffect(() => { const t = setTimeout(() => inputRef.current?.focus(), 200); return () => clearTimeout(t); }, []);
  useEffect(() => {
    let live = true;
    getHotNumber().then(h => { if (live) setHot(h); }).catch(() => {});
    return () => { live = false; };
  }, []);

  // autocomplete עברי — debounce 300ms, prefix search ב-bidim
  useEffect(() => {
    if (!q.trim() || /^\d+$/.test(q) || q.length < 2) { setSuggestions([]); setShowSug(false); return; }
    const id = setTimeout(() => {
      searchPhrases(q.trim()).then(r => { setSuggestions(r); setShowSug(r.length > 0); }).catch(() => {});
    }, 300);
    return () => clearTimeout(id);
  }, [q]);

  // סגירת dropdown בלחיצה מחוץ לו
  useEffect(() => {
    const handler = e => { if (sugRef.current && !sugRef.current.contains(e.target) && !inputRef.current?.contains(e.target)) setShowSug(false); };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

  const goVal = v => { const t = String(v).trim(); if (t) { setShowSug(false); setSuggestions([]); nav(`/number/${encodeURIComponent(t)}`); } };
  const goSug = s => { setShowSug(false); setSuggestions([]); if (s.type === 'post') nav(`/${s.slug}`); else goVal(s.phrase); };
  const isHebInput = /[א-ת]/.test(q);
  const previewVal = isHebInput && q.trim() ? calcGem(q.trim()) : null;
  const go = e => { e.preventDefault(); goVal(q); };
  const goAdv = e => { e.preventDefault(); const both = [a1.trim(), a2.trim()].filter(Boolean).join(" "); if (both) goVal(both); };
  const surprise = () => goVal(SURPRISE[Math.floor(Math.random() * SURPRISE.length)]);

  return (
    <div style={{ background: P.pageBg, minHeight: "92vh", position: "relative", zIndex: 1, direction: "rtl",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "40px 18px 70px" }}>
      <SearchTabs />

      {/* לוגו מונפש בסגנון גוגל בעברית + תת-כותרת */}
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <NumberEngineLogo size={60} to={null} />
        <div style={{ marginTop: 14, color: P.inkSoft, fontFamily: F.body, fontSize: "clamp(14px,2.6vw,17px)", fontWeight: 500, maxWidth: 500 }}>
          גלו קשרים נסתרים בין מספרים, שמות, פסוקים ורמזים
        </div>
      </div>

      {/* תיבה אחת — המנוע מזהה לבד + autocomplete */}
      <div style={{ position: "relative", width: "min(620px, 94vw)" }}>
        <form onSubmit={go} style={{ display: "flex", gap: 8 }}>
          <input ref={inputRef} value={q} onChange={e => setQ(e.target.value)} dir="rtl"
            placeholder="הקלידו מספר, שם, פסוק או רמז…"
            onFocus={() => suggestions.length > 0 && setShowSug(true)}
            style={{ flex: 1, background: P.card, border: `1px solid ${P.borderStrong}`, borderRadius: 999,
              color: P.ink, fontFamily: F.body, fontSize: 17, fontWeight: 500, padding: "15px 24px", outline: "none", textAlign: "center",
              boxShadow: `0 4px 22px ${P.glow}` }} />
          <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none",
            borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 16, padding: "0 24px" }}>גלו ✦</button>
        </form>
        {showSug && suggestions.length > 0 && (
          <div ref={sugRef} style={{
            position: "absolute", top: "calc(100% + 6px)", right: 0, left: 0, zIndex: 100,
            background: P.mode === "dark" ? "rgb(20,15,12)" : "#fff",
            border: `1px solid ${P.borderStrong}`, borderRadius: 16,
            boxShadow: `0 8px 32px rgba(0,0,0,.55)`, overflow: "hidden", direction: "rtl",
          }}>
            {suggestions.map((s, i) => (
              <button key={i} onMouseDown={() => goSug(s)}
                style={{ width: "100%", cursor: "pointer",
                  background: P.mode === "dark" ? "rgb(20,15,12)" : "#fff",
                  border: "none",
                  borderBottom: i < suggestions.length - 1 ? `1px solid ${P.border}` : "none",
                  display: "flex", alignItems: "center", justifyContent: "space-between",
                  padding: "11px 20px", textAlign: "right" }}>
                <span style={{ color: P.ink, fontFamily: F.body, fontSize: 15, fontWeight: 600 }}>
                  {s.type === "post" ? "📖 " : ""}{s.phrase}
                </span>
                {s.type === "phrase"
                  ? <span style={{ color: P.accentText, fontFamily: F.mono, fontSize: 13, fontWeight: 800,
                      background: P.mode === "dark" ? "rgba(212,175,55,0.15)" : "#faf6ec", borderRadius: 999, padding: "2px 10px" }}>= {s.value}</span>
                  : <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700,
                      background: P.mode === "dark" ? "rgba(212,175,55,0.1)" : "#faf6ec", borderRadius: 999, padding: "2px 10px" }}>פוסט →</span>
                }
              </button>
            ))}
          </div>
        )}
      </div>

      {previewVal > 0 && (
        <div style={{ marginTop: 8, color: P.heroNum, fontFamily: F.mono, fontSize: 24, fontWeight: 800,
          textAlign: "center", textShadow: `0 0 18px ${P.glow}`, letterSpacing: 1 }}>
          = {previewVal}
        </div>
      )}

      {/* נסו · המנוע מזהה לבד · גלו לי משהו */}
      <div style={{ marginTop: 16, color: P.accentDim, fontFamily: F.body, fontSize: 14.5, fontWeight: 500, textAlign: "center" }}>
        נסו:{" "}
        {["1820", "דוד", "שמע ישראל", "1237"].map((ex, i) => (
          <React.Fragment key={ex}>
            {i > 0 && <span style={{ opacity: 0.4 }}> · </span>}
            <button onClick={() => goVal(ex)} style={{ cursor: "pointer", background: "none", border: "none", color: P.accentText, fontFamily: F.body, fontSize: 14.5, fontWeight: 700, padding: 0 }}>{ex}</button>
          </React.Fragment>
        ))}
      </div>
      <div style={{ marginTop: 9, color: P.accentDim, fontFamily: F.body, fontSize: 12.5, fontWeight: 600 }}>המנוע מזהה לבד ✦</div>
      <button onClick={surprise} style={{ marginTop: 16, cursor: "pointer", background: P.card, border: `1px solid ${P.borderStrong}`,
        borderRadius: 999, color: P.accentText, fontFamily: F.heading, fontSize: 14.5, fontWeight: 700, padding: "9px 22px" }}>🎲 גלו לי משהו</button>

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

      {/* 🔎 המספר הנחקר ביותר היום (מותר: על מה חיפשו) */}
      {hot && (
        <button onClick={() => goVal(hot.value || hot.term)} style={{ marginTop: 26, cursor: "pointer",
          background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 14, padding: "10px 18px",
          display: "inline-flex", alignItems: "center", gap: 10 }}>
          <span style={{ fontSize: 18 }}>🔎</span>
          <span style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>הנחקר ביותר היום</span>
          <span style={{ color: P.heroNum, fontFamily: F.mono, fontSize: 19, fontWeight: 800 }}>{hot.term}</span>
          <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12.5 }}>· {hot.n} חקרו היום</span>
        </button>
      )}

      {/* 🕒 חיפושים אחרונים — מקור מאוחד, 6 אחרונים, "כל החיפושים" → טאב "מה נחקר" */}
      <div style={{ marginTop: 18, width: "min(620px,94vw)" }}>
        <RecentSearches max={6} light={P.mode === "light"} seeAllTo="/beit-midrash?tab=searches" />
      </div>

      <div style={{ marginTop: 34, color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }}>
        ✦ הגוגל של המספרים
      </div>
    </div>
  );
}
