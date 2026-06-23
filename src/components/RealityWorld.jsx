import React, { useEffect, useMemo, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getRealityHints, getNumberSets } from "../lib/supabase.js";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import { computePulse, filterHints, hintNums } from "../lib/reality.js";
import RealityPulse from "./RealityPulse.jsx";
import RealityStream from "./RealityStream.jsx";

// ===== «עולם המציאות» — המוצר: דופק (חם עכשיו) + גלריות-רמזים שמורות + סינון דינמי + קיר חי =====
// טוען את הרמזים פעם אחת (source='update') ומחשב הכל בצד-לקוח. compact = גרסת דף הבית.
// «גלריות רמזים» = number_sets שמורים בשם (מתכונת הגלריות הישנה, בצורה חדשה ומתכווננת) —
// מסננים את הזרם לפי הסט. לצדן סינון דינמי חופשי (דופק/שבוע/חודש/נדיר/מספר). חוק העץ האחד.

export default function RealityWorld({ compact = false }) {
  const P = usePalette();
  const [hints, setHints] = useState(null);
  const [sets, setSets] = useState([]);
  const [activeSet, setActiveSet] = useState(null);   // «גלריית רמזים» שמורה פעילה
  const [value, setValue] = useState(null);           // מספר יחיד לסינון דינמי
  const [pulsePeriod, setPulsePeriod] = useState("week");
  const [streamPeriod, setStreamPeriod] = useState(null); // null=הכל
  const [rare, setRare] = useState(false);
  const cutoff = useMemo(() => seenCutoff("home-gallery"), []);

  useEffect(() => {
    getRealityHints(1000).then(r => { setHints(r || []); markSeenKey("home-gallery"); }).catch(() => setHints([]));
    getNumberSets().then(setSets).catch(() => {});
  }, []);

  const pulse = useMemo(() => computePulse(hints || []), [hints]);

  // כמה רמזים בכל «גלריית רמזים» — מציגים רק סטים שיש להם תוכן בזרם
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
  const liveSets = useMemo(() => sets.filter(s => setCounts.has(s.id)), [sets, setCounts]);

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

  return (
    <div style={{ direction: "rtl" }}>
      <h2 className="hn-h2">🌊 זרם המציאות</h2>
      <p className="hn-sub">גלריה חיה ומתכווננת — המספרים שמתעוררים במציאות. בחרו גלריית-רמזים או סננו לפי מספר.</p>

      <RealityPulse pulse={pulse} period={pulsePeriod} onPeriod={setPulsePeriod} activeValue={value} onPick={setValue} max={compact ? 5 : 8} />

      {/* גלריות רמזים — סטים שמורים (מתכונת הגלריות, בצורה חדשה) */}
      {liveSets.length > 0 && (
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 12 }}>
          <span style={{ color: P.accentText, fontFamily: F.heading, fontSize: 12.5, fontWeight: 800 }}>🗂️ גלריות רמזים:</span>
          {liveSets.map(s => (
            <button key={s.id} onClick={() => setActiveSet(activeSet?.id === s.id ? null : s)}
              style={chip(P, activeSet?.id === s.id)} title={(s.numbers || []).join(", ")}>
              {s.name} <span style={{ fontFamily: F.mono, fontSize: 11, opacity: 0.75 }}>{setCounts.get(s.id)}</span>
            </button>
          ))}
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

      <RealityStream hints={filtered} cutoff={cutoff} compact={compact} onPick={setValue} />
    </div>
  );
}

const chip = (P, on) => ({
  cursor: "pointer", borderRadius: 999, padding: "6px 14px", fontFamily: F.heading, fontWeight: 700, fontSize: 13.5,
  background: on ? P.accentBtn : P.card, color: on ? P.onAccent : P.ink, border: `1px solid ${on ? P.accentBtn : P.border}`,
});
