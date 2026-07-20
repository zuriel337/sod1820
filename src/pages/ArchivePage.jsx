import React, { useState, useEffect, useMemo, useRef, useCallback } from "react";
import { createPortal } from "react-dom";
import { Link, useLocation } from "react-router-dom";
import { C, F, GALLERY_BG, LOGO_URL } from "../theme.js";
import {
  getGalleriesOverview, getGalleryDetail,
  getNumberSets, saveNumberSet, deleteNumberSet, getTederStations,
  searchArchiveOcrIds, addImageToRealityStream, setImageCuration,
  getHintSets, saveHintSet, addHintSetMember, deleteGalleryImage, checkImageConnections,
  getRealityHints, getTreasures, supabase,
} from "../lib/supabase.js";
import MuseumGallery, { CascadeContain } from "../components/MuseumGallery.jsx";
import { stripHtml } from "../lib/format.js";
import { thumb, galThumb } from "../lib/img.js";
import { bubbleKeyFor, CORE_BUBBLE } from "../lib/bubbles.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import StickyAnchorAd from "../components/StickyAnchorAd.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import { MaintenanceLock, useSiteFlag } from "../components/MaintenanceLock.jsx";
import HintSetWizard from "../components/HintSetWizard.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { track } from "../lib/tracking.js";
import SideRailAd from "../components/SideRailAd.jsx";
import RealityWorld from "../components/RealityWorld.jsx";
import RealityStream from "../components/RealityStream.jsx";
import ShareToFacebookBtn from "../components/ShareToFacebookBtn.jsx";
import { PALETTES } from "../lib/palette.js";
import { hintNums } from "../lib/reality.js";

// ===== גלריית רמזי הגאולה (/archive) =====
// טאב 1 "גלריות" — המבנה ההיסטורי, ללא שינוי.
// טאב 2 "מאגר / סטים" — כל התמונות כמאגר אחד, מסונן לפי סט מספרים / מספר / שנה,
//   מסודר כרונולוגית (חדש למעלה). גשר לאירועים מהציר. בונה-סטים למנהלים בלבד.

const HE_MONTHS = ["ינואר","פברואר","מרץ","אפריל","מאי","יוני","יולי","אוגוסט","ספטמבר","אוקטובר","נובמבר","דצמבר"];
const PER = 60;

function descDate(desc) {
  if (!desc) return null;
  const m = String(desc).match(/(\d{1,2})[./](\d{1,2})[./](\d{2,4})/);
  if (!m) return null;
  let [, d, mo, y] = m; y = y.length === 2 ? "20" + y : y;
  const dt = new Date(+y, +mo - 1, +d);
  return isNaN(dt) ? null : dt;
}
const eventDate = im => im.occurred_at ? new Date(im.occurred_at) : (descDate(im.description) || new Date(0));
const eventYear = im => { const d = eventDate(im); return d ? d.getFullYear() : null; };

function eventLabel(im) {
  if (im.occurred_at) { const d = new Date(im.occurred_at); return `${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  const d = descDate(im.description);
  return d ? d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : null;
}
export default function ArchivePage() {
  const { user, isAdmin } = useAuth();
  const loc = useLocation();
  // 🔒 טאבי הגלריות (גלריות/מאגר/אוצרות) נעולים בנפרד מהזרם — גם לרשומים (lock_galleries).
  const { lock: galLock } = useSiteFlag("lock_galleries");
  const galBlocked = !!galLock?.enabled && !isAdmin && !(galLock.mode === "anon" && user);
  useEffect(() => { track("reality-stream"); }, []); // eslint-disable-line
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(loc.search).get("tab");
    // ברירת-מחדל: זרם המציאות (קליל) — reality_stream_law. גלריות/מאגר הכבדים רק בכניסה מפורשת.
    return t === "galleries" ? "galleries" : t === "pool" ? "pool" : t === "cascade" ? "cascade" : "reality";
  });
  // סנכרון טאב כשמנווטים עם ?tab= (אותו עמוד, לא מתבצע remount)
  useEffect(() => {
    const t = new URLSearchParams(loc.search).get("tab");
    if (t === "galleries" || t === "pool" || t === "reality" || t === "cascade" || t === "trial") setTab(t);
  }, [loc.search]);
  const [gals, setGals] = useState(null);
  const [imgs, setImgs] = useState([]);
  const [sets, setSets] = useState([]);
  const [teder, setTeder] = useState([]);

  // galleries tab
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // pool tab
  const [activeSet, setActiveSet] = useState(null);      // set object
  const [numFilters, setNumFilters] = useState(new Set()); // multi-number filter basket
  const [filterMode, setFilterMode] = useState("OR");     // "OR" | "AND"
  const [dominantOnly, setDominantOnly] = useState(false); // only primary_value
  const [yearFilter, setYearFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [ocrMatch, setOcrMatch] = useState(null); // {imgs:Set, gals:Set} מחיפוש OCR בשרת
  const [sortMode, setSortMode] = useState("date");   // date (חדש→ישן, ברירת מחדל) | gallery | cross
  const [viewMode, setViewMode] = useState("images"); // images (רשת תמונות, ברירת-מחדל) | galleries (אקורדיון)
  const [openGal, setOpenGal] = useState(null);          // גלריה פתוחה בפיד (האחרונה כברירת מחדל)
  const [showAllNums, setShowAllNums] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);   // פאנל סינון מתקפל (סגור כברירת מחדל)
  const [limit, setLimit] = useState(PER);
  const [lbImages, setLbImages] = useState(null);   // מערך תמונות ללייטבוקס
  const [lbStart, setLbStart] = useState(0);         // אינדקס פתיחה
  const [editImg, setEditImg] = useState(null);
  const [jumpTo, setJumpTo] = useState(null);         // id תמונה לקפיצה+גלילה בתצוגת המאגר
  const [builder, setBuilder] = useState(null);       // {id?, name, numbers:Set}
  const [curating, setCurating] = useState(false);    // מצב הבלטה/סידור ידני
  const [draftOrder, setDraftOrder] = useState([]);   // רשימת מזהי תמונות מובלטות (סדר)
  // workspace dashboard
  const [typeFilter, setTypeFilter] = useState(null);  // null/'hint'/'gematria'/'trail'/'event'/'gallery'/'__none'
  const [sourceFilter, setSourceFilter] = useState(null); // null/'update'/'not-update'
  const [showHidden, setShowHidden] = useState(false); // הצג/הסתר מוסתרות (curator_hidden)
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [masonryView, setMasonryView] = useState(true);
  const [bulkType, setBulkType] = useState(null);
  const [eventFilter, setEventFilter] = useState(false); // סינון: תמונות עם תאריך אירוע בלבד

  // drag-and-drop classification
  const dragIdsRef = useRef(new Set());
  const [dragging, setDragging] = useState(false);
  const [dropTarget, setDropTarget] = useState(null); // type key being hovered

  // hint_sets
  const [hintSets, setHintSets] = useState([]);
  const [activeHintSet, setActiveHintSet] = useState(null);
  const [hintSetDraft, setHintSetDraft] = useState(null); // {name, visibility, importance}
  const [wizardOpen, setWizardOpen] = useState(false);

  // ⚡ טעינה כבדה (כל התמונות + סטים) — עצלה. רצה רק כשנכנסים לטאב «מאגר»/«גלריות»,
  // לא בכניסה ל«זרם המציאות» (reality_stream_law) שמביא נתונים קלים משלו (RealityWorld).
  // כך כניסת ברירת-המחדל אינה טוענת אלפי תמונות (מהיר + חוסך Image Transformations).
  const overviewLoaded = useRef(false);
  useEffect(() => {
    if (tab !== "pool" && tab !== "galleries") return;
    if (overviewLoaded.current) return;
    overviewLoaded.current = true;
    getGalleriesOverview().then(({ gals, imgs }) => {
      setImgs(imgs);
      const dateOf = im => {
        if (im.occurred_at) return Number(im.occurred_at.slice(0, 7).replace("-", ""));
        const m = (im.image_url || "").match(/\/uploads\/(\d{4})\/(\d{2})\//); return m ? Number(m[1] + m[2]) : 0;
      };
      const agg = {};
      for (const im of imgs) {
        const g = im.gallery_id, d = dateOf(im);
        if (!agg[g]) agg[g] = { count: 0, maxd: 0, cover: null };
        agg[g].count++;
        if (d >= agg[g].maxd) { agg[g].maxd = d; agg[g].cover = im.image_url; }
      }
      const list = gals
        .map(g => ({ id: g.id, name: g.name, anchor: g.anchor_number, seq: g.wp_gallery_id ?? -1, count: agg[g.id]?.count || 0, cover: agg[g.id]?.cover }))
        .filter(g => g.count > 0)
        .sort((a, b) => b.seq - a.seq);
      setGals(list);
    }).catch(() => setGals([]));
    getNumberSets().then(rows => { setSets(rows); if (rows.length) setActiveSet(rows[0]); }).catch(() => {});
    getTederStations().then(setTeder).catch(() => {});
    getHintSets().then(setHintSets).catch(() => {});
  }, [tab]);

  // deep-link מפוסט: /archive?tab=galleries&gal=<wp_gallery_id> → פותח את הגלריה הספציפית.
  // (הגלריה «seq» = wp_gallery_id.) ה-ref מונע פתיחה חוזרת אחרי שהמשתמש סוגר.
  const galDeepLinked = useRef(false);
  useEffect(() => {
    const gp = new URLSearchParams(loc.search).get("gal");
    if (!gp || !gals || !gals.length || galDeepLinked.current) return;
    const found = gals.find(g => g.seq === Number(gp));
    if (found) { setTab("galleries"); setSel(found); galDeepLinked.current = true; }
  }, [loc.search, gals]);

  // deep-link מבועות (זרם המציאות / דף הבית): /archive?tab=pool&nums=14,45 → טאב מאגר + סינון מספרים.
  const numDeepLinked = useRef(false);
  useEffect(() => {
    const sp = new URLSearchParams(loc.search);
    const raw = sp.get("nums") || sp.get("num");
    if (!raw || numDeepLinked.current) return;
    const nums = raw.split(/[,\s]+/).map(n => parseInt(n, 10)).filter(n => n > 0);
    if (!nums.length) return;
    setTab("pool"); setViewMode("images");
    setNumFilters(new Set(nums));
    if (nums.length > 1) setFilterMode("OR");
    numDeepLinked.current = true;
  }, [loc.search]);

  const imgDate = occ => { if (!occ) return null; try { return new Date(occ).toLocaleDateString("he-IL", { year: "numeric", month: "long" }); } catch { return null; } };

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    setLoadingDetail(true);
    getGalleryDetail(sel.id).then(d => { setDetail(d); setLoadingDetail(false); }).catch(() => setLoadingDetail(false));
  }, [sel]);

  const total = useMemo(() => (gals || []).reduce((s, g) => s + g.count, 0), [gals]);

  // מיפוי גלריה → סדר התוסף (wp_gallery_id); גבוה = חדש יותר
  const galSeqById = useMemo(() => { const m = {}; for (const g of (gals || [])) m[g.id] = g.seq; return m; }, [gals]);

  // ── מאגר: מיון. ברירת מחדל "גלריה" = כסדר התוסף. "תאריך" = לפי תאריך אירוע. "recent" = לפי העלאה.
  const sortedImgs = useMemo(() => {
    const arr = [...imgs];
    if (sortMode === "gallery") {
      arr.sort((a, b) =>
        (galSeqById[b.gallery_id] ?? -1) - (galSeqById[a.gallery_id] ?? -1) ||
        (a.ordering ?? 0) - (b.ordering ?? 0));
      return arr;
    }
    if (sortMode === "recent") {
      return arr.sort((a, b) =>
        (new Date(b.created_at || 0) - new Date(a.created_at || 0)) ||
        ((b.importance ?? 0) - (a.importance ?? 0))
      );
    }
    const withD = [], without = [];
    for (const im of arr) (eventDate(im) ? withD : without).push(im);
    withD.sort((a, b) =>
      (eventDate(b) - eventDate(a)) ||
      ((b.importance ?? 0) - (a.importance ?? 0)) ||
      (new Date(b.created_at || 0) - new Date(a.created_at || 0))
    );
    return [...withD, ...without];
  }, [imgs, sortMode, galSeqById]);

  const numOptions = useMemo(() => {
    const c = {};
    for (const im of imgs) for (const v of hintNums(im)) c[v] = (c[v] || 0) + 1;
    return Object.entries(c).map(([n, k]) => ({ n: +n, k })).sort((a, b) => b.k - a.k);
  }, [imgs]);
  const yearOptions = useMemo(() => {
    const s = new Set();
    for (const im of imgs) { const y = eventYear(im); if (y) s.add(y); }
    return [...s].sort((a, b) => b - a);
  }, [imgs]);

  // צפיפות לפי שנה — לסרגל-הזמן (ציר כרונולוגי). מסננים את שנת-האפס (תמונות בלי תאריך).
  const yearData = useMemo(() => {
    const m = new Map();
    for (const im of imgs) {
      if (im.curator_hidden) continue;
      const y = eventYear(im);
      if (!y || y < 2005) continue;
      m.set(y, (m.get(y) || 0) + 1);
    }
    return [...m.entries()].map(([year, count]) => ({ year, count })).sort((a, b) => a.year - b.year);
  }, [imgs]);

  // המספרים החזקים לכל שנה — לבועות. זוגות כרוכים (14+45) נספרים כבועה אחת.
  const yearTopNums = useMemo(() => {
    const perYear = new Map();
    for (const im of imgs) {
      if (im.curator_hidden) continue;
      const y = eventYear(im); if (!y || y < 2005) continue;
      const pv = Number(im.primary_value); if (!pv) continue;
      const bk = bubbleKeyFor(pv);
      if (!perYear.has(y)) perYear.set(y, new Map());
      const ym = perYear.get(y);
      const e = ym.get(bk.key) || { ...bk, count: 0 }; e.count++; ym.set(bk.key, e);
    }
    const out = new Map();
    for (const [y, ym] of perYear) out.set(y, [...ym.values()].sort((a, b) => b.count - a.count).slice(0, 12));
    return out;
  }, [imgs]);

  // אגרגציה על כל השנים — לכפתור «כל השנים» בסרגל-הזמן.
  const allTopNums = useMemo(() => {
    const m = new Map();
    for (const im of imgs) {
      if (im.curator_hidden) continue;
      const pv = Number(im.primary_value); if (!pv) continue;
      const bk = bubbleKeyFor(pv);
      const e = m.get(bk.key) || { ...bk, count: 0 }; e.count++; m.set(bk.key, e);
    }
    return [...m.values()].sort((a, b) => b.count - a.count).slice(0, 16);
  }, [imgs]);

  // החלפת קבוצת-מספרים בסינון (לבועה — כולל זוג 14+45 בבת-אחת).
  const toggleNums = (nums) => {
    setNumFilters(prev => {
      const next = new Set(prev);
      const allOn = nums.every(n => next.has(n));
      nums.forEach(n => allOn ? next.delete(n) : next.add(n));
      return next;
    });
  };

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => { setLimit(PER); }, [activeSet, numFilters.size, yearFilter, query, tab]);

  const qRaw = query.trim();
  const qNum = /^\d+$/.test(qRaw) ? parseInt(qRaw, 10) : null;   // חיפוש מספר → סינון לפי ערך
  const q = qRaw.toLowerCase();
  const setNums = activeSet ? new Set(activeSet.numbers) : null;

  // חיפוש OCR בצד-שרת (במקום לטעון את כל ה-ocr_text מראש)
  useEffect(() => {
    if (qNum != null || !qRaw || qRaw.length < 2) { setOcrMatch(null); return; }
    let live = true;
    const t = setTimeout(() => {
      searchArchiveOcrIds(qRaw).then(rows => {
        if (!live) return;
        setOcrMatch({ imgs: new Set(rows.map(r => r.id)), gals: new Set(rows.map(r => r.gallery_id)) });
      }).catch(() => live && setOcrMatch({ imgs: new Set(), gals: new Set() }));
    }, 250);
    return () => { live = false; clearTimeout(t); };
  }, [qRaw, qNum]);

  // מטא לכל גלריה: אילו מספרים/שנים מופיעים בה
  const galMeta = useMemo(() => {
    const m = {};
    for (const im of imgs) {
      const g = im.gallery_id;
      if (!m[g]) m[g] = { nums: new Set(), years: new Set() };
      for (const v of hintNums(im)) m[g].nums.add(v);
      const y = eventYear(im); if (y) m[g].years.add(y);
    }
    return m;
  }, [imgs]);

  // גלריות החברות בסט (לתצוגת "גלריות" — שורות רחבות, החדשה למעלה לפי seq)
  // כשמסננים לפי מספרים מרובים — מספיק שגלריה מכילה אחד מהם (OR-level)
  const memberGals = useMemo(() => {
    let list = gals || [];
    const inSet = g => setNums && (setNums.has(g.anchor) || (galMeta[g.id] && [...galMeta[g.id].nums].some(v => setNums.has(v))));
    if (setNums) list = list.filter(inSet);
    if (numFilters.size > 0) {
      const nums = [...numFilters];
      list = list.filter(g => nums.some(n => g.anchor === n || (galMeta[g.id] && galMeta[g.id].nums.has(n))));
    }
    if (qNum != null) list = list.filter(g => g.anchor === qNum || (galMeta[g.id] && galMeta[g.id].nums.has(qNum)));
    else if (q) {
      const gidMatch = ocrMatch?.gals || new Set();
      list = list.filter(g => (g.name || "").toLowerCase().includes(q) || gidMatch.has(g.id));
    }
    return list;
  }, [gals, setNums, galMeta, numFilters, q, qNum, ocrMatch]);

  // ברירת מחדל: הגלריה האחרונה (החדשה) פתוחה
  const firstGalId = memberGals[0]?.id ?? null;
  useEffect(() => { setOpenGal(firstGalId); }, [firstGalId]);

  const pool = useMemo(() => {
    let arr = sortedImgs.filter(im => {
      if (!showHidden && im.curator_hidden) return false; // מוסתרות: מוסתרות בברירת מחדל
      if (typeFilter === '__none' ? im.image_type != null : typeFilter != null && im.image_type !== typeFilter) return false;
      if (sourceFilter === 'update' && im.source !== 'update') return false;
      if (sourceFilter === 'not-update' && im.source === 'update') return false;
      if (setNums && !hintNums(im).some(v => setNums.has(v))) return false;
      if (numFilters.size > 0) {
        const nums = [...numFilters];
        const match = dominantOnly
          ? (filterMode === "AND" ? nums.every(n => n === im.primary_value) : nums.includes(im.primary_value))
          : (filterMode === "AND" ? nums.every(n => hintNums(im).includes(n)) : nums.some(n => hintNums(im).includes(n)));
        if (!match) return false;
      }
      if (eventFilter && !im.occurred_at) return false;
      if (yearFilter != null && eventYear(im) !== yearFilter) return false;
      if (qNum != null) { if (!hintNums(im).includes(qNum)) return false; }
      else if (q && !((im.name || "").toLowerCase().includes(q) || (im.description || "").toLowerCase().includes(q) || (ocrMatch?.imgs.has(im.id)))) return false;
      return true;
    });
    if (sortMode === "cross") {
      const score = im => (setNums ? hintNums(im).filter(v => setNums.has(v)).length : 0) * 1000 + hintNums(im).length;
      arr = [...arr].sort((a, b) => score(b) - score(a));
    }
    return arr;
  }, [sortedImgs, showHidden, typeFilter, sourceFilter, eventFilter, setNums, numFilters, filterMode, dominantOnly, yearFilter, q, qNum, sortMode, ocrMatch]);

  // אירועים מהציר שחולקים מספר עם הסט/המספר הפעיל
  const bridgeNums = activeSet ? activeSet.numbers : (numFilters.size > 0 ? [...numFilters] : null);
  const bridgeEvents = useMemo(() => {
    if (!bridgeNums) return [];
    const s = new Set(bridgeNums);
    return teder.filter(t => (t.central_numbers || []).some(n => s.has(n)));
  }, [teder, bridgeNums]);

  const shownNums = showAllNums ? numOptions : numOptions.slice(0, 16);
  const hasFilter = activeSet || numFilters.size > 0 || yearFilter != null || q;
  const hotNums = numOptions.slice(0, 10); // top-10 by frequency — "strong numbers" suggestions

  function toggleNum(n) {
    setNumFilters(prev => { const s = new Set(prev); s.has(n) ? s.delete(n) : s.add(n); return s; });
  }
  function toggleSelect(id) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }

  async function addToStream(im) {
    try {
      await addImageToRealityStream(im.id, im.occurred_at || null);
      setImgs(prev => prev.map(x => x.id === im.id ? { ...x, source: "update" } : x));
    } catch (e) { alert("הוספה לזרם נכשלה: " + (e.message || e)); }
  }

  async function handleSave(patch) {
    if (!editImg || !Object.keys(patch).length) { setEditImg(null); return; }
    try {
      await setImageCuration(editImg.id, patch);
      setImgs(prev => prev.map(x => x.id === editImg.id ? { ...x, ...patch } : x));
      // עדכון גם במודאל הגלריה הפתוח (detail) כדי שהעריכה תשתקף מיד
      setDetail(prev => Array.isArray(prev) ? prev.map(x => x.id === editImg.id ? { ...x, ...patch } : x) : prev);
      setEditImg(null);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }

  // 📍 קפיצה למקום התמונה בתצוגת המאגר המסוננת — כדי לראות מי לפניה/אחריה (לבניית סטים).
  // מנקה סינונים, ממיין לפי גלריה (שכנים = בני אותה גלריה), עובר לטאב המאגר וגולל אל התמונה.
  function jumpToPool(im) {
    setSel(null);
    setActiveSet(null);
    setNumFilters(new Set());
    setQuery("");
    setYearFilter(null);
    setSortMode("gallery");
    setViewMode("images");
    setTab("pool");
    setJumpTo(im.id);
  }

  async function handleRemoveFromStream() {
    if (!editImg) return;
    try {
      await setImageCuration(editImg.id, { source: "manual" });
      setImgs(prev => prev.map(x => x.id === editImg.id ? { ...x, source: "manual" } : x));
      setEditImg(null);
    } catch (e) { alert("הסרה נכשלה: " + (e.message || e)); }
  }

  // ── הבלטה / סידור ידני בתוך סט ──
  useEffect(() => { setCurating(false); }, [activeSet]);
  const poolById = useMemo(() => { const m = {}; for (const im of pool) m[im.id] = im; return m; }, [pool]);
  const orderIds = curating ? draftOrder : (activeSet?.image_order || []);
  const highlighted = useMemo(() => orderIds.map(id => poolById[id]).filter(Boolean), [orderIds, poolById]);
  const hiSet = useMemo(() => new Set(highlighted.map(im => im.id)), [highlighted]);
  const rest = useMemo(() => pool.filter(im => !hiSet.has(im.id)), [pool, hiSet]);
  const curated = activeSet && (highlighted.length > 0 || curating);

  // גלילה אל היעד אחרי קפיצה מהמודאל — מרחיב את ה-limit עד שהתמונה בטווח, ואז מבליט.
  useEffect(() => {
    if (!jumpTo || tab !== "pool" || viewMode !== "images") return;
    const idx = pool.findIndex(im => im.id === jumpTo);
    if (idx < 0) { setJumpTo(null); return; }
    if (idx >= limit) { setLimit(Math.ceil((idx + 1) / PER) * PER); return; }
    const el = document.getElementById(`pool-${jumpTo}`);
    if (el) {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
      el.classList.add("ar-jump-hi");
      setTimeout(() => el.classList.remove("ar-jump-hi"), 2600);
      setJumpTo(null);
    }
  }, [jumpTo, tab, viewMode, pool, limit]);

  function startCurate() { setDraftOrder([...(activeSet.image_order || [])]); setCurating(true); }
  function toggleHi(id) { setDraftOrder(o => o.includes(id) ? o.filter(x => x !== id) : [...o, id]); }
  function moveHi(id, dir) {
    setDraftOrder(o => { const i = o.indexOf(id), j = i + dir; if (i < 0 || j < 0 || j >= o.length) return o; const n = [...o]; [n[i], n[j]] = [n[j], n[i]]; return n; });
  }
  async function saveOrder() {
    try {
      await saveNumberSet({ id: activeSet.id, name: activeSet.name, numbers: activeSet.numbers, image_order: draftOrder });
      const fresh = await getNumberSets(); setSets(fresh); setActiveSet(fresh.find(s => s.id === activeSet.id) || null); setCurating(false);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }

  async function reloadSets() { try { setSets(await getNumberSets()); } catch {} }
  async function reloadHintSets() { try { setHintSets(await getHintSets()); } catch {} }
  async function saveNewHintSet() {
    if (!hintSetDraft?.name?.trim()) return;
    try {
      const created = await saveHintSet({ name: hintSetDraft.name.trim(), visibility: hintSetDraft.visibility || 'public', importance: hintSetDraft.importance ?? 3 });
      await reloadHintSets();
      setActiveHintSet(created);
      setHintSetDraft(null);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }
  async function bulkTagSelected() {
    if (!bulkType || !selectedIds.size) return;
    const ids = [...selectedIds];
    try {
      await Promise.all(ids.map(id => setImageCuration(id, { image_type: bulkType })));
      setImgs(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, image_type: bulkType } : x));
      setSelectedIds(new Set());
      setBulkType(null);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }

  // 🎯 צור סט (אוסף-תמונות) מהבחירה הנוכחית — כל התמונות המסומנות הופכות לסט שמור.
  async function createSetFromSelection() {
    if (!selectedIds.size) return;
    const ids = [...selectedIds];
    const name = window.prompt(`שם לסט החדש (${ids.length} תמונות):`, "");
    if (!name || !name.trim()) return;
    if (ids.length > 200 && !window.confirm(`ליצור סט עם ${ids.length} תמונות? זה עשוי לקחת כמה שניות.`)) return;
    try {
      const created = await saveHintSet({ name: name.trim(), visibility: 'public', importance: 3 });
      // הוספה במנות כדי לא להציף את ה-API
      for (let i = 0; i < ids.length; i += 25) {
        await Promise.all(ids.slice(i, i + 25).map((id, j) => addHintSetMember(created.id, 'image', id, i + j)));
      }
      await reloadHintSets();
      setActiveHintSet({ ...created, _memberCount: ids.length });
      setSelectedIds(new Set());
      setMultiSelect(false);
      alert(`נוצר סט «${name.trim()}» עם ${ids.length} תמונות ✓`);
    } catch (e) { alert("יצירת הסט נכשלה: " + (e.message || e)); }
  }

  async function addToHintSet(im) {
    if (!activeHintSet) return;
    const memberCount = activeHintSet._memberCount ?? 0;
    try {
      await addHintSetMember(activeHintSet.id, 'image', im.id, memberCount);
      setActiveHintSet(s => ({ ...s, _memberCount: memberCount + 1 }));
    } catch (e) { alert("הוספה נכשלה: " + (e.message || e)); }
  }

  // ── drag-and-drop classification ──
  function handleDragStart(e, im) {
    const ids = selectedIds.size > 0 && selectedIds.has(im.id) ? [...selectedIds] : [im.id];
    dragIdsRef.current = new Set(ids);
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', ids.join(','));
    setDragging(true);
  }
  function handleDragEnd() { setDragging(false); setDropTarget(null); }
  async function dropOnType(targetType) {
    const ids = [...dragIdsRef.current];
    if (!ids.length) return;
    setDragging(false); setDropTarget(null);
    try {
      await Promise.all(ids.map(id => setImageCuration(id, { image_type: targetType })));
      const captured = new Set(dragIdsRef.current);
      setImgs(prev => prev.map(x => captured.has(x.id) ? { ...x, image_type: targetType } : x));
      dragIdsRef.current = new Set();
      setSelectedIds(new Set());
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }

  async function deleteImage(im) {
    if (im.source === 'update') {
      alert("לא ניתן למחוק תמונה מהזרם — ניתן להסתיר בלבד (curator_hidden).");
      return;
    }
    // התראה «לאיפה זה מחובר» לפני מחיקה (גם במחיר שבירת עץ — כבקשת צוריאל).
    let warn = "";
    try {
      const refs = await checkImageConnections(im.id, im.image_url);
      if (refs.length) {
        const LBL = { topic: "התכנסות", post: "פוסט", insight: "חידוש" };
        const lines = refs.slice(0, 12).map(c => `• ${LBL[c.type] || c.type}: ${c.label}`).join("\n");
        warn = `\n\n⚠️ התמונה מחוברת ל-${refs.length} מקומות — המחיקה תשבור את הקישור:\n${lines}\n`;
      }
    } catch {}
    if (!window.confirm(`למחוק לצמיתות את "${im.name || im.id}"?${warn}\nפעולה זו אינה הפיכה.`)) return;
    try {
      await deleteGalleryImage(im.id);
      setImgs(prev => prev.filter(x => x.id !== im.id));
      setDetail(prev => Array.isArray(prev) ? prev.filter(x => x.id !== im.id) : prev);
      setSel(prev => prev);  // השאר את המודאל פתוח; התמונה פשוט נעלמת מהרשימה
    } catch (e) { alert("מחיקה נכשלה: " + (e.message || e)); }
  }

  async function saveBuilder() {
    const nums = [...builder.numbers].sort((a, b) => a - b);
    if (!builder.name.trim() || !nums.length) return;
    try {
      await saveNumberSet({ id: builder.id, name: builder.name.trim(), numbers: nums });
      await reloadSets(); setBuilder(null);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }
  async function removeSet(id) {
    if (!window.confirm("למחוק את הסט?")) return;
    try { await deleteNumberSet(id); if (activeSet?.id === id) setActiveSet(null); await reloadSets(); }
    catch (e) { alert("מחיקה נכשלה: " + (e.message || e)); }
  }

  return (
    <>
    {createPortal(<style id="ar-page-css">{`
      .arch-card:hover { border-color: ${C.gold} !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.18); }
      .ar-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
      .ar-panel { max-width: 980px; margin: 0 auto 18px; padding: 14px 16px 11px; border: 1px solid ${C.borderGold}; border-radius: 16px;
        background: linear-gradient(165deg, rgba(20,15,12,0.72), rgba(8,5,2,0.55)); display: flex; flex-direction: column; gap: 10px; }
      .ar-label { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12.5px; }
      .ar-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; background: rgba(8,5,2,0.6); border: 1px solid ${C.border}; border-radius: 999px; padding: 5px 13px; }
      .ar-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; padding: 5px 2px; }
      .ar-x { background: none; border: none; color: ${C.muted}; font-size: 20px; cursor: pointer; }
      .ar-pill { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.border}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; padding: 6px 13px; border-radius: 999px; }
      .ar-pill:hover { border-color: ${C.gold}; }
      .ar-pill.active { background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color: #1a0e00; border-color: ${C.gold}; }
      .ar-sm { font-family: ${F.mono}; font-size: 12.5px; padding: 5px 11px; }
      .ar-more { background: transparent; border-style: dashed; color: ${C.goldDim}; }
      .ar-count { margin-inline-start: 6px; padding: 1px 6px; border-radius: 999px; background: rgba(8,5,2,0.5); color: ${C.goldDim}; font-size: 11px; }
      .ar-pill.active .ar-count { background: rgba(0,0,0,0.22); color: #1a0e00; }
      .ar-set { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.borderGold}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 14px; font-weight: 700; padding: 8px 16px; border-radius: 999px; }
      .ar-set.active { background: linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight}); color: ${C.goldBright}; border-color: ${C.gold}; }
      .ar-set-nums { font-family: ${F.mono}; font-size: 11px; opacity: 0.8; margin-inline-start: 4px; }
      .ar-new { border-style: dashed; color: ${C.goldDim}; }
      .ar-icn { background: none; border: none; cursor: pointer; color: ${C.goldDim}; font-size: 13px; padding: 2px 4px; }
      .ar-icn:hover { color: ${C.goldBright}; }
      .ar-builder { max-width: 980px; margin: 0 auto 16px; padding: 16px; border: 1px dashed ${C.borderGold}; border-radius: 14px; background: rgba(8,5,2,0.4); }
      .ar-input { background: rgba(8,5,2,0.6); border: 1px solid ${C.border}; border-radius: 8px; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; padding: 8px 12px; }
      .ar-save { background: ${C.gold}; color: #1a0e00; border: none; border-radius: 999px; padding: 8px 18px; font-family: ${F.heading}; font-weight: 800; cursor: pointer; }
      .ar-cancel { background: none; border: 1px solid ${C.border}; color: ${C.muted}; border-radius: 999px; padding: 8px 16px; cursor: pointer; font-family: ${F.heading}; }
      .ar-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(212,175,55,0.12); border: 1px solid ${C.borderGold}; border-radius: 999px; padding: 4px 6px 4px 12px; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12px; }
      .ar-chip button { background: none; border: none; color: ${C.goldDim}; cursor: pointer; font-size: 16px; }
      .ar-clear { background: none; border: 1px solid ${C.crimsonLight}; color: #d98a92; border-radius: 999px; padding: 5px 14px; cursor: pointer; font-family: ${F.heading}; font-size: 12px; }
      .ar-bridge { max-width: 980px; margin: 0 auto 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px;
        border: 1px solid ${C.borderGold}; border-radius: 14px; background: linear-gradient(120deg, rgba(122,19,32,0.22), rgba(61,31,92,0.18)); }
      .ar-evt { color: ${C.goldLight}; text-decoration: none; font-family: ${F.heading}; font-size: 13px; background: rgba(8,5,2,0.5); border: 1px solid ${C.border}; border-radius: 999px; padding: 5px 13px; }
      .ar-evt:hover { border-color: ${C.gold}; color: ${C.goldBright}; }
      .ar-status { text-align: center; color: ${C.muted}; font-family: ${F.heading}; font-size: 13px; margin: 4px 0 18px; }
      .ar-empty { text-align: center; color: ${C.muted}; font-family: ${F.body}; padding: 50px 20px; font-size: 15px; }
      .ar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
      @media (max-width: 600px) { .ar-grid { grid-template-columns: repeat(3, 1fr); gap: 7px; } }
      .ar-imgcard { position: relative; cursor: pointer; padding: 0; overflow: hidden; border: 1px solid ${C.border}; border-radius: 12px; background: #000; aspect-ratio: 1/1; display: block; }
      .ar-anchor { position: absolute; top: 7px; inset-inline-end: 7px; background: rgba(212,175,55,0.92); color: #1a0e00; font-family: ${F.mono}; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
      .ar-imgdate { position: absolute; bottom: 6px; inset-inline-start: 7px; color: ${C.goldBright}; font-family: ${F.heading}; font-size: 10px; font-weight: 700; background: rgba(5,4,0,0.6); border-radius: 6px; padding: 2px 6px; }
      .ar-loadmore { cursor: pointer; background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4)); border: 1px solid ${C.borderGold}; border-radius: 999px; color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 15px; padding: 12px 36px; }
      .ar-galrow { display: flex; align-items: center; gap: 16px; width: 100%; text-align: right; cursor: pointer; padding: 0; overflow: hidden;
        border: 1px solid ${C.border}; border-radius: 14px; background: linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45)); transition: border-color .18s, transform .12s, box-shadow .18s; }
      .ar-galrow:hover { border-color: ${C.gold}; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.16); }
      .ar-galrow-thumb { position: relative; width: 130px; height: 90px; flex-shrink: 0; }
      .ar-galrow-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; padding: 10px 0; }
      .ar-galrow-name { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 18px; font-weight: 700; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
      .ar-galrow-sub { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12.5px; }
      .ar-galrow-go { color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; padding-inline: 16px; white-space: nowrap; }
      @media (max-width: 520px) { .ar-galrow-thumb { width: 92px; height: 70px; } .ar-galrow-name { font-size: 15px; } }

      /* ── פריסת מאגר: תוכן (ימין) + סרגל צד (שמאל) ── */
      .ar-layout {
        display: grid;
        grid-template-columns: 1fr 300px;
        grid-template-areas: "feed side";
        gap: 22px;
        align-items: start;
      }
      .ar-feed { grid-area: feed; min-width: 0; }
      .ar-side {
        grid-area: side;
        position: sticky;
        top: 74px;
        align-self: start;
        max-height: calc(100vh - 88px);
        overflow-y: auto;
        display: flex;
        flex-direction: column;
        gap: 12px;
        padding: 4px;
      }
      .ar-side .ar-row { justify-content: flex-start; }
      @media (max-width: 900px) {
        .ar-layout {
          grid-template-columns: 1fr;
          grid-template-areas: "feed" "side";
        }
        .ar-side { position: static; max-height: none; }
      }

      /* אקורדיון גלריות */
      .ar-acc { border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45)); }
      .ar-acc-head { display: flex; align-items: center; gap: 14px; width: 100%; cursor: pointer; text-align: right; background: none; border: none; padding: 10px 14px; }
      .ar-acc-head:hover { background: rgba(212,175,55,0.06); }
      .ar-acc-thumb { position: relative; width: 88px; height: 62px; border-radius: 8px; flex-shrink: 0; }
      .ar-acc-name { flex: 1; min-width: 0; color: ${C.goldBright}; font-family: ${F.regal}; font-size: 17px; font-weight: 700; display: flex; flex-direction: column; gap: 2px; overflow: hidden; white-space: nowrap; text-overflow: ellipsis; }
      .ar-acc-sub { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12px; font-weight: 700; }
      .ar-acc-arrow { color: ${C.goldDim}; font-size: 12px; }
      .ar-acc-body { display: grid; gap: 24px; padding: 10px 16px 20px; border-top: 1px solid ${C.faint}; }
      .ar-feed-img { margin: 0; }
      .ar-feed-date { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; color: ${C.goldDim}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
      .ar-feed-img img { display: block; max-width: 100%; max-height: 72vh; width: auto; margin: 0 auto; border-radius: 12px; border: 1px solid ${C.border}; }
      .ar-feed-cap { padding-top: 10px; }
      .ar-feed-name { color: ${C.goldLight}; font-family: ${F.regal}; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
      .ar-feed-desc { color: ${C.muted}; font-family: ${F.body}; font-size: 14px; line-height: 1.85; white-space: pre-wrap; }
      .ar-feed-nums { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
      .ar-feed-num { text-decoration: none; font-family: ${F.mono}; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; border: 1px solid ${C.borderGold}; color: ${C.goldLight}; background: rgba(8,5,2,0.5); }
      .ar-feed-num.primary { background: ${C.gold}; color: #1a0e00; }
      .ar-cross { background: linear-gradient(135deg, rgba(122,19,32,0.55), rgba(212,175,55,0.3)); border: 1px solid ${C.borderGold};
        border-radius: 999px; padding: 2px 11px; color: ${C.goldBright}; font-family: ${F.heading}; font-size: 11px; font-weight: 800; }
      .ar-side-title { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 18px; font-weight: 700; padding: 2px 4px; }
      .ar-curatebar { max-width: 980px; margin: 0 auto 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 14px; border: 1px dashed ${C.borderGold}; border-radius: 12px; background: rgba(8,5,2,0.4); }
      .ar-subhead { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12px; letter-spacing: 2; text-transform: uppercase; margin: 18px 0 10px; }
      .ar-imgwrap { display: flex; flex-direction: column; gap: 4px; }
      .ar-imgcard.ar-on { outline: 2px solid ${C.gold}; outline-offset: -2px; }
      .ar-pos { position: absolute; top: 7px; inset-inline-start: 7px; background: ${C.gold}; color: #1a0e00; font-family: ${F.mono}; font-size: 12px; font-weight: 800; min-width: 20px; text-align: center; padding: 1px 5px; border-radius: 999px; }
      .ar-movebar { display: flex; gap: 4px; }
      .ar-movebar button { flex: 1; cursor: pointer; background: rgba(20,15,12,0.7); border: 1px solid ${C.border}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 11px; font-weight: 700; padding: 4px 0; border-radius: 6px; }
      .ar-movebar button:hover { border-color: ${C.gold}; color: ${C.goldBright}; }

      /* ── סוגי תמונות: כפתורי סרגל צד ── */
      .ar-type-btns { display: flex; flex-direction: column; gap: 4px; margin-top: 6px; }
      .ar-type-btn {
        cursor: pointer; display: flex; align-items: center; justify-content: space-between; gap: 6px;
        width: 100%; text-align: right; background: rgba(20,15,12,0.5); border: 1px solid ${C.border};
        color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700;
        padding: 6px 10px; border-radius: 8px; transition: border-color .15s;
      }
      .ar-type-btn:hover { border-color: ${C.gold}; }
      .ar-type-btn.active { background: linear-gradient(135deg,rgba(212,175,55,0.2),rgba(8,5,2,0.4)); border-color: ${C.gold}; color: ${C.goldBright}; }
      .ar-type-cnt { font-family: ${F.mono}; font-size: 11px; color: ${C.muted}; background: rgba(0,0,0,0.3); padding: 1px 6px; border-radius: 999px; flex-shrink: 0; }
      .ar-type-btn.active .ar-type-cnt { color: rgba(10,5,0,0.85); background: rgba(212,175,55,0.55); }
      .ar-type-btn.drop-hover { border-color: #fff; background: rgba(212,175,55,0.35); transform: scale(1.04); box-shadow: 0 0 0 2px rgba(212,175,55,0.6); }
      .ar-mcard[draggable] { cursor: grab; }
      .ar-mcard[draggable]:active { cursor: grabbing; }
      .ar-mcard.ar-dragging { opacity: 0.5; }

      /* ── סרגל-הזמן (timeline scrubber) ── */
      .ar-tl { margin: 0 0 16px; padding: 13px 16px 11px; border: 1px solid ${C.borderGold}; border-radius: 14px;
        background: linear-gradient(165deg, rgba(28,20,11,0.6), rgba(8,5,2,0.5)); }
      .ar-tl-head { display: flex; align-items: center; justify-content: space-between; gap: 8px; margin-bottom: 11px;
        color: ${C.goldLight}; font-family: ${F.heading}; font-size: 14px; font-weight: 800; letter-spacing: .3px; }
      .ar-tl-hint { color: ${C.goldDim}; font-weight: 700; font-size: 12.5px; }
      .ar-tl-clear { background: none; border: 1px solid ${C.borderGold}; color: ${C.goldLight};
        border-radius: 999px; padding: 4px 13px; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700; cursor: pointer; }
      .ar-tl-clear:hover { color: ${C.goldBright}; border-color: ${C.gold}; }
      .ar-tl-all { background: none; border: 1px solid ${C.borderGold}; color: ${C.goldLight};
        border-radius: 999px; padding: 4px 13px; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700; cursor: pointer; }
      .ar-tl-all:hover { color: ${C.goldBright}; border-color: ${C.gold}; }
      .ar-tl-all.on { background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color: #1a0e00; border-color: ${C.gold}; }
      .ar-tl-track { display: flex; gap: 8px; align-items: flex-end; height: 96px; overflow-x: auto; direction: ltr; padding-bottom: 2px; }
      .ar-tl-track::-webkit-scrollbar { height: 6px; }
      .ar-tl-track::-webkit-scrollbar-thumb { background: rgba(212,175,55,0.35); border-radius: 999px; }
      .ar-tl-col { flex: 1 0 40px; min-width: 40px; height: 100%; display: flex; flex-direction: column;
        align-items: center; justify-content: flex-end; gap: 5px; background: none; border: none; cursor: pointer; padding: 0; }
      .ar-tl-cnt { font-family: ${F.mono}; font-size: 13px; font-weight: 700; color: #e7dcc0; }
      .ar-tl-bar { width: 24px; min-height: 8px; border-radius: 6px 6px 0 0;
        background: linear-gradient(180deg, ${C.gold}, #6b4e10); box-shadow: inset 0 0 0 1px rgba(255,240,200,0.2);
        transition: filter .15s, box-shadow .15s; }
      .ar-tl-col:hover .ar-tl-bar { filter: brightness(1.18); }
      .ar-tl-col.on .ar-tl-bar { background: linear-gradient(180deg, #fff0b8, ${C.gold}); box-shadow: 0 0 14px rgba(212,175,55,0.7); }
      .ar-tl-yr { font-family: ${F.mono}; font-size: 14.5px; font-weight: 800; color: ${C.goldLight}; }
      .ar-tl-col:hover .ar-tl-yr { color: ${C.goldBright}; }
      .ar-tl-col.on .ar-tl-yr { color: ${C.goldBright}; }
      .ar-tl-col.on .ar-tl-cnt { color: ${C.goldBright}; }
      /* בועות מספרים לשנה הנבחרת */
      .ar-tl-bubbles { margin-top: 13px; padding-top: 11px; border-top: 1px solid rgba(212,175,55,0.2); }
      .ar-tl-bub-t { color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; margin-bottom: 9px; }
      .ar-tl-bub-row { display: flex; flex-wrap: wrap; gap: 14px; align-items: center; padding: 8px 2px 4px; }
      /* בועות תלת-ממד — גודל ∝ כמות, ספירה זהובה זוהרת */
      .ar-tl-bub { position: relative; border-radius: 50%; cursor: pointer; flex: 0 0 auto;
        border: 1px solid rgba(212,175,55,0.55); color: #2a1c00; font-family: ${F.mono}; font-weight: 800;
        display: flex; align-items: center; justify-content: center;
        background: radial-gradient(circle at 36% 28%, #fff6d2 0%, #f0d36a 38%, ${C.gold} 62%, #6b4e10 100%);
        box-shadow: 0 7px 18px rgba(0,0,0,0.55), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.65);
        transition: transform .15s ease, box-shadow .15s ease; padding: 0; }
      .ar-tl-bub:hover { transform: translateY(-3px) scale(1.06); box-shadow: 0 13px 28px rgba(0,0,0,0.6), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.7); }
      .ar-tl-bub-v { line-height: 1; }
      .ar-tl-bub-c { position: absolute; top: -5px; inset-inline-end: -5px; min-width: 19px; text-align: center;
        background: #15100a; color: ${C.goldBright}; font-size: 11px; font-weight: 800; border-radius: 999px;
        padding: 1px 6px; border: 1px solid rgba(212,175,55,0.55); box-shadow: 0 2px 6px rgba(0,0,0,0.5); }
      .ar-tl-bub.on { border-color: #fff; box-shadow: 0 0 0 3px rgba(246,226,122,0.85), 0 11px 26px rgba(0,0,0,0.55), inset 0 -7px 13px rgba(90,60,0,0.5), inset 0 5px 9px rgba(255,250,220,0.7); }
      /* 🔥 הילת-חום למספרי-ליבה */
      .ar-tl-bub.hot { border-color: rgba(255,170,60,0.85); animation: ar-bub-hot 2.4s ease-in-out infinite; }
      @keyframes ar-bub-hot {
        0%, 100% { box-shadow: 0 7px 18px rgba(0,0,0,0.55), 0 0 12px rgba(255,140,30,0.45), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.65); }
        50%      { box-shadow: 0 7px 18px rgba(0,0,0,0.55), 0 0 24px rgba(255,150,40,0.75), 0 0 40px rgba(255,120,20,0.35), inset 0 -7px 13px rgba(90,60,0,0.55), inset 0 5px 9px rgba(255,250,220,0.7); }
      }
      .ar-tl-bub.hot.on { animation: none; }

      /* ── מונה חי ── */
      .ar-live-count { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; margin: 0 2px 14px;
        color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13.5px; font-weight: 700; }
      .ar-live-count b { color: ${C.goldBright}; font-family: ${F.mono}; font-size: 15px; }
      .ar-lc-sep { color: ${C.goldDim}; font-weight: 700; }
      .ar-lc-chip { background: rgba(212,175,55,0.14); border: 1px solid ${C.borderGold}; color: ${C.goldLight};
        border-radius: 999px; padding: 2px 11px; font-size: 12.5px; font-family: ${F.mono}; font-weight: 700; }
      .ar-lc-clear { background: none; border: 1px solid ${C.border}; color: ${C.muted}; border-radius: 999px;
        padding: 3px 11px; font-family: ${F.heading}; font-size: 12px; font-weight: 700; cursor: pointer; }
      .ar-lc-clear:hover { color: ${C.goldBright}; border-color: ${C.gold}; }

      /* ── תצוגת מאגר (masonry) — כרטיס-רמז מלכותי ── */
      .ar-masonry {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(186px, 1fr));
        gap: 13px;
        align-items: start;
      }
      @media (max-width: 600px) { .ar-masonry { grid-template-columns: repeat(2, 1fr); gap: 10px; } }
      .ar-mcard {
        position: relative; border-radius: 14px; overflow: hidden;
        background: linear-gradient(165deg, rgba(28,20,11,0.92), rgba(8,5,2,0.94));
        border: 1px solid rgba(212,175,55,0.24);
        box-shadow: 0 3px 14px rgba(0,0,0,0.45);
        transition: border-color .18s, transform .18s, box-shadow .18s;
        break-inside: avoid;
      }
      .ar-jump-hi { animation: ar-jump-pulse 2.6s ease-out; }
      @keyframes ar-jump-pulse {
        0%, 100% { box-shadow: 0 0 0 0 rgba(212,175,55,0); border-color: ${C.border}; }
        15%      { box-shadow: 0 0 0 4px rgba(212,175,55,0.85), 0 0 26px rgba(212,175,55,0.6); border-color: ${C.gold}; }
        60%      { box-shadow: 0 0 0 3px rgba(212,175,55,0.5), 0 0 18px rgba(212,175,55,0.35); border-color: ${C.gold}; }
      }
      .ar-mcard:hover { border-color: ${C.gold}; transform: translateY(-3px);
        box-shadow: 0 14px 32px rgba(0,0,0,0.55), 0 0 26px rgba(212,175,55,0.22); }
      .ar-mcard.ar-dragging:hover { transform: none; }
      .ar-msel { border-color: ${C.gold} !important; box-shadow: 0 0 0 2px rgba(212,175,55,0.45), 0 0 22px rgba(212,175,55,0.3); }
      .ar-mwrap { position: relative; cursor: pointer; min-height: 80px; overflow: hidden; }
      .ar-mwrap img { display: block; width: 100%; height: auto; transition: transform .35s ease; }
      .ar-mcard:hover .ar-mwrap img { transform: scale(1.045); }
      .ar-mshade { position: absolute; inset: 0; background: linear-gradient(180deg, transparent 46%, rgba(5,4,0,0.86)); pointer-events: none; }
      .ar-mchk { position: absolute; top: 6px; inset-inline-start: 6px; width: 22px; height: 22px; border-radius: 50%;
        border: 2px solid rgba(255,255,255,0.5); background: rgba(0,0,0,0.4);
        display: flex; align-items: center; justify-content: center;
        color: #fff; font-size: 12px; font-weight: 800; z-index: 2; }
      .ar-mchk.on { background: ${C.gold}; border-color: ${C.gold}; color: #1a0e00; }
      .ar-mnum { position: absolute; top: 8px; inset-inline-end: 8px;
        background: linear-gradient(135deg, #f6dd92, #d4af37); color: #1a0e00;
        font-family: ${F.mono}; font-size: 11.5px; font-weight: 800; letter-spacing: .3px;
        padding: 3px 11px 3px 9px; border-radius: 999px; text-decoration: none; z-index: 2;
        box-shadow: 0 2px 9px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,244,210,0.4); }
      .ar-mnum::before { content: "✦"; font-size: 8.5px; margin-inline-end: 4px; opacity: .82; vertical-align: 1px; }
      .ar-mtype { position: absolute; bottom: 8px; inset-inline-end: 8px; font-size: 14px; z-index: 2; }
      .ar-mstream-badge { position: absolute; top: 6px; inset-inline-start: 6px; font-size: 13px; z-index: 2; }
      .ar-medit { position: absolute; bottom: 8px; inset-inline-start: 8px; z-index: 3;
        background: rgba(20,15,12,0.82); border: 1px solid ${C.borderGold}; border-radius: 6px;
        width: 28px; height: 28px; font-size: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; padding: 0; }
      .ar-madd { position: absolute; bottom: 8px; inset-inline-start: 40px; z-index: 3;
        background: rgba(20,15,12,0.82); border: 1px solid ${C.borderGold}; border-radius: 6px;
        width: 28px; height: 28px; font-size: 14px; cursor: pointer;
        display: flex; align-items: center; justify-content: center; padding: 0; }
      .ar-mevent-badge { position: absolute; top: 6px; inset-inline-start: 6px; font-size: 11px; z-index: 2;
        background: rgba(30,80,160,0.75); border-radius: 4px; padding: 1px 4px; color: #aad4ff; }
      .ar-mdel { position: absolute; top: 7px; inset-inline-end: 7px; z-index: 3;
        background: rgba(120,20,20,0.82); border: 1px solid rgba(200,60,60,0.5); border-radius: 6px;
        width: 24px; height: 24px; font-size: 12px; cursor: pointer; opacity: 0; transition: opacity .15s;
        display: flex; align-items: center; justify-content: center; padding: 0; color: #ff9999; }
      .ar-mcard:hover .ar-mdel { opacity: 1; }
      .ar-mcard:hover .ar-fb-btn { opacity: 1 !important; }
      .ar-mcap { padding: 8px 11px 10px; display: flex; flex-direction: column; gap: 3px;
        background: linear-gradient(180deg, rgba(212,175,55,0.05), transparent);
        border-top: 1px solid rgba(212,175,55,0.12); }
      .ar-mname { color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700; line-height: 1.45;
        overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
      .ar-mdate { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 10.5px; font-weight: 700; letter-spacing: .3px; }
      .hn-h2 { color: ${C.goldBright}; font-family: ${F.regal}; font-size: clamp(20px,3vw,27px); font-weight: 800; text-align: center; margin: 0 0 4px; }
      .hn-sub { color: ${C.muted}; font-family: ${F.body}; font-size: 14px; text-align: center; margin: 0 0 20px; }
      @keyframes hn-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.55; } }

      /* ── סרגל תיוג מרובה ── */
      .ar-bulkbar {
        margin-bottom: 12px; padding: 10px 14px;
        border: 1px solid ${C.borderGold}; border-radius: 12px;
        background: rgba(20,15,12,0.55);
        display: flex; flex-direction: column; gap: 6px;
      }
      .ar-bulkrow { display: flex; align-items: center; gap: 8px; flex-wrap: wrap; }
      .ar-untag { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12px; }
      .ar-untag strong { color: ${C.goldBright}; font-size: 13px; }
    `}</style>, document.head)}
    <div style={{ direction: "rtl", maxWidth: tab === "pool" ? 1440 : 1280, margin: "0 auto", padding: tab === "pool" ? "32px 28px 90px" : "48px 16px 90px", position: "relative", zIndex: 1 }}>
      <StickyAnchorAd />
      <SideRailAd />
      <div style={{ textAlign: "center", marginBottom: 22 }}>
        <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12, letterSpacing: 4, textTransform: "uppercase", marginBottom: 8 }}>הארכיון החי</div>
        <h1 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(26px,5vw,46px)", fontWeight: 700, margin: 0, textShadow: "0 0 40px rgba(212,175,55,0.3)" }}>
          🖼️ גלריית רמזי הגאולה
        </h1>
        {gals && (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14.5, marginTop: 10 }}>
            {gals.length} גלריות · {total.toLocaleString()} תמונות · כל תמונה מחוברת למספר שלה
          </div>
        )}
        <div style={{ marginTop: 14 }}>
          <button onClick={() => setTab("reality")} style={{
            display: "inline-flex", alignItems: "center", gap: 7, cursor: "pointer",
            background: "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))",
            border: `1px solid ${C.borderGold}`, color: C.goldBright, borderRadius: 999,
            fontFamily: F.heading, fontWeight: 800, fontSize: 14, padding: "9px 20px",
          }}>🌊 זרם המציאות — הממצאים הטריים ביותר ←</button>
        </div>
      </div>

      {/* טאבים */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 26, flexWrap: "wrap" }}>
        {[["reality", "🌊 זרם המציאות"], ["cascade", "👑 אוצרות הגילוי"], ["galleries", "📚 גלריות"], ["pool", "🔢 מאגר / סטים"], ...(isAdmin ? [["trial", "🧪 ניסוי"]] : [])].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "9px 20px", borderRadius: 999,
            border: `1px solid ${tab === k ? C.gold : C.border}`,
            background: tab === k ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))" : "transparent",
            color: tab === k ? C.goldBright : C.muted,
          }}>{l}</button>
        ))}
      </div>

      {/* ============ טאב זרם המציאות — הגלריה החיה והמתכווננת (מעל האוספים) ============ */}
      {tab === "reality" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", background: GALLERY_BG, borderRadius: 22, padding: "26px clamp(12px,2.5vw,28px) 30px", border: "1px solid rgba(212,175,55,0.18)" }}>
          <RealityWorld forceDark centered presetSetId={new URLSearchParams(loc.search).get("set")} />
        </div>
      )}

      {/* 🔒 נעילת גלריות — חלה על אוצרות/גלריות/מאגר בלבד; הזרם (reality) נשאר פתוח לרשומים.
          הרשמה במקום (inlineRegister) — לא מפנים לעמוד אחר; אחרי אימות ה-session נדלק וה-lock נפתח. */}
      {galBlocked && ["cascade", "galleries", "pool"].includes(tab) &&
        <MaintenanceLock message={galLock?.message} inlineRegister={galLock?.mode === "anon"} />}

      {/* ============ 👑 טאב אוצרות הגילוי — ציר-הערך, שער-המוזיאון ללא-חיתוך ============ */}
      {tab === "cascade" && !galBlocked && <CascadeCompare isAdmin={isAdmin} onEdit={isAdmin ? h => setEditImg(h) : null} />}

      {/* ============ 🧪 טאב ניסוי (אדמין) — שתי גלריות ללא-חיתוך על נתוני הזרם, לבחירה ============ */}
      {tab === "trial" && isAdmin && <TrialGalleries onEdit={h => setEditImg(h)} />}

      {/* ============ טאב גלריות (ההיסטורי) — עם רצועת גלריות-רמזים מומלצות ============ */}
      {tab === "galleries" && !galBlocked && (
      <>
        {sets.some(s => s.show_on_home) && (
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", justifyContent: "center", marginBottom: 22 }}>
            <span style={{ color: C.goldBright, fontFamily: F.heading, fontSize: 13, fontWeight: 800 }}>🌊 גלריות רמזים חיות:</span>
            {sets.filter(s => s.show_on_home).map(s => (
              <Link key={s.id} to={`/archive?tab=reality&set=${s.id}`} className="ar-pill" style={{ textDecoration: "none" }}>
                🗂️ {s.name}
              </Link>
            ))}
          </div>
        )}
        {gals === null ? (
          <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען גלריות…</div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(210px, 1fr))", gap: 16 }}>
            {gals.map(g => (
              <button key={g.id} onClick={() => setSel(g)} style={{
                position: "relative", cursor: "pointer", textAlign: "right", padding: 0, overflow: "hidden",
                border: `1px solid ${C.border}`, borderRadius: 14, background: "#000", aspectRatio: "4/3",
              }} className="arch-card">
                {g.cover && <img src={thumb(g.cover, 480)} alt={g.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.85 }} />}
                <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 35%, rgba(5,4,0,0.92))" }} />
                {g.anchor != null && (
                  <span style={{ position: "absolute", top: 8, insetInlineEnd: 8, background: "rgba(212,175,55,0.92)", color: "#1a0e00", fontFamily: F.mono, fontSize: 13, fontWeight: 800, padding: "2px 9px", borderRadius: 999 }}>{g.anchor}</span>
                )}
                <span style={{ position: "absolute", bottom: 10, insetInline: 12, color: C.goldBright, fontFamily: F.regal, fontSize: 16, fontWeight: 700, lineHeight: 1.35, display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical", overflow: "hidden" }}>
                  {g.name || "גלריה"}
                  <span style={{ display: "block", color: C.goldDim, fontFamily: F.heading, fontSize: 11, fontWeight: 700, marginTop: 3 }}>{g.count} תמונות ←</span>
                </span>
              </button>
            ))}
          </div>
        )}
      </>
      )}

      {/* ============ טאב מאגר / סטים ============ */}
      {tab === "pool" && !galBlocked && (
        <div className="ar-layout">
          <aside className="ar-side">
            {/* ── סוגי תמונות ── */}
            <div className="ar-side-title">📂 סוג תמונה</div>
            <div className="ar-type-btns">
              {[
                [null,       '🖼 הכל',        imgs.filter(x => !x.curator_hidden).length],
                ['hint',     '💡 רמזים',       imgs.filter(x => !x.curator_hidden && x.image_type === 'hint').length],
                ['gematria', '🔢 גימטריה',     imgs.filter(x => !x.curator_hidden && x.image_type === 'gematria').length],
                ['__none',   '❓ לא מסווג',    imgs.filter(x => !x.curator_hidden && x.image_type == null).length],
              ].map(([k, l, cnt]) => (
                <button key={String(k)}
                  className={`ar-type-btn${typeFilter === k ? ' active' : ''}${dragging && (k === 'hint' || k === 'gematria') && dropTarget === k ? ' drop-hover' : ''}`}
                  onClick={() => setTypeFilter(prev => prev === k ? null : k)}
                  onDragOver={isAdmin && (k === 'hint' || k === 'gematria') ? e => { e.preventDefault(); e.dataTransfer.dropEffect = 'move'; setDropTarget(k); } : undefined}
                  onDragLeave={isAdmin && (k === 'hint' || k === 'gematria') ? () => setDropTarget(null) : undefined}
                  onDrop={isAdmin && (k === 'hint' || k === 'gematria') ? e => { e.preventDefault(); dropOnType(k); } : undefined}
                >
                  <span>{l}</span>
                  <span className="ar-type-cnt">{cnt}</span>
                  {dragging && (k === 'hint' || k === 'gematria') && <span style={{fontSize:10,opacity:0.7,marginInlineStart:4}}>⬇</span>}
                </button>
              ))}
              {/* ── שכבה שנייה: אירועים (חוצה סוגים) ── */}
              <button
                className={`ar-type-btn${eventFilter ? ' active' : ''}`}
                onClick={() => setEventFilter(v => !v)}
                style={{ marginTop: 4, borderStyle: 'dashed' }}
              >
                <span>📅 עם תאריך</span>
                <span className="ar-type-cnt">{imgs.filter(x => !x.curator_hidden && x.occurred_at).length}</span>
              </button>
            </div>

            {/* ── מקור ── */}
            <div className="ar-side-title" style={{ marginTop: 16 }}>🌊 מקור</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {[
                [null,        '📦 כל המאגר',   imgs.filter(x => !x.curator_hidden).length],
                ['update',    '🌊 בזרם כרגע',  imgs.filter(x => x.source === 'update' && !x.curator_hidden).length],
                ['not-update','📁 גלריה בלבד', imgs.filter(x => x.source !== 'update' && !x.curator_hidden).length],
              ].map(([k, l, cnt]) => (
                <button key={String(k)} className={`ar-type-btn${sourceFilter === k ? ' active' : ''}`}
                  onClick={() => setSourceFilter(prev => prev === k ? null : k)}>
                  <span>{l}</span>
                  <span className="ar-type-cnt">{cnt}</span>
                </button>
              ))}
              {imgs.some(x => x.curator_hidden) && (
                <button onClick={() => setShowHidden(v => !v)}
                  style={{ marginTop: 4, cursor: "pointer", background: "none", border: "none", color: showHidden ? "#e74c3c" : "#888", fontFamily: "inherit", fontSize: 12, textAlign: "right", padding: "2px 0" }}>
                  {showHidden ? '🚫 הסתר מוסתרות' : `👁 הצג מוסתרות (${imgs.filter(x => x.curator_hidden).length})`}
                </button>
              )}
            </div>

          {/* ── מאגר סטים (מספרים) ── */}
          <div className="ar-side-title" style={{ marginTop: 16 }}>🔢 מאגר סטים</div>
          <div className="ar-row">
            {sets.map(s => (
              <span key={s.id} style={{ display: "inline-flex", alignItems: "center" }}>
                <button className={`ar-set${activeSet?.id === s.id ? " active" : ""}`} onClick={() => setActiveSet(activeSet?.id === s.id ? null : s)}
                  title={(s.description || "") + " · " + (s.numbers || []).join(", ")}>
                  {s.name} <span className="ar-set-nums">{(s.numbers || []).join("·")}</span>
                </button>
                {isAdmin && (
                  <>
                    <button className="ar-icn" title="עריכה" onClick={() => setBuilder({ id: s.id, name: s.name, numbers: new Set(s.numbers || []) })}>✎</button>
                    <button className="ar-icn" title="מחיקה" onClick={() => removeSet(s.id)}>🗑</button>
                  </>
                )}
              </span>
            ))}
            {isAdmin && <button className="ar-set ar-new" onClick={() => setBuilder({ name: "", numbers: new Set() })}>➕ סט חדש</button>}
            <button className={`ar-set${!activeSet ? " active" : ""}`} onClick={() => setActiveSet(null)}>כל הגלריות</button>
          </div>

          {/* בונה-סטים (מנהלים) */}
          {isAdmin && builder && (
            <div className="ar-builder">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <input className="ar-input" value={builder.name} placeholder="שם הסט (למשל: דוד המלך)"
                  onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))} />
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>
                  {builder.numbers.size} מספרים · {pool.length /* preview uses current filters; rough */ ? "" : ""}
                  {imgs.filter(im => hintNums(im).some(v => builder.numbers.has(v))).length} תמונות
                </span>
                <AddNumber onAdd={n => setBuilder(b => { const s = new Set(b.numbers); s.add(n); return { ...b, numbers: s }; })} />
                <div style={{ flex: 1 }} />
                <button className="ar-save" onClick={saveBuilder}>💾 שמור</button>
                <button className="ar-cancel" onClick={() => setBuilder(null)}>ביטול</button>
              </div>
              {builder.numbers.size > 0 && (
                <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
                  {[...builder.numbers].sort((a, b) => a - b).map(n => (
                    <button key={n} className="ar-pill active ar-sm" onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.delete(n); return { ...b, numbers: s }; })}>
                      {n} ✕
                    </button>
                  ))}
                </div>
              )}
              <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginBottom: 6 }}>הוסף מהמספרים הנפוצים:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {numOptions.slice(0, 30).map(({ n, k }) => (
                  <button key={n} className={`ar-pill ar-sm${builder.numbers.has(n) ? " active" : ""}`}
                    onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.has(n) ? s.delete(n) : s.add(n); return { ...b, numbers: s }; })}>
                    {n}<span className="ar-count">{k}</span>
                  </button>
                ))}
              </div>
            </div>
          )}

            {/* ── סטי תוכן (hint_sets) ── */}
            {isAdmin && (
              <div style={{ marginTop: 20 }}>
                <div className="ar-side-title">
                  📦 סטי תוכן
                  <span style={{ fontSize: 11, color: C.muted, marginRight: 6, fontWeight: 400 }} title="קבוצת רמזים שתמיד מוצגים יחד">ℹ️</span>
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
                  <button className={`ar-type-btn${!activeHintSet ? ' active' : ''}`} onClick={() => setActiveHintSet(null)}>
                    <span>🗂 ללא סט</span>
                  </button>
                  {hintSets.map(s => {
                    const visLabel = { public: '🟢', member: '🔵', premium: '🟣', admin: '🔴' }[s.visibility] || '';
                    const impLabel = s.importance >= 5 ? '🔥' : s.importance >= 3 ? '⭐' : '•';
                    return (
                      <button key={s.id}
                        className={`ar-type-btn${activeHintSet?.id === s.id ? ' active' : ''}`}
                        onClick={() => setActiveHintSet(activeHintSet?.id === s.id ? null : s)}
                        title={`חוזק: ${impLabel} · רמת גישה: ${visLabel} · ${s.summary || ''}`}>
                        <span>{s.name}</span>
                        <span style={{ fontSize: 10, color: C.muted }}>{visLabel} {impLabel}</span>
                      </button>
                    );
                  })}
                </div>
                {/* בונה סט חדש */}
                {hintSetDraft ? (
                  <div className="ar-builder" style={{ marginTop: 8 }}>
                    <input className="ar-input" value={hintSetDraft.name} placeholder="שם הסט…"
                      onChange={e => setHintSetDraft(d => ({ ...d, name: e.target.value }))} />
                    <div style={{ display: "flex", gap: 6, marginTop: 6, flexWrap: "wrap", alignItems: "center" }}>
                      <select value={hintSetDraft.visibility || 'public'}
                        onChange={e => setHintSetDraft(d => ({ ...d, visibility: e.target.value }))}
                        style={{ background: C.card, color: C.ink, border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 6px", fontSize: 12, fontFamily: F.heading }}>
                        <option value="public">🟢 ציבורי</option>
                        <option value="member">🔵 רשומים</option>
                        <option value="premium">🟣 מנויים</option>
                        <option value="admin">🔴 מנהלים</option>
                      </select>
                      <select value={hintSetDraft.importance ?? 3}
                        onChange={e => setHintSetDraft(d => ({ ...d, importance: +e.target.value }))}
                        style={{ background: C.card, color: C.ink, border: `1px solid ${C.border}`, borderRadius: 8, padding: "3px 6px", fontSize: 12, fontFamily: F.heading }}>
                        <option value={5}>🔥 חזק (5)</option>
                        <option value={4}>⭐ בינוני+ (4)</option>
                        <option value={3}>⭐ בינוני (3)</option>
                        <option value={2}>• חלש+ (2)</option>
                        <option value={1}>• חלש (1)</option>
                      </select>
                      <button className="ar-save" onClick={saveNewHintSet}>💾</button>
                      <button className="ar-cancel" onClick={() => setHintSetDraft(null)}>✕</button>
                    </div>
                  </div>
                ) : (
                  <button className="ar-set ar-new" style={{ marginTop: 6, background: "linear-gradient(135deg,rgba(212,175,55,0.22),rgba(180,140,30,0.12))", border: "1px solid rgba(212,175,55,0.55)", color: "#d4af37", fontWeight: 800 }}
                    onClick={() => setWizardOpen(true)}>
                    ✨ אשף סט / מסלול
                  </button>
                )}
                {activeHintSet && (
                  <div style={{ marginTop: 8, padding: "8px 10px", background: "rgba(212,175,55,0.08)", border: "1px solid rgba(212,175,55,0.25)", borderRadius: 10, fontSize: 12, color: C.goldDim, fontFamily: F.heading }}>
                    📦 מצב עריכה: <strong style={{ color: C.goldBright }}>{activeHintSet.name}</strong>
                    <br /><span style={{ color: C.muted }}>לחץ 📦 על תמונה כדי להוסיף לסט</span>
                  </div>
                )}
              </div>
            )}

            {/* ── חיפוש + פילטרים נוספים ── */}
            <div style={{ marginTop: 16 }}>
              <div className="ar-search">
                <span aria-hidden>🔎</span>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש לפי מספר (למשל 1237) או טקסט בתיאור…" aria-label="חיפוש" />
                {query && <button className="ar-x" onClick={() => setQuery("")}>×</button>}
              </div>
              <button className={`ar-pill${filtersOpen ? " active" : ""}`} onClick={() => setFiltersOpen(o => !o)} title="סינון מתקדם">
                🎚️ סינון {filtersOpen ? "▲" : "▾"}
              </button>
            </div>

            {filtersOpen && (
              <>
                <div className="ar-row">
                  <div className="ar-seg" role="group" aria-label="תצוגה">
                    <button className={`ar-pill${viewMode === "galleries" ? " active" : ""}`} onClick={() => setViewMode("galleries")} title="רשימת גלריות">🗂 גלריות</button>
                    <button className={`ar-pill${viewMode === "images" ? " active" : ""}`} onClick={() => setViewMode("images")} title="כל התמונות">🖼 תמונות</button>
                  </div>
                  {viewMode === "images" && (
                    <div className="ar-seg" role="group" aria-label="מיון">
                      <button className={`ar-pill${sortMode === "gallery" ? " active" : ""}`} onClick={() => setSortMode("gallery")} title="כסדר התוסף — גלריה חדשה למעלה">לפי גלריה</button>
                      <button className={`ar-pill${sortMode === "date" ? " active" : ""}`} onClick={() => setSortMode("date")} title="לפי תאריך האירוע">לפי תאריך</button>
                      <button className={`ar-pill${sortMode === "recent" ? " active" : ""}`} onClick={() => setSortMode("recent")} title="לפי תאריך העלאה — הועלו לאחרונה ראשון">🆕 הועלו לאחרונה</button>
                      <button className={`ar-pill${sortMode === "cross" ? " active" : ""}`} onClick={() => setSortMode("cross")} title="הכי הרבה הצטלבויות מספרים">⚡ הצטלבויות</button>
                    </div>
                  )}
                </div>
                {numOptions.length > 0 && (
                  <>
                    {/* "מספרים חזקים" — top-10 לפי שכיחות, הצעות מהירות */}
                    <div className="ar-row">
                      <span className="ar-label">⚡ נפוצים</span>
                      {hotNums.map(({ n }) => (
                        <button key={n} className={`ar-pill ar-sm${numFilters.has(n) ? " active" : ""}`} onClick={() => toggleNum(n)} title="הוסף לסינון">
                          {n}
                        </button>
                      ))}
                    </div>
                    {/* כל המספרים */}
                    <div className="ar-row">
                      <span className="ar-label">🔢 מספר</span>
                      {shownNums.map(({ n, k }) => (
                        <button key={n} className={`ar-pill ar-sm${numFilters.has(n) ? " active" : ""}`} onClick={() => toggleNum(n)}>
                          {n}<span className="ar-count">{k}</span>
                        </button>
                      ))}
                      {numOptions.length > 16 && <button className="ar-pill ar-more" onClick={() => setShowAllNums(v => !v)}>{showAllNums ? "פחות ▲" : "עוד ▾"}</button>}
                    </div>
                    {/* AND / OR + דומיננטי — מופיע כשנבחרו מספרים */}
                    {numFilters.size > 0 && (
                      <div className="ar-row">
                        <span className="ar-label">🔗 סינון</span>
                        <button className={`ar-pill ar-sm${filterMode === "OR" ? " active" : ""}`} onClick={() => setFilterMode("OR")} title="תמונה עם לפחות אחד מהמספרים">OR — אחד מהם</button>
                        <button className={`ar-pill ar-sm${filterMode === "AND" ? " active" : ""}`} onClick={() => setFilterMode("AND")} title="תמונה עם כל המספרים יחד">AND — כולם</button>
                        <button className={`ar-pill ar-sm${dominantOnly ? " active" : ""}`} onClick={() => setDominantOnly(v => !v)} title="רק תמונות שמספר זה הוא הדומיננטי שלהן">דומיננטי בלבד</button>
                      </div>
                    )}
                  </>
                )}
                {yearOptions.length > 0 && (
                  <div className="ar-row">
                    <span className="ar-label">🗓️ שנה</span>
                    {yearOptions.map(y => (
                      <button key={y} className={`ar-pill ar-sm${yearFilter === y ? " active" : ""}`} onClick={() => setYearFilter(p => p === y ? null : y)}>{y}</button>
                    ))}
                  </div>
                )}
              </>
            )}
            {hasFilter && (
              <div className="ar-row" style={{ paddingTop: 4, borderTop: `1px solid ${C.faint}` }}>
                {activeSet && <span className="ar-chip">סט: {activeSet.name}<button onClick={() => setActiveSet(null)}>×</button></span>}
                {[...numFilters].map(n => (
                  <span key={n} className="ar-chip">
                    {n}<button onClick={() => toggleNum(n)}>×</button>
                  </span>
                ))}
                {numFilters.size >= 2 && (
                  <button className="ar-pill ar-sm" style={{ padding: "3px 10px" }} onClick={() => setFilterMode(m => m === "AND" ? "OR" : "AND")} title="החלף AND/OR">
                    {filterMode}
                  </button>
                )}
                {dominantOnly && <span className="ar-chip">דומיננטי<button onClick={() => setDominantOnly(false)}>×</button></span>}
                {yearFilter != null && <span className="ar-chip">שנה: {yearFilter}<button onClick={() => setYearFilter(null)}>×</button></span>}
                {q && <span className="ar-chip">חיפוש: {query}<button onClick={() => setQuery("")}>×</button></span>}
                <button className="ar-clear" onClick={() => { setActiveSet(null); setNumFilters(new Set()); setFilterMode("OR"); setDominantOnly(false); setYearFilter(null); setQuery(""); }}>נקה הכל ×</button>
              </div>
            )}

          </aside>

          <div className="ar-feed">
          {/* גשר לציר האירועים — רק בתצוגת תמונות, לא בגלריות (כדי לא ליצור "חור שחור" מעל הרשימה) */}
          {viewMode === "images" && bridgeEvents.length > 0 && (
            <div className="ar-bridge">
              <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 700 }}>🌅 אירועים מהציר עם המספרים האלה:</span>
              {bridgeEvents.map(t => (
                <Link key={t.id} to="/timeline" className="ar-evt">{t.title} · {t.year}</Link>
              ))}
            </div>
          )}

          {/* סרגל סידור ידני (מנהל, כשסט פעיל) — רק בתצוגת תמונות */}
          {viewMode === "images" && activeSet && isAdmin && (
            <div className="ar-curatebar">
              {!curating ? (
                <button className="ar-pill" onClick={startCurate}>✋ סדר/הבלט ידנית</button>
              ) : (
                <>
                  <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12.5 }}>
                    לחץ תמונה כדי להבליט/להסיר · סדר עם «מוקדם/מאוחר» · {draftOrder.length} מובלטות
                  </span>
                  <div style={{ flex: 1 }} />
                  <button className="ar-save" onClick={saveOrder}>💾 שמור סדר</button>
                  <button className="ar-cancel" onClick={() => setCurating(false)}>ביטול</button>
                </>
              )}
            </div>
          )}

          <div className="ar-status">
            {viewMode === "galleries"
              ? `${memberGals.length} גלריות${activeSet ? ` בסט «${activeSet.name}»` : ""} · החדשה למעלה`
              : curated
                ? `${highlighted.length} מובלטות · ${rest.length.toLocaleString()} בשבילים`
                : `${pool.length.toLocaleString()} תמונות${hasFilter ? " (מסוננות)" : ""} · ${sortMode === "gallery" ? "לפי סדר הגלריות (התוסף)" : sortMode === "recent" ? "🆕 לפי תאריך העלאה" : "מהחדש לישן"}`}
          </div>

          {viewMode === "galleries" ? (
            gals === null ? (
              <div className="ar-empty">טוען גלריות…</div>
            ) : memberGals.length === 0 ? (
              <div className="ar-empty">אין גלריות תואמות בסט הזה.</div>
            ) : (
              <div style={{ display: "grid", gap: 14 }}>
                {memberGals.map(g => {
                  const open = openGal === g.id;
                  const gimgs = open
                    ? imgs.filter(im => im.gallery_id === g.id).sort((a, b) => {
                        const da = eventDate(a), db = eventDate(b);
                        if (da && db) return db - da; if (db) return 1; if (da) return -1;
                        return (a.ordering ?? 0) - (b.ordering ?? 0);
                      })
                    : [];
                  return (
                    <div key={g.id} className="ar-acc">
                      <button className="ar-acc-head" onClick={() => setOpenGal(open ? null : g.id)}>
                        <span className="ar-acc-thumb" style={{ background: g.cover ? `center/cover no-repeat url(${g.cover})` : `linear-gradient(135deg, ${C.goldDeep}, ${C.faint})` }}>
                          {g.anchor != null && <span className="ar-anchor">{g.anchor}</span>}
                        </span>
                        <span className="ar-acc-name">{g.name || "גלריה"}<span className="ar-acc-sub">{g.count} תמונות</span></span>
                        <span className="ar-acc-arrow">{open ? "▲" : "▼"}</span>
                      </button>
                      {open && (
                        <div className="ar-acc-body">
                          {gimgs.map((im, imIdx) => {
                            const xs = setNums ? hintNums(im).filter(v => setNums.has(v)) : [];
                            return (
                            <figure key={im.id} className="ar-feed-img">
                              {(eventLabel(im) || xs.length >= 2) && (
                                <div className="ar-feed-date">
                                  {eventLabel(im) && <span>🗓️ {eventLabel(im)}</span>}
                                  {xs.length >= 2 && <span className="ar-cross" title={`הצטלבות חזקה: ${xs.join(" ∩ ")}`}>⚡ הצטלבות חזקה · {xs.join("∩")}</span>}
                                </div>
                              )}
                              <button
                                onClick={() => { setLbImages(gimgs); setLbStart(imIdx); }}
                                style={{ display: "block", width: "100%", background: "none", border: "none", padding: 0, cursor: "zoom-in" }}
                              >
                                <img src={galThumb(im, 520)} alt={im.name || ""} loading="lazy" style={{ display: "block" }} />
                              </button>
                              {(im.name || im.description || (im.all_values || []).length > 0) && (
                                <figcaption className="ar-feed-cap">
                                  {im.name && <div className="ar-feed-name">{im.name}</div>}
                                  {im.description && <div className="ar-feed-desc">{stripHtml(im.description)}</div>}
                                  <div className="ar-feed-nums">
                                    {(im.all_values || []).slice(0, 8).map((v, i) => (
                                      <Link key={i} to={`/number/${v}`} className={`ar-feed-num${v === im.primary_value ? " primary" : ""}`}>{v}</Link>
                                    ))}
                                  </div>
                                </figcaption>
                              )}
                            </figure>
                            );
                          })}
                          {gimgs.length === 0 && <div className="ar-empty">אין תמונות בגלריה זו.</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )
          ) : pool.length === 0 ? (
            <div className="ar-empty">לא נמצאו תמונות תואמות.</div>
          ) : curated ? (
            <>
              {highlighted.length > 0 && (
                <>
                  <div className="ar-subhead">⭐ מובלטים — ציר ידני</div>
                  <div className="ar-grid">
                    {highlighted.map((im, idx) => (
                      <div key={im.id} className="ar-imgwrap">
                        <button onClick={() => curating ? toggleHi(im.id) : (setLbImages([...highlighted, ...rest]), setLbStart(idx))} className={`arch-card ar-imgcard${curating ? " ar-on" : ""}`}>
                          <img src={galThumb(im, 520)} alt={im.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                          <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(5,4,0,0.85))" }} />
                          <span className="ar-pos">{idx + 1}</span>
                          {im.primary_value != null && <span className="ar-anchor">{im.primary_value}</span>}
                          {eventLabel(im) && <span className="ar-imgdate">{eventLabel(im)}</span>}
                        </button>
                        {curating && (
                          <div className="ar-movebar">
                            <button onClick={() => moveHi(im.id, -1)} title="מוקדם יותר">מוקדם</button>
                            <button onClick={() => toggleHi(im.id)} title="הסר">✕</button>
                            <button onClick={() => moveHi(im.id, +1)} title="מאוחר יותר">מאוחר</button>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </>
              )}
              <div className="ar-subhead">{curating ? "↓ לחץ תמונה כדי להבליט" : "שבילים — שאר התמונות"}</div>
              <div className="ar-grid">
                {rest.slice(0, limit).map((im, idx) => (
                  <button key={im.id} onClick={() => curating ? toggleHi(im.id) : (setLbImages([...highlighted, ...rest]), setLbStart(highlighted.length + idx))} className="arch-card ar-imgcard">
                    <img src={galThumb(im, 520)} alt={im.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(5,4,0,0.85))" }} />
                    {im.primary_value != null && <span className="ar-anchor">{im.primary_value}</span>}
                    {eventLabel(im) && <span className="ar-imgdate">{eventLabel(im)}</span>}
                  </button>
                ))}
              </div>
              {rest.length > limit && (
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <button className="ar-loadmore" onClick={() => setLimit(l => l + PER)}>טען עוד · נותרו {(rest.length - limit).toLocaleString()}</button>
                </div>
              )}
            </>
          ) : masonryView ? (
            <>
              {/* ── סרגל תיוג מרובה (מנהל) ── */}
              {isAdmin && (
                <div className="ar-bulkbar">
                  <div className="ar-bulkrow">
                    <button
                      className={`ar-pill ar-sm${multiSelect ? ' active' : ''}`}
                      onClick={() => { setMultiSelect(m => !m); if (multiSelect) { setSelectedIds(new Set()); setBulkType(null); } }}
                    >✓ בחירה מרובה</button>
                    {multiSelect && (
                      <>
                        <button className="ar-pill ar-sm" onClick={() => setSelectedIds(new Set(pool.map(im => im.id)))} title="בוחר את כל התמונות המסוננות (כל השנה/המספר)">
                          בחר הכל המסונן ({pool.length.toLocaleString()})
                        </button>
                        {selectedIds.size > 0 && (
                          <button className="ar-pill ar-sm" onClick={() => setSelectedIds(new Set())}>בטל הכל</button>
                        )}
                        {selectedIds.size > 0 && (
                          <span className="ar-label" style={{ color: C.gold, fontWeight: 700 }}>{selectedIds.size} נבחרו</span>
                        )}
                        {selectedIds.size > 0 && (
                          <button className="ar-save ar-sm" style={{ padding: "5px 14px" }} onClick={createSetFromSelection}>🎯 צור סט מהנבחרים</button>
                        )}
                      </>
                    )}
                    <span style={{ flex: 1 }} />
                    <span className="ar-untag">⬜ <strong>{imgs.filter(im => !im.image_type).length}</strong> ללא תיוג</span>
                  </div>
                  {multiSelect && selectedIds.size > 0 && (
                    <div className="ar-bulkrow">
                      <span className="ar-label">תייג כ:</span>
                      {[['hint','💡 רמז'],['gematria','🔢 גימטריה'],['trail','📖 מסלול'],['event','📰 אירוע'],['gallery','🗂 גלריה']].map(([k, l]) => (
                        <button key={k} className={`ar-pill ar-sm${bulkType===k?' active':''}`}
                          onClick={() => setBulkType(b => b===k ? null : k)}>{l}</button>
                      ))}
                      {bulkType && (
                        <button className="ar-save" style={{ padding: "6px 18px" }} onClick={bulkTagSelected}>
                          💾 שמור ל-{selectedIds.size} תמונות
                        </button>
                      )}
                      <button className="ar-cancel" style={{ padding: "5px 12px" }}
                        onClick={() => { setBulkType(null); setSelectedIds(new Set()); }}>ביטול</button>
                    </div>
                  )}
                </div>
              )}
              <TimelineScrubber data={yearData} active={yearFilter} onPick={setYearFilter}
                topNums={yearFilter != null ? yearTopNums.get(yearFilter) : null}
                allTopNums={allTopNums}
                numFilters={numFilters} onToggleNums={toggleNums} />
              <div className="ar-live-count">
                <span>📊 מציג <b>{pool.length.toLocaleString("he")}</b> תמונות</span>
                {(yearFilter != null || numFilters.size > 0 || activeSet || q) && (
                  <>
                    <span className="ar-lc-sep">· מסונן:</span>
                    {activeSet && <span className="ar-lc-chip">סט: {activeSet.name}</span>}
                    {yearFilter != null && <span className="ar-lc-chip">שנה {yearFilter}</span>}
                    {[...numFilters].map(n => <span key={n} className="ar-lc-chip">{n}</span>)}
                    {q && <span className="ar-lc-chip">"{q}"</span>}
                    <button className="ar-lc-clear" onClick={() => { setYearFilter(null); setNumFilters(new Set()); setActiveSet(null); setQuery(""); }}>נקה הכל ✕</button>
                  </>
                )}
              </div>
              <div className="ar-masonry">
                {pool.slice(0, limit).map((im, idx) => {
                  const isSel = selectedIds.has(im.id);
                  const TYPE_EMOJI = { hint: '💡', gematria: '🔢', trail: '📖', event: '📰', gallery: '🗂' };
                  return (
                    <div key={im.id}
                      id={`pool-${im.id}`}
                      className={`ar-mcard${isSel ? ' ar-msel' : ''}${dragging && dragIdsRef.current.has(im.id) ? ' ar-dragging' : ''}`}
                      draggable={isAdmin}
                      onDragStart={isAdmin ? e => handleDragStart(e, im) : undefined}
                      onDragEnd={isAdmin ? handleDragEnd : undefined}
                    >
                      <div className="ar-mwrap"
                        onClick={() => multiSelect
                          ? toggleSelect(im.id)
                          : (setLbImages(pool), setLbStart(idx))
                        }
                      >
                        <img src={galThumb(im, 520)} alt={im.name || ''} loading="lazy"
                          onError={e => { e.target.style.display = 'none'; }} />
                        <div className="ar-mshade" />
                        {multiSelect && <div className={`ar-mchk${isSel ? ' on' : ''}`}>{isSel ? '✓' : ''}</div>}
                        {im.primary_value != null && !multiSelect && (
                          <Link to={`/number/${im.primary_value}`} className="ar-mnum" onClick={e => e.stopPropagation()}>{im.primary_value}</Link>
                        )}
                        {im.image_type && <span className="ar-mtype">{TYPE_EMOJI[im.image_type] || ''}</span>}
                        {im.source === 'update' && <span className="ar-mstream-badge">🌊</span>}
                        {im.occurred_at && im.source !== 'update' && <span className="ar-mevent-badge">📅</span>}
                        {isAdmin && !multiSelect && (
                          <button className="ar-medit" onClick={e => { e.stopPropagation(); setEditImg(im); }} title="ערוך">✏️</button>
                        )}
                        {isAdmin && !multiSelect && im.source !== 'update' && (
                          <button className="ar-madd" onClick={e => { e.stopPropagation(); addToStream(im); }} title="הכנס לזרם">🌊</button>
                        )}
                        {isAdmin && !multiSelect && activeHintSet && (
                          <button
                            onClick={e => { e.stopPropagation(); addToHintSet(im); }}
                            title={`הוסף לסט: ${activeHintSet.name}`}
                            style={{ position: "absolute", bottom: 9, insetInlineStart: 38, zIndex: 3, background: "rgba(212,175,55,0.88)", color: "#1a0e00",
                              border: "none", borderRadius: 999, width: 26, height: 26, fontSize: 13, cursor: "pointer",
                              display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 800 }}>
                            📦
                          </button>
                        )}
                        {isAdmin && !multiSelect && (
                          <ShareToFacebookBtn
                            type="image"
                            id={im.id}
                            style={{ position: "absolute", bottom: 7, insetInlineEnd: 7, zIndex: 3, opacity: 0 }}
                            className="ar-fb-btn"
                          />
                        )}
                        {isAdmin && !multiSelect && im.source !== 'update' && (
                          <button className="ar-mdel" onClick={e => { e.stopPropagation(); deleteImage(im); }} title="מחק לצמיתות">🗑</button>
                        )}
                      </div>
                      {(im.name || eventLabel(im)) && (
                        <div className="ar-mcap">
                          {im.name && <div className="ar-mname">{im.name}</div>}
                          {eventLabel(im) && <div className="ar-mdate">📅 {eventLabel(im)}</div>}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
              {pool.length > limit && (
                <div style={{ textAlign: 'center', marginTop: 30 }}>
                  <button className="ar-loadmore" onClick={() => setLimit(l => l + PER)}>
                    טען עוד · נותרו {(pool.length - limit).toLocaleString()}
                  </button>
                </div>
              )}
            </>
          ) : (
            <RealityStream hints={pool} palette={PALETTES.dark} onAddToStream={isAdmin ? addToStream : null} onEdit={isAdmin ? h => setEditImg(h) : null} />
          )}
          </div>
        </div>
      )}

      {/* מודאל גלריה (טאב גלריות) — Portal ל-body + z גבוה כדי לכסות את הניווט הגלובלי
          (היה z:200 inline → נלכד מתחת ל-Navbar sticky z:100, וה-× והכותרת הוסתרו). */}
      {sel && createPortal((
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 2147483500, background: "rgba(3,2,8,0.94)", overflowY: "auto", padding: "70px 16px 40px" }}>
          {/* × קבוע — תמיד נגיש (גם בגלילה ובמובייל), מעל הניווט הגלובלי */}
          <button onClick={(e) => { e.stopPropagation(); setSel(null); }} aria-label="סגור גלריה"
            style={{ position: "fixed", top: "max(12px, env(safe-area-inset-top))", insetInlineStart: "max(12px, env(safe-area-inset-left))",
              zIndex: 2147483600, width: 52, height: 52, borderRadius: "50%", border: "2px solid rgba(232,200,74,0.65)",
              background: "rgba(8,5,2,0.82)", color: "#f6e27a", fontSize: 28, lineHeight: 1, cursor: "pointer",
              display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)",
              boxShadow: "0 4px 18px rgba(0,0,0,0.6)" }}>×</button>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, margin: "0 auto", direction: "rtl" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 18, position: "sticky", top: 0, background: "rgba(3,2,8,0.85)", backdropFilter: "blur(8px)", padding: "6px 0" }}>
              <h2 style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(20px,3vw,28px)", fontWeight: 700, margin: 0, flex: 1 }}>
                {sel.anchor != null && <span style={{ color: C.gold, fontFamily: F.mono }}>{sel.anchor} · </span>}{sel.name}
              </h2>
              <button onClick={() => setSel(null)} style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 22, cursor: "pointer", borderRadius: 8, width: 40, height: 40, lineHeight: 1 }}>×</button>
            </div>
            {loadingDetail ? (
              <div style={{ textAlign: "center", color: C.muted, padding: 30 }}>טוען…</div>
            ) : (
              <div style={{ display: "grid", gap: 26 }}>
                {(detail || []).map(im => (
                  <div key={im.id} style={{ background: "linear-gradient(165deg, rgba(28,20,11,0.78), rgba(10,6,2,0.7))", border: `1px solid rgba(212,175,55,0.26)`, borderRadius: 16, overflow: "hidden", boxShadow: "0 6px 22px rgba(0,0,0,0.45)" }}>
                    {imgDate(im.occurred_at) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderBottom: `1px solid rgba(212,175,55,0.14)`, color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }}>
                        <span aria-hidden>🗓️</span>{imgDate(im.occurred_at)}
                      </div>
                    )}
                    {/* לחיצה על תמונת הגלריה → לייטבוקס מועשר (עם כל המספרים/תיאור/תגיות) */}
                    <button onClick={() => { const i = (detail || []).findIndex(x => x.id === im.id); setLbImages(detail || []); setLbStart(Math.max(0, i)); }}
                      style={{ display: "block", width: "100%", padding: 0, border: "none", background: "transparent", cursor: "zoom-in" }}
                      title="הגדל — עם כל ההקשרים">
                      <img src={galThumb(im, 640)} alt={im.name || ""} loading="lazy" style={{ width: "100%", display: "block" }} />
                    </button>
                    <ImageMeta im={im} isAdmin={isAdmin} onEdit={() => setEditImg(im)} onJump={() => jumpToPool(im)} onDelete={() => deleteImage(im)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ), document.body)}

      {/* לייטבוקס תמונה (טאב מאגר) */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onSave={handleSave}
          onClose={() => setEditImg(null)}
          onDelete={id => { setImgs(prev => prev.filter(x => x.id !== id)); setEditImg(null); }}
          onRemoveFromStream={editImg.source === "update" ? handleRemoveFromStream : null}
        />
      )}

      {lbImages && (
        <Lightbox
          images={lbImages}
          initialIndex={lbStart}
          onClose={() => setLbImages(null)}
          onEdit={isAdmin ? h => { setLbImages(null); setEditImg(h); } : null}
        />
      )}

      {wizardOpen && isAdmin && (
        <HintSetWizard
          imgs={imgs}
          onClose={() => setWizardOpen(false)}
          onSaved={async () => { await reloadHintSets(); setWizardOpen(false); }}
        />
      )}

      <style>{`
        .hn-h2 { color: ${C.goldBright}; font-family: ${F.regal}; font-size: clamp(20px,3vw,27px); font-weight: 800; text-align: center; margin: 0 0 4px; }
        .hn-sub { color: ${C.muted}; font-family: ${F.body}; font-size: 14px; text-align: center; margin: 0 0 20px; }
        @keyframes hn-pulse { 0%,100%{ opacity:1; } 50%{ opacity:.55; } }
        .arch-card:hover { border-color: ${C.gold} !important; box-shadow: 0 12px 36px rgba(0,0,0,0.5), 0 0 22px rgba(212,175,55,0.18); }
        .ar-row { display: flex; flex-wrap: wrap; align-items: center; gap: 8px; }
        .ar-panel { max-width: 980px; margin: 0 auto 18px; padding: 14px 16px 11px; border: 1px solid ${C.borderGold}; border-radius: 16px;
          background: linear-gradient(165deg, rgba(20,15,12,0.72), rgba(8,5,2,0.55)); display: flex; flex-direction: column; gap: 10px; }
        .ar-label { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12.5px; }
        .ar-search { display: flex; align-items: center; gap: 7px; flex: 1; min-width: 180px; background: rgba(8,5,2,0.6); border: 1px solid ${C.border}; border-radius: 999px; padding: 5px 13px; }
        .ar-search input { flex: 1; min-width: 0; background: none; border: none; outline: none; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; padding: 5px 2px; }
        .ar-x { background: none; border: none; color: ${C.muted}; font-size: 20px; cursor: pointer; }
        .ar-pill { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.border}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; padding: 6px 13px; border-radius: 999px; }
        .ar-pill:hover { border-color: ${C.gold}; }
        .ar-pill.active { background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color: #1a0e00; border-color: ${C.gold}; }
        .ar-sm { font-family: ${F.mono}; font-size: 12.5px; padding: 5px 11px; }
        .ar-more { background: transparent; border-style: dashed; color: ${C.goldDim}; }
        .ar-count { margin-inline-start: 6px; padding: 1px 6px; border-radius: 999px; background: rgba(8,5,2,0.5); color: ${C.goldDim}; font-size: 11px; }
        .ar-pill.active .ar-count { background: rgba(0,0,0,0.22); color: #1a0e00; }
        .ar-set { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.borderGold}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 14px; font-weight: 700; padding: 8px 16px; border-radius: 999px; }
        .ar-set.active { background: linear-gradient(135deg, ${C.crimson}, ${C.crimsonLight}); color: ${C.goldBright}; border-color: ${C.gold}; }
        .ar-set-nums { font-family: ${F.mono}; font-size: 11px; opacity: 0.8; margin-inline-start: 4px; }
        .ar-new { border-style: dashed; color: ${C.goldDim}; }
        .ar-icn { background: none; border: none; cursor: pointer; color: ${C.goldDim}; font-size: 13px; padding: 2px 4px; }
        .ar-icn:hover { color: ${C.goldBright}; }
        .ar-builder { max-width: 980px; margin: 0 auto 16px; padding: 16px; border: 1px dashed ${C.borderGold}; border-radius: 14px; background: rgba(8,5,2,0.4); }
        .ar-input { background: rgba(8,5,2,0.6); border: 1px solid ${C.border}; border-radius: 8px; color: ${C.goldLight}; font-family: ${F.body}; font-size: 15px; padding: 8px 12px; }
        .ar-save { background: ${C.gold}; color: #1a0e00; border: none; border-radius: 999px; padding: 8px 18px; font-family: ${F.heading}; font-weight: 800; cursor: pointer; }
        .ar-cancel { background: none; border: 1px solid ${C.border}; color: ${C.muted}; border-radius: 999px; padding: 8px 16px; cursor: pointer; font-family: ${F.heading}; }
        .ar-chip { display: inline-flex; align-items: center; gap: 6px; background: rgba(212,175,55,0.12); border: 1px solid ${C.borderGold}; border-radius: 999px; padding: 4px 6px 4px 12px; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12px; }
        .ar-chip button { background: none; border: none; color: ${C.goldDim}; cursor: pointer; font-size: 16px; }
        .ar-clear { background: none; border: 1px solid ${C.crimsonLight}; color: #d98a92; border-radius: 999px; padding: 5px 14px; cursor: pointer; font-family: ${F.heading}; font-size: 12px; }
        .ar-bridge { max-width: 980px; margin: 0 auto 16px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 12px 16px;
          border: 1px solid ${C.borderGold}; border-radius: 14px; background: linear-gradient(120deg, rgba(122,19,32,0.22), rgba(61,31,92,0.18)); }
        .ar-evt { color: ${C.goldLight}; text-decoration: none; font-family: ${F.heading}; font-size: 13px; background: rgba(8,5,2,0.5); border: 1px solid ${C.border}; border-radius: 999px; padding: 5px 13px; }
        .ar-evt:hover { border-color: ${C.gold}; color: ${C.goldBright}; }
        .ar-status { text-align: center; color: ${C.muted}; font-family: ${F.heading}; font-size: 13px; margin: 4px 0 18px; }
        .ar-empty { text-align: center; color: ${C.muted}; font-family: ${F.body}; padding: 50px 20px; font-size: 15px; }
        .ar-grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(150px, 1fr)); gap: 10px; }
        @media (max-width: 600px) { .ar-grid { grid-template-columns: repeat(3, 1fr); gap: 7px; } }
        .ar-imgcard { position: relative; cursor: pointer; padding: 0; overflow: hidden; border: 1px solid ${C.border}; border-radius: 12px; background: #000; aspect-ratio: 1/1; display: block; }
        .ar-anchor { position: absolute; top: 7px; inset-inline-end: 7px; background: rgba(212,175,55,0.92); color: #1a0e00; font-family: ${F.mono}; font-size: 12px; font-weight: 800; padding: 2px 8px; border-radius: 999px; }
        .ar-imgdate { position: absolute; bottom: 6px; inset-inline-start: 7px; color: ${C.goldBright}; font-family: ${F.heading}; font-size: 10px; font-weight: 700; background: rgba(5,4,0,0.6); border-radius: 6px; padding: 2px 6px; }
        .ar-loadmore { cursor: pointer; background: linear-gradient(135deg, rgba(212,175,55,0.16), rgba(8,5,2,0.4)); border: 1px solid ${C.borderGold}; border-radius: 999px; color: ${C.goldBright}; font-family: ${F.heading}; font-weight: 700; font-size: 15px; padding: 12px 36px; }
        /* שורת גלריה רחבה (תצוגת גלריות בסט) */
        .ar-galrow { display: flex; align-items: center; gap: 16px; width: 100%; text-align: right; cursor: pointer; padding: 0; overflow: hidden;
          border: 1px solid ${C.border}; border-radius: 14px; background: linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45)); transition: border-color .18s, transform .12s, box-shadow .18s; }
        .ar-galrow:hover { border-color: ${C.gold}; transform: translateY(-2px); box-shadow: 0 12px 32px rgba(0,0,0,0.5), 0 0 20px rgba(212,175,55,0.16); }
        .ar-galrow-thumb { position: relative; width: 130px; height: 90px; flex-shrink: 0; }
        .ar-galrow-body { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 5px; padding: 10px 0; }
        .ar-galrow-name { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 18px; font-weight: 700; line-height: 1.3; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
        .ar-galrow-sub { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12.5px; }
        .ar-galrow-go { color: ${C.goldLight}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; padding-inline: 16px; white-space: nowrap; }
        @media (max-width: 520px) { .ar-galrow-thumb { width: 92px; height: 70px; } .ar-galrow-name { font-size: 15px; } }

        /* פריסת מאגר: אזור ראשי (ימין) + סרגל צד (שמאל) */
        .ar-layout { display: grid; grid-template-columns: 1fr 330px; gap: 22px; align-items: start; }
        .ar-feed { grid-column: 1; min-width: 0; }
        .ar-side { grid-column: 2; position: sticky; top: 74px; align-self: start; max-height: calc(100vh - 88px); overflow-y: auto;
          display: flex; flex-direction: column; gap: 12px; padding: 4px; }
        .ar-side .ar-row { justify-content: flex-start; }
        @media (max-width: 900px) {
          .ar-layout { grid-template-columns: 1fr; }
          /* בנייד: הגלריה/תמונות קודם, הפאנל/סינון מתחת */
          .ar-feed { grid-column: 1; grid-row: 1; }
          .ar-side { grid-column: 1; grid-row: 2; position: static; max-height: none; }
        }
        /* אקורדיון גלריות */
        .ar-acc { border: 1px solid ${C.border}; border-radius: 14px; overflow: hidden; background: linear-gradient(160deg, rgba(20,15,12,0.55), rgba(8,5,2,0.45)); }
        .ar-acc-head { display: flex; align-items: center; gap: 14px; width: 100%; cursor: pointer; text-align: right; background: none; border: none; padding: 10px 14px; }
        .ar-acc-head:hover { background: rgba(212,175,55,0.06); }
        .ar-acc-thumb { position: relative; width: 88px; height: 62px; border-radius: 8px; flex-shrink: 0; }
        .ar-acc-name { flex: 1; min-width: 0; color: ${C.goldBright}; font-family: ${F.regal}; font-size: 17px; font-weight: 700; display: flex; flex-direction: column; gap: 2px; overflow: hidden; }
        .ar-acc-name { white-space: nowrap; text-overflow: ellipsis; }
        .ar-acc-sub { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12px; font-weight: 700; }
        .ar-acc-arrow { color: ${C.goldDim}; font-size: 12px; }
        .ar-acc-body { display: grid; gap: 24px; padding: 10px 16px 20px; border-top: 1px solid ${C.faint}; }
        .ar-feed-img { margin: 0; }
        .ar-feed-date { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 13px; font-weight: 700; margin-bottom: 6px; }
        .ar-feed-img img { display: block; max-width: 100%; max-height: 72vh; width: auto; margin: 0 auto; border-radius: 12px; border: 1px solid ${C.border}; }
        .ar-feed-cap { padding-top: 10px; }
        .ar-feed-name { color: ${C.goldLight}; font-family: ${F.regal}; font-size: 16px; font-weight: 700; margin-bottom: 4px; }
        .ar-feed-desc { color: ${C.muted}; font-family: ${F.body}; font-size: 14px; line-height: 1.85; white-space: pre-wrap; }
        .ar-feed-nums { display: flex; gap: 6px; flex-wrap: wrap; margin-top: 8px; }
        .ar-feed-num { text-decoration: none; font-family: ${F.mono}; font-size: 12px; font-weight: 700; padding: 2px 10px; border-radius: 999px; border: 1px solid ${C.borderGold}; color: ${C.goldLight}; background: rgba(8,5,2,0.5); }
        .ar-feed-num.primary { background: ${C.gold}; color: #1a0e00; }
        .ar-side-title { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 18px; font-weight: 700; padding: 2px 4px; }
        .ar-feed-date { display: flex; align-items: center; gap: 10px; flex-wrap: wrap; }
        .ar-cross { background: linear-gradient(135deg, rgba(122,19,32,0.55), rgba(212,175,55,0.3)); border: 1px solid ${C.borderGold};
          border-radius: 999px; padding: 2px 11px; color: ${C.goldBright}; font-family: ${F.heading}; font-size: 11px; font-weight: 800; }
        .ar-curatebar { max-width: 980px; margin: 0 auto 14px; display: flex; flex-wrap: wrap; align-items: center; gap: 10px; padding: 10px 14px; border: 1px dashed ${C.borderGold}; border-radius: 12px; background: rgba(8,5,2,0.4); }
        .ar-subhead { color: ${C.goldDim}; font-family: ${F.heading}; font-size: 12px; letter-spacing: 2; text-transform: uppercase; margin: 18px 0 10px; }
        .ar-imgwrap { display: flex; flex-direction: column; gap: 4px; }
        .ar-imgcard.ar-on { outline: 2px solid ${C.gold}; outline-offset: -2px; }
        .ar-pos { position: absolute; top: 7px; inset-inline-start: 7px; background: ${C.gold}; color: #1a0e00; font-family: ${F.mono}; font-size: 12px; font-weight: 800; min-width: 20px; text-align: center; padding: 1px 5px; border-radius: 999px; }
        .ar-movebar { display: flex; gap: 4px; }
        .ar-movebar button { flex: 1; cursor: pointer; background: rgba(20,15,12,0.7); border: 1px solid ${C.border}; color: ${C.goldLight}; font-family: ${F.heading}; font-size: 11px; font-weight: 700; padding: 4px 0; border-radius: 6px; }
        .ar-movebar button:hover { border-color: ${C.gold}; color: ${C.goldBright}; }

        /* ── masonry card grid ── */
        .ar-masonry { columns: 4 220px; column-gap: 12px; }
        @media (max-width: 1100px) { .ar-masonry { columns: 3 180px; } }
        @media (max-width: 680px)  { .ar-masonry { columns: 2 140px; column-gap: 8px; } }
        .ar-mcard { break-inside: avoid; margin-bottom: 12px; border-radius: 12px; overflow: hidden;
          background: rgba(8,5,2,0.6); border: 1px solid ${C.border};
          transition: border-color .18s, transform .12s, box-shadow .18s; }
        .ar-mcard:hover { border-color: ${C.borderGold}; box-shadow: 0 8px 28px rgba(0,0,0,0.5), 0 0 14px rgba(212,175,55,0.12); }
        .ar-msel { border-color: ${C.gold} !important; outline: 2px solid rgba(212,175,55,0.5); outline-offset: -2px; }
        .ar-mwrap { position: relative; cursor: pointer; overflow: hidden; }
        .ar-mwrap img { display: block; width: 100%; height: auto; transition: transform .3s; }
        .ar-mwrap:hover img { transform: scale(1.04); }
        .ar-mshade { position: absolute; inset: 0; background: linear-gradient(to top, rgba(4,2,14,0.82) 0%, transparent 50%); pointer-events: none; }
        .ar-mnum { position: absolute; bottom: 9px; inset-inline-end: 9px; background: rgba(212,175,55,0.92); color: #1a0e00;
          font-family: ${F.mono}; font-size: 12px; font-weight: 800; padding: 2px 9px; border-radius: 999px; text-decoration: none; z-index: 3; }
        .ar-mtype { position: absolute; top: 8px; inset-inline-end: 8px; font-size: 14px; z-index: 3; }
        .ar-mstream-badge { position: absolute; top: 8px; inset-inline-start: 8px; font-size: 13px; z-index: 3; }
        .ar-medit { position: absolute; bottom: 9px; inset-inline-start: 9px; background: rgba(4,2,14,0.72);
          border: 1px solid ${C.borderGold}; border-radius: 999px; width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 12px; z-index: 3; }
        .ar-madd { position: absolute; bottom: 9px; inset-inline-start: 38px; background: rgba(4,2,14,0.72);
          border: 1px solid ${C.borderGold}; border-radius: 999px; width: 26px; height: 26px;
          display: flex; align-items: center; justify-content: center; cursor: pointer; font-size: 13px; z-index: 3; }
        .ar-mchk { position: absolute; top: 8px; inset-inline-start: 8px; width: 22px; height: 22px;
          background: rgba(4,2,14,0.72); border: 1.5px solid ${C.borderGold}; border-radius: 6px;
          display: flex; align-items: center; justify-content: center; color: ${C.goldBright};
          font-size: 14px; font-weight: 800; z-index: 3; }
        .ar-mchk.on { background: ${C.gold}; color: #1a0e00; border-color: ${C.gold}; }
        .ar-mcap { padding: 8px 11px 10px; background: rgba(4,2,14,0.55); }
        .ar-mname { color: ${C.goldLight}; font-family: ${F.heading}; font-size: 12.5px; font-weight: 700; line-height: 1.5;
          overflow: hidden; display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; }
        .ar-mdate { color: ${C.muted}; font-family: ${F.heading}; font-size: 11px; margin-top: 3px; }

        /* ── type / source filter buttons ── */
        .ar-type-btns { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
        .ar-type-btn { cursor: pointer; background: rgba(20,15,12,0.6); border: 1px solid ${C.border}; color: ${C.goldLight};
          font-family: ${F.heading}; font-size: 12px; font-weight: 700; padding: 5px 12px; border-radius: 999px;
          white-space: nowrap; display: flex; align-items: center; gap: 5px; }
        .ar-type-btn:hover { border-color: ${C.borderGold}; color: ${C.goldBright}; }
        .ar-type-btn.active { background: linear-gradient(135deg, ${C.gold}, ${C.goldLight}); color: #1a0e00; border-color: ${C.gold}; }
      `}</style>
    </div>
  </>
  );
}

function AddNumber({ onAdd }) {
  const [v, setV] = useState("");
  function add() { const n = parseInt(v, 10); if (!isNaN(n)) { onAdd(n); setV(""); } }
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <input className="ar-input" style={{ width: 90 }} type="number" value={v} placeholder="מספר…"
        onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()} />
      <button className="ar-pill ar-sm" onClick={add}>הוסף +</button>
    </span>
  );
}

// 🕰️ סרגל-הזמן — ציר כרונולוגי של צפיפות הרמזים לפי שנה. כל עמודה = שנה (גובה ∝ כמות).
// לחיצה על שנה מסננת (toggle) + חושפת «בועות» של המספרים החזקים באותה שנה —
// לחיצה על בועה (אחת/כמה) מוסיפה אותה לסינון המספרים. direction:ltr (ישן→חדש).
function TimelineScrubber({ data, active, onPick, topNums, allTopNums, numFilters, onToggleNums }) {
  const [allMode, setAllMode] = useState(false);
  if (!data || data.length < 2) return null;
  const max = Math.max(...data.map(d => d.count), 1);
  const bubbles = allMode ? (allTopNums || []) : (active != null ? (topNums || []) : []);
  const showBubbles = allMode || active != null;
  const pickYear = y => { setAllMode(false); onPick(active === y ? null : y); };
  return (
    <div className="ar-tl">
      <div className="ar-tl-head">
        <span>🕰️ ציר הזמן · {data.length} שנים</span>
        <span style={{ display: "flex", gap: 7, alignItems: "center" }}>
          <button className={`ar-tl-all${allMode ? " on" : ""}`} onClick={() => { setAllMode(m => !m); onPick(null); }}>🌐 כל השנים</button>
          {active != null && <button className="ar-tl-clear" onClick={() => onPick(null)}>נקה שנה ✕</button>}
          {!showBubbles && <span className="ar-tl-hint">לחצו שנה →</span>}
        </span>
      </div>
      <div className="ar-tl-track">
        {data.map(d => (
          <button key={d.year} className={`ar-tl-col${active === d.year ? " on" : ""}`}
            onClick={() => pickYear(d.year)}
            title={`${d.year} · ${d.count} תמונות`}>
            <span className="ar-tl-cnt">{d.count}</span>
            <span className="ar-tl-bar" style={{ height: `${Math.max(7, Math.round((d.count / max) * 100))}%` }} />
            <span className="ar-tl-yr">{`'${String(d.year).slice(2)}`}</span>
          </button>
        ))}
      </div>
      {showBubbles && (
        <div className="ar-tl-bubbles">
          {bubbles.length > 0 ? (
            <>
              <div className="ar-tl-bub-t">המספרים החזקים {allMode ? "בכל השנים" : `ב-${active}`} · גודל = כמות · בחרו בועה (או כמה) לסינון:</div>
              <div className="ar-tl-bub-row">
                {(() => {
                  const maxC = Math.max(...bubbles.map(b => b.count), 1);
                  return bubbles.map(b => {
                    const on = numFilters && b.nums.every(n => numFilters.has(n));
                    const hot = b.nums.some(n => CORE_BUBBLE.has(n));
                    const t = b.count / maxC;                       // 0..1 — עוצמה יחסית
                    const size = Math.round(50 + t * 48);           // 50..98px
                    const fs = Math.round(15 + t * 11 - (b.label.length > 3 ? 4 : 0)); // טקסט ארוך (14+45) קטן יותר
                    return (
                      <button key={b.key} className={`ar-tl-bub${on ? " on" : ""}${hot ? " hot" : ""}`}
                        onClick={() => onToggleNums(b.nums)} title={`${b.label} · ${b.count} תמונות`}
                        style={{ width: size, height: size, fontSize: fs }}>
                        <span className="ar-tl-bub-v">{b.label}</span>
                        <span className="ar-tl-bub-c">{b.count}</span>
                      </button>
                    );
                  });
                })()}
              </div>
            </>
          ) : (
            <div className="ar-tl-bub-t">אין מספרים דומיננטיים מתויגים {allMode ? "" : "בשנה זו"}.</div>
          )}
        </div>
      )}
    </div>
  );
}

function ImageMeta({ im, isAdmin, onEdit, onJump, onDelete }) {
  return (
    <div style={{ padding: "12px 16px" }}>
      {im.name && <div style={{ color: C.goldLight, fontFamily: F.regal, fontSize: 16, fontWeight: 700, marginBottom: 6 }}>{im.name}</div>}
      {im.description && (
        <div style={{ color: C.muted, fontFamily: F.body, fontSize: 14, lineHeight: 1.9, whiteSpace: "pre-wrap" }}>{stripHtml(im.description)}</div>
      )}
      <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 10 }}>
        {(im.all_values || []).slice(0, 8).map((v, i) => (
          <button key={i} onClick={() => openNumberDrawer(String(v))} title="הצצה מהירה למספר" style={{
            cursor: "pointer", color: v === im.primary_value ? "#1a0e00" : C.goldLight,
            background: v === im.primary_value ? C.gold : "rgba(8,5,2,0.5)",
            border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px", fontFamily: F.mono, fontSize: 12, fontWeight: 700,
          }}>{v}</button>
        ))}
      </div>
      {/* פעולות תמונה: קפיצה למאגר המסונן (מי לפניה/אחריה → סטים) + עריכה למנהל */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 12 }}>
        <button onClick={onJump} title="ראה את התמונה במאגר — מי לפניה ומי אחריה (לבניית סטים)"
          style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
            background: "rgba(8,5,2,0.5)", border: `1px solid ${C.borderGold}`, color: C.goldLight,
            borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
          📍 מקומה במאגר
        </button>
        {isAdmin && (
          <button onClick={onEdit} title="ערוך תמונה (מנהל)"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(8,5,2,0.5)", border: `1px solid ${C.borderGold}`, color: C.goldLight,
              borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
            ✏️ עריכה
          </button>
        )}
        {isAdmin && im.source !== "update" && (
          <button onClick={onDelete} title="מחק תמונה לצמיתות (עם התראת חיבורים)"
            style={{ cursor: "pointer", display: "inline-flex", alignItems: "center", gap: 6,
              background: "rgba(60,12,12,0.45)", border: "1px solid rgba(255,112,112,0.4)", color: "#ff8a8a",
              borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontSize: 12.5, fontWeight: 700 }}>
            🗑 מחיקה
          </button>
        )}
      </div>
    </div>
  );
}

// ═══ 👑 «אוצרות הגילוי» — ציר-הערך (לצד ציר-הזמן של הזרם) ═══
// תערוכת-מוזיאון של הבחירות הידניות (treasure=true): לא תלוי-זמן — «אל תפספס את הדברים
// הכי גדולים». סגנון שער-המוזיאון: ענקית במרכז + 2 מציצות + רשת שקטה. אצירה: 👑 בעורך-התמונה.
// כשעדיין אין אוצרות — מציג לזירת-ההשוואה (זרם) כדי שהטאב לא ייראה ריק, עם הסבר-אצירה לאדמין.
function CascadeCompare({ isAdmin, onEdit }) {
  const [treasures, setTreasures] = useState(null);
  const [hints, setHints] = useState([]);
  const [total, setTotal] = useState(null);
  const [lb, setLb] = useState(null);       // {list, idx}
  const P = PALETTES.dark;

  useEffect(() => {
    let live = true;
    getTreasures(12).then(t => { if (live) setTreasures(t || []); }).catch(() => live && setTreasures([]));
    getRealityHints(50).then(h => { if (live) setHints(h || []); }).catch(() => {});
    supabase.from("gallery_images").select("id", { count: "exact", head: true })
      .not("curator_hidden", "is", true).eq("min_tier", 0)
      .then(({ count }) => { if (live && count != null) setTotal(count); });
    return () => { live = false; };
  }, []);

  if (treasures === null) return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען את האוצרות…</div>;

  const hasTreasures = treasures.length > 0;
  const gateList = hasTreasures ? treasures : hints;   // עד שיש אוצרות — טעימה מהזרם (שלא יהיה ריק)

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", background: GALLERY_BG, borderRadius: 22, padding: "26px clamp(12px,2.5vw,28px) 30px", border: "1px solid rgba(212,175,55,0.18)" }}>
      <div style={{ textAlign: "center", marginBottom: 24 }}>
        <div style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(19px,3.4vw,26px)", fontWeight: 800, textShadow: "0 0 30px rgba(212,175,55,.3)" }}>
          {/* הלוגו של האתר במקום אימוג'י הכתר (בקשת צוריאל) */}
          <img src={LOGO_URL} alt="סוד 1820" style={{ height: "1.3em", width: "auto", verticalAlign: "-0.28em", marginInlineEnd: 9, filter: "drop-shadow(0 0 9px rgba(232,200,74,.5))" }} />
          אוצרות הגילוי
        </div>
        <div style={{ color: C.goldDim, fontFamily: F.body, fontSize: 13, lineHeight: 1.7, maxWidth: 520, margin: "6px auto 0" }}>
          {hasTreasures
            ? "הבחירות הגדולות — רמזים, גימטריות והצלבות שאסור לפספס. לא לפי זמן — לפי ערך."
            : "כאן יחיו הבחירות הגדולות — בינתיים מוצגת טעימה מהזרם."}
        </div>
        {isAdmin && (
          <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12, marginTop: 8 }}>
            🛠 אצירה: פתח כל תמונה בעורך (✏️) וסמן «👑 באוצרות הגילוי». «הבלטה» קובעת מי ה-Hero.
          </div>
        )}
      </div>

      {gateList.length > 0
        ? <MuseumGallery hints={gateList} onOpen={i => setLb({ list: gateList, idx: i })} onEdit={onEdit} />
        : <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>אין עדיין תמונות להצגה.</div>}
      {total != null && (
        <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.heading, fontSize: 13, marginTop: 26 }}>
          📷 <b style={{ color: C.goldBright, fontFamily: "'Courier New',monospace", fontSize: 17 }}>{Number(total).toLocaleString("he")}</b> תמונות במאגר ·{" "}
          <Link to="/archive?tab=pool" style={{ color: C.goldBright }}>🔎 פתח את הגלריה המלאה ←</Link>
        </div>
      )}

      {lb != null && (
        <Lightbox images={lb.list} initialIndex={lb.idx} onClose={() => setLb(null)}
          onEdit={isAdmin && onEdit ? h => { setLb(null); onEdit(h); } : null} />
      )}
    </div>
  );
}

// ═══ 🧪 טאב הניסוי (אדמין) — שתי גלריות «ללא-חיתוך» על נתוני-הזרם החיים, לבחירת צוריאל ═══
function TrialGalleries({ onEdit }) {
  const [hints, setHints] = useState(null);
  const [lb, setLb] = useState(null);
  useEffect(() => {
    let live = true;
    getRealityHints(9).then(h => { if (live) setHints(h || []); }).catch(() => live && setHints([]));
    return () => { live = false; };
  }, []);
  if (hints === null) return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>טוען…</div>;
  if (!hints.length) return <div style={{ textAlign: "center", color: C.muted, fontFamily: F.body, padding: 40 }}>אין תמונות בזרם.</div>;

  const head = (t, note) => (
    <div style={{ textAlign: "center", margin: "0 0 20px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, maxWidth: 760, margin: "0 auto 4px" }}>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,transparent,rgba(212,175,55,.4))" }} />
        <span style={{ color: C.goldBright, fontFamily: F.regal, fontSize: "clamp(17px,3vw,22px)", fontWeight: 800 }}>{t}</span>
        <span style={{ flex: 1, height: 1, background: "linear-gradient(90deg,rgba(212,175,55,.4),transparent)" }} />
      </div>
      <div style={{ color: C.muted, fontFamily: F.body, fontSize: 12.5 }}>{note}</div>
    </div>
  );

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", background: GALLERY_BG, borderRadius: 22, padding: "26px clamp(12px,2.5vw,28px) 30px", border: "1px solid rgba(212,175,55,0.18)" }}>
      <div style={{ textAlign: "center", color: C.goldDim, fontFamily: F.body, fontSize: 13, marginBottom: 26, lineHeight: 1.7 }}>
        🧪 זירת ניסוי (רק אתה רואה) — שתי גלריות «ללא-חיתוך» על תמונות הזרם. בחר את המנצחת לאוצרות.
      </div>
      {head("✨ גרסה א׳ — שער המניפה", "Hero ביחס מלא + שלט-מוזיאון תלת-מימדי צף בצד (תיאור מלא) + מניפה ברוחבים יורדים · ה-Hero מתחלף כל 15ש׳")}
      <MuseumGallery hints={hints} onOpen={i => setLb(i)} onEdit={onEdit} />
      <div style={{ height: 56 }} />
      {head("💎 גרסה ב׳ — מפל ללא-חיתוך", "Hero ביחס מלא + התיאור מתחתיו · השאר משתלשלות פנימה בתלת-מימד בגודל יחסי")}
      <CascadeContain hints={hints.slice(0, 5)} onOpen={i => setLb(i)} onEdit={onEdit} />
      {lb != null && (
        <Lightbox images={hints} initialIndex={lb} onClose={() => setLb(null)}
          onEdit={onEdit ? h => { setLb(null); onEdit(h); } : null} />
      )}
    </div>
  );
}
