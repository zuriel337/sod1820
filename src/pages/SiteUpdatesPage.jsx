import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import SiteUpdatesFeed from "../components/SiteUpdatesFeed.jsx";

// 🌳 «מה חדש באתר» — עמוד-השדרוגים הקנוני. הגוף (ציר-הזמן) חי ברכיב המשותף <SiteUpdatesFeed>,
// שמרונדר גם כאן (דף /whats-new) וגם בטאב «פיתוח האתר» במרכז השידורים — אותו הדבר בשני המקומות.
export default function SiteUpdatesPage() {
  const P = usePalette();

  useEffect(() => {
    track("whats-new");
    applySeo({
      title: "מה חדש באתר — עדכוני ושדרוגי סוד 1820",
      description: "כל השדרוגים והפיצ׳רים החדשים של סוד 1820 במקום אחד — מתעדכן אוטומטית עם כל שיפור.",
      path: "/whats-new",
    });
  }, []);

  return (
    <div dir="rtl" style={{ background: P.pageBg, minHeight: "100vh", position: "relative", zIndex: 1 }}>
      <div style={{ maxWidth: 720, margin: "0 auto", padding: "26px 16px 90px" }}>
        <div style={{ textAlign: "center", marginBottom: 22 }}>
          <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 3, textTransform: "uppercase", marginBottom: 6 }}>עדכוני האתר</div>
          <h1 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(26px,5vw,40px)", fontWeight: 800, margin: "0 0 8px" }}>🌳 מה חדש באתר</h1>
          <p style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 15, lineHeight: 1.8, maxWidth: 520, margin: "0 auto" }}>
            כל השדרוגים והפיצ׳רים החדשים — במקום אחד, החדשים למעלה. מתעדכן אוטומטית עם כל שיפור.
          </p>
        </div>

        <SiteUpdatesFeed />

        <div style={{ textAlign: "center", marginTop: 26 }}>
          <Link to="/broadcasts" style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700, textDecoration: "none", borderBottom: `1px dotted ${P.accentDim}` }}>📡 מרכז השידורים — כל הערוצים ←</Link>
        </div>
      </div>
    </div>
  );
}
