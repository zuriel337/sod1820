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

const FUTURE_GATES = [
  { icon: "✦", title: "עץ המשפחה", text: "אנשים, שמות וקשרים לאורך דורות — על אותו עץ ידע." },
  { icon: "א", title: "מסעות בתוך הצופן · תלת־ממד", text: "תנועה בין אותיות, נתיבי ELS ומקורות בתוך מרחב מחקר." },
  { icon: "∞", title: "מסעות בתוך הרמזים · תלת־ממד", text: "מסע בין מספרים, אירועים, מקורות וישויות דרך אותם קשרים." },
];

const SOCIAL = [
  { label: "אינסטגרם", href: "https://www.instagram.com/zuriel7676?igsh=ZnJodWtxcnh1Y3dp", glyph: "◎" },
  { label: "פייסבוק", href: "https://www.facebook.com/sod1820", glyph: "f" },
  { label: "TikTok", href: "https://www.tiktok.com/@sod_1820", glyph: "♪" },
];

const FOOTER_CSS = (cc) => `
  .foot { border-top:1px solid ${cc.footBorder}; background:${cc.footBg}; padding:26px 18px 104px; direction:rtl; position:relative; z-index:1; overflow:hidden; }
  .foot-wrap { max-width:1120px; margin:0 auto; min-width:0; }

  .foot-universe { position:relative; overflow:hidden; border:1px solid ${cc.borderGold}; border-radius:26px; min-height:330px; padding:34px 26px 28px; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; isolation:isolate;
    background:
      radial-gradient(circle at 50% 36%, rgba(218,177,79,.20) 0 2px, transparent 3px),
      radial-gradient(circle at 18% 26%, rgba(255,226,142,.70) 0 1px, transparent 2px),
      radial-gradient(circle at 77% 18%, rgba(255,236,180,.52) 0 1px, transparent 2px),
      radial-gradient(circle at 86% 70%, rgba(212,175,55,.50) 0 1px, transparent 2px),
      radial-gradient(circle at 32% 76%, rgba(255,236,180,.34) 0 1px, transparent 2px),
      radial-gradient(circle at 50% 42%, rgba(174,129,37,.24), transparent 34%),
      linear-gradient(180deg, rgba(8,7,13,.98), rgba(14,10,8,.98));
    box-shadow:inset 0 0 70px rgba(212,175,55,.06), 0 18px 55px rgba(0,0,0,.22); }
  .foot-universe::before { content:""; position:absolute; width:330px; height:330px; border-radius:50%; border:1px solid rgba(212,175,55,.22); box-shadow:0 0 80px rgba(212,175,55,.08); transform:rotate(-13deg); z-index:-1; }
  .foot-universe::after { content:""; position:absolute; left:5%; right:5%; bottom:-66px; height:130px; border-radius:50% 50% 0 0 / 100% 100% 0 0; border-top:1px solid rgba(212,175,55,.42); background:radial-gradient(ellipse at center top, rgba(212,175,55,.20), transparent 62%); z-index:-1; }
  .foot-orbit { position:absolute; width:250px; height:112px; border:1px solid rgba(212,175,55,.34); border-radius:50%; transform:rotate(-14deg); z-index:-1; }
  .foot-orbit.o2 { width:290px; height:92px; transform:rotate(18deg); opacity:.56; }
  .foot-star { position:absolute; width:4px; height:4px; border-radius:50%; background:${cc.goldBright}; box-shadow:0 0 12px ${cc.goldBright}; opacity:.8; }
  .foot-star.s1 { top:18%; left:17%; } .foot-star.s2 { top:28%; right:18%; } .foot-star.s3 { bottom:24%; left:27%; } .foot-star.s4 { bottom:30%; right:22%; }

  .foot-brand-logo { width:96px; height:96px; border-radius:50%; display:grid; place-items:center; background:radial-gradient(circle, rgba(212,175,55,.20), rgba(0,0,0,.12) 62%, transparent 63%); box-shadow:0 0 46px rgba(212,175,55,.20); }
  .foot-brand-logo img { width:78px; height:78px; object-fit:contain; filter:drop-shadow(0 0 12px rgba(212,175,55,.28)); }
  .foot-brand-title { margin-top:8px; color:${cc.goldBright}; font-family:${F.display}; font-size:32px; font-weight:900; line-height:1.05; }
  .foot-brand-tag { margin-top:4px; color:${cc.goldLight}; font-family:${F.ui}; font-size:19px; font-weight:800; letter-spacing:.9px; }
  .foot-brand-sub { margin-top:13px; color:${cc.muted}; font-family:${F.body}; font-size:13px; line-height:1.8; max-width:650px; }
  .foot-social { display:flex; gap:12px; margin-top:17px; justify-content:center; flex-wrap:wrap; }
  .foot-social a { width:42px; height:42px; border-radius:50%; border:1px solid ${cc.borderGold}; background:rgba(12,10,14,.72); display:grid; place-items:center; color:${cc.goldBright}; text-decoration:none; font-family:${F.ui}; font-weight:900; font-size:17px; }
  .foot-social a:hover { background:rgba(212,175,55,.14); box-shadow:0 0 18px ${cc.goldDim}; }
  .foot-wa-wrap { margin-top:12px; text-align:center; }
  .foot-wa { display:inline-flex; align-items:center; gap:7px; color:#d6f5df; text-decoration:none; border:1px solid rgba(53,186,99,.45); background:rgba(22,90,45,.18); padding:6px 11px; border-radius:999px; font-family:${F.ui}; font-size:11.5px; font-weight:800; }

  .foot-progress-card { margin-top:20px; border:1px solid ${cc.borderGold}; border-radius:24px; padding:22px; background:linear-gradient(180deg, rgba(24,18,10,.86), rgba(10,9,12,.96)); box-shadow:inset 0 0 42px rgba(212,175,55,.04); overflow:hidden; }
  .foot-progress-top { display:flex; align-items:flex-end; justify-content:space-between; gap:18px; }
  .foot-progress-kicker { color:${cc.goldLight}; font-family:${F.ui}; font-size:12px; font-weight:800; letter-spacing:.7px; }
  .foot-progress-title { color:${cc.goldBright}; font-family:${F.display}; font-size:28px; font-weight:900; margin-top:3px; }
  .foot-progress-num { color:${cc.goldBright}; font-family:${F.numeric}; font-size:48px; font-weight:900; line-height:1; white-space:nowrap; }
  .foot-progress-num span { font-size:18px; }
  .foot-progress-bar { height:11px; border-radius:999px; margin-top:16px; background:rgba(255,255,255,.07); overflow:hidden; border:1px solid rgba(212,175,55,.14); }
  .foot-progress-fill { height:100%; border-radius:inherit; background:linear-gradient(90deg, #b88924, #f4d766, #ffe986); box-shadow:0 0 16px rgba(244,215,102,.38); }
  .foot-progress-copy { margin-top:9px; color:${cc.muted}; font-family:${F.body}; font-size:12px; line-height:1.7; }
  .foot-now { margin-top:14px; padding:13px 15px; border-radius:15px; border:1px solid ${cc.faint}; background:rgba(3,3,7,.44); font-family:${F.body}; text-align:start; }
  .foot-now strong { color:${cc.goldBright}; font-size:16px; }
  .foot-now div { color:${cc.muted}; font-size:12.5px; margin-top:4px; }
  .foot-states { display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:13px; }
  .foot-state { padding:10px 11px; border-radius:13px; border:1px solid ${cc.faint}; background:rgba(8,8,10,.55); min-width:0; text-align:start; }
  .foot-state b { display:block; color:${cc.goldLight}; font-family:${F.ui}; font-size:11.5px; margin-bottom:5px; }
  .foot-state span { color:${cc.muted}; font-family:${F.body}; font-size:11.5px; line-height:1.55; }
  .foot-map-link { display:inline-flex; margin-top:13px; color:${cc.goldBright}; text-decoration:none; font-family:${F.ui}; font-size:12.5px; font-weight:800; }

  .foot-future { margin-top:18px; position:relative; overflow:hidden; border:1px solid rgba(137,104,191,.30); border-radius:23px; padding:20px; background:radial-gradient(circle at 50% 0%,rgba(126,90,179,.14),transparent 42%),linear-gradient(160deg,rgba(18,13,26,.96),rgba(8,7,12,.98)); }
  .foot-future:before { content:""; position:absolute; inset:0; pointer-events:none; background-image:radial-gradient(circle,rgba(255,232,167,.5) 0 1px,transparent 1.4px); background-size:52px 52px; opacity:.08; }
  .foot-future-head { position:relative; display:flex; justify-content:space-between; gap:12px; align-items:end; text-align:start; padding-bottom:10px; border-bottom:1px solid rgba(212,175,55,.14); }
  .foot-future-head b { color:${cc.goldBright}; font-family:${F.display}; font-size:22px; }
  .foot-future-head span { color:${cc.muted}; font-family:${F.ui}; font-size:10px; }
  .foot-future-grid { position:relative; display:grid; grid-template-columns:repeat(3,1fr); gap:10px; margin-top:12px; }
  .foot-future-card { display:flex; gap:10px; min-width:0; padding:13px; border:1px solid rgba(212,175,55,.16); border-radius:15px; background:rgba(8,7,12,.58); text-align:start; }
  .foot-future-icon { width:36px; height:36px; flex:0 0 auto; border-radius:12px; display:grid; place-items:center; border:1px solid rgba(212,175,55,.30); color:${cc.goldBright}; font-family:${F.display}; font-size:17px; font-weight:900; }
  .foot-future-card h3 { margin:1px 0 0; color:${cc.goldLight}; font-family:${F.ui}; font-size:12.5px; font-weight:900; line-height:1.35; }
  .foot-future-card p { margin:5px 0 7px; color:${cc.muted}; font-family:${F.body}; font-size:10.8px; line-height:1.55; }
  .foot-future-badge { display:inline-flex; color:#af9ad7; border:1px solid rgba(139,111,191,.28); border-radius:999px; padding:2px 7px; font-family:${F.ui}; font-size:8.5px; }

  .foot-email { margin-top:18px; border:1px solid ${cc.borderGold}; border-radius:20px; padding:8px; background:rgba(10,9,12,.76); overflow:hidden; max-width:100%; }
  .foot-email > * { max-width:100%; min-width:0; }
  .foot-email form { max-width:100%; }
  .foot-email input { max-width:100%; box-sizing:border-box; }

  .foot-nav { display:grid; grid-template-columns:repeat(3,1fr); gap:24px; margin-top:24px; padding-top:22px; border-top:1px solid ${cc.faint}; }
  .foot-col { text-align:start; min-width:0; }
  .foot-col-title { color:${cc.goldLight}; font-family:${F.ui}; font-size:17px; font-weight:900; margin-bottom:8px; text-align:start; }
  .foot-link { color:${cc.goldDim}; text-decoration:none; font-family:${F.body}; font-size:13px; padding:5px 0; display:block; transition:color .18s; text-align:start; }
  .foot-link:hover { color:${cc.goldBright}; }
  .foot-disabled { color:${cc.muted}; font-family:${F.body}; font-size:13px; padding:5px 0; display:flex; align-items:center; justify-content:flex-start; gap:7px; text-align:start; }
  .foot-badge { font-family:${F.ui}; font-size:9px; padding:2px 6px; border-radius:999px; border:1px solid ${cc.faint}; color:${cc.goldLight}; }
  .foot-meta { margin-top:20px; padding-top:14px; border-top:1px solid ${cc.faint}; display:flex; justify-content:space-between; flex-wrap:wrap; gap:9px 16px; color:${cc.muted}; font-family:${F.body}; font-size:11px; }
  .foot-meta-links { display:flex; flex-wrap:wrap; gap:12px; }
  .foot-meta a { color:${cc.muted}; text-decoration:none; }
  .foot-meta a:hover { color:${cc.goldBright}; }

  .foot-home-compact { padding-top:18px; }
  .foot-home-brand { display:flex; align-items:center; justify-content:space-between; gap:16px; padding:14px 0 4px; }
  .foot-home-id { display:flex; align-items:center; gap:10px; text-align:start; }
  .foot-home-id img { width:42px; height:42px; object-fit:contain; }
  .foot-home-id b { display:block; color:${cc.goldBright}; font-family:${F.display}; font-size:18px; }
  .foot-home-id span { display:block; color:${cc.muted}; font-family:${F.ui}; font-size:10.5px; margin-top:2px; }
  .foot-home-social { display:flex; gap:7px; flex-wrap:wrap; justify-content:flex-end; }
  .foot-home-social a { width:34px; height:34px; border-radius:50%; display:grid; place-items:center; border:1px solid ${cc.faint}; color:${cc.goldLight}; text-decoration:none; font-family:${F.ui}; font-weight:900; }

  @media (max-width: 760px) {
    .foot { padding:18px 12px 122px; }
    .foot-universe { min-height:300px; padding:28px 16px 24px; border-radius:22px; }
    .foot-brand-logo { width:84px; height:84px; }
    .foot-brand-logo img { width:68px; height:68px; }
    .foot-brand-title { font-size:28px; }
    .foot-brand-tag { font-size:17px; }
    .foot-progress-card { padding:17px 14px; border-radius:19px; }
    .foot-progress-top { align-items:center; }
    .foot-progress-title { font-size:23px; }
    .foot-progress-num { font-size:39px; }
    .foot-states { grid-template-columns:1fr; }
    .foot-future { padding:16px 14px; }
    .foot-future-head { flex-direction:column; align-items:flex-start; }
    .foot-future-grid { grid-template-columns:1fr; }
    .foot-nav { grid-template-columns:1fr; gap:0; }
    .foot-col { padding:14px 0; border-bottom:1px solid ${cc.faint}; }
    .foot-col:last-child { border-bottom:0; }
    .foot-meta { justify-content:center; text-align:center; }
    .foot-meta-links { justify-content:center; }
    .foot-home-brand { flex-direction:column; align-items:flex-start; }
    .foot-home-social { justify-content:flex-start; }
  }
  @media (max-width: 420px) {
    .foot-progress-top { flex-direction:column-reverse; align-items:flex-start; gap:8px; }
    .foot-progress-num { align-self:flex-start; }
    .foot-universe::before { width:260px; height:260px; }
    .foot-orbit { width:210px; height:92px; }
    .foot-orbit.o2 { width:240px; height:80px; }
  }
  @media (prefers-reduced-motion: reduce) { .foot-orbit { display:none; } }
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

function FooterNav() {
  return (
    <nav className="foot-nav" aria-label="ניווט תחתון">
      <FooterColumn title="לגלות" links={DISCOVER_LINKS} />
      <FooterColumn title="לחקור" links={RESEARCH_LINKS} />
      <FooterColumn title="שלי" links={PERSONAL_LINKS} />
    </nav>
  );
}

function FooterMeta() {
  return (
    <div className="foot-meta">
      <span>© {new Date().getFullYear()} סוד 1820 · כל הזכויות שמורות</span>
      <div className="foot-meta-links">
        <Link to="/start">כאן מתחילים</Link>
        <Link to="/community">קהילה</Link>
        <Link to="/contact">אודות וצור קשר</Link>
        <Link to="/privacy">מדיניות פרטיות</Link>
      </div>
    </div>
  );
}

function SocialLinks({ compact = false }) {
  return (
    <div className={compact ? "foot-home-social" : "foot-social"}>
      {SOCIAL.map((s) => <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}>{s.glyph}</a>)}
    </div>
  );
}

function HomeCompactFooter({ cc }) {
  return (
    <>
      <div className="foot-home-brand">
        <div className="foot-home-id">
          <img src={LOGO_URL} alt="" aria-hidden />
          <div><b>סוד 1820</b><span>כי לה׳ המלוכה · השער הקוסמי המלא נמצא בראש דף הבית</span></div>
        </div>
        <SocialLinks compact />
      </div>
      <FooterNav />
      <div className="foot-wa-wrap" style={{ textAlign: "start" }}>
        <a className="foot-wa" href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsappJoin("footer-home")}>💬 קבוצת הוואטסאפ</a>
      </div>
      <FooterMeta />
    </>
  );
}

export default function Footer() {
  const cc = chromeColors(useThemeMode());
  const { pathname } = useLocation();
  const isHome = ["/", "/home-new", "/בית-חדש"].includes(pathname);

  return (
    <footer className={`foot${isHome ? " foot-home-compact" : ""}`}>
      <style>{FOOTER_CSS(cc)}</style>
      <div className="foot-wrap">
        {isHome ? (
          <HomeCompactFooter cc={cc} />
        ) : (
          <>
            <div style={{ borderBottom: `1px solid ${cc.faint}`, paddingBottom: 10, marginBottom: 16 }}>
              <DimensionFiveRail compact />
            </div>

            <section className="foot-universe" aria-label="מותג SOD1820">
              <span className="foot-orbit" aria-hidden />
              <span className="foot-orbit o2" aria-hidden />
              <span className="foot-star s1" aria-hidden />
              <span className="foot-star s2" aria-hidden />
              <span className="foot-star s3" aria-hidden />
              <span className="foot-star s4" aria-hidden />
              <div className="foot-brand-logo"><img src={LOGO_URL} alt="SOD1820" /></div>
              <div className="foot-brand-title">סוד 1820</div>
              <div className="foot-brand-tag">כי לה׳ המלוכה</div>
              <div className="foot-brand-sub">14 שנות מחקר · רמזים, מספרים, מקורות וחיבורים בתוך גוף ידע אחד.</div>
              <SocialLinks />
              <div className="foot-wa-wrap">
                <a className="foot-wa" href="https://chat.whatsapp.com/FaI8Nq95NMrCvZheSrW6Ql" target="_blank" rel="noopener noreferrer" onClick={() => trackWhatsappJoin("footer")}>💬 קבוצת הוואטסאפ</a>
              </div>
            </section>

            <section className="foot-progress-card" aria-label="מצב בניית המערכת">
              <div className="foot-progress-top">
                <div>
                  <div className="foot-progress-kicker">המערכת מתפתחת בזמן אמת</div>
                  <div className="foot-progress-title">מפת הבנייה החדשה</div>
                </div>
                <div className="foot-progress-num">{BUILD_PROGRESS}<span>%</span></div>
              </div>
              <div className="foot-progress-bar" aria-hidden="true"><div className="foot-progress-fill" style={{ width: `${BUILD_PROGRESS}%` }} /></div>
              <div className="foot-progress-copy">האחוז נגזר ממפת הבנייה הציבורית של המערכת.</div>
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
            </section>

            <section className="foot-future" aria-label="בקרוב במערכת">
              <div className="foot-future-head"><b>בקרוב נפתחים שערים חדשים</b><span>עתידי · עדיין לא פעיל</span></div>
              <div className="foot-future-grid">
                {FUTURE_GATES.map((gate) => (
                  <article className="foot-future-card" key={gate.title}>
                    <div className="foot-future-icon" aria-hidden>{gate.icon}</div>
                    <div>
                      <h3>{gate.title}</h3>
                      <p>{gate.text}</p>
                      <span className="foot-future-badge">בקרוב</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>

            <div className="foot-email"><StayUpdatedCTA variant="footer" /></div>
            <FooterNav />
            <FooterMeta />
          </>
        )}
      </div>
    </footer>
  );
}
