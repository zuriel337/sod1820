import React, { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../../theme.js";
import { getCrossTickerItems, dayOfYear } from "../../lib/supabase.js";

// 🚧 רצועה עליונה — שתי שכבות:
// 1) באנר קבוע ובולט: האתר בבנייה + התנצלות על הניווט (מודגש כל הזמן, לא נגלל).
// 2) פנינה אחת (פנינת היום) שרצה הלוך-ושוב (ping-pong) — נקראת תוך כדי תנועה, עוצרת במעבר עכבר.

// פירוט גימטריה לפנינה → "ביטוי = ערך · ..." (תומך במבנה חדש וישן)
function pairsText(gp) {
  if (!gp) return "";
  const out = [];
  const add = p => { if (!p) return; const ph = p.phrase || p.word; const v = p.value ?? p.ragil ?? p.mistater ?? p.miluy; if (ph && v != null) out.push(`${ph} = ${v}`); };
  if (Array.isArray(gp)) gp.forEach(add);
  else { (gp.revealed || []).forEach(add); (gp.hidden || []).forEach(add); (gp.members || []).forEach(add); (gp.pairs || []).forEach(add); }
  return out.join(" · ");
}
const cleanT = s => String(s || "").replace(/<[^>]*>/g, "").trim();

// פנינת ברירת־מחדל (בזמן טעינה / אם אין נתונים) — פנינת היסוד 1820
const FALLBACK_PEARL = {
  text: "💎 פנינת היום · 1820 — פסוק הגבול: «אם עד תכלית שדי תמצא» — אם עד תכלית שדי תמצא = 1820 · שם ה׳ בתורה = 1820 פעם",
  to: "/number/1820",
};

// בונה את טקסט הפנינה + יעד קישור מתוך רשומת insight
function buildPearl(c) {
  if (!c) return FALLBACK_PEARL;
  const detail = pairsText(c.gematria_pairs);
  const gp = c.gematria_pairs;
  const num = (gp && !Array.isArray(gp)) ? gp.number : null;
  return {
    text: `💎 פנינת היום · ${cleanT(c.title)}${detail ? " — " + detail : ""}`,
    to: num ? `/number/${num}` : "/beit-midrash?tab=crosses",
  };
}

export default function LiveActivityBar() {
  const [pearl, setPearl] = useState(FALLBACK_PEARL);
  const [shift, setShift] = useState(0);
  const outer = useRef(null);
  const inner = useRef(null);

  // טעינת פנינת היום — נבחרת דטרמיניסטית מתוך הפנינים המככבים (יציבה ליום, מתחלפת מעצמה כל יום)
  useEffect(() => {
    let live = true;
    getCrossTickerItems().then(list => {
      if (!live || !list || !list.length) return;
      const featured = list.filter(c => c.panel_data?.featured);
      const pool = featured.length ? featured : list;
      const chosen = pool[dayOfYear() % pool.length];
      setPearl(buildPearl(chosen));
    }).catch(() => {});
    return () => { live = false; };
  }, []);

  // מדידת רוחב → מרחק ה-ping-pong (כמה התוכן חורג מהמסגרת). מתעדכן בשינוי גודל.
  useEffect(() => {
    const measure = () => {
      if (!outer.current || !inner.current) return;
      const W = outer.current.clientWidth;
      const Cw = inner.current.scrollWidth;
      setShift(Math.max(0, Cw - W + 18));
    };
    measure();
    const ro = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null;
    if (ro && outer.current) ro.observe(outer.current);
    window.addEventListener("resize", measure);
    return () => { if (ro) ro.disconnect(); window.removeEventListener("resize", measure); };
  }, [pearl]);

  // משך התנועה פרופורציונלי למרחק → מהירות אחידה ונעימה (≈26px/שנ'). מינימום למניעת ריצוד.
  const dur = Math.max(10, Math.round(shift / 26));
  const moving = shift > 0;

  return (
    <div style={{ direction: "rtl", borderBottom: `1px solid ${C.border}`, position: "relative" }}>
      <style>{`
        @keyframes lab-pong { from { transform: translateX(0); } to { transform: translateX(var(--lab-shift, 0px)); } }
        @keyframes lab-build-pulse { 0%,100% { opacity:.78; } 50% { opacity:1; } }
        @keyframes lab-cone { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
        .lab-build { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;
          background: linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55));
          border-bottom: 1px solid rgba(212,175,55,0.25); padding: 5px 12px; text-align:center; }
        .lab-build-txt { color:#ffd36b; font-family:${F.heading}; font-size:12.5px; font-weight:800; letter-spacing:.2px;
          animation: lab-build-pulse 2.4s ease-in-out infinite; }
        .lab-build-cone { display:inline-block; animation: lab-cone 2.2s ease-in-out infinite; }
        .lab-pearl-wrap { background: rgba(10,7,2,0.92); overflow: hidden; position: relative; padding: 7px 0; }
        .lab-pearl-row { display:flex; align-items:center; }
        .lab-pearl { white-space: nowrap; flex: 0 0 auto; text-decoration:none;
          color:#ffcf4d; font-family:${F.royal}; font-size:14.5px; font-weight:700; padding:0 14px; }
        .lab-pearl:hover { color:${C.goldBright}; }
        .lab-pearl.moving { animation: lab-pong var(--lab-dur,30s) ease-in-out infinite alternate; }
        .lab-pearl-wrap:hover .lab-pearl.moving { animation-play-state: paused; }
        @media (max-width: 640px) { .lab-build-txt { font-size:11px; } .lab-pearl { font-size:13.5px; } }
      `}</style>

      {/* באנר בנייה קבוע — מודגש כל הזמן, לא נגלל */}
      <div className="lab-build">
        <span className="lab-build-cone" aria-hidden>🚧</span>
        <span className="lab-build-txt">האתר בבנייה — מתנצלים על חוסר הנוחות בניווט · בקרוב יטופל 🙏</span>
      </div>

      {/* פנינה אחת — הלוך ושוב */}
      <div className="lab-pearl-wrap" ref={outer}>
        <div className="lab-pearl-row" style={{ justifyContent: moving ? "flex-start" : "center" }}>
          <Link
            to={pearl.to || "/"}
            ref={inner}
            className={`lab-pearl${moving ? " moving" : ""}`}
            style={{ "--lab-shift": `${shift}px`, "--lab-dur": `${dur}s` }}
          >
            {pearl.text}
          </Link>
        </div>
      </div>
    </div>
  );
}
