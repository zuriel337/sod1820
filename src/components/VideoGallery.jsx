import React, { useState } from "react";
import { Link } from "react-router-dom";
import { C, F } from "../theme.js";
import { stripHtml } from "../lib/format.js";

// ===== גלריית הסרטים — דף הבית (לרוחב) =====
// 🚧 בבנייה: סרטונים אמיתיים מהפוסטים. לחיצה פותחת נגן; אפשר גם לעבור לפוסט המלא.
// בהמשך תיטען אוטומטית מכל הפוסטים עם וידאו (319 כאלה).

const VIOLET = "#8458ff";

const VIDEOS = [
  { yt: "PAzHf6Flzsk", title: 'צופן התורה לקראת חג השבועות "יום משיח בא"', slug: "%d7%a6%d7%95%d7%a4%d7%9f-%d7%9e%d7%93%d7%94%d7%99%d7%9d-%d7%91%d7%aa%d7%95%d7%a8%d7%94-%d7%99%d7%95%d7%9d-%d7%9e%d7%a9%d7%99%d7%97-%d7%91%d7%90-%d7%94%d7%a4%d7%aa%d7%a2%d7%95%d7%aa-%d7%a8%d7%91" },
  { yt: "9L8KHXPdcxI", title: 'גימטריות ליל הסדר תשפ"ו · רמזי שנת 5786', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%94%d7%97%d7%98%d7%95%d7%a4%d7%99%d7%9d-%d7%94%d7%90%d7%97%d7%a8%d7%95%d7%a0%d7%99%d7%9d-%d7%91%d7%a2%d7%96%d7%94-%d7%a8%d7%9e%d7%96%d7%99-%d7%a9%d7%a0%d7%aa" },
  { yt: "DClJVGBMCs0", title: 'המבצע בתימן "צלצולי פעמונים" של משיח', slug: "%d7%91%d7%a4%d7%a8%d7%a9%d7%aa-%d7%9b%d7%99-%d7%aa%d7%a6%d7%90-%d7%98%d7%a8%d7%90%d7%9e%d7%a4-%d7%a9%d7%99%d7%a0%d7%94-%d7%90%d7%aa-%d7%a9%d7%9d-%d7%9e%d7%a9%d7%a8%d7%93-%d7%94%d7%94%d7%92%d7%a0%d7%94" },
  { yt: "48XUKUXAveY", title: "רמזי גאולה מהתרסקות המטוס בהודו · רמזי טראמפ", slug: "35827-2" },
  { yt: "uEygVYFmsDw", title: 'רמזי רצח צאלה גז · "עם מספרים אי אפשר להתווכח"', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%a8%d7%a6%d7%97-%d7%a6%d7%90%d7%9c%d7%94-%d7%92%d7%96-%d7%a2%d7%9d-%d7%9e%d7%a1%d7%a4%d7%a8%d7%99%d7%9d-%d7%90%d7%99-%d7%90%d7%a4%d7%a9%d7%a8-%d7%9c%d7%94%d7%aa%d7%95" },
  { yt: "8nHYkXA7q34", title: "רמזי נאום טראמפ בהשבעתו לנשיאות 2025", slug: "%d7%90-%d7%9c%d7%95%d7%94%d7%99%d7%9d-%d7%94%d7%a6%d7%99%d7%9c-%d7%90%d7%95%d7%aa%d7%99-%d7%9b%d7%93%d7%99-%d7%a9%d7%90%d7%97%d7%96%d7%99%d7%a8-%d7%90%d7%aa-%d7%90%d7%9e%d7%a8%d7%99%d7%a7%d7%94" },
  { yt: "G0r77V2qIMU", title: "ביבי מול כל העולם… ה' שומר עליו", slug: "%d7%91%d7%99%d7%91%d7%99-%d7%9e%d7%95%d7%9c-%d7%9b%d7%9c-%d7%94%d7%a2%d7%95%d7%9c%d7%9d-%d7%94-%d7%a9%d7%95%d7%9e%d7%a8-%d7%a2%d7%9c%d7%99%d7%95" },
  { yt: "YcdqSTR2F5s", title: "רמזים רבים על כיבוש החרמון והתהליך בסוריה", slug: "%d7%a8%d7%9e%d7%96%d7%99%d7%9d-%d7%a8%d7%91%d7%99%d7%9d-%d7%a2%d7%9c-%d7%9b%d7%99%d7%91%d7%95%d7%a9-%d7%94%d7%97%d7%a8%d7%9e%d7%95%d7%9f-%d7%95%d7%94%d7%aa%d7%94%d7%9c%d7%99%d7%9a-%d7%91%d7%a1%d7%95" },
  { yt: "bnfx4mbT2Tw", title: "מפלת דמשק בנבואת ירמיה ובדברי חז״ל", slug: "%d7%9e%d7%a4%d7%9c%d7%aa-%d7%93%d7%9e%d7%a9%d7%a7-%d7%91%d7%a0%d7%91%d7%95%d7%90%d7%aa-%d7%99%d7%a8%d7%9e%d7%99%d7%94-%d7%95%d7%91%d7%93%d7%91%d7%a8%d7%99-%d7%97%d7%96%d7%9c-%d7%9c%d7%90-%d7%99" },
  { yt: "s9q3utU1j1E", title: "ויהי אור · הרב גדעון הולנדר", slug: "%d7%9e%d7%a9%d7%99%d7%97-%d7%9b%d7%91%d7%93-%d7%9c%d7%91-%d7%90%d7%95-%d7%9e%d7%9c%d7%9a-%d7%94%d7%a8%d7%91-%d7%92%d7%93%d7%a2%d7%95%d7%9f-%d7%94%d7%95%d7%9c%d7%a0%d7%93%d7%a8" },
  { yt: "yLFh9hV7Ofo", title: "מיצר הורמוז · האם לקראת מלחמת אחרית הימים? · אלון לוי", slug: "%d7%90%d7%9c%d7%95%d7%9f-%d7%9c%d7%95%d7%99-%d7%9c%d7%a9%d7%9e%d7%95%d7%a2-%d7%90%d7%aa-%d7%a7%d7%95%d7%9c-%d7%94%d7%91%d7%95%d7%a8%d7%90" },
  { yt: "kZSqVcWYjVY", title: "הרבנות הראשית ציונית? · הרב יהודה שלוש", slug: "%d7%94%d7%a8%d7%91%d7%a0%d7%95%d7%aa-%d7%94%d7%a8%d7%90%d7%a9%d7%99%d7%aa-%d7%a6%d7%99%d7%95%d7%a0%d7%99%d7%aa-%d7%94%d7%aa%d7%a9%d7%95%d7%91%d7%94-%d7%a9%d7%9c-%d7%94%d7%a8%d7%91-%d7%99%d7%94%d7%95" },
];

function VideoCard({ v, onPlay }) {
  return (
    <div style={{ flex: "0 0 auto", width: 300, scrollSnapAlign: "start" }}>
      <button onClick={() => onPlay(v)} style={{
        position: "relative", display: "block", width: "100%", aspectRatio: "16/9",
        borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
        border: `1px solid ${C.border}`, background: "#000",
      }} className="vg-card">
        <img src={`https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`} alt={stripHtml(v.title)} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.55))" }} />
        <div className="vg-play" style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: `${VIOLET}e6`, boxShadow: `0 0 24px ${VIOLET}aa`, transition: "transform .2s ease",
        }}>
          <span style={{ color: "#fff", fontSize: 20, marginInlineStart: 3 }}>▶</span>
        </div>
      </button>
      <div style={{ marginTop: 9, color: C.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700, lineHeight: 1.55, direction: "rtl" }}>
        {stripHtml(v.title)}
      </div>
    </div>
  );
}

export default function VideoGallery() {
  const [playing, setPlaying] = useState(null);

  return (
    <section style={{ direction: "rtl", padding: "20px 0 8px", position: "relative", zIndex: 1 }}>
      <style>{`
        .vg-card:hover .vg-play { transform: translate(-50%,-50%) scale(1.12); }
        .vg-scroll::-webkit-scrollbar { height: 8px; }
        .vg-scroll::-webkit-scrollbar-thumb { background: ${C.border}; border-radius: 99px; }
      `}</style>

      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "0 18px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16, flexWrap: "wrap" }}>
          <span style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase" }}>
            🎬 גלריית הסרטים
          </span>
          <span style={{
            padding: "3px 11px", borderRadius: 999, border: `1px solid ${C.borderGold}`,
            color: C.goldBright, fontFamily: F.heading, fontSize: 10.5, letterSpacing: 1,
            background: "rgba(212,175,55,0.08)",
          }}>🚧 בבנייה</span>
          <Link to="/post" style={{ marginInlineStart: "auto", color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
            לכל הסרטים והפוסטים →
          </Link>
        </div>
      </div>

      {/* גלילה לרוחב — מלוא רוחב המסך */}
      <div className="vg-scroll" style={{
        display: "flex", gap: 18, overflowX: "auto", scrollSnapType: "x mandatory",
        padding: "4px max(18px, calc((100vw - 1360px) / 2 + 18px)) 18px",
      }}>
        {VIDEOS.map(v => <VideoCard key={v.yt} v={v} onPlay={setPlaying} />)}
      </div>

      {/* נגן — Lightbox */}
      {playing && (
        <div onClick={() => setPlaying(null)} style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(960px, 96vw)", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <div style={{ color: C.goldBright, fontFamily: F.royal, fontSize: 16, fontWeight: 700 }}>{stripHtml(playing.title)}</div>
              <button onClick={() => setPlaying(null)} style={{ background: "none", border: "none", color: C.goldDim, fontSize: 26, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: `1px solid ${C.borderGold}`, boxShadow: `0 0 50px ${VIOLET}44` }}>
              <iframe title={stripHtml(playing.title)} src={`https://www.youtube-nocookie.com/embed/${playing.yt}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link to={`/${playing.slug}`} onClick={() => setPlaying(null)} style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                לפוסט המלא של הסרטון →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
