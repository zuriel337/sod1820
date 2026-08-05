import React, { useEffect, useState } from "react";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { getSitePulseToday } from "../../lib/supabase.js";

// 🌳 רצועת-דופק גלובלית — «מחליף בדהייה» (fade-rotator, לא marquee): פריט אחד בכל פעם,
// מתחלף בדהייה רכה כל 5ש'. אפס תנועה אופקית → תקין ורגוע במובייל (בקשת צוריאל).
// תוכן: הודעת-מערכת «בבנייה» + דופק-היום החי (RPC site_pulse_today — אותן טבלאות של דף-הבית,
// today-only, אמיתי, ספירות-בלבד לפרטיות). תמה-מודע (city_background_dual_theme_law §3).
const MAINTENANCE_MSG = "🚧 האתר בבנייה · ייתכנו עומסים ותקלות — אנו מטפלים, תודה על הסבלנות";
const nf = (n) => Number(n || 0).toLocaleString("he");

export default function MaintenanceTicker() {
  const isLight = useThemeMode() === "light";
  const [pulse, setPulse] = useState(null);
  const [idx, setIdx] = useState(0);

  useEffect(() => {
    let live = true;
    const load = () => getSitePulseToday().then(p => { if (live) setPulse(p); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => { live = false; clearInterval(id); };
  }, []);

  // הפריטים המתחלפים: דופק-היום (אמיתי) + הודעת-המערכת בסוף
  const stats = [];
  if (pulse) {
    if (pulse.ciphers_today > 0) stats.push(`🔠 נוספו ${nf(pulse.ciphers_today)} צפנים חדשים היום`);
    if (pulse.investigations_today > 0) stats.push(`🔎 ${nf(pulse.investigations_today)} חקירות היום`);
    if (pulse.active_now > 0) stats.push(`🟢 ${nf(pulse.active_now)} חוקרים באתר עכשיו`);
    if (Array.isArray(pulse.new_writers) && pulse.new_writers.length)
      stats.push(`⭐ כתבים חדשים נוספו: ${pulse.new_writers.join(" · ")}`);
  }
  const items = [...stats, MAINTENANCE_MSG];

  // רוטציית-דהייה כל 5ש' (רק אם יש יותר מפריט אחד)
  useEffect(() => {
    if (items.length < 2) return;
    const id = setInterval(() => { if (!document.hidden) setIdx(i => i + 1); }, 5000);
    return () => clearInterval(id);
  }, [items.length]);

  const cur = items[idx % items.length];
  const isMsg = cur === MAINTENANCE_MSG;

  const barBg = isLight
    ? "linear-gradient(90deg, #f6e6c2, #f0dca8, #f6e6c2)"
    : "linear-gradient(90deg, rgba(74,48,4,0.85), rgba(96,62,6,0.9), rgba(74,48,4,0.85))";
  const ink = isLight ? "#4a3208" : "#ffe6ad";
  const accent = isLight ? "#7a5e12" : "#f6e27a";
  const border = isLight ? "rgba(120,86,12,0.5)" : "rgba(212,175,55,0.32)";

  return (
    <div style={{ direction: "rtl", background: barBg, borderBottom: `1px solid ${border}`, padding: "6px 14px", textAlign: "center", minHeight: 30, display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden" }}
      role="status" aria-label="דופק האתר">
      <style>{`@keyframes tk-fade{from{opacity:0;transform:translateY(3px)}to{opacity:1;transform:none}}`}</style>
      <span key={idx} style={{
        fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, letterSpacing: 0.2,
        color: isMsg ? ink : accent, animation: "tk-fade .5s ease both",
        maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
      }}>{cur}</span>
    </div>
  );
}
