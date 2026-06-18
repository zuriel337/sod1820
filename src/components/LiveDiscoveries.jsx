import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { getQualityDiscoveries } from "../lib/engine.js";
import RecentSearches from "./RecentSearches.jsx";

// 🌳 בית המדרש — חי אבל מסונן: «נחקר ונמצא מעניין» (שער איכות) + «נחקר לאחרונה» (מקור מאוחד, דרגות).
const L = { card: "#ffffff", sub: "#6f685a", gold: "#9a7818", goldDeep: "#7a5e12", line: "#e7dfcc" };

export default function LiveDiscoveries() {
  const [disc, setDisc] = useState([]);
  useEffect(() => {
    let live = true;
    getQualityDiscoveries(5).then(d => { if (live) setDisc(d); }).catch(() => {});
    return () => { live = false; };
  }, []);

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
      {/* חיפושים אחרונים — מקור אחד, דרגות לפי משתמש (אנונימי 3 · רשום 3 ימים · מנוי 30 · אדמין הכל) */}
      <RecentSearches light seeAllTo="/beit-midrash" />
    </div>
  );
}
