import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import { getWallRecent, getWallPopular, getWallCount } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";
import { maskGibberish } from "../lib/nameMask.js";

// ===== מחשבון הגימטריה (ניסוי ויראלי) — דף לבן עצמאי =====
// כל מילה/שם שמחשבים נרשם ל"קיר החי" (gematria_wall) ומופיע לכולם.
// תמיד מציג רגיל + 7 שיטות נוספות. נפרד מהמחשבון הקהילתי.

const L = {
  bg: "#f7f4ec", panel: "#ffffff", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", soft: "#faf8f2", active: "#fbf3da",
};

function timeAgo(iso) {
  if (!iso) return "";
  const s = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (s < 45) return "ממש עכשיו";
  const m = Math.floor(s / 60);
  if (m < 1) return "לפני פחות מדקה";
  if (m < 60) return `נוסף לפני ${m} ${m === 1 ? "דקה" : "דקות"}`;
  const h = Math.floor(m / 60);
  if (h < 24) return `נוסף לפני ${h} ${h === 1 ? "שעה" : "שעות"}`;
  const d = Math.floor(h / 24);
  return `נוסף לפני ${d} ${d === 1 ? "יום" : "ימים"}`;
}

function ShareBox({ word, ragil }) {
  const [copied, setCopied] = useState(false);
  const [imgOk, setImgOk] = useState(true);
  useEffect(() => { setImgOk(true); }, [word, ragil]);
  if (!word || !ragil) return null;

  const origin = typeof window !== "undefined" ? window.location.origin : "https://sod1820.co.il";
  const url = `${origin}/gematria?w=${encodeURIComponent(word)}&n=${ragil}`;
  const cardSrc = `/api/card?w=${encodeURIComponent(word)}&n=${ragil}`;
  const text = `"${word}" = ${ragil} בגימטריה 🔯  מה המספר אומר עליכם? בדקו גם את השם שלכם 👇`;

  const doShare = async () => {
    if (navigator.share) {
      try { await navigator.share({ title: "סוד 1820 — מחשבון גימטריה", text, url }); return; } catch { /* בוטל */ }
    }
    try { await navigator.clipboard.writeText(`${text}\n${url}`); setCopied(true); setTimeout(() => setCopied(false), 2200); } catch { /* */ }
  };
  const waHref = `https://wa.me/?text=${encodeURIComponent(`${text} ${url}`)}`;

  const btn = (bg, color, border) => ({
    cursor: "pointer", textDecoration: "none", border: border || "none", background: bg, color,
    fontFamily: F.heading, fontSize: 14.5, fontWeight: 800, padding: "11px 20px", borderRadius: 999,
    display: "inline-flex", alignItems: "center", gap: 8,
  });

  return (
    <div style={{
      marginTop: 18, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16,
      padding: 16, boxShadow: "0 1px 4px rgba(0,0,0,0.05)", textAlign: "center",
    }}>
      <div style={{ color: L.goldDeep, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 4 }}>
        📲 שתפו את התוצאה — ואתגרו חברים
      </div>
      <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, marginBottom: 12 }}>
        "{word}" = <b style={{ color: L.goldDeep }}>{ragil}</b> · "בדקו גם את השם שלכם"
      </div>

      {/* תצוגה מקדימה של התמונה שתישלח */}
      {imgOk && (
        <img
          src={cardSrc}
          alt={`${word} = ${ragil}`}
          onError={() => setImgOk(false)}
          style={{ width: "100%", maxWidth: 460, aspectRatio: "1200/630", borderRadius: 12, border: `1px solid ${L.line}`, marginBottom: 14, display: "block", marginInline: "auto" }}
        />
      )}

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "center" }}>
        <button onClick={doShare} style={btn("linear-gradient(135deg,#e9c84a,#9a7818)", "#1a0e00")}>
          {copied ? "✓ הקישור הועתק!" : "שתפו את התוצאה"}
        </button>
        <a href={waHref} target="_blank" rel="noopener noreferrer" style={btn("#25D366", "#04210f")}>
          וואטסאפ
        </a>
        <Link to={`/number/${ragil}`} style={btn(L.soft, L.goldDeep, `1px solid ${L.line}`)}>
          ✨ גלה הכל על {ragil}
        </Link>
      </div>
    </div>
  );
}

function Wall({ onPick }) {
  const [tab, setTab] = useState("new"); // new | hot
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    const fn = tab === "hot" ? getWallPopular : getWallRecent;
    fn(80).then(setRows).catch(() => setRows([]));
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getWallCount().then(setCount).catch(() => {}); }, []);

  // רענון חי — כל 12 שניות נמשכים מילים חדשות שגולשים אחרים הוסיפו
  // (מושהה כשהלשונית מוסתרת, כדי לא לבזבז). גם מרענן את "לפני X דקות".
  useEffect(() => {
    const tick = () => {
      if (typeof document !== "undefined" && document.hidden) return;
      load();
      getWallCount().then(setCount).catch(() => {});
    };
    const id = setInterval(tick, 12000);
    return () => clearInterval(id);
  }, [load]);

  const tabBtn = (key, label) => (
    <button onClick={() => setTab(key)} style={{
      cursor: "pointer", border: `1px solid ${tab === key ? L.gold : L.line}`,
      background: tab === key ? L.active : L.soft, color: tab === key ? L.goldDeep : L.sub,
      fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "8px 18px", borderRadius: 999,
    }}>{label}</button>
  );

  return (
    <div style={{ marginTop: 34 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
        <h2 style={{ margin: 0, color: L.ink, fontFamily: F.regal, fontSize: 24, fontWeight: 800 }}>
          🔎 מה גולשים חיפשו
        </h2>
        <span style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5 }}>
          {count.toLocaleString("he-IL")} שמות, מילים וביטויים שאנשים בדקו — רשימה נפרדת, הוסיפו את שלכם ☝️
        </span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          {tabBtn("hot", "🔝 הכי מחושבים")}
          {tabBtn("new", "🆕 אחרונים")}
        </div>
      </div>

      {rows === null ? (
        <div style={{ color: L.sub, fontFamily: F.body, padding: 8 }}>טוען…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: L.sub, fontFamily: F.body, padding: 8 }}>הקיר עוד ריק — היו הראשונים!</div>
      ) : tab === "new" ? (
        // אחרונים — רשימה חיה עם "נוסף לפני X דקות"
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {rows.map((r, i) => (
            <button key={r.phrase} onClick={() => onPick(r.phrase)} title={`${maskGibberish(r.phrase)} = ${r.ragil}`} style={{
              cursor: "pointer", display: "flex", alignItems: "center", gap: 12, width: "100%", textAlign: "right",
              background: L.panel, border: `1px solid ${L.line}`, borderRadius: 12, padding: "10px 14px",
            }}>
              <span style={{
                background: L.active, color: L.goldDeep, fontFamily: F.mono, fontSize: 14, fontWeight: 800,
                borderRadius: 999, padding: "4px 12px", minWidth: 34, textAlign: "center",
              }}>{r.ragil}</span>
              <span style={{ color: L.ink, fontFamily: F.body, fontSize: 15.5, fontWeight: 600, flex: 1 }}>{maskGibberish(r.phrase)}</span>
              <span style={{ color: i === 0 ? "#1a8f3c" : L.sub, fontFamily: F.body, fontSize: 12, whiteSpace: "nowrap" }}>
                {i === 0 ? "🟢 " : ""}{timeAgo(r.last_at)}
              </span>
            </button>
          ))}
        </div>
      ) : (
        // הכי מחושבים — ענן שבבים
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {rows.map((r) => (
            <button key={r.phrase} onClick={() => onPick(r.phrase)} title={`${maskGibberish(r.phrase)} = ${r.ragil} · חושב ${r.hits} פעמים`} style={{
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              background: L.panel, border: `1px solid ${L.line}`, borderRadius: 999,
              padding: "6px 6px 6px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14.5, fontWeight: 600 }}>{maskGibberish(r.phrase)}</span>
              <span style={{
                background: L.active, color: L.goldDeep, fontFamily: F.mono, fontSize: 13, fontWeight: 800,
                borderRadius: 999, padding: "3px 10px", minWidth: 28, textAlign: "center",
              }}>{r.ragil}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export default function CalculatorPage() {
  const [seed, setSeed] = useState("");
  const [current, setCurrent] = useState(null); // {word, ragil} לשיתוף
  const [wallKey, setWallKey] = useState(0); // לרענון הקיר אחרי הוספה

  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה — חשבו כל מילה ושם · SOD1820",
      fullTitle: "מחשבון גימטריה חינם — חשבו כל מילה, שם או ביטוי · SOD1820",
      description: "מחשבון הגימטריה של סוד 1820 — חשבו כל מילה, שם או ביטוי ב-8 שיטות (רגיל, מילוי, מסתתר, קדמי ועוד), גלו מה שווה לו ובנו את קיר הגימטריה החי.",
      path: "/gematria",
    });
  }, []);

  // השמירה לקיר נעשית בתוך GematriaCalculator עצמו (בכל האתר). כאן רק
  // מעדכנים את בלוק השיתוף ומרעננים את הקיר כדי שהמילה תופיע מיד.
  const onResult = useCallback(({ word, ragil }) => {
    setCurrent({ word, ragil });
    setWallKey((k) => k + 1);
  }, []);

  const onPick = useCallback((phrase) => {
    setSeed(phrase);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }, []);

  return (
    <div style={{ background: L.bg, minHeight: "100vh", padding: "0 0 60px" }}>
      <div style={{ maxWidth: 760, margin: "0 auto", padding: "30px 18px 0", textAlign: "center" }}>
        <h1 style={{ margin: "0 0 6px", color: L.ink, fontFamily: F.regal, fontSize: 34, fontWeight: 800, lineHeight: 1.15 }}>
          מחשבון הגימטריה
        </h1>
        <p style={{ margin: "0 auto 22px", color: L.sub, fontFamily: F.body, fontSize: 15.5, maxWidth: 540, lineHeight: 1.7 }}>
          הקלידו כל מילה, שם או ביטוי — וקבלו את ערך הגימטריה <b style={{ color: L.goldDeep }}>הרגיל</b> ועוד 7 שיטות,
          את כל המילים השוות לו, וקישור לכל מה שמתכנס למספר הזה.
        </p>

        <GematriaCalculator seed={seed} onResult={onResult} />

        {current && <ShareBox word={current.word} ragil={current.ragil} />}

        <div key={wallKey}>
          <Wall onPick={onPick} />
        </div>

        <p style={{ marginTop: 40, color: L.sub, fontFamily: F.body, fontSize: 12.5 }}>
          רוצים לצלול עמוק יותר? <Link to="/beit-midrash" style={{ color: L.goldDeep, fontWeight: 700 }}>בית המדרש →</Link>
        </p>
      </div>
    </div>
  );
}
