import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { GoldButton } from "../components/ui.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// 🌍 /profile = מפנה-תאימות בלבד אל UserCenter (המגירה = הקוקפיט הפרטי היחיד).
// אין כאן תוכן משוכפל — כל היכולות שהיו כאן (הפרטים שלי · התראות Push · פעילות אחרונה ·
// העץ · מחוברים-עכשיו · הפרופיל · הקרדיטים · ההגדרות + התנתקות) חיות עכשיו כמודולים במגירה.
// קישורים ישנים ל-/profile (ואפילו /profile#notifications) ממשיכים לעבוד ונוחתים במקום הנכון.
// המודל הפשוט למשתמש: אני → האזור האישי → הדף שלי → צפה / ערוך.
export default function ProfilePage() {
  const P = usePalette();
  const { user, loading } = useAuth();
  const { open } = useUserCenter();

  // 🔒 לא לאינדקס (SEO = דף החוקר הציבורי בלבד)
  useEffect(() => {
    const m = document.createElement("meta");
    m.name = "robots"; m.content = "noindex, nofollow";
    document.head.appendChild(m);
    return () => { try { document.head.removeChild(m); } catch { /* noop */ } };
  }, []);

  // 🚪 launcher — פותח את המגירה אוטומטית. #notifications (מתפריט/פוטר ישן) → מודול ההתראות.
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
          <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 20, marginBottom: 16 }}>צריך להתחבר כדי לראות את האזור האישי</div>
          <GoldButton to="/login">כניסה</GoldButton>
        </div>
      </div>
    );
  }

  const btn = {
    display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer",
    fontFamily: F.heading, fontWeight: 800, fontSize: 15, borderRadius: 12, padding: "13px 24px", minHeight: 50,
    border: "none", background: P.accentBtn, color: P.onAccent, width: "100%", boxSizing: "border-box",
  };
  const ghost = { ...btn, background: "transparent", color: P.accentText, border: `1px solid ${P.border}` };

  return (
    <div style={{ background: P.pageBg, minHeight: "100vh" }}>
      <div style={{ direction: "rtl", maxWidth: 440, margin: "0 auto", padding: "72px 24px 120px", textAlign: "center" }}>
        <div style={{ fontSize: 44, marginBottom: 10 }}>🌍</div>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 24, fontWeight: 800 }}>האזור האישי שלך</div>
        <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.7, margin: "10px 0 22px" }}>
          כל מה שלך — המחקר, הצפנים, הקרדיטים, ההתראות וההגדרות — נמצא עכשיו במקום אחד: <b style={{ color: P.accentText }}>המגירה האישית</b>.
        </div>
        <div style={{ display: "grid", gap: 11 }}>
          <button onClick={() => open(null)} style={btn}>🧭 פתח את האזור האישי</button>
          <button onClick={() => open("public-page")} style={ghost}>👑 הדף הפומבי שלי — צפה / ערוך</button>
        </div>
        <div style={{ marginTop: 22 }}>
          <Link to="/" style={{ color: P.accentDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>← חזרה לאתר</Link>
        </div>
      </div>
    </div>
  );
}
