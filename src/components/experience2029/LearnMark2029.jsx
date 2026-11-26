import React, { useId, useRef, useState } from "react";
import { ENTRY_METHODS_LEARNING_HREF, LEARN_SCOPE } from "../../lib/entryLearn2029.js";
import "./learnMark2029.css";

// ONE page-help action for the whole site (ZURIEL 26.11.2026): "? מה זה?", a quiet 44px text button at the inline-end corner of the page's opening, opening one
// disclosure that closes with Escape or "סגירת ההסבר" and returns focus to the button. The Hall intro (RoyalIntro2029) uses the same label and box. It explains the PAGE
// only; "why is this finding shown" is a different action (the inline "למה?" / ⓘ beside the finding) and never uses this button.
export const PAGE_HELP_LABEL = "מה זה?";
export const MethodsLearningLink = React.lazy(() => import("./MethodsLearningLink2029.jsx"));

export default function LearnMark2029({
  scope = LEARN_SCOPE.CONCEPT,
  label = "איך זה עובד?",
  shortLabel = PAGE_HELP_LABEL,
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
  const trigger = useRef(null);
  // Screen-level help has a short visible name and full accessible context.
  // Inline concept help keeps its existing icon-only compact variant.
  const showLabel = !compact || scope === LEARN_SCOPE.SURFACE;
  const visibleLabel = scope === LEARN_SCOPE.SURFACE ? (shortLabel || label) : label;
  const accessibleLabel = showLabel && visibleLabel !== (ariaLabel || label)
    ? `${visibleLabel} — ${ariaLabel || label}` : (ariaLabel || label);

  const close = () => { setOpen(false); trigger.current?.focus(); };
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
    onKeyDown={event => { if (event.key === "Escape" && open && scope === LEARN_SCOPE.SURFACE) { event.stopPropagation(); close(); } }}
  >
    <button
      ref={trigger}
      type="button"
      className="sod29-learn-mark-trigger"
      onClick={toggle}
      aria-expanded={open}
      aria-controls={panelId}
      aria-label={accessibleLabel}
      style={scope === LEARN_SCOPE.SURFACE ? { gap: 4 } : undefined}
    >
      <span className="sod29-learn-mark-symbol" aria-hidden="true">?</span>
      {showLabel ? <span className="sod29-learn-mark-label">{visibleLabel}</span> : null}
    </button>
    {open ? <div id={panelId} className="sod29-learn-mark-disclosure">
      <div className="sod29-learn-mark-copy">{children}</div>
      {actions || scope === LEARN_SCOPE.SURFACE ? <div className="sod29-learn-mark-actions">
        {actions}
        {scope === LEARN_SCOPE.SURFACE ? <React.Suspense fallback={null}><MethodsLearningLink href={ENTRY_METHODS_LEARNING_HREF} /></React.Suspense> : null}
      </div> : null}
      {scope === LEARN_SCOPE.SURFACE ? <button className="r29-btn is-quiet sod29-learn-mark-close" type="button" onClick={close}>סגירת ההסבר</button> : null}
      {onStillUnclear ? <button className="sod29-learn-mark-help" type="button" onClick={onStillUnclear}><span aria-hidden="true">!</span><span>עדיין לא ברור?</span></button> : null}
      {onDismiss ? <button className="sod29-learn-mark-dismiss" type="button" onClick={() => { setOpen(false); onDismiss(); }}>לא עכשיו</button> : null}
    </div> : null}
  </div>;
}
