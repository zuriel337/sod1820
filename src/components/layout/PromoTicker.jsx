import React, { useEffect, useMemo, useState } from "react";

// 🎗️ טיקר יחיד — סרגל אחד גלובלי שמתחלף כל כמה שניות בין כמה פרומואים «בקרוב».
//   ⛔ אין עוד סרגלים נערמים: זה מחליף את סרגל-האנגלית, את YearTicker (תשפ״ו),
//      את CelestialPinnedBar ואת CipherElulBanner — הכל בתוך בר-אחד מתחלף.
//   הפרומואים (מתחלפים כל 7ש׳, התחלה אקראית):
//   1) 🌅 ציר ההתגלות — תאריכים נגללים ימין→שמאל, מבריאת העולם עד שנת 6000.
//   2) ✦ ציר התגלות אישי — «בקרוב».
//   3) 🔠 חיפוש בתורה בדילוגי אותיות (ELS) — «בקרוב» + שעון-חול לספירה-לאחור של שבועיים.
//   + למבקרים דוברי-אנגלית/ארה״ב בלבד: 🌍 SOD 1820 in English — coming soon.
const DISMISS_KEY = "promo_ticker_dismissed_v1";
const ROTATE_MS = 7000;

// יעד ספירת-לאחור ל-ELS — כשבועיים קדימה (יעד קבוע כדי שהשעון לא יתאפס בכל טעינה).
const ELS_TARGET = new Date("2026-08-29T20:00:00+03:00").getTime();

// שנות-ציון על ציר הבריאה (0 → 6000). ~5786 = «היום» (השנה העברית הנוכחית בקירוב).
const AXIS_YEARS = [0, 1000, 2000, 3000, 4000, 5000, 5786, 6000];
const yearLabel = (y) => (y === 0 ? "בריאת העולם" : y === 5786 ? "היום · ה׳תשפ״ו" : y === 6000 ? "שנת ו׳ אלפים" : `שנת ${y.toLocaleString("he")}`);

// 🌍 זיהוי מבקר דובר-אנגלית/ארה״ב (כמו EnglishSoonBar) — כדי שהשקופית באנגלית תופיע בסבב רק להם.
function isEnglishOrUS() {
  try {
    const langs = (navigator.languages && navigator.languages.length) ? navigator.languages : [navigator.language || ""];
    const en = langs.some(l => /^en(\b|-|_|$)/i.test(String(l)));
    const tz = (Intl.DateTimeFormat().resolvedOptions().timeZone) || "";
    return en || /^America\//.test(tz);
  } catch { return false; }
}

function Countdown({ target }) {
  const [now, setNow] = useState(Date.now());
  useEffect(() => { const t = setInterval(() => setNow(Date.now()), 1000); return () => clearInterval(t); }, []);
  const ms = Math.max(0, target - now);
  if (ms <= 0) return <b style={{ color: "#ffe9a8" }}>ממש בקרוב</b>;
  const d = Math.floor(ms / 86400000), h = Math.floor((ms % 86400000) / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  const box = { background: "rgba(0,0,0,.28)", borderRadius: 7, padding: "2px 7px", fontFamily: "monospace", fontWeight: 800, color: "#ffe9a8", minWidth: 26, textAlign: "center", display: "inline-block" };
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 5, direction: "ltr" }} aria-label={`עוד ${d} ימים`}>
      <span aria-hidden style={{ fontSize: 16 }}>⏳</span>
      <span style={box}>{d}<small style={{ opacity: .7, fontWeight: 600 }}>י</small></span>
      <span style={box}>{String(h).padStart(2, "0")}</span>
      <span style={{ opacity: .6 }}>:</span>
      <span style={box}>{String(m).padStart(2, "0")}</span>
      <span style={{ opacity: .6 }}>:</span>
      <span style={box}>{String(s).padStart(2, "0")}</span>
    </span>
  );
}

// 🌅 רצועת-שנים נגללת ימין→שמאל (מבריאת העולם עד 6000)
function AxisYearsMarquee() {
  const strip = [...AXIS_YEARS, ...AXIS_YEARS];   // כפול לגלילה חלקה
  return (
    <span className="pt-marq" style={{ position: "relative", overflow: "hidden", maxWidth: "min(52vw, 420px)", maskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)", WebkitMaskImage: "linear-gradient(90deg,transparent,#000 12%,#000 88%,transparent)" }}>
      <span style={{ display: "inline-flex", gap: 14, whiteSpace: "nowrap", animation: "promo-marq 18s linear infinite", willChange: "transform" }}>
        {strip.map((y, i) => (
          <span key={i} style={{ display: "inline-flex", alignItems: "center", gap: 6, color: y === 5786 ? "#ffe9a8" : "#e9d9b0", fontWeight: y === 5786 ? 900 : 700, fontSize: 12.5 }}>
            <span style={{ opacity: .55 }}>◆</span>{yearLabel(y)}
          </span>
        ))}
      </span>
    </span>
  );
}

// ✨ צ׳יפ «AI» — תג-מוצר קטן עם ניצוץ וזוהר (החידוש של צוריאל: הכל מונע-AI).
function AiSpark({ label = "AI" }) {
  return (
    <span className="pt-ai" style={{ display: "inline-flex", alignItems: "center", gap: 4, flex: "0 0 auto", padding: "2px 9px", borderRadius: 999, fontSize: 11.5, fontWeight: 900, letterSpacing: .5, color: "#0b0620", background: "linear-gradient(90deg,#ffe9a8,#8fd0ff 55%,#c7a6ff)", backgroundSize: "200% 100%", animation: "promo-ai 3.5s linear infinite", boxShadow: "0 0 10px rgba(150,200,255,.45)" }}>
      <span aria-hidden style={{ fontSize: 12 }}>✨</span>{label}
    </span>
  );
}

// 🧬 סליל-DNA זעיר (SVG) — שני גדילים מצטלבים + «חוליות» שמהבהבות בזו-אחר-זו (תחושת נתונים זורמים).
function DnaMini() {
  const rungs = [3.5, 7.5, 11.5, 15.5, 19.5, 22.5];
  return (
    <span className="pt-dna" aria-hidden style={{ display: "inline-flex", flex: "0 0 auto", verticalAlign: "middle" }}>
      <svg width="20" height="26" viewBox="0 0 20 26" fill="none">
        <path d="M3 1 C 15 5, 5 8, 17 13 C 5 18, 15 21, 3 25" stroke="#ffe9a8" strokeWidth="1.4" strokeLinecap="round" opacity=".9" />
        <path d="M17 1 C 5 5, 15 8, 3 13 C 15 18, 5 21, 17 25" stroke="#8fd0ff" strokeWidth="1.4" strokeLinecap="round" opacity=".85" />
        {rungs.map((y, i) => (
          <line key={i} x1="4" y1={y} x2="16" y2={y} stroke="#c7a6ff" strokeWidth="1.1" strokeLinecap="round"
            style={{ animation: `promo-dna 1.6s ease-in-out ${i * 0.18}s infinite` }} />
        ))}
      </svg>
    </span>
  );
}

// 🔢 «אודומטר» מספרים זזים — ערכי-מפתח מתחלפים כמו מונה (תחושת מנוע-מספרים חי).
const ODO_NUMS = [1820, 26, 86, 541, 358, 137, 613, 72];
function MovingNumbers() {
  const strip = [...ODO_NUMS, ODO_NUMS[0]];
  return (
    <span className="pt-nums" aria-hidden style={{ display: "inline-block", flex: "0 0 auto", height: 22, width: 54, overflow: "hidden", verticalAlign: "middle", borderRadius: 6, background: "rgba(0,0,0,.3)", boxShadow: "inset 0 0 0 1px rgba(255,255,255,.12)", maskImage: "linear-gradient(180deg,transparent,#000 28%,#000 72%,transparent)", WebkitMaskImage: "linear-gradient(180deg,transparent,#000 28%,#000 72%,transparent)" }}>
      <span style={{ display: "block", animation: "promo-nums 7.2s steps(8) infinite", willChange: "transform" }}>
        {strip.map((n, i) => (
          <span key={i} style={{ display: "flex", height: 22, alignItems: "center", justifyContent: "center", fontFamily: "monospace", fontWeight: 800, fontSize: 13.5, color: "#ffe9a8" }}>{n}</span>
        ))}
      </span>
    </span>
  );
}

// כל השקופיות — עברית תמיד, אנגלית רק לדוברי-אנגלית. מוגדרות כפונקציה כדי לבנות לפי המבקר.
function buildPromos(en) {
  const promos = [
    {
      key: "axis", icon: "🌅", title: "ציר ההתגלות", dir: "rtl",
      body: (<><span style={{ color: "#fff", fontWeight: 800 }}>מבריאת העולם עד שנת 6000</span> — כל התאריכים על ציר אחד <AxisYearsMarquee /></>),
    },
    {
      key: "family", icon: "🧬", title: "קוד המשפחה", dir: "rtl",
      body: (<span style={{ display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap", justifyContent: "center" }}>
        <DnaMini />
        <span style={{ color: "#fff", fontWeight: 800 }}>ניתוח כל המשפחה — שמות, תאריכים ומספרים — מונע AI</span>
        <MovingNumbers />
        <AiSpark label="מונע AI" />
      </span>),
    },
    {
      key: "els", icon: "🔠", title: "הצופן התנכי בדילוגי אותיות", dir: "rtl",
      body: (<span style={{ display: "inline-flex", alignItems: "center", gap: 9, flexWrap: "wrap", justifyContent: "center" }}>
        <span style={{ color: "#fff", fontWeight: 800 }}>לחפש את הקוד בתנ״ך — עם ניתוח</span>
        <AiSpark label="AI" />
        <Countdown target={ELS_TARGET} />
      </span>),
    },
  ];
  // 🌍 שקופית-אנגלית בסבב — רק למבקר דובר-אנגלית/ארה״ב (או תצוגה-מקדימה ?enbar=1)
  if (en) promos.push({
    key: "en", icon: "🌍", title: "SOD 1820 in English", dir: "ltr", noSoon: true,
    body: (<span style={{ color: "#fff", fontWeight: 800 }}>Coming soon — the full site in English. <b style={{ color: "#ffe9a8" }}>Stay tuned!</b></span>),
  });
  return promos;
}

export default function PromoTicker() {
  const [show, setShow] = useState(false);
  const [en, setEn] = useState(false);
  const PROMOS = useMemo(() => buildPromos(en), [en]);
  const start = useMemo(() => Math.floor(Math.random() * 3), []);   // «מתחלף כל פעם» — התחלה אקראית (3 פרומואי-ליבה)
  const [idx, setIdx] = useState(start);
  const [fade, setFade] = useState(true);

  useEffect(() => {
    let dismissed = false;
    try { dismissed = localStorage.getItem(DISMISS_KEY) === "1"; } catch { /* ignore */ }
    setShow(!dismissed);
    let force = false;
    try { force = /[?&]enbar=1\b/.test(window.location.search); } catch { /* ignore */ }
    setEn(force || isEnglishOrUS());
  }, []);

  useEffect(() => {
    if (!show) return;
    const t = setInterval(() => {
      setFade(false);
      setTimeout(() => { setIdx(i => (i + 1) % PROMOS.length); setFade(true); }, 260);
    }, ROTATE_MS);
    return () => clearInterval(t);
  }, [show, PROMOS.length]);

  if (!show) return null;
  const p = PROMOS[idx % PROMOS.length];
  const dismiss = (e) => { e.preventDefault(); e.stopPropagation(); try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ } setShow(false); };

  return (
    <div className="promo-ticker" dir={p.dir} role="region" aria-label="בקרוב באתר"
      style={{
        position: "relative", minHeight: 52, display: "flex", alignItems: "center", justifyContent: "center",
        gap: 12, padding: "8px 48px", overflow: "hidden", maxWidth: "100%", boxSizing: "border-box",
        background: "linear-gradient(90deg,#140a2c,#3a1f66 42%,#6d4bb0 66%,#3a1f66)",
        borderBottom: "2px solid #e8c84a", boxShadow: "0 2px 14px rgba(0,0,0,.35)",
      }}>
      <style>{`
        @keyframes promo-shine{0%{transform:translateX(120%)}100%{transform:translateX(-220%)}}
        @keyframes promo-pulse{0%,100%{transform:scale(1)}50%{transform:scale(1.06)}}
        @keyframes promo-marq{0%{transform:translateX(0)}100%{transform:translateX(50%)}}
        @keyframes promo-ai{0%{background-position:0% 0}100%{background-position:200% 0}}
        @keyframes promo-dna{0%,100%{opacity:.25}50%{opacity:1}}
        @keyframes promo-nums{0%{transform:translateY(0)}100%{transform:translateY(-176px)}}
        /* 📱 מובייל — למנוע «אותיות שבורחות»: פחות ריפוד, פונט קטן יותר, רוחב-מקסימום, וגלישה-לשורה. */
        @media (max-width:600px){
          .promo-ticker{padding:7px 32px !important;min-height:46px !important;gap:7px !important;}
          .promo-ticker .pt-body{font-size:12.5px !important;gap:6px !important;max-width:100% !important;}
          .promo-ticker .pt-title{font-size:13.5px !important;}
          .promo-ticker .pt-icon{font-size:15px !important;}
          .promo-ticker .pt-marq{max-width:62vw !important;}
          .promo-ticker .pt-sep{display:none !important;}
        }
      `}</style>
      {/* ברק נע — תחושת טיקר חי */}
      <span aria-hidden style={{ position: "absolute", top: 0, bottom: 0, width: "26%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,.16),transparent)", animation: "promo-shine 5s ease-in-out infinite", pointerEvents: "none" }} />

      {/* תג «בקרוב» — אנגלית מציגה NEW */}
      <span style={{ flex: "0 0 auto", background: "#e8c84a", color: "#241247", fontFamily: "sans-serif", fontWeight: 900, fontSize: 12, letterSpacing: 1, padding: "3px 11px", borderRadius: 999, animation: "promo-pulse 2.2s ease-in-out infinite" }}>
        {p.noSoon ? (p.key === "en" ? "NEW" : "✦") : "בקרוב"}
      </span>

      {/* התוכן המתחלף */}
      <div className="pt-body" style={{ display: "inline-flex", alignItems: "center", gap: 10, flexWrap: "wrap", justifyContent: "center", textAlign: "center", maxWidth: "100%", minWidth: 0, opacity: fade ? 1 : 0, transition: "opacity .26s ease", color: "#f0e6cf", fontFamily: "sans-serif", fontSize: 15.5, lineHeight: 1.3 }}>
        <span className="pt-icon" aria-hidden style={{ fontSize: 20 }}>{p.icon}</span>
        <b className="pt-title" style={{ color: "#ffe9a8", fontWeight: 900, fontSize: 16.5 }}>{p.title}</b>
        <span className="pt-sep" style={{ opacity: .55 }}>·</span>
        <span style={{ maxWidth: "100%", minWidth: 0 }}>{p.body}</span>
      </div>

      {/* נקודות-מצב */}
      <span aria-hidden style={{ position: "absolute", insetInlineStart: 12, bottom: 5, display: "inline-flex", gap: 4 }}>
        {PROMOS.map((_, i) => (
          <span key={i} style={{ width: i === (idx % PROMOS.length) ? 14 : 6, height: 4, borderRadius: 999, background: i === (idx % PROMOS.length) ? "#e8c84a" : "rgba(255,255,255,.3)", transition: "all .25s" }} />
        ))}
      </span>

      <button onClick={dismiss} aria-label="סגירה"
        style={{ position: "absolute", insetInlineEnd: 10, top: "50%", transform: "translateY(-50%)", background: "rgba(255,255,255,.16)", border: "none", color: "#fff", cursor: "pointer", width: 26, height: 26, borderRadius: "50%", fontSize: 15, lineHeight: 1, display: "grid", placeItems: "center" }}>×</button>
    </div>
  );
}
