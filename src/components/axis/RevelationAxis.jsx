import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { supabase } from "../../lib/supabase.js";
import { C, F } from "../../theme.js";
import { stripHtml } from "../../lib/format.js";

// ===== ציר ההתגלות — הפס הקבוע =====
// נוכחות קבועה בצד שמאל של המסך (דסקטופ רחב בלבד): חוט אור עם תחנות
// האירועים החזקים. ריחוף — תצוגה מקדימה; לחיצה — אל התחנה בעמוד הציר המלא.

const VIOLET = "#8458ff";

const AXIS_CSS = `
  .rev-axis { display: none; }
  @media (min-width: 1380px) { .rev-axis { display: flex; } }
  @keyframes rev-pulse-travel {
    0%   { top: -12%; opacity: 0; }
    12%  { opacity: 1; }
    88%  { opacity: 1; }
    100% { top: 104%; opacity: 0; }
  }
  @keyframes rev-breathe {
    0%, 100% { transform: translateZ(var(--z)) scale(1); }
    50%      { transform: translateZ(var(--z)) scale(1.14); }
  }
  .rev-axis-dot { animation: rev-breathe 4.6s ease-in-out infinite; }
  .rev-axis-dot:hover { animation-play-state: paused; }
`;

function dotStyle(ev, active) {
  const w = ev.weight || 1;
  const size = 11 + w * 3.2;
  const strong = w >= 5;
  const color = strong ? C.goldBright : w >= 4 ? VIOLET : C.goldDim;
  return {
    width: size, height: size, borderRadius: "50%", cursor: "pointer", border: "none",
    "--z": `${(w - 3) * 26}px`,
    background: `radial-gradient(circle at 35% 30%, #fff8e1, ${color} 55%, ${color}55)`,
    boxShadow: active
      ? `0 0 18px ${color}, 0 0 44px ${color}aa, 0 0 70px ${color}55`
      : `0 0 ${6 + w * 3}px ${color}cc, 0 0 ${16 + w * 6}px ${color}44`,
    transition: "box-shadow .25s ease",
    animationDelay: `${(ev._i || 0) * 0.55}s`,
  };
}

export default function RevelationAxis() {
  const [events, setEvents] = useState([]);
  const [hovered, setHovered] = useState(null);
  const nav = useNavigate();
  const { pathname, hash } = useLocation();

  useEffect(() => {
    supabase.from("nodes")
      .select("id,label,weight,hebrew_date,axis_theme,metadata,gallery_id")
      .eq("type", "event").eq("is_active", true)
      .order("weight", { ascending: false })
      .order("created_at", { ascending: false })
      .limit(12)
      .then(({ data }) => setEvents((data || []).map((e, i) => ({ ...e, _i: i }))));
  }, []);

  // לא מציגים בעמודי עיצוב/ניהול — ובעמוד הציר המלא הציר הוא התוכן עצמו
  if (pathname.startsWith("/theme-preview") || pathname.startsWith("/admin")) return null;
  if (!events.length) return null;

  return (
    <div className="rev-axis" style={{
      position: "fixed", top: 0, bottom: 0, left: 0, width: 86, zIndex: 40,
      flexDirection: "column", alignItems: "center", justifyContent: "center",
      pointerEvents: "none",
    }}>
      <style>{AXIS_CSS}</style>

      {/* חוט האור */}
      <div style={{
        position: "absolute", top: "6%", bottom: "6%", left: 42, width: 2,
        background: `linear-gradient(180deg, transparent, ${C.gold}66 12%, ${VIOLET}88 50%, ${C.gold}66 88%, transparent)`,
        boxShadow: `0 0 14px ${VIOLET}66`,
      }}>
        <div style={{
          position: "absolute", left: -2, width: 6, height: 26, borderRadius: 3,
          background: `linear-gradient(180deg, transparent, #fff8e1, transparent)`,
          boxShadow: `0 0 12px ${C.goldBright}`, animation: "rev-pulse-travel 7s linear infinite",
        }} />
      </div>

      {/* כותרת אנכית */}
      <div style={{
        position: "absolute", top: "1.5%", left: 0, width: 86, textAlign: "center",
        color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 3,
        writingMode: "vertical-rl", margin: "0 auto", height: 110, lineHeight: "86px",
      }}>
        ציר ההתגלות
      </div>

      {/* התחנות — בתלת־ממד עדין: חזקות קרובות, חלשות רחוקות */}
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", gap: 26,
        perspective: 600, pointerEvents: "auto",
      }}>
        {events.map(ev => {
          const active = hash === `#ev-${ev.id}` && pathname === "/timeline";
          return (
            <div key={ev.id} style={{ position: "relative", display: "flex", alignItems: "center" }}
              onMouseEnter={() => setHovered(ev)} onMouseLeave={() => setHovered(null)}>
              <button className="rev-axis-dot" onClick={() => nav(`/timeline#ev-${ev.id}`)}
                aria-label={stripHtml(ev.label || "")} style={dotStyle(ev, active || hovered?.id === ev.id)} />

              {/* תצוגה מקדימה בריחוף */}
              {hovered?.id === ev.id && (
                <div style={{
                  position: "absolute", right: -14, transform: "translateX(100%)", width: 250,
                  background: "rgba(10,7,16,0.96)", border: `1px solid ${C.borderGold}`,
                  borderRadius: 12, padding: "13px 15px", direction: "rtl", zIndex: 5,
                  boxShadow: `0 8px 32px rgba(0,0,0,0.7), 0 0 26px ${VIOLET}33`,
                }}>
                  <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 13.5, fontWeight: 700, lineHeight: 1.55 }}>
                    {stripHtml(ev.label || "").slice(0, 90)}
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 8, flexWrap: "wrap", alignItems: "center" }}>
                    {ev.hebrew_date && <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1 }}>{ev.hebrew_date}</span>}
                    {ev.metadata?.year && <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 10.5 }}>· {ev.metadata.year}</span>}
                    {ev.gallery_id && <span style={{ color: VIOLET, fontSize: 11 }}>🖼 גלריה</span>}
                  </div>
                  {ev.axis_theme && (
                    <div style={{ marginTop: 7, display: "inline-block", padding: "2px 9px", borderRadius: 999,
                      border: `1px solid ${VIOLET}66`, color: "#b9a4ff", fontFamily: F.heading, fontSize: 10, letterSpacing: 1 }}>
                      {ev.axis_theme}
                    </div>
                  )}
                  <div style={{ marginTop: 9, color: C.goldDim, fontFamily: F.heading, fontSize: 10, letterSpacing: 1 }}>
                    לחץ כדי להיכנס לתחנה ←
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* קישור לעמוד המלא */}
      <button onClick={() => nav("/timeline")} style={{
        position: "absolute", bottom: "1.8%", left: 0, width: 86, background: "none", border: "none",
        color: C.goldDim, fontFamily: F.heading, fontSize: 16, cursor: "pointer", pointerEvents: "auto",
      }} aria-label="אל ציר ההתגלות המלא">✦</button>
    </div>
  );
}
