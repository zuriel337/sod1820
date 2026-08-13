import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { track } from "../lib/tracking.js";
import HomeHeader from "./HomeHeader.jsx";

// 🌀 «מימד חמש» — שורת-פוסטים ייעודית בדף הבית, אוסף כל הפוסטים עם התגית «מימד חמש».
// עצמאית: מושכת לפי תגית בלבד → מוצגת גם אם הפוסטים home_hidden (מחוץ ל«עדכונים אחרונים»).
const IND = "#8458ff";
const TAG = "מימד חמש";

export default function DimensionFiveRail({ compact = false, surface = compact ? "footer" : "home-rail" }) {
  const P = usePalette();
  const [posts, setPosts] = useState(null); // null=טוען

  useEffect(() => {
    let alive = true;
    getPostsFromSupabase({ tag: TAG, limit: 12, orderBy: "modified" })
      .then(({ posts: r }) => { if (alive) setPosts(r || []); })
      .catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, []);

  if (posts && posts.length === 0) return null; // אין פוסטים → לא מציגים כלום
  const list = posts || [];

  // 🎬 גרסה קומפקטית — סרגל-סרטונים קטן לאזור הפוטר (בכל האתר חוץ מדף הבית).
  if (compact) {
    return (
      <section aria-label="מימד חמש — סרטונים" style={{ maxWidth: 1040, margin: "0 auto", padding: "4px 20px 10px", direction: "rtl" }}>
        <style>{`
          .d5c-row{ display:flex; gap:10px; overflow-x:auto; padding-bottom:6px; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
          .d5c-row::-webkit-scrollbar{ display:none; }
          .d5c-card{ flex:0 0 88px; text-decoration:none; }
          .d5c-card:hover .d5c-media{ border-color:${IND}; box-shadow:0 0 14px ${IND}66; }
        `}</style>
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
          <span style={{ color: IND, fontFamily: F.heading, fontSize: 12.5, fontWeight: 900 }}>🌀 מימד חמש</span>
          <Link to={`/tag/${TAG}`} style={{ marginInlineStart: "auto", color: P.inkSoft, fontFamily: F.body, fontSize: 11, textDecoration: "none" }}>לכל מימד חמש →</Link>
        </div>
        <div className="d5c-row">
          {list.map(p => (
            <Link key={p.id} to={`/${p.slug}`} className="d5c-card"
              onClick={() => { try { track("dim5", p.slug, "click", { surface }); } catch { /* noop */ } }}>
              <div className="d5c-media" style={{
                position: "relative", aspectRatio: "3/4", borderRadius: 10, overflow: "hidden",
                border: `1px solid ${P.border}`, background: "#0a0713", transition: "border-color .15s, box-shadow .15s",
              }}>
                {p.image_url
                  ? <img src={thumb(p.image_url, 200)} alt={stripHtml(p.title)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: IND, fontSize: 22 }}>🌀</div>}
                {/* אייקון-נגן קטן — אלו סרטונים */}
                <span aria-hidden style={{ position: "absolute", inset: 0, display: "grid", placeItems: "center", background: "rgba(0,0,0,.14)" }}>
                  <span style={{ width: 22, height: 22, borderRadius: "50%", background: "rgba(255,255,255,.9)", display: "grid", placeItems: "center", color: "#111", fontSize: 9 }}>▶</span>
                </span>
              </div>
              <div style={{ marginTop: 5, color: P.inkSoft, fontFamily: F.body, fontSize: 10.5, lineHeight: 1.3, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", maxWidth: 88 }}>{stripHtml(p.title)}</div>
            </Link>
          ))}
        </div>
      </section>
    );
  }

  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px", direction: "rtl" }}>
      <style>{`
        .d5-wrap{ background:linear-gradient(135deg, rgba(132,88,255,.12), ${P.cardGrad || "rgba(20,15,30,.05)"}); border:1px solid ${P.borderStrong}; border-radius:18px; padding:24px 22px; box-shadow:0 20px 60px rgba(0,0,0,.25); }
        .d5-row{ display:flex; gap:16px; overflow-x:auto; padding-bottom:10px; scroll-snap-type:x mandatory; }
        .d5-row::-webkit-scrollbar{ height:8px; }
        .d5-row::-webkit-scrollbar-thumb{ background:${P.borderStrong}; border-radius:999px; }
        .d5-card{ flex:0 0 240px; scroll-snap-align:start; text-decoration:none; }
        @media(max-width:520px){ .d5-card{ flex:0 0 80%; } }
        .d5-card:hover .d5-media{ transform:translateY(-3px); border-color:${IND}; box-shadow:0 0 22px ${IND}55; }
      `}</style>
      <div className="d5-wrap">
        <HomeHeader title="🌀 מימד חמש" action={{ label: "לכל מימד חמש →", to: `/tag/${TAG}` }} />
        <div className="d5-row">
          {list.map(p => (
            <Link key={p.id} to={`/${p.slug}`} className="d5-card"
              onClick={() => { try { track("dim5", p.slug, "click", { surface: "home-rail" }); } catch { /* noop */ } }}>
              <div className="d5-media" style={{
                position: "relative", aspectRatio: "16/9", borderRadius: 12, overflow: "hidden",
                border: `1px solid ${P.border}`, background: "#0a0713", transition: "transform .15s, border-color .15s, box-shadow .15s",
              }}>
                {p.image_url
                  ? <img src={thumb(p.image_url, 360)} alt={stripHtml(p.title)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                  : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: IND, fontSize: 30 }}>🌀</div>}
                <span style={{ position: "absolute", top: 8, insetInlineStart: 8, background: `${IND}e6`, color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, padding: "3px 9px", borderRadius: 999 }}>מימד חמש</span>
              </div>
              <div style={{ marginTop: 9, color: P.accentText, fontFamily: F.royal, fontSize: 14, fontWeight: 700, lineHeight: 1.5, direction: "rtl" }}>{stripHtml(p.title)}</div>
              {p.date && <div style={{ marginTop: 3, color: P.inkSoft, fontFamily: F.heading, fontSize: 11, fontWeight: 700 }}>🕒 {formatDateHe(p.date)}</div>}
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
