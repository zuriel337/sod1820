import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { controlTone, usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// 🌍 /profile = מפנה-תאימות בלבד אל UserCenter (המגירה = הקוקפיט הפרטי היחיד).
// אין כאן תוכן משוכפל — כל היכולות שהיו כאן חיות עכשיו כמודולים במגירה.
export default function ProfilePage() {
  const P = usePalette();
  const { user, loading } = useAuth();
  const { open } = useUserCenter();
  const primary = controlTone(P, "primary");
  const ghostTone = controlTone(P, "ghost");

  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { try { document.head.removeChild(m); } catch { /* noop */ } };
  }, []);

  useEffect(() => {
    if (loading || !user) return;
    const hash = (typeof window !== "undefined" && window.location.hash) || "";
    const t = setTimeout(() => open(hash === "#notifications" ? "notifications" : null), 60);
    return () => clearTimeout(t);
  }, [loading, user, open]);

  if (!loading && !user) {
    return (
      <div style={{ background: P.pageBg, minHeight: "100vh" }}>
        <div style={{ direction: "rtl", maxWidth: 460, margin: "0 auto", padding: "80px 24px", textAlign: "center" }}>
          <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 20, marginBottom: 16 }}>צריך להתחבר כדי לראות את האזור האישי</div>
          <GoldButton to="/login">כניסה</GoldButton>
        </div>
      </div>
    );
  }

  const baseBtn = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
    fontFamily: F.ui, fontWeight: 800, fontSize: 15, borderRadius: 12, padding: "13px 24px", minHeight: 50,
    width: "100%", boxSizing: "border-box",
  };
  const btn = { ...baseBtn, background: primary.background, color: primary.color, border: `1px solid ${primary.border}` };
  const ghost = { ...baseBtn, background: ghostTone.background, color: ghostTone.color, border: `1px solid ${ghostTone.border}` };

  return (
    <div style={{ background: P.pageBg, minHeight: "100vh" }}>
      <div style={{ direction: "rtl", maxWidth: 440, margin: "0 auto", padding: "72px 24px 120px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🌍</div>
        <div style={{ color: P.ink, fontFamily: F.ui, fontSize: 24, fontWeight: 800 }}>האזור האישי שלך</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, margin: "10px 0 22px" }}>
          כל מה שלך — המחקר, הצפנים, הקרדיטים, ההתראות וההגדרות — נמצא עכשיו במקום אחד: <b style={{ color: P.ink }}>המגירה האישית</b>.
        </div>
        <div style={{ display: "grid", gap: 11 }}>
          <button onClick={() => open(null)} style={btn}>🧭 פתח את האזור האישי</button>
          <button onClick={() => open("public-page")} style={ghost}>👑 הדף הפומבי שלי — צפה / ערוך</button>
        </div>
        <div style={{ marginTop: 22 }}>
          <Link to="/" style={{ color: ghostTone.color, textDecoration: "none", fontFamily: F.ui, fontSize: 13 }}>← חזרה לאתר</Link>
        </div>
      </div>
    </div>
  );
}
