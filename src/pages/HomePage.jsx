import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { getPostsFromSupabase, adaptPost, getInsights } from "../lib/supabase.js";
import { C, F, LOGO_URL, calcGem } from "../theme.js";
import { stripHtml, formatDateHe, timeAgoHe } from "../lib/format.js";
import { GoldButton } from "../components/ui.jsx";
import { useLegacyNav } from "../lib/legacyNav.js";
import DailyMessage from "../components/DailyMessage.jsx";
import InsightCard from "../components/InsightCard.jsx";
import VerifiedBadge from "../components/VerifiedBadge.jsx";
import VideoGallery from "../components/VideoGallery.jsx";

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
        SOD1820
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

// טור ימין — 5 הפוסטים האחרונים לפי תאריך עדכון אחרון · עיצוב עתידני (HUD + זכוכית)
// תנועה: "זרקור" אוטומטי שעובר בין הכרטיסים כל 3 שניות (נעצר במעבר עכבר).
function LatestPostsRail({ posts, onPost }) {
  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  useEffect(() => {
    if (paused || posts.length < 2) return;
    const t = setInterval(() => setActive(a => (a + 1) % posts.length), 3000);
    return () => clearInterval(t);
  }, [paused, posts.length]);

  return (
    <div className="sod-pf" style={{ direction: "rtl" }}
      onMouseEnter={() => setPaused(true)} onMouseLeave={() => setPaused(false)}>
      <div className="sod-pf-head">
        <span className="sod-pf-title">עדכונים אחרונים</span>
        <span className="sod-pf-live"><span className="sod-pf-dot" />LIVE</span>
        <span className="sod-pf-line" />
        <span className="sod-pf-count">{String(posts.length).padStart(2, "0")}</span>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {posts.map((p, i) => {
          const image = p._embedded?.["wp:featuredmedia"]?.[0]?.source_url ?? null;
          const title = stripHtml(p.title?.rendered ?? "");
          const date = timeAgoHe(p.modified || p.date);
          const gem = calcGem(title);
          return (
            <button
              key={p.id}
              onClick={() => onPost(p)}
              className={`sod-pf-card${i === active ? " is-active" : ""}`}
              style={{ animationDelay: `${i * 90}ms` }}
            >
              <span className="sod-pf-scan" />
              <span className="sod-pf-idx">{String(i + 1).padStart(2, "0")}</span>

              <div className="sod-pf-thumb" style={{
                background: image ? `center/cover no-repeat url(${image})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})`,
              }}>
                {!image && <span className="sod-pf-thumb-mark">✦</span>}
                <span className="sod-pf-thumb-holo" />
                <span className="sod-pf-corner tl" /><span className="sod-pf-corner br" />
              </div>

              <div className="sod-pf-body">
                <div className="sod-pf-name">{title}</div>
                <div className="sod-pf-meta">
                  <span className="sod-pf-date" title={formatDateHe(p.modified || p.date)}>עודכן · {date}</span>
                  {gem > 0 && <span className="sod-pf-gem" title={`גימטריה: ${gem}`}>ג׳ {gem}</span>}
                </div>
              </div>
            </button>
          );
        })}
        {!posts.length && <div style={{ color: C.muted, fontSize: 13, padding: 12 }}>טוען פוסטים…</div>}
      </div>

      <Link to="/post" className="sod-pf-all">
        אל כל הפוסטים <span aria-hidden>→</span>
      </Link>
    </div>
  );
}

// מקום מכובד בעמוד הבית — חידושי AI (3 אחרונים) + מעבר לבית המדרש.
// חוק stream_separation: עדכוני צוריאל (פוסטים) נפרדים מחידושי AI.
function AiInsightsBox({ insights }) {
  return (
    <section style={{ maxWidth: 1360, margin: "0 auto", padding: "8px 18px 56px", direction: "rtl" }}>
      <div style={{
        background: "linear-gradient(135deg, rgba(62,166,255,0.06), rgba(8,5,2,0.4))",
        border: `1px solid ${C.borderGold}`, borderRadius: 18, padding: "26px 22px",
        boxShadow: "0 20px 60px rgba(0,0,0,0.4)",
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap", marginBottom: 18 }}>
          <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,26px)", fontWeight: 700, margin: 0 }}>
            🔵 חידושי AI
          </h2>
          <VerifiedBadge variant="ai" size={15} />
          <span style={{ flex: 1 }} />
          <Link to="/beit-midrash" style={{
            color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12,
            fontWeight: 700, letterSpacing: 1, padding: "8px 16px", borderRadius: 8,
            border: `1px solid ${C.borderGold}`, background: "rgba(20,15,12,0.5)", whiteSpace: "nowrap",
          }}>עוד בבית המדרש →</Link>
        </div>
        {insights.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: 12 }}>
            {insights.map(it => <InsightCard key={it.id} insight={it} badgeVariant="ai" />)}
          </div>
        ) : (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, padding: 8 }}>טוען חידושים…</div>
        )}
      </div>
    </section>
  );
}

export default function HomePage() {
  const nav = useLegacyNav();
  const [posts, setPosts] = useState([]);
  const [aiInsights, setAiInsights] = useState([]);

  useEffect(() => {
    getPostsFromSupabase({ limit: 5, orderBy: "modified" })
      .then(({ posts: rows }) => setPosts((rows || []).map(r => ({ ...adaptPost(r), modified: r.modified, date: r.date }))))
      .catch(() => {});
    getInsights({ origin: "ai", limit: 3 })
      .then(setAiInsights)
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

      {/* גלריית הסרטים — לרוחב */}
      <VideoGallery />

      <AiInsightsBox insights={aiInsights} />

      <style>{`
        @media (max-width: 1080px) {
          .sod-home-grid { grid-template-columns: 1fr !important; }
        }

        /* ===== פוסטים אחרונים — עיצוב עתידני ===== */
        .sod-pf-head { display: flex; align-items: center; gap: 9px; margin-bottom: 18px; }
        .sod-pf-dot {
          width: 8px; height: 8px; border-radius: 50%;
          background: ${C.goldBright}; box-shadow: 0 0 10px ${C.goldBright}, 0 0 4px ${C.goldBright};
          animation: sod-pf-pulse 2.2s ease-in-out infinite;
        }
        .sod-pf-title {
          font-family: ${F.heading}; font-size: 12px; font-weight: 800;
          letter-spacing: 3px; text-transform: uppercase; color: ${C.goldBright};
        }
        .sod-pf-live {
          display: inline-flex; align-items: center; gap: 5px;
          font-family: ${F.mono}; font-size: 9px; font-weight: 800; letter-spacing: 1.5px;
          color: #ff6b6b; text-transform: uppercase;
          border: 1px solid rgba(255,107,107,0.4); border-radius: 4px; padding: 1px 6px 1px 5px;
          background: rgba(255,107,107,0.08);
        }
        .sod-pf-live .sod-pf-dot { background: #ff6b6b; box-shadow: 0 0 8px #ff6b6b, 0 0 3px #ff6b6b; }
        .sod-pf-line {
          flex: 1; height: 1px;
          background: linear-gradient(90deg, ${C.borderGold}, transparent);
        }
        .sod-pf-count {
          font-family: ${F.mono}; font-size: 11px; font-weight: 700;
          color: ${C.goldDim}; letter-spacing: 1px;
          border: 1px solid ${C.border}; border-radius: 4px; padding: 1px 6px;
        }
        @keyframes sod-pf-pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(0.78); }
        }

        .sod-pf-card {
          position: relative; display: flex; align-items: stretch; gap: 12px;
          width: 100%; text-align: right; cursor: pointer; overflow: hidden;
          padding: 10px 12px 10px 10px; border-radius: 12px;
          background: linear-gradient(135deg, rgba(20,15,12,0.72), rgba(8,5,2,0.55));
          backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px);
          border: 1px solid ${C.border};
          box-shadow: inset 0 1px 0 rgba(246,226,122,0.06);
          transition: transform 0.28s cubic-bezier(.2,.8,.2,1), border-color 0.28s, box-shadow 0.28s;
          opacity: 0; transform: translateY(14px);
          animation: sod-pf-in 0.6s cubic-bezier(.2,.8,.2,1) forwards;
        }
        @keyframes sod-pf-in { to { opacity: 1; transform: translateY(0); } }
        /* קו זוהר נע בצד ההתחלה (ימין ב-RTL) */
        .sod-pf-card::before {
          content: ""; position: absolute; top: 10%; right: 0; width: 2px; height: 80%;
          background: linear-gradient(${C.goldDim}, ${C.goldBright}, ${C.goldDim});
          opacity: 0.45; transition: opacity 0.28s, box-shadow 0.28s;
        }
        .sod-pf-card:hover,
        .sod-pf-card.is-active {
          transform: translateY(-3px); border-color: ${C.gold};
          box-shadow: 0 14px 40px rgba(0,0,0,0.55), 0 0 24px rgba(212,175,55,0.14);
        }
        .sod-pf-card:hover::before,
        .sod-pf-card.is-active::before { opacity: 1; box-shadow: 0 0 14px ${C.goldBright}; }
        .sod-pf-card.is-active .sod-pf-thumb { filter: brightness(1) saturate(1.05); }
        .sod-pf-card.is-active .sod-pf-name { color: ${C.goldBright}; }
        @media (prefers-reduced-motion: reduce) {
          .sod-pf-card.is-active { transform: none; }
        }
        .sod-pf-card:focus-visible { outline: 2px solid ${C.gold}; outline-offset: 2px; }

        /* קו סריקה במעבר עכבר */
        .sod-pf-scan {
          position: absolute; inset: 0; pointer-events: none; opacity: 0;
          background: linear-gradient(180deg, transparent 0%, rgba(246,226,122,0.10) 50%, transparent 100%);
          transform: translateY(-100%);
        }
        .sod-pf-card:hover .sod-pf-scan { opacity: 1; animation: sod-pf-scan 1.1s ease-in-out; }
        @keyframes sod-pf-scan { 0% { transform: translateY(-100%); } 100% { transform: translateY(100%); } }

        .sod-pf-idx {
          position: absolute; top: 6px; left: 10px;
          font-family: ${F.mono}; font-size: 22px; font-weight: 700; line-height: 1;
          color: rgba(246,226,122,0.10); letter-spacing: -1px; pointer-events: none;
          transition: color 0.28s;
        }
        .sod-pf-card:hover .sod-pf-idx { color: rgba(246,226,122,0.22); }

        .sod-pf-thumb {
          position: relative; width: 62px; height: 62px; flex-shrink: 0;
          border-radius: 9px; overflow: hidden;
          display: flex; align-items: center; justify-content: center;
          filter: brightness(0.82) saturate(0.9);
          transition: filter 0.28s, transform 0.28s;
          border: 1px solid ${C.border};
        }
        .sod-pf-card:hover .sod-pf-thumb { filter: brightness(1) saturate(1.05); transform: scale(1.04); }
        .sod-pf-thumb-mark { color: ${C.borderGold}; font-size: 26px; font-family: ${F.body}; }
        .sod-pf-thumb-holo {
          position: absolute; inset: 0; pointer-events: none; opacity: 0.5;
          background: linear-gradient(125deg, transparent 40%, rgba(246,226,122,0.22) 50%, transparent 60%);
          background-size: 200% 200%; transition: opacity 0.28s;
        }
        .sod-pf-card:hover .sod-pf-thumb-holo { opacity: 1; animation: sod-pf-holo 1.4s ease-in-out infinite; }
        @keyframes sod-pf-holo { 0% { background-position: 0% 0%; } 100% { background-position: -200% -200%; } }
        .sod-pf-corner {
          position: absolute; width: 9px; height: 9px; pointer-events: none;
          border-color: ${C.goldBright}; opacity: 0.7;
        }
        .sod-pf-corner.tl { top: 4px; right: 4px; border-top: 1.5px solid; border-right: 1.5px solid; }
        .sod-pf-corner.br { bottom: 4px; left: 4px; border-bottom: 1.5px solid; border-left: 1.5px solid; }

        .sod-pf-body { flex: 1; min-width: 0; display: flex; flex-direction: column; justify-content: center; gap: 7px; padding-left: 4px; }
        .sod-pf-name {
          color: ${C.goldLight}; font-family: ${F.royal}; font-size: 14px; font-weight: 700; line-height: 1.42;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden;
          transition: color 0.28s;
        }
        .sod-pf-card:hover .sod-pf-name { color: ${C.goldBright}; }
        .sod-pf-meta { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
        .sod-pf-date { color: ${C.muted}; font-family: ${F.heading}; font-size: 10px; letter-spacing: 0.5px; }
        .sod-pf-gem {
          font-family: ${F.mono}; font-size: 10px; font-weight: 700; letter-spacing: 0.5px;
          color: ${C.goldBright};
          background: linear-gradient(135deg, rgba(122,19,32,0.55), rgba(160,31,46,0.35));
          border: 1px solid ${C.borderGold}; border-radius: 20px; padding: 2px 8px;
          box-shadow: 0 0 0 rgba(212,175,55,0); transition: box-shadow 0.28s;
        }
        .sod-pf-card:hover .sod-pf-gem { box-shadow: 0 0 14px rgba(212,175,55,0.3); }

        .sod-pf-all {
          display: inline-flex; align-items: center; gap: 6px; margin-top: 18px;
          color: ${C.goldBright}; text-decoration: none; font-family: ${F.heading};
          font-size: 12px; font-weight: 700; letter-spacing: 1px;
          padding: 9px 16px; border-radius: 8px; border: 1px solid ${C.borderGold};
          background: rgba(20,15,12,0.5); transition: background 0.2s, gap 0.2s, box-shadow 0.2s;
        }
        .sod-pf-all:hover { background: ${C.surface2}; gap: 10px; box-shadow: 0 0 18px rgba(212,175,55,0.18); }

        @media (prefers-reduced-motion: reduce) {
          .sod-pf-card { animation: none; opacity: 1; transform: none; }
          .sod-pf-dot, .sod-pf-card:hover .sod-pf-scan, .sod-pf-card:hover .sod-pf-thumb-holo { animation: none; }
        }
      `}</style>
    </div>
  );
}
