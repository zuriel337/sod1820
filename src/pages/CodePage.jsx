import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { ELSSection } from "../features/els/Els.jsx";
import UpdatesBox from "../components/UpdatesBox.jsx";

// דף סגור (לא-אדמין) — מלכותי, מזמין הרשמה
function CodeClosed() {
  const P = usePalette();
  return (
    <div style={{ direction: "rtl", maxWidth: 760, margin: "0 auto", padding: "80px 22px 110px", textAlign: "center", position: "relative", zIndex: 1 }}>
      <div style={{ fontSize: 44, marginBottom: 8, filter: "drop-shadow(0 0 16px rgba(212,175,55,0.4))" }}>📜🔍</div>
      <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12.5, letterSpacing: 5, textTransform: "uppercase", marginBottom: 10 }}>דילוגי אותיות · ELS</div>
      <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(30px,6vw,52px)", fontWeight: 800, margin: "0 0 14px", textShadow: `0 0 55px ${P.glow}` }}>הצופן התנ״כי</h1>
      <div style={{ display: "inline-flex", alignItems: "center", gap: 8, background: P.glow, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "7px 18px", color: P.ink, fontFamily: F.heading, fontSize: 13.5, fontWeight: 700, marginBottom: 22 }}>
        🔒 המנוע בבנייה — ייפתח בקרוב
      </div>
      <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 16.5, lineHeight: 2, maxWidth: 560, margin: "0 auto 36px" }}>
        מנוע דילוגי האותיות (ELS) על טקסט התורה המלא — חיפוש מילים ושמות בדילוגים קבועים, אשכולות מצטלבים ומטריצות. בהרצות אחרונות לפני הפתיחה.
      </p>
      <UpdatesBox source="code" title="רוצים לדעת מתי הצופן נפתח?" body="הירשמו לעדכונים — ונודיע לכם ברגע שמנוע הדילוגים נפתח לציבור. תהיו מהראשונים לחפש דילוגים ולגלות רמזים בטקסט התורה." cta="הירשמו לעדכונים →" />
      <div style={{ marginTop: 26 }}>
        <Link to="/beit-midrash" style={{ color: P.ink, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>← בינתיים, חקרו גימטריה בבית המדרש</Link>
      </div>
    </div>
  );
}

// הצופן התנ"כי — סגור. המנוע המלא פתוח לאדמין בלבד; לכל השאר דף "ייפתח בקרוב" + הרשמה לעדכונים.
export default function CodePage() {
  const P = usePalette();
  const { isAdmin, loading } = useAuth();
  if (loading) {
    return <div style={{ direction: "rtl", textAlign: "center", color: P.accentDim, fontFamily: F.body, padding: "120px 20px", position: "relative", zIndex: 1 }}>טוען…</div>;
  }
  // 🔒 בבנייה — סגור לכולם (כולל אדמין) עד החלטת צוריאל. להחזרה: return isAdmin ? <ELSSection /> : <CodeClosed />;
  void isAdmin;
  return <CodeClosed />;
}
