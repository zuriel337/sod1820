import React, { useEffect, useState } from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getSitePulseToday } from "../../lib/supabase.js";
import Marquee from "../Marquee.jsx";

// 🚧 רצועת-סטטוס גלובלית (marquee) מעל התוכן — הודעת-מערכת «בבנייה» + 🌳 דופק-היום החי.
// עץ אחד: הסטטיסטיקה נשלפת מ-RPC site_pulse_today (אותן טבלאות שדף-הבית מציג → אותם מספרים),
// today-only (now()::date) ואמיתית לגמרי — צפנים חדשים היום · חקירות היום · פעילים עכשיו · כתבים חדשים.
// הודעת-המערכת (לא עדכון-שידור) → לא נכנסת ל-channel_updates; חיה כאן. תמה-מודע (city_background_dual_theme_law §3).
const MAINTENANCE_MSG =
  "🚧 האתר בבנייה · ייתכנו עומסים · עקב ריבוי הגולשים ייתכנו נפילות ותקלות — אנו מטפלים בהן, תודה על הסבלנות";

const nf = (n) => Number(n || 0).toLocaleString("he");

export default function MaintenanceTicker() {
  const isLight = useThemeMode() === "light";
  const [pulse, setPulse] = useState(null);

  // 🌳 דופק-היום — נטען פעם ומתרענן כל דקה (רק כשהלשונית פעילה)
  useEffect(() => {
    let live = true;
    const load = () => getSitePulseToday().then(p => { if (live) setPulse(p); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const barBg = isLight
    ? "linear-gradient(90deg, #f6e6c2, #f0dca8, #f6e6c2)"
    : "linear-gradient(90deg, rgba(74,48,4,0.85), rgba(96,62,6,0.9), rgba(74,48,4,0.85))";
  const ink = isLight ? "#4a3208" : "#ffe6ad";
  const accent = isLight ? "#7a5e12" : "#f6e27a";
  const border = isLight ? "rgba(120,86,12,0.5)" : "rgba(212,175,55,0.32)";

  // מקטעי הדופק החי (אמיתי, today-only) — נבנים רק ממה שגדול מ-0
  const stats = [];
  if (pulse) {
    if (pulse.ciphers_today > 0) stats.push(`🔠 נוספו ${nf(pulse.ciphers_today)} צפנים חדשים היום`);
    if (pulse.investigations_today > 0) stats.push(`🔎 ${nf(pulse.investigations_today)} חקירות היום`);
    if (pulse.active_now > 0) stats.push(`🟢 ${nf(pulse.active_now)} חוקרים באתר עכשיו`);
    if (Array.isArray(pulse.new_writers) && pulse.new_writers.length)
      stats.push(`⭐ כתבים חדשים נוספו: ${pulse.new_writers.join(" · ")}`);
  }

  const Sep = () => <span aria-hidden style={{ color: accent, opacity: 0.55, margin: "0 8px" }}>◆</span>;

  return (
    <div style={{ direction: "rtl", background: barBg, borderBottom: `1px solid ${border}`, padding: "5px 0" }}
      role="status" aria-label="דופק האתר">
      <Marquee speedPxPerSec={55} gap={64} ariaLabel="דופק האתר — סטטיסטיקה חיה והודעות מערכת">
        <span style={{ display: "inline-flex", alignItems: "center", fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.2 }}>
          {stats.map((s, i) => (
            <React.Fragment key={i}>
              {i > 0 && <Sep />}
              <span style={{ color: accent }}>{s}</span>
            </React.Fragment>
          ))}
          {stats.length > 0 && <Sep />}
          <span style={{ color: ink }}>{MAINTENANCE_MSG}</span>
        </span>
      </Marquee>
    </div>
  );
}
