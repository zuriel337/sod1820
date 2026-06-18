import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase, addWallWord, logSearch } from "../lib/supabase.js";
import { METHODS, DEPTH_METHODS, LETTER_COLS, onlyHeb, mistater, GEM } from "../lib/gematria.js";

// ===== מחשבון גימטריה מלא — בהיר/תלמודי, כל 17 השיטות, מאומת מול המנוע =====
// לחיצה על שיטה → דף המספר שלה (עם חזרה למחשבון). מובייל: מלבנים קומפקטיים.
const ALL = [...METHODS, ...DEPTH_METHODS];

const L = {
  panel: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", active: "#fbf3da",
};

export default function GematriaCalculator({ seed, onResult }) {
  const [q, setQ] = useState(seed != null && seed !== "" ? String(seed) : "גאולה");
  useEffect(() => { if (seed != null && seed !== "") setQ(String(seed)); }, [seed]);
  const word = q.trim();
  const res = useMemo(() => ALL.map(m => ({ key: m.key, sub: m.sub || m.soul, value: m.fn(word) })), [word]);
  const ragilVal = res.find(r => r.key === "רגיל")?.value || 0;
  const [counts, setCounts] = useState({});
  const [showLetters, setShowLetters] = useState(false);
  const letters = onlyHeb(word);

  // כמה ביטויים יש במערכת לכל שיטה (לפי הערך שלה) — מהמאגר המאומת
  useEffect(() => {
    let live = true; setCounts({});
    if (!letters.length) return;
    Promise.all(res.map(r =>
      supabase.from("bidim").select("*", { count: "exact", head: true }).eq("method", r.key).eq("value", r.value)
        .then(({ count }) => [r.key, count || 0]).catch(() => [r.key, 0])
    )).then(pairs => { if (live) setCounts(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [word]); // eslint-disable-line

  // שמירה לקיר + רישום חיפושים (עץ אחד)
  useEffect(() => {
    if (!word || onlyHeb(word).length < 2 || !ragilVal) return;
    const t = setTimeout(async () => {
      await addWallWord(word, ragilVal);
      logSearch(word, ragilVal);
      if (onResult) onResult({ word, ragil: ragilVal });
    }, 900);
    return () => clearTimeout(t);
  }, [word, ragilVal, onResult]);

  const thS = { background: L.soft, color: L.goldDeep, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", borderBottom: `2px solid ${L.line}` };
  const tdS = { color: L.ink, fontFamily: F.body, fontSize: 13.5, padding: "7px 10px", borderBottom: `1px solid ${L.line}` };
  const numCell = { ...tdS, fontFamily: F.mono, fontWeight: 700, textAlign: "center", color: L.goldDeep };

  return (
    <div style={{ textAlign: "right" }}>
      {/* קלט */}
      <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "16px 16px 18px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה או ביטוי…" dir="rtl" style={{
          width: "100%", boxSizing: "border-box", background: L.soft, border: `1px solid ${L.gold}`, borderRadius: 10, color: L.ink,
          fontFamily: F.regal, fontSize: 23, fontWeight: 700, padding: "11px 16px", outline: "none", textAlign: "center",
        }} />

        {/* כל 17 השיטות — מלבנים קומפקטיים, לחיצה → דף המספר */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(94px, 1fr))", gap: 7, marginTop: 13 }}>
          {res.map(r => (
            <Link key={r.key} to={`/number/${r.value}?from=calc&focus=dna`} title={`${r.key} = ${r.value} · פתח את ${r.value} (צירי ההתכנסות)`} style={{
              textDecoration: "none", textAlign: "center", borderRadius: 10, padding: "8px 6px",
              border: `1px solid ${L.line}`, background: L.soft, transition: "border-color .15s, background .15s",
            }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = L.gold; e.currentTarget.style.background = L.active; }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = L.line; e.currentTarget.style.background = L.soft; }}>
              <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 11, fontWeight: 700, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{r.key}</div>
              <div style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 19, fontWeight: 800, lineHeight: 1.15 }}>{r.value}</div>
              <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, marginTop: 2 }}>נמצאו {counts[r.key] ?? "…"}</div>
            </Link>
          ))}
        </div>

        <div style={{ textAlign: "center", marginTop: 15 }}>
          <Link to={`/number/${ragilVal}?from=calc`} style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "11px 26px", borderRadius: 999,
            boxShadow: "0 2px 10px rgba(154,120,24,0.35)",
          }}>✨ גלה הכל על {ragilVal} ←</Link>
        </div>
        <div style={{ textAlign: "center", marginTop: 7, color: L.sub, fontFamily: F.body, fontSize: 12 }}>לחצו על שיטה כדי לפתוח את דף המספר שלה</div>
      </div>

      {/* פירוט אות-אות */}
      {letters.length > 0 && (
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setShowLetters(s => !s)} style={{
            cursor: "pointer", background: "none", border: "none", color: L.goldDeep, fontFamily: F.heading, fontSize: 13, fontWeight: 700,
          }}>{showLetters ? "▴ הסתר" : "▾ פירוט החישוב אות-אות"}</button>
          {showLetters && (
            <div style={{ overflowX: "auto", border: `1px solid ${L.line}`, borderRadius: 12, marginTop: 8, background: L.panel }}>
              <table style={{ width: "100%", borderCollapse: "collapse", direction: "rtl" }}>
                <thead>
                  <tr>
                    <th style={thS}>אות</th>
                    {LETTER_COLS.map(m => <th key={m.key} style={thS}>{m.key}</th>)}
                  </tr>
                </thead>
                <tbody>
                  {letters.map((ch, i) => (
                    <tr key={i}>
                      <td style={{ ...tdS, fontFamily: F.regal, fontWeight: 700, color: L.goldDeep, fontSize: 17, textAlign: "center" }}>{ch}</td>
                      {LETTER_COLS.map(m => <td key={m.key} style={numCell}>{m.map[ch] ?? "—"}</td>)}
                    </tr>
                  ))}
                  <tr>
                    <td style={{ ...tdS, color: L.sub, fontFamily: F.heading, fontSize: 12, textAlign: "center" }}>סה״כ</td>
                    {LETTER_COLS.map(m => <td key={m.key} style={{ ...numCell, borderTop: `2px solid ${L.line}` }}>{m.fn(word)}</td>)}
                  </tr>
                </tbody>
              </table>
            </div>
          )}
          {letters.length > 1 && (
            <div style={{ marginTop: 10, color: L.ink, fontFamily: F.mono, fontSize: 13.5, lineHeight: 1.9, background: L.soft, border: `1px solid ${L.line}`, borderRadius: 12, padding: "9px 14px" }}>
              <b style={{ color: L.sub, fontFamily: F.heading }}>מסתתר: </b>
              {letters.slice(0, -1).map((ch, i) => `|${ch}−${letters[i + 1]}|=${Math.abs(GEM[ch] - GEM[letters[i + 1]])}`).join("  ·  ")}
              {"  =  "}<b style={{ color: L.goldDeep }}>{mistater(word)}</b>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
