import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { C, F } from "../theme.js";
import {
  getGalleriesOverview, getGalleryDetail,
  getNumberSets, saveNumberSet, deleteNumberSet, getTederStations,
  searchArchiveOcrIds, addImageToRealityStream, setImageCuration,
} from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { openNumberDrawer } from "../lib/numberDrawer.js";
import StickyAnchorAd from "../components/StickyAnchorAd.jsx";
import ImageEditModal from "../components/ImageEditModal.jsx";
import Lightbox from "../components/Lightbox.jsx";
import { track } from "../lib/tracking.js";
import SideRailAd from "../components/SideRailAd.jsx";
import RealityWorld from "../components/RealityWorld.jsx";
import RealityStream from "../components/RealityStream.jsx";
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
  const { isAdmin } = useAuth();
  const loc = useLocation();
  useEffect(() => { track("reality-stream"); }, []); // eslint-disable-line
  const [tab, setTab] = useState(() => {
    const t = new URLSearchParams(loc.search).get("tab");
    return t === "galleries" ? "galleries" : t === "pool" ? "pool" : "reality";
  });
  // סנכרון טאב כשמנווטים עם ?tab= (אותו עמוד, לא מתבצע remount)
  useEffect(() => {
    const t = new URLSearchParams(loc.search).get("tab");
    if (t === "galleries" || t === "pool" || t === "reality") setTab(t);
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
  const [viewMode, setViewMode] = useState("galleries"); // galleries (אקורדיון) | images (רשת תמונות)
  const [openGal, setOpenGal] = useState(null);          // גלריה פתוחה בפיד (האחרונה כברירת מחדל)
  const [showAllNums, setShowAllNums] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);   // פאנל סינון מתקפל (סגור כברירת מחדל)
  const [limit, setLimit] = useState(PER);
  const [lbImages, setLbImages] = useState(null);   // מערך תמונות ללייטבוקס
  const [lbStart, setLbStart] = useState(0);         // אינדקס פתיחה
  const [editImg, setEditImg] = useState(null);
  const [builder, setBuilder] = useState(null);       // {id?, name, numbers:Set}
  const [curating, setCurating] = useState(false);    // מצב הבלטה/סידור ידני
  const [draftOrder, setDraftOrder] = useState([]);   // רשימת מזהי תמונות מובלטות (סדר)
  // workspace dashboard
  const [typeFilter, setTypeFilter] = useState(null);  // null/'hint'/'gematria'/'trail'/'event'/'gallery'/'__none'
  const [sourceFilter, setSourceFilter] = useState(null); // null/'update'/'not-update'
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [multiSelect, setMultiSelect] = useState(false);
  const [masonryView, setMasonryView] = useState(true);

  useEffect(() => {
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
  }, []);

  const imgDate = occ => { if (!occ) return null; try { return new Date(occ).toLocaleDateString("he-IL", { year: "numeric", month: "long" }); } catch { return null; } };

  useEffect(() => {
    if (!sel) { setDetail(null); return; }
    setLoadingDetail(true);
    getGalleryDetail(sel.id).then(d => { setDetail(d); setLoadingDetail(false); }).catch(() => setLoadingDetail(false));
  }, [sel]);

  const total = useMemo(() => (gals || []).reduce((s, g) => s + g.count, 0), [gals]);

  // מיפוי גלריה → סדר התוסף (wp_gallery_id); גבוה = חדש יותר
  const galSeqById = useMemo(() => { const m = {}; for (const g of (gals || [])) m[g.id] = g.seq; return m; }, [gals]);

  // ── מאגר: מיון. ברירת מחדל "גלריה" = כסדר התוסף (גלריה חדשה למעלה, בתוכה לפי ordering). או "תאריך".
  const sortedImgs = useMemo(() => {
    const arr = [...imgs];
    if (sortMode === "gallery") {
      arr.sort((a, b) =>
        (galSeqById[b.gallery_id] ?? -1) - (galSeqById[a.gallery_id] ?? -1) ||
        (a.ordering ?? 0) - (b.ordering ?? 0));
      return arr;
    }
    const withD = [], without = [];
    for (const im of arr) (eventDate(im) ? withD : without).push(im);
    withD.sort((a, b) => eventDate(b) - eventDate(a));
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
      if (setNums && !hintNums(im).some(v => setNums.has(v))) return false;
      if (numFilters.size > 0) {
        const nums = [...numFilters];
        const match = dominantOnly
          ? (filterMode === "AND" ? nums.every(n => n === im.primary_value) : nums.includes(im.primary_value))
          : (filterMode === "AND" ? nums.every(n => hintNums(im).includes(n)) : nums.some(n => hintNums(im).includes(n)));
        if (!match) return false;
      }
      if (yearFilter != null && eventYear(im) !== yearFilter) return false;
      if (qNum != null) { if (!hintNums(im).includes(qNum)) return false; }
      else if (q && !((im.name || "").toLowerCase().includes(q) || (im.description || "").toLowerCase().includes(q) || (ocrMatch?.imgs.has(im.id)))) return false;
      if (typeFilter === '__none') { if (im.image_type != null) return false; }
      else if (typeFilter) { if (im.image_type !== typeFilter) return false; }
      if (sourceFilter === 'update') { if (im.source !== 'update') return false; }
      else if (sourceFilter === 'not-update') { if (im.source === 'update') return false; }
      return true;
    });
    if (sortMode === "cross") {
      const score = im => (setNums ? hintNums(im).filter(v => setNums.has(v)).length : 0) * 1000 + hintNums(im).length;
      arr = [...arr].sort((a, b) => score(b) - score(a));
    }
    return arr;
  }, [sortedImgs, setNums, numFilters, filterMode, dominantOnly, yearFilter, q, qNum, sortMode, ocrMatch]);

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
      setEditImg(null);
    } catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
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

  // ── batch actions ──
  function toggleSelect(id) {
    setSelectedIds(prev => { const s = new Set(prev); s.has(id) ? s.delete(id) : s.add(id); return s; });
  }
  async function addSelectedToStream() {
    for (const id of selectedIds) {
      const im = imgs.find(x => x.id === id);
      if (im && im.source !== 'update') await addToStream(im).catch(() => {});
    }
    setSelectedIds(new Set());
  }
  async function removeSelectedFromStream() {
    for (const id of selectedIds) {
      await setImageCuration(id, { source: 'manual' }).catch(() => {});
    }
    setImgs(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, source: 'manual' } : x));
    setSelectedIds(new Set());
  }
  async function setTypeForSelected(type) {
    const patch = { image_type: type || null };
    for (const id of selectedIds) await setImageCuration(id, patch).catch(() => {});
    setImgs(prev => prev.map(x => selectedIds.has(x.id) ? { ...x, ...patch } : x));
    setSelectedIds(new Set());
  }
  async function addGalleryToStream(galleryId) {
    const gimgs = imgs.filter(im => im.gallery_id === galleryId && im.source !== 'update');
    if (!gimgs.length) return;
    for (const im of gimgs) await addToStream(im).catch(() => {});
  }

  async function reloadSets() { try { setSets(await getNumberSets()); } catch {} }
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
    <div style={{ direction: "rtl", maxWidth: tab === "pool" ? "none" : 1280, margin: "0 auto", padding: tab === "pool" ? "32px 0 90px 90px" : "48px 16px 90px", position: "relative", zIndex: 1 }}>
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
        {[["reality", "🌊 זרם המציאות"], ["galleries", "📚 גלריות"], ["pool", "🔢 מאגר / סטים"]].map(([k, l]) => (
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
        <div style={{ maxWidth: 1100, margin: "0 auto" }}>
          <RealityWorld forceDark presetSetId={new URLSearchParams(loc.search).get("set")} />
        </div>
      )}

      {/* ============ טאב גלריות (ההיסטורי) — עם רצועת גלריות-רמזים מומלצות ============ */}
      {tab === "galleries" && (
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
                {g.cover && <img src={g.cover} alt={g.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", opacity: 0.85 }} />}
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
      {tab === "pool" && (
        <div className="ar-layout">
          <aside className="ar-side">
            {/* ── סוגי תמונות (מחוק העץ האחד) ── */}
            <div className="ar-side-title">📂 סוג תמונה</div>
            <div className="ar-type-btns">
              {[
                [null,       '🖼 הכל',        imgs.length],
                ['hint',     '💡 רמזים',       imgs.filter(x => x.image_type === 'hint').length],
                ['gematria', '🔢 גימטריה',     imgs.filter(x => x.image_type === 'gematria').length],
                ['trail',    '📖 מסלולים',      imgs.filter(x => x.image_type === 'trail').length],
                ['event',    '📰 אירועים',     imgs.filter(x => x.image_type === 'event').length],
                ['gallery',  '🗂 כללי',        imgs.filter(x => x.image_type === 'gallery').length],
                ['__none',   '❓ לא מסווג',    imgs.filter(x => x.image_type == null).length],
              ].map(([k, l, cnt]) => (
                <button key={String(k)} className={`ar-type-btn${typeFilter === k ? ' active' : ''}`}
                  onClick={() => setTypeFilter(prev => prev === k ? null : k)}>
                  <span>{l}</span>
                  <span className="ar-type-cnt">{cnt}</span>
                </button>
              ))}
            </div>

            {/* ── מקור ── */}
            <div className="ar-side-title" style={{ marginTop: 16 }}>🌊 מקור</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 5, marginTop: 6 }}>
              {[
                [null,        '📦 כל המאגר',   imgs.length],
                ['update',    '🌊 בזרם כרגע',  imgs.filter(x => x.source === 'update').length],
                ['not-update','📁 גלריה בלבד', imgs.filter(x => x.source !== 'update').length],
              ].map(([k, l, cnt]) => (
                <button key={String(k)} className={`ar-type-btn${sourceFilter === k ? ' active' : ''}`}
                  onClick={() => setSourceFilter(prev => prev === k ? null : k)}>
                  <span>{l}</span>
                  <span className="ar-type-cnt">{cnt}</span>
                </button>
              ))}
            </div>

            {/* ── מאגר סטים ── */}
            <div className="ar-side-title" style={{ marginTop: 16 }}>🔢 מאגר סטים</div>
            <div className="ar-row" style={{ marginTop: 6 }}>
              <button className={`ar-set${!activeSet ? " active" : ""}`} onClick={() => setActiveSet(null)}>כל הגלריות</button>
              {sets.map(s => (
                <span key={s.id} style={{ display: "inline-flex", alignItems: "center" }}>
                  <button className={`ar-set${activeSet?.id === s.id ? " active" : ""}`}
                    onClick={() => setActiveSet(activeSet?.id === s.id ? null : s)}
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
            </div>

            {/* ── בונה-סטים ── */}
            {isAdmin && builder && (
              <div className="ar-builder" style={{ marginTop: 10 }}>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
                  <input className="ar-input" value={builder.name} placeholder="שם הסט…"
                    onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))} />
                  <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11 }}>
                    {imgs.filter(im => hintNums(im).some(v => builder.numbers.has(v))).length} תמונות
                  </span>
                  <AddNumber onAdd={n => setBuilder(b => { const s = new Set(b.numbers); s.add(n); return { ...b, numbers: s }; })} />
                  <button className="ar-save" onClick={saveBuilder}>💾</button>
                  <button className="ar-cancel" onClick={() => setBuilder(null)}>✕</button>
                </div>
                {builder.numbers.size > 0 && (
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 5, marginBottom: 8 }}>
                    {[...builder.numbers].sort((a, b) => a - b).map(n => (
                      <button key={n} className="ar-pill active ar-sm" onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.delete(n); return { ...b, numbers: s }; })}>
                        {n} ✕
                      </button>
                    ))}
                  </div>
                )}
                <div style={{ display: "flex", flexWrap: "wrap", gap: 5 }}>
                  {numOptions.slice(0, 24).map(({ n, k }) => (
                    <button key={n} className={`ar-pill ar-sm${builder.numbers.has(n) ? " active" : ""}`}
                      onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.has(n) ? s.delete(n) : s.add(n); return { ...b, numbers: s }; })}>
                      {n}<span className="ar-count">{k}</span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* ── חיפוש + פילטרים נוספים ── */}
            <div style={{ marginTop: 16 }}>
              <div className="ar-search">
                <span aria-hidden>🔎</span>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="מספר או טקסט…" aria-label="חיפוש" />
                {query && <button className="ar-x" onClick={() => setQuery("")}>×</button>}
              </div>

              {/* תצוגה ומיון — רק בתמונות */}
              <div className="ar-row" style={{ marginTop: 10 }}>
                <button className={`ar-pill ar-sm${viewMode === "galleries" ? " active" : ""}`} onClick={() => setViewMode("galleries")}>🗂 גלריות</button>
                <button className={`ar-pill ar-sm${viewMode === "images" ? " active" : ""}`} onClick={() => setViewMode("images")}>🖼 תמונות</button>
              </div>
              {viewMode === "images" && (
                <div className="ar-row" style={{ marginTop: 6 }}>
                  <button className={`ar-pill ar-sm${sortMode === "date" ? " active" : ""}`} onClick={() => setSortMode("date")}>📅 תאריך</button>
                  <button className={`ar-pill ar-sm${sortMode === "gallery" ? " active" : ""}`} onClick={() => setSortMode("gallery")}>🗂 גלריה</button>
                  <button className={`ar-pill ar-sm${sortMode === "cross" ? " active" : ""}`} onClick={() => setSortMode("cross")}>⚡ הצטלבויות</button>
                </div>
              )}

              {/* מספרים נפוצים */}
              {hotNums.length > 0 && (
                <>
                  <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 12, marginBottom: 5 }}>⚡ מספרים נפוצים</div>
                  <div className="ar-row">
                    {hotNums.map(({ n }) => (
                      <button key={n} className={`ar-pill ar-sm${numFilters.has(n) ? " active" : ""}`} onClick={() => toggleNum(n)}>{n}</button>
                    ))}
                  </div>
                  {numFilters.size > 0 && (
                    <div className="ar-row" style={{ marginTop: 6 }}>
                      <button className={`ar-pill ar-sm${filterMode === "OR" ? " active" : ""}`} onClick={() => setFilterMode("OR")}>OR</button>
                      <button className={`ar-pill ar-sm${filterMode === "AND" ? " active" : ""}`} onClick={() => setFilterMode("AND")}>AND</button>
                      <button className={`ar-pill ar-sm${dominantOnly ? " active" : ""}`} onClick={() => setDominantOnly(v => !v)}>דומיננטי</button>
                    </div>
                  )}
                </>
              )}

              {/* שנה */}
              {yearOptions.length > 0 && (
                <>
                  <div style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 11, marginTop: 12, marginBottom: 5 }}>🗓️ שנה</div>
                  <div className="ar-row">
                    {yearOptions.map(y => (
                      <button key={y} className={`ar-pill ar-sm${yearFilter === y ? " active" : ""}`} onClick={() => setYearFilter(p => p === y ? null : y)}>{y}</button>
                    ))}
                  </div>
                </>
              )}

              {/* chips פעילים + ניקוי */}
              {(hasFilter || typeFilter || sourceFilter) && (
                <div style={{ marginTop: 12, paddingTop: 10, borderTop: `1px solid ${C.faint}` }}>
                  <button className="ar-clear" style={{ width: "100%" }} onClick={() => {
                    setActiveSet(null); setNumFilters(new Set()); setFilterMode("OR"); setDominantOnly(false);
                    setYearFilter(null); setQuery(""); setTypeFilter(null); setSourceFilter(null);
                  }}>× נקה כל הפילטרים</button>
                </div>
              )}
            </div>
          </aside>

          <div className="ar-feed">
          {/* ── toolbar: תצוגה + multi-select ── */}
          {viewMode === "images" && !curating && (
            <div className="ar-toolbar">
              <button className={`ar-pill ar-sm${masonryView ? ' active' : ''}`} onClick={() => setMasonryView(true)}>⊞ פסיפס</button>
              <button className={`ar-pill ar-sm${!masonryView ? ' active' : ''}`} onClick={() => setMasonryView(false)}>🃏 כרטיסים</button>
              {isAdmin && masonryView && (
                <button className={`ar-pill ar-sm${multiSelect ? ' active' : ''}`}
                  onClick={() => { setMultiSelect(m => !m); setSelectedIds(new Set()); }}>
                  ☑️ {multiSelect ? `בחירה (${selectedIds.size})` : 'בחירה מרובה'}
                </button>
              )}
              {isAdmin && multiSelect && selectedIds.size > 0 && (
                <>
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>·</span>
                  <button className="ar-save" style={{ fontSize: 12, padding: "5px 12px" }} onClick={addSelectedToStream}>🌊 הכנס לזרם</button>
                  <button className="ar-cancel" style={{ fontSize: 12, padding: "5px 12px" }} onClick={removeSelectedFromStream}>הוצא מהזרם</button>
                  <span style={{ color: C.muted, fontFamily: F.heading, fontSize: 12 }}>סוג:</span>
                  {[['hint','💡'],['gematria','🔢'],['trail','📖'],['event','📰'],['gallery','🗂'],['','✕']].map(([t, lbl]) => (
                    <button key={t} className="ar-pill ar-sm" onClick={() => setTypeForSelected(t || null)} title={t || 'נקה סוג'}>{lbl}</button>
                  ))}
                </>
              )}
            </div>
          )}

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
                : `${pool.length.toLocaleString()} תמונות${hasFilter ? " (מסוננות)" : ""} · ${sortMode === "gallery" ? "לפי סדר הגלריות (התוסף)" : "מהחדש לישן"}`}
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
                        {isAdmin && (
                          <span onClick={e => { e.stopPropagation(); addGalleryToStream(g.id); }}
                            className="ar-pill ar-sm" style={{ fontSize: 11, padding: "3px 10px", marginInlineEnd: 8 }}
                            title="הכנס את כל תמונות הגלריה לזרם המציאות">🌊 לזרם</span>
                        )}
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
                                <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ display: "block" }} />
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
            <div className="ar-empty">לא נמצאו תמונות{typeFilter || sourceFilter ? " עבור הפילטר הנוכחי" : " תואמות"}.</div>
          ) : curated ? (
            <>
              {highlighted.length > 0 && (
                <>
                  <div className="ar-subhead">⭐ מובלטים — ציר ידני</div>
                  <div className="ar-grid">
                    {highlighted.map((im, idx) => (
                      <div key={im.id} className="ar-imgwrap">
                        <button onClick={() => curating ? toggleHi(im.id) : (setLbImages([...highlighted, ...rest]), setLbStart(idx))} className={`arch-card ar-imgcard${curating ? " ar-on" : ""}`}>
                          <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
                    <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
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
              <div className="ar-masonry">
                {pool.slice(0, limit).map((im, idx) => {
                  const isSel = selectedIds.has(im.id);
                  const TYPE_EMOJI = { hint: '💡', gematria: '🔢', trail: '📖', event: '📰', gallery: '🗂' };
                  return (
                    <div key={im.id} className={`ar-mcard${isSel ? ' ar-msel' : ''}`}>
                      <div className="ar-mwrap"
                        onClick={() => multiSelect
                          ? toggleSelect(im.id)
                          : (setLbImages(pool), setLbStart(idx))
                        }
                      >
                        <img src={im.image_url} alt={im.name || ''} loading="lazy"
                          onError={e => { e.target.style.display = 'none'; }} />
                        <div className="ar-mshade" />
                        {multiSelect && <div className={`ar-mchk${isSel ? ' on' : ''}`}>{isSel ? '✓' : ''}</div>}
                        {im.primary_value != null && !multiSelect && (
                          <Link to={`/number/${im.primary_value}`} className="ar-mnum" onClick={e => e.stopPropagation()}>{im.primary_value}</Link>
                        )}
                        {im.image_type && <span className="ar-mtype">{TYPE_EMOJI[im.image_type] || ''}</span>}
                        {im.source === 'update' && <span className="ar-mstream-badge">🌊</span>}
                        {isAdmin && !multiSelect && (
                          <button className="ar-medit" onClick={e => { e.stopPropagation(); setEditImg(im); }} title="ערוך">✏️</button>
                        )}
                        {isAdmin && !multiSelect && im.source !== 'update' && (
                          <button className="ar-madd" onClick={e => { e.stopPropagation(); addToStream(im); }} title="הכנס לזרם">🌊</button>
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

      {/* מודאל גלריה (טאב גלריות) — ללא שינוי */}
      {sel && (
        <div onClick={() => setSel(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.94)", overflowY: "auto", padding: "40px 16px" }}>
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
                  <div key={im.id} style={{ background: "rgba(20,15,12,0.5)", border: `1px solid ${C.border}`, borderRadius: 14, overflow: "hidden" }}>
                    {imgDate(im.occurred_at) && (
                      <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "8px 14px", borderBottom: `1px solid ${C.border}`, color: C.goldDim, fontFamily: F.heading, fontSize: 12.5, fontWeight: 700, letterSpacing: 1 }}>
                        <span aria-hidden>🗓️</span>{imgDate(im.occurred_at)}
                      </div>
                    )}
                    <a href={im.image_url} target="_blank" rel="noopener noreferrer">
                      <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ width: "100%", display: "block" }} />
                    </a>
                    <ImageMeta im={im} onClose={() => setSel(null)} />
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

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

        /* פריסת מאגר: אזור ראשי (ימין RTL) + סרגל צד (שמאל RTL) */
        .ar-layout { display: grid; grid-template-columns: 1fr 280px; gap: 0; align-items: start; }
        .ar-feed { grid-column: 1; min-width: 0; padding: 0 16px; }
        .ar-side { grid-column: 2; position: sticky; top: 64px; align-self: start; max-height: calc(100vh - 76px); overflow-y: auto;
          display: flex; flex-direction: column; gap: 4px; padding: 16px 14px;
          border-inline-start: 1px solid rgba(212,175,55,0.12); background: rgba(4,3,8,0.55); }
        .ar-side .ar-row { justify-content: flex-start; }
        .ar-side-title { color: ${C.goldBright}; font-family: ${F.regal}; font-size: 15px; font-weight: 700; }
        @media (max-width: 900px) {
          .ar-layout { grid-template-columns: 1fr; }
          .ar-feed { grid-column: 1; grid-row: 1; padding: 0 10px; }
          .ar-side { grid-column: 1; grid-row: 2; position: static; max-height: none; border-inline-start: none;
            border-top: 1px solid rgba(212,175,55,0.12); }
        }
        /* type buttons (sidebar) */
        .ar-type-btns { display: flex; flex-direction: column; gap: 4px; margin-top: 7px; }
        .ar-type-btn { cursor: pointer; text-align: right; padding: 7px 11px; border-radius: 9px;
          font-family: ${F.heading}; font-size: 13px; font-weight: 700;
          border: 1px solid ${C.border}; background: transparent; color: ${C.muted};
          display: flex; justify-content: space-between; align-items: center;
          transition: background .15s, border-color .15s, color .15s; }
        .ar-type-btn:hover { border-color: ${C.gold}44; color: ${C.goldLight}; background: rgba(212,175,55,0.06); }
        .ar-type-btn.active { background: linear-gradient(135deg,rgba(212,175,55,0.2),rgba(8,5,2,0.4)); border-color: ${C.gold}; color: ${C.goldBright}; }
        .ar-type-cnt { font-family: ${F.mono}; font-size: 11px; color: ${C.goldDim}; background: rgba(0,0,0,0.3); border-radius: 999px; padding: 1px 7px; }
        .ar-type-btn.active .ar-type-cnt { color: ${C.gold}; }
        /* toolbar */
        .ar-toolbar { display: flex; flex-wrap: wrap; align-items: center; gap: 7px; margin-bottom: 14px; }
        /* masonry grid */
        .ar-masonry { column-count: 4; column-gap: 12px; }
        @media(max-width:1400px){ .ar-masonry{ column-count:3; } }
        @media(max-width:900px){ .ar-masonry{ column-count:2; column-gap:8px; } }
        @media(max-width:480px){ .ar-masonry{ column-count:2; column-gap:6px; } }
        .ar-mcard { break-inside: avoid; -webkit-column-break-inside: avoid; margin-bottom: 12px;
          border-radius: 13px; overflow: hidden; border: 1px solid ${C.border}; background: #0d0b10;
          transition: border-color .18s, box-shadow .18s; }
        .ar-mcard:hover { border-color: ${C.gold}55; box-shadow: 0 10px 28px rgba(0,0,0,0.5); }
        .ar-mcard.ar-msel { border-color: ${C.gold}; box-shadow: 0 0 0 2px ${C.gold}66; }
        .ar-mwrap { position: relative; overflow: hidden; cursor: zoom-in; line-height: 0; }
        .ar-mwrap img { width: 100%; height: auto; display: block; transition: transform .4s; }
        .ar-mcard:hover .ar-mwrap img { transform: scale(1.04); }
        .ar-mshade { position: absolute; inset: 0; background: linear-gradient(180deg,rgba(0,0,0,.22) 0%,transparent 28%,transparent 62%,rgba(0,0,0,.55) 100%); pointer-events: none; }
        .ar-mchk { position: absolute; top: 8px; inset-inline-start: 8px; width: 22px; height: 22px; border-radius: 999px;
          border: 2px solid rgba(255,255,255,.65); background: rgba(0,0,0,.45); color: #fff; font-size: 13px; font-weight: 800;
          display: flex; align-items: center; justify-content: center; z-index: 3; }
        .ar-mchk.on { background: ${C.gold}; border-color: ${C.gold}; color: #1a0e00; }
        .ar-mnum { position: absolute; top: 7px; inset-inline-end: 7px; background: rgba(212,175,55,0.95); color: #1a0e00;
          font-family: ${F.mono}; font-size: 12px; font-weight: 900; border-radius: 999px; padding: 2px 9px; z-index: 2; text-decoration: none; }
        .ar-mtype { position: absolute; top: 7px; inset-inline-start: 7px; background: rgba(0,0,0,0.62);
          color: #ffffffcc; font-size: 11px; border-radius: 999px; padding: 2px 7px; z-index: 2; }
        .ar-mstream-badge { position: absolute; bottom: 7px; inset-inline-start: 7px; background: rgba(0,55,120,0.8);
          color: #60aaff; font-size: 11px; border-radius: 999px; padding: 2px 7px; z-index: 2; }
        .ar-medit { position: absolute; bottom: 7px; inset-inline-end: 7px; z-index: 3; background: rgba(0,0,0,.6);
          color: #fff; border: none; border-radius: 999px; width: 26px; height: 26px; font-size: 12px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
        .ar-madd { position: absolute; bottom: 7px; inset-inline-end: 38px; z-index: 3; background: rgba(0,45,110,.7);
          color: #60aaff; border: none; border-radius: 999px; width: 26px; height: 26px; font-size: 11px; cursor: pointer;
          display: flex; align-items: center; justify-content: center; opacity: 0; transition: opacity .2s; }
        .ar-mcard:hover .ar-medit, .ar-mcard:hover .ar-madd { opacity: 1; }
        .ar-mcap { padding: 8px 11px 10px; }
        .ar-mname { color: ${C.goldLight}; font-family: ${F.regal}; font-size: 13px; font-weight: 700; line-height: 1.35;
          display: -webkit-box; -webkit-line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
        .ar-mdate { color: ${C.muted}; font-family: ${F.heading}; font-size: 10.5px; margin-top: 3px; }
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
      `}</style>
    </div>
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

function ImageMeta({ im, onClose }) {
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
    </div>
  );
}
