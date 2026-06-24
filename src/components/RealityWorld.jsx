import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { getRealityHints, getNumberSets, saveNumberSet, deleteNumberSet, getGalleriesForStreamPicker, addImageToRealityStream, setImageCuration } from "../lib/supabase.js";
import ImageEditModal from "./ImageEditModal.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { seenCutoff, markSeenKey, isNewSince } from "../lib/crossesNew.js";
import { computePulse, filterHints, hintNums, domNum, shortDate } from "../lib/reality.js";
import { cleanName } from "../lib/galleryName.js";
import RealityPulse from "./RealityPulse.jsx";
import RealityStream from "./RealityStream.jsx";
import Lightbox from "./Lightbox.jsx";

// ===== «עולם המציאות» — דופק + גלריות-רמזים שמורות + סינון דינמי + קיר חי =====
// «גלריות רמזים» = number_sets שמורים בשם (מתכונת הגלריות הישנה, בצורה חדשה ומתכווננת) —
// מסננים את הזרם לפי הסט. צוריאל (admin) יוצר/עורך/מוחק ומסמן «מומלצת» (show_on_home) —
// מומלצות צפות גם לדף הבית, לעדכונים האחרונים ולדף הגלריות. חוק העץ האחד.
// forceDark = כפיית פלטה כהה (בתוך הארכיון/הגלריה שתמיד שחורים). בבית — הבורר הרגיל.

export default function RealityWorld({ compact = false, forceDark = false, presetSetId = null, showHero = false }) {
  const auto = usePalette();
  const P = forceDark ? PALETTES.dark : auto;
  const { isAdmin } = useAuth();
  const [hints, setHints] = useState(null);
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);   // «גלריית רמזים» שמורה פעילה
  const [value, setValue] = useState(null);           // מספר יחיד לסינון דינמי
  const [pulsePeriod, setPulsePeriod] = useState("week");
  const [streamPeriod, setStreamPeriod] = useState(null); // null=הכל
  const [rare, setRare] = useState(false);
  const [builder, setBuilder] = useState(null);       // {id?, name, numbers:Set} | null
  const [lbIdx, setLbIdx] = useState(null);           // לייטבוקס מאוחד (שולט כשיש Hero)
  const [editImg, setEditImg] = useState(null);        // תמונה שנפתחת לעריכה
  const [picker, setPicker] = useState(null);          // {images, search, loading} | null — כלי הוספה לזרם
  const cutoff = useMemo(() => seenCutoff("home-gallery"), []);

  useEffect(() => {
    getRealityHints(50).then(r => { setHints(r || []); markSeenKey("home-gallery"); }).catch(() => setHints([]));
    reloadSets();
  }, []);

  async function reloadSets() { try { setSets(await getNumberSets()); } catch { /* ignore */ } }

  const pulse = useMemo(() => computePulse(hints || []), [hints]);

  // מספרים נפוצים בזרם — הצעות לבונה גלריות הרמזים
  const numOptions = useMemo(() => {
    const c = {};
    for (const h of hints || []) for (const n of hintNums(h)) c[n] = (c[n] || 0) + 1;
    return Object.entries(c).map(([n, k]) => ({ n: +n, k })).sort((a, b) => b.k - a.k);
  }, [hints]);

  // כמה רמזים בכל «גלריית רמזים» — מציגים רק סטים שיש להם תוכן (מומלצות תחילה)
  const setCounts = useMemo(() => {
    const out = new Map();
    if (!hints) return out;
    for (const s of sets) {
      const ns = new Set(s.numbers || []);
      let c = 0;
      for (const h of hints) if (hintNums(h).some(n => ns.has(n))) c++;
      if (c > 0) out.set(s.id, c);
    }
    return out;
  }, [sets, hints]);
  const liveSets = useMemo(() => sets.filter(s => setCounts.has(s.id))
    .sort((a, b) => (b.show_on_home ? 1 : 0) - (a.show_on_home ? 1 : 0) || setCounts.get(b.id) - setCounts.get(a.id)),
    [sets, setCounts]);

  // קישור-עומק: ?set=<id> בוחר גלריית רמזים אוטומטית
  useEffect(() => {
    if (presetSetId == null || !sets.length) return;
    const s = sets.find(x => String(x.id) === String(presetSetId));
    if (s) setActiveSet(s);
  }, [presetSetId, sets]);

  const filtered = useMemo(() => filterHints(hints || [], {
    value, values: activeSet ? activeSet.numbers : null, period: streamPeriod, rare,
  }), [hints, value, activeSet, streamPeriod, rare]);

  if (hints === null) return <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען את זרם המציאות…</div>;
  if (!hints.length) return null;

  const periodBtn = (key, label) => (
    <button onClick={() => setStreamPeriod(streamPeriod === key ? null : key)} style={chip(P, streamPeriod === key)}>{label}</button>
  );
  const clearAll = () => { setValue(null); setActiveSet(null); setStreamPeriod(null); setRare(false); };
  const noFilter = !value && !activeSet && !streamPeriod && !rare;

  async function saveBuilder() {
    const nums = [...builder.numbers].sort((a, b) => a - b);
    if (!builder.name.trim() || !nums.length) return;
    try { await saveNumberSet({ id: builder.id, name: builder.name.trim(), numbers: nums }); await reloadSets(); setBuilder(null); }
    catch (e) { alert("שמירה נכשלה: " + (e.message || e)); }
  }
  async function removeSet(id) {
    if (!window.confirm("למחוק את גלריית הרמזים?")) return;
    try { await deleteNumberSet(id); if (activeSet?.id === id) setActiveSet(null); await reloadSets(); }
    catch (e) { alert("מחיקה נכשלה: " + (e.message || e)); }
  }
  async function toggleFeature(s) {
    try { await saveNumberSet({ id: s.id, name: s.name, numbers: s.numbers, show_on_home: !s.show_on_home }); await reloadSets(); }
    catch (e) { alert("עדכון נכשל: " + (e.message || e)); }
  }

  async function openPicker(search = "") {
    setPicker({ images: [], search, loading: true });
    try { setPicker({ images: await getGalleriesForStreamPicker({ search }), search, loading: false }); }
    catch { setPicker(null); }
  }
  async function pickerSearch(s) {
    setPicker(p => ({ ...p, search: s, loading: true }));
    try { const imgs = await getGalleriesForStreamPicker({ search: s }); setPicker(p => p ? { ...p, images: imgs, loading: false } : null); }
    catch { /* ignore */ }
  }
  async function addToStream(img) {
    try {
      await addImageToRealityStream(img.id);
      setHints(await getRealityHints(50));
      setPicker(p => p ? { ...p, images: p.images.filter(i => i.id !== img.id) } : null);
    } catch (e) { alert("הוספה נכשלה: " + (e.message || e)); }
  }

  return (
    <div style={{ direction: "rtl" }}>
      <h2 className="hn-h2">🌊 זרם המציאות</h2>
      <p className="hn-sub">גלריה חיה ומתכווננת — המספרים שמתעוררים במציאות. בחרו גלריית-רמזים או סננו לפי מספר.</p>

      <RealityPulse pulse={pulse} period={pulsePeriod} onPeriod={setPulsePeriod} activeValue={value} onPick={setValue} max={compact ? 5 : 8} palette={P} />

      {/* גלריות רמזים — סטים שמורים (מתכונת הגלריות, בצורה חדשה) */}
      {(liveSets.length > 0 || (isAdmin && !compact)) && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🗂️ גלריות רמזים:</span>
          {liveSets.map(s => (
            <span key={s.id} style={{ display: "inline-flex", alignItems: "center", gap: 2 }}>
              <button onClick={() => setActiveSet(activeSet?.id === s.id ? null : s)}
                style={chip(P, activeSet?.id === s.id)} title={(s.numbers || []).join(", ")}>
                {s.show_on_home && <span title="מומלצת — מופיעה בבית" style={{ marginInlineEnd: 4 }}>⭐</span>}
                {s.name} <span style={{ fontFamily: F.mono, fontSize: 11, opacity: 0.75 }}>{setCounts.get(s.id)}</span>
              </button>
              {isAdmin && !compact && (
                <>
                  <button onClick={() => toggleFeature(s)} title={s.show_on_home ? "הסר מהבית" : "הצג בבית/בעדכונים/בגלריות"} style={iconBtn(P, s.show_on_home)}>{s.show_on_home ? "⭐" : "☆"}</button>
                  <button onClick={() => setBuilder({ id: s.id, name: s.name, numbers: new Set(s.numbers || []) })} title="עריכה" style={iconBtn(P)}>✎</button>
                  <button onClick={() => removeSet(s.id)} title="מחיקה" style={iconBtn(P)}>🗑</button>
                </>
              )}
            </span>
          ))}
          {isAdmin && !compact && <button onClick={() => setBuilder({ name: "", numbers: new Set() })} style={{ ...chip(P, false), borderStyle: "dashed" }}>➕ גלריית רמזים</button>}
        </div>
      )}

      {/* בונה גלריות רמזים (admin) */}
      {isAdmin && !compact && builder && (
        <div style={{ border: `1px dashed ${P.borderStrong}`, borderRadius: 14, background: P.cardSoft, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <input value={builder.name} placeholder="שם הגלריה (למשל: דוד המלך)" onChange={e => setBuilder(b => ({ ...b, name: e.target.value }))}
              style={{ background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, color: P.ink, fontFamily: F.body, fontSize: 15, padding: "8px 12px" }} />
            <AddNumber P={P} onAdd={n => setBuilder(b => { const s = new Set(b.numbers); s.add(n); return { ...b, numbers: s }; })} />
            <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>
              {builder.numbers.size} מספרים · {hints.filter(h => hintNums(h).some(n => builder.numbers.has(n))).length} רמזים
            </span>
            <span style={{ flex: 1 }} />
            <button onClick={saveBuilder} style={{ ...chip(P, true), border: "none" }}>💾 שמור</button>
            <button onClick={() => setBuilder(null)} style={chip(P, false)}>ביטול</button>
          </div>
          {builder.numbers.size > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: 10 }}>
              {[...builder.numbers].sort((a, b) => a - b).map(n => (
                <button key={n} onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.delete(n); return { ...b, numbers: s }; })} style={chip(P, true)}>{n} ✕</button>
              ))}
            </div>
          )}
          <div style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 11, marginBottom: 6 }}>הוסף מהמספרים הנפוצים בזרם:</div>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6, maxHeight: 130, overflowY: "auto" }}>
            {numOptions.slice(0, 24).map(({ n, k }) => (
              <button key={n} onClick={() => setBuilder(b => { const s = new Set(b.numbers); s.has(n) ? s.delete(n) : s.add(n); return { ...b, numbers: s }; })}
                style={chip(P, builder.numbers.has(n))}>{n}<span style={{ marginInlineStart: 5, opacity: 0.7, fontSize: 11 }}>{k}</span></button>
            ))}
          </div>
        </div>
      )}

      {/* סרגל חכם — סינון דינמי */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <button onClick={clearAll} style={chip(P, noFilter)}>הכל</button>
        {periodBtn("week", "שבוע אחרון")}
        {periodBtn("month", "חודש")}
        <button onClick={() => setRare(r => !r)} style={chip(P, rare)}>נדיר</button>
        {activeSet && (
          <span style={{ ...chip(P, true), display: "inline-flex", alignItems: "center", gap: 7, cursor: "default" }}>
            🗂️ {activeSet.name}
            <span onClick={() => setActiveSet(null)} style={{ cursor: "pointer" }}>✕</span>
          </span>
        )}
        {value != null && (
          <span style={{ ...chip(P, true), display: "inline-flex", alignItems: "center", gap: 7, cursor: "default" }}>
            מסונן: {value}
            <span onClick={() => setValue(null)} style={{ cursor: "pointer" }}>✕</span>
          </span>
        )}
        <span style={{ flex: 1 }} />
        {isAdmin && <button onClick={() => picker ? setPicker(null) : openPicker()} style={chip(P, picker != null)} title="הוסף תמונה מכל הגלריות לזרם המציאות">🖼️ הוסף לזרם</button>}
        <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>{filtered.length} רמזים</span>
      </div>

      {/* בורר תמונות מהגלריות לזרם (admin) */}
      {picker && (
        <div style={{ border: `1px dashed ${P.borderStrong}`, borderRadius: 14, background: P.cardSoft, padding: 14, marginBottom: 14 }}>
          <div style={{ display: "flex", gap: 10, alignItems: "center", flexWrap: "wrap", marginBottom: 10 }}>
            <input value={picker.search} placeholder="חפש לפי שם, מספר או טקסט…" dir="rtl"
              onChange={e => pickerSearch(e.target.value)}
              style={{ flex: 1, minWidth: 160, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, color: P.ink, fontFamily: F.body, fontSize: 14, padding: "7px 12px" }} />
            <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>{picker.images.length} תמונות</span>
            <button onClick={() => setPicker(null)} style={chip(P, false)}>✕ סגור</button>
          </div>
          {picker.loading
            ? <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, padding: "14px 0" }}>טוען תמונות…</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(90px,1fr))", gap: 8, maxHeight: 340, overflowY: "auto" }}>
                {picker.images.map(img => (
                  <button key={img.id} onClick={() => addToStream(img)} title={`הוסף: ${img.name || img.id}`}
                    style={{ cursor: "pointer", background: "none", border: `1.5px solid ${P.border}`, borderRadius: 10, overflow: "hidden", padding: 0, position: "relative", transition: "border-color .15s" }}>
                    <img src={img.image_url} alt="" style={{ width: "100%", aspectRatio: "1", objectFit: "cover", display: "block" }} />
                    {(img.primary_value ?? (img.all_values || [])[0]) != null && (
                      <span style={{ position: "absolute", bottom: 3, insetInlineStart: 3, background: "rgba(212,175,55,0.92)", color: "#1a0e00", fontFamily: F.mono, fontSize: 10, fontWeight: 800, borderRadius: 999, padding: "1px 5px" }}>
                        {img.primary_value ?? (img.all_values || [])[0]}
                      </span>
                    )}
                    <span style={{ position: "absolute", inset: 0, display: "flex", alignItems: "center", justifyContent: "center", background: "rgba(0,0,0,0)", color: "#fff", fontSize: 22, opacity: 0, transition: "all .15s" }}
                      className="picker-add-overlay">➕</span>
                  </button>
                ))}
                {!picker.images.length && <div style={{ color: P.inkSoft, fontFamily: F.body, fontSize: 13, gridColumn: "1/-1", padding: "20px 0", textAlign: "center" }}>לא נמצאו תמונות מחוץ לזרם</div>}
              </div>
          }
        </div>
      )}

      {/* ===== Hero — הרמז האחרון כ-Hero מסך-מלא (כשיש showHero) ===== */}
      {showHero && filtered.length > 0 && (() => {
        const h = filtered[0];
        const v = domNum(h);
        const title = cleanName(h?.name);
        const date = shortDate(h);
        const isFresh = isNewSince(h, cutoff);
        return (
          <div
            className="rw-hero"
            onClick={() => setLbIdx(0)}
            style={{ cursor: "zoom-in", position: "relative", overflow: "hidden", borderRadius: 18, marginBottom: 18, minHeight: 260 }}
          >
            {h.image_url
              ? <img src={h.image_url} alt={title || ""} style={{ width: "100%", height: "min(60vh, 560px)", objectFit: "contain", display: "block", borderRadius: 18, background: "#09080f" }} />
              : <div style={{ height: 300, background: "linear-gradient(135deg, #1a1200, #0a0a0a)", borderRadius: 18 }} />
            }
            {/* overlay */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 18, background: "linear-gradient(180deg, rgba(0,0,0,0.22) 0%, transparent 32%, transparent 52%, rgba(0,0,0,0.72) 100%)", pointerEvents: "none" }} />
            {/* badge חדש */}
            {isFresh && (
              <span style={{ position: "absolute", top: 14, insetInlineEnd: 14, background: "#e0556a", color: "#fff", fontFamily: F.heading, fontSize: 11, fontWeight: 800, borderRadius: 999, padding: "3px 11px", zIndex: 2, animation: "hn-pulse 1.8s ease-in-out infinite" }}>
                🆕 חדש
              </span>
            )}
            {/* מספר דומיננטי ענק */}
            {v != null && (
              <Link
                to={`/number/${v}`}
                onClick={e => e.stopPropagation()}
                style={{ position: "absolute", top: 14, insetInlineStart: 14, background: "rgba(212,175,55,0.95)", color: "#1a0e00", fontFamily: F.mono, fontWeight: 900, fontSize: "clamp(32px,5vw,62px)", borderRadius: 14, padding: "4px 18px", zIndex: 2, textDecoration: "none", lineHeight: 1.1 }}
              >{v}</Link>
            )}
            {/* מידע תחתי */}
            <div style={{ position: "absolute", bottom: 0, right: 0, left: 0, padding: "18px 20px", zIndex: 2, direction: "rtl" }}>
              {title && <div style={{ color: "#fff", fontFamily: F.regal, fontSize: "clamp(17px,2.5vw,24px)", fontWeight: 700, textShadow: "0 2px 12px rgba(0,0,0,0.8)", marginBottom: 4 }}>{title}</div>}
              {date && <div style={{ color: "rgba(255,255,255,0.65)", fontFamily: F.heading, fontSize: 12.5 }}>🗓️ {date} · לחץ לפתיחה</div>}
            </div>
            {/* גבול זהב */}
            <div style={{ position: "absolute", inset: 0, borderRadius: 18, boxShadow: "inset 0 0 0 1.5px rgba(212,175,55,0.28)", pointerEvents: "none" }} />
          </div>
        );
      })()}

      <RealityStream
        hints={showHero && filtered.length > 0 ? filtered.slice(1) : filtered}
        cutoff={cutoff}
        compact={compact}
        onPick={setValue}
        palette={P}
        onLightbox={showHero ? (_, relIdx) => setLbIdx(1 + relIdx) : undefined}
        onEdit={isAdmin ? h => setEditImg(h) : null}
      />

      {/* לייטבוקס מאוחד — מכסה hero + גריד */}
      {showHero && lbIdx != null && (
        <Lightbox images={filtered} initialIndex={lbIdx} onClose={() => setLbIdx(null)}
          onEdit={isAdmin ? h => { setLbIdx(null); setEditImg(h); } : null} />
      )}

      {/* מודאל עריכה */}
      {editImg && (
        <ImageEditModal
          image={editImg}
          onClose={() => setEditImg(null)}
          onSave={async patch => {
            if (Object.keys(patch).length) {
              await setImageCuration(editImg.id, patch);
              setHints(prev => prev ? prev.map(x => x.id === editImg.id ? { ...x, ...patch } : x) : prev);
            }
            setEditImg(null);
          }}
          onDelete={id => setHints(prev => prev ? prev.filter(x => x.id !== id) : prev)}
          onRemoveFromStream={editImg.source === "update" ? async () => {
            await setImageCuration(editImg.id, { source: "manual" });
            setHints(prev => prev ? prev.filter(x => x.id !== editImg.id) : prev);
            setEditImg(null);
          } : null}
        />
      )}
    </div>
  );
}

function AddNumber({ onAdd, P }) {
  const [v, setV] = useState("");
  const add = () => { const n = parseInt(v, 10); if (!isNaN(n)) { onAdd(n); setV(""); } };
  return (
    <span style={{ display: "inline-flex", gap: 6 }}>
      <input type="number" value={v} placeholder="מספר…" onChange={e => setV(e.target.value)} onKeyDown={e => e.key === "Enter" && add()}
        style={{ width: 92, background: P.card, border: `1px solid ${P.border}`, borderRadius: 8, color: P.ink, fontFamily: F.mono, fontSize: 14, padding: "7px 10px" }} />
      <button onClick={add} style={chip(P, false)}>הוסף +</button>
    </span>
  );
}

const chip = (P, on) => ({
  cursor: "pointer", borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5,
  background: on ? P.accentBtn : P.card, color: on ? P.onAccent : P.ink, border: `1px solid ${on ? P.accentBtn : P.border}`,
});
const iconBtn = (P, on = false) => ({
  cursor: "pointer", background: "none", border: "none", color: on ? P.accentText : P.inkSoft, fontSize: 13, padding: "2px 4px",
});
