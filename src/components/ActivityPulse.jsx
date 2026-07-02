import React, { useState, useEffect } from "react";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { getActivityPulse } from "../lib/supabase.js";

// 🫧 «פעילות חיה» — תחליף-הפרטיות לרשימת החיפושים (החלטת צוריאל, אפשרות 2+4):
// לא מציגים *מה* חיפשו — רק *סוג* הפעילות, כבועות נושמות שמתחלפות כל כמה שניות.
// «🟢 מישהו חוקר מספר · 🟣 מישהו בפסוקים · 🔵 מישהו מריץ דילוגים» + «⚡ N חוקרים פעילים».
// מקור: RPC activity_pulse (ספירות-בלבד, אפס תוכן). המערכת מרגישה נושמת — והפרטיות שמורה.
const TYPES = [
  { key: "numbers",  dot: "#57c98a", e: "🔢", label: "מישהו חוקר מספר" },
  { key: "names",    dot: "#e8c84a", e: "🔤", label: "מישהו חוקר שם או ביטוי" },
  { key: "verses",   dot: "#b07df6", e: "📖", label: "מישהו מחפש בפסוקים" },
  // 🧩 דילוגי-אותיות (els) — מוסתר עד שצוריאל פותח את ה-ELS לציבור (הנתון קיים ב-RPC, רק לא מוצג)
  { key: "journeys", dot: "#ff9b6b", e: "🧭", label: "מישהו יצא למסע" },
  { key: "research", dot: "#e0779b", e: "🔬", label: "מישהו לומד בהיכל הגילוי" },
];

export default function ActivityPulse({ light, title = "🟢 פעילות חיה עכשיו" }) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const [pulse, setPulse] = useState(null);
  const [hi, setHi] = useState(0);   // הבועה המודגשת — מתחלפת כל 4ש'

  useEffect(() => {
    let live = true;
    const load = () => getActivityPulse().then(p => { if (live) setPulse(p); }).catch(() => {});
    load();
    const id = setInterval(() => { if (!document.hidden) load(); }, 60000);
    return () => { live = false; clearInterval(id); };
  }, []);

  const active = TYPES.filter(t => (pulse?.[t.key] || 0) > 0);

  useEffect(() => {
    if (active.length < 2) return;
    const id = setInterval(() => setHi(h => h + 1), 4000);
    return () => clearInterval(id);
  }, [active.length]);

  if (!pulse || (!pulse.active && !active.length)) return null;
  const hiKey = active.length ? active[hi % active.length].key : null;

  return (
    <div style={{ background: pal.card, border: `1px solid ${pal.border}`, borderRadius: 16, padding: "13px 16px", direction: "rtl" }}>
      <style>{`
        @keyframes ap-breathe { 0%,100%{ opacity:1; transform:scale(1);} 50%{ opacity:.5; transform:scale(.75);} }
        @keyframes ap-in { from{ opacity:0; transform:translateY(4px);} to{ opacity:1; transform:none;} }
        /* 📱 מובייל: קטן וממורכז (בקשת צוריאל) — הכותרת, הבועות והערת-הפרטיות באמצע, פונטים מוקטנים */
        @media (max-width:640px) {
          .ap-head { justify-content:center !important; text-align:center; }
          .ap-head .ap-title { font-size:13.5px !important; }
          .ap-head .ap-badge { margin-inline-start:0 !important; font-size:10.5px !important; padding:2px 9px !important; }
          .ap-list { justify-content:center !important; }
          .ap-chip { padding:4px 10px !important; }
          .ap-txt { font-size:11.5px !important; }
          .ap-foot { text-align:center; font-size:10px !important; }
        }
      `}</style>
      <div className="ap-head" style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap", marginBottom: 10 }}>
        <span className="ap-title" style={{ color: pal.accentText, fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{title}</span>
        {/* «חקירות» ולא «חוקרים» (בקשת צוריאל + יושר): events = ספירת פעולות אמיתית מה-RPC */}
        {(pulse.events ?? pulse.active) > 0 && (
          <span className="ap-badge" style={{ marginInlineStart: "auto", color: pal.accentText, fontFamily: F.heading, fontSize: 12, fontWeight: 800,
            background: pal.glow, border: `1px solid ${pal.border}`, borderRadius: 999, padding: "3px 11px" }}>
            ⚡ {(pulse.events ?? pulse.active) === 1 ? "חקירה אחת" : `${pulse.events ?? pulse.active} חקירות`} בשעה האחרונה
          </span>
        )}
      </div>
      {active.length > 0 && (
        <div className="ap-list" style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
          {active.map(t => {
            const on = t.key === hiKey;
            return (
              <span key={t.key} className="ap-chip" style={{ display: "inline-flex", alignItems: "center", gap: 7, animation: "ap-in .4s ease both",
                background: on ? pal.glow : pal.cardSoft, border: `1px solid ${on ? t.dot : pal.border}`,
                borderRadius: 999, padding: "5px 13px", transition: "border-color .5s, background .5s, transform .5s",
                transform: on ? "scale(1.04)" : "scale(1)" }}>
                <span style={{ width: 8, height: 8, borderRadius: "50%", background: t.dot, boxShadow: `0 0 7px ${t.dot}`,
                  animation: "ap-breathe 2.2s ease-in-out infinite" }} />
                <span className="ap-txt" style={{ color: pal.ink, fontFamily: F.body, fontSize: 13, fontWeight: 600 }}>{t.e} {t.label}…</span>
              </span>
            );
          })}
        </div>
      )}
      <div className="ap-foot" style={{ marginTop: 9, color: pal.inkSoft, fontFamily: F.body, fontSize: 11 }}>
        🔒 מטעמי פרטיות מוצג רק סוג הפעילות — לא מה שחיפשו.
      </div>
    </div>
  );
}
