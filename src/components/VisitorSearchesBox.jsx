import React, { useState, useEffect, useCallback } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { getWallRecent } from "../lib/supabase.js";

// 🔎 תיבת "מה גולשים חיפשו" — מציגה מתוך קיר הגימטריה (gematria_wall) את
// השמות/המילים/הביטויים שאנשים בדקו במחשבון. רשימה נפרדת מהמאגר המאומת.
// מובהר לגולש שאלו חיפושים של אנשים. נייטיב לכל מקום שיש בו חיפוש.
export default function VisitorSearchesBox({ light = false, limit = 24, onPick, refreshKey }) {
  const [rows, setRows] = useState(null);

  const load = useCallback(() => {
    getWallRecent(limit).then(setRows).catch(() => setRows([]));
  }, [limit]);
  useEffect(() => { load(); }, [load, refreshKey]);

  const P = light
    ? { panel: "#ffffff", ink: "#23201a", sub: "#6f685a", gold: "#7a5e12", line: "#e7dfcc", chip: "#faf8f2", badge: "#fbf3da" }
    : { panel: "rgba(20,15,12,0.5)", ink: C.goldLight, sub: C.muted, gold: C.goldBright, line: C.border, chip: "rgba(8,5,2,0.5)", badge: "rgba(212,175,55,0.14)" };

  if (rows && rows.length === 0) return null;

  const chipInner = (r) => (
    <>
      <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14, fontWeight: 600 }}>{r.phrase}</span>
      <span style={{ background: P.badge, color: P.gold, fontFamily: F.mono, fontSize: 12, fontWeight: 800, borderRadius: 999, padding: "2px 9px", minWidth: 26, textAlign: "center" }}>{r.ragil}</span>
    </>
  );
  const chipStyle = { display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
    background: P.chip, border: `1px solid ${P.line}`, borderRadius: 999, padding: "5px 6px 5px 12px", textDecoration: "none" };

  return (
    <div style={{ background: P.panel, border: `1px solid ${P.line}`, borderRadius: 16, padding: "14px 16px" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span style={{ color: P.gold, fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>🔎 מה גולשים חיפשו</span>
        <span style={{ color: P.sub, fontFamily: F.body, fontSize: 12.5 }}>שמות, מילים וביטויים שאנשים בדקו במחשבון — לחצו לחקור</span>
      </div>
      {rows === null ? (
        <div style={{ color: P.sub, fontFamily: F.body, fontSize: 13, padding: 4 }}>טוען…</div>
      ) : (
        <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {rows.map((r) => onPick ? (
            <button key={r.phrase} onClick={() => onPick(r.phrase)} title={`${r.phrase} = ${r.ragil}`} style={chipStyle}>{chipInner(r)}</button>
          ) : (
            <Link key={r.phrase} to={`/number/${encodeURIComponent(r.phrase)}`} title={`${r.phrase} = ${r.ragil}`} style={chipStyle}>{chipInner(r)}</Link>
          ))}
        </div>
      )}
    </div>
  );
}
