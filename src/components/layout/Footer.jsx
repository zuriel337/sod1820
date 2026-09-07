import React from "react";
import { Link, useLocation } from "react-router-dom";
import { trackWhatsappJoin } from "../../lib/tracking.js";
import { F, LOGO_URL } from "../../theme.js";
import { useThemeMode } from "../../lib/themeMode.js";
import { chromeColors } from "../../lib/chromeTheme.js";
import StayUpdatedCTA from "../StayUpdatedCTA.jsx";
import DimensionFiveRail from "../DimensionFiveRail.jsx";
import { BUILD_PROGRESS } from "../../lib/knowledgeMap.js";

const DISCOVER_LINKS = [
  { label: "פוסטים", to: "/post" },
  { label: "מימד חמש", to: "/category/מימד חמש" },
  { label: "אור הגאולה", to: "/community/chat" },
  { label: "סוד החשמל", to: "/category/סוד החשמל" },
  { label: "ארכיון", to: "/archive" },
];

const RESEARCH_LINKS = [
  { label: "העולם", state: "בבנייה" },
  { label: "היכל", to: "/research" },
  { label: "בית המדרש", to: "/beit-midrash" },
  { label: "דף המספר", to: "/number" },
  { label: "דילוגי אותיות", to: "/code" },
];

const PERSONAL_LINKS = [
  { label: "האזור שלי", to: "/profile" },
  { label: "המחקר שלי", to: "/research" },
  { label: "העדכונים שלי", to: "/profile#notifications" },
];

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
    label: "פייסבוק", href: "https://www.facebook.com/sod1820",
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

const FOOTER_CSS = (cc) => `
  .foot { border-top: 1px solid ${cc.footBorder}; background: ${cc.footBg}; padding: 30px 22px 18px; direction: rtl; position: relative; z-index: 1; }
  .foot-wrap { max-width: 1120px; margin: 0 auto; }
  .foot-hero { display:grid; grid-template-columns:minmax(235px, .9fr) minmax(360px, 1.55fr); gap:26px; align-items:stretch; }
  .foot-card { border:1px solid ${cc.borderGold}; background:linear-gradient(180deg, ${cc.social}, transparent); border-radius:22px; padding:22px; }
  .foot-brand-head { display:flex; align-items:center; gap:14px; }
  .foot-logo { width:58px; height:58px; flex:none; display:grid; place-items:center; border-radius:18px; border:1px solid ${cc.borderGold}; background:${cc.surface}; box-shadow:0 0 28px ${cc.goldDim}; }
  .foot-logo img { width:46px; height:46px; object-fit:contain; }
  .foot-brand-title { color:${cc.goldBright}; font-family:${F.regal}; font-size:26px; font-weight:800; line-height:1.05; }
  .foot-brand-tag { color:${cc.goldLight}; font-family:${F.royal}; font-size:16px; font-weight:700; margin-top:5px; letter-spacing:.7px; }
  .foot-brand-copy { margin-top:15px; color:${cc.muted}; font-family:${F.body}; font-size:13px; line-height:1.8; }
  .foot-social { display:flex; gap:9px; margin-top:16px; flex-wrap:wrap; }
  .foot-social a { width:38px; height:38px; border-radius:50%; border:1px solid ${cc.borderGold}; background:${cc.social}; display:inline-flex; align-items:center; justify-content:center; color:${cc.goldBright}; text-decoration:none; transition:.2s; }
  .foot-social a:hover { background:${cc.gold}; color:${cc.onGold}; box-shadow:0 0 16px ${cc.goldDim}; }
  .foot-wa { margin-top:12px; display:inline-flex; align-items:center; gap:7px; background:linear-gradient(135deg,#1faa55,#128c43); color:#fff; text-decoration:none; padding:7px 13px; border-radius:999px; font-family:${F.body}; font-size:12px; font-weight:800; }

  .foot-progress-top { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; }
  .foot-progress-kicker { color:${cc.goldLight}; font-family:${F.body}; font-size:12px; font-weight:800; letter-spacing:.6px; }
  .foot-progress-title { color:${cc.goldBright}; font-family:${F.regal}; font-size:24px; font-weight:800; margin-top:5px; }
  .foot-progress-num { color:${cc.goldBright}; font-family:${F.mono}; font-size:44px; font-weight:900; line-height:1; }
  .foot-progress-num span { font-size:18px; margin-inline-start:2px; }
  .foot-progress-bar { height:9px; border-radius:999px; margin-top:17px; background:${cc.faint}; overflow:hidden; }
  .foot-progress-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg, ${cc.gold}, ${cc.goldBright}); box-shadow:0 0 14px ${cc.goldDim}; }
  .foot-progress-copy { margin-top:10px; color:${cc.muted}; font-family:${F.body}; font-size:12.5px; line-height:1.7; }
  .foot-now { margin-top:15px; padding:12px 14px; border-radius:14px; border:1px solid ${cc.faint}; background:${cc.surface}; font-family:${F.body}; }
  .foot-now strong { color:${cc.goldBright}; }
  .foot-now div { color:${cc.muted}; font-size:12.5px; margin-top:3px; }
  .foot-states { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:14px; }
  .foot-state { padding:10px 11px; border-radius:13px; border:1px solid ${cc.faint}; background:${cc.social}; }
  .foot-state b { display:block; color:${cc.goldLight}; font-family:${F.body}; font-size:11.5px; margin-bottom:5px; }
  .foot-state span { color:${cc.muted}; font-family:${F.body}; font-size:11.5px; line-height:1.55; }
  .foot-map-link { display:inline-flex; margin-top:14px; color:${cc.goldBright}; text-decoration:none; font-family:${F.body}; font-size:12.5px; font-weight:800; }

  .foot-email { margin-top:18px; }
  .foot-nav { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:28px; padding-top:24px; border-top:1px solid ${cc.faint}; }
  .foot-col-title { color:${cc.goldLight}; font-family:${F.regal}; font-size:16px; font-weight:800; margin-bottom:9px; }
  .foot-link { color:${cc.goldDim}; text-decoration:none; font-family:${F.body}; font-size:13px; padding:5px 0; display:block; transition:color .18s; }
  .foot-link:hover { color:${cc.goldBright}; }
  .foot-disabled { color:${cc.muted}; font-family:${F.body}; font-size:13px; padding:5px 0; display:flex; align-items:center; gap:7px; }
  .foot-badge { font-size:9px; padding:2px 6px; border-radius:999px; border:1px solid ${cc.faint}; color:${cc.goldLight}; }
  .foot-meta { margin-top:22px; padding-top:15px; border-top:1px solid ${cc.faint}; display:flex; justify-content:space-between; flex-wrap:wrap; gap:9px 16px; color:${cc.muted}; font-family:${F.body}; font-size:11px; }
  .foot-meta-links { display:flex; flex-wrap:wrap; gap:12px; }
  .foot-meta a { color:${cc.muted}; text-decoration:none; }
  .foot-meta a:hover { color:${cc.goldBright}; }

  @media (max-width: 840px) {
    .foot-hero { grid-template-columns:1fr; }
    .foot-nav { grid-template-columns:repeat(3,1fr); }
  }
  @media (max-width: 620px) {
    .foot { padding:24px 14px 16px; }
    .foot-card { padding:18px; border-radius:18px; }
    .foot-brand-head { justify-content:center; }
    .foot-brand-copy, .foot-social, .foot-wa-wrap { text-align:center; justify-content:center; }
    .foot-progress-top { align-items:center; }
    .foot-progress-num { font-size:38px; }
    .foot-states { grid-template-columns:1fr; }
    .foot-nav { grid-template-columns:1fr 1fr; gap:22px 18px; }
    .foot-nav .foot-col:last-child { grid-column:1 / -1; }
    .foot-meta { justify-content:center; text-align:center; }
    .foot-meta-links { justify-content:center; }
  }
`;

function FooterColumn({ title, links }) {
  return (
    <div className="foot-col">
      <div className="foot-col-title">{title}</div>
      {links.map((item) => item.to ? (
        <Link key={`${title}-${item.label}`} to={item.to} className="foot-link">{item.label}</Link>
      ) : (
        <div key={`${title}-${item.label}`} className="foot-disabled">
          <span>{item.label}</span>{item.state && <span className="foot-badge">{item.state}</span>}
        </div>
      ))}
    </div>
  );
}

export default function Footer() {
  const cc = chromeColors(useThemeMode());
  const { pathname } = useLocation();
  const isHome = ["/", "/home-new", "/בית-חדש"].includes(pathname);

  return (
    <footer className="foot">
      <style>{FOOTER_CSS(cc)}</style>
      <div className="foot-wrap">
        {!isHome && (
          <div style={{ borderBottom: `1px solid ${cc.faint}`, paddingBottom: 10, marginBottom: 18 }}>
            <DimensionFiveRail compact />
          </div>
        )}

        <div className="foot-hero">
          <section className="foot-card" aria-label="מותג SOD1820">
            <div className="foot-brand-head">
              <span className="foot-logo"><img src={LOGO_URL} alt="SOD1820" /></span>
              <div>
                <div className="foot-brand-title">סוד 1820</div>
                <div className="foot-brand-tag">כי לה׳ המלוכה</div>
              </div>
            </div>
            <div className="foot-brand-copy">14 שנות מחקר · רמזים, מספרים, מקורות וחיבורים בתוך גוף ידע אחד.</div>
            <div className="foot-social">
              {SOCIAL.map((s) => (
                <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>{s.svg}</a>
              ))}
            </div>
            <div className="foot-wa-wrap">
              <a className="foot-wa" href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsappJoin("footer")}>💬 קבוצת הוואטסאפ</a>
            </div>
          </section>

          <section className="foot-card" aria-label="מצב בניית המערכת">
            <div className="foot-progress-top">
              <div>
                <div className="foot-progress-kicker">המערכת מתפתחת בזמן אמת</div>
                <div className="foot-progress-title">מפת הבנייה החדשה</div>
              </div>
              <div className="foot-progress-num">{BUILD_PROGRESS}<span>%</span></div>
            </div>
            <div className="foot-progress-bar" aria-hidden="true"><div className="foot-progress-fill" style={{ width: `${BUILD_PROGRESS}%` }} /></div>
            <div className="foot-progress-copy">האחוז נגזר ממפת הבנייה הציבורית של המערכת — לא ממספר ידני בפוטר.</div>

            <div className="foot-now">
              <strong>עכשיו בבנייה: העולם</strong>
              <div>מרכז הידע הראשי שמחבר ישויות, נושאים, מקורות וקשרים.</div>
            </div>

            <div className="foot-states">
              <div className="foot-state"><b>● פעיל</b><span>פוסטים · ארכיון · דף המספר · בית המדרש · דילוגי אותיות</span></div>
              <div className="foot-state"><b>◐ בבנייה</b><span>העולם · המחקר שלי · מעקב ועדכונים</span></div>
              <div className="foot-state"><b>○ בהמשך</b><span>שפות · שכבות עומק · חוויות מרחביות</span></div>
            </div>
            <Link to="/map" className="foot-map-link">מפת המערכת ←</Link>

            {!isHome && <div className="foot-email"><StayUpdatedCTA variant="footer" /></div>}
          </section>
        </div>

        <nav className="foot-nav" aria-label="ניווט תחתון">
          <FooterColumn title="לגלות" links={DISCOVER_LINKS} />
          <FooterColumn title="לחקור" links={RESEARCH_LINKS} />
          <FooterColumn title="שלי" links={PERSONAL_LINKS} />
        </nav>

        <div className="foot-meta">
          <span>© {new Date().getFullYear()} סוד 1820 · כל הזכויות שמורות</span>
          <div className="foot-meta-links">
            <Link to="/start">כאן מתחילים</Link>
            <Link to="/community">קהילה</Link>
            <Link to="/contact">אודות וצור קשר</Link>
            <Link to="/privacy">מדיניות פרטיות</Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
