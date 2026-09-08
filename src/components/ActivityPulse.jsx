import React from "react";
import ActivityPulseBase from "./ActivityPulseBase.jsx";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// בעמוד הבית בלבד לא מרנדרים את רכיב-הדופק החי ולכן גם לא מפעילים את ה-RPC/ה-polling שלו.
// בשאר המשטחים הרכיב הקנוני הקיים נשמר ללא שינוי.
function isHomeSurface() {
  if (typeof window === "undefined") return false;
  const p = window.location.pathname;
  return p === "/" || p === "/home-new" || p === "/בית-חדש";
}

export default function ActivityPulse(props) {
  const globalP = usePalette();
  if (!isHomeSurface()) return <ActivityPulseBase {...props} />;

  const pal = props.light == null ? globalP : PALETTES[props.light ? "light" : "dark"];
  return (
    <div data-traffic-surface-paused="true" style={{
      background: pal.card,
      border: `1px solid ${pal.border}`,
      borderRadius: 16,
      padding: "18px 16px",
      direction: "rtl",
      textAlign: "center",
    }}>
      <div style={{ fontSize: 24, marginBottom: 5 }}>🚧</div>
      <div style={{ color: pal.accentText, fontFamily: F.heading, fontSize: 15, fontWeight: 800 }}>אזור בבנייה</div>
      <div style={{ color: pal.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.7, marginTop: 4 }}>
        דופק האתר עובר שדרוג. נתוני התנועה ממשיכים להימדד ברקע אך אינם מוצגים כאן כרגע.
      </div>
    </div>
  );
}
