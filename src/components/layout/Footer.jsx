import React from "react";
import { Link } from "react-router-dom";
import { C, F, LOGO_URL } from "../../theme.js";
import UpdatesBox from "../UpdatesBox.jsx";

// עמודות נושאיות לפי המוקאפ — ההיכל (כלים) · הגנזך (תוכן) · השער (קשר והצטרפות)
const COLUMNS = [
  {
    title: "ההיכל",
    links: [
      { label: "עץ המספרים", to: "/numbers" },
      { label: "ציר ההתגלות", to: "/timeline" },
      { label: 'הצופן התנ"כי', to: "/code" },
      { label: "מספרי־אם", to: "/beit-midrash/em" },
    ],
  },
  {
    title: "הגנזך",
    links: [
      { label: "פוסטים", to: "/post" },
      { label: "ארכיון ההתגלות", to: "/archive" },
      { label: "בית המדרש", to: "/beit-midrash" },
      { label: "בני ההיכל", to: "/members" },
    ],
  },
  {
    title: "השער",
    links: [
      { label: "כאן מתחילים", to: "/start" },
      { label: "מרכז הניווט", to: "/map" },
      { label: "אודות", to: "/about" },
      { label: "קהילה", to: "/community" },
    ],
  },
];

const SOCIAL = [
  { label: "Facebook", href: "https://www.facebook.com/sod1820", path: "M13 22v-9h3l.5-3.5H13V7.2c0-1 .3-1.7 1.8-1.7H17V2.3C16.6 2.2 15.4 2 14 2c-2.9 0-4.8 1.7-4.8 4.9V9.5H6V13h3.2v9H13z" },
  { label: "TikTok", href: "https://www.tiktok.com/@sod_1820", path: "M16.6 5.8a4.3 4.3 0 0 1-1-2.8h-3.3v12.1a2.4 2.4 0 1 1-2.4-2.4c.2 0 .5 0 .7.1V9.5a5.7 5.7 0 0 0-.7 0 5.6 5.6 0 1 0 5.6 5.6V9.3a7.5 7.5 0 0 0 4.3 1.4V7.4a4.3 4.3 0 0 1-3.2-1.6z" },
];

export default function Footer() {
  return (
    <footer style={{
      borderTop: `1px solid ${C.border}`,
      background: `linear-gradient(180deg, ${C.surface2} 0%, ${C.surface} 100%)`,
      padding: "56px 36px 28px",
      direction: "rtl",
      position: "relative",
      zIndex: 1,
    }}>
      <UpdatesBox variant="inline" source="footer" />

      <div style={{
        maxWidth: 1040, margin: "0 auto", display: "flex",
        justifyContent: "space-between", alignItems: "flex-start",
        flexWrap: "wrap", gap: 36, paddingBottom: 36,
      }}>
        {/* מותג */}
        <div style={{ minWidth: 240, flex: 1.4, maxWidth: 320 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 14 }}>
            <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 40, width: "auto" }} />
            <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 22, fontWeight: 700, lineHeight: 1.1 }}>
              סוד 1820
            </div>
          </div>
          <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700, marginBottom: 8 }}>
            השפה האלוקית של היקום
          </div>
          <div style={{ fontSize: 12.5, color: C.muted, fontFamily: F.body, lineHeight: 1.9, maxWidth: 290 }}>
            עשר שנות מחקר · מאגר חי · וכלים לקרוא את המציאות בשפת המספרים.
          </div>
          <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
            {SOCIAL.map(s => (
              <a key={s.label} href={s.href} target="_blank" rel="noopener noreferrer" aria-label={s.label} title={s.label}
                style={{
                  width: 40, height: 40, borderRadius: "50%", border: `1px solid ${C.borderGold}`,
                  background: C.surface2, display: "inline-flex", alignItems: "center", justifyContent: "center",
                  color: C.goldBright, transition: "all 0.2s",
                }}
                onMouseEnter={e => { e.currentTarget.style.background = C.gold; e.currentTarget.style.color = C.bg; e.currentTarget.style.boxShadow = `0 0 16px ${C.goldDim}`; }}
                onMouseLeave={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.color = C.goldBright; e.currentTarget.style.boxShadow = "none"; }}
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d={s.path} /></svg>
              </a>
            ))}
          </div>
        </div>

        {/* עמודות הקישורים */}
        {COLUMNS.map(col => (
          <div key={col.title} style={{ minWidth: 150 }}>
            <div style={{ fontSize: 13, color: C.goldLight, fontFamily: F.regal, fontWeight: 700, marginBottom: 14 }}>
              {col.title}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {col.links.map(l => (
                <Link key={l.to} to={l.to} style={{
                  color: C.goldDim, textDecoration: "none", fontSize: 13,
                  fontFamily: F.body, padding: "6px 0", transition: "color 0.18s",
                }}
                  onMouseEnter={e => { e.currentTarget.style.color = C.goldBright; }}
                  onMouseLeave={e => { e.currentTarget.style.color = C.goldDim; }}
                >{l.label}</Link>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div style={{
        maxWidth: 1040, margin: "0 auto", paddingTop: 26,
        borderTop: `1px solid ${C.faint}`, display: "flex",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        fontSize: 11, color: C.muted, fontFamily: F.heading, letterSpacing: 1,
      }}>
        <span>© {new Date().getFullYear()} סוד 1820 · כל הזכויות שמורות</span>
        <span style={{ color: C.goldBright, fontFamily: F.royal, letterSpacing: 2 }}>כי לה' המלוכה</span>
      </div>
    </footer>
  );
}
