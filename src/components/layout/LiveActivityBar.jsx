import React from "react";
import { F } from "../../theme.js";

// 🚧 רצועה עליונה — באנר קבוע ובולט בלבד: האתר בבנייה + התנצלות על הניווט (מודגש כל הזמן).
export default function LiveActivityBar() {
  return (
    <div style={{ direction: "rtl", position: "relative" }}>
      <style>{`
        @keyframes lab-build-pulse { 0%,100% { opacity:.78; } 50% { opacity:1; } }
        @keyframes lab-cone { 0%,100% { transform: rotate(-7deg); } 50% { transform: rotate(7deg); } }
        .lab-build { display:flex; align-items:center; justify-content:center; gap:8px; flex-wrap:wrap;
          background: linear-gradient(90deg, rgba(60,40,5,0.55), rgba(80,55,8,0.7), rgba(60,40,5,0.55));
          border-bottom: 1px solid rgba(212,175,55,0.25); padding: 7px 12px; text-align:center; }
        .lab-build-txt { color:#ffd36b; font-family:${F.heading}; font-size:12.5px; font-weight:800; letter-spacing:.2px;
          animation: lab-build-pulse 2.4s ease-in-out infinite; }
        .lab-build-cone { display:inline-block; animation: lab-cone 2.2s ease-in-out infinite; }
        @media (max-width: 640px) { .lab-build-txt { font-size:11px; } }
      `}</style>

      <div className="lab-build">
        <span className="lab-build-cone" aria-hidden>🚧</span>
        <span className="lab-build-txt">האתר בבנייה — מתנצלים על חוסר הנוחות בניווט · בקרוב יטופל 🙏</span>
      </div>
    </div>
  );
}
