import React, { useEffect, useMemo, useState } from "react";
import { F } from "../theme.js";
import { usePalette } from "../lib/palette.js";
import { getRealityHints } from "../lib/supabase.js";
import { seenCutoff, markSeenKey } from "../lib/crossesNew.js";
import { computePulse, filterHints } from "../lib/reality.js";
import RealityPulse from "./RealityPulse.jsx";
import RealityStream from "./RealityStream.jsx";

// ===== «עולם המציאות» — המוצר: דופק (חם עכשיו) + סרגל חכם + זרם אינסופי =====
// טוען את הרמזים פעם אחת (source='update') ומחשב הכל בצד-לקוח. compact = גרסת דף הבית.
// מקור יחיד לזרם, לדופק ולסינון — חוק העץ האחד.

export default function RealityWorld({ compact = false }) {
  const P = usePalette();
  const [hints, setHints] = useState(null);
  const [value, setValue] = useState(null);       // מספר פעיל לסינון
  const [pulsePeriod, setPulsePeriod] = useState("week");
  const [streamPeriod, setStreamPeriod] = useState(null); // null=הכל
  const [rare, setRare] = useState(false);
  const cutoff = useMemo(() => seenCutoff("home-gallery"), []);

  useEffect(() => {
    getRealityHints(1000).then(r => { setHints(r || []); markSeenKey("home-gallery"); }).catch(() => setHints([]));
  }, []);

  const pulse = useMemo(() => computePulse(hints || []), [hints]);
  const filtered = useMemo(() => filterHints(hints || [], { value, period: streamPeriod, rare }), [hints, value, streamPeriod, rare]);

  if (hints === null) return <div style={{ textAlign: "center", color: P.inkSoft, fontFamily: F.body, padding: 40 }}>טוען את זרם המציאות…</div>;
  if (!hints.length) return null;

  const periodBtn = (key, label) => (
    <button onClick={() => setStreamPeriod(streamPeriod === key ? null : key)}
      style={chip(P, streamPeriod === key)}>{label}</button>
  );

  return (
    <div style={{ direction: "rtl" }}>
      <h2 className="hn-h2">🌊 זרם המציאות</h2>
      <p className="hn-sub">המספרים החיים — מה חם עכשיו במציאות. לחצו מספר לסינון הזרם.</p>

      <RealityPulse pulse={pulse} period={pulsePeriod} onPeriod={setPulsePeriod} activeValue={value} onPick={setValue} max={compact ? 5 : 8} />

      {/* סרגל חכם */}
      <div style={{ display: "flex", gap: 8, flexWrap: "wrap", alignItems: "center", marginBottom: 16 }}>
        <button onClick={() => { setValue(null); setStreamPeriod(null); setRare(false); }} style={chip(P, !value && !streamPeriod && !rare)}>הכל</button>
        {periodBtn("week", "שבוע אחרון")}
        {periodBtn("month", "חודש")}
        <button onClick={() => setRare(r => !r)} style={chip(P, rare)}>נדיר</button>
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
