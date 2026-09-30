import React from "react";

/**
 * Shared semantic shell for the desktop Contextual Inspector.
 *
 * It does not own graph, truth, ranking, timeline or Raziel state. Each surface
 * supplies already-governed contextual content and actions. On constrained
 * layouts a surface may project the same capability into a sheet/cue instead.
 */
export default function ContextualInspector2029({
  ariaLabel = "הקשר",
  className = "",
  contextId = null,
  kicker = null,
  title = null,
  subtitle = null,
  children = null,
  actions = null,
  footer = null,
}) {
  return <aside
    className={className}
    aria-label={ariaLabel}
    data-experience-capability="contextual-inspector"
    data-context-id={contextId || undefined}
  >
    {kicker ? <div className="sod29-context-inspector-kicker">{kicker}</div> : null}
    {title ? <strong className="sod29-context-inspector-title">{title}</strong> : null}
    {subtitle ? <span className="sod29-context-inspector-subtitle">{subtitle}</span> : null}
    {children}
    {actions ? <div data-experience-capability="contextual-inspector-actions">{actions}</div> : null}
    {footer}
  </aside>;
}
