import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { isAnon, setAnon, onAnonChange } from "../lib/privacy.js";

// hook משותף — מצב אנונימי חי (מסונכרן בין המחשבון לדף המספר)
export function useAnon() {
  const [on, setOn] = useState(isAnon());
  useEffect(() => onAnonChange(setOn), []);
  return on;
}

// 🕶️ כפתור «חיפוש אנונימי» — מתחלף, מציג מצב חי. צבעי-פרטיות עצמאיים (קריא על רקע בהיר/כהה).
export default function AnonToggle({ size = "md" }) {
  const on = useAnon();
  const sm = size === "sm";
  const V = "#7c6cf0";   // סגול-פרטיות — עובד על בהיר וכהה
  return (
    <button
      onClick={() => setAnon(!on)}
      title="חיפוש אנונימי — החיפוש לא יישמר בהיסטוריית החיפושים ולא בקיר הציבורי. (האנליטיקס האנונימי הפנימי לא נאסף לפי משתמש.)"
      style={{
        cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 7,
        fontFamily: F.heading, fontSize: sm ? 11.5 : 12.5, fontWeight: 700,
        borderRadius: 999, padding: sm ? "5px 11px" : "6px 13px",
        border: `1px solid ${on ? V : "rgba(124,108,240,0.4)"}`,
        background: on ? "rgba(124,108,240,0.16)" : "transparent",
        color: on ? V : "#8a82a5",
        transition: "all .2s ease", whiteSpace: "nowrap",
      }}>
      <span style={{ fontSize: sm ? 13 : 14 }}>{on ? "🕶️" : "👁"}</span>
      <span>{on ? "מצב אנונימי פעיל — לא נשמר" : "חיפוש אנונימי"}</span>
    </button>
  );
}
