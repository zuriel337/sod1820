import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { getRecentSearches } from "../lib/supabase.js";
import { getQualityDiscoveries } from "../lib/engine.js";

// 🌳 בית המדרש — חי אבל מסונן: «נחקר ונמצא מעניין» (שער איכות) + «נחקר לאחרונה».
// עץ אחד: אותו search_log מאוחד, עדשה מסוננת באיכות. פלטה בהירה (תלמודית).
const L = { card: "#ffffff", soft: "#faf8f2", ink: "#23201a", sub: "#6f685a", gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc" };

export default function LiveDiscoveries() {
  const [recent, setRecent] = useState([]);
  const [disc, setDisc] = useState([]);
  useEffect(() => {
    let live = true;
    getRecentSearches(8).then(r => { if (live) setRecent(r); }).catch(() => {});
    getQualityDiscoveries(5).then(d => { if (live) setDisc(d); }).catch(() => {});
    return () => { live = false; };
  }, []);
  if (!recent.length && !disc.length) return null;

  return (
    <div style={{ display: "grid", gap: 14, marginBottom: 26, direction: "rtl" }}>
      {disc.length > 0 && (
        <div style={{ background: L.card, border: `1px solid ${L.line}`, borderRadius: 16, padding: "15px 18px", boxShadow: "0 2px 14px rgba(120,90,20,0.06)" }}>
          <div style={{ color: L.gold, fontFamily: F.heading, fontSize: 14, fontWeight: 800, marginBottom: 11 }}>✨ נחקר ונמצא מעניין</div>
          <div style={{ display: "grid", gap: 9 }}>
            {disc.map((d, i) => (
              <Link key={i} to={`/number/${encodeURIComponent(d.term)}`} style={{ textDecoration: "none", display: "flex", alignItems: "baseline", gap: 8, flexWrap: "wrap" }}>
                <span style={{ color: L.ink, fontFamily: F.regal, fontSize: 15.5, fontWeight: 700 }}>{d.term}</span>
                <span style={{ color: L.goldDeep, fontFamily: "'Courier New', monospace", fontSize: 14.5, fontWeight: 800 }}>= {d.value}</span>
                <span style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, fontWeight: 500 }}>· {d.reason}</span>
              </Link>
            ))}
          </div>
        </div>
      )}
      {recent.length > 0 && (
        <div style={{ background: L.soft, border: `1px solid ${L.line}`, borderRadius: 16, padding: "13px 18px" }}>
          <div style={{ color: L.sub, fontFamily: F.heading, fontSize: 13, fontWeight: 800, marginBottom: 9 }}>🕒 נחקר לאחרונה באתר</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 7 }}>
            {recent.map((r, i) => (
              <Link key={i} to={`/number/${encodeURIComponent(r.term)}`} style={{ textDecoration: "none", background: L.card, border: `1px solid ${L.line}`, borderRadius: 999, color: L.goldDeep, fontFamily: F.body, fontSize: 13.5, fontWeight: 600, padding: "5px 13px" }}>{r.term}</Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
