import React from "react";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";

export default function ReadingContextRail2029({
  focus,
  onOpenWorld,
  onOpenNumber,
  onAskRaziel,
  onOpenContext,
  connections = [],
}) {
  if (!focus) return null;
  const verified = focus?.verification?.verified === true;
  const cueSignals = [focus.primary, ...(focus.signals || [])].filter(Boolean).slice(0, 2);

  return <>
    <ContextualInspector2029
      className="sod29-reading-rail"
      ariaLabel="מה מתחבר למה שקוראים עכשיו"
      contextId={focus.id}
      kicker="✦ כאן נפתח חיבור"
      title={focus.primary}
      subtitle={focus.label}
      actions={<div className="sod29-reading-rail-actions">
        {focus.number ? <button type="button" onClick={onOpenNumber}>פתח את {focus.number}</button> : null}
        <button type="button" onClick={onOpenWorld}>{focus.worldLabel || "פתח בעולם"}</button>
        <button className="is-raziel" type="button" onClick={onAskRaziel}>✦ שאל את רזיאל</button>
      </div>}
      footer={<button className="sod29-reading-rail-deepen" type="button" onClick={onOpenContext}>
        פתח לעומק
        <span aria-hidden="true">←</span>
      </button>}
    >
      <div className="sod29-reading-rail-signals">
        {verified ? <span><b>✓</b> גימטריה מאומתת · {focus.verification.value}</span> : null}
        {(focus.signals || []).slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
      </div>

      {connections.length ? <div className="sod29-reading-rail-connections" data-experience-capability="post-context-connections">
        {connections.slice(0, 6).map((connection) => connection.href
          ? <a key={connection.id} href={connection.href}><span>{connection.kind}</span><strong>{connection.label}</strong>{connection.value ? <b>{connection.value}</b> : null}</a>
          : <div key={connection.id}><span>{connection.kind}</span><strong>{connection.label}</strong>{connection.value ? <b>{connection.value}</b> : null}</div>)}
      </div> : null}
    </ContextualInspector2029>

    <button
      type="button"
      className="sod29-reading-mobile-cue"
      onClick={onOpenContext}
      aria-label={`פתח חיבורים: ${cueSignals.join(" · ")}`}
    >
      <span className="sod29-reading-mobile-cue-icon">✦</span>
      <span className="sod29-reading-mobile-cue-copy">
        <b>{Math.max(1, focus.signals?.length || 0)} חיבורים כאן</b>
        <small>{cueSignals.join(" · ")}</small>
      </span>
    </button>
  </>;
}