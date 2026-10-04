import React, { useId, useState } from "react";
import { LEARN_SCOPE } from "../../lib/entryLearn2029.js";
import "./learnMark2029.css";

export default function LearnMark2029({
  scope = LEARN_SCOPE.CONCEPT,
  label = "איך זה עובד?",
  compact = false,
  prominent = false,
  children = null,
  actions = null,
  onOpen = null,
  onDismiss = null,
  ariaLabel = null,
  className = "",
}) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

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
      aria-label={ariaLabel || label}
    >
      <span className="sod29-learn-mark-symbol" aria-hidden="true">?</span>
      {!compact ? <span className="sod29-learn-mark-label">{label}</span> : null}
    </button>
    {open ? <div id={panelId} className="sod29-learn-mark-disclosure">
      <div className="sod29-learn-mark-copy">{children}</div>
      {actions ? <div className="sod29-learn-mark-actions">{actions}</div> : null}
      {onDismiss ? <button className="sod29-learn-mark-dismiss" type="button" onClick={() => { setOpen(false); onDismiss(); }}>לא עכשיו</button> : null}
    </div> : null}
  </div>;
}
