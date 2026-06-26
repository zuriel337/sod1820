import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { getPostsFromSupabase } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { track } from "../lib/tracking.js";
import MatrixRain from "../components/MatrixRain.jsx";
import Fx, { FX_LIST } from "../components/fx/Fx.jsx";
import { LAB_ITEMS } from "../lib/labItems.js";

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
      <style>{`
        @keyframes hr-float { 0%,100%{ transform: translateY(0) } 50%{ transform: translateY(-7px) } }
        .hr-exp-row { display:flex; gap:14px; overflow-x:auto; padding:6px 2px 16px; scroll-snap-type:x mandatory; -webkit-overflow-scrolling:touch; }
        .hr-exp-row::-webkit-scrollbar { height:6px } .hr-exp-row::-webkit-scrollbar-thumb { background:rgba(127,200,255,0.3); border-radius:9px }
        .hr-exp-card { scroll-snap-align:start; flex:0 0 200px; animation: hr-float 5s ease-in-out infinite; transition: transform .2s, border-color .2s, box-shadow .2s; }
        .hr-exp-card:hover { transform: translateY(-10px) scale(1.03) !important; border-color:#7fc8ff !important; box-shadow:0 14px 36px rgba(127,200,255,0.25) }
      `}</style>

      {/* הירו — עם מטריקס-ריין מאחור */}
      <div style={{ position: "relative", overflow: "hidden", borderBottom: "1px solid rgba(127,200,255,0.12)" }}>
        <MatrixRain color={ACCENT} />
        {/* דהיית קריאוּת מעל הריין */}
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(7,11,18,0.45) 0%, rgba(7,11,18,0.82) 70%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, textAlign: "center", padding: "64px 16px 44px", maxWidth: 720, margin: "0 auto" }}>
          <div style={{ fontFamily: F.heading, fontSize: 12.5, letterSpacing: 6, color: ACCENT, textTransform: "uppercase", marginBottom: 12, opacity: 0.9 }}>
            🎬 העדשה החילונית
          </div>
          <h1 style={{ fontFamily: F.regal, fontSize: "clamp(38px,8vw,68px)", fontWeight: 900, margin: "0 0 12px", color: "#eaf2fa", textShadow: `0 0 60px rgba(127,200,255,0.45)` }}>
            קוד המציאות
          </h1>
          <p style={{ fontSize: 17, color: "#aebfcd", maxWidth: 560, margin: "0 auto 26px", lineHeight: 1.8 }}>
            מתחת לכל מספר מסתתר דפוס. אותו מנוע, אותה אמת — עדשה שמסתכלת על המציאות כעל <strong style={{ color: ACCENT }}>קוד</strong>.
          </p>
          <form onSubmit={go} style={{ display: "flex", gap: 8, maxWidth: 420, margin: "0 auto" }}>
            <input value={q} onChange={e => setQ(e.target.value)} placeholder="הקלד מספר או מילה…"
              style={{ flex: 1, padding: "12px 16px", borderRadius: 999, border: `1px solid rgba(127,200,255,0.4)`, background: "rgba(7,11,18,0.6)", color: "#eaf2fa", fontSize: 15, fontFamily: F.body, outline: "none" }} />
            <button type="submit" style={{ padding: "12px 22px", borderRadius: 999, border: "none", background: ACCENT, color: "#06121f", fontWeight: 800, fontFamily: F.heading, cursor: "pointer" }}>
              פענח
            </button>
          </form>
        </div>
      </div>

      <div style={{ maxWidth: 1080, margin: "0 auto", padding: "0 18px 80px" }}>

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

        {/* אזור הניסויים — רצועה זזה (מ-/lab, בלי שכפול) */}
        <section style={{ marginTop: 52 }}>
          <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: 6, flexWrap: "wrap", gap: 8 }}>
            <h2 style={{ fontFamily: F.regal, fontSize: 22, fontWeight: 800, color: "#eaf2fa", margin: 0 }}>🧪 אזור הניסויים</h2>
            <Link to="/lab" style={{ color: ACCENT, textDecoration: "none", fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>כל החוויות ←</Link>
          </div>
          <div style={{ fontSize: 13, color: "#7f97ab", marginBottom: 14 }}>חוויות תלת-מימד — היכנס, תעוף, תגלה</div>
          <div className="hr-exp-row">
            {LAB_ITEMS.map(it => (
              <Link key={it.to} to={it.to} className="hr-exp-card" style={{
                textDecoration: "none", display: "block", padding: "16px 16px", borderRadius: 14,
                background: it.hot ? "linear-gradient(150deg, rgba(155,123,255,0.16), rgba(7,11,18,0.6))" : "rgba(127,200,255,0.05)",
                border: `1px solid ${it.hot ? "#9b7bff66" : "rgba(127,200,255,0.22)"}`,
              }}>
                {it.hot && <span style={{ float: "left", fontFamily: F.heading, fontSize: 9.5, fontWeight: 800, color: "#1a0e00", background: "linear-gradient(135deg,#c9a6ff,#ff8ad1)", borderRadius: 999, padding: "2px 8px" }}>חדש</span>}
                <div style={{ fontSize: 30, marginBottom: 8 }}>{it.g}</div>
                <div style={{ color: "#eaf2fa", fontFamily: F.regal, fontSize: 16, fontWeight: 800 }}>{it.t}</div>
                <div style={{ color: "#8aa0b3", fontFamily: F.body, fontSize: 12.5, lineHeight: 1.6, marginTop: 4 }}>{it.d}</div>
                <div style={{ color: it.hot ? "#c9a6ff" : ACCENT, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, marginTop: 12 }}>היכנס →</div>
              </Link>
            ))}
          </div>
        </section>

        {/* גלריית אפקטים — 5 אופציות תלת-ממד לשימוש חוזר */}
        <section style={{ marginTop: 56 }}>
          <h2 style={{ fontFamily: F.regal, fontSize: 22, fontWeight: 800, color: "#eaf2fa", margin: "0 0 4px" }}>🌀 עוד אפקטים — בחר לאן לקחת</h2>
          <div style={{ fontSize: 13, color: "#7f97ab", marginBottom: 16 }}>חמישה אפקטים תלת-ממדיים קלים. כל אחד רכיב לשימוש חוזר — אפשר לקחת לכל מקום באתר.</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
            {FX_LIST.map(fx => (
              <div key={fx.kind} style={{ borderRadius: 14, overflow: "hidden", border: "1px solid rgba(127,200,255,0.2)", background: "#070b12" }}>
                <div style={{ position: "relative", height: 150, background: "#070b12" }}>
                  <Fx kind={fx.kind} color={ACCENT} />
                </div>
                <div style={{ padding: "12px 14px", borderTop: "1px solid rgba(127,200,255,0.12)" }}>
                  <div style={{ color: "#eaf2fa", fontFamily: F.regal, fontSize: 15.5, fontWeight: 800 }}>{fx.label}</div>
                  <div style={{ color: "#8aa0b3", fontSize: 12.5, lineHeight: 1.6, marginTop: 3 }}>{fx.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* גשר לעדשה השנייה */}
        <div style={{ marginTop: 44, textAlign: "center" }}>
          <Link to="/post" style={{ color: ACCENT, textDecoration: "none", fontFamily: F.heading, fontSize: 14, fontWeight: 700 }}>
            כל הפוסטים ←
          </Link>
        </div>
      </div>
    </div>
  );
}
