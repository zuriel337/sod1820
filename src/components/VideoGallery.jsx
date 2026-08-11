import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { getHomeVideos, getAuthorGalleryVideos, getCategoryVideos } from "../lib/supabase.js";
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
      <button onClick={() => onPlay(v)} aria-label={`נגן סרטון: ${stripHtml(v.title)}`} style={{
        position: "relative", display: "block", width: "100%", aspectRatio: "16/9",
        borderRadius: 12, overflow: "hidden", cursor: "pointer", padding: 0,
        border: `1px solid ${featured ? VIOLET : P.border}`, background: "#000",
        boxShadow: featured ? `0 0 24px ${VIOLET}66` : "none",
      }} className="vg-card">
        <img src={v.poster_url || `https://i.ytimg.com/vi/${v.yt}/hqdefault.jpg`} alt={stripHtml(v.title)} loading="lazy"
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
  const [authorVids, setAuthorVids] = useState([]); // 🎬 סרטוני אלון לוי — נמשכים אוטומטית מהפוסטים
  const [catVids, setCatVids] = useState([]); // 🎬 כל פוסט בקטגוריית «וידאו» — נכנס לספרייה אוטומטית

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
    getHomeVideos().then(data => { if (alive) setRows(data); }).catch(() => {});
    getAuthorGalleryVideos("אלון לוי").then(data => { if (alive) setAuthorVids(data || []); }).catch(() => {});
    getCategoryVideos("וידאו").then(data => { if (alive) setCatVids(data || []); }).catch(() => {});
    return () => { alive = false; };
  }, []);

  // 🔍 JSON-LD (VideoObject) — כדי שגוגל יציג את הסרטונים כתוצאות-וידאו עשירות
  useEffect(() => {
    const all = (rows && rows.length) ? rows : [FEATURED, ...VIDEOS];
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

  // סדר: הנעוצים (חותים + יום משיח בא) תמיד ראשונים; אחריהם שאר-הטבלה + סרטוני אלון לוי,
  // ממוזגים לפי תאריך (החדש קודם). סרטון-מתווסף מציג תאריך. נפילה לברירת-המחדל אם אין נתונים.
  const byDateDesc = (a, b) => String(b.uploaded_at || "").localeCompare(String(a.uploaded_at || ""));
  const vkey = (v) => v.slug || v.yt || v.video_url || null;
  const dedup = (arr) => {
    const seen = new Set(); const out = [];
    for (const v of arr) { const k = vkey(v); if (k && seen.has(k)) continue; if (k) seen.add(k); out.push(v); }
    return out;
  };
  let featured = FEATURED, list = VIDEOS;
  const homeRows = rows || [];
  if (homeRows.length || (authorVids && authorVids.length) || (catVids && catVids.length)) {
    const pinned = homeRows.filter(v => v.pinned);
    const restHome = homeRows.filter(v => !v.pinned);
    // כל פוסט בקטגוריית «וידאו» + סרטוני-כותב מתמזגים לפי תאריך, מנוכי-כפילויות (לפי slug/yt)
    const added = dedup([...restHome, ...(authorVids || []), ...(catVids || [])].sort(byDateDesc));
    featured = pinned[0] || homeRows.find(v => v.featured) || added[0] || FEATURED;
    const fkey = vkey(featured);
    list = dedup([...pinned, ...added]).filter(v => v !== featured && vkey(v) !== fkey).slice(0, 40);
  }

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
        <HomeHeader title="🎬 גלריית הסרטים"
          action={{ label: "לכל הסרטים והפוסטים →", to: "/category/וידאו" }} />

        {/* שורה אחת — הסרטון המובלט ראשון, ואז השאר (גלילה אופקית) */}
        <div className="vg-row">
          <VideoCard v={featured} onPlay={handlePlay} featured />
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
