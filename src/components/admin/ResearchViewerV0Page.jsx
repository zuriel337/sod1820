import React, { useState } from "react";
import { useAuth } from "../../lib/AuthContext.jsx";
import KnowledgeControlCenterTab from "./KnowledgeControlCenterTab.jsx";
import ResearchViewerLegacyV0Page from "./ResearchViewerLegacyV0Page.jsx";

const tabStyle = active => ({ cursor: "pointer", border: `1px solid ${active ? "#175cd3" : "#d0d5dd"}`, background: active ? "#edf4ff" : "#fff", color: active ? "#175cd3" : "#344054", borderRadius: 999, padding: "9px 14px", fontWeight: 900, fontSize: 13 });
const gatePage = { minHeight: "100vh", direction: "rtl", background: "#f4f6f8", color: "#172033", padding: "72px 18px", fontFamily: "Arial, sans-serif", textAlign: "center" };

export default function ResearchViewerV0Page() {
  const { loading, isAdmin } = useAuth();
  const [mode, setMode] = useState("control");
  if (loading) return <main style={gatePage}>טוען הרשאות…</main>;
  if (!isAdmin) return <main style={gatePage}><h2>Knowledge Control Center</h2><p>פנימי · אדמין בלבד.</p></main>;
  if (mode === "viewer") return <div style={{ minHeight: "100vh", background: "#f4f6f8" }}><div style={{ direction: "rtl", maxWidth: 1440, margin: "0 auto", padding: "14px clamp(14px,3vw,38px) 0", display: "flex", gap: 8, flexWrap: "wrap" }}><button onClick={() => setMode("control")} style={tabStyle(false)}>🌳 מרכז בקרת הידע</button><button onClick={() => setMode("viewer")} style={tabStyle(true)}>🔬 Research Viewer</button></div><ResearchViewerLegacyV0Page /></div>;
  return <main style={{ minHeight: "100vh", direction: "rtl", background: "#0c0818", color: "#fff", padding: "18px clamp(12px,3vw,38px) 48px" }}><div style={{ maxWidth: 1440, margin: "0 auto" }}><div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 14 }}><button onClick={() => setMode("control")} style={tabStyle(true)}>🌳 מרכז בקרת הידע</button><button onClick={() => setMode("viewer")} style={tabStyle(false)}>🔬 Research Viewer</button></div><KnowledgeControlCenterTab /></div></main>;
}
