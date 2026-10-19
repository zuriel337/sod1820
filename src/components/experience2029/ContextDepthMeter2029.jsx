import React, { useId } from "react";
import { COVERAGE_LABEL } from "../../lib/research/contextDepthProjection2029.js";
import "./contextDepthMeter2029.css";

const methodList = (results) => results.map((r) => `${r.phrase} · ${r.method} ${r.value}`);

function factLine(dim) {
  const f = dim.facts;
  if (dim.key === "calculations") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {methodList(x.results).join(" ; ")}</li>);
  if (dim.key === "links") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {x.direct} קשרים ישירים{x.viaTagsOnly ? " (מתגית בלבד)" : ""}</li>);
  if (dim.key === "convergence") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {x.cards.length ? `${x.cards.length} כרטיסי התכנסות` : "אין כרטיס התכנסות"}</li>);
  if (dim.key === "editor") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {[x.tiers.gold ? `${x.tiers.gold} זהב` : null, x.tiers.silver ? `${x.tiers.silver} כסף` : null,
    x.cardQuality.length ? `איכות עריכתית של כרטיסים (0–10): ${x.cardQuality.map((c) => c.quality).join(", ")}` : null].filter(Boolean).join(" · ") || "אין אצירה"}</li>);
  return null;
}

/**
 * One display component, two instances. `compact` is a button that shows coverage only, from an already
 * derived `depth` (never computed here, never a score); `full` explains every dimension separately.
 * Without derived data it renders nothing, so a list card never triggers a read or invents a state.
 */
export default function ContextDepthMeter2029({ depth, variant = "full", look = "strip", expanded = false, onToggle, selectedValue = null, onSelectValue, children }) {
  const id = useId();
  if (!depth) return null;
  const summary = depth.dimensions.map((d) => `${d.label}: ${d.coverageLabel}`).join(", ");
  if (variant === "compact") {
    return <button type="button" className="sod29-depth-compact" data-look={look} aria-expanded={expanded} aria-controls={`${id}-panel`}
      aria-label={`עומק ההקשר. ${summary}`} onClick={onToggle} data-context-depth-compact>
      <span className="sod29-depth-compact-title">עומק</span>
      <span className="sod29-depth-pips" aria-hidden="true">
        {depth.dimensions.map((d) => <i key={d.key} data-coverage={d.coverage} title={`${d.label}: ${d.coverageLabel}`}>{look === "chips" ? d.label : null}</i>)}
      </span>
    </button>;
  }
  const active = depth.numbers.find((n) => n.value === selectedValue) || null;
  return <section className="sod29-depth" id={`${id}-panel`} aria-label="עומק ההקשר" data-context-depth-full data-audience={depth.audience}>
    <header>
      <small>עומק ההקשר · ללא ציון</small>
      <strong dir="auto">{depth.subject.label}</strong>
      <p>ששה ממדים נפרדים עם מצב כיסוי. אין סיכום אחד ואין ציון: נוסחת המד פתוחה להחלטה.</p>
    </header>
    <ul className="sod29-depth-dims">
      {depth.dimensions.map((d) => <li key={d.key} data-coverage={d.coverage}>
        <div className="sod29-depth-dim-head"><b>{d.label}</b><span className="sod29-depth-chip" data-coverage={d.coverage}>{COVERAGE_LABEL[d.coverage]}</span></div>
        <small>{d.ask}</small>
        {d.facts.length ? <ul className="sod29-depth-facts">{factLine(d)}</ul> : null}
        {d.note ? <p className="sod29-depth-note">{d.note}</p> : null}
      </li>)}
    </ul>
    {depth.dependencies.length ? <p className="sod29-depth-dependency" role="note">
      {depth.dependencies.map((d) => `״${d.phrase}״ מופיע ב־${d.hits.map((h) => `${h.value} (${h.method})`).join(" וב־")}`).join("; ")}.
      אלה שיטות שונות על אותו ביטוי, כלומר משפחת חישוב אחת תלויה ולא שני עדים עצמאיים.
    </p> : null}
    <nav className="sod29-depth-numbers" aria-label="המספרים בפוסט">
      {depth.numbers.map((n) => <button key={n.value} type="button" aria-pressed={n.value === selectedValue} onClick={() => onSelectValue?.(n.value === selectedValue ? null : n.value)}>
        <b dir="ltr">{n.value}</b><small>{n.source?.kind || ""}</small></button>)}
    </nav>
    {active ? <div className="sod29-depth-number" data-number={active.value}>
      <h4 dir="ltr">{active.value}</h4>
      {active.source ? <p>מקור בפוסט: {active.source.note}</p> : null}
      <p>{active.verified.length ? `חישוב מאומת: ${methodList(active.verified).join(" ; ")}` : "אין חישוב מאומת הקשור לפוסט"}</p>
      <p>{active.meterRead ? `שכבות התכנסות פעילות: ${active.layers.filter((l) => l.ok).map((l) => l.name).join(" · ") || "אין"}` : "שכבות ההתכנסות טרם נקראו"}</p>
      {active.existingMeter != null ? <details><summary>פרטי המנוע הקיים</summary>
        <p>מד ההתכנסות הקיים החזיר {active.existingMeter}. זה אינו ציון עוצמה של הפוסט או של האירוע, ואינו משתנה כאן.</p></details> : null}
    </div> : null}
    {children}
  </section>;
}
