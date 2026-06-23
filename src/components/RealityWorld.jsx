import React, { useEffect, useMemo, useState } from "react";
import { F } from "../theme.js";
import { usePalette, PALETTES } from "../lib/palette.js";
import { getRealityHints, getNumberSets, saveNumberSet, deleteNumberSet } from "../lib/supabase.js";
import { useAuth } from "../lib/AuthContext.jsx";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import { computePulse, filterHints, hintNums } from "../lib/reality.js";
import RealityPulse from "./RealityPulse.jsx";
import RealityStream from "./RealityStream.jsx";

// ===== «עולם המציאות» — דופק + גלריות-רמזים שמורות + סינון דינמי + קיר חי =====
// «גלריות רמזים» = number_sets שמורים בשם (מתכונת הגלריות הישנה, בצורה חדשה ומתכווננת) —
// מסננים את הזרם לפי הסט. צוריאל (admin) יוצר/עורך/מוחק ומסמן «מומלצת» (show_on_home) —
// מומלצות צפות גם לדף הבית, לעדכונים האחרונים ולדף הגלריות. חוק העץ האחד.
// forceDark = כפיית פלטה כהה (בתוך הארכיון/הגלריה שתמיד שחורים). בבית — הבורר הרגיל.

export default function RealityWorld({ compact = false, forceDark = false, presetSetId = null }) {
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
  const cutoff = useMemo(() => seenCutoff("home-gallery"), []);

  useEffect(() => {
    getRealityHints(1000).then(r => { setHints(r || []); markSeenKey("home-gallery"); }).catch(() => setHints([]));
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
          <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
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
        <span style={{ color: P.inkSoft, fontFamily: F.heading, fontSize: 12 }}>{filtered.length} רמזים</span>
      </div>

      <RealityStream hints={filtered} cutoff={cutoff} compact={compact} onPick={setValue} palette={P} />
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
