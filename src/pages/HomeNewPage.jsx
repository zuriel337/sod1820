import React, { useState, useEffect, useMemo } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F, GALLERY_BG } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase, getTopicCards, getAxisEvents, getGalleryUpdates, getHomeSets, setImageCuration, getGalleryImageCount, getTopPrimaryValues, getHotNumbers } from "../lib/supabase.js";
import NumberBubbles from "../components/NumberBubbles.jsx";
import { bubblesFromCounts } from "../lib/bubbles.js";
import { useAuth } from "../lib/AuthContext.jsx";
import Lightbox from "../components/Lightbox.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import { stripHtml, timeAgoHe } from "../lib/format.js";
import { effDate, shortDate, domNum, hintNums } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";
import { thumb } from "../lib/img.js";
import { applySeo } from "../lib/seo.js";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { useHotPostSlugs } from "../lib/hotPosts.js";
import VideoGallery from "../components/VideoGallery.jsx";
import Fx from "../components/fx/Fx.jsx";
import RecentSearches from "../components/RecentSearches.jsx";
import CommunityWordsBox from "../components/CommunityWordsBox.jsx";
import CrossInsightsBox from "../components/CrossInsightsBox.jsx";
import StartHereCard from "../components/StartHereCard.jsx";
import NumberOfDay from "../components/NumberOfDay.jsx";
import RealityWorld from "../components/RealityWorld.jsx";
import TreasuresHome from "../components/TreasuresHome.jsx";
import { track } from "../lib/tracking.js";
import { getStoredTopics, isRelatedToTopics, RELATED_BOOST_MS } from "../lib/feedRanking.js";
import StayUpdatedCTA from "../components/StayUpdatedCTA.jsx";
import HomeHeader from "../components/HomeHeader.jsx";
import LatestUpdatesFeed from "../components/LatestUpdatesFeed.jsx";

// ===== דף הבית החדש (תצוגה מקדימה) — /בית-חדש · /home-new =====
// מגיב למתג התמה הגלובלי (יום/לילה) דרך usePalette() — צבעים סמנטיים, לא קבועים.
// לילה = שער הקוסמוס (gate-bg); יום = קלף קרם נקי.

const HERO_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/heichal-1820-banner.webp";

const TILES = [
  { icon: "🧮", label: "מחשבון גימטריה", to: "/gematria" },
  { icon: "🌳", label: "עץ ההתכנסויות", to: "/numbers" },
  { icon: "📚", label: "בית המדרש", to: "/beit-midrash" },
  { icon: "🖼️", label: "גלריות", to: "/archive" },
  { icon: "🌅", label: "ציר הזמן", to: "/timeline" },
  { icon: "📰", label: "כל הפוסטים", to: "/post" },
];

function stars(q) { const n = Math.max(0, Math.min(5, Math.round((q || 0) / 2))); return "★".repeat(n) + "☆".repeat(5 - n); }

// רקע מעוצב לכרטיס התכנסות — גרדיאנט + אייקון לפי הנושא (אין תמונות נושאיות במאגר,
// אז במקום צילומי-מסך אקראיים מציירים כיסוי תמטי. לפי מילות-מפתח בכותרת → נשאר נכון
// גם כשההתכנסויות מתחלפות, עם נפילה לכיסוי מלכותי ברירת-מחדל).
function convCover(c) {
  const t = c.title || "";
  const has = (...ks) => ks.some(k => t.includes(k));
  if (has("אליהו")) return { bg: "linear-gradient(135deg,#7a2e00,#c2410c,#1a0e00)", emoji: "🔥" };
  if (has("ירושלים", "שומרים", "מקדש", "כותל")) return { bg: "linear-gradient(135deg,#1e3a5f,#b8860b,#0a0a14)", emoji: "🏛️" };
  if (has("זית", "הר ה")) return { bg: "linear-gradient(135deg,#2d4a1e,#6b8e23,#0e1408)", emoji: "🫒" };
  if (has("בבוא", "השתקפ", "מראה", "ראי")) return { bg: "linear-gradient(135deg,#3b1f5c,#7b4cb0,#0a0a14)", emoji: "🪞" };
  if (has("כריש", "חדרה", "לוויתן")) return { bg: "linear-gradient(135deg,#0a2a3f,#1a6b8e,#04141c)", emoji: "🦈" };
  if (has("טראמפ", "אמריק")) return { bg: "linear-gradient(135deg,#0a3161,#b31942,#0a0a14)", emoji: "🦅" };
  if (has("בראשית", "חלל", "ירח", "כוכב")) return { bg: "linear-gradient(135deg,#0b1a3a,#3a1f5c,#05030a)", emoji: "🌌" };
  if (has("הודו", "יראה")) return { bg: "linear-gradient(135deg,#5a3d0a,#b8860b,#0a0a08)", emoji: "📿" };
  return { bg: "linear-gradient(135deg,#3a2c0a,#b8860b,#0a0a08)", emoji: "✨" };
}

// כרטיסי שלד מהבהבים בזמן טעינה (במקום טקסט "טוען…")
const Skeletons = ({ n = 4 }) => Array.from({ length: n }).map((_, i) => <div key={i} className="hn-skel" aria-hidden />);

export default function HomeNewPage() {
  const P = usePalette();
  const nav = useNavigate();
  const { isAdmin } = useAuth();
  const [lbImg, setLbImg] = useState(null);   // רמז שנפתח כתמונה מלאה (לא דף מספר — זמני עד שזרם המציאות יושק)
  const [editImg, setEditImg] = useState(null); // עריכת רמז (מנהל)
  const [posts, setPosts] = useState([]);
  const [hints, setHints] = useState([]);   // רמזים שעלו לזרם המציאות — מוצגים גם כאן ומובילים לגלריה
  const [imgCount, setImgCount] = useState(0); // סך תמונות הארכיון — לבאנר האוצר
  const [topNums, setTopNums] = useState([]);   // המספרים החזקים בכל המאגר (אגרגציה) — לבועות-העל
  const [selHint, setSelHint] = useState(null); // התמונה הנבחרת בתצוגה הגדולה (ברירת מחדל: האחרונה)
  const [homeSets, setHomeSets] = useState([]); // גלריות רמזים מומלצות (show_on_home)
  const hotSlugs = useHotPostSlugs();   // 🔥 פוסטים חמים השבוע (דגל בלבד)
  const [cards, setCards] = useState([]);
  const [events, setEvents] = useState([]); // אירועי ציר ההתגלות (ל"מהארכיון")
  const [hotNums, setHotNums] = useState([]); // 🔥 המספרים החמים (מפת-החום, 7 ימים) — באזור "מה קורה באתר"
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };

  // ברירת המחדל כהה; מי שרוצה בהיר ימצא את ה-🌙/☀️ למעלה. (אין בורר-תמה כפוי למבקר חדש.)
  useEffect(() => { track("home"); }, []);

  useEffect(() => {
    applySeo({ title: "כי לה' המלוכה — סוד 1820", description: "בית המדרש של סוד 1820 — גימטריה קבלית וחכמת הקשרים.", path: "/home-new" });
    // «לא-בבית» = תגית להסתרת פוסט מדף הבית בלבד (נשאר רגיל ב-/post). מושכים מעט יותר ומסננים.
    getPostsFromSupabase({ limit: 12, orderBy: "modified" }).then(({ posts: r }) => { setPosts((r || []).filter(p => !(p.tags || []).includes("לא-בבית")).slice(0, 8)); markSeenKey("home-posts"); }).catch(() => {});
    getGalleryUpdates(40).then(r => setHints(r || [])).catch(() => {});
    getGalleryImageCount().then(setImgCount).catch(() => {});
    getTopPrimaryValues(16).then(setTopNums).catch(() => {});
    getHomeSets().then(r => setHomeSets(r || [])).catch(() => {});
    getTopicCards({ approvedOnly: true }).then(c => {
      setCards(c || []);
      markSeenKey("home-conv");   // ראה את ההתכנסות → הביקור הבא ישווה לרגע זה (לא יהבהב שוב)
    }).catch(() => {});
    getAxisEvents(30).then(e => setEvents(e || [])).catch(() => {});
    getHotNumbers(7, 10).then(h => setHotNums(h || [])).catch(() => {});
    markSeenKey("home-radar");
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

  // 🖼️ התמונות האחרונות — רצועה משמאל, הנבחרת בגדול מימין.
  const recentHints = useMemo(() => {
    const hs = (hints || []).filter(h => h.image_url);
    return [...hs].sort((a, b) => effDate(b) - effDate(a)).slice(0, 10);
  }, [hints]);
  const latestHint = recentHints[0] || null;
  const sel = selHint && recentHints.some(h => h.id === selHint.id) ? selHint : latestHint;
  // 🫧 בועות-העל — כל המאגר (אגרגציה). חום-כמות = גודל; חום-פעילות = הבהוב («מה חי»).
  const homeBubbles = useMemo(() => {
    const base = bubblesFromCounts(topNums, { limit: 14 });
    const hs = hints || [];
    const times = hs.map(h => effDate(h)).filter(Boolean);
    const newest = times.length ? Math.max(...times) : 0;
    const fresh = new Set();
    if (newest) for (const h of hs) { const t = effDate(h); if (t && newest - t <= 21 * 86400000) { const pv = Number(h.primary_value); if (pv) fresh.add(pv); } }
    return base.map(b => ({ ...b, hot: b.nums.some(n => fresh.has(n)) }));   // הבהוב = פעיל לאחרונה
  }, [topNums, hints]);
  // 🔥 הכי חם (לפי כמות) — לשורת-הכותרת
  const hottest = useMemo(() => homeBubbles.slice(0, 3).map(b => b.label), [homeBubbles]);

  // «עדכונים אחרונים» = פוסטים + גלריות מומלצות + רמזים מזרם המציאות, ממוזגים לפי תאריך (החדש למעלה).
  // כל רמז שעולה לזרם (source='update') נראה כאן ככרטיס-תמונה עם רצועת-מספר ממותגת.
  // הבדלה קלה לפי שערים: פיד אחד, אך פריט שקשור לשער של המשתמש מקבל boost עדין.
  const myTopics = useMemo(() => getStoredTopics(), []);
  const updatesFeed = useMemo(() => {
    const ps = (posts || []).map(p => ({ kind: "post", date: Math.max(+new Date(p.modified || 0), +new Date(p.date || 0)), data: p }));
    // גלריות רמזים מומלצות — תאריך/כריכה לפי הרמז העדכני ביותר שמתאים לסט
    const ss = (homeSets || []).map(s => {
      const ns = new Set(s.numbers || []);
      let cover = null, date = 0;
      for (const h of (hints || [])) if (hintNums(h).some(n => ns.has(n))) { const d = effDate(h); if (d > date) { date = d; cover = h.image_url; } }
      return { kind: "set", date, data: { ...s, cover } };
    }).filter(x => x.date > 0);
    const rankItem = (it) => {
      const d = it.data || {};
      const norm = it.kind === "post"
        ? { text: `${stripHtml(d.title || "")} ${(d.categories || []).join(" ")} ${(d.tags || []).join(" ")}`, categories: d.categories || [], numbers: [] }
        : { text: d.name || "", categories: [], numbers: d.numbers || [] };
      const rel = isRelatedToTopics(norm, myTopics);
      return { ...it, rel, sortKey: it.date + (rel ? RELATED_BOOST_MS : 0) };
    };
    // רמזים מזרם המציאות — כל רמז שעלה (source='update') מופיע גם כאן ככרטיס-תמונה,
    // ממוזג עם הפוסטים לפי תאריך → "רואים שעכשיו עלה עדכון גלריה".
    // 🌊 רמזי זרם המציאות הוצאו מ«עדכונים אחרונים» — הם מופיעים ברדאר העליון ובאזור זרם המציאות בלבד.
    return [...ps, ...ss].map(rankItem).sort((a, b) => b.sortKey - a.sortKey).slice(0, 12);
  }, [posts, homeSets, myTopics]);
  const scrollToId = (id) => { const el = document.getElementById(id); if (el) el.scrollIntoView({ behavior: "smooth", block: "start" }); };
  const goReality = () => scrollToId("reality-home");
  // רדאר עליון — «חדש» פר-משתמש (whats_new_law): מהבהב רק אם עלה מאז הביקור האחרון
  const radarMs = useMemo(() => +new Date(seenCutoff("home-radar")), []);
  const latestConv = useMemo(() => [...cards].sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))[0] || null, [cards]);

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
        /* זוהר סגול-מלכותי רדיאלי מאחורי ההירו (מתחבר לרקע הסגול) */
        .hn-gate::before { content:""; position:absolute; inset:-16% -10%; z-index:-1; pointer-events:none;
          background: radial-gradient(closest-side, rgba(123,76,176,0.50), rgba(61,31,92,0.24) 52%, transparent 78%); }
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

      {/* ===== הרדאר העליון (התכנסות + רמז זרם המציאות) הוסר — כפול עם הפיד החדש (בקשת צוריאל):
          ההתכנסויות ב«היכל הגילוי», ורמזי זרם המציאות ב«כי לה' המלוכה» בתוך «עדכונים אחרונים». ===== */}

      {/* ===== עדכונים אחרונים — פיד מאוחד בסדר עדיפות (עץ אחד):
          ① היכל הגילוי (התכנסויות + צפנים) ② כי לה' המלוכה (רמזי זרם המציאות → גוללים ל-#reality-home)
          ③ כתבים ④ ערוצים (סוד החשמל 2:1, «תריס נופל») ⑤ תפילות ותכנים — למטה. ===== */}
      <section className="hn-wrap" style={{ padding: "18px 18px 40px" }}>
        <HomeHeader title="📜 עדכונים אחרונים" sub="הכל בזרם אחד — היכל הגילוי · המלוכה · כתבים · ערוצים. סננו בטאב." />
        <LatestUpdatesFeed posts={posts} convergences={cards} hints={hints} />
      </section>

      {/* ===== 👑 אוצרות הגילוי — ציר-הערך, מעל הזרם (החלטת צוריאל: אוצרות ← ואז הזרם) ===== */}
      <TreasuresHome />

      {/* ===== 🌊 זרם המציאות — Dark Island מלכותי ===== */}
      {/* רקע כהה קבוע (#09080f) ללא תלות במצב יום/לילה — forceDark. Hero = הרמז האחרון. */}
      <section id="reality-home" style={{ position: "relative", overflow: "hidden", background: GALLERY_BG, colorScheme: "dark", padding: "48px 18px 56px", scrollMarginTop: 74 }}>
        <style>{`
          #reality-home .rw-hero img, #reality-home .rw-hero-img { animation: rw-hero-in .7s cubic-bezier(.2,.8,.2,1) both; }
          @keyframes rw-hero-in { from { opacity:0; transform:scale(.98); } to { opacity:1; transform:scale(1); } }
          @keyframes hn-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.5; } }
          /* master-detail: גדול מימין, רצועת-אחרונות משמאל (RTL) */
          .hn-latest { display: flex; gap: 14px; align-items: flex-start; direction: rtl; }
          .hn-latest-main { flex: 1; min-width: 0; }
          /* דסקטופ: 2 טורים שמנים × 3 = 6 תמונות גדולות */
          .hn-latest-thumbs { width: 320px; flex: 0 0 auto; display: grid; grid-template-columns: 1fr 1fr; gap: 11px; align-content: start; }
          .hn-thumbs-lbl { grid-column: 1 / -1; }
          .hn-thumb { position: relative; cursor: pointer; padding: 0; border: 2px solid rgba(212,175,55,0.22); border-radius: 13px; overflow: hidden; background: #09080f; aspect-ratio: 1; transition: border-color .15s, transform .12s; }
          .hn-thumb img { width: 100%; height: 100%; object-fit: cover; display: block; }
          .hn-thumb:hover { border-color: rgba(212,175,55,0.6); transform: translateY(-2px); }
          .hn-thumb.on { border-color: #f6e27a; box-shadow: 0 0 0 2px rgba(246,226,122,0.5), 0 0 16px rgba(212,175,55,0.4); }
          .hn-thumb-n { position: absolute; bottom: 5px; inset-inline-start: 5px; background: rgba(212,175,55,0.92); color: #1a0e00; font-family: ${F.mono}; font-size: 11.5px; font-weight: 800; border-radius: 999px; padding: 1px 8px; }
          @media (max-width: 1024px) { .hn-latest-thumbs { width: 240px; } }
          @media (max-width: 760px) {
            .hn-latest { flex-direction: column; }
            .hn-latest-thumbs { width: 100%; display: flex; flex-direction: row; overflow-x: auto; overflow-y: hidden; order: 2; }
            .hn-thumbs-lbl { display: none; }
            .hn-thumb { width: 92px; flex: 0 0 auto; }
          }
        `}</style>
        {/* ⛔ רקע-המטריקס הזז הוסר (בקשת צוריאל — בלי תנועה מבלבלת). במקומו: הילת-במה
            סטטית כמו באוצרות הגילוי — אבן-לילה + זוהר-זהב עדין. */}
        <div aria-hidden style={{ position: "absolute", inset: 0, background: "radial-gradient(70% 45% at 50% 0%, rgba(212,175,55,0.09), transparent 65%)", pointerEvents: "none" }} />
        <div style={{ position: "relative", zIndex: 1, maxWidth: 1360, margin: "0 auto" }}>
          <HomeHeader dark title="🌊 זרם המציאות" sub="תיעוד רמזי הגאולה — חי, ישר מהמציאות"
            action={{ label: "לזרם המלא →", to: "/archive" }} />

          {/* ⛔ ריבוע-הבועות + «הכי חם» הוסרו מהבית (בקשת צוריאל — לא לבלבל; חיים בגלריה) */}

          {/* 🌊 הזרם המלא — אחד-לאחד כמו טאב «זרם המציאות» בגלריה (בועות · גלריות-רמזים · סינון ·
              הנהר · שערי-הסטים · בועות-החום), רק בתוך אשנב: ~3 רמזים ענקיים בכל רגע + מוט-ענק לגלילה. */}
          <RealityWorld forceDark windowed hideHeader />

          {/* 📸 באנר האוצר — כמות התמונות בארכיון */}
          <Link to="/archive" style={{ display: "block", marginTop: 18, textAlign: "center", textDecoration: "none", background: "linear-gradient(135deg, rgba(212,175,55,0.16), rgba(122,19,32,0.16))", border: "1px solid rgba(212,175,55,0.4)", borderRadius: 14, padding: "15px 18px" }}>
            <span style={{ color: "#f6e27a", fontFamily: F.regal, fontSize: "clamp(17px,2.4vw,22px)", fontWeight: 800 }}>📸 {imgCount ? imgCount.toLocaleString("he") : "אלפי"} תמונות בארכיון</span>
            <span style={{ color: "#d8c89a", fontFamily: F.body, fontSize: 14, marginInlineStart: 10 }}>· 14 שנות תיעוד · צללו לגלרית דוד המלך →</span>
          </Link>
        </div>
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

      {/* ===== עץ ההתכנסויות — כניסה חיה ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <HomeHeader title="🕸️ עץ ההתכנסויות" sub="כל מספר במרכז — וחוטים לכל הקשרים שלו: התכנסויות ומספרים שמתכנסים יחד" />
        {/* ✨ קונסטלציה חיה — תצוגה מקדימה (אותו אפקט מבית-הקוד), מקושר ל-/numbers בלי שכפול */}
        <Link to="/numbers" style={{ display: "block", textDecoration: "none", maxWidth: 620, margin: "0 auto" }}>
          <div style={{ position: "relative", overflow: "hidden", textAlign: "center", background: "#070b12", border: `1px solid ${P.borderStrong}`, borderRadius: 16, padding: "34px 22px", boxShadow: "0 16px 46px rgba(0,0,0,0.35)" }}>
            {/* האפקט החי — קנבס ברקע (position:absolute, aria-hidden, מכבד reduced-motion) */}
            <Fx kind="constellation" color="#d4af37" />
            <div style={{ position: "absolute", inset: 0, background: "radial-gradient(ellipse at center, rgba(7,11,18,0.28), rgba(7,11,18,0.82) 78%)", pointerEvents: "none" }} />
            <div style={{ position: "relative", zIndex: 1 }}>
              <div style={{ display: "inline-block", color: "#d4af37", fontFamily: F.heading, fontSize: 11.5, fontWeight: 700, letterSpacing: 2, border: "1px solid rgba(212,175,55,0.45)", borderRadius: 999, padding: "3px 12px", marginBottom: 14 }}>✨ קונסטלציה חיה</div>
              <div style={{ color: "#eaf2fa", fontFamily: F.body, fontSize: 14.5, lineHeight: 1.85, maxWidth: 470, margin: "0 auto 20px" }}>
                כל מספר הוא כוכב, וכל התכנסות חוט אור שמחבר ביניהם — רשת חיה שגדלה עם כל רמז חדש.
              </div>
              <span className="hn-cta" style={{ fontSize: 15, padding: "11px 30px" }}>🕸️ כניסה לעץ ההתכנסויות</span>
            </div>
          </div>
        </Link>
      </section>

      {/* ===== 🚀 כאן מתחילים — אונבורדינג למתחילים ===== */}
      <StartHereCard />

      {/* ===== מה גולשים מחפשים עכשיו ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <HomeHeader title="🔎 מה קורה באתר עכשיו" sub="החיפושים האחרונים של הגולשים · המספרים החמים ביותר לפי מפת-החום" />
        <RecentSearches max={6} light={P.mode === "light"} seeAllTo="/beit-midrash?tab=searches" />
        {/* 🔥 המספרים החמים באתר — אותה מפת-חום כמו בקצה הנהר (search_log, 7 ימים) */}
        {hotNums.length > 0 && (
          <div style={{ marginTop: 16, border: `1px solid ${P.borderStrong}`, borderRadius: 16, background: P.cardSoft, padding: "15px 16px" }}>
            <NumberBubbles
              data={hotNums.map(x => ({ label: String(x.n), count: x.count, nums: [x.n] }))}
              title="🔥 המספרים החמים באתר עכשיו — לפי מפת-החום (7 ימים) · לחצו לדף המספר"
              hrefFor={b => `/number/${b.nums[0]}`}
            />
          </div>
        )}
        <div style={{ marginTop: 16 }}><CommunityWordsBox max={4} /></div>
      </section>

      {/* ===== הצלבות המנוע (AI) — כמה נוספו + תאריך ===== */}
      <section className="hn-wrap" style={{ padding: "0 18px 40px" }}>
        <HomeHeader title="🔮 הצלבות המנוע" sub="חיבורים נדירים בין ביטויים — נמצאו ואומתו אוטומטית במנוע הגימטריה" />
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
      <section id="conv-home" className="hn-wrap" style={{ padding: "0 18px 60px", scrollMarginTop: 74 }}>
        <HomeHeader title={<><span style={{ color: "#e0556a" }}>● LIVE</span> · חדשות בית המדרש</>}
          sub="ארבע ההתכנסויות האחרונות — החדש מודגש" />
        <div className="hn-postgrid">
          {liveCards.map(c => {
            const fresh = isNewSince(c, convCutoff);
            const cov = convCover(c);
            const bigNum = (c.highlight_numbers || [])[0];
            return (
            <Link key={c.slug} to={`/topic/${encodeURIComponent(c.slug)}`} className="hn-card" style={fresh ? { borderColor: "#e0556a", boxShadow: `0 0 0 1px #e0556a55` } : undefined}>
              <div style={{ height: 110, position: "relative", overflow: "hidden", background: cov.bg, display: "flex", alignItems: "flex-end", justifyContent: "space-between" }}>
                {/* מספר-העל כסימן-מים מרכזי + אייקון הנושא בפינה */}
                {bigNum != null && <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F.mono, fontSize: 50, fontWeight: 800, color: "rgba(255,255,255,0.16)", letterSpacing: 2, pointerEvents: "none" }}>{bigNum}</span>}
                <span style={{ position: "absolute", top: 8, insetInlineEnd: 10, fontSize: 23, filter: "drop-shadow(0 2px 6px rgba(0,0,0,0.55))", pointerEvents: "none" }}>{cov.emoji}</span>
                <span style={{ position: "relative", zIndex: 1, color: "#ffe9a8", fontSize: 11, letterSpacing: 1, background: "rgba(0,0,0,0.42)", borderRadius: 999, padding: "2px 9px", margin: 8 }}>{stars(c.quality)}</span>
                {fresh && <span style={{ position: "relative", zIndex: 1, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 10.5, fontWeight: 800, borderRadius: 999, padding: "2px 9px", margin: 8, animation: "hn-pulse 1.8s ease-in-out infinite" }}>🆕 חדש</span>}
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

      {/* ===== סקשן סיום — הקריאה הראשית להישאר מעודכן (מייל/פוש, בחירת המשתמש) ===== */}
      <section className="hn-wrap" style={{ padding: "8px 18px 64px" }}>
        <StayUpdatedCTA variant="home" />
      </section>

      {/* רמז שנפתח כתמונה מלאה (זמני — עד שזרם המציאות יושק). מנהל יכול לערוך משם. */}
      {lbImg && (
        <Lightbox images={[lbImg]} onClose={() => setLbImg(null)}
          note="🌊 בקרוב בזרם המציאות · גלריות דוד המלך לשעבר"
          onEdit={isAdmin ? (im) => { setLbImg(null); setEditImg(im); } : null} />
      )}
      {editImg && (
        <ImageEditModal image={editImg} onClose={() => setEditImg(null)}
          onSave={async patch => {
            if (Object.keys(patch).length) {
              try { await setImageCuration(editImg.id, patch); setHints(prev => prev.map(x => x.id === editImg.id ? { ...x, ...patch } : x)); }
              catch (e) { alert("שגיאה בשמירה: " + (e.message || e)); return; }
            }
            setEditImg(null);
          }}
          onDelete={id => setHints(prev => prev.filter(x => x.id !== id))} />
      )}
    </div>
  );
}
