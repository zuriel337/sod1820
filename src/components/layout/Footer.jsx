import React from "react";
import { Link, useLocation } from "react-router-dom";
import { F, LOGO_URL } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { chromeColors } from "../../lib/chromeTheme.js";
import { useStream } from "../../lib/stream.js";
import StayUpdatedCTA from "../StayUpdatedCTA.jsx";

// עמודות נושאיות בגובה אחיד — ההיכל (המנועים) · מה חדש (המנועים האחרונים) · הגנזך (תוכן) · הקהילה והשער
// «בני ההיכל» הוסר (בקשת צוריאל 2.7.2026); «מה חדש» מרכז את המנועים החדשים.
const COLUMNS = [
  {
    title: "ההיכל",
    links: [
      { label: "היכל הגילוי", to: "/research" },
      { label: "בית המדרש", to: "/beit-midrash" },
      { label: "מחשבון הגימטריה", to: "/beit-midrash?tab=calc" },
      { label: "עץ ההתכנסויות", to: "/numbers" },
      { label: "דף המספר 1820", to: "/number/1820" },
    ],
  },
  {
    title: "🆕 מה חדש",
    links: [
      { label: "📡 מרכז השידורים", to: "/broadcasts" },
      { label: "✨ עדכוני אור הגאולה", to: "/community/chat" },
      { label: "זרם המציאות", to: "/archive?tab=reality" },
      { label: "אוצרות הגילוי", to: "/archive?tab=cascade" },
      { label: "המסע האישי", to: "/journey" },
      { label: "הגשת חידוש", to: "/research?tool=midrash&tab=submit" },
    ],
  },
  {
    title: "הגנזך",
    links: [
      { label: "פוסטים", to: "/post" },
      { label: "פוסטים מאומתים", to: "/verified" },
      { label: "תפילות לרפואה", to: "/tag/תפילה" },
      { label: "ארכיון ההתגלות", to: "/archive" },
      { label: "ציר ההתגלות", to: "/timeline" },
    ],
  },
  {
    title: "הקהילה והשער",
    links: [
      { label: "🌐 פורום המחקר", to: "/forum" },
      { label: "צ'אט האתר", to: "/community/chat" },
      { label: "מחשבון קהילתי", to: "/community/calculator" },
      { label: "כאן מתחילים", to: "/start" },
      { label: "מרכז הניווט", to: "/map" },
      { label: "אודות וצור קשר", to: "/contact" },
      { label: "מדיניות פרטיות", to: "/privacy" },
    ],
  },
];

// רשתות — אייקוני מותג אמיתיים (SVG) כדי שיהיו מזוהים
const SOCIAL = [
  {
    label: "אינסטגרם", href: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp",
    svg: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true">
        <rect x="2.5" y="2.5" width="19" height="19" rx="5.5" /><circle cx="12" cy="12" r="4.4" />
        <circle cx="17.6" cy="6.4" r="1.1" fill="currentColor" stroke="none" />
      </svg>
    ),
  },
  {
    label: "וואטסאפ", href: "https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql",
    svg: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M17.5 14.4c-.3-.15-1.77-.87-2.04-.97-.27-.1-.47-.15-.67.15-.2.3-.77.96-.94 1.16-.17.2-.35.22-.65.07-.3-.15-1.26-.46-2.4-1.48-.89-.79-1.49-1.77-1.66-2.07-.17-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.02-.52-.08-.15-.67-1.61-.92-2.21-.24-.58-.49-.5-.67-.51l-.57-.01c-.2 0-.52.07-.8.37-.27.3-1.04 1.02-1.04 2.48 0 1.46 1.07 2.88 1.22 3.08.15.2 2.1 3.2 5.08 4.49.71.31 1.26.49 1.69.62.71.23 1.36.2 1.87.12.57-.08 1.77-.72 2.02-1.42.25-.7.25-1.29.17-1.42-.07-.13-.27-.2-.57-.35zM12 2a10 10 0 0 0-8.5 15.3L2 22l4.8-1.5A10 10 0 1 0 12 2z" />
      </svg>
    ),
  },
  {
    label: "פייסבוק — הדף", href: "https://www.facebook.com/sod1820",
    svg: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 22v-9h3l.5-3.5H13V7.2c0-1 .3-1.7 1.8-1.7H17V2.3C16.6 2.2 15.4 2 14 2c-2.9 0-4.8 1.7-4.8 4.9V9.5H6V13h3.2v9H13z" />
      </svg>
    ),
  },
  {
    label: "פייסבוק — אישי", href: "https://www.facebook.com/share/1ECyfiRu3e/",
    svg: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M13 22v-9h3l.5-3.5H13V7.2c0-1 .3-1.7 1.8-1.7H17V2.3C16.6 2.2 15.4 2 14 2c-2.9 0-4.8 1.7-4.8 4.9V9.5H6V13h3.2v9H13z" />
      </svg>
    ),
  },
  {
    label: "TikTok", href: "https://www.tiktok.com/@sod_1820",
    svg: (
      <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <path d="M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.3v12.1a2.4 2.4 0 1 1-2.4-2.4c.2 0 .5 0 .7.1V9.5a5.7 5.7 0 0 0-.7 0 5.6 5.6 0 1 0 5.6 5.6V9.3a7.5 7.5 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z" />
      </svg>
    ),
  },
];

// רשתות "קוד המציאות" — מוצגות בפוטר רק כשהמבקר בזרם reality (אייקוני מותג simple-icons)
const RC_SOCIAL = [
  { k: "wa", label: "ערוץ וואטסאפ", href: "https://whatsapp.com/channel/0029Vb7CqG67Noa2cZUPug1k", bg: "linear-gradient(135deg,#25d366,#0e8a3c)",
    icon: "M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" },
  { k: "ig", label: "אינסטגרם", href: "https://www.instagram.com/realitycode1820", bg: "linear-gradient(135deg,#feda75,#d62976,#962fbf,#4f5bd5)",
    icon: "M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zM12 0C8.741 0 8.333.014 7.053.072 2.695.272.273 2.69.073 7.052.014 8.333 0 8.741 0 12c0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98C8.333 23.986 8.741 24 12 24c3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98C15.668.014 15.259 0 12 0zm0 5.838a6.162 6.162 0 100 12.324 6.162 6.162 0 000-12.324zM12 16a4 4 0 110-8 4 4 0 010 8zm6.406-11.845a1.44 1.44 0 100 2.881 1.44 1.44 0 000-2.881z" },
  { k: "fb", label: "פייסבוק", href: "https://www.facebook.com/346556845479563", bg: "linear-gradient(135deg,#1877f2,#0a52b8)",
    icon: "M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" },
];

const FOOTER_CSS = (cc) => `
  .foot { border-top: 1px solid ${cc.footBorder}; background: ${cc.footBg};
    padding: 32px 28px 18px; direction: rtl; position: relative; z-index: 1; }
  .foot-main { max-width: 1040px; margin: 0 auto; display: flex; justify-content: space-between;
    align-items: flex-start; flex-wrap: wrap; gap: 28px; padding-bottom: 22px; }
  .foot-brand { min-width: 230px; flex: 1.1; max-width: 300px; }
  /* ארבע עמודות בגובה אחיד ובחלוקה שווה, מיושרות לראש */
  .foot-cols { display: grid; grid-template-columns: repeat(4, minmax(108px, 1fr));
    gap: 22px 26px; align-items: start; flex: 2.4; }
  .foot-col { min-width: 0; }
  .foot-bottom { max-width: 1040px; margin: 0 auto; padding-top: 16px; border-top: 1px solid ${cc.faint};
    display: flex; justify-content: space-between; flex-wrap: wrap; gap: 10px 18px;
    font-size: 11px; color: ${cc.muted}; font-family: ${F.heading}; letter-spacing: 0.5px; }

  /* לוגו עם סריקת-AI */
  .foot-logo { position: relative; width: 46px; height: 46px; flex-shrink: 0; }
  .foot-logo img { width: 46px; height: 46px; object-fit: contain; position: relative; z-index: 2; }
  .foot-logo .ai-ring { position: absolute; inset: -7px; border: 1px dashed rgba(212,175,55,0.55);
    border-radius: 50%; animation: foot-ring 9s linear infinite; }
  .foot-logo .ai-ring::before { content: "AI"; position: absolute; top: -7px; left: 50%; transform: translateX(-50%);
    font-family: ${F.mono}; font-size: 8px; font-weight: 800; color: ${cc.goldBright};
    background: ${cc.surface}; padding: 0 3px; letter-spacing: 1px; }
  .foot-logo .ai-scan { position: absolute; inset: 0; overflow: hidden; border-radius: 8px; z-index: 3; pointer-events: none; }
  .foot-logo .ai-scan::after { content: ""; position: absolute; left: -10%; right: -10%; height: 34%;
    background: linear-gradient(180deg, transparent, rgba(246,226,122,0.55), transparent);
    animation: foot-scan 2.8s ease-in-out infinite; }
  @keyframes foot-ring { to { transform: rotate(360deg); } }
  @keyframes foot-scan { 0% { transform: translateY(-130%); } 100% { transform: translateY(330%); } }

  .foot-social a { width: 40px; height: 40px; border-radius: 50%; border: 1px solid ${cc.borderGold};
    background: ${cc.social}; display: inline-flex; align-items: center; justify-content: center;
    color: ${cc.goldBright}; font-size: 18px; text-decoration: none; transition: all 0.2s; }
  .foot-social a:hover { background: ${cc.gold}; color: ${cc.onGold}; box-shadow: 0 0 16px ${cc.goldDim}; }
  .foot-link { color: ${cc.goldDim}; text-decoration: none; font-size: 13.5px; font-family: ${F.heading};
    padding: 6px 0; display: block; transition: color 0.18s; }
  .foot-link:hover { color: ${cc.goldBright}; }

  @media (max-width: 980px) {
    .foot-cols { grid-template-columns: repeat(2, 1fr); }
  }
  @media (max-width: 760px) {
    .foot { padding: 40px 20px 24px; text-align: center; }
    .foot-main { flex-direction: column; align-items: center; gap: 30px; }
    .foot-brand { max-width: 100%; }
    .foot-cols { justify-content: center; gap: 26px; width: 100%; }
    .foot-col { min-width: 0; flex: 1; text-align: center; }
    .foot-brand-head, .foot-social { justify-content: center !important; }
    .foot-bottom { justify-content: center; text-align: center; }
  }
  @media (prefers-reduced-motion: reduce) {
    .foot-logo .ai-ring, .foot-logo .ai-scan::after { animation: none; }
  }
`;

export default function Footer() {
  const cc = chromeColors(useThemeMode());
  const { pathname } = useLocation();
  const reality = useStream() === "reality";
  const tagline = reality ? "קוד המציאות" : "כי לה' המלוכה";
  const subline = reality ? "המספרים שמאחורי המציאות" : "אתר רמזי הגאולה הגדול בעולם";
  return (
    <footer className="foot">
      <style>{FOOTER_CSS(cc)}</style>

      {/* 🌐 רצועת «מהפורום» הוסרה מהפוטר לבקשת צוריאל (לא רצויה שם). הפורום נגיש מהניווט/עמוד /forum. */}

      {/* הרשמה במייל בפוטר — מוסתרת בעמוד הבית (שם יש כבר את הקריאה הראשית מעל) */}
      {pathname !== "/" && <StayUpdatedCTA variant="footer" />}

      <div className="foot-main">
        {/* מותג */}
        <div className="foot-brand">
          <div className="foot-brand-head" style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
            <span className="foot-logo">
              <span className="ai-ring" aria-hidden />
              <span className="ai-scan" aria-hidden />
              <img src={LOGO_URL} alt="SOD1820" />
            </span>
            {/* שתי שורות מקבילות לגובה הלוגו */}
            <div style={{ display: "flex", flexDirection: "column", justifyContent: "center", lineHeight: 1.18 }}>
              <span style={{ color: cc.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700 }}>סוד 1820</span>
              <span style={{ color: cc.goldLight, fontFamily: F.regal, fontSize: 15, fontWeight: 700, letterSpacing: 1 }}>{tagline}</span>
            </div>
          </div>
          <div style={{ color: cc.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700, marginBottom: 6 }}>
            {subline}
          </div>
          <div style={{ fontSize: 12.5, color: cc.muted, fontFamily: F.heading, lineHeight: 1.8 }}>
            14 שנות מחקר • כלים לקריאת המציאות בשפת המספרים
          </div>

          {/* קריאה לעקוב בטיקטוק */}
          <div style={{ color: cc.goldDim, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.85, marginTop: 14 }}>
            🎬 המסע לא מסתיים כאן — הוא ממשיך בטיקטוק 🚀
          </div>

          <div className="foot-social" style={{ display: "flex", gap: 10, marginTop: 14 }}>
            {SOCIAL.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>
                {s.svg}
              </a>
            ))}
          </div>

          {/* וואטסאפ — קבוצה (צ'יפ קומפקטי ואחיד) */}
          <div style={{ marginTop: 12 }}>
            <a href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer"
              style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "linear-gradient(135deg,#1faa55,#128c43)",
                color: "#fff", textDecoration: "none", fontFamily: F.heading, fontSize: 10.5, fontWeight: 700,
                padding: "5px 11px", borderRadius: 999, boxShadow: "0 0 8px rgba(31,170,85,0.25)" }}>
              💬 קבוצת הוואטסאפ
            </a>
          </div>

          {/* רשתות "קוד המציאות" — רק כשהמבקר בזרם reality */}
          {reality && (
            <div style={{ marginTop: 16, paddingTop: 14, borderTop: `1px solid ${cc.faint}` }}>
              <div style={{ fontSize: 11, color: cc.muted, fontFamily: F.heading, letterSpacing: 2, marginBottom: 10 }}>🎬 קוד המציאות</div>
              <div className="foot-rc" style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {RC_SOCIAL.map(s => (
                  <a key={s.k} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                    style={{ display: "inline-flex", alignItems: "center", gap: 6, textDecoration: "none", padding: "7px 13px",
                      borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 12, color: "#fff", background: s.bg,
                      boxShadow: "0 3px 12px rgba(0,0,0,0.35)" }}>
                    <svg viewBox="0 0 24 24" width="15" height="15" fill="currentColor" aria-hidden><path d={s.icon} /></svg>
                    {s.label}
                  </a>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* עמודות הקישורים */}
        <div className="foot-cols">
          {COLUMNS.map(col => (
            <div key={col.title} className="foot-col">
              <div style={{ fontSize: 13, color: cc.goldLight, fontFamily: F.regal, fontWeight: 700, marginBottom: 12 }}>
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
          🔒 המערכת מודדת שימוש בפיצ'רים לצורך שיפור האתר, אך אינה שומרת את תוכן החיפושים האישיים
        </span>
        <span style={{ opacity: 0.85 }}>
          מוזיקה: "Strength of the Titans" — Kevin MacLeod (incompetech.com) · CC BY 4.0
        </span>
        <span style={{ color: cc.goldBright, fontFamily: F.royal, letterSpacing: 2 }}>{tagline}</span>
      </div>
    </footer>
  );
}
