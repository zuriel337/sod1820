import React, { useMemo } from "react";
import { buildEnglishLaneRows } from "../../lib/research/calculator2029English.js";
import "./englishGematriaLane2029.css";

// One presentation child over the existing CalculatorPro/Legacy English adapter.
// Canonical rows stay in the consumer's existing method UI. A preview cannot be
// selected, shared, traced or used as a verified Number/Research result here.
export default function EnglishGematriaLane2029({ expression, canonicalRows = [] }) {
  const rows = useMemo(() => buildEnglishLaneRows(expression, canonicalRows).filter(row => row.previewOnly), [expression, canonicalRows]);
  if (!rows.length) return null;
  return <section className="sod29-english-lane2029" aria-label="גימטריה באנגלית" data-calculation-authority="client-preview-only">
    <header><h3>גימטריה באנגלית</h3><span>תצוגה מקדימה</span></header>
    <p className="sod29-english-lane-expression" dir="ltr">{expression}</p>
    <dl>
      {rows.map(row => <div key={row.methodKey} data-english-method={row.methodKey}>
        <dt><span lang="en" dir="ltr">{row.label}</span><small>{row.hebrewLabel}</small><small dir="auto">{row.note}</small><small>{row.pendingNote}</small></dt>
        <dd><bdi>{row.computedValue ?? "—"}</bdi></dd>
      </div>)}
    </dl>
    <p>אלה חישובי התצוגה של המחשבון הקיים. השיטות האלה עדיין אינן פעילות במסלול הקנוני; התוצאות אינן סימון אימות של הפוסט.</p>
    <p className="sod29-english-lane-scope">נספרות אותיות A–Z בלבד. הכתיב המקורי נשמר; אותיות עבריות וספרות אינן נכללות בחישוב האנגלי.</p>
  </section>;
}
