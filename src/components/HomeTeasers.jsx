import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import HomeHeader from "./HomeHeader.jsx";

// ✨ טעימות מהמחקר — «החומר היפה מהמייל» (בקשת צוריאל): 6 וו-ים מסקרנים שמראים את הרוחב
//    (מציאות · תרבות · צופן · שפה · קהילה). כל אחד מצביע ליעד הקנוני (עץ אחד — מצביע, לא עותק).
//    אצור ידני; לעריכה עתידית — לשנות את TEASERS (או להעביר לטבלת-אדמין).
const TEASERS = [
  { e: "🌍", cat: "המציאות", t: "«אבן מעמסה לכל העמים»", h: "שר החוץ הטורקי מצטט את נבואת זכריה — במקרה, או הד לאותו פסוק עתיק?", to: "/" + encodeURIComponent("אבן-מעמסה-פידאן-זכריה") },
  { e: "🎬", cat: "התרבות", t: "מטריקס — 506", h: "«סוד · כוח · דעת · מערכת» = 506. למה דווקא המספר הזה חוזר שוב ושוב?", to: "/matrix-506" },
  { e: "🦑", cat: "התרבות", t: "משחקי הדיונון", h: "דיונון = עבדים = 126. צירוף מקרים — או מפה שהוסתרה?", to: "/squid-game-456" },
  { e: "🌐", cat: "שבילי שפה", t: "גם האנגלית מגלה", h: "Bereshit = 86 = אלהים. איך הרמז ממשיך גם מעבר לעברית?", to: "/chibur-bein-hasafot-mafteach-lagan" },
  { e: "🔠", cat: "הצופן התנ״כי", t: "«תורה» בדילוג 50", h: "מסוף «בראשית» — מקרי, או חתימה בתוך האותיות?", to: "/code" },
  { e: "👥", cat: "מהקהילה", t: "צופן «בעל הגמל»", h: "גולש שלנו מצא משפט שלם על קו-הצופן. מה עוד מסתתר שם?", to: "/codes/" + encodeURIComponent("בעלהגמל-116") },
];

export default function HomeTeasers() {
  const P = usePalette();
  return (
    <section className="hn-wrap" style={{ padding: "0 18px 36px" }}>
      <HomeHeader title="✨ טעימות מהמחקר" sub="רגע — זה לא רק גימטריה. מציאות, סרטים, שפות וצפנים — כל אחד מוביל לעומק" />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 12 }}>
        {TEASERS.map((x, i) => (
          <Link key={i} to={x.to}
            style={{ display: "block", textDecoration: "none", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, padding: "14px 16px", boxShadow: `0 3px 14px ${P.glow || "rgba(0,0,0,0.10)"}`, transition: "border-color .15s, transform .15s" }}
            onMouseEnter={e => { e.currentTarget.style.borderColor = P.accentText; e.currentTarget.style.transform = "translateY(-2px)"; }}
            onMouseLeave={e => { e.currentTarget.style.borderColor = P.border; e.currentTarget.style.transform = "none"; }}>
            <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 11.5, fontWeight: 800, letterSpacing: 0.5, marginBottom: 5 }}>{x.e} {x.cat}</div>
            <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16.5, fontWeight: 800, lineHeight: 1.35, marginBottom: 5 }}>{x.t}</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13.5, lineHeight: 1.65 }}>{x.h}</div>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, marginTop: 9 }}>גלו ←</div>
          </Link>
        ))}
      </div>
    </section>
  );
}
