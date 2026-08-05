import React, { useEffect, useState } from "react";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { getSitePulseToday } from "../lib/supabase.js";

// 🔠 צ'יפ «חוקרי הצופן התנכי היום» — מוצג *רק באזור הצופן* (דף הבית · ספריית הצפנים).
// מקור: אותו RPC site_pulse_today (עץ אחד). today-only, ספירות-בלבד (פרטיות). סטטי, בלי תנועה.
export default function ElsPulseChip({ light }) {
  const globalP = usePalette();
  const P = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const [pulse, setPulse] = useState(null);

  useEffect(() => {
    let alive = true;
    getSitePulseToday().then(p => { if (alive) setPulse(p); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  if (!pulse || !(pulse.els_today > 0)) return null;

  return (
    <div style={{
      display: "inline-flex", alignItems: "center", gap: 8, direction: "rtl",
      background: P.cardSoft, border: `1px solid ${P.border}`, borderRadius: 999, padding: "6px 14px",
    }}>
      <span style={{ width: 8, height: 8, borderRadius: "50%", background: "#57a9e8", boxShadow: "0 0 7px #57a9e8", flexShrink: 0 }} />
      <span style={{ fontFamily: F.body, fontSize: 13, fontWeight: 700, color: P.ink }}>
        🔠 <b style={{ color: P.accentText }}>{Number(pulse.els_today).toLocaleString("he")}</b> חוקרים בצופן התנכי היום
        {pulse.els_now > 0 && <span style={{ color: P.accentDim, fontWeight: 600 }}> · {pulse.els_now} כרגע</span>}
      </span>
    </div>
  );
}
