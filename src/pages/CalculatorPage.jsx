import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import GematriaCalculator from "../components/GematriaCalculator.jsx";
import { addWallWord, getWallRecent, getWallPopular, getWallCount } from "../lib/supabase.js";
import { applySeo } from "../lib/seo.js";

// ===== מחשבון הגימטריה (ניסוי ויראלי) — דף לבן עצמאי =====
// כל מילה/שם שמחשבים נרשם ל"קיר החי" (gematria_wall) ומופיע לכולם.
// תמיד מציג רגיל + 7 שיטות נוספות. נפרד מהמחשבון הקהילתי.

const L = {
  bg: "#f7f4ec", panel: "#ffffff", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", soft: "#faf8f2", active: "#fbf3da",
};

function Wall({ onPick }) {
  const [tab, setTab] = useState("hot"); // hot | new
  const [rows, setRows] = useState(null);
  const [count, setCount] = useState(0);

  const load = useCallback(() => {
    const fn = tab === "hot" ? getWallPopular : getWallRecent;
    fn(80).then(setRows).catch(() => setRows([]));
  }, [tab]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { getWallCount().then(setCount).catch(() => {}); }, []);

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
          קיר הגימטריה החי
        </h2>
        <span style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5 }}>
          {count.toLocaleString("he-IL")} מילים ושמות חושבו עד כה — הוסיפו את שלכם ☝️
        </span>
        <div style={{ display: "flex", gap: 8, marginInlineStart: "auto" }}>
          {tabBtn("hot", "🔥 הכי מחושבים")}
          {tabBtn("new", "🆕 אחרונים")}
        </div>
      </div>

      {rows === null ? (
        <div style={{ color: L.sub, fontFamily: F.body, padding: 8 }}>טוען…</div>
      ) : rows.length === 0 ? (
        <div style={{ color: L.sub, fontFamily: F.body, padding: 8 }}>הקיר עוד ריק — היו הראשונים!</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 9 }}>
          {rows.map((r) => (
            <button key={r.phrase} onClick={() => onPick(r.phrase)} title={`${r.phrase} = ${r.ragil}`} style={{
              cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 8,
              background: L.panel, border: `1px solid ${L.line}`, borderRadius: 999,
              padding: "6px 6px 6px 14px", boxShadow: "0 1px 3px rgba(0,0,0,0.04)",
            }}>
              <span style={{ color: L.ink, fontFamily: F.body, fontSize: 14.5, fontWeight: 600 }}>{r.phrase}</span>
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
  const [wallKey, setWallKey] = useState(0); // לרענון הקיר אחרי הוספה

  useEffect(() => {
    applySeo({
      title: "מחשבון גימטריה — חשבו כל מילה ושם · SOD1820",
      fullTitle: "מחשבון גימטריה חינם — חשבו כל מילה, שם או ביטוי · SOD1820",
      description: "מחשבון הגימטריה של סוד 1820 — חשבו כל מילה, שם או ביטוי ב-8 שיטות (רגיל, מילוי, מסתתר, קדמי ועוד), גלו מה שווה לו ובנו את קיר הגימטריה החי.",
      path: "/gematria",
    });
  }, []);

  const onResult = useCallback(({ word, ragil }) => {
    addWallWord(word, ragil).then(() => setWallKey((k) => k + 1));
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
