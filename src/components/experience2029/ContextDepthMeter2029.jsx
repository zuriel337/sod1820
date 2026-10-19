import React, { useId } from "react";
import { COVERAGE_LABEL, measured, flagLabel, NOT_MEASURED } from "../../lib/research/contextDepthProjection2029.js";
import "./contextDepthMeter2029.css";

const methodList = (results) => results.map((r) => `${r.phrase} · ${r.method} ${r.value}`);
const groupLabel = (ref) => String(ref).replace(/^post:/, "פוסט ");
const direct = (n) => (n === 1 ? "קשר ישיר אחד" : `${n} קשרים ישירים`);
// Compact looks. `strip` is the approved default; the others exist for the visual comparison.
// All of them show coverage per dimension, never a total.
const ICON = Object.freeze({
  calculations: <><path d="M5 8h10M5 12h10" /><path d="M13 4l-6 12" /></>,
  links: <><circle cx="4.5" cy="10" r="1.8" /><circle cx="15.5" cy="4.5" r="1.8" /><circle cx="15.5" cy="15.5" r="1.8" /><path d="M6.2 9.2l7.6-4M6.2 10.8l7.6 4" /></>,
  convergence: <><path d="M3 4l7 6-7 6M17 4l-7 6 7 6" /></>,
  independence: <><circle cx="5" cy="6" r="2" /><circle cx="15" cy="6" r="2" /><circle cx="10" cy="15" r="2" /></>,
  editor: <><path d="M10 3l2 4.5 4.8.5-3.6 3.2 1 4.8L10 13.6 5.8 16l1-4.8L3.2 8l4.8-.5z" /></>,
  approval: <><path d="M4 10.5l4 4 8-9" /></>,
});
const RADAR_LEVEL = Object.freeze({ full: 1, partial: 0.6, none: 0.18, unmapped: 0.1 });
const missingOf = (depth) => depth.dimensions.filter((d) => d.coverage === "none" || d.coverage === "unmapped").map((d) => d.label);
function Radar({ depth }) {
  const pts = depth.dimensions.map((d, i) => {
    const a = (-90 + i * (360 / depth.dimensions.length)) * (Math.PI / 180), r = 16 * RADAR_LEVEL[d.coverage];
    return [20 + r * Math.cos(a), 20 + r * Math.sin(a)];
  });
  const ring = depth.dimensions.map((_, i) => { const a = (-90 + i * 60) * (Math.PI / 180); return `${20 + 16 * Math.cos(a)},${20 + 16 * Math.sin(a)}`; }).join(" ");
  return <svg className="sod29-depth-radar" viewBox="0 0 40 40" aria-hidden="true">
    <polygon points={ring} className="ring" />
    {depth.dimensions.map((_, i) => { const a = (-90 + i * 60) * (Math.PI / 180); return <line key={i} x1="20" y1="20" x2={20 + 16 * Math.cos(a)} y2={20 + 16 * Math.sin(a)} className="spoke" />; })}
    <polygon points={pts.map((q) => q.join(",")).join(" ")} className="shape" />
  </svg>;
}

const SOURCE_KIND = Object.freeze({ post_body: "גוף הפוסט", tag: "תגית", plan_doc: "מסמך תכנון" });

function factLine(dim) {
  const f = dim.facts;
  if (dim.key === "calculations") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {methodList(x.results).join(" ; ")}</li>);
  if (dim.key === "links") return [
    ...f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {direct(x.direct)}{x.viaTagsOnly ? " (מתגית בלבד)" : ""}{x.media ? ` · ועוד ${x.media} תמונות` : ""}</li>),
    ...(dim.unread || []).map((v) => <li key={`u${v}`}><b dir="ltr">{v}</b> — {NOT_MEASURED}</li>)];
  if (dim.key === "convergence") return [
    ...f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {x.cards.length ? `${x.cards.length} כרטיסי התכנסות` : "אין כרטיס התכנסות"}</li>),
    ...(dim.unread || []).map((v) => <li key={`u${v}`}><b dir="ltr">{v}</b> — {NOT_MEASURED}</li>)];
  if (dim.key === "editor") return f.map((x) => <li key={x.value}><b dir="ltr">{x.value}</b> — {[x.tiers.gold ? `${x.tiers.gold} זהב` : null, x.tiers.silver ? `${x.tiers.silver} כסף` : null,
    x.cardQuality.length ? `איכות עריכתית של כרטיסים (0–10): ${x.cardQuality.map((c) => measured(c.quality)).join(", ")}` : null].filter(Boolean).join(" · ") || "אין אצירה"}</li>);
  if (dim.key === "independence" && f[0]) return <li>מקורות שזוהו בנתונים שהוצגו: {f[0].groups.length} ({f[0].groups.map(groupLabel).join(", ")})</li>;
  return null;
}

/** Three distinct layers for one expression: where it is written, whether the engine reproduced it, how it is framed. */
function ExpressionLayers({ expr }) {
  const c = expr.calculation;
  return <article className="sod29-depth-expr" data-expression={expr.phrase}>
    <h5 dir="auto">״{expr.phrase}״</h5>
    <ol className="sod29-depth-layers">
      <li data-layer="source">
        <b>1 · מקור הביטוי</b>
        <ul>{expr.source.items.map((s, i) => <li key={i}><em>{SOURCE_KIND[s.kind] || s.kind}</em> · {s.locator ? `${s.locator}: ` : ""}<q dir="auto">{s.quote}</q></li>)}</ul>
        <small>{expr.source.groups.length ? `קבוצות מקור: ${expr.source.groups.length} (${expr.source.groups.map(groupLabel).join(", ")}). תגית וגוף הפוסט נספרים כקבוצה אחת.` : "לא זוהה מקור."}</small>
      </li>
      <li data-layer="calculation">
        <b>2 · אימות החישוב</b>
        {c ? <>
          <p>{flagLabel(c.reproducesClaim, "המנוע הקנוני שחזר את הערך הנטען", "המנוע לא שחזר את הערך הנטען")}: <b dir="ltr">{measured(c.value)}</b> · {c.method}</p>
          <small>רשומת מאגר: {flagLabel(c.rowVerified, "מאומתת", "לא מאומתת")} · {flagLabel(c.rowPublished, "מפורסמת", "לא מפורסמת")}</small>
        </> : <p>{NOT_MEASURED}</p>}
      </li>
      <li data-layer="interpretation">
        <b>3 · הקשר פרשני</b>
        {expr.interpretation ? <><p dir="auto">{expr.interpretation.text}</p><small>{expr.interpretation.attestedBy}. זו פרשנות ואינה אימות חישוב.</small></> : <p>אין הקשר פרשני מתועד.</p>}
      </li>
    </ol>
  </article>;
}

/**
 * One display component, two instances. `compact` is a button with six dimension strips that shows coverage
 * only, from an already-derived `depth` (never computed here, never a score); `full` labels and explains every
 * dimension separately. Without derived data it renders nothing, so a list card never triggers a read or
 * invents a state.
 */
export default function ContextDepthMeter2029({ depth, variant = "full", look = "strip", expanded = false, onToggle, panelId = null, selectedValue = null, onSelectValue, children }) {
  const autoId = useId();
  const id = panelId || autoId;
  if (!depth) return null;
  const summary = depth.dimensions.map((d) => `${d.label}: ${d.coverageLabel}`).join(", ");
  if (variant === "compact") {
    const missing = look === "missing" ? missingOf(depth) : null;
    return <button type="button" className="sod29-depth-compact" data-look={look} aria-expanded={expanded} aria-controls={id}
      aria-label={`עומק ההקשר. ${summary}`} onClick={onToggle} data-context-depth-compact>
      <span className="sod29-depth-compact-title">עומק</span>
      {look === "radar" ? <Radar depth={depth} /> : look === "icons" ? <span className="sod29-depth-icons" aria-hidden="true">
        {depth.dimensions.map((d) => <i key={d.key} data-coverage={d.coverage} title={`${d.label}: ${d.coverageLabel}`}>
          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">{ICON[d.key]}</svg></i>)}
      </span> : <span className="sod29-depth-pips" aria-hidden="true">
        {depth.dimensions.map((d) => <i key={d.key} data-coverage={d.coverage} title={`${d.label}: ${d.coverageLabel}`}>{look === "chips" ? d.label : null}</i>)}
      </span>}
      {missing ? <span className="sod29-depth-missing">{missing.length ? `חסר: ${missing.join(", ")}` : "אין פערים"}</span> : null}
    </button>;
  }
  const active = depth.numbers.find((n) => n.value === selectedValue) || null;
  return <section className="sod29-depth" id={panelId ? undefined : `${id}-panel`} aria-label="עומק ההקשר" data-context-depth-full data-audience={depth.audience}>
    <header>
      <small>עומק ההקשר · ללא ציון</small>
      <strong dir="auto">{depth.subject.label}</strong>
      <p>ששה ממדים נפרדים עם מצב כיסוי. אין סיכום אחד ואין ציון: נוסחת המד פתוחה להחלטה.</p>
    </header>
    <ul className="sod29-depth-dims">
      {depth.dimensions.map((d) => <li key={d.key} data-coverage={d.coverage}>
        <div className="sod29-depth-dim-head"><b>{d.label}</b><span className="sod29-depth-chip" data-coverage={d.coverage}>{COVERAGE_LABEL[d.coverage]}</span></div>
        <small>{d.ask}</small>
        {d.facts.length || d.unread?.length ? <ul className="sod29-depth-facts">{factLine(d)}</ul> : null}
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
      {active.source ? <p>{active.source.note}</p> : null}
      {active.expressions.length ? active.expressions.map((e) => <ExpressionLayers key={e.phrase} expr={e} />)
        : <p>{active.verified.length ? `חישוב מאומת: ${methodList(active.verified).join(" ; ")}` : "אין חישוב מאומת הקשור לפוסט."}</p>}
      {active.openQuestions.map((q) => <p key={q.text} className="sod29-depth-dependency" role="note">שאלה פתוחה: {q.text}</p>)}
      <p>{active.meterRead ? `שכבות התכנסות פעילות במאגר: ${active.layers.filter((l) => l.ok).map((l) => l.name).join(" · ") || "אין"}. אלה התכנסויות של מילים אחרות לאותו מספר ואינן מהפוסט.` : `שכבות ההתכנסות: ${NOT_MEASURED}`}</p>
      {active.existingMeter != null ? <details><summary>פרטי המנוע הקיים</summary>
        <p>מד ההתכנסות הקיים החזיר {active.existingMeter}. זה אינו ציון עוצמה של הפוסט או של האירוע, ואינו משתנה כאן.</p></details> : null}
    </div> : null}
    {children}
  </section>;
}
