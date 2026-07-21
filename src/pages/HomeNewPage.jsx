import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { F, GALLERY_BG } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getPostsFromSupabase, getTopicCards, getAxisEvents, getGalleryUpdates, getHomeSets, setImageCuration, getGalleryImageCount, getTopPrimaryValues, getHotNumbers, getFeaturedResearchers } from "../lib/supabase.js";
import NumberBubbles from "../components/NumberBubbles.jsx";
import LanguageCosmos from "../components/LanguageCosmos.jsx";
// חלונות הגילוי הוסרו מעמוד הבית «בשלב זה» (10.7.2026) — להחזרה, בטל את ההערה כאן ובשימוש למטה.
// import RevelationWindows from "../components/RevelationWindows.jsx";
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
import RecentNumbers from "../components/RecentNumbers.jsx";
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
import LatestUpdatesRail from "../components/LatestUpdatesRail.jsx";
import { OneTreeWidget } from "../components/OneTreeAtlas.jsx";
import { getSavedMatrices } from "../lib/elsMatrices.js";

// ===== דף הבית החדש (תצוגה מקדימה) — /בית-חדש · /home-new =====
// מגיב למתג התמה הגלובלי (יום/לילה) דרך usePalette() — צבעים סמנטיים, לא קבועים.
// לילה = שער הקוסמוס (gate-bg); יום = קלף קרם נקי.

const HERO_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/sod1820/heichal-1820-banner.webp";
const SHVILEI_IMG = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/sod1820/posts/shvilei-safa-emblem.png";
// 🎠 קרוסלת ההירו — סליחה ראשונה = החדש (פוסט המבוא «שבילי שפה»); החלקה שמאלה = הישן («כאן מתחילים»).
const HERO_SLIDES = [
  { img: SHVILEI_IMG, emblem: true, alt: "שבילי שפה — כל השפות מתכנסות אל מספר אחד", to: "/chibur-bein-hasafot-mafteach-lagan", cta: "🗝️ שבילי שפה", label: "שבילי שפה" },
  { img: HERO_IMG, alt: "כי לה' המלוכה · סוד 1820 — שער המספר הגדול", to: "/start", cta: "✨ כאן מתחילים", label: "מתחילים" },
];

// התכנסויות שלא מוצגות ב«עדכונים אחרונים» (נשארות בעץ ההתכנסויות/בית-המדרש) — לבקשת צוריאל
const HOME_FEED_HIDE_CONV = new Set(["atzirut-hageula", "ezor-hayetzia-geula"]);

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
  const [gateImg, setGateImg] = useState(null); // 🖼️ תמונת-שער (שבילי שפה / כאן מתחילים) — נגיעה מגדילה
  const [editImg, setEditImg] = useState(null); // עריכת רמז (מנהל)
  const [posts, setPosts] = useState([]);
  const [hints, setHints] = useState([]);   // רמזים שעלו לזרם המציאות — מוצגים גם כאן ומובילים לגלריה
  const [researchers, setResearchers] = useState([]); // 🎗 כתבים מודגשים (feature_media) — כרטיס-כתב ב«עדכונים אחרונים»
  const [imgCount, setImgCount] = useState(0); // סך תמונות הארכיון — לבאנר האוצר
  const [topNums, setTopNums] = useState([]);   // המספרים החזקים בכל המאגר (אגרגציה) — לבועות-העל
  const [selHint, setSelHint] = useState(null); // התמונה הנבחרת בתצוגה הגדולה (ברירת מחדל: האחרונה)
  const [homeSets, setHomeSets] = useState([]); // גלריות רמזים מומלצות (show_on_home)
  const hotSlugs = useHotPostSlugs();   // 🔥 פוסטים חמים השבוע (דגל בלבד)
  const [cards, setCards] = useState([]);
  const [events, setEvents] = useState([]); // אירועי ציר ההתגלות (ל"מהארכיון")
  const [hotNums, setHotNums] = useState([]); // 🔥 המספרים החמים (מפת-החום, 7 ימים) — באזור "מה קורה באתר"
  const [ciphers, setCiphers] = useState([]); // 🔠 צפנים חדשים (els_records published) — רצועה מעל «עדכונים אחרונים»
  const [q, setQ] = useState("");
  const go = e => { e.preventDefault(); const v = q.trim(); if (v) nav(`/number/${encodeURIComponent(v)}`); };
  // 🎠 קרוסלת הירו
  const heroRef = useRef(null);
  const [heroIdx, setHeroIdx] = useState(0);
  // 🔠 רקע-צופן קולנועי לשער-החי: רשת-אותיות דהויה עם ציר מודגש + מילה מוצלבת. מצויר פעם אחת
  //    (הזחילה דרך CSS על הקנבס — זול). מכבד prefers-reduced-motion (הזחילה נעצרת ב-CSS).
  const matrixRef = useRef(null);
  useEffect(() => {
    const cv = matrixRef.current; if (!cv) return;
    const L = "אבגדהוזחטיכלמנסעפצקרשתםןץףך";
    const draw = () => {
      const w = cv.clientWidth, h = cv.clientHeight; if (!w || !h) return;
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      cv.width = w * dpr; cv.height = h * dpr;
      const x = cv.getContext("2d"); if (!x) return;
      x.scale(dpr, dpr); x.clearRect(0, 0, w, h);
      x.font = "16px 'Frank Ruhl Libre','David Libre',serif"; x.textAlign = "center"; x.textBaseline = "middle";
      const cell = 22, cols = Math.ceil(w / cell), rows = Math.ceil(h / cell);
      const axis = Math.round(cols * 0.6), crossR = Math.round(rows * 0.5);
      let seed = 7; const rnd = () => { seed = (seed * 1103515245 + 12345) & 0x7fffffff; return seed / 0x7fffffff; };
      for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
        const ch = L[Math.floor(rnd() * L.length)];
        if (c === axis) x.fillStyle = "rgba(244,217,138,.5)";                          // ציר-הדילוג
        else if (r === crossR && c > axis - 6 && c < axis + 7) x.fillStyle = "rgba(240,164,140,.5)"; // מילה מוצלבת
        else x.fillStyle = "rgba(230,207,134,.12)";
        x.fillText(ch, c * cell + cell / 2, r * cell + cell / 2);
      }
    };
    draw();
    window.addEventListener("resize", draw);
    return () => window.removeEventListener("resize", draw);
  }, []);
  const onHeroScroll = () => { const el = heroRef.current; if (!el || !el.clientWidth) return; setHeroIdx(Math.max(0, Math.min(HERO_SLIDES.length - 1, Math.round(Math.abs(el.scrollLeft) / el.clientWidth)))); };
  const goHero = i => { const el = heroRef.current; el?.children[i]?.scrollIntoView({ behavior: "smooth", inline: "center", block: "nearest" }); };

  // ברירת המחדל כהה; מי שרוצה בהיר ימצא את ה-🌙/☀️ למעלה. (אין בורר-תמה כפוי למבקר חדש.)
  useEffect(() => { track("home"); }, []);

  useEffect(() => {
    applySeo({ title: "כי לה' המלוכה — סוד 1820", description: "בית המדרש של סוד 1820 — גימטריה קבלית וחכמת הקשרים.", path: "/home-new" });
    // «לא-בבית» = תגית להסתרת פוסט מדף הבית בלבד (נשאר רגיל ב-/post). «הינוקא» = מוסתר מדף הבית (בקשת צוריאל). מושכים יותר ומסננים.
    const hiddenAtHome = p => (p.tags || []).includes("לא-בבית") || (p.tags || []).some(t => /ינוק/.test(t)) || /ינוק/.test(p.title || "");
    getPostsFromSupabase({ limit: 32, orderBy: "modified" }).then(({ posts: r }) => { setPosts((r || []).filter(p => !hiddenAtHome(p)).slice(0, 18)); markSeenKey("home-posts"); }).catch(() => {});
    // רמזי-הזרם נטענים ב-effect נפרד, מותנה בדגל lock_reality (ראה למטה)
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

  // 🌊 רמזי הזרם נטענים לכולם — כטיזר: תמונה קטנה ב«עדכונים אחרונים» (החלטת צוריאל 9.7.2026).
  // «לפתוח» את הזרם עצמו אי-אפשר בלי רישום: הלחיצה גוללת ל-#reality-home, ושם RealityWorld
  // (מגודר בתוכו, site_flags_lock_law) מציג לאנונימי את טיזר-ההרשמה במקום הזרם.
  useEffect(() => {
    getGalleryUpdates(40).then(r => setHints(r || [])).catch(() => {});
    getFeaturedResearchers(6).then(r => setResearchers(r || [])).catch(() => {});
    getSavedMatrices(20).then(r => setCiphers(r || [])).catch(() => {});
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
        /* גרפיקת-קנבס (LanguageCosmos) היא div בלי מידות טבעיות — inline-block היה מקריס
           את רוחבה ל-0 (ואז aspect-ratio → גובה 0 → קנבס בלתי-נראה). block + רוחב מוגדר מתקן. */
        .hn-gate.graphic { display:block; width:100%; text-align:center; }
        .hn-gate.graphic .lc-link { display:block; text-decoration:none; }
        /* גרפיקת «פוסט המבוא» בדיוק בגודל תמונת «מתחילים» — אותו aspect-ratio נחיתי (1536/1024)
           בכל רוחב, גם במובייל (מנטרל את 4/5 הגבוה של LanguageCosmos שהקפיץ אותה וכיסה את המבוא). */
        .hn-gate.graphic .lc-wrap { aspect-ratio:1536/1024; }
        /* הכפתור «פוסט המבוא» יושב *מתחת* לגרפיקה (בזרימה) ולא חופף לפסוק בתחתית הקנבס —
           בגרפיקה יש פסוק צרוב בתחתית, אז אסור לכפתור לרחף עליו (בשונה מתמונת «מתחילים»). */
        .hn-gate.graphic .hn-enter { position:static; left:auto; bottom:auto; transform:none; margin-top:16px; }
        /* הכפתור כבר לא מרחף על הגרפיקה (יושב מתחתיה) → מוצג בכל הרוחבים, כמו ב«מתחילים». */
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
        /* 🎠 קרוסלת הירו — החלקה (scroll-snap), נקודות, רמז החלקה */
        .hn-carousel { display:flex; overflow-x:auto; scroll-snap-type:x mandatory; scrollbar-width:none; -webkit-overflow-scrolling:touch; }
        .hn-carousel::-webkit-scrollbar { display:none; }
        .hn-slide { flex:0 0 100%; scroll-snap-align:center; display:flex; justify-content:center; padding:2px 4px 36px; box-sizing:border-box; }
        .hn-gate-img.emblem { object-fit:contain; background:#000; }
        .hn-dots { display:flex; gap:8px; justify-content:center; margin-top:6px; flex-wrap:wrap; }
        .hn-dot { cursor:pointer; background:transparent; border:1px solid ${P.border}; color:${P.inkSoft};
          font-family:${F.heading}; font-weight:800; font-size:12.5px; padding:5px 16px; border-radius:999px; transition:.15s; }
        .hn-dot.on { background:${P.accentBtn}; color:${P.onAccent}; border-color:${P.accent}; }
        .hn-swipe-hint { color:${P.inkSoft}; font-family:${F.body}; font-size:12px; margin-top:8px; opacity:.75; }
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

        /* ===== 🔠 השער החי — רקע-צופן · חיפוש-לב · דופק (מחויב לעולם הכהה-מלכותי, כמו זרם המציאות) ===== */
        .hn-livegate { position:relative; overflow:hidden; text-align:center; color-scheme:dark;
          background: radial-gradient(1000px 520px at 50% -12%, #1a1330 0%, #0b0916 58%, #09080f 100%);
          border-bottom:1px solid rgba(212,175,55,.22); }
        .hn-matrix { position:absolute; inset:-8%; width:116%; height:116%; z-index:0; display:block;
          animation:hn-drift 34s ease-in-out infinite; will-change:transform; }
        @keyframes hn-drift { 0%,100%{ transform:scale(1.02) translate(0,0); } 50%{ transform:scale(1.09) translate(-1.4%,-1.1%); } }
        .hn-mx-scrim { position:absolute; inset:0; z-index:1; pointer-events:none; background:
          radial-gradient(circle at 50% 44%, rgba(11,9,22,.28), rgba(9,8,15,.86) 78%),
          linear-gradient(180deg, rgba(9,8,15,.5) 0%, rgba(9,8,15,.1) 30%, rgba(9,8,15,.72) 100%); }
        .hn-gate-inner { position:relative; z-index:2; max-width:680px; margin:0 auto;
          padding:58px 18px 46px; display:flex; flex-direction:column; align-items:center; gap:16px; }
        .hn-emblem { color:#d4af37; font-family:${F.regal}; font-size:12px; letter-spacing:4px;
          text-transform:uppercase; opacity:.92; }
        .hn-gate-title { color:#f0d879; font-family:${F.regal}; font-weight:800;
          font-size:clamp(24px,4.6vw,40px); line-height:1.16; margin:0; text-wrap:balance;
          text-shadow:0 2px 24px rgba(0,0,0,.5); }
        .hn-search { display:flex; align-items:center; gap:8px; width:100%; max-width:470px;
          background:rgba(9,7,14,.72); border:1px solid rgba(212,175,55,.55); border-radius:16px;
          padding:5px 8px 5px 16px; box-shadow:0 12px 34px rgba(0,0,0,.5); backdrop-filter:blur(3px); }
        .hn-search:focus-within { border-color:#d4af37; }
        .hn-mag { color:#d4af37; font-size:18px; }
        .hn-search-in { flex:1; min-width:0; background:transparent; border:none; outline:none;
          color:#e8dcc0; font-family:${F.body}; font-size:16px; padding:12px 4px; text-align:start; }
        .hn-search-in::placeholder { color:#93876a; }
        .hn-search-go { cursor:pointer; background:linear-gradient(135deg,#d4af37,#b8901f); color:#1a0e00;
          border:none; border-radius:11px; font-family:${F.heading}; font-weight:800; font-size:15px;
          padding:11px 20px; white-space:nowrap; }
        .hn-pulse { display:flex; gap:8px; flex-wrap:wrap; justify-content:center; align-items:center; }
        .hn-live { display:inline-flex; align-items:center; gap:6px; color:#e0556a;
          font-family:${F.heading}; font-weight:800; font-size:12.5px; }
        .hn-livedot { width:8px; height:8px; border-radius:50%; background:#e0556a; animation:hn-ping 1.9s ease-out infinite; }
        @keyframes hn-ping { 0%{box-shadow:0 0 0 0 rgba(224,85,106,.5)} 100%{box-shadow:0 0 0 9px rgba(224,85,106,0)} }
        .hn-pchip { text-decoration:none; color:#c9bd9c; background:rgba(212,175,55,.10);
          border:1px solid rgba(212,175,55,.28); border-radius:999px; padding:4px 12px;
          font-family:${F.body}; font-size:12.5px; white-space:nowrap; transition:border-color .15s; }
        .hn-pchip:hover { border-color:#d4af37; }
        .hn-pchip b { color:#f0d879; font-weight:800; }
        .hn-gate-cta { display:flex; gap:10px; flex-wrap:wrap; justify-content:center; margin-top:2px; }
        .hn-cta2 { text-decoration:none; font-family:${F.heading}; font-weight:800; font-size:14px;
          padding:10px 22px; border-radius:999px; border:1px solid rgba(212,175,55,.55); color:#d4af37; }
        .hn-cta2.primary { background:linear-gradient(135deg,#d4af37,#b8901f); color:#1a0e00;
          border-color:transparent; box-shadow:0 6px 22px rgba(212,175,55,.3); }
        .hn-gates { display:flex; gap:16px; justify-content:center; flex-wrap:wrap; margin-top:6px; }
        .hn-gate-col { display:flex; flex-direction:column; align-items:center; gap:9px; }
        .hn-thumb-btn { position:relative; cursor:pointer; padding:0; border:1px solid rgba(212,175,55,.5);
          border-radius:12px; overflow:hidden; background:#000; line-height:0;
          box-shadow:0 6px 20px rgba(0,0,0,.45); transition:transform .15s, border-color .15s; }
        .hn-thumb-btn:hover { transform:translateY(-2px); border-color:#d4af37; }
        .hn-thumb-img { width:150px; height:96px; object-fit:cover; display:block; }
        .hn-thumb-img.emblem { object-fit:contain; background:#000; }
        .hn-thumb-zoom { position:absolute; inset:auto 6px 6px auto; background:rgba(9,7,14,.72);
          color:#f0d879; border:1px solid rgba(212,175,55,.4); border-radius:999px; font-size:10.5px;
          font-family:${F.heading}; font-weight:800; padding:2px 9px; }
        @media (max-width:520px){ .hn-thumb-img{ width:132px; height:84px; } }
        @media (prefers-reduced-motion:reduce){ .hn-matrix,.hn-livedot{ animation:none } }
      `}</style>

      {/* ===== 🔠 השער החי — רקע-צופן קולנועי · חיפוש במרכז · דופק חי ===== */}
      <section className="hn-livegate">
        <canvas className="hn-matrix" ref={matrixRef} aria-hidden="true" />
        <div className="hn-mx-scrim" aria-hidden="true" />
        <div className="hn-gate-inner">
          <div className="hn-emblem">✦ דילוגי אותיות · גימטריה · הצופן ✦</div>
          <h1 className="hn-gate-title">כל מילה מסתירה מספר — כל מספר, סוד.</h1>
          <form onSubmit={go} className="hn-search">
            <span className="hn-mag" aria-hidden="true">🔍</span>
            <input value={q} onChange={e => setQ(e.target.value)} className="hn-search-in"
              placeholder="הקלד מילה, שם או מספר…" dir="rtl" aria-label="חיפוש מילה, שם או מספר" />
            <button type="submit" className="hn-search-go">✦ גלו</button>
          </form>
          {/* דופק חי — מנתונים אמיתיים שכבר נשלפו (צופן אחרון · מספר חם · פוסט חדש). מוסתר עד שיש נתון. */}
          <div className="hn-pulse">
            <span className="hn-live"><span className="hn-livedot" />עכשיו באתר</span>
            {ciphers[0] && <Link to={`/codes/${encodeURIComponent(ciphers[0].slug || ciphers[0].id)}`} className="hn-pchip">🔠 הצופן האחרון «<b>{ciphers[0].title || ciphers[0].search_term}</b>»</Link>}
            {hotNums[0] && <Link to={`/number/${hotNums[0].n}`} className="hn-pchip">🔥 המספר החם <b>{hotNums[0].n}</b></Link>}
            {posts[0] && <Link to={`/${posts[0].slug}`} className="hn-pchip">📜 חדש: <b>{decodeHtml(posts[0].title || "").slice(0, 24)}</b></Link>}
          </div>
          {/* שערי-הכניסה: תמונה קטנה (נגיעה = הגדלה) + כפתור-כניסה מתחתיה. שבילי שפה · כאן מתחילים */}
          <div className="hn-gates">
            {HERO_SLIDES.map((s, i) => (
              <div className="hn-gate-col" key={i}>
                <button type="button" className="hn-thumb-btn" onClick={() => setGateImg(s.img)} aria-label={"הגדלת התמונה: " + s.label}>
                  <img src={thumb(s.img, 280)} alt={s.alt} className={"hn-thumb-img" + (s.emblem ? " emblem" : "")} loading="lazy" decoding="async" />
                  <span className="hn-thumb-zoom" aria-hidden="true">🔍 הגדל</span>
                </button>
                <Link to={s.to} className={"hn-cta2" + (i === HERO_SLIDES.length - 1 ? " primary" : "")}>{s.cta}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== 🔑 חלונות הגילוי — הוסרו מעמוד הבית «בשלב זה» (בקשת צוריאל 10.7.2026).
           הרכיב נשמר (RevelationWindows.jsx) — להחזרה: החזר את השורה למטה ואת ה-import למעלה. ===== */}
      {/* <RevelationWindows /> */}

      {/* ===== הרדאר העליון (התכנסות + רמז זרם המציאות) הוסר — כפול עם הפיד החדש (בקשת צוריאל):
          ההתכנסויות ב«היכל הגילוי», ורמזי זרם המציאות ב«כי לה' המלוכה» בתוך «עדכונים אחרונים». ===== */}

      {/* ===== עדכונים אחרונים — 8 עדכונים ממוזגים, כל אחד עם לוגו + מילה קטנה:
          פוסט · זרם המציאות (לוגו הגל) · היכל הגילוי (לוגו הגילוי — התכנסות/צופן) · «עודכן לפני X» + תג AI. ===== */}
      <section className="hn-wrap" style={{ padding: "18px 18px 40px" }}>
        <HomeHeader title="📜 עדכונים אחרונים" sub="20 העדכונים האחרונים — פוסטים, זרם המציאות והיכל הגילוי" />
        {/* ⛔ הקפצת התכנסויות ל«עדכונים אחרונים» מושבתת עד הודעה חדשה (בקשת צוריאל) — ההתכנסויות
            נשארות חיות בעץ ההתכנסויות ובבית-המדרש, רק לא קופצות לפיד הבית. להחזרה: convergences={cards.filter(c => !HOME_FEED_HIDE_CONV.has(c.slug))} */}
        <LatestUpdatesRail posts={posts} convergences={[]} hints={hints} researchers={researchers} />
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

      {/* ===== עץ ההתכנסויות — כניסה חיה (יעד גלילה מ«עדכונים אחרונים») ===== */}
      <section id="convergences-home" className="hn-wrap" style={{ padding: "0 18px 40px", scrollMarginTop: 74 }}>
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
        {/* 🔢 אילו דפי-מספר נפתחו בפועל (לא חיפושים אישיים) — מספר = נתון ציבורי */}
        <div style={{ marginTop: 16 }}>
          <RecentNumbers max={8} light={P.mode === "light"} />
        </div>
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

      {/* ===== 🔓 הצופן — צפנים (דילוגי אותיות / ELS) · יעד גלילה מ«עדכונים אחרונים» · בקרוב.
          ממוקם כאן (לא צמוד להתכנסויות) כדי שכרטיס-התכנסות ינחת על סקשן ההתכנסויות, לא על הצפנים. ===== */}
      <section id="ciphers-home" className="hn-wrap" style={{ padding: "0 18px 40px", scrollMarginTop: 74 }}>
        <HomeHeader title="🔓 הצופן — צפנים חדשים" sub="דילוגי אותיות (ELS) שנחקרו ואומתו — כל צופן בעמוד משלו · עדות, לא ניבוי" />
        {ciphers.length > 0 ? (
          <div style={{ display: "flex", gap: 12, overflowX: "auto", paddingBottom: 10, scrollSnapType: "x mandatory", WebkitOverflowScrolling: "touch" }}>
            {ciphers.map(c => (
              <Link key={c.id} to={`/codes/${encodeURIComponent(c.slug || c.id)}`}
                style={{ flex: "0 0 auto", width: 200, scrollSnapAlign: "start", background: P.card, border: `1px solid ${P.border}`, borderRadius: 14, overflow: "hidden", textDecoration: "none", display: "flex", flexDirection: "column" }}>
                {c.image_url
                  ? <img src={c.image_url} alt="" loading="lazy" style={{ width: "100%", aspectRatio: "1200 / 630", objectFit: "cover", background: "#0a0700", display: "block" }} />
                  : <div style={{ width: "100%", aspectRatio: "1200 / 630", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 7, background: P.card, color: P.accentText, fontFamily: F.regal, fontSize: 20, fontWeight: 800 }}><img src="/els-icon.png" alt="" width="40" height="40" style={{ borderRadius: 9, objectFit: "cover" }} />{c.search_term}</div>}
                <div style={{ padding: "9px 11px" }}>
                  <div style={{ color: P.accentText, fontFamily: F.regal, fontSize: 14.5, fontWeight: 800, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{c.title || c.search_term}</div>
                  <div style={{ color: P.accentDim, fontFamily: F.body, fontSize: 11.5, marginTop: 2 }}>{c.skip_distance ? `דילוג ${c.skip_distance}` : ""}{c.scope === "tanakh" ? " · תנ״ך" : c.skip_distance ? " · תורה" : ""}</div>
                </div>
              </Link>
            ))}
            <Link to="/codes" style={{ flex: "0 0 auto", width: 128, scrollSnapAlign: "start", background: P.card, border: `1px dashed ${P.accent}`, borderRadius: 14, textDecoration: "none", display: "grid", placeItems: "center", color: P.accentText, fontFamily: F.heading, fontSize: 13.5, fontWeight: 800, textAlign: "center", padding: 10 }}>כל הצפנים →</Link>
          </div>
        ) : (
          <div style={{ maxWidth: 620, margin: "0 auto", textAlign: "center", background: P.cardSoft, border: `1px dashed ${P.borderStrong}`, borderRadius: 16, padding: "30px 22px" }}>
            <div style={{ fontSize: 30, marginBottom: 8 }}>🔓</div>
            <div style={{ color: P.accentText, fontFamily: F.heading, fontSize: 16, fontWeight: 800 }}>הצופן נפתח בקרוב</div>
            <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 14, lineHeight: 1.8, marginTop: 8, maxWidth: 440, marginInline: "auto" }}>
              כאן יופיעו צפני דילוגי-האותיות (ELS) — התכנסויות נסתרות בתורה ובתנ״ך, מאומתות במנוע. בהכנה 🛠️
            </div>
          </div>
        )}
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

      {/* ===== 🌳 העץ האחד — גוף-הראיות גדל (קישור לבית המדרש; עוגן-גלילה מהפוסט) ===== */}
      <section id="one-tree" className="hn-wrap" style={{ padding: "0 18px 44px", scrollMarginTop: 74 }}>
        <OneTreeWidget />
      </section>

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
      {/* 🖼️ תמונת-שער מוגדלת (נגיעה על התמונה הקטנה בשער) */}
      {gateImg && (
        <Lightbox images={[{ image_url: gateImg }]} onClose={() => setGateImg(null)} />
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
