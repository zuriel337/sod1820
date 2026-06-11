import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostsFromSupabase, adaptPost } from "../lib/supabase.js";
import { C, F, LOGO_URL } from "../theme.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { GoldButton } from "../components/ui.jsx";
import { useLegacyNav } from "../lib/legacyNav.js";
import DailyMessage from "../components/DailyMessage.jsx";

function Hero() {
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      textAlign: "center", padding: "56px 24px 36px",
      background: `radial-gradient(ellipse at 50% 0%, rgba(26,18,0,0.55) 0%, transparent 65%)`,
    }}>
      <div style={{ position: "relative", display: "inline-block", marginBottom: 22 }}>
        <div style={{
          position: "absolute", top: "50%", left: "50%", width: 170, height: 170,
          background: `conic-gradient(from 0deg, transparent 0deg, rgba(212,175,55,0.16) 12deg, transparent 24deg, transparent 120deg, rgba(212,175,55,0.13) 132deg, transparent 144deg, transparent 240deg, rgba(212,175,55,0.12) 252deg, transparent 264deg)`,
          borderRadius: "50%", animation: "light-rays 16s linear infinite", pointerEvents: "none",
        }} />
        <img src={LOGO_URL} alt="SOD1820" style={{
          height: 78, width: "auto", display: "block", position: "relative", zIndex: 1,
          animation: "crown-spin 12s linear infinite, royal-pulse 4.2s ease-in-out infinite",
          filter: "drop-shadow(0 0 26px rgba(232,200,74,0.82))",
        }} />
      </div>
      <div style={{ fontSize: 10, color: C.goldDim, letterSpacing: 7, marginBottom: 16, fontFamily: F.cinzel, textTransform: "uppercase" }}>
        SOD1820 · צוריאל פולייס
      </div>
      <h1 style={{
        color: C.goldBright, margin: "0 0 16px", fontSize: "clamp(30px, 5.4vw, 56px)",
        fontFamily: F.regal, fontWeight: 700, letterSpacing: 2, lineHeight: 1.2, maxWidth: 720,
        textShadow: `0 0 80px rgba(212,175,55,0.5), 0 2px 4px rgba(0,0,0,0.8)`, animation: "hero-shimmer 5s ease-in-out infinite",
      }}>
        מפה חיה של שפת המספרים
      </h1>
      <p style={{ color: C.goldDim, fontSize: "clamp(14px, 2vw, 17px)", fontFamily: F.body, lineHeight: 2, maxWidth: 560, margin: "0 0 30px" }}>
        ציר התדר, עץ המספרים והצופן התנ"כי — מערכת אחת שבה כל לחיצה פותחת מסלול חקירה חדש.
      </p>
      <div style={{ display: "flex", gap: 14, flexWrap: "wrap", justifyContent: "center" }}>
        <GoldButton to="/start">התחל את המסע →</GoldButton>
        <GoldButton to="/map" variant="secondary">מרכז הניווט</GoldButton>
      </div>
    </div>
  );
}

// טור ימין — 5 הפוסטים האחרונים לפי תאריך עדכון אחרון
function LatestPostsRail({ posts, onPost }) {
  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14 }}>
        📖 פוסטים אחרונים
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {posts.map(p => {
          const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
          const title = stripHtml(p.title?.rendered ?? "");
          const date = formatDateHe(p.modified || p.date);
          return (
            <button key={p.id} onClick={() => onPost(p)} style={{
              display: "flex", alignItems: "stretch", gap: 12, width: "100%", textAlign: "right",
              cursor: "pointer", background: C.surface, border: `1px solid ${C.border}`,
              borderInlineStart: `2px solid ${C.borderGold}`, borderRadius: 8, padding: 0,
              overflow: "hidden", transition: "all 0.2s",
            }}
              onMouseEnter={e => { e.currentTarget.style.background = C.surface2; e.currentTarget.style.borderColor = C.gold; }}
              onMouseLeave={e => { e.currentTarget.style.background = C.surface; e.currentTarget.style.borderColor = C.border; }}
            >
              <div style={{
                width: 64, flexShrink: 0, alignSelf: "stretch", minHeight: 64,
                background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
                filter: image ? "brightness(0.78) sepia(0.2)" : "none",
                display: "flex", alignItems: "center", justifyContent: "center",
                color: C.borderGold, fontSize: 24, fontFamily: F.body,
              }}>{!image && "✦"}</div>
              <div style={{ flex: 1, padding: "10px 4px 10px 0", minWidth: 0 }}>
                <div style={{
                  color: C.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700, lineHeight: 1.4,
                  display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden",
                }}>{title}</div>
                <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, marginTop: 4, letterSpacing: 0.5 }}>
                  עודכן · {date}
                </div>
              </div>
            </button>
          );
        })}
        {!posts.length && <div style={{ color: C.muted, fontSize: 13, padding: 12 }}>טוען פוסטים…</div>}
      </div>
      <Link to="/post" style={{ display: "inline-block", marginTop: 14, color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
        אל כל הפוסטים →
      </Link>
    </div>
  );
}

export default function HomePage() {
  const nav = useLegacyNav();
  const [posts, setPosts] = useState([]);

  useEffect(() => {
    getPostsFromSupabase({ limit: 5, orderBy: "modified" })
      .then(({ posts: rows }) => setPosts((rows || []).map(r => ({ ...adaptPost(r), modified: r.modified, date: r.date }))))
      .catch(() => {});
  }, []);

  return (
    <div style={{ direction: "rtl" }}>
      <Hero />
      <DailyMessage />

      {/* פריסת 2 טורים: פוסטים אחרונים (ימין) · היכל השערים (מרכז) */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 18px 48px" }}>
        <div className="sod-home-grid" style={{
          display: "grid", gridTemplateColumns: "320px 1fr", gap: 24, alignItems: "start",
        }}>
          <LatestPostsRail posts={posts} onPost={(p) => nav("post", p)} />

          <div style={{ direction: "rtl" }}>
            <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14, textAlign: "center" }}>
              👑 היכל השערים
            </div>
            <div style={{ borderRadius: 14, overflow: "hidden", border: `1px solid ${C.borderGold}`, boxShadow: "0 20px 60px rgba(0,0,0,0.6)" }}>
              <iframe
                src="/heichal.html"
                title="היכל השערים"
                loading="lazy"
                style={{ width: "100%", height: "min(82vh, 720px)", border: "none", display: "block" }}
              />
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media (max-width: 1080px) {
          .sod-home-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
