import React from "react";
import { Link } from "react-router-dom";
import { C, F, LOGO_URL } from "../../theme.js";
import { NAV } from "../../routes.jsx";
import UpdatesBox from "../UpdatesBox.jsx";

const quickLinks = NAV.filter(i => ["/start", "/map", "/timeline", "/numbers", "/post", "/archive", "/code", "/community", "/members", "/about"].includes(i.to));

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
        flexWrap: "wrap", gap: 32, paddingBottom: 36,
      }}>
        <div style={{ minWidth: 240, flex: 1, maxWidth: 300 }}>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 12, marginBottom: 18 }}>
            <img src={LOGO_URL} alt="SOD1820" className="logo-animated" style={{ height: 36, width: "auto" }} />
            <div>
              <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 14, fontWeight: 800, lineHeight: 1.2 }}>
                כי לה' המלוכה
              </div>
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 9, letterSpacing: 2, marginTop: 4 }}>
                מפה חיה של שפת המספרים
              </div>
            </div>
          </div>
          <div style={{ fontSize: 12, color: C.muted, fontFamily: F.body, lineHeight: 1.8, maxWidth: 280 }}>
            צוריאל פולייס · sod1820.co.il<br />
            גימטריה, ציר התדר, עץ המספרים והצופן התנ"כי — מערכת אחת חיה.
          </div>
        </div>

        <div style={{ minWidth: 220, flex: 1 }}>
          <div style={{ fontSize: 10, color: C.muted, letterSpacing: 4, marginBottom: 16, fontFamily: F.heading, textTransform: "uppercase" }}>
            ניווט מהיר
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "2px 24px" }}>
            {quickLinks.map(n => (
              <Link key={n.to} to={n.to} style={{
                color: C.goldDim, textDecoration: "none", fontSize: 13,
                fontFamily: F.body, padding: "6px 0", display: "block",
              }}>{n.emoji} {n.label}</Link>
            ))}
          </div>
        </div>
      </div>

      <div style={{
        maxWidth: 1040, margin: "0 auto", paddingTop: 26,
        borderTop: `1px solid ${C.faint}`, display: "flex",
        justifyContent: "space-between", flexWrap: "wrap", gap: 12,
        fontSize: 11, color: C.muted, fontFamily: F.heading, letterSpacing: 1,
      }}>
        <span>© {new Date().getFullYear()} SOD1820 · צוריאל פולייס</span>
        <span style={{ color: C.goldDim }}>כל הזכויות שמורות</span>
      </div>
    </footer>
  );
}
