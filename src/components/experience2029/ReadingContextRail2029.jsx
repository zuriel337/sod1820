import React from "react";

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
    <aside
      className="sod29-reading-rail"
      aria-label="מה מתחבר למה שקוראים עכשיו"
      data-reading-focus={focus.id}
    >
      <div className="sod29-reading-rail-kicker">✦ כאן נפתח חיבור</div>
      <strong className="sod29-reading-rail-primary">{focus.primary}</strong>
      <span className="sod29-reading-rail-label">{focus.label}</span>

      <div className="sod29-reading-rail-signals">
        {verified ? <span><b>✓</b> גימטריה מאומתת · {focus.verification.value}</span> : null}
        {(focus.signals || []).slice(0, 3).map((signal) => <span key={signal}>{signal}</span>)}
      </div>

      {connections.length ? <div className="sod29-reading-rail-connections" data-experience-capability="post-context-connections">
        {connections.slice(0, 6).map((connection) => connection.href
          ? <a key={connection.id} href={connection.href}><span>{connection.kind}</span><strong>{connection.label}</strong>{connection.value ? <b>{connection.value}</b> : null}</a>
          : <div key={connection.id}><span>{connection.kind}</span><strong>{connection.label}</strong>{connection.value ? <b>{connection.value}</b> : null}</div>)}
      </div> : null}

      <div className="sod29-reading-rail-actions">
        {focus.number ? <button type="button" onClick={onOpenNumber}>פתח את {focus.number}</button> : null}
        <button type="button" onClick={onOpenWorld}>{focus.worldLabel || "פתח בעולם"}</button>
        <button className="is-raziel" type="button" onClick={onAskRaziel}>✦ שאל את רזיאל</button>
      </div>

      <button className="sod29-reading-rail-deepen" type="button" onClick={onOpenContext}>
        פתח לעומק
        <span aria-hidden="true">←</span>
      </button>
    </aside>

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