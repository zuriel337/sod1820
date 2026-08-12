import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import HomeHeader from "./HomeHeader.jsx";

// 🌀 «מימד חמש» — שורת-פוסטים ייעודית בדף הבית, אוסף כל הפוסטים בקטגוריה «מימד חמש».
// עצמאית: מושכת לפי קטגוריה בלבד → מוצגת גם אם הפוסטים home_hidden (מחוץ ל«עדכונים אחרונים»).
const IND = "#8458ff";
const CAT = "מימד חמש";

export default function DimensionFiveRail() {
  const P = usePalette();
  const [posts, setPosts] = useState(null); // null=טוען

  useEffect(() => {
    let alive = true;
    getPostsFromSupabase({ category: CAT, limit: 12, orderBy: "modified" })
      .then(({ posts: r }) => { if (alive) setPosts(r || []); })
      .catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, []);

  if (posts && posts.length === 0) return null; // אין פוסטים → לא מציגים כלום
  const list = posts || [];

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
        <HomeHeader title="🌀 מימד חמש" action={{ label: "לכל מימד חמש →", to: `/category/${CAT}` }} />
        <div className="d5-row">
          {list.map(p => (
            <Link key={p.id} to={`/${p.slug}`} className="d5-card">
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
