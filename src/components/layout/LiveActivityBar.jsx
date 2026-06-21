import React from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🔥 «חם בצ'אט» — תגובה נבחרת מהשיחה (OpenWeb/Spot.IM) שמוקפצת ברצועה העליונה.
// לחיצה על הרצועה מנווטת לצ'אט (/community/chat) שם נמצאת התגובה המלאה.
// להחלפת התגובה המוצגת — לערוך כאן בלבד (טיזר קצר וקולע; המלא חי בצ'אט).
const HOT_CHAT = {
  active: true,
  to: "/community/chat",
  teaser: "חוט עירוב שהותקן במוצב בצפון עצר רחפן נפץ — ובנס לא היו נפגעים",
  author: "שינשין",
};

// 🚧 רצועה עליונה — באנר קבוע ובולט: האתר בבנייה + התנצלות על הניווט, ומתחתיו
// רצועת «חם בצ'אט» שמפנה לשיחה. תמה-מודע: כהה תמיד (גם ביום) כדי להתאים ל-chrome החום-כהה.
export default function LiveActivityBar() {
  const isLight = useThemeMode() === "light";
  // ביום: חום-כהה אטום שתואם להדר. בלילה: הגרדיאנט האמבר המקורי (ללא שינוי).
  const barBg = isLight
    ? "linear-gradient(90deg, #241b0e, #2f2415, #241b0e)"
    : "linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55))";
  // רצועת «חם בצ'אט» — מעט בולטת יותר מהבאנר (גוון אש חמים), עדיין תואמת תמה.
  const hotBg = isLight
    ? "linear-gradient(90deg, #2a1606, #3a1f08, #2a1606)"
    : "linear-gradient(90deg, rgba(70,30,5,0.6), rgba(95,45,8,0.78), rgba(70,30,5,0.6))";
  return (
    <div style={{ direction: "rtl", position: "relative" }}>
      <style>{`
        @keyframes lab-build-pulse { 0%,100% { opacity:.78; } 50% { opacity:1; } }
        @keyframes lab-cone { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
        @keyframes lab-flame { 0%,100% { transform: scale(1) rotate(-4deg); opacity:.9; } 50% { transform: scale(1.18) rotate(4deg); opacity:1; } }
        .lab-build { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;
          background: ${barBg};
          border-bottom: 1px solid rgba(212,175,55,0.25); padding: 7px 12px; text-align:center; }
        .lab-build-txt { color:#ffd36b; font-family:${F.heading}; font-size:12.5px; font-weight:800; letter-spacing:.2px;
          animation: lab-build-pulse 2.4s ease-in-out infinite; }
        .lab-build-cone { display:inline-block; animation: lab-cone 2.2s ease-in-out infinite; }

        .lab-hot { display:flex; align-items:center; justify-content:center; gap:9px;
          background: ${hotBg}; border-bottom: 1px solid rgba(255,140,40,0.3);
          padding: 7px 14px; text-decoration:none; cursor:pointer;
          transition: filter .16s ease; }
        .lab-hot:hover { filter: brightness(1.12); }
        .lab-hot-flame { display:inline-block; font-size:14px; animation: lab-flame 1.7s ease-in-out infinite; }
        .lab-hot-badge { flex:none; color:#1a0e00; background:linear-gradient(135deg,#ffcf6b,#e8932f);
          font-family:${F.heading}; font-weight:900; font-size:11px; letter-spacing:.3px;
          padding:2px 9px; border-radius:999px; white-space:nowrap; }
        .lab-hot-txt { color:#ffe0a8; font-family:${F.heading}; font-size:12.5px; font-weight:700;
          overflow:hidden; text-overflow:ellipsis; white-space:nowrap; max-width:62vw; }
        .lab-hot-author { flex:none; color:#d9a24a; font-family:${F.heading}; font-size:11.5px; font-weight:700; white-space:nowrap; }
        .lab-hot-cta { flex:none; color:#ffd36b; font-family:${F.heading}; font-size:11.5px; font-weight:800; white-space:nowrap; }
        @media (max-width: 640px) {
          .lab-build-txt { font-size:11px; }
          .lab-hot-txt { font-size:11px; max-width:46vw; }
          .lab-hot-author { display:none; }
        }
      `}</style>

      <div className="lab-build">
        <span className="lab-build-cone" aria-hidden>🚧</span>
        <span className="lab-build-txt">האתר בבנייה — מתנצלים על חוסר הנוחות בניווט · בקרוב יטופל 🙏</span>
      </div>

      {HOT_CHAT.active && (
        <Link to={HOT_CHAT.to} className="lab-hot" aria-label="חם בצ'אט — מעבר לשיחה">
          <span className="lab-hot-flame" aria-hidden>🔥</span>
          <span className="lab-hot-badge">חם בצ'אט</span>
          <span className="lab-hot-txt">{HOT_CHAT.teaser}</span>
          {HOT_CHAT.author && <span className="lab-hot-author">· {HOT_CHAT.author}</span>}
          <span className="lab-hot-cta">לשיחה ←</span>
        </Link>
      )}
    </div>
  );
}
