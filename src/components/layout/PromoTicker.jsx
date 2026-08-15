import React, { useEffect, useMemo, useState } from "react";
import ComingSoonModal from "../ComingSoonModal.jsx";

// 🎗️ טיזרים מתחלפים — סרגל יחיד גלובלי, כל שקופית בצבעים לפי התוכן שלה.
//   ⛔ לא ניתן לסגור (בקשת צוריאל 15.8.2026) — תמיד מזמין ללחוץ.
//   לחיצה על הסרגל פותחת את «מה עומד לבוא» (ComingSoonModal) עם הטקסט המלא + הרשמה אחת.
//   הטיזרים: 🌅 ציר ההתגלות (הזמן מקבל צורה) · 🧬 מסע השורשים · 🔠 הצופן. + 🌍 English לדוברי-אנגלית.
const ROTATE_MS = 5200;

function isEnglishOrUS() {
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];
    const en = langs.some(l => /^en(\b|-|_|$)/i.test(String(l)));
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
    return en || /^America\//.test(tz);
  } catch { return false; }
}

// כל טיזר עם פלטת-צבע לפי המהות שלו (שחר-זהב · חיים-ירוק · צופן-סגול · גלובלי-כחול).
const TEASERS = [
  { key: "axis", icon: "🌅", title: "ציר ההתגלות", tag: "הזמן מקבל צורה", dir: "rtl",
    bg: "linear-gradient(90deg,#2a1405,#7a3d0e 42%,#e8862a 66%,#7a3d0e)", accent: "#ffd27a" },
  { key: "roots", icon: "🧬", title: "מסע השורשים", tag: "הסיפור שלך מתחיל הרבה לפניך", dir: "rtl",
    bg: "linear-gradient(90deg,#03211a,#064e3b 42%,#0d9488 66%,#064e3b)", accent: "#86efac" },
  { key: "cipher", icon: "🔠", logo: "/els-logo.png", title: "הצופן התנ״כי — הדור הבא", tag: "חיפוש עמוק יותר · מרחב רחב יותר · מחקר בעזרת AI", dir: "rtl",
    bg: "linear-gradient(90deg,#170a2b,#4c1d95 45%,#7c3aed 66%,#4c1d95)", accent: "#c4b5fd" },
];
const EN_TEASER = { key: "en", icon: "🌍", title: "SOD 1820 in English", tag: "Coming soon — the full experience", dir: "ltr",
  bg: "linear-gradient(90deg,#07234f,#1e40af 45%,#3b82f6 66%,#1e40af)", accent: "#93c5fd" };

export default function PromoTicker() {
  const [en, setEn] = useState(false);
  const promos = useMemo(() => (en ? [...TEASERS, EN_TEASER] : TEASERS), [en]);
  const start = useMemo(() => Math.floor(Math.random() * TEASERS.length), []);
  const [idx, setIdx] = useState(start);
  const [fade, setFade] = useState(true);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    let f = false;
    try { f = /[?&]enbar=1\b/.test(window.location.search); } catch { /* ignore */ }
    setEn(f || isEnglishOrUS());
  }, []);

  useEffect(() => {
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % promos.length); setFade(true); }, 260);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [promos.length]);

  const p = promos[idx % promos.length];
  const isEn = p.dir === "ltr";

  return (
    <>
      <button onClick={() => setOpen(true)} dir={p.dir} aria-label={isEn ? "Preview what's coming" : "הצצה למה שעומד לבוא"}
        className="promo-teaser"
        style={{
          width: "100%", border: "none", cursor: "pointer", position: "relative",
          minHeight: 54, display: "flex", alignItems: "center", justifyContent: "center",
          gap: 12, padding: "8px 20px", overflow: "hidden",
          background: p.bg, borderBottom: `2px solid ${p.accent}`, boxShadow: "0 2px 14px rgba(0,0,0,.35)",
          transition: "background .55s ease, border-color .55s ease",
        }}>
        <style>{`
          @keyframes pt-sheen{0%{transform:translateX(120%)}100%{transform:translateX(-220%)}}
          @keyframes pt-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.07)}}
          @keyframes pt-nudge{0%,100%{transform:translateX(0)}50%{transform:translateX(-4px)}}
          @media (max-width:600px){
            .promo-teaser{padding:7px 14px !important;min-height:48px !important;gap:8px !important;}
            .promo-teaser .pt-title{font-size:15px !important;}
            .promo-teaser .pt-tag{font-size:12px !important;}
            .promo-teaser .pt-cue{display:none !important;}
            .promo-teaser .pt-ico{font-size:19px !important;}
          }
        `}</style>
        {/* ברק נע */}
        <span aria-hidden style={{ position: "absolute", top: 0, bottom: 0, width: "26%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)", animation: "pt-sheen 5s ease-in-out infinite", pointerEvents: "none" }} />

        {/* תג «בקרוב» */}
        <span style={{ flex: "0 0 auto", background: p.accent, color: "#1a1030", fontFamily: "sans-serif", fontWeight: 900, fontSize: 11.5, letterSpacing: 1, padding: "3px 10px", borderRadius: 999, animation: "pt-pulse 2.4s ease-in-out infinite" }}>
          {isEn ? "SOON" : "בקרוב"}
        </span>

        {/* תוכן הטיזר המתחלף */}
        <span style={{ display: "inline-flex", alignItems: "center", gap: 10, minWidth: 0, opacity: fade ? 1 : 0, transition: "opacity .26s ease", textAlign: "center", justifyContent: "center", flexWrap: "wrap" }}>
          {p.logo
            ? <img className="pt-ico" src={p.logo} alt="" aria-hidden style={{ width: 26, height: 26, borderRadius: 7, objectFit: "cover", flex: "0 0 auto", filter: `drop-shadow(0 0 10px ${p.accent}88)` }} />
            : <span className="pt-ico" aria-hidden style={{ fontSize: 22, filter: `drop-shadow(0 0 10px ${p.accent}88)` }}>{p.icon}</span>}
          <b className="pt-title" style={{ color: "#fff", fontFamily: "'Frank Ruhl Libre',serif", fontWeight: 900, fontSize: 17.5 }}>{p.title}</b>
          <span aria-hidden style={{ color: p.accent, opacity: .8 }}>—</span>
          <span className="pt-tag" style={{ color: p.accent, fontFamily: "sans-serif", fontWeight: 700, fontSize: 14.5 }}>{p.tag}</span>
        </span>

        {/* קריאה-ללחיצה */}
        <span className="pt-cue" style={{ flex: "0 0 auto", display: "inline-flex", alignItems: "center", gap: 6, color: "#fff", fontFamily: "sans-serif", fontWeight: 800, fontSize: 13, opacity: .95 }}>
          <span style={{ animation: "pt-nudge 1.6s ease-in-out infinite" }}>{isEn ? "Peek →" : "← הצצה"}</span>
        </span>

        {/* נקודות-מצב */}
        <span aria-hidden style={{ position: "absolute", insetInlineStart: 12, bottom: 5, display: "inline-flex", gap: 4 }}>
          {promos.map((_, i) => (
            <span key={i} style={{ width: i === (idx % promos.length) ? 15 : 6, height: 4, borderRadius: 999, background: i === (idx % promos.length) ? p.accent : "rgba(255,255,255,.35)", transition: "all .25s" }} />
          ))}
        </span>
      </button>

      <ComingSoonModal open={open} onClose={() => setOpen(false)} />
    </>
  );
}
