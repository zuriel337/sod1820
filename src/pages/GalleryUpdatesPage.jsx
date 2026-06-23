import React, { useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { applySeo } from "../lib/seo.js";
import RealityWorld from "../components/RealityWorld.jsx";

// ===== זרם המציאות (/gallery-updates) =====
// המוצר המלא: דופק (חם עכשיו) + סרגל חכם + זרם אינסופי של רמזים (source='update').
// עדשה על gallery_images — לא טבלה חדשה. כל רמז מחובר למספר שלו (/number/:n).

export default function GalleryUpdatesPage() {
  const P = usePalette();
  useEffect(() => {
    applySeo({ title: "זרם המציאות", description: "זרם המציאות של סוד 1820 — המספרים החיים: רמזי החדשות הטריים, מה חם עכשיו, ומגמות בזמן אמת. כל רמז מחובר למספר ולגימטריה שלו.", path: "/gallery-updates" });
  }, []);

  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: P.pageBg, color: P.ink }}>
      <style>{`
        .gu-wrap { max-width: 1100px; margin: 0 auto; padding: 36px 16px 80px; }
        .hn-h2 { color:${P.accentText}; font-family:${F.regal}; font-size:clamp(22px,4vw,32px); font-weight:800; text-align:center; margin:0 0 4px; }
        .hn-sub { color:${P.inkSoft}; font-family:${F.body}; font-size:14px; text-align:center; margin:0 0 18px; }
        @keyframes hn-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.55; } }
      `}</style>
      <div className="gu-wrap">
        <div style={{ textAlign: "center", marginBottom: 16 }}>
          <Link to="/archive" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5 }}>🖼 לאוספים ולארכיון המלא →</Link>
        </div>
        <RealityWorld />
      </div>
    </div>
  );
}
