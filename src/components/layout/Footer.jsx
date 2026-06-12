import React from "react";
import { Link } from "react-router-dom";
import { C, F, LOGO_URL } from "../../theme.js";
import UpdatesBox from "../UpdatesBox.jsx";

// עמודות נושאיות — ההיכל (כלים) · הגנזך (תוכן) · השער (קשר והצטרפות)
const COLUMNS = [
  {
    title: "ההיכל",
    links: [
      { label: "עץ המספרים", to: "/numbers" },
      { label: "ציר ההתגלות", to: "/timeline" },
      { label: 'הצופן התנ"כי', to: "/code" },
      { label: "מספרי אם", to: "/beit-midrash/em" },
    ],
  },
  {
    title: "הגנזך",
    links: [
      { label: "פוסטים", to: "/post" },
      { label: "בית המדרש", to: "/beit-midrash" },
      { label: "בני ההיכל", to: "/members" },
      { label: "קהילה", to: "/community" },
    ],
  },
  {
    title: "השער",
    links: [
      { label: "כאן מתחילים", to: "/start" },
      { label: "מרכז הניווט", to: "/map" },
      { label: "אודות", to: "/about" },
      { label: "צור קשר", to: "/contact" },
    ],
  },
];

// רשתות — אייקון = path (SVG) או emoji
const SOCIAL = [
  { label: "אינסטגרם", href: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp", emoji: "📷" },
  { label: "פייסבוק", href: "https://www.facebook.com/share/1ECyfiRu3e/", path: "M13 22v-9h3l.5-3.5H13V7.2c0-1 .3-1.7 1.8-1.7H17V2.3C16.6 2.2 15.4 2 14 2c-2.9 0-4.8 1.7-4.8 4.9V9.5H6V13h3.2v9H13z" },
  { label: "וואטסאפ", href: "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql", emoji: "💬" },
  { label: "TikTok", href: "https://www.tiktok.com/@sod_1820", path: "M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.3v12.1a2.4 2.4 0 1 1-2.4-2.4c.2 0 .5 0 .7.1V9.5a5.7 5.7 0 0 0-.7 0 5.6 5.6 0 1 0 5.6 5.6V9.3a7.5 7.5 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z" },
];

const FOOTER_CSS = `
  .foot { border-top: 1px solid ${C.border}; background: linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%);
    padding: 52px 28px 26px; direction: rtl; position: relative; z-index: 1; }
  .foot-main { max-width: 1040px; margin: 0 auto; display: flex; justify-content: space-between;
    align-items: flex-start; flex-wrap: wrap; gap: 36px; padding-bottom: 34px; }
  .foot-brand { min-width: 240px; flex: 1.4; max-width: 340px; }
  .foot-cols { display: flex; gap: 40px; flex-wrap: wrap; }
  .foot-col { min-width: 130px; }
  .foot-bottom { max-width: 1040px; margin: 0 auto; padding-top: 22px; border-top: 1px solid ${C.faint};
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px 18px;
    font-size: 11px; color: ${C.muted}; font-family: ${F.heading}; letter-spacing: 0.5px; }

  /* לוגו עם סריקת-AI */
  .foot-logo { position: relative; width: 46px; height: 46px; flex-shrink: 0; }
  .foot-logo img { width: 46px; height: 46px; object-fit: contain; position: relative; z-index: 2; }
  .foot-logo .ai-ring { position: absolute; inset: -7px; border: 1px dashed rgba(212,175,55,0.55);
    border-radius: 50%; animation: foot-ring 9s linear infinite; }
  .foot-logo .ai-ring::before { content: "AI"; position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
    font-family: ${F.mono}; font-size: 8px; font-weight: 800; color: ${C.goldBright};
    background: ${C.surface}; padding: 0 3px; letter-spacing: 1px; }
  .foot-logo .ai-scan { position: absolute; inset: 0; overflow: hidden; border-radius: 8px; z-index: 3; pointer-events: none; }
  .foot-logo .ai-scan::after { content: ""; position: absolute; left: -10%; right: -10%; height: 34%;
    background: linear-gradient(180deg, transparent, rgba(246,226,122,0.55), transparent);
    animation: foot-scan 2.8s ease-in-out infinite; }
  @keyframes foot-ring { to { transform: rotate(360deg); } }
  @keyframes foot-scan { 0% { transform: translateY(-130%); } 100% { transform: translateY(330%); } }

  .foot-social a { width: 40px; height: 40px; border-radius: 50%; border: 1px solid ${C.borderGold};
    background: ${C.surface2}; display: inline-flex; align-items: center; justify-content: center;
    color: ${C.goldBright}; font-size: 18px; text-decoration: none; transition: all 0.2s; }
  .foot-social a:hover { background: ${C.gold}; color: ${C.bg}; box-shadow: 0 0 16px ${C.goldDim}; }
  .foot-link { color: ${C.goldDim}; text-decoration: none; font-size: 13.5px; font-family: ${F.heading};
    padding: 6px 0; display: block; transition: color 0.18s; }
  .foot-link:hover { color: ${C.goldBright}; }

  @media (max-width: 760px) {
    .foot { padding: 40px 20px 24px; text-align: center; }
    .foot-main { flex-direction: column; align-items: center; gap: 30px; }
    .foot-brand { max-width: 100%; }
    .foot-cols { justify-content: center; gap: 30px; width: 100%; }
    .foot-col { min-width: 0; flex: 1; text-align: center; }
    .foot-brand-head, .foot-social { justify-content: center !important; }
    .foot-bottom { justify-content: center; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    .foot-logo .ai-ring, .foot-logo .ai-scan::after { animation: none; }
  }
`;

export default function Footer() {
  return (
    <footer className="foot">
      <style>{FOOTER_CSS}</style>

      <UpdatesBox variant="inline" source="footer" />

      <div className="foot-main">
        {/* מותג */}
        <div className="foot-brand">
          <div className="foot-brand-head" style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
            <span className="foot-logo">
              <span className="ai-ring" aria-hidden />
              <span className="ai-scan" aria-hidden />
              <img src={LOGO_URL} alt="SOD1820" />
            </span>
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
              סוד 1820
            </div>
          </div>
          <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, letterSpacing: 1, marginBottom: 8 }}>
            כי לה' המלוכה
          </div>
          <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            אתר רמזי הגאולה הגדול בעולם
          </div>
          <div style={{ fontSize: 13, color: C.muted, fontFamily: F.heading, lineHeight: 1.9 }}>
            13 שנות מחקר • מאגר חי • כלים לקריאת המציאות בשפת המספרים
          </div>

          <div className="foot-social" style={{ display: "flex", gap: 12, marginTop: 18 }}>
            {SOCIAL.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                {s.path
                  ? <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
                  : <span aria-hidden>{s.emoji}</span>}
              </a>
            ))}
          </div>

          {/* וואטסאפ — קבוצה + טלפון */}
          <div style={{ marginTop: 18 }}>
            <a href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 8, background: "linear-gradient(135deg,#1faa55,#128c43)",
                color: "#fff", textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800,
                padding: "10px 18px", borderRadius: 999, boxShadow: "0 0 16px rgba(31,170,85,0.35)" }}>
              💬 קבוצת הגימטריה בוואטסאפ
            </a>
            <div style={{ marginTop: 10 }}>
              <a href="https://wa.me/972556651237" target="_blank" rel="noopener noreferrer"
                style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 13 }}>
                📞 וואטסאפ ישיר · 055-6651237
              </a>
            </div>
          </div>
        </div>

        {/* עמודות הקישורים */}
        <div className="foot-cols">
          {COLUMNS.map(col => (
            <div key={col.title} className="foot-col">
              <div style={{ fontSize: 13, color: C.goldLight, fontFamily: F.regal, fontWeight: 700, marginBottom: 12 }}>
                {col.title}
              </div>
              {col.links.map(l => (
                <Link key={l.to} to={l.to} className="foot-link">{l.label}</Link>
              ))}
            </div>
          ))}
        </div>
      </div>

      <div className="foot-bottom">
        <span>© {new Date().getFullYear()} סוד 1820 · כל הזכויות שמורות</span>
        <span style={{ opacity: 0.85 }}>
          מוזיקה: "Lord of the Land" — Kevin MacLeod (incompetech.com) · CC BY 4.0
        </span>
        <span style={{ color: C.goldBright, fontFamily: F.royal, letterSpacing: 2 }}>כי לה' המלוכה</span>
      </div>
    </footer>
  );
}
