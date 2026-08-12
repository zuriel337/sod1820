import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { getRealityVideos } from "../lib/supabase.js";
import { track } from "../lib/tracking.js";
import { setVideoGalleryJsonLd, clearVideoGalleryJsonLd } from "../lib/seo.js";
import ShareActions from "./ShareActions.jsx";
import HomeHeader from "./HomeHeader.jsx";

// ===== גלריית הסרטים — דף הבית =====
// מסגרת זהה לחידושי AI. שורה אחת: סרטון מובלט ראשון + השאר (גלילה אופקית).
// מגיב למתג התמה (usePalette) — בהיר/כהה.
// הרשימה נמשכת מהטבלה home_videos (ניהול ע"י צוריאל דרך SQL, בלי שינוי קוד);
// נפילה חיננית לרשימת ברירת-המחדל שכאן אם הטבלה ריקה/לא נגישה.

const VIOLET = "#8458ff";
const GOLD = "#e9c84a";

// זיהוי סרטון-צופן (הצופן התנכי) — מקבל כוכב מהבהב שאי-אפשר לדלג עליו
const isCipherVid = (v) => !!(v && (v.is_cipher || v.cipher_slug));

// ברירת-מחדל (נפילה חיננית אם הטבלה ריקה/לא נגישה). is_cipher = «הצופן התנכי» בלבד
// (צופן-ELS אמיתי) → כוכב מהבהב. סרטוני-רמזים/גימטריה רגילים אינם «צופן תנכי».
const VIDEOS = [
  { yt: "Jp0pxGofPjQ", title: 'צופן חותים בתורה (דילוג 5784) — הצופן שזכה למאות אלפי צפיות', slug: "%d7%a6%d7%95%d7%a4%d7%9f-%d7%9e%d7%93%d7%94%d7%99%d7%9d-%d7%91%d7%aa%d7%95%d7%a8%d7%94-%d7%91%d7%93%d7%99%d7%9c%d7%95%d7%92-5784-%d7%97%d7%95%d7%aa%d7%99%d7%9d-%d7%90%d7%99%d7%a8%d7%9f-%d7%92%d7%90", is_cipher: true },
  { yt: "PAzHf6Flzsk", title: 'צופן התורה לקראת חג השבועות "יום משיח בא"', slug: "%d7%a6%d7%95%d7%a4%d7%9f-%d7%9e%d7%93%d7%94%d7%99%d7%9d-%d7%91%d7%aa%d7%95%d7%a8%d7%94-%d7%99%d7%95%d7%9d-%d7%9e%d7%a9%d7%99%d7%97-%d7%91%d7%90-%d7%94%d7%a4%d7%aa%d7%a2%d7%95%d7%aa-%d7%a8%d7%91", is_cipher: true },
  { yt: "9L8KHXPdcxI", title: 'גימטריות ליל הסדר תשפ"ו · רמזי שנת 5786', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%94%d7%97%d7%98%d7%95%d7%a4%d7%99%d7%9d-%d7%94%d7%90%d7%97%d7%a8%d7%95%d7%a0%d7%99%d7%9d-%d7%91%d7%a2%d7%96%d7%94-%d7%a8%d7%9e%d7%96%d7%99-%d7%a9%d7%a0%d7%aa" },
  { yt: "DClJVGBMCs0", title: 'המבצע בתימן "צלצולי פעמונים" של משיח', slug: "%d7%91%d7%a4%d7%a8%d7%a9%d7%aa-%d7%9b%d7%99-%d7%aa%d7%a6%d7%90-%d7%98%d7%a8%d7%90%d7%9e%d7%a4-%d7%a9%d7%99%d7%a0%d7%94-%d7%90%d7%aa-%d7%a9%d7%9d-%d7%9e%d7%a9%d7%a8%d7%93-%d7%94%d7%94%d7%92%d7%a0%d7%94" },
  { yt: "48XUKUXAveY", title: "רמזי גאולה מהתרסקות המטוס בהודו · רמזי טראמפ", slug: "35827-2" },
  { yt: "uEygVYFmsDw", title: 'רמזי רצח צאלה גז · "עם מספרים אי אפשר להתווכח"', slug: "%d7%a8%d7%9e%d7%96%d7%99-%d7%a8%d7%a6%d7%97-%d7%a6%d7%90%d7%9c%d7%94-%d7%92%d7%96-%d7%a2%d7%9d-%d7%9e%d7%a1%d7%a4%d7%a8%d7%99%d7%9d-%d7%90%d7%99-%d7%90%d7%a4%d7%a9%d7%a8-%d7%9c%d7%94%d7%aa%d7%95" },
];

function VideoCard({ v, onPlay }) {
  const P = usePalette();
  const cipher = isCipherVid(v);   // הצופן התנכי → כוכב מהבהב, אין הבלטת-כרטיס
  return (
    <div className="vg-item">
      <button onClick={() => onPlay(v)} aria-label={`נגן סרטון: ${stripHtml(v.title)}`} style={{
        position: "relative", display: "block", width: "100%", aspectRatio: "16/9",
        borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
        border: `1px solid ${cipher ? GOLD : P.border}`, background: "#000",
      }} className={`vg-card${cipher ? " vg-cipher" : ""}`}>
        <img src={v.poster_url || `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`} alt={stripHtml(v.title)} loading="lazy"
          style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
        {cipher && (
          <span className="vg-cipher-badge" style={{ position: "absolute", top: 8, insetInlineStart: 8, zIndex: 3, display: "inline-flex", alignItems: "center", gap: 4, background: "rgba(20,14,0,.72)", border: `1px solid ${GOLD}`, color: GOLD, fontFamily: F.heading, fontSize: 11, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>
            <span className="vg-star">⭐</span> הצופן התנכי
          </span>
        )}
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
      {v.uploaded_at && !v.pinned && (
        <div style={{ marginTop: 3, color: P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 700, direction: "rtl" }}>
          🕒 {formatDateHe(v.uploaded_at)}{v.author ? ` · ${v.author}` : ""}
        </div>
      )}
    </div>
  );
}

export default function VideoGallery() {
  const P = usePalette();
  const navigate = useNavigate();
  const [playing, setPlaying] = useState(null);
  const [rows, setRows] = useState(null); // null = טרם נטען → משתמשים בברירת-מחדל

  // 📊 מעקב הפעלת-סרטון — מזין events/visitor_events (נכס קהל-צופי-וידאו, Meta Growth OS)
  const handlePlay = (v) => {
    // פוסט-וידאו בלי מקור-ניגון מזוהה → פותחים את הפוסט המלא (שם הווידאו מתנגן)
    if (v.post_only && v.slug) {
      try { track("video", v.slug, "open_post"); } catch { /* noop */ }
      navigate("/" + v.slug);
      return;
    }
    try { track("video", v.yt || v.slug || "", "play", { title: stripHtml(v.title) }); } catch { /* noop */ }
    setPlaying(v);
  };

  useEffect(() => {
    let alive = true;
    getRealityVideos({ limit: 40 }).then(data => { if (alive) setRows(data); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // 🔍 JSON-LD (VideoObject) — כדי שגוגל יציג את הסרטונים כתוצאות-וידאו עשירות
  useEffect(() => {
    const all = (rows && rows.length) ? rows : VIDEOS;
    setVideoGalleryJsonLd(all);
    return () => clearVideoGalleryJsonLd();
  }, [rows]);

  // ⌨️ נגן: סגירה ב-Esc + נעילת גלילת-הרקע בזמן ניגון
  useEffect(() => {
    if (!playing) return;
    const onKey = (e) => { if (e.key === "Escape") setPlaying(null); };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.removeEventListener("keydown", onKey); document.body.style.overflow = prev; };
  }, [playing]);

  // סדר: **החדש ראשון** (getRealityVideos כבר ממוין לפי תאריך יורד). הכוכב המהבהב על סרטוני-הצופן
  // הוא אקסנט שאי-אפשר לדלג עליו — לא מפריע לסדר-הזמן. מקור יחיד = החומר שלנו בלבד (בלי הצפת חיזוק).
  const vkey = (v) => v.slug || v.yt || v.video_url || null;
  const list = (rows && rows.length) ? rows : VIDEOS;

  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px", direction: "rtl" }}>
      <style>{`
        .vg-card:hover .vg-play { transform: translate(-50%,-50%) scale(1.12); }
        .vg-row { display: flex; gap: 16px; overflow-x: auto; padding-bottom: 10px; scroll-snap-type: x mandatory; }
        .vg-row::-webkit-scrollbar { height: 8px; }
        .vg-row::-webkit-scrollbar-thumb { background: ${P.borderStrong}; border-radius: 999px; }
        .vg-row > .vg-item { flex: 0 0 240px; scroll-snap-align: start; }
        @media (max-width: 520px) { .vg-row > .vg-item { flex: 0 0 80%; } }
        /* ⭐ הצופן התנכי — הבהוב שאי-אפשר לדלג עליו */
        .vg-card.vg-cipher { animation: vgCipherGlow 1.8s ease-in-out infinite; }
        @keyframes vgCipherGlow {
          0%,100% { box-shadow: 0 0 0 1px ${GOLD}66, 0 0 10px ${GOLD}44; }
          50%     { box-shadow: 0 0 0 2px ${GOLD}, 0 0 22px ${GOLD}aa; }
        }
        .vg-star { display: inline-block; animation: vgStarBlink 1s steps(1,end) infinite; }
        @keyframes vgStarBlink { 0%,49% { opacity: 1; } 50%,100% { opacity: .25; } }
        @media (prefers-reduced-motion: reduce) {
          .vg-card.vg-cipher { animation: none; box-shadow: 0 0 0 2px ${GOLD}, 0 0 18px ${GOLD}88; }
          .vg-star { animation: none; }
        }
      `}</style>

      <div style={{
        background: P.cardGrad,
        border: `1px solid ${P.borderStrong}`, borderRadius: 18, padding: "26px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <HomeHeader title="🎬 גלריית הסרטים"
          action={{ label: "לכל הסרטים והפוסטים →", to: "/category/וידאו" }} />

        {/* שורה אחת (גלילה אופקית) — סרטוני «הצופן התנכי» ראשונים עם כוכב מהבהב, ואז השאר */}
        <div className="vg-row">
          {list.map((v, i) => <VideoCard key={vkey(v) || i} v={v} onPlay={handlePlay} />)}
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
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden", border: `1px solid ${VIOLET}`, boxShadow: `0 0 50px ${VIOLET}44`, background: "#000" }}>
              {playing.video_url ? (
                // סרטון מאוחסן-בשרת — <video> מתנגן בהקשה בלבד (preload=none, Egress)
                <video src={playing.video_url} controls autoPlay playsInline preload="none"
                  poster={playing.poster_url || (playing.yt ? `https://i.ytimg.com/vi/${playing.yt}/hqdefault.jpg` : undefined)}
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0, background: "#000", objectFit: "contain" }} />
              ) : (
                <iframe title={stripHtml(playing.title)} src={`https://www.youtube-nocookie.com/embed/${playing.yt}?autoplay=1&rel=0`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen
                  style={{ position: "absolute", inset: 0, width: "100%", height: "100%", border: 0 }} />
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 10, marginTop: 12 }}>
              {playing.cipher_slug && (
                <Link to={`/codes/${playing.cipher_slug}`} onClick={() => setPlaying(null)}
                  style={{ display: "inline-flex", alignItems: "center", gap: 6, background: `${VIOLET}22`, border: `1px solid ${VIOLET}`, color: "#c9b3ff", textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 800, padding: "7px 16px", borderRadius: 999 }}>
                  🔠 למטריצת הצופן החי →
                </Link>
              )}
              {playing.slug && (
                <Link to={`/${playing.slug}`} onClick={() => setPlaying(null)} style={{ color: "#f6e27a", textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                  לפוסט המלא של הסרטון →
                </Link>
              )}
              <ShareActions type="video" compact
                title={stripHtml(playing.title)}
                image={`https://i.ytimg.com/vi/${playing.yt}/hqdefault.jpg`}
                url={playing.slug ? `https://sod1820.co.il/${playing.slug}` : `https://youtu.be/${playing.yt}`} />
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
