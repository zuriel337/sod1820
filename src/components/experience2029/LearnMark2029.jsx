import React, { useId, useState } from "react";
import { LEARN_SCOPE } from "../../lib/entryLearn2029.js";
import "./learnMark2029.css";

export default function LearnMark2029({
  scope = LEARN_SCOPE.CONCEPT,
  label = "איך זה עובד?",
  shortLabel = "איך זה עובד?",
  compact = false,
  prominent = false,
  children = null,
  actions = null,
  onOpen = null,
  onDismiss = null,
  onStillUnclear = null,
  ariaLabel = null,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();
  // Screen-level help has a short visible name and full accessible context.
  // Inline concept help keeps its existing icon-only compact variant.
  const showLabel = !compact || scope === LEARN_SCOPE.SURFACE;
  const visibleLabel = scope === LEARN_SCOPE.SURFACE ? (shortLabel || label) : label;
  const accessibleLabel = showLabel && visibleLabel !== (ariaLabel || label)
    ? `${visibleLabel} — ${ariaLabel || label}` : (ariaLabel || label);

  const toggle = () => {
    const next = !open;
    setOpen(next);
    if (next) onOpen?.();
  };

  return <div
    className={[
      "sod29-learn-mark",
      `scope-${scope}`,
      compact ? "is-compact" : "",
      showLabel ? "has-visible-label" : "",
      prominent ? "is-prominent" : "",
      open ? "is-open" : "",
      className,
    ].filter(Boolean).join(" ")}
    data-learn-scope={scope}
  >
    <button
      type="button"
      className="sod29-learn-mark-trigger"
      onClick={toggle}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={accessibleLabel}
    >
      <span className="sod29-learn-mark-symbol" aria-hidden="true">?</span>
      {showLabel ? <span className="sod29-learn-mark-label">{visibleLabel}</span> : null}
    </button>
    {open ? <div id={panelId} className="sod29-learn-mark-disclosure">
      <div className="sod29-learn-mark-copy">{children}</div>
      {actions ? <div className="sod29-learn-mark-actions">{actions}</div> : null}
      {onStillUnclear ? <button className="sod29-learn-mark-help" type="button" onClick={onStillUnclear}><span aria-hidden="true">!</span><span>עדיין לא ברור?</span></button> : null}
      {onDismiss ? <button className="sod29-learn-mark-dismiss" type="button" onClick={() => { setOpen(false); onDismiss(); }}>לא עכשיו</button> : null}
    </div> : null}
  </div>;
}
