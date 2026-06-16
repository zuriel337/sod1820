import React, { useState, useMemo, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { supabase } from "../lib/supabase.js";
import { METHODS as M8, LETTER_COLS, onlyHeb, mistater, GEM } from "../lib/gematria.js";
import { useGold, sortGoldFirst } from "../lib/goldTier.js";

// ===== מחשבון גימטריה מלא — בהיר/תלמודי, 8 שיטות, מאומת מול bidim =====
// "התגלות": רגיל 844 · מילוי 1026 · מסתתר 1237 · קדמי 3137 · סידורי 70 · אתבש 392 · אלבם 241.

// פלטה בהירה (תלמודית)
const L = {
  panel: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a",
  gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc", active: "#fbf3da",
};

export default function GematriaCalculator({ seed, onResult }) {
  const [q, setQ] = useState(seed != null && seed !== "" ? String(seed) : "גאולה");
  useEffect(() => { if (seed != null && seed !== "") setQ(String(seed)); }, [seed]);
  const word = q.trim();
  const gold = useGold();
  const res = useMemo(() => M8.map(m => ({ key: m.key, sub: m.sub, value: m.fn(word) })), [word]);
  const ragilVal = res.find(r => r.key === "רגיל")?.value || 0;

  // דיווח חוצה (לקיר החי וכו') — מושהה, רק על מילה תקינה
  useEffect(() => {
    if (!onResult || !word || onlyHeb(word).length < 2 || !ragilVal) return;
    const t = setTimeout(() => onResult({ word, ragil: ragilVal }), 900);
    return () => clearTimeout(t);
  }, [word, ragilVal, onResult]);
  const [active, setActive] = useState("רגיל");
  const [equal, setEqual] = useState(null);
  const [counts, setCounts] = useState({});
  const [showLetters, setShowLetters] = useState(false);
  const activeVal = res.find(r => r.key === active)?.value || 0;
  const letters = onlyHeb(word);

  // ספירת "נמצאו" לכל שיטה (כמה ביטויים שווים לערך שלה)
  useEffect(() => {
    let live = true; setCounts({});
    if (!letters.length) return;
    Promise.all(res.map(r =>
      supabase.from("bidim").select("*", { count: "exact", head: true }).eq("method", r.key).eq("value", r.value)
        .then(({ count }) => [r.key, count || 0]).catch(() => [r.key, 0])
    )).then(pairs => { if (live) setCounts(Object.fromEntries(pairs)); });
    return () => { live = false; };
  }, [word]); // eslint-disable-line

  useEffect(() => {
    let live = true; setEqual(null);
    if (!letters.length || !activeVal) return;
    supabase.from("bidim").select("phrase").eq("method", active).eq("value", activeVal).neq("phrase", word).limit(400)
      .then(({ data }) => { if (live) setEqual([...new Set((data || []).map(r => r.phrase).filter(Boolean))]); });
    return () => { live = false; };
  }, [active, activeVal, word, letters.length]);

  const thS = { background: L.soft, color: L.goldDeep, fontFamily: F.heading, fontSize: 12, fontWeight: 700, padding: "8px 10px", textAlign: "center", whiteSpace: "nowrap", borderBottom: `2px solid ${L.line}` };
  const tdS = { color: L.ink, fontFamily: F.body, fontSize: 13.5, padding: "7px 10px", borderBottom: `1px solid ${L.line}` };
  const numCell = { ...tdS, fontFamily: F.mono, fontWeight: 700, textAlign: "center", color: L.goldDeep };

  return (
    <div style={{ textAlign: "right" }}>
      {/* קלט */}
      <div style={{ background: L.panel, border: `1px solid ${L.line}`, borderRadius: 16, padding: "18px 18px 20px", boxShadow: "0 1px 4px rgba(0,0,0,0.05)" }}>
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלידו מילה או ביטוי…" dir="rtl" style={{
          width: "100%", boxSizing: "border-box", background: L.soft, border: `1px solid ${L.gold}`, borderRadius: 10, color: L.ink,
          fontFamily: F.regal, fontSize: 24, fontWeight: 700, padding: "12px 16px", outline: "none", textAlign: "center",
        }} />

        {/* 8 השיטות */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(130px, 1fr))", gap: 9, marginTop: 14 }}>
          {res.map(r => {
            const on = r.key === active;
            return (
              <button key={r.key} onClick={() => setActive(r.key)} style={{
                cursor: "pointer", textAlign: "center", borderRadius: 12, padding: "11px 8px",
                border: `1px solid ${on ? L.gold : L.line}`, background: on ? L.active : L.soft, transition: "all .2s",
              }}>
                <div style={{ color: on ? L.goldDeep : L.sub, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>{r.key}</div>
                <div style={{ color: on ? L.goldDeep : L.ink, fontFamily: F.mono, fontSize: 26, fontWeight: 800, lineHeight: 1.1, margin: "2px 0" }}>{r.value}</div>
                <div style={{ color: L.sub, fontFamily: F.body, fontSize: 10.5, lineHeight: 1.4 }}>{r.sub}</div>
                <div style={{ color: on ? L.gold : L.sub, fontFamily: F.heading, fontSize: 10, fontWeight: 700, marginTop: 3 }}>
                  נמצאו {counts[r.key] ?? "…"}
                </div>
              </button>
            );
          })}
        </div>

        {/* כפתור "גלה הכל" — מוביל לדף הישות של הערך הנבחר */}
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to={`/number/${activeVal}`} style={{
            display: "inline-flex", alignItems: "center", gap: 8, textDecoration: "none",
            background: "linear-gradient(135deg, #e9c84a, #9a7818)", color: "#1a0e00",
            fontFamily: F.heading, fontSize: 15, fontWeight: 800, padding: "11px 26px", borderRadius: 999,
            boxShadow: "0 2px 10px rgba(154,120,24,0.35)",
          }}>✨ גלה הכל על {activeVal} ←</Link>
        </div>
      </div>

      {/* מילים שוות לשיטה הנבחרת */}
      <div style={{ marginTop: 16, background: L.panel, border: `1px solid ${L.line}`, borderRadius: 14, padding: "14px 16px" }}>
        <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
          <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 12, letterSpacing: 1 }}>מילים שוות ל־</span>
          <span style={{ color: L.goldDeep, fontFamily: F.mono, fontSize: 20, fontWeight: 800 }}>{activeVal}</span>
          <span style={{ color: L.sub, fontFamily: F.heading, fontSize: 12 }}>בשיטת {active}</span>
          <Link to={`/number/${activeVal}`} style={{ marginInlineStart: "auto", color: L.goldDeep, textDecoration: "none", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>דף המספר →</Link>
        </div>
        {equal === null ? (
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, padding: 6 }}>מחשב…</div>
        ) : equal.length === 0 ? (
          <div style={{ color: L.sub, fontFamily: F.body, fontSize: 13, padding: 6 }}>לא נמצאו ביטויים נוספים בערך זה במאגר המאומת.</div>
        ) : (
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap" }}>
            {sortGoldFirst(equal, p => gold.labels.has(p)).map((p, i) => {
              const isG = gold.labels.has(p);
              return (
              <Link key={i} to={`/number/${encodeURIComponent(p)}`} title={p} style={{
                textDecoration: "none", color: isG ? L.goldDeep : L.ink, fontFamily: F.body, fontSize: 13.5,
                background: isG ? L.active : L.soft, fontWeight: isG ? 700 : 400,
                border: `${isG ? 2 : 1}px solid ${isG ? L.gold : L.line}`, borderRadius: 999, padding: "5px 12px", maxWidth: 280, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                boxShadow: isG ? `0 0 10px ${L.gold}55` : "none",
              }}>{isG ? "👑 " : ""}{p}</Link>
            );})}
          </div>
        )}
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
          {/* מסתתר — הפרשים */}
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
