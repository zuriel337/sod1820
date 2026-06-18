import React, { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase, getTopicCards, getGalleryImagesByIds, getAxisEvents } from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import VideoGallery from "../components/VideoGallery.jsx";
import VisitorSearchesBox from "../components/VisitorSearchesBox.jsx";

// ===== דף הבית החדש (תצוגה מקדימה) — /בית-חדש · /home-new =====
// מגיב למתג התמה הגלובלי (יום/לילה) דרך usePalette() — צבעים סמנטיים, לא קבועים.
// לילה = שער הקוסמוס (gate-bg); יום = קלף קרם נקי.

const HERO_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/heichal-1820-banner.png";

const TILES = [
  { icon: "🧮", label: "מחשבון גימטריה", to: "/gematria" },
  { icon: "🌳", label: "עץ המספרים", to: "/numbers" },
  { icon: "📚", label: "בית המדרש", to: "/beit-midrash" },
  { icon: "🖼️", label: "גלריות", to: "/archive" },
  { icon: "🌅", label: "ציר הזמן", to: "/timeline" },
  { icon: "📰", label: "כל הפוסטים", to: "/post" },
];

function stars(q) { const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2))); return "★".repeat(n) + "☆".repeat(5 - n); }

// כרטיסי שלד מהבהבים בזמן טעינה (במקום טקסט "טוען…")
const Skeletons = ({ n = 4 }) => Array.from({ length: n }).map((_, i) => <div key={i} className="hn-skel" aria-hidden />);

export default function HomeNewPage() {
  const P = usePalette();
  const nav = useNavigate();
  const [posts, setPosts] = useState([]);
  const [cards, setCards] = useState([]);
  const [imgMap, setImgMap] = useState({}); // id -> image_url לכרטיסי LIVE
  const [events, setEvents] = useState([]); // אירועי ציר ההתגלות (ל"מהארכיון")
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
    getAxisEvents(30).then(e => setEvents(e || [])).catch(() => {});
  }, []);

  // רקע: לילה = שקוף → הקוסמוס הסגול הגלובלי (SpaceBackground) מציץ מאחור;
  // יום = קלף קרם (אטום, מכסה). מקור אחד: SpaceBackground.jsx → משנה את כל הדפים הכהים.
  const rootBg = P.pageBg;

  // שער הגלקסיות — טופיקים שעוברים סף מחמיר (meter≥63) = גלקסיות פתוחות
  const galaxies = cards.filter(c => (c.meter_score || 0) >= 63).slice(0, 6);

  // מהארכיון — אירוע מתחלף יומית עם "לפני N שנים" (מ-metadata.year)
  const decodeHtml = s => { try { const t = document.createElement("textarea"); t.innerHTML = s; return t.value; } catch { return s; } };
  const yearEvents = events.filter(e => +(e.metadata?.year) > 1900);
  const archEv = yearEvents.length ? yearEvents[Math.floor(Date.now() / 864e5) % yearEvents.length] : null;
  const archN = archEv ? new Date().getFullYear() - +archEv.metadata.year : 0;
  const archAgo = archN <= 0 ? "השנה" : archN === 1 ? "לפני שנה" : `לפני ${archN} שנים`;

  return (
    <div style={{ direction: "rtl", minHeight: "100vh", background: rootBg, color: P.ink }}>
      <style>{`
        .hn-wrap { max-width: 1180px; margin: 0 auto; padding: 0 18px; }
        .hn-cta { display:inline-block; text-decoration:none; background:${P.accentBtn}; color:${P.onAccent};
          font-family:${F.heading}; font-weight:800; font-size:18px; padding:14px 38px; border-radius:999px; box-shadow:0 6px 26px ${P.glow}; }
        .hn-gate { position:relative; max-width:1040px; margin:0 auto; display:inline-block; }
        .hn-gate-img { width:100%; height:auto; display:block; border-radius:18px;
          -webkit-mask-image: radial-gradient(ellipse 92% 86% at 50% 44%, #000 56%, transparent 100%);
          mask-image: radial-gradient(ellipse 92% 86% at 50% 44%, #000 56%, transparent 100%);
          filter: drop-shadow(0 16px 46px rgba(0,0,0,.40)); }
        .hn-cta-big { font-size:21px; padding:16px 52px; }
        .hn-enter { position:absolute; left:50%; bottom:-26px; transform:translateX(-50%); white-space:nowrap;
          box-shadow:0 10px 34px ${P.glow}; animation:hn-pulse 2.4s ease-in-out infinite; }
        @keyframes hn-pulse { 0%,100%{ box-shadow:0 10px 30px ${P.glow}; } 50%{ box-shadow:0 12px 44px ${P.accent}; } }
        @media (max-width:520px){ .hn-cta-big{ font-size:18px; padding:13px 36px; } .hn-enter{ bottom:-22px; } }
        .hn-tile { background:${P.card}; border:1px solid ${P.border}; border-radius:14px; padding:16px 8px; text-decoration:none;
          text-align:center; transition:transform .15s, border-color .15s; }
        .hn-tile:hover { transform:translateY(-3px); border-color:${P.accent}; }
        .hn-card { background:${P.card}; border:1px solid ${P.border}; border-radius:14px; overflow:hidden; text-decoration:none; display:flex; flex-direction:column; transition:transform .15s, border-color .15s; }
        .hn-card:hover { transform:translateY(-3px); border-color:${P.accent}; }
        .hn-skel { background:${P.cardSoft}; border:1px solid ${P.border}; border-radius:14px; height:190px; position:relative; overflow:hidden; }
        .hn-skel::after { content:""; position:absolute; inset:0; transform:translateX(-100%);
          background:linear-gradient(90deg,transparent,${P.glow},transparent); animation:hn-shimmer 1.3s ease-in-out infinite; }
        @keyframes hn-shimmer { 100%{ transform:translateX(100%); } }
        .hn-h2 { color:${P.accentText}; font-family:${F.regal}; font-size:clamp(20px,3vw,27px); font-weight:800; text-align:center; margin:0 0 4px; }
        .hn-sub { color:${P.inkSoft}; font-family:${F.body}; font-size:14px; text-align:center; margin:0 0 20px; }
        .hn-grid6 { display:grid; grid-template-columns:repeat(6,1fr); gap:12px; }
        .hn-postgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:14px; }
        @media (max-width:820px){ .hn-grid6{grid-template-columns:repeat(3,1fr)} .hn-postgrid{grid-template-columns:repeat(2,1fr)} }
        @media (max-width:520px){ .hn-grid6{grid-template-columns:repeat(2,1fr)} .hn-postgrid{grid-template-columns:1fr 1fr} }
      `}</style>

      {/* ===== HERO — השער (הבאנר עצמו) + כפתור כניסה ===== */}
      <section className="hn-wrap" style={{ textAlign: "center", padding: "26px 16px 8px" }}>
        <div className="hn-gate">
          <img src={HERO_IMG} alt="כי לה' המלוכה · סוד 1820 — שער המספר הגדול" className="hn-gate-img"
            fetchpriority="high" decoding="async" />
          <Link to="/start" className="hn-cta hn-cta-big hn-enter">✨ כאן מתחילים</Link>
        </div>

        {/* חיפוש גימטריה + כניסה משנית */}
        <form onSubmit={go} style={{ display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", maxWidth: 460, margin: "44px auto 12px" }}>
          <input value={q} onChange={e => setQ(e.target.value)} placeholder="חשבו שם · מילה · מספר…" dir="rtl"
            style={{ flex: 1, minWidth: 180, background: P.cardSoft, border: `1px solid ${P.borderStrong}`, borderRadius: 999, color: P.ink, fontFamily: F.body, fontSize: 15, padding: "11px 18px", outline: "none", textAlign: "center" }} />
          <button type="submit" style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent, border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 15, padding: "11px 22px", whiteSpace: "nowrap" }}>✦ גלו</button>
        </form>
        <Link to="/gematria" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>🧮 בדקו את השם שלכם →</Link>
      </section>

      {/* ===== אריחי עדשות ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <div className="hn-grid6">
          {TILES.map(t => (
            <Link key={t.label} to={t.to} className="hn-tile">
              <div style={{ fontSize: 26, marginBottom: 6 }}>{t.icon}</div>
              <div style={{ color: P.ink, fontFamily: F.heading, fontSize: 13, fontWeight: 700, lineHeight: 1.3 }}>{t.label}</div>
            </Link>
          ))}
        </div>
      </section>

      {/* ===== שער הגלקסיות — בבנייה (כניסה להיכל בינתיים) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">🌌 שער הגלקסיות</h2>
        <p className="hn-sub">חוויית מסך מלא — היכל לכל התכנסות, עם כל התמונות והרמזים</p>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "30px 22px" }}>
          <div style={{ fontSize: 34, marginBottom: 8 }}>🚧</div>
          <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 800, marginBottom: 6 }}>השער בבנייה</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginBottom: 18 }}>בקרוב ייפתחו כאן כל הגלקסיות. בינתיים — היכנסו להיכל השערים.</div>
          <Link to="/היכל" className="hn-cta" style={{ fontSize: 15, padding: "11px 30px" }}>👑 כניסה להיכל השערים</Link>
        </div>
      </section>

      {/* ===== מה גולשים מחפשים עכשיו ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">🔎 מה גולשים מחפשים עכשיו</h2>
        <p className="hn-sub">המילים והשמות האחרונים שגולשים בדקו במחשבון — ומתי</p>
        <VisitorSearchesBox light={P.mode === "light"} limit={20} />
      </section>

      {/* ===== מהארכיון — אירוע "לפני N שנים" ===== */}
      {archEv && (
        <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
          <Link to="/timeline" className="hn-card" style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: "16px 18px", textDecoration: "none" }}>
            <div style={{ fontSize: 30, flexShrink: 0 }}>📅</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: P.accentDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 2, marginBottom: 4 }}>מהארכיון · {archAgo} ({archEv.metadata.year})</div>
              <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                {decodeHtml(stripHtml(archEv.label || "")).slice(0, 110)}
              </div>
            </div>
            <span aria-hidden style={{ color: P.accentText, fontSize: 18 }}>←</span>
          </Link>
        </section>
      )}

      {/* ===== עדכונים אחרונים (בחזית) ===== */}

      {/* ===== עדכונים אחרונים (בחזית) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">📜 עדכונים אחרונים</h2>
        <p className="hn-sub">החדשות והרמזים האחרונים באתר</p>
        <div className="hn-postgrid">
          {posts.slice(0, 8).map(p => (
            <Link key={p.wp_id || p.id} to={`/${p.slug}`} className="hn-card">
              <div style={{ height: 120, background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : P.cardGrad }} />
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 14, fontWeight: 700, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title || "")}</div>
                <div style={{ marginTop: "auto", color: P.inkSoft, fontFamily: F.heading, fontSize: 11 }}>{p.date ? new Date(p.date).toLocaleDateString("he-IL") : ""}{(p.verified || p.ai_touched) ? " · ✓ AI" : ""}</div>
              </div>
            </Link>
          ))}
          {!posts.length && <Skeletons n={4} />}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
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
              <div style={{ height: 110, background: img ? `center/cover no-repeat url(${img})` : P.cardGrad, display: "flex", alignItems: "flex-end" }}>
                <span style={{ color: P.accent, fontSize: 11, letterSpacing: 1, background: P.cardSoft, borderRadius: 999, padding: "2px 9px", margin: 8 }}>{stars(c.quality)}</span>
              </div>
              <div style={{ padding: "12px 14px", display: "flex", flexDirection: "column", gap: 8, flex: 1 }}>
                <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 16, fontWeight: 800, lineHeight: 1.4 }}>{c.title}</div>
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginTop: "auto" }}>
                  {(c.highlight_numbers || []).slice(0, 4).map(n => (
                    <span key={n} style={{ fontFamily: F.mono, fontWeight: 800, fontSize: 12, color: P.accentText, border: `1px solid ${P.borderStrong}`, borderRadius: 999, padding: "1px 9px" }}>{n}</span>
                  ))}
                </div>
              </div>
            </Link>
            );
          })}
          {!cards.length && <Skeletons n={4} />}
        </div>
      </section>

      <div style={{ textAlign: "center", padding: "0 18px 56px" }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700, marginBottom: 16 }}>
          🤍 ברוכים הבאים לבית החדש שלנו
        </div>
        <div style={{ display: "flex", gap: 10, justifyContent: "center", flexWrap: "wrap" }}>
          <Link to="/start" className="hn-cta" style={{ fontSize: 15, padding: "11px 30px" }}>✨ כאן מתחילים</Link>
          <Link to="/gematria" style={{ display: "inline-block", textDecoration: "none", border: `1px solid ${P.borderStrong}`, color: P.accentText, fontFamily: F.heading, fontWeight: 700, fontSize: 15, padding: "11px 26px", borderRadius: 999 }}>🧮 למחשבון הגימטריה</Link>
        </div>
      </div>
    </div>
  );
}
