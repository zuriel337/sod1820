import React from "react";
import { Link, useLocation } from "react-router-dom";
import { F } from "../../theme.js";
import { ELS_LOGO } from "../../lib/hub/ready.js";

// 🏛️ רצועת «כלי ההיכל» — נוכחות קבועה של כלי-הליבה בכל האתר (לא רק בהיכל).
// לא-סטיקית: יושבת מתחת לטיקר, נגללת עם התוכן. עץ אחד — הכל מצביע פנימה להיכל.
// מי שנחת על פוסט אקראי רואה מיד: מחשבון · בית מדרש · צופן תנ"כי.
const TOOLS = [
  { e: "🧮", l: "מחשבון גימטריה", to: "/research?tool=gematria" },
  { e: "📖", l: "בית המדרש", to: "/research?tool=midrash" },
  { e: "🔍", l: 'הצופן התנ"כי', to: "/code", img: ELS_LOGO },
];

export default function HeichalToolsStrip() {
  const { pathname } = useLocation();
  // בתוך ההיכל יש כבר סרגל-מדורים משלו → לא מכפילים. שאר האתר — מציגים.
  if (pathname.startsWith("/research")) return null;

  return (
    <nav className="hts" aria-label="כלי ההיכל" dir="rtl">
      <style>{HTS_CSS}</style>
      <div className="hts-in">
        <span className="hts-lbl">🏛️ כלי ההיכל</span>
        <div className="hts-pills">
          {TOOLS.map(t => (
            <Link key={t.to} to={t.to} className="hts-pill">
              {t.img
                ? <img className="hts-e" src={t.img} alt="" width="16" height="16" style={{ borderRadius: 4, objectFit: "cover" }} />
                : <span className="hts-e" aria-hidden>{t.e}</span>}
              {t.l}
            </Link>
          ))}
        </div>
        <Link to="/research" className="hts-all">כל הכלים →</Link>
      </div>
    </nav>
  );
}

// תמיד בגוון זהב-כהה (כמו הטיקר שמעליו) → עקבי בכל עמוד, בהיר וכהה כאחד.
const HTS_CSS = `
.hts{direction:rtl;background:linear-gradient(90deg,#1c1509,#271d0d,#1c1509);border-bottom:1px solid rgba(212,175,55,0.26);overflow-x:hidden}
.hts-in{display:flex;align-items:center;gap:10px;max-width:1360px;margin:0 auto;padding:7px 16px;overflow-x:auto;-webkit-overflow-scrolling:touch;scrollbar-width:none}
.hts-in::-webkit-scrollbar{display:none}
.hts-lbl{flex:0 0 auto;color:#e9c970;font-family:${F.heading};font-size:11px;font-weight:900;letter-spacing:.3px;opacity:.9}
.hts-pills{display:flex;align-items:center;gap:7px;flex:0 0 auto}
.hts-pill{display:inline-flex;align-items:center;gap:6px;flex:0 0 auto;text-decoration:none;white-space:nowrap;
  color:#ffe6ad;background:rgba(212,175,55,0.10);border:1px solid rgba(212,175,55,0.32);border-radius:999px;
  padding:6px 13px;font-family:${F.heading};font-size:12.5px;font-weight:700;transition:background .15s,border-color .15s,color .15s}
.hts-pill:hover{background:linear-gradient(135deg,#f6dd92,#d4af37);border-color:#f6dd92;color:#1a0e00}
.hts-e{font-size:14px;line-height:1}
.hts-all{flex:0 0 auto;margin-inline-start:auto;text-decoration:none;white-space:nowrap;color:#e9c970;
  font-family:${F.heading};font-size:11.5px;font-weight:800;opacity:.85;transition:opacity .15s,color .15s}
.hts-all:hover{opacity:1;color:#ffd86b}
@media (max-width:640px){
  .hts-lbl{display:none}
  .hts-in{padding:6px 12px;gap:8px}
  .hts-pill{font-size:12px;padding:6px 11px}
  .hts-all{font-size:11px}
}
`;
