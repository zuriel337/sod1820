import React, { useState, useEffect, Suspense, lazy } from "react";
import { Link } from "react-router-dom";
import { supabase, getPostsFromSupabase, adaptPost, searchPosts } from "../lib/supabase.js";
import { C, F, LOGO_URL } from "../theme.js";
import { stripHtml } from "../lib/format.js";
import { GoldButton, RoyalDivider } from "../components/ui.jsx";
import { useLegacyNav } from "../lib/legacyNav.js";
import DailyMessage from "../components/DailyMessage.jsx";
import VideoGallery from "../components/VideoGallery.jsx";
import { LatestPostsSection, PostCard } from "../legacy/legacy.jsx";

const NumberTree = lazy(() => import("../features/numbertree/NumberTree.jsx"));

function TreeFallback({ height }) {
  return (
    <div style={{ height, borderRadius: 12, border: `1px solid ${C.border}`, background: "radial-gradient(ellipse at 50% 40%, #0d0a14 0%, #050307 100%)", display: "flex", alignItems: "center", justifyContent: "center", color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2 }}>
      טוען את עץ המספרים…
    </div>
  );
}

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

// טור שמאל — ציר התדר (אירועים) שמעדכן את המרכז
function TimelineRail({ events, selected, onSelect }) {
  return (
    <div style={{ direction: "rtl" }}>
      <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14 }}>
        🛤 ציר ההתגלות
      </div>
      <div style={{ position: "relative", paddingInlineEnd: 14, borderInlineEnd: `1px solid ${C.border}`, maxHeight: 560, overflowY: "auto" }}>
        {events.map((ev) => {
          const active = selected?.id === ev.id;
          return (
            <button key={ev.id} onClick={() => onSelect(ev)} style={{
              display: "block", width: "100%", textAlign: "right", cursor: "pointer",
              background: active ? C.surface2 : "transparent",
              border: `1px solid ${active ? C.borderGold : "transparent"}`,
              borderRadius: 8, padding: "10px 12px", marginBottom: 6, transition: "all 0.18s",
            }}>
              <div style={{ color: active ? C.goldBright : C.goldLight, fontFamily: F.royal, fontSize: 14, fontWeight: 700 }}>
                {stripHtml(ev.label || "")}
              </div>
              {ev.hebrew_date && <div style={{ color: C.muted, fontFamily: F.heading, fontSize: 10, marginTop: 3, letterSpacing: 1 }}>{ev.hebrew_date}</div>}
            </button>
          );
        })}
        {!events.length && <div style={{ color: C.muted, fontSize: 13, padding: 12 }}>טוען אירועים…</div>}
      </div>
      <Link to="/timeline" style={{ display: "inline-block", marginTop: 12, color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, letterSpacing: 1 }}>
        אל ציר ההתגלות המלא →
      </Link>
    </div>
  );
}

// טור מרכז — תוכן שמתעדכן לפי בחירת אירוע
function CenterContent({ selected, relatedPost, posts, onPost }) {
  return (
    <div style={{ direction: "rtl" }}>
      {selected ? (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 20 }}>
          <div style={{ fontSize: 11, color: C.crimsonLight, letterSpacing: 3, fontFamily: F.heading, marginBottom: 8 }}>תחנת תדר</div>
          <h3 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 24, margin: "0 0 10px" }}>{stripHtml(selected.label || "")}</h3>
          {selected.axis_theme && <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, marginBottom: 12, letterSpacing: 1 }}>ציר: {selected.axis_theme}</div>}
          {relatedPost ? (
            <Link to={"/" + relatedPost.slug} onClick={() => onPost(relatedPost)} style={{ display: "block", textDecoration: "none", borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              <div style={{ color: C.muted, fontSize: 11, marginBottom: 4, fontFamily: F.heading }}>פוסט קשור ←</div>
              <div style={{ color: C.goldLight, fontFamily: F.royal, fontSize: 16, fontWeight: 700 }}>{stripHtml(relatedPost.title || "")}</div>
            </Link>
          ) : (
            <div style={{ color: C.muted, fontSize: 13, fontFamily: F.body, borderTop: `1px solid ${C.border}`, paddingTop: 14 }}>
              מחפש פוסט קשור… או <Link to="/post" style={{ color: C.goldBright }}>עיין בכל הפוסטים</Link>.
            </div>
          )}
        </div>
      ) : (
        <div style={{ background: C.surface2, border: `1px solid ${C.border}`, borderRadius: 12, padding: "22px 24px", marginBottom: 20, textAlign: "center" }}>
          <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 20, marginBottom: 8 }}>בחר תחנה בציר התדר</div>
          <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 14, lineHeight: 1.8 }}>
            כל אירוע מחובר לפוסט, לצופן ולמספרים שלו. לחץ על תחנה כדי לפתוח אותה — או עיין בפוסטים האחרונים למטה.
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 14 }}>
        {posts.slice(0, 4).map(p => <PostCard key={p.id} post={p} onPost={() => onPost(p)} />)}
      </div>
    </div>
  );
}

export default function HomePage() {
  const nav = useLegacyNav();
  const [events, setEvents] = useState([]);
  const [posts, setPosts] = useState([]);
  const [selected, setSelected] = useState(null);
  const [relatedPost, setRelatedPost] = useState(null);

  useEffect(() => {
    supabase.from("nodes")
      .select("id,label,weight,hebrew_date,axis_theme,metadata,created_at")
      .eq("type", "event")
      .order("weight", { ascending: false })
      .limit(14)
      .then(({ data }) => setEvents(data || []));
    getPostsFromSupabase({ limit: 8 })
      .then(({ posts: rows }) => setPosts((rows || []).map(adaptPost)))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (!selected) { setRelatedPost(null); return; }
    let alive = true;
    searchPosts(stripHtml(selected.label || ""), { limit: 1 })
      .then(rows => { if (alive) setRelatedPost(rows?.[0] ? adaptPost(rows[0]) : null); })
      .catch(() => { if (alive) setRelatedPost(null); });
    return () => { alive = false; };
  }, [selected]);

  return (
    <div style={{ direction: "rtl" }}>
      <Hero />
      <DailyMessage />

      {/* פריסת 3 טורים: ציר תדר · תוכן · עץ מספרים */}
      <div style={{ maxWidth: 1360, margin: "0 auto", padding: "32px 18px 8px" }}>
        <div className="sod-home-grid" style={{
          display: "grid", gridTemplateColumns: "260px 1fr 380px", gap: 24, alignItems: "start",
        }}>
          <TimelineRail events={events} selected={selected} onSelect={setSelected} />
          <CenterContent selected={selected} relatedPost={relatedPost} posts={posts} onPost={(p) => nav("post", p)} />
          <div style={{ direction: "rtl" }}>
            <div style={{ fontSize: 11, color: C.goldDim, letterSpacing: 4, fontFamily: F.heading, textTransform: "uppercase", marginBottom: 14 }}>
              🌳 עץ המספרים
            </div>
            <Suspense fallback={<TreeFallback height={420} />}>
              <NumberTree height={420} />
            </Suspense>
            <div style={{ display: "flex", gap: 10, marginTop: 12, flexWrap: "wrap" }}>
              <Link to="/numbers" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, border: `1px solid ${C.borderGold}`, borderRadius: 6, padding: "8px 12px" }}>עץ מלא →</Link>
              <Link to="/members" style={{ color: C.goldDim, textDecoration: "none", fontFamily: F.heading, fontSize: 12, fontWeight: 700, border: `1px solid ${C.border}`, borderRadius: 6, padding: "8px 12px" }}>עץ מתקדם · בני ההיכל</Link>
            </div>
          </div>
        </div>
      </div>

      <div style={{ padding: "20px 0" }}><RoyalDivider width={240} /></div>

      {/* גלריית הסרטים — לרוחב */}
      <VideoGallery />

      <div style={{ padding: "20px 0" }}><RoyalDivider width={240} /></div>

      {/* פוסטים אחרונים — נשמר מהאתר הקיים */}
      <LatestPostsSection onNav={nav} />

      <style>{`
        @media (max-width: 1080px) {
          .sod-home-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </div>
  );
}
