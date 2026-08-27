import React from "react";
import { Link, useLocation } from "react-router-dom";
import { useAuth } from "../../lib/AuthContext.jsx";
import ResearchViewerLegacy from "./ResearchViewerLegacy.jsx";
import CommandCenterNextPage from "./CommandCenterNextPage.jsx";

// Preserve Research Viewer v0 at its existing URL. The new Command Center is an experimental
// Projection over the same live sources and is opt-in via /research-viewer?mode=command.
export default function ResearchViewerV0Page() {
  const { search } = useLocation();
  const { loading, user, isAdmin } = useAuth();
  const mode = new URLSearchParams(search).get("mode");

  if (mode !== "command") return <ResearchViewerLegacy />;
  if (loading) return <main style={{ minHeight: "100vh", direction: "rtl", background: "#f3f6fa", padding: 32 }}>טוען הרשאות…</main>;

  if (!user) {
    return (
      <main style={{ minHeight: "100vh", direction: "rtl", background: "#f3f6fa", padding: "72px 18px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e1e6ee", borderRadius: 16, padding: 28, textAlign: "center", boxShadow: "0 5px 20px rgba(24,39,75,.05)" }}>
          <div style={{ fontSize: 34 }}>🎛️</div>
          <h2 style={{ margin: "10px 0 6px" }}>המפקדה החדשה</h2>
          <p style={{ color: "#667085", lineHeight: 1.7 }}>כדי לעבוד עם הנתונים החיים והפעולות של המפקדה צריך להתחבר למשתמש האדמין שלך.</p>
          <Link to="/login" style={{ display: "inline-block", marginTop: 10, padding: "11px 20px", borderRadius: 10, background: "#175cd3", color: "#fff", textDecoration: "none", fontWeight: 800 }}>🔑 התחבר עכשיו</Link>
          <div style={{ marginTop: 12, color: "#98a2b3", fontSize: 12 }}>אחרי ההתחברות חזור ל־Preview הזה — ה־session נשמר באותו דפדפן.</div>
        </div>
      </main>
    );
  }

  if (!isAdmin) {
    return (
      <main style={{ minHeight: "100vh", direction: "rtl", background: "#f3f6fa", padding: "72px 18px" }}>
        <div style={{ maxWidth: 520, margin: "0 auto", background: "#fff", border: "1px solid #e1e6ee", borderRadius: 16, padding: 28, textAlign: "center" }}>
          <h2>המפקדה החדשה</h2>
          <p style={{ color: "#667085" }}>המשתמש המחובר אינו אדמין.</p>
          <Link to="/login" style={{ color: "#175cd3", fontWeight: 800 }}>החלף משתמש</Link>
        </div>
      </main>
    );
  }

  return <CommandCenterNextPage />;
}
