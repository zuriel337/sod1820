import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { setTheme } from "../lib/themeMode.js";
import { getPostsFromSupabase, getTopicCards, getGalleryImagesByIds, getAxisEvents } from "../lib/supabase.js";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { applySeo } from "../lib/seo.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { useHotPostSlugs } from "../lib/hotPosts.js";
import VideoGallery from "../components/VideoGallery.jsx";
import RecentSearches from "../components/RecentSearches.jsx";
import CommunityWordsBox from "../components/CommunityWordsBox.jsx";
import CrossInsightsBox from "../components/CrossInsightsBox.jsx";
import StartHereCard from "../components/StartHereCard.jsx";
import NumberOfDay from "../components/NumberOfDay.jsx";
import RealityWorld from "../components/RealityWorld.jsx";

// ===== דף הבית החדש (תצוגה מקדימה) — /בית-חדש · /home-new =====
// מגיב למתג התמה הגלובלי (יום/לילה) דרך usePalette() — צבעים סמנטיים, לא קבועים.
// לילה = שער הקוסמוס (gate-bg); יום = קלף קרם נקי.

const HERO_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/heichal-1820-banner.webp";

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
  const hotSlugs = useHotPostSlugs();   // 🔥 פוסטים חמים השבוע (דגל בלבד)
  const [cards, setCards] = useState([]);
  const [imgMap, setImgMap] = useState({}); // id -> image_url לכרטיסי LIVE
  const [events, setEvents] = useState([]); // אירועי ציר ההתגלות (ל"מהארכיון")
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  // בורר תמה לגולש חדש — מופיע פעם אחת (כשאין העדפה שמורה). ברירת המחדל כהה; כאן בוחרים.
  const [showThemePick, setShowThemePick] = useState(false);
  useEffect(() => { try { if (!localStorage.getItem("sod-theme")) setShowThemePick(true); } catch { /* ignore */ } }, []);
  const pickTheme = m => { setTheme(m); setShowThemePick(false); };

  useEffect(() => {
    applySeo({ title: "כי לה' המלוכה — סוד 1820", description: "בית המדרש של סוד 1820 — גימטריה קבלית וחכמת הקשרים.", path: "/home-new" });
    getPostsFromSupabase({ limit: 8, orderBy: "modified" }).then(({ posts: r }) => { setPosts(r || []); markSeenKey("home-posts"); }).catch(() => {});
    getTopicCards({ approvedOnly: true }).then(async c => {
      setCards(c || []);
      const ids = [...new Set((c || []).map(x => (x.image_ids || [])[0]).filter(Boolean))];
      if (ids.length) { try { const im = await getGalleryImagesByIds(ids); setImgMap(Object.fromEntries((im || []).map(x => [x.id, x.image_url]))); } catch { /* ignore */ } }
      markSeenKey("home-conv");   // ראה את ההתכנסות → הביקור הבא ישווה לרגע זה (לא יהבהב שוב)
    }).catch(() => {});
    getAxisEvents(30).then(e => setEvents(e || [])).catch(() => {});
  }, []);

  // רקע: לילה = שקוף → הקוסמוס הסגול הגלובלי (SpaceBackground) מציץ מאחור;
  // יום = קלף קרם (אטום, מכסה). מקור אחד: SpaceBackground.jsx → משנה את כל הדפים הכהים.
  const rootBg = P.pageBg;

  // שער הגלקסיות — טופיקים שעוברים סף מחמיר (meter≥63) = גלקסיות פתוחות
  const galaxies = cards.filter(c => (c.meter_score || 0) >= 63).slice(0, 6);

  // LIVE — 4 ההתכנסויות האחרונות בלבד; "חדש" = נוסף מאז הביקור האחרון (per-user).
  const convCutoff = useMemo(() => seenCutoff("home-conv"), []);
  const postsCutoff = useMemo(() => seenCutoff("home-posts"), []);
  const isFreshPost = p => Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)) > +new Date(postsCutoff);
  const liveCards = useMemo(() => [...cards]
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
    .slice(0, 4), [cards]);

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
          aspect-ratio: 1536 / 1024; object-fit:cover; background:${P.cardSoft};
          border:1px solid ${P.borderStrong}; box-shadow:0 16px 46px rgba(0,0,0,.40); }
        .hn-cta-big { font-size:21px; padding:16px 52px; }
        .hn-enter { position:absolute; left:50%; bottom:-26px; transform:translateX(-50%); white-space:nowrap;
          box-shadow:0 10px 34px ${P.glow}; animation:hn-pulse 2.4s ease-in-out infinite; }
        @keyframes hn-pulse { 0%,100%{ box-shadow:0 10px 30px ${P.glow}; } 50%{ box-shadow:0 12px 44px ${P.accent}; } }
        @media (max-width:520px){ .hn-cta-big{ font-size:14.5px; padding:9px 22px; } .hn-enter{ bottom:-18px; } }
        @media (max-width:360px){ .hn-cta-big{ font-size:13px; padding:8px 18px; } .hn-enter{ bottom:-16px; } }
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

      {/* ===== בורר תמה לגולש חדש (פעם אחת) ===== */}
      {showThemePick && (
        <div style={{ display: "flex", gap: 10, alignItems: "center", justifyContent: "center", flexWrap: "wrap",
          background: P.cardSoft, borderBottom: `1px solid ${P.border}`, padding: "9px 16px" }}>
          <span style={{ color: P.ink, fontFamily: F.body, fontSize: 14 }}>איך לראות את האתר?</span>
          <button onClick={() => pickTheme("dark")} style={{ cursor: "pointer", background: P.accentBtn, color: P.onAccent,
            border: "none", borderRadius: 999, fontFamily: F.heading, fontWeight: 800, fontSize: 13.5, padding: "7px 18px" }}>🌙 מצב לילה</button>
          <button onClick={() => pickTheme("light")} style={{ cursor: "pointer", background: "transparent", color: P.accentText,
            border: `1px solid ${P.borderStrong}`, borderRadius: 999, fontFamily: F.heading, fontWeight: 700, fontSize: 13.5, padding: "7px 18px" }}>☀️ מצב יום</button>
          <span style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 12 }}>(תמיד אפשר לשנות עם 🌙/☀️ למעלה)</span>
        </div>
      )}

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
      </section>

      {/* ===== עדכונים אחרונים — בראש (מיד אחרי החיפוש), כדי שמבקר חוזר יראה מיד מה חדש ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">📜 עדכונים אחרונים</h2>
        <p className="hn-sub">החדשות והרמזים האחרונים באתר</p>
        <div className="hn-postgrid">
          {posts.slice(0, 8).map(p => {
            const fresh = isFreshPost(p);
            const hot = hotSlugs.has(p.slug);
            return (
            <Link key={p.wp_id || p.id} to={`/${p.slug}`} className="hn-card" style={fresh ? { borderColor: "#e0556a", boxShadow: "0 0 0 1px #e0556a55" } : undefined}>
              <div style={{ height: 120, position: "relative", background: p.image_url ? `center/cover no-repeat url(${p.image_url})` : P.cardGrad }}>
                {fresh && <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", animation: "hn-pulse 1.8s ease-in-out infinite" }}>🆕 חדש</span>}
                {hot && <span title="חם השבוע" style={{ position: "absolute", top: 8, insetInlineStart: 8, background: "rgba(0,0,0,0.55)", color: "#fff", fontSize: 13, borderRadius: 999, padding: "2px 7px" }}>🔥</span>}
              </div>
              <div style={{ padding: "10px 12px", display: "flex", flexDirection: "column", gap: 6, flex: 1 }}>
                <div style={{ color: P.ink, fontFamily: F.regal, fontSize: 14, fontWeight: 700, lineHeight: 1.45, display: "-webkit-box", WebkitLineClamp: 3, WebkitBoxOrient: "vertical", overflow: "hidden" }}>{stripHtml(p.title || "")}</div>
                <div style={{ marginTop: "auto", color: P.inkSoft, fontFamily: F.heading, fontSize: 11 }}>🕒 עודכן {timeAgoHe(p.modified || p.date)}{(p.verified || p.ai_touched) ? " · ✓ AI" : ""}</div>
              </div>
            </Link>
            );
          })}
          {!posts.length && <Skeletons n={4} />}
        </div>
        <div style={{ textAlign: "center", marginTop: 16 }}>
          <Link to="/post" style={{ color: P.accentText, textDecoration: "none", fontFamily: F.heading, fontWeight: 700, fontSize: 14 }}>אל כל הפוסטים →</Link>
        </div>
      </section>

      {/* ===== 🌊 זרם המציאות + דופק המציאות (המספרים החיים) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <RealityWorld compact />
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

      {/* ===== 🗓 המספר של היום — באנר יומי מתחלף ===== */}
      <NumberOfDay />

      {/* ===== עץ המספרים — כניסה חיה ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">🕸️ עץ המספרים</h2>
        <p className="hn-sub">כל מספר במרכז — וחוטים לכל הקשרים שלו: התכנסויות ומספרים שמתכנסים יחד</p>
        <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", background: P.cardGrad, border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "26px 22px" }}>
          <div style={{ fontSize: 32, marginBottom: 10 }}>🕸️</div>
          <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, marginBottom: 18 }}>סיור תלת-מימדי חי ברשת הקשרים של המספרים. לחצו על מספר וצללו פנימה.</div>
          <Link to="/numbers" className="hn-cta" style={{ fontSize: 15, padding: "11px 30px" }}>🕸️ כניסה לעץ המספרים</Link>
        </div>
      </section>

      {/* ===== 🚀 כאן מתחילים — אונבורדינג למתחילים ===== */}
      <StartHereCard />

      {/* ===== מה גולשים מחפשים עכשיו ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">🔎 מה גולשים מחפשים עכשיו</h2>
        <p className="hn-sub">המילים והשמות האחרונים שגולשים בדקו במחשבון</p>
        <RecentSearches max={6} light={P.mode === "light"} seeAllTo="/beit-midrash?tab=searches" />
        <div style={{ marginTop: 16 }}><CommunityWordsBox max={4} /></div>
      </section>

      {/* ===== הצלבות המנוע (AI) — כמה נוספו + תאריך ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <h2 className="hn-h2">🔮 הצלבות המנוע</h2>
        <p className="hn-sub">חיבורים נדירים בין ביטויים — נמצאו ואומתו אוטומטית במנוע הגימטריה</p>
        <CrossInsightsBox light={P.mode === "light"} max={3} />
      </section>

      {/* ===== מהארכיון — אירוע "לפני N שנים" ===== */}
      {archEv && (
        <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
          <Link to={archEv.metadata?.slug ? `/${archEv.metadata.slug}` : "/timeline"} className="hn-card" style={{ flexDirection: "row", alignItems: "center", gap: 14, padding: "16px 18px", textDecoration: "none" }}>
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

      {/* ===== גלריית הסרטים — שורה אחת (הוחזרה מ"שולחן העבודה") ===== */}
      <section style={{ padding: "0 0 36px" }}>
        <VideoGallery />
      </section>

      {/* ===== חדשות בית המדרש · LIVE (צירי התכנסות) ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 60px" }}>
        <h2 className="hn-h2"><span style={{ color: "#e0556a" }}>● LIVE</span> · חדשות בית המדרש</h2>
        <p className="hn-sub">ארבע ההתכנסויות האחרונות — החדש מודגש</p>
        <div className="hn-postgrid">
          {liveCards.map(c => {
            const img = imgMap[(c.image_ids || [])[0]];
            const fresh = isNewSince(c, convCutoff);
            return (
            <Link key={c.slug} to={`/topic/${encodeURIComponent(c.slug)}`} className="hn-card" style={fresh ? { borderColor: "#e0556a", boxShadow: `0 0 0 1px #e0556a55` } : undefined}>
              <div style={{ height: 110, background: img ? `center/cover no-repeat url(${img})` : P.cardGrad, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                <span style={{ color: P.accent, fontSize: 11, letterSpacing: 1, background: P.cardSoft, borderRadius: 999, padding: "2px 9px", margin: 8 }}>{stars(c.quality)}</span>
                {fresh && <span style={{ background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", margin: 8, animation: "hn-pulse 1.8s ease-in-out infinite" }}>🆕 חדש</span>}
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

      {/* סיום חם — בלי לשכפל את «כאן מתחילים» (כבר בהירו) ואת המחשבון (כבר באריחים) */}
      <div style={{ textAlign: "center", padding: "0 18px 56px" }}>
        <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 18, fontWeight: 700 }}>
          🤍 ברוכים הבאים לבית החדש שלנו
        </div>
      </div>
    </div>
  );
}
