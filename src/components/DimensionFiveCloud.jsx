import React, { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { thumb } from "../lib/img.js";
import { track } from "../lib/tracking.js";
import { useUserCenter } from "../lib/userCenter/UserCenterContext.jsx";

// ☁️ «ענן מעופף» — סטורי-מימד-חמש צף בצד שמאל של דף הבית, **דסקטופ בלבד**.
//    ענן רך שמרחף בעדינות; מציג פריטי «מימד חמש» מתחלפים בדהייה, לחיצה פותחת את הפוסט.
//    • דסקטופ בלבד (≥1100px) — במובייל מוחזר null (מסך קטן; ראה הצעת-מובייל ביומן/בצ׳אט).
//    • מפנה מקום לעולם-המשתמש (floating_ui_yields_law): נעלם כש-userCenter פתוח.
//    • ניתן לסגירה לדפדפן (× → localStorage). כבוד ל-reduced-motion.
const TAG = "מימד חמש";
const IND = "#8458ff";
const DISMISS_KEY = "d5_cloud_dismissed_v1";

export default function DimensionFiveCloud() {
  const P = usePalette();
  const nav = useNavigate();
  const { isOpen } = useUserCenter();
  const [posts, setPosts] = useState(null);
  const [idx, setIdx] = useState(0);
  const [desktop, setDesktop] = useState(false);
  const [hidden, setHidden] = useState(true);
  const paused = useRef(false);

  useEffect(() => {
    try { setHidden(localStorage.getItem(DISMISS_KEY) === "1"); } catch { setHidden(false); }
    const mq = window.matchMedia && window.matchMedia("(min-width: 1100px)");
    if (!mq) return;
    const on = () => setDesktop(mq.matches);
    on(); mq.addEventListener ? mq.addEventListener("change", on) : mq.addListener(on);
    return () => { mq.removeEventListener ? mq.removeEventListener("change", on) : mq.removeListener(on); };
  }, []);

  useEffect(() => {
    let alive = true;
    getPostsFromSupabase({ tag: TAG, limit: 12, orderBy: "modified" })
      .then(({ posts: r }) => { if (alive) setPosts(r || []); })
      .catch(() => { if (alive) setPosts([]); });
    return () => { alive = false; };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduce) return;
    const t = setInterval(() => { if (!paused.current && !document.hidden) setIdx(i => i + 1); }, 4200);
    return () => clearInterval(t);
  }, []);

  if (hidden || !desktop || isOpen) return null;
  if (!posts || posts.length === 0) return null;

  const p = posts[idx % posts.length];
  const img = p.image_url ? thumb(p.image_url, 200) : null;

  const dismiss = (e) => {
    e.preventDefault(); e.stopPropagation();
    try { localStorage.setItem(DISMISS_KEY, "1"); } catch { /* ignore */ }
    setHidden(true);
  };

  return (
    <aside
      aria-label="מימד חמש · סטורי"
      onMouseEnter={() => { paused.current = true; }}
      onMouseLeave={() => { paused.current = false; }}
      style={{
        position: "fixed", insetInlineStart: 20, bottom: 104, zIndex: 3500,
        width: 224, direction: "rtl", pointerEvents: "auto",
      }}
    >
      <style>{`
        @keyframes d5float { 0%,100%{ transform:translateY(0) rotate(-.6deg) } 50%{ transform:translateY(-11px) rotate(.6deg) } }
        @keyframes d5fade  { from{ opacity:0; transform:translateY(5px) } to{ opacity:1; transform:none } }
        .d5cloud { animation: d5float 6.5s ease-in-out infinite; }
        @media (prefers-reduced-motion: reduce){ .d5cloud{ animation:none } }
        .d5cloud:hover { animation-play-state: paused; }
      `}</style>

      <div className="d5cloud" style={{ position: "relative" }}>
        {/* פקעות-ענן קטנות בקצה העליון — מרמזות «ענן» */}
        <span aria-hidden style={{ position: "absolute", top: -12, insetInlineStart: 26, width: 34, height: 34, borderRadius: "50%", background: P.card, border: `1px solid ${P.borderStrong}`, boxShadow: "0 -3px 10px rgba(0,0,0,.12)" }} />
        <span aria-hidden style={{ position: "absolute", top: -20, insetInlineStart: 66, width: 46, height: 46, borderRadius: "50%", background: P.card, border: `1px solid ${P.borderStrong}`, boxShadow: "0 -3px 10px rgba(0,0,0,.12)" }} />
        <span aria-hidden style={{ position: "absolute", top: -12, insetInlineStart: 118, width: 34, height: 34, borderRadius: "50%", background: P.card, border: `1px solid ${P.borderStrong}`, boxShadow: "0 -3px 10px rgba(0,0,0,.12)" }} />

        <button
          onClick={() => { try { track("dim5", p.slug, "click", { surface: "cloud" }); } catch { /* noop */ } nav(`/${p.slug}`); }}
          title="צפו כסטורי — מימד חמש"
          style={{
            position: "relative", zIndex: 1, width: "100%", cursor: "pointer", textAlign: "start",
            background: `linear-gradient(150deg, ${P.card}, ${P.cardSoft || P.card})`,
            border: `1px solid ${IND}55`, borderRadius: "26px 26px 24px 14px",
            boxShadow: `0 14px 40px rgba(0,0,0,.28), 0 0 0 1px ${IND}22`,
            padding: 12, display: "flex", flexDirection: "column", gap: 9,
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
            <span style={{ fontSize: 15 }}>☁️</span>
            <span style={{ color: IND, fontFamily: F.heading, fontSize: 11.5, fontWeight: 900, letterSpacing: .3 }}>מימד חמש · סטורי</span>
          </div>

          <div key={idx} style={{ animation: "d5fade .5s ease both", display: "flex", flexDirection: "column", gap: 8 }}>
            <div style={{ position: "relative", width: "100%", aspectRatio: "16/10", borderRadius: 14, overflow: "hidden", background: "#0a0713", border: `1px solid ${P.border}` }}>
              {img
                ? <img src={img} alt={stripHtml(p.title)} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                : <div style={{ width: "100%", height: "100%", display: "grid", placeItems: "center", color: IND, fontSize: 30 }}>🌀</div>}
              <span style={{ position: "absolute", top: 7, insetInlineStart: 7, background: `${IND}e6`, color: "#fff", fontFamily: F.heading, fontSize: 9.5, fontWeight: 800, padding: "2px 8px", borderRadius: 999 }}>מימד חמש</span>
              {posts.length > 1 && (
                <span style={{ position: "absolute", bottom: 7, insetInlineEnd: 7, background: "rgba(0,0,0,.5)", color: "#fff", fontFamily: F.heading, fontSize: 9.5, fontWeight: 700, padding: "2px 7px", borderRadius: 999 }}>{(idx % posts.length) + 1}/{posts.length}</span>
              )}
            </div>
            <div style={{ color: P.accentText, fontFamily: F.royal, fontSize: 13, fontWeight: 700, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title)}</div>
          </div>

          <div style={{ color: IND, fontFamily: F.heading, fontSize: 11, fontWeight: 800, alignSelf: "flex-end" }}>צפו בסטורי ←</div>
        </button>

        <button
          onClick={dismiss} aria-label="סגירת ענן מימד חמש"
          style={{
            position: "absolute", top: -6, insetInlineEnd: -6, zIndex: 2, width: 24, height: 24, borderRadius: "50%",
            background: P.card, border: `1px solid ${P.borderStrong}`, color: P.inkSoft, cursor: "pointer",
            fontSize: 13, lineHeight: 1, display: "grid", placeItems: "center", boxShadow: "0 2px 8px rgba(0,0,0,.3)",
          }}
        >×</button>
      </div>
    </aside>
  );
}
