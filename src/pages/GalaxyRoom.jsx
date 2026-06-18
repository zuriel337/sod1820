import React, { useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { applySeo } from "../lib/seo.js";

// ===== חדר הגלקסיות (/galaxy) — מסך מלא, בבנייה =====
// השער "גלקסיות" בהיכל מוביל לכאן. כאן ייבנה חדר הגלקסיות המקצועי
// (מעבר בין עולמות, ימינה/שמאלה). בינתיים — מסך "בבנייה".
export default function GalaxyRoom() {
  const nav = useNavigate();
  useEffect(() => {
    applySeo({ title: "חדר הגלקסיות — סוד 1820", description: "חדר הגלקסיות של סוד 1820 — מעבר בין עולמות.", path: "/galaxy" });
  }, []);
  return (
    <div style={{
      position: "fixed", inset: 0, zIndex: 50, background: "#05040d",
      backgroundImage: "url(/cosmos-bg.svg)", backgroundSize: "cover", backgroundPosition: "center center",
      direction: "rtl", display: "flex", alignItems: "center", justifyContent: "center",
      flexDirection: "column", gap: 16, textAlign: "center", padding: 24,
    }}>
      <div style={{ fontSize: 52 }}>🌌</div>
      <div style={{ color: "#f6e27a", fontFamily: "'Cinzel','Heebo',sans-serif", fontSize: "clamp(24px,5vw,42px)", fontWeight: 800, textShadow: "0 0 30px #000" }}>
        חדר הגלקסיות
      </div>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, color: "#e8dcc0", fontFamily: "'Heebo',sans-serif", fontSize: 17, fontWeight: 700 }}>
        🚧 החדר בבנייה
      </div>
      <div style={{ color: "#cfc9d6", fontFamily: "'Heebo',sans-serif", fontSize: 14.5, maxWidth: 460, lineHeight: 1.75 }}>
        כאן ייפתח חדר הגלקסיות — מעבר בין עולמות, ימינה ושמאלה, כל גלקסיה בהיכל משלה. בקרוב.
      </div>
      <button onClick={() => nav("/היכל")} style={{
        marginTop: 10, cursor: "pointer", background: "rgba(8,5,2,.72)", color: "#f6e27a",
        border: "1px solid rgba(212,175,55,.42)", borderRadius: 999, padding: "10px 24px",
        fontFamily: "'Heebo',sans-serif", fontWeight: 700, fontSize: 14, backdropFilter: "blur(4px)",
      }}>← חזרה להיכל השערים</button>
    </div>
  );
}
