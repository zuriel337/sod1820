import React from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import HomeHeader from "./HomeHeader.jsx";

// ✨ טעימות מהמחקר — «החומר היפה מהמייל» בסגנון גלריית-הסרטים (בקשת צוריאל): רצועת-פוסטרים
//    אופקית 16:9 בתוך כרטיס מלכותי. 6 וו-ים שמראים את הרוחב (מציאות/תרבות/צופן/שפה/קהילה),
//    כל אחד מצביע לפוסט/צופן הקנוני האמיתי (עץ אחד — מצביע, לא עותק). אצור ידני; לעריכה — TEASERS.
const IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public";
const TEASERS = [
  { e: "🌍", cat: "המציאות", t: "«אבן מעמסה לכל העמים»", h: "שר החוץ הטורקי מצטט את נבואת זכריה — במקרה, או הד לפסוק עתיק?", to: "/" + encodeURIComponent("אבן-מעמסה-פידאן-זכריה"), img: `${IMG}/gallery/posts/reality/fidan-even-maamasa-2701.jpg` },
  { e: "🎬", cat: "התרבות", t: "מטריקס — 506", h: "«סוד · כוח · דעת · מערכת» = 506. למה המספר הזה חוזר?", to: "/matrix-506", img: `${IMG}/gallery/posts/matrix-506-20260626081545.jpg` },
  { e: "🦑", cat: "התרבות", t: "משחקי הדיונון", h: "דיונון = עבדים = 126. צירוף מקרים — או מפה שהוסתרה?", to: "/squid-game-456", img: `${IMG}/gallery/posts/squid-game-cover-20260626.png` },
  { e: "🌐", cat: "שבילי שפה", t: "גם האנגלית מגלה", h: "Bereshit = 86 = אלהים. איך הרמז ממשיך מעבר לעברית?", to: "/chibur-bein-hasafot-mafteach-lagan", img: `${IMG}/media/sod1820/posts/shvilei-safa-emblem.png` },
  { e: "👥", cat: "מהקהילה", t: "צופן «בעל הגמל»", h: "גולש שלנו מצא משפט שלם על קו-הצופן. מה עוד מסתתר?", to: "/codes/" + encodeURIComponent("בעלהגמל-116"), img: `${IMG}/gallery/sod1820/ciphers/c-mruunqfd-nse64o.png` },
  { e: "🔠", cat: "הצופן התנ״כי", t: "«תורה» בדילוג 50", h: "מסוף «בראשית» — מקרי, או חתימה בתוך האותיות?", to: "/code", img: null },
];

function TeaserTile({ x }) {
  const P = usePalette();
  return (
    <Link className="tz-item" to={x.to} style={{ textDecoration: "none" }}>
      <div className="tz-poster" style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: `1px solid ${P.border}`, background: `linear-gradient(135deg, ${P.cardSoft}, ${P.card})` }}>
        {x.img
          ? <img src={x.img} alt={x.t} loading="lazy" decoding="async" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
          : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", fontSize: 44 }}>{x.e}</div>}
        <span style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 2, background: "rgba(10,7,20,0.72)", color: "#f6e27a", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, padding: "3px 10px", borderRadius: 999, backdropFilter: "blur(3px)" }}>{x.e} {x.cat}</span>
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 48%, rgba(0,0,0,.62))" }} />
        <div style={{ position: "absolute", insetInline: 0, bottom: 0, padding: "10px 12px", color: "#fff", fontFamily: F.royal, fontSize: 15.5, fontWeight: 800, lineHeight: 1.35, direction: "rtl", textShadow: "0 1px 6px rgba(0,0,0,.7)" }}>{x.t}</div>
      </div>
      <div style={{ marginTop: 8, color: P.inkSoft, fontFamily: F.body, fontSize: 12.5, lineHeight: 1.55, direction: "rtl" }}>{x.h}</div>
      <div style={{ marginTop: 5, color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800, direction: "rtl" }}>גלו ←</div>
    </Link>
  );
}

export default function HomeTeasers() {
  const P = usePalette();
  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px 34px", direction: "rtl" }}>
      <style>{`
        .tz-row { display:flex; gap:16px; overflow-x:auto; padding-bottom:10px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }
        .tz-row::-webkit-scrollbar { height:8px; }
        .tz-row::-webkit-scrollbar-thumb { background:${P.borderStrong}; border-radius:999px; }
        .tz-row > .tz-item { flex:0 0 262px; scroll-snap-align:start; }
        .tz-item .tz-poster { transition: transform .18s ease, border-color .18s ease; }
        .tz-item:hover .tz-poster { transform: translateY(-3px); border-color:${P.accentText}; }
        @media (max-width:520px) { .tz-row > .tz-item { flex:0 0 82%; } }
      `}</style>
      <div style={{ background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "24px 22px", boxShadow: "0 20px 60px rgba(0,0,0,0.4)" }}>
        <HomeHeader title="✨ טעימות מהמחקר" sub="רגע — זה לא רק גימטריה. מציאות, סרטים, שפות וצפנים — כל אחד מוביל לעומק"
          action={{ label: "לכל הרמזים והפוסטים →", to: "/post" }} />
        <div className="tz-row">
          {TEASERS.map((x, i) => <TeaserTile key={i} x={x} />)}
        </div>
      </div>
    </section>
  );
}
