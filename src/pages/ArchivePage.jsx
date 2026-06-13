import React, { useState, useEffect, useMemo } from "react";
import { Link, useLocation } from "react-router-dom";
import { C, F } from "../theme.js";
import {
  getGalleriesOverview, getGalleryDetail,
  getNumberSets, saveNumberSet, deleteNumberSet, getTederStations,
} from "../lib/supabase.js";
import { stripHtml } from "../lib/format.js";
import { useAuth } from "../lib/AuthContext.jsx";

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
const eventDate = im => im.occurred_at ? new Date(im.occurred_at) : descDate(im.description);
const eventYear = im => { const d = eventDate(im); return d ? d.getFullYear() : null; };
function eventLabel(im) {
  if (im.occurred_at) { const d = new Date(im.occurred_at); return `${HE_MONTHS[d.getMonth()]} ${d.getFullYear()}`; }
  const d = descDate(im.description);
  return d ? d.toLocaleDateString("he-IL", { day: "numeric", month: "long", year: "numeric" }) : null;
}
const imgNums = im => [...new Set([...(im.all_values || []), ...(im.primary_value != null ? [im.primary_value] : [])])];

export default function ArchivePage() {
  const { isAdmin } = useAuth();
  const loc = useLocation();
  const [tab, setTab] = useState(() => new URLSearchParams(loc.search).get("tab") === "pool" ? "pool" : "galleries");
  const [gals, setGals] = useState(null);
  const [imgs, setImgs] = useState([]);
  const [sets, setSets] = useState([]);
  const [teder, setTeder] = useState([]);

  // galleries tab
  const [sel, setSel] = useState(null);
  const [detail, setDetail] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  // pool tab
  const [activeSet, setActiveSet] = useState(null);   // set object
  const [numFilter, setNumFilter] = useState(null);
  const [yearFilter, setYearFilter] = useState(null);
  const [query, setQuery] = useState("");
  const [sortMode, setSortMode] = useState("gallery");   // gallery (סדר התוסף) | date
  const [showAllNums, setShowAllNums] = useState(false);
  const [limit, setLimit] = useState(PER);
  const [lightbox, setLightbox] = useState(null);
  const [builder, setBuilder] = useState(null);       // {id?, name, numbers:Set}
  const [curating, setCurating] = useState(false);    // מצב הבלטה/סידור ידני
  const [draftOrder, setDraftOrder] = useState([]);   // רשימת מזהי תמונות מובלטות (סדר)

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
    getNumberSets().then(setSets).catch(() => {});
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
    for (const im of imgs) for (const v of imgNums(im)) c[v] = (c[v] || 0) + 1;
    return Object.entries(c).map(([n, k]) => ({ n: +n, k })).sort((a, b) => b.k - a.k);
  }, [imgs]);
  const yearOptions = useMemo(() => {
    const s = new Set();
    for (const im of imgs) { const y = eventYear(im); if (y) s.add(y); }
    return [...s].sort((a, b) => b - a);
  }, [imgs]);

  useEffect(() => { setLimit(PER); }, [activeSet, numFilter, yearFilter, query, tab]);

  const qRaw = query.trim();
  const qNum = /^\d+$/.test(qRaw) ? parseInt(qRaw, 10) : null;   // חיפוש מספר → סינון לפי ערך
  const q = qRaw.toLowerCase();
  const setNums = activeSet ? new Set(activeSet.numbers) : null;
  const pool = useMemo(() => sortedImgs.filter(im => {
    if (setNums && !imgNums(im).some(v => setNums.has(v))) return false;
    if (numFilter != null && !imgNums(im).includes(numFilter)) return false;
    if (yearFilter != null && eventYear(im) !== yearFilter) return false;
    if (qNum != null) { if (!imgNums(im).includes(qNum)) return false; }
    else if (q && !((im.name || "").toLowerCase().includes(q) || (im.description || "").toLowerCase().includes(q))) return false;
    return true;
  }), [sortedImgs, setNums, numFilter, yearFilter, q, qNum]);

  // אירועים מהציר שחולקים מספר עם הסט/המספר הפעיל
  const bridgeNums = activeSet ? activeSet.numbers : (numFilter != null ? [numFilter] : null);
  const bridgeEvents = useMemo(() => {
    if (!bridgeNums) return [];
    const s = new Set(bridgeNums);
    return teder.filter(t => (t.central_numbers || []).some(n => s.has(n)));
  }, [teder, bridgeNums]);

  const shownNums = showAllNums ? numOptions : numOptions.slice(0, 16);
  const hasFilter = activeSet || numFilter != null || yearFilter != null || q;

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
    <div style={{ direction: "rtl", maxWidth: 1280, margin: "0 auto", padding: "48px 16px 90px", position: "relative", zIndex: 1 }}>
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
      </div>

      {/* טאבים */}
      <div style={{ display: "flex", justifyContent: "center", gap: 8, marginBottom: 26 }}>
        {[["galleries", "📚 גלריות"], ["pool", "🔢 מאגר / סטים"]].map(([k, l]) => (
          <button key={k} onClick={() => setTab(k)} style={{
            cursor: "pointer", fontFamily: F.heading, fontSize: 14, fontWeight: 700, padding: "9px 20px", borderRadius: 999,
            border: `1px solid ${tab === k ? C.gold : C.border}`,
            background: tab === k ? "linear-gradient(135deg, rgba(212,175,55,0.2), rgba(8,5,2,0.4))" : "transparent",
            color: tab === k ? C.goldBright : C.muted,
          }}>{l}</button>
        ))}
      </div>

      {/* ============ טאב גלריות (ההיסטורי — ללא שינוי) ============ */}
      {tab === "galleries" && (
        gals === null ? (
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
        )
      )}

      {/* ============ טאב מאגר / סטים ============ */}
      {tab === "pool" && (
        <>
          {/* סטים */}
          <div className="ar-row" style={{ justifyContent: "center" }}>
            <button className={`ar-set${!activeSet ? " active" : ""}`} onClick={() => setActiveSet(null)}>הכול</button>
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
          </div>

          {/* בונה-סטים (מנהלים) */}
          {isAdmin && builder && (
            <div className="ar-builder">
              <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 12 }}>
                <input className="ar-input" value={builder.name} placeholder="שם הסט (למשל: דוד המלך)"
                  onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))} />
                <span style={{ color: C.goldDim, fontFamily: F.heading, fontSize: 12 }}>
                  {builder.numbers.size} מספרים · {pool.length /* preview uses current filters; rough */ ? "" : ""}
                  {imgs.filter(im => imgNums(im).some(v => builder.numbers.has(v))).length} תמונות
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

          {/* פילטרים */}
          <div className="ar-panel">
            <div className="ar-row">
              <div className="ar-search">
                <span aria-hidden>🔎</span>
                <input value={query} onChange={e => setQuery(e.target.value)} placeholder="חיפוש לפי מספר (למשל 1237) או טקסט בתיאור…" aria-label="חיפוש" />
                {query && <button className="ar-x" onClick={() => setQuery("")}>×</button>}
              </div>
              <div className="ar-seg" role="group" aria-label="מיון">
                <button className={`ar-pill${sortMode === "gallery" ? " active" : ""}`} onClick={() => setSortMode("gallery")} title="כסדר התוסף — גלריה חדשה למעלה">לפי גלריה</button>
                <button className={`ar-pill${sortMode === "date" ? " active" : ""}`} onClick={() => setSortMode("date")} title="לפי תאריך האירוע">לפי תאריך</button>
              </div>
            </div>
            {numOptions.length > 0 && (
              <div className="ar-row">
                <span className="ar-label">🔢 מספר</span>
                {shownNums.map(({ n, k }) => (
                  <button key={n} className={`ar-pill ar-sm${numFilter === n ? " active" : ""}`} onClick={() => setNumFilter(p => p === n ? null : n)}>
                    {n}<span className="ar-count">{k}</span>
                  </button>
                ))}
                {numOptions.length > 16 && <button className="ar-pill ar-more" onClick={() => setShowAllNums(v => !v)}>{showAllNums ? "פחות ▲" : "עוד ▾"}</button>}
              </div>
            )}
            {yearOptions.length > 0 && (
              <div className="ar-row">
                <span className="ar-label">🗓️ שנה</span>
                {yearOptions.map(y => (
                  <button key={y} className={`ar-pill ar-sm${yearFilter === y ? " active" : ""}`} onClick={() => setYearFilter(p => p === y ? null : y)}>{y}</button>
                ))}
              </div>
            )}
            {hasFilter && (
              <div className="ar-row" style={{ paddingTop: 4, borderTop: `1px solid ${C.faint}` }}>
                {activeSet && <span className="ar-chip">סט: {activeSet.name}<button onClick={() => setActiveSet(null)}>×</button></span>}
                {numFilter != null && <span className="ar-chip">מספר: {numFilter}<button onClick={() => setNumFilter(null)}>×</button></span>}
                {yearFilter != null && <span className="ar-chip">שנה: {yearFilter}<button onClick={() => setYearFilter(null)}>×</button></span>}
                {q && <span className="ar-chip">חיפוש: {query}<button onClick={() => setQuery("")}>×</button></span>}
                <button className="ar-clear" onClick={() => { setActiveSet(null); setNumFilter(null); setYearFilter(null); setQuery(""); }}>נקה הכל ×</button>
              </div>
            )}
          </div>

          {/* גשר לציר האירועים */}
          {bridgeEvents.length > 0 && (
            <div className="ar-bridge">
              <span style={{ color: C.goldBright, fontFamily: F.heading, fontWeight: 700 }}>🌅 אירועים מהציר עם המספרים האלה:</span>
              {bridgeEvents.map(t => (
                <Link key={t.id} to="/timeline" className="ar-evt">{t.title} · {t.year}</Link>
              ))}
            </div>
          )}

          {/* סרגל סידור ידני (מנהל, כשסט פעיל) */}
          {activeSet && isAdmin && (
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
            {curated
              ? `${highlighted.length} מובלטות · ${rest.length.toLocaleString()} בשבילים`
              : `${pool.length.toLocaleString()} תמונות${hasFilter ? " (מסוננות)" : ""} · ${sortMode === "gallery" ? "לפי סדר הגלריות (התוסף)" : "מהחדש לישן"}`}
          </div>

          {pool.length === 0 ? (
            <div className="ar-empty">לא נמצאו תמונות תואמות.</div>
          ) : curated ? (
            <>
              {highlighted.length > 0 && (
                <>
                  <div className="ar-subhead">⭐ מובלטים — ציר ידני</div>
                  <div className="ar-grid">
                    {highlighted.map((im, idx) => (
                      <div key={im.id} className="ar-imgwrap">
                        <button onClick={() => curating ? toggleHi(im.id) : setLightbox(im)} className={`arch-card ar-imgcard${curating ? " ar-on" : ""}`}>
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
                {rest.slice(0, limit).map(im => (
                  <button key={im.id} onClick={() => curating ? toggleHi(im.id) : setLightbox(im)} className="arch-card ar-imgcard">
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
          ) : (
            <>
              <div className="ar-grid">
                {pool.slice(0, limit).map(im => (
                  <button key={im.id} onClick={() => setLightbox(im)} className="arch-card ar-imgcard">
                    <img src={im.image_url} alt={im.name || ""} loading="lazy" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                    <span style={{ position: "absolute", inset: 0, background: "linear-gradient(180deg, transparent 55%, rgba(5,4,0,0.85))" }} />
                    {im.primary_value != null && <span className="ar-anchor">{im.primary_value}</span>}
                    {eventLabel(im) && <span className="ar-imgdate">{eventLabel(im)}</span>}
                  </button>
                ))}
              </div>
              {pool.length > limit && (
                <div style={{ textAlign: "center", marginTop: 30 }}>
                  <button className="ar-loadmore" onClick={() => setLimit(l => l + PER)}>טען עוד · נותרו {(pool.length - limit).toLocaleString()}</button>
                </div>
              )}
            </>
          )}
        </>
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
      {lightbox && (
        <div onClick={() => setLightbox(null)} style={{ position: "fixed", inset: 0, zIndex: 200, background: "rgba(3,2,8,0.95)", overflowY: "auto", padding: "32px 16px", direction: "rtl" }}>
          <div onClick={e => e.stopPropagation()} style={{ maxWidth: 760, margin: "0 auto" }}>
            <div style={{ textAlign: "left", marginBottom: 8 }}>
              <button onClick={() => setLightbox(null)} style={{ background: "none", border: `1px solid ${C.borderGold}`, color: C.goldBright, fontSize: 22, cursor: "pointer", borderRadius: 8, width: 42, height: 42 }}>×</button>
            </div>
            <div style={{ background: "rgba(20,15,12,0.5)", border: `1px solid ${C.borderGold}`, borderRadius: 14, overflow: "hidden" }}>
              {eventLabel(lightbox) && (
                <div style={{ display: "flex", alignItems: "center", gap: 7, padding: "9px 16px", borderBottom: `1px solid ${C.border}`, color: C.goldDim, fontFamily: F.heading, fontSize: 13, fontWeight: 700 }}>
                  <span aria-hidden>🗓️</span>{eventLabel(lightbox)}
                </div>
              )}
              <img src={lightbox.image_url} alt={lightbox.name || ""} style={{ width: "100%", display: "block" }} />
              <ImageMeta im={lightbox} onClose={() => setLightbox(null)} />
            </div>
          </div>
        </div>
      )}

      <style>{`
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
          <Link key={i} to={`/number/${v}`} onClick={onClose} style={{
            textDecoration: "none", color: v === im.primary_value ? "#1a0e00" : C.goldLight,
            background: v === im.primary_value ? C.gold : "rgba(8,5,2,0.5)",
            border: `1px solid ${C.borderGold}`, borderRadius: 999, padding: "3px 11px", fontFamily: F.mono, fontSize: 12, fontWeight: 700,
          }}>{v}</Link>
        ))}
      </div>
    </div>
  );
}
