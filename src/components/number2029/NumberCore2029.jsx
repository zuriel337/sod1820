import React from "react";
import "./numberCore2029.css";

export default function NumberCore2029({
  projection,
  mode = "page",
  traceState = null,
  traceOpen = false,
  traceSteps = [],
  onMethodSelect,
  onToggleTrace,
  onOpenCrossing,
  onOpenZero,
  onOpenPage,
  onOpenWorld,
  onOpenResult,
  onRazielAction,
  onExpandRaziel,
} = {}) {
  if (!projection) return null;
  const compact = mode === "drawer";
  const root = projection.root;
  const active = projection.selectedMethod;
  const result = active?.computedValue ?? projection.activeResult ?? null;
  const zero = projection.zeroScale;
  const crossing = projection.crossing;
  const raziel = projection.razielMicro;
  const methods = Array.isArray(projection.methods) ? projection.methods : [];

  return <section className={`sod29-number-core2029 ${compact ? "is-drawer" : "is-page"}`} data-number-core-root={root}>
    <header className="sod29-number-core2029-head">
      <div>
        <span className="sod29-number-core2029-kicker">NUMBER CORE · ONE STATE</span>
        <strong className="sod29-number-core2029-expression">{projection.expression || root}</strong>
      </div>
      <div className="sod29-number-core2029-root">
        <small>Root</small>
        <b>{root}</b>
      </div>
    </header>

    <div className="sod29-number-core2029-active">
      <div>
        <span>{active?.displayLabel || "שיטה פעילה"}</span>
        <strong>{result != null ? result : "—"}</strong>
      </div>
      <small>{result != null && Number(result) !== Number(root) ? `תוצאה פעילה · ה־Root נשאר ${root}` : "התוצאה הפעילה יושבת על ה־Root"}</small>
      {result != null && Number(result) !== Number(root) && onOpenResult ? <button type="button" onClick={() => onOpenResult(result)}>פתח {result}</button> : null}
    </div>

    <div className="sod29-number-core2029-methods" aria-label="שיטות גימטריה">
      {methods.map((method) => {
        const selected = method.methodKey === active?.methodKey;
        return <button
          type="button"
          key={method.methodKey}
          className={selected ? "is-active" : ""}
          aria-pressed={selected}
          onClick={() => onMethodSelect?.(method.methodKey)}
        >
          <span>{method.displayLabel}</span>
          <strong>{method.computedValue ?? "—"}</strong>
        </button>;
      })}
    </div>

    <div className="sod29-number-core2029-upper-grid">
      {crossing ? <article className="sod29-number-core2029-crossing">
        <div className="sod29-number-core2029-label"><span>✦</span><b>הצלבה</b><small>{crossing.methodCount} שיטות</small></div>
        <strong>{projection.expression}</strong>
        <span className="sod29-number-core2029-cross-eq">↕ {root} ↕</span>
        <strong>{crossing.partner}</strong>
        <div className="sod29-number-core2029-method-tags">{crossing.methods.map((method) => <span key={method.methodKey}>{method.methodLabel}</span>)}</div>
        <p>הצלבה חישובית מאומתת דרך ה־projection; המשמעות המחקרית נשארת נפרדת.</p>
        <button type="button" onClick={() => onOpenCrossing?.(crossing)}>למה זה מעניין?</button>
      </article> : <article className="sod29-number-core2029-crossing is-empty">
        <div className="sod29-number-core2029-label"><span>✦</span><b>הצלבה</b></div>
        <strong>אין כרגע הצלבה רב־שיטתית להצגה</strong>
        <p>המערכת לא ממציאה התאמה כשאין לפחות שתי שיטות משותפות.</p>
      </article>}

      {zero ? <article className="sod29-number-core2029-zero">
        <div className="sod29-number-core2029-label"><span>×10</span><b>Zero Scale</b><small>DERIVATION</small></div>
        {compact ? <div className="sod29-number-core2029-zero-step">
          <strong>{root}</strong><span>→</span><b>{zero.next ?? zero.previous ?? zero.coreRoot}</b>
        </div> : <div className="sod29-number-core2029-zero-chain">
          {zero.chain.map((value, index) => <React.Fragment key={value}>
            {index > 0 ? <span>→</span> : null}
            <button type="button" className={Number(value) === Number(root) ? "is-current" : ""} onClick={() => onOpenZero?.(value)}>{value}</button>
          </React.Fragment>)}
        </div>}
        <p>{zero.note}. לא שוויון — נתיב נגזרת.</p>
        {compact && zero.next != null ? <button type="button" onClick={() => onOpenZero?.(zero.next)}>פתח {zero.next}</button> : null}
      </article> : null}
    </div>

    <div className="sod29-number-core2029-pulse">
      <span className="sod29-number-core2029-heart" aria-hidden="true">♥</span>
      <div>
        <strong>מחקר חי</strong>
        <small>{projection.pulse.activityCount ? `${projection.pulse.activityCount} פעילויות · ` : ""}{projection.pulse.meetingCount} מפגשים · {projection.pulse.sourceCount} מקורות</small>
      </div>
    </div>

    <article className="sod29-number-core2029-raziel">
      <div className="sod29-number-core2029-raziel-orb" aria-hidden="true"><i /></div>
      <div className="sod29-number-core2029-raziel-copy">
        <span>RAZIEL MICRO · SAME COMPANION</span>
        <strong>✦ {raziel?.lead || "רזיאל איתך על המספר"}</strong>
        <p>{raziel?.text}</p>
        <div className="sod29-number-core2029-raziel-actions">
          {(raziel?.actions || []).map((action) => <button type="button" key={action.key} onClick={() => onRazielAction?.(action.key)}>{action.label}</button>)}
          <button type="button" className="expand" onClick={() => onExpandRaziel?.()}>הרחב לרזיאל ←</button>
        </div>
      </div>
    </article>

    <div className="sod29-number-core2029-trace">
      <div>
        <span>METHOD TRACE</span>
        <strong>{projection.expression} · {active?.displayLabel || "שיטה"}{result != null ? ` = ${result}` : ""}</strong>
      </div>
      <button type="button" disabled={!traceState?.finding && !traceState?.error} onClick={onToggleTrace}>{traceOpen ? "סגור Trace" : "איך מחשבים?"}</button>
    </div>
    {traceState?.error ? <div className="sod29-number-core2029-note">Trace לא זמין כרגע לשילוב הזה.</div> : null}
    {traceOpen && traceState?.finding ? <div className="sod29-number-core2029-trace-steps">
      {traceSteps.length ? traceSteps.map((step, index) => <span key={`${step}:${index}`}>{step}</span>) : <span>המנוע החזיר Trace ללא פירוט צעדים להצגה.</span>}
    </div> : null}

    <footer className="sod29-number-core2029-foot">
      {onOpenWorld ? <button type="button" onClick={onOpenWorld}>פתח בעולם</button> : null}
      {compact && onOpenPage ? <button type="button" className="primary" onClick={onOpenPage}>פתח דף מלא של {root}</button> : null}
    </footer>
  </section>;
}
