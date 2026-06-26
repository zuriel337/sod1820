import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";

// ===== בית-הקוד · עדשת «קוד המציאות» (/reality + root-swap) =====
// עץ אחד, עדשה שנייה: אותו API/DB כמו בית-המלוכה — רק מסגור (כהה/ניאון/טכנולוגי)
// וסדרת הקולנוע מודגשת. לא משכפל data. שלב 1 (מעטפת); renderer פר-פוסט = פאזה 2.

const ACCENT = "#7fc8ff";
const CINEMA_CAT = "הצופן בקולנוע";

const card = {
  display: "block", textDecoration: "none", background: "rgba(127,200,255,0.05)",
  border: "1px solid rgba(127,200,255,0.22)", borderRadius: 14, padding: 16,
  color: "#dfeaf3", transition: "border-color .2s, transform .2s",
};

function PostCard({ p, featured }) {
  const excerpt = stripHtml(p.excerpt || p.content || "").slice(0, featured ? 180 : 96);
  return (
    <Link to={`/${p.slug}`} style={{ ...card, ...(featured ? { borderColor: "rgba(127,200,255,0.45)", background: "rgba(127,200,255,0.08)" } : null) }}>
      {p.image_url && (
        <div style={{ marginBottom: 12, borderRadius: 10, overflow: "hidden", maxHeight: featured ? 200 : 130 }}>
          <img src={p.image_url} alt="" style={{ width: "100%", objectFit: "cover", display: "block" }} loading="lazy" />
        </div>
      )}
      <div style={{ fontFamily: F.regal, fontSize: featured ? 19 : 16, fontWeight: 800, color: "#eaf2fa", lineHeight: 1.35, marginBottom: 6 }}>
        {p.title}
      </div>
      {excerpt && <div style={{ fontSize: 13.5, color: "#9fb4c6", lineHeight: 1.7 }}>{excerpt}…</div>}
      <div style={{ marginTop: 10, fontSize: 11.5, color: "#6f8ea1", fontFamily: F.heading, letterSpacing: 1 }}>
        {timeAgoHe(p.modified || p.date)}
      </div>
    </Link>
  );
}

export default function HomeReality() {
  const nav = useNavigate();
  const [cinema, setCinema] = useState([]);
  const [recent, setRecent] = useState([]);
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  useEffect(() => {
    track("home_reality");
    applySeo({ title: "קוד המציאות — סוד 1820", description: "המספרים שמאחורי המציאות: דפוסים, צירופים והקוד שמתחת לפני השטח.", path: "/reality" });
    getPostsFromSupabase({ category: CINEMA_CAT, limit: 6, orderBy: "modified" }).then(({ posts }) => setCinema(posts || [])).catch(() => {});
    getPostsFromSupabase({ limit: 9, orderBy: "modified" }).then(({ posts }) => setRecent(posts || [])).catch(() => {});
  }, []);

  return (
    <div style={{ direction: "rtl", background: "#070b12", minHeight: "100vh", color: "#dfeaf3" }}>
      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 18px 80px" }}>

        {/* הירו */}
        <div style={{ textAlign: "center", padding: "54px 12px 34px" }}>
          <div style={{ fontFamily: F.heading, fontSize: 12.5, letterSpacing: 6, color: ACCENT, textTransform: "uppercase", marginBottom: 12, opacity: 0.85 }}>
            🎬 העדשה החילונית
          </div>
          <h1 style={{ fontFamily: F.regal, fontSize: "clamp(36px,8vw,64px)", fontWeight: 900, margin: "0 0 12px", color: "#eaf2fa", textShadow: `0 0 60px rgba(127,200,255,0.35)` }}>
            קוד המציאות
          </h1>
          <p style={{ fontSize: 17, color: "#9fb4c6", maxWidth: 560, margin: "0 auto 26px", lineHeight: 1.8 }}>
            מתחת לכל מספר מסתתר דפוס. אותו מנוע, אותה אמת — עדשה שמסתכלת על המציאות כעל <strong style={{ color: ACCENT }}>קוד</strong>.
          </p>
          <form onSubmit={go} style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלד מספר או מילה…"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 999, border: `1px solid rgba(127,200,255,0.35)`, background: "rgba(127,200,255,0.06)", color: "#eaf2fa", fontSize: 15, fontFamily: F.body, outline: "none" }} />
            <button type="submit" style={{ padding: "12px 22px", borderRadius: 999, border: "none", background: ACCENT, color: "#06121f", fontWeight: 800, fontFamily: F.heading, cursor: "pointer" }}>
              פענח
            </button>
          </form>
        </div>

        {/* הצופן בקולנוע */}
        {cinema.length > 0 && (
          <section style={{ marginTop: 30 }}>
            <h2 style={{ fontFamily: F.regal, fontSize: 22, fontWeight: 800, color: "#eaf2fa", marginBottom: 4 }}>🎬 הצופן בקולנוע</h2>
            <div style={{ fontSize: 13, color: "#7f97ab", marginBottom: 16 }}>הקוד שמסתתר בתוך הסרטים</div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 16 }}>
              {cinema.map(p => <PostCard key={p.id || p.wp_id} p={p} featured />)}
            </div>
          </section>
        )}

        {/* עדכונים אחרונים */}
        <section style={{ marginTop: 46 }}>
          <h2 style={{ fontFamily: F.regal, fontSize: 22, fontWeight: 800, color: "#eaf2fa", marginBottom: 16 }}>📡 עדכונים אחרונים</h2>
          {recent.length === 0 ? (
            <div style={{ color: "#7f97ab", padding: 20 }}>טוען…</div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(230px,1fr))", gap: 16 }}>
              {recent.map(p => <PostCard key={p.id || p.wp_id} p={p} />)}
            </div>
          )}
        </section>

        {/* גשר לעדשה השנייה */}
        <div style={{ marginTop: 48, textAlign: "center" }}>
          <Link to="/post" style={{ color: ACCENT, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
            כל הפוסטים ←
          </Link>
        </div>
      </div>
    </div>
  );
}
