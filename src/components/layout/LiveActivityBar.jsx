import React from "react";
import { Link } from "react-router-dom";
import { F } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";

// 🔥 «חם בצ'אט» — תגובה נבחרת מהשיחה (OpenWeb/Spot.IM) שרצה כמבזק ברצועה העליונה.
// כל הטקסט רץ בלולאה (marquee); לחיצה על הרצועה מנווטת לצ'אט (/community/chat) שם
// נמצאת התגובה המלאה. להחלפת התגובה — לערוך כאן בלבד (text + author).
const HOT_CHAT = {
  active: true,
  to: "/community/chat",
  author: "שינשין",
  text:
    "סיפור חריג ומרגש מגבול הצפון: חוט עירוב שהותקן במוצב סמוך לגבול לבנון עצר רחפן נפץ ששוגר לעבר האזור, " +
    "מנע ממנו להמשיך במסלולו – ובנס לא היו נפגעים. על פי דיווחו של שילה פריד, ברבנות הצבאית מספרים על אלישיב, " +
    "חייל ברבנות הצבאית, שלפני כחודש וחצי התקין עירוב באחד המוצבים בצפון במסגרת תפקידו הצבאי. העירוב נועד " +
    "לאפשר שמירת שבת כהלכתה לחיילים השוהים במקום, גם בתנאי לחימה ומוכנות מבצעית. ימים ספורים לאחר ה…",
};

// 🚧 רצועה עליונה — באנר קבוע: האתר בבנייה, ומתחתיו מבזק «חם בצ'אט» שמריץ תגובה
// חמה ומפנה לשיחה. תמה-מודע: כהה תמיד (גם ביום) כדי להתאים ל-chrome החום-כהה.
export default function LiveActivityBar() {
  const isLight = useThemeMode() === "light";
  const barBg = isLight
    ? "linear-gradient(90deg, #241b0e, #2f2415, #241b0e)"
    : "linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55))";
  const hotBg = isLight
    ? "linear-gradient(90deg, #2a1606, #3a1f08, #2a1606)"
    : "linear-gradient(90deg, rgba(70,30,5,0.6), rgba(95,45,8,0.78), rgba(70,30,5,0.6))";

  // טקסט המבזק (כולל הכותב) — נשמר פעמיים ברצועה כדי שהלולאה תהיה רציפה.
  const item = HOT_CHAT.text + (HOT_CHAT.author ? `  —  ${HOT_CHAT.author}` : "");

  return (
    <div style={{ direction: "rtl", position: "relative" }}>
      <style>{`
        @keyframes lab-build-pulse { 0%,100% { opacity:.78; } 50% { opacity:1; } }
        @keyframes lab-cone { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
        @keyframes lab-flame { 0%,100% { transform: scale(1) rotate(-4deg); opacity:.9; } 50% { transform: scale(1.18) rotate(4deg); opacity:1; } }
        /* מבזק: הרצועה זזה שמאלה בדיוק חצי מרוחבה (=עותק אחד) → לולאה רציפה */
        @keyframes lab-ticker { from { transform: translateX(0); } to { transform: translateX(-50%); } }

        .lab-build { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;
          background: ${barBg};
          border-bottom: 1px solid rgba(212,175,55,0.25); padding: 7px 12px; text-align:center; }
        .lab-build-txt { color:#ffd36b; font-family:${F.heading}; font-size:12.5px; font-weight:800; letter-spacing:.2px;
          animation: lab-build-pulse 2.4s ease-in-out infinite; }
        .lab-build-cone { display:inline-block; animation: lab-cone 2.2s ease-in-out infinite; }

        .lab-hot { display:flex; align-items:center; gap:9px;
          background: ${hotBg}; border-bottom: 1px solid rgba(255,140,40,0.3);
          padding: 7px 12px; text-decoration:none; cursor:pointer; transition: filter .16s ease; }
        .lab-hot:hover { filter: brightness(1.1); }
        .lab-hot:hover .lab-hot-track { animation-play-state: paused; }
        .lab-hot-flame { flex:none; display:inline-block; font-size:14px; animation: lab-flame 1.7s ease-in-out infinite; }
        .lab-hot-badge { flex:none; color:#1a0e00; background:linear-gradient(135deg,#ffcf6b,#e8932f);
          font-family:${F.heading}; font-weight:900; font-size:11px; letter-spacing:.3px;
          padding:2px 9px; border-radius:999px; white-space:nowrap; }
        /* מסילת המבזק — חלון עם overflow מוסתר; הרצועה רצה בתוכו */
        .lab-hot-marquee { flex:1 1 auto; min-width:0; overflow:hidden; -webkit-mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent); mask-image:linear-gradient(90deg,transparent,#000 24px,#000 calc(100% - 24px),transparent); }
        .lab-hot-track { display:flex; direction:ltr; width:max-content; animation: lab-ticker 38s linear infinite; }
        .lab-hot-item { direction:rtl; white-space:nowrap; padding-left:60px; color:#ffe0a8;
          font-family:${F.heading}; font-size:12.5px; font-weight:700; }
        .lab-hot-cta { flex:none; color:#ffd36b; font-family:${F.heading}; font-size:11.5px; font-weight:800; white-space:nowrap; }

        @media (max-width: 640px) {
          .lab-build-txt { font-size:11px; }
          .lab-hot-item { font-size:11px; }
          .lab-hot-track { animation-duration: 28s; }
        }
        @media (prefers-reduced-motion: reduce) {
          .lab-hot-track { animation:none; }
          .lab-hot-marquee { overflow:hidden; }
          .lab-hot-item { text-overflow:ellipsis; overflow:hidden; }
          .lab-hot-item + .lab-hot-item { display:none; }
        }
      `}</style>

      <div className="lab-build">
        <span className="lab-build-cone" aria-hidden>🚧</span>
        <span className="lab-build-txt">האתר בבנייה — מתנצלים על חוסר הנוחות בניווט · בקרוב יטופל 🙏</span>
      </div>

      {HOT_CHAT.active && (
        <Link to={HOT_CHAT.to} className="lab-hot" aria-label={`חם בצ'אט: ${HOT_CHAT.text} — מעבר לשיחה`}>
          <span className="lab-hot-flame" aria-hidden>🔥</span>
          <span className="lab-hot-badge">חם בצ'אט</span>
          <div className="lab-hot-marquee">
            <div className="lab-hot-track">
              <span className="lab-hot-item" aria-hidden>{item}</span>
              <span className="lab-hot-item" aria-hidden>{item}</span>
            </div>
          </div>
          <span className="lab-hot-cta">לשיחה ←</span>
        </Link>
      )}
    </div>
  );
}
