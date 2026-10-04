import React from "react";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";

export default function SurfaceContextRail2029({
  focus,
  context,
  onOpenNumber,
  onOpenWorld,
  onAskRaziel,
  onOpenContext,
  compact = false,
}) {
  const subject = focus || context?.dimensions?.surfaceFocus || context?.selection || context?.subject || null;
  if (!subject) return null;
  const number = Number(subject.number ?? subject.resultValue ?? (subject.type === "number" ? subject.id : null));
  const hasNumber = Number.isSafeInteger(number);
  const title = String(subject.primary || subject.label || subject.expression || subject.id || "הקשר פעיל");
  const subtitle = String(subject.sectionLabel || subject.subtitle || subject.type || "");
  const signals = Array.isArray(subject.signals) ? subject.signals.filter(Boolean).slice(0, 4) : [];

  return <>
    <ContextualInspector2029
      className={`sod29-surface-context-rail${compact ? " is-compact" : ""}`}
      ariaLabel="ההקשר הפעיל"
      contextId={subject.id || subject.entityId || subject.locator || title}
      kicker={subject.kicker || "מה פעיל עכשיו"}
      title={title}
      subtitle={subtitle}
      actions={<div className="sod29-surface-context-actions">
        {hasNumber ? <button type="button" onClick={() => onOpenNumber?.({ id: String(number), type: "number", label: String(number), href: `/2029/number/${number}` })}>פתח את {number}</button> : null}
        <button type="button" onClick={onOpenWorld}>פתח בעולם</button>
        <button className="is-raziel" type="button" onClick={onAskRaziel}>✦ שאל את רזיאל</button>
      </div>}
      footer={<button className="sod29-surface-context-deepen" type="button" onClick={onOpenContext}>פתח לעומק <span aria-hidden="true">←</span></button>}
    >
      {subject.expression ? <div className="sod29-surface-context-expression"><span>{subject.expression}</span>{subject.method ? <small>{subject.method}</small> : null}{subject.resultValue != null ? <b>{subject.resultValue}</b> : null}</div> : null}
      {signals.length ? <div className="sod29-surface-context-signals">{signals.map((signal) => <span key={signal}>{signal}</span>)}</div> : null}
      {subject.sourceLabel ? <small className="sod29-surface-context-source">מקור · {subject.sourceLabel}</small> : null}
    </ContextualInspector2029>
    <button className="sod29-surface-context-mobile-cue" type="button" onClick={onOpenContext}>
      <span>✦</span><b>{title}</b><small>{hasNumber ? number : subtitle}</small>
    </button>
  </>;
}
