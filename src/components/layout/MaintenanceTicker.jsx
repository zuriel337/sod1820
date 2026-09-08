import React from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🚧 PUBLIC_TRAFFIC_SURFACE_PAUSE_EXPERIMENT_V1
// הדופק הגלובלי אינו קורא getSitePulseToday ואינו מפעיל polling בזמן הניסוי.
// מדידת התנועה עצמה נשארת פעילה במערכות האנליטיקה.
export default function MaintenanceTicker() {
  const isLight = useThemeMode() === "light";
  const barBg = isLight
    ? "linear-gradient(90deg, #f6e6c2, #f0dca8, #f6e6c2)"
    : "linear-gradient(90deg, rgba(74,48,4,0.85), rgba(96,62,6,0.9), rgba(74,48,4,0.85))";
  const ink = isLight ? "#4a3208" : "#ffe6ad";
  const border = isLight ? "rgba(120,86,12,0.5)" : "rgba(212,175,55,0.32)";

  return (
    <div
      role="status"
      aria-label="דופק האתר — אזור בבנייה"
      data-traffic-surface-paused="true"
      style={{
        direction: "rtl",
        background: barBg,
        borderBottom: `1px solid ${border}`,
        padding: "6px 14px",
        textAlign: "center",
        minHeight: 30,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        overflow: "hidden",
      }}
    >
      <span style={{
        fontFamily: F.heading,
        fontSize: 12.5,
        fontWeight: 800,
        letterSpacing: 0.2,
        color: ink,
        maxWidth: "100%",
        overflow: "hidden",
        textOverflow: "ellipsis",
        whiteSpace: "nowrap",
      }}>
        🚧 דופק האתר — אזור בבנייה
      </span>
    </div>
  );
}
