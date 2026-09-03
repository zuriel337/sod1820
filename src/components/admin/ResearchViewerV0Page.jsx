import React, { useState } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import KnowledgeControlCenterTab from "./KnowledgeControlCenterTab.jsx";
import ResearchViewerLegacyV0Page from "./ResearchViewerLegacyV0Page.jsx";

const tabStyle = active => ({ cursor: "pointer", border: `1px solid ${active ? "#175cd3" : "#d0d5dd"}`, background: active ? "#edf4ff" : "#fff", color: active ? "#175cd3" : "#344054", borderRadius: 999, padding: "9px 14px", fontWeight: 900, fontSize: 13 });
const gatePage = { minHeight: "100vh", direction: "rtl", background: "#f4f6f8", color: "#172033", padding: "72px 18px", fontFamily: "Arial, sans-serif", textAlign: "center" };
const loginButton = { display: "inline-flex", alignItems: "center", justifyContent: "center", marginTop: 18, padding: "11px 20px", borderRadius: 999, background: "#175cd3", color: "#fff", textDecoration: "none", fontWeight: 900, boxShadow: "0 8px 24px rgba(23,92,211,.18)" };

export default function ResearchViewerV0Page() {
  const { loading, isAdmin } = useAuth();
  const [mode, setMode] = useState("control");
  if (loading) return <main style={gatePage}>טוען הרשאות…</main>;
  if (!isAdmin) return <main style={gatePage}>
    <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #d0d5dd", borderRadius: 20, padding: "30px 26px", boxShadow: "0 18px 55px rgba(16,24,40,.08)" }}>
      <div style={{ fontSize: 34, marginBottom: 8 }}>⚖️</div>
      <h2 style={{ margin: 0, fontSize: 25 }}>שולחן צוריאל</h2>
      <p style={{ color: "#667085", lineHeight: 1.8, margin: "10px 0 0" }}>המסך פנימי ומוגן. היכנס עם חשבון האדמין הרגיל של SOD1820, ואז חזור אוטומטית למסך הזה.</p>
      <Link to="/login?return=/research-viewer" style={loginButton}>🔑 כניסה לשולחן</Link>
      <div style={{ color: "#98a2b3", fontSize: 12, marginTop: 12 }}>לא נפתחים נתוני אדמין ב־Preview ללא התחברות.</div>
    </div>
  </main>;
  if (mode === "viewer") return <div style={{ minHeight: "100vh", background: "#f4f6f8" }}><div style={{ direction: "rtl", maxWidth: 1440, margin: "0 auto", padding: "14px clamp(14px,3vw,38px) 0", display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => setMode("control")} style={tabStyle(false)}>⚖️ שולחן צוריאל</button><button onClick={() => setMode("viewer")} style={tabStyle(true)}>🔬 Research Viewer</button></div><ResearchViewerLegacyV0Page /></div>;
  return <main style={{ minHeight: "100vh", direction: "rtl", background: "#0c0818", color: "#fff", padding: "18px clamp(12px,3vw,38px) 48px" }}><div style={{ maxWidth: 1440, margin: "0 auto" }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}><button onClick={() => setMode("control")} style={tabStyle(true)}>⚖️ שולחן צוריאל</button><button onClick={() => setMode("viewer")} style={tabStyle(false)}>🔬 Research Viewer</button></div><KnowledgeControlCenterTab /></div></main>;
}
