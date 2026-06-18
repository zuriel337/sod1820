import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { C, F } from "../theme.js";
import { getPostsFromSupabase, getTopicCards, getGalleryImagesByIds } from "../lib/supabase.js";
import { stripHtml, formatDateHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import VideoGallery from "../components/VideoGallery.jsx";

// ===== דף הבית החדש (תצוגה מקדימה) — /בית-חדש · /home-new =====
// מבנה לפי המוקאפ: ירו 1820 → שתי עמודות → אריחי עדשות → עדכונים אחרונים
// → חדשות בית המדרש (LIVE) → פוטר. לא נוגע בדף הבית הקיים.

const HERO_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/heichal-1820-banner.png";

const TILES = [
  { icon: "🧮", label: "מחשבון גימטריה", to: "/gematria" },
  { icon: "🌳", label: "עץ המספרים", to: "/numbers" },
  { icon: "🌐", label: "צירי התכנסות", to: "/beit-midrash" },
  { icon: "🖼️", label: "גלריות", to: "/archive" },
  { icon: "🌅", label: "ציר הזמן", to: "/timeline" },
  { icon: "📚", label: "בית המדרש", to: "/beit-midrash" },
];

function stars(q) { const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2))); return "★".repeat(n) + "☆".repeat(5 - n); }

export default function HomeNewPage() {
  const nav = useNavigate();
  const [posts, setPosts] = useState([]);
  const [cards, setCards] = useState([]);
  const [imgMap, setImgMap] = useState({}); // id -> image_url לכרטיסי LIVE
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  useEffect(() => {
    applySeo({ title: "כי לה' המלוכה — סוד 1820", description: "בית המדרש של סוד 1820 — גימטריה קבלית וחכמת הקשרים.", path: "/home-new" });
    getPostsFromSupabase({ limit: 8, orderBy: "modified" }).then(({ posts: r }) => setPosts(r || [])).catch(() => {});
    getTopicCards({ approvedOnly: true }).then(async c => {
      setCards(c || []);
      const ids = [...new Set((c || []).map(x => (x.image_ids || [])[0]).filter(Boolean))];
      if (ids.length) { try { const im = await getGalleryImagesByIds(ids); setImgMap(Object.fromEntries((im || []).map(x => [x.id, x.image_url]))); } catch { /* ignore */ } }
    }).catch(() => {});
  }, []);

  return (
    <div style={{ direction: "rtl", minHeight: "100vh",
      background: "linear-gradient(rgba(7,5,14,.86), rgba(7,5,14,.93)), url(/gate-bg.jpg) center top / cover fixed, #07050E" }}>
      <style>{`
        .hn-wrap { max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .hn-cta { display:inline-block; text-decoration:none; background:linear-gradient(135deg,#e9c84a,#9a7818); color:#1a0e00;
          font-family:${F.heading}; font-weight:800; font-size:18px; padding:14px 38px; border-radius:999px; box-shadow:0 6px 26px rgba(212,175,55,.4); }
        .hn-gate { position:relative; max-width:1040px; margin:0 auto; display:inline-block; }
        .hn-gate-img { width:100%; height:auto; display:block; border-radius:18px; border:1px solid ${C.borderGold};
          box-shadow:0 24px 70px rgba(0,0,0,.65), 0 0 60px rgba(212,175,55,.22); }
        .hn-cta-big { font-size:21px; padding:16px 52px; }
        .hn-enter { position:absolute; left:50%; bottom:-26px; transform:translateX(-50%); white-space:nowrap;
          box-shadow:0 10px 34px rgba(212,175,55,.55); animation:hn-pulse 2.4s ease-in-out infinite; }
        @keyframes hn-pulse { 0%,100%{ box-shadow:0 10px 30px rgba(212,175,55,.45); } 50%{ box-shadow:0 12px 44px rgba(212,175,55,.8); } }
        @media (max-width:520px){ .hn-cta-big{ font-size:18px; padding:13px 36px; } .hn-enter{ bottom:-22px; } }
        .hn-pillar { background:linear-gradient(160deg,rgba(20,15,12,.7),rgba(8,5,2,.55)); border:1px solid ${C.borderGold}; border-radius:16px;
          padding:20px 18px; text-decoration:none; display:block; transition:transform .15s, border-color .15s; }
        .hn-pillar:hover { transform:translateY(-3px); border-color:${C.gold}; }
        .hn-tile { background:rgba(20,15,12,.55); border:1px solid ${C.border}; border-radius:14px; padding:16px 8px; text-decoration:none;
          text-align:center; transition:transform .15s, border-color .15s; }
        .hn-tile:hover { transform:translateY(-3px); border-color:${C.gold}; }
        .hn-card { background:rgba(20,15,12,.55); border:1px solid ${C.border}; border-radius:14px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform .15s, border-color .15s; }
        .hn-card:hover { transform:translateY(-3px); border-color:${C.gold}; }
        .hn-h2 { color:${C.goldBright}; font-family:${F.regal}; font-size:clamp(20px,3vw,27px); font-weight:800; text-align:center; margin:0 0 4px; }
        .hn-sub { color:${C.muted}; font-family:${F.body}; font-size:14px; text-align:center; margin:0 0 20px; }
        .hn-grid6 { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
        .hn-grid2 { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        .hn-postgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media (max-width:820px){ .hn-grid6{grid-template-columns:repeat(3,1fr)} .hn-postgrid{grid-template-columns:repeat(2,1fr)} }
        @media (max-width:520px){ .hn-grid6{grid-template-columns:repeat(2,1fr)} .hn-grid2{grid-template-columns:1fr} .hn-postgrid{grid-template-columns:1fr 1fr} }
      `}</style>

      {/* ===== HERO — השער (הבאנר עצמו) + כפתור כניסה ===== */}
      <section className="hn-wrap" style={{ textAlign: "center", padding: "26px 16px 8px" }}>
        <div className="hn-gate">
          <img src={HERO_IMG} alt="כי לה' המלוכה · סוד 1820 — שער המספר הגדול" className="hn-gate-img" />
          {/* כפתור הכניסה — יושב על תחתית השער */}
          <Link to="/start" className="hn-cta hn-cta-big hn-enter">✨ כאן מתחילים</Link>
        </div>

        {/* חיפוש גימטריה + כניסה משנית */}
        <form onSubmit={go} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "44px auto 12px" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חשבו שם · מילה · מספר…" dir="rtl"
            style={{ flex: 1, minWidth: 180, background: "rgba(8,5,2,.6)", border: `1px solid ${C.borderGold}`, borderRadius: 999, color: C.goldLight, fontFamily: F.body, fontSize: 15, padding: "11px 18px", outline: "none", textAlign: "center" }} />
          <button type="submit" style={{ cursor: "pointer", background: C.goldDeep, color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "11px 22px", whiteSpace: "nowrap" }}>✦ גלו</button>
        </form>
        <Link to="/gematria" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>🧮 בדקו את השם שלכם →</Link>
      </section>

      {/* ===== אריחי עדשות ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <div className="hn-grid6">
          {TILES.map(t => (
            <Link key={t.label} to={t.to} className="hn-tile">
              <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ color: C.goldLight, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{t.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== עדכונים אחרונים (בחזית) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">📜 עדכונים אחרונים</h2>
        <p className="hn-sub">החדשות והרמזים האחרונים באתר</p>
        <div className="hn-postgrid">
          {posts.slice(0, 8).map(p => (
            <Link key={p.wp_id || p.id} to={`/${p.slug}`} className="hn-card">
              <div style={{ height: 120, background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : `linear-gradient(135deg,${C.goldDeep},${C.faint})` }} />
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 14, fontWeight: 700, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title || "")}</div>
                <div style={{ marginTop: "auto", color: C.goldDim, fontFamily: F.heading, fontSize: 11 }}>{p.date ? new Date(p.date).toLocaleDateString("he-IL") : ""}{(p.verified || p.ai_touched) ? " · ✓ AI" : ""}</div>
              </div>
            </Link>
          ))}
          {!posts.length && <div style={{ color: C.muted, fontFamily: F.body, padding: 12 }}>טוען עדכונים…</div>}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/post" style={{ color: C.goldBright, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        </div>
      </section>

      {/* ===== גלריית הסרטים — שורה אחת (הוחזרה מ"שולחן העבודה") ===== */}
      <section style={{ padding: "0 0 36px" }}>
        <VideoGallery />
      </section>

      {/* ===== חדשות בית המדרש · LIVE (צירי התכנסות) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 60px" }}>
        <h2 className="hn-h2"><span style={{ color: "#e0556a" }}>● LIVE</span> · חדשות בית המדרש</h2>
        <p className="hn-sub">צירי ההתכנסות החיים — כל ציר מחבר מספר, אירוע וגלריה</p>
        <div className="hn-postgrid">
          {cards.slice(0, 8).map(c => {
            const img = imgMap[(c.image_ids || [])[0]];
            return (
            <Link key={c.slug} to={`/topic/${encodeURIComponent(c.slug)}`} className="hn-card">
              <div style={{ height: 110, background: img ? `center/cover no-repeat url(${img})` : "linear-gradient(135deg,rgba(212,175,55,.22),rgba(8,5,2,.5))", display: "flex", alignItems: "flex-end" }}>
                <span style={{ color: C.gold, fontSize: 11, letterSpacing: 1, background: "rgba(5,4,0,.6)", borderRadius: 999, padding: "2px 9px", margin: 8 }}>{stars(c.quality)}</span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{c.title}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: "auto" }}>
                  {(c.highlight_numbers || []).slice(0, 4).map(n => (
                    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 12, color: C.goldBright, border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "1px 9px" }}>{n}</span>
                  ))}
                </div>
              </div>
            </Link>
            );
          })}
          {!cards.length && <div style={{ color: C.muted, fontFamily: F.body, padding: 12 }}>טוען צירי התכנסות…</div>}
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "0 18px 50px", color: C.goldLight, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>
        🤍 ברוכים הבאים לבית החדש שלנו
      </div>
    </div>
  );
}
