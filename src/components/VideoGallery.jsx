import React, { useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";

// ===== גלריית הסרטים — דף הבית =====
// מסגרת זהה לחידושי AI. שורה אחת: סרטון מובלט ראשון + השאר (גלילה אופקית).
// מגיב למתג התמה (usePalette) — בהיר/כהה.

const VIOLET = "#8458ff";

// סרטון מובלט — צופן החותים (מאות אלפי צפיות)
const FEATURED = { yt: "Jp0pxGofPjQ", title: 'צופן חותים בתורה (דילוג 5784) — הצופן שזכה למאות אלפי צפיות', slug: "%d7%a6%d7%95%d7%a4%d7%9f-%d7%9e%d7%93%d7%94%d7%99%d7%9d-%d7%91%d7%aa%d7%95%d7%a8%d7%94-%d7%91%d7%93%d7%99%d7%9c%d7%95%d7%92-5784-%d7%97%d7%95%d7%aa%d7%99%d7%9d-%d7%90%d7%99%d7%a8%d7%9f-%d7%92%d7%90", feat: true };

const VIDEOS = [
  { yt: "PAzHf6Flzsk", title: 'צופן התורה לקראת חג השבועות "יום משיח בא"', slug: "%d7%a6%d7%95%d7%a4%d7%9f-%d7%9e%d7%93%d7%94%d7%99%d7%9d-%d7%91%d7%aa%d7%95%d7%a8%d7%94-%d7%99%d7%95%d7%9d-%d7%9e%d7%a9%d7%99%d7%97-%d7%91%d7%90-%d7%94%d7%a4%d7%aa%d7%a2%d7%95%d7%aa-%d7%a8%d7%91" },
  { yt: "9L8KHXPdcxI", title: 'גימטריות ליל הסדר תשפ"ו · רמזי שנת 5786', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%94%d7%97%d7%98%d7%95%d7%a4%d7%99%d7%9d-%d7%94%d7%90%d7%97%d7%a8%d7%95%d7%a0%d7%99%d7%9d-%d7%91%d7%a2%d7%96%d7%94-%d7%a8%d7%9e%d7%96%d7%99-%d7%a9%d7%a0%d7%aa" },
  { yt: "DClJVGBMCs0", title: 'המבצע בתימן "צלצולי פעמונים" של משיח', slug: "%d7%91%d7%a4%d7%a8%d7%a9%d7%aa-%d7%9b%d7%99-%d7%aa%d7%a6%d7%90-%d7%98%d7%a8%d7%90%d7%9e%d7%a4-%d7%a9%d7%99%d7%a0%d7%94-%d7%90%d7%aa-%d7%a9%d7%9d-%d7%9e%d7%a9%d7%a8%d7%93-%d7%94%d7%94%d7%92%d7%a0%d7%94" },
  { yt: "48XUKUXAveY", title: "רמזי גאולה מהתרסקות המטוס בהודו · רמזי טראמפ", slug: "35827-2" },
  { yt: "uEygVYFmsDw", title: 'רמזי רצח צאלה גז · "עם מספרים אי אפשר להתווכח"', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%a8%d7%a6%d7%97-%d7%a6%d7%90%d7%9c%d7%94-%d7%92%d7%96-%d7%a2%d7%9d-%d7%9e%d7%a1%d7%a4%d7%a8%d7%99%d7%9d-%d7%90%d7%99-%d7%90%d7%a4%d7%a9%d7%a8-%d7%9c%d7%94%d7%aa%d7%95" },
];

function VideoCard({ v, onPlay, featured }) {
  const P = usePalette();
  return (
    <div className={`vg-item${featured ? " vg-feat" : ""}`}>
      <button onClick={() => onPlay(v)} style={{
        position: "relative", display: "block", width: "100%", aspectRatio: "16/9",
        borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
        border: `1px solid ${featured ? VIOLET : P.border}`, background: "#000",
        boxShadow: featured ? `0 0 24px ${VIOLET}66` : "none",
      }} className="vg-card">
        <img src={`https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`} alt={stripHtml(v.title)} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {featured && <span style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 2, background: VIOLET, color: "#fff", fontFamily: F.heading, fontSize: 11, fontWeight: 800, padding: "3px 10px", borderRadius: 999 }}>⭐ מומלץ</span>}
        <div style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 45%, rgba(0,0,0,.55))" }} />
        <div className="vg-play" style={{
          position: "absolute", top: "50%", left: "50%", transform: "translate(-50%,-50%)",
          width: 54, height: 54, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
          background: `${VIOLET}e6`, boxShadow: `0 0 24px ${VIOLET}aa`, transition: "transform .2s ease",
        }}>
          <span style={{ color: "#fff", fontSize: 20, marginInlineStart: 3 }}>▶</span>
        </div>
      </button>
      <div style={{ marginTop: 9, color: P.accentText, fontFamily: F.royal, fontSize: 14, fontWeight: 700, lineHeight: 1.55, direction: "rtl" }}>
        {stripHtml(v.title)}
      </div>
    </div>
  );
}

// ריבוע "בקרוב" ריק
function ComingCard() {
  const P = usePalette();
  return (
    <div>
      <div style={{
        display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8,
        width: "100%", aspectRatio: "16/9", borderRadius: 12,
        border: `1px dashed ${P.borderStrong}`, background: P.cardSoft,
      }}>
        <span style={{ fontSize: 26 }}>🚧</span>
        <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 13, fontWeight: 700, letterSpacing: 2 }}>בקרוב</span>
      </div>
      <div style={{ marginTop: 9, height: 1 }} aria-hidden />
    </div>
  );
}

export default function VideoGallery() {
  const P = usePalette();
  const [playing, setPlaying] = useState(null);

  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px", direction: "rtl" }}>
      <style>{`
        .vg-card:hover .vg-play { transform: translate(-50%,-50%) scale(1.12); }
        .vg-row { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x mandatory; }
        .vg-row::-webkit-scrollbar { height: 8px; }
        .vg-row::-webkit-scrollbar-thumb { background: ${P.borderStrong}; border-radius: 999px; }
        .vg-row > .vg-item { flex: 0 0 240px; scroll-snap-align: start; }
        .vg-row > .vg-item.vg-feat { flex: 0 0 330px; }
        @media (max-width: 520px) { .vg-row > .vg-item { flex: 0 0 80%; } .vg-row > .vg-item.vg-feat { flex: 0 0 88%; } }
      `}</style>

      <div style={{
        background: P.cardGrad,
        border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "26px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, flexWrap: "wrap" }}>
          <h2 style={{ color: P.accentText, fontFamily: F.regal, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, margin: 0 }}>
            🎬 גלריית הסרטים
          </h2>
          <span className="sod-soon">🚧 בבנייה</span>
          <span style={{ flex: 1 }} />
          <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700 }}>
            לכל הסרטים והפוסטים →
          </Link>
        </div>

        {/* שורה אחת — הסרטון המובלט ראשון, ואז השאר (גלילה אופקית) */}
        <div className="vg-row">
          <VideoCard v={FEATURED} onPlay={setPlaying} featured />
          {VIDEOS.map(v => <VideoCard key={v.yt} v={v} onPlay={setPlaying} />)}
        </div>
      </div>

      {/* נגן — Lightbox */}
      {playing && (
        <div onClick={() => setPlaying(null)} style={{
          position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.92)",
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{ width: "min(960px, 96vw)", direction: "rtl" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 12 }}>
              <div style={{ color: "#f6e27a", fontFamily: F.royal, fontSize: 16, fontWeight: 700 }}>{stripHtml(playing.title)}</div>
              <button onClick={() => setPlaying(null)} style={{ background: "none", border: "none", color: "#cfc9d6", fontSize: 26, cursor: "pointer", lineHeight: 1 }}>×</button>
            </div>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: `1px solid ${VIOLET}`, boxShadow: `0 0 50px ${VIOLET}44` }}>
              <iframe title={stripHtml(playing.title)} src={`https://www.youtube-nocookie.com/embed/${playing.yt}?autoplay=1&rel=0`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
            </div>
            <div style={{ textAlign: "center", marginTop: 12 }}>
              <Link to={`/${playing.slug}`} onClick={() => setPlaying(null)} style={{ color: "#f6e27a", textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                לפוסט המלא של הסרטון →
              </Link>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
