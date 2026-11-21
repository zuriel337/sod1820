import React, { useEffect, useState } from "react";
import { readAdaptivePulse, pulseCount } from "../../lib/researchPulse2029.js";
import "../experience2029/nowPulseLine2029.css";

// Calculator line (ZURIEL 21.11.2026): ONE line above the word of the day — the numbers being opened now and how many
// gematria calculations were made, from the one public reader (research_pulse_2029) in its adaptive window. Values and
// counts only: no typed text, no people counted. Without data it is a quiet link to /stats, never an empty box.
export default function CalculatorPulseLine2029({ read = readAdaptivePulse }) {
  const [r, setR] = useState(null);
  useEffect(() => { let live = true; read().then(x => live && setR(x), () => {}); return () => { live = false; }; }, [read]);
  const d = r?.data;
  const numbers = (d?.numbers || []).slice(0, 5);
  const computes = pulseCount(d?.totals?.human?.computes);
  const empty = !numbers.length && !computes;
  return <nav className="nowpulse29" dir="rtl" aria-label="מה מחשבים ופותחים עכשיו" data-calculator-pulse>
    <span className="nowpulse29-items">
      {empty ? "מה קורה באתר" : <>
        {numbers.length ? <>נפתחים עכשיו: {numbers.map((x, i) => <React.Fragment key={x.n}>{i ? <span aria-hidden="true"> · </span> : null}<a href={"/number/" + x.n}>{x.n.toLocaleString("he-IL")}</a></React.Fragment>)}</> : null}
        {numbers.length && computes ? <span aria-hidden="true"> · </span> : null}
        {computes ? <span>{computes} חישובים ב{r.label}</span> : null}
      </>}
    </span>
    <a className="nowpulse29-more" href="/stats">סטטיסטיקה ›</a>
  </nav>;
}
