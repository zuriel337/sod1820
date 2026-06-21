import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { stripHtml } from "../lib/format.js";
import { getHotPostsLive } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";

// 🔥 הפוסטים הנצפים — מקור אחד (page_views → hot_posts_live) לכל האתר.
// תצוגת שורות: שורת-כרטיס לכל פוסט (דירוג · תמונה · כותרת), פרוס בגריד מרכזי
// (דסקטופ עד 3 בשורה · טאבלט 2 · נייד 1). ספירת הצפיות (👁) מוצגת *רק למנהל*.
//
// props:
//  posts   — נתונים מוכנים מבחוץ (controlled). אם ניתן — לא טוען בעצמו ובלי מתג ימים.
//  days    — חלון ימים (כשטוען בעצמו): 1=היום · 7=השבוע. ברירת מחדל 7.
//  limit   — כמה פוסטים למשוך. ברירת מחדל 6 (שתי שורות של 3).
//  light   — override פלטה (ברירת מחדל = פלטה גלובלית, מתחלפת עם המתג יום/לילה).
//  showTitle / title — כותרת המדור (ברירת מחדל מוצגת כשטוען בעצמו).
export default function ViewedPostsRows({
  posts: postsProp,
  days: daysProp = 7,
  limit = 6,
  light,
  showTitle,
  title = "🔥 הפוסטים הנצפים",
  sub = "מה שהכי קוראים באתר עכשיו",
}) {
  const globalP = usePalette();
  const pal = light == null ? globalP : PALETTES[light ? "light" : "dark"];
  const { profile } = useAuth();
  const isAdmin = profile?.role === "admin";

  const controlled = postsProp != null;
  const [days, setDays] = useState(daysProp);
  const [fetched, setFetched] = useState([]);

  useEffect(() => {
    if (controlled) return;
    let live = true;
    getHotPostsLive({ days, limit }).then(p => { if (live) setFetched(p || []); }).catch(() => {});
    return () => { live = false; };
  }, [controlled, days, limit]);

  const posts = controlled ? postsProp : fetched;
  if (!posts || !posts.length) return null;

  // ברירות-מחדל לתצוגה עצמאית (לא controlled): כותרת + מתג ימים גלויים.
  const withTitle = showTitle == null ? !controlled : showTitle;
  const withToggle = !controlled;

  const L = {
    panel: pal.card, ink: pal.ink, sub: pal.inkSoft, gold: pal.accentText,
    line: pal.border, lineStrong: pal.borderStrong, chip: pal.cardSoft,
    grad: pal.cardGrad, glow: pal.glow,
  };

  return (
    <div style={{ direction: "rtl" }}>
      {withTitle && (
        <>
          <h2 style={{ color: L.gold, fontFamily: F.regal, fontSize: "clamp(19px,3vw,24px)", fontWeight: 800, textAlign: "center", margin: "0 0 4px" }}>{title}</h2>
          {sub && <p style={{ color: L.sub, fontFamily: F.body, fontSize: 13.5, textAlign: "center", margin: "0 0 14px" }}>{sub}</p>}
        </>
      )}

      {withToggle && (
        <div style={{ display: "flex", gap: 7, justifyContent: "center", marginBottom: 14 }}>
          {[[1, "היום"], [7, "השבוע"]].map(([d, lbl]) => (
            <button key={d} onClick={() => setDays(d)} style={{
              cursor: "pointer", borderRadius: 999, padding: "5px 16px", fontFamily: F.heading, fontSize: 13, fontWeight: 700,
              border: `1px solid ${days === d ? pal.accent : L.line}`, background: days === d ? L.glow : "transparent",
              color: days === d ? L.gold : L.sub,
            }}>{lbl}</button>
          ))}
        </div>
      )}

      <div className="vpr-grid">
        {posts.map((p, i) => (
          <Link key={p.slug || i} to={`/${p.slug}`} className="vpr-row" style={{ background: L.grad, border: `1px solid ${L.line}` }}>
            <span className="vpr-rank" style={{ color: L.gold, borderColor: L.lineStrong, background: L.chip }}>{i + 1}</span>
            <span className="vpr-thumb" style={{ background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : L.chip, borderColor: L.line }}>
              {!p.image_url && <span style={{ color: L.gold, fontSize: 18 }}>✦</span>}
            </span>
            <span className="vpr-title" style={{ color: L.ink }}>{stripHtml(p.title || "")}</span>
            {isAdmin && p.views != null && (
              <span className="vpr-views" style={{ color: L.gold, background: L.chip, border: `1px solid ${L.line}` }} title="צפיות (גלוי למנהל בלבד)">👁 {p.views}</span>
            )}
          </Link>
        ))}
      </div>

      <style>{`
        .vpr-grid {
          display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px;
          max-width: 1000px; margin: 0 auto;
        }
        @media (max-width: 900px) { .vpr-grid { grid-template-columns: repeat(2, 1fr); max-width: 680px; } }
        @media (max-width: 540px) { .vpr-grid { grid-template-columns: 1fr; max-width: 420px; } }
        .vpr-row {
          display: flex; align-items: center; gap: 11px; text-decoration: none;
          padding: 9px 12px; border-radius: 12px; min-width: 0;
          transition: transform .18s, border-color .18s, box-shadow .18s;
        }
        .vpr-row:hover { transform: translateY(-2px); box-shadow: 0 10px 26px rgba(0,0,0,0.18); }
        .vpr-rank {
          flex: 0 0 auto; width: 26px; height: 26px; border-radius: 999px; border: 1px solid;
          display: flex; align-items: center; justify-content: center;
          font-family: ${F.mono}; font-size: 13px; font-weight: 800;
        }
        .vpr-thumb {
          flex: 0 0 auto; width: 46px; height: 46px; border-radius: 9px; border: 1px solid;
          display: flex; align-items: center; justify-content: center; overflow: hidden;
        }
        .vpr-title {
          flex: 1; min-width: 0; font-family: ${F.regal}; font-size: 14px; font-weight: 700; line-height: 1.4;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
        }
        .vpr-views {
          flex: 0 0 auto; font-family: ${F.heading}; font-size: 11px; font-weight: 800;
          border-radius: 999px; padding: 2px 9px; white-space: nowrap;
        }
      `}</style>
    </div>
  );
}
