import React, { useEffect, useMemo, useState } from "react";
import "./numberCore2029.css";

const TABS = Object.freeze([
  { key: "calc", label: "חישוב" },
  { key: "learn", label: "למד" },
  { key: "raziel", label: "רזיאל" },
  { key: "worlds", label: "עולמות" },
]);

function MethodInspector({
  method,
  projection,
  tab,
  setTab,
  traceState,
  traceOpen,
  traceSteps,
  onToggleTrace,
  onRazielAction,
  onExpandRaziel,
  onClose,
}) {
  if (!method) return null;
  const worlds = Array.isArray(projection?.worlds) ? projection.worlds : [];
  const raziel = projection?.razielMicro;

  return <div className="sod29-number-method-inspector" data-method-inspector={method.methodKey}>
    <div className="sod29-number-method-inspector-head">
      <div>
        <span>METHOD INSPECTOR</span>
        <strong>{method.displayLabel}</strong>
        <small>{projection.expression} → {method.computedValue ?? "—"}</small>
      </div>
      <button type="button" className="close" onClick={onClose} aria-label="סגור פירוט שיטה">×</button>
    </div>

    <div className="sod29-number-method-inspector-tabs" role="tablist" aria-label="פירוט השיטה">
      {TABS.map((item) => <button
        type="button"
        role="tab"
        aria-selected={tab === item.key}
        className={tab === item.key ? "is-active" : ""}
        key={item.key}
        onClick={() => setTab(item.key)}
      >{item.label}</button>)}
    </div>

    {tab === "calc" ? <div className="sod29-number-method-inspector-pane">
      <div className="sod29-number-method-calc-line">
        <span>{projection.expression}</span>
        <b>{method.displayLabel}</b>
        <strong>{method.computedValue ?? "—"}</strong>
      </div>
      <p>הערך מגיע מהמנוע הקנוני. ה־Root נשאר {projection.root} עד שפותחים מספר אחר במפורש.</p>
      <div className="sod29-number-method-inspector-actions">
        <button type="button" disabled={!traceState?.finding && !traceState?.error} onClick={onToggleTrace}>{traceOpen ? "סגור Trace" : "איך מחשבים?"}</button>
        {method.computedValue != null && Number(method.computedValue) !== Number(projection.root)
          ? <span className="sod29-number-method-result-note">תוצאה פעילה ≠ Root</span>
          : <span className="sod29-number-method-result-note">התוצאה יושבת על ה־Root</span>}
      </div>
      {traceState?.error ? <div className="sod29-number-core2029-note">Trace לא זמין כרגע לשילוב הזה.</div> : null}
      {traceOpen && traceState?.finding ? <div className="sod29-number-core2029-trace-steps">
        {traceSteps.length ? traceSteps.map((step, index) => <span key={`${step}:${index}`}>{step}</span>) : <span>המנוע החזיר Trace ללא פירוט צעדים להצגה.</span>}
      </div> : null}
    </div> : null}

    {tab === "learn" ? <div className="sod29-number-method-inspector-pane sod29-number-method-learn">
      <div className="sod29-number-method-learn-grid">
        <article>
          <span>מה השיטה עושה</span>
          <strong>{method.sub || "הגדרה קנונית זמינה דרך Registry/Trace"}</strong>
        </article>
        <article>
          <span>משפחה מתמטית</span>
          <strong>{method.mathematicalFamily || method.category || "—"}</strong>
        </article>
        <article>
          <span>מבנה</span>
          <strong>{method.atomicOrComposite || "atomic"}</strong>
        </article>
        <article>
          <span>גרסה</span>
          <strong>{method.definitionVersion ?? "—"}</strong>
        </article>
      </div>
      {method.soul ? <div className="sod29-number-method-soul"><span>משמעות מחקרית / הסבר</span><p>{method.soul}</p></div> : null}
      {Array.isArray(method.derivedFrom) && method.derivedFrom.length ? <div className="sod29-number-method-derived">נגזר מ־{method.derivedFrom.join(" · ")}</div> : null}
      <p className="sod29-number-method-boundary">הגדרת השיטה והחישוב הם שכבות נפרדות מפרשנות. אין כאן יצירת משמעות אוטומטית.</p>
    </div> : null}

    {tab === "raziel" ? <div className="sod29-number-method-inspector-pane sod29-number-method-raziel">
      <div className="sod29-number-method-raziel-mini">
        <div className="orb" aria-hidden="true"><i /></div>
        <div>
          <span>RAZIEL MICRO · אותו רזיאל</span>
          <strong>✦ {projection.expression} · {method.displayLabel} → {method.computedValue ?? "—"}</strong>
          <p>{raziel?.text || "אפשר להסביר את השיטה, להשוות אותה לשיטות אחיות או לבחור את הצעד המחקרי הבא."}</p>
        </div>
      </div>
      <div className="sod29-number-core2029-raziel-actions">
        <button type="button" onClick={() => onRazielAction?.("explain_method")}>הסבר את השיטה</button>
        <button type="button" onClick={() => onRazielAction?.("compare_methods")}>השווה שיטות</button>
        <button type="button" onClick={() => onRazielAction?.("next_research_step")}>מה לבדוק עכשיו?</button>
        <button type="button" className="expand" onClick={() => onExpandRaziel?.()}>הרחב לרזיאל ←</button>
      </div>
    </div> : null}

    {tab === "worlds" ? <div className="sod29-number-method-inspector-pane">
      {worlds.length ? <>
        <p>עולמות המחקר המחוברים כרגע ל־Root {projection.root}. הם הקשר/Projection — לא תוצאה של השיטה עצמה.</p>
        <div className="sod29-number-core2029-world-grid">
          {worlds.slice(0, 8).map((world) => <article key={world.label}>
            <span>{world.count || 0} פריטים</span>
            <strong>{world.label}</strong>
            {world.samples?.length ? <small>{world.samples.slice(0, 2).join(" · ")}</small> : null}
          </article>)}
        </div>
      </> : <div className="sod29-number-core2029-note">אין כרגע עולם מחקר זמין ל־Root הזה.</div>}
    </div> : null}
  </div>;
}

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
  const [inspectorMethodKey, setInspectorMethodKey] = useState(null);
  const [inspectorTab, setInspectorTab] = useState("calc");

  if (!projection) return null;
  const compact = mode === "drawer";
  const root = projection.root;
  const active = projection.selectedMethod;
  const result = active?.computedValue ?? projection.activeResult ?? null;
  const zero = projection.zeroScale;
  const crossing = projection.crossing;
  const raziel = projection.razielMicro;
  const methods = Array.isArray(projection.methods) ? projection.methods : [];
  const worlds = Array.isArray(projection.worlds) ? projection.worlds : [];

  const inspectorMethod = useMemo(() => {
    if (!methods.length) return null;
    return methods.find((method) => method.methodKey === inspectorMethodKey)
      || methods.find((method) => method.methodKey === active?.methodKey)
      || methods[0]
      || null;
  }, [methods, inspectorMethodKey, active?.methodKey]);

  useEffect(() => {
    if (inspectorMethodKey && !methods.some((method) => method.methodKey === inspectorMethodKey)) {
      setInspectorMethodKey(null);
      setInspectorTab("calc");
    }
  }, [methods, inspectorMethodKey]);

  const inspectMethod = (method) => {
    onMethodSelect?.(method.methodKey);
    setInspectorMethodKey(method.methodKey);
    setInspectorTab("calc");
  };

  const openWorldsInspector = () => {
    setInspectorMethodKey(active?.methodKey || methods[0]?.methodKey || null);
    setInspectorTab("worlds");
  };

  return <section className={`sod29-number-core2029 ${compact ? "is-drawer" : "is-page"}`} data-number-core-root={root}>
    <header className="sod29-number-core2029-head">
      <div>
        <span className="sod29-number-core2029-kicker">NUMBER CORE · ONE STATE</span>
        <strong className="sod29-number-core2029-expression">{projection.expression || root}</strong>
      </div>
      <div className="sod29-number-core2029-root">
        <small>המספר</small>
        <b>{root}</b>
      </div>
    </header>

    <div className="sod29-number-core2029-active">
      <div>
        <span>{active?.displayLabel || "שיטה פעילה"}</span>
        <strong>{result != null ? result : "—"}</strong>
      </div>
      <small>{result != null && Number(result) !== Number(root) ? `תוצאה פעילה · ה־Root נשאר ${root}` : "התוצאה הפעילה יושבת על ה־Root"}</small>
      {active ? <button type="button" onClick={() => inspectMethod(active)}>פתח שיטה</button> : null}
      {result != null && Number(result) !== Number(root) && onOpenResult ? <button type="button" onClick={() => onOpenResult(result)}>פתח {result}</button> : null}
    </div>

    <div className="sod29-number-core2029-dna">
      <div>
        <span>DNA המספר · מפת שכבות</span>
        <strong>{methods.length} שיטות · {projection.pulse.meetingCount} מפגשים · {worlds.length} עולמות · {projection.pulse.sourceCount} מקורות</strong>
      </div>
      <button type="button" onClick={openWorldsInspector}>עולמות</button>
    </div>

    <div className="sod29-number-core2029-upper-grid">
      {crossing ? <article className="sod29-number-core2029-crossing">
        <div className="sod29-number-core2029-label"><span>✦</span><b>הצלבה נסתרת</b><small>{crossing.methodCount} שיטות</small></div>
        <strong>{projection.expression}</strong>
        <span className="sod29-number-core2029-cross-eq">↕ {root} ↕</span>
        <strong>{crossing.partner}</strong>
        <div className="sod29-number-core2029-method-tags">{crossing.methods.map((method) => <span key={method.methodKey}>{method.methodLabel}</span>)}</div>
        <p>הצלבה חישובית מאומתת דרך ה־projection; המשמעות המחקרית נשארת נפרדת.</p>
        <button type="button" onClick={() => onOpenCrossing?.(crossing)}>למה זה מעניין?</button>
      </article> : <article className="sod29-number-core2029-crossing is-empty">
        <div className="sod29-number-core2029-label"><span>✦</span><b>הצלבה נסתרת</b></div>
        <strong>אין כרגע הצלבה רב־שיטתית להצגה</strong>
        <p>המערכת לא ממציאה התאמה כשאין לפחות שתי שיטות בלתי־תלויות.</p>
      </article>}

      {zero ? <article className="sod29-number-core2029-zero">
        <div className="sod29-number-core2029-label"><span>×10</span><b>סולם האפס</b><small>DERIVATION</small></div>
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

    <div className="sod29-number-core2029-method-section">
      <div className="sod29-number-core2029-section-title">
        <span>כל השיטות · נגיעה אחת</span>
        <small>{methods.length}</small>
      </div>
      <div className="sod29-number-core2029-methods" aria-label="שיטות גימטריה">
        {methods.map((method) => {
          const selected = method.methodKey === active?.methodKey;
          const inspected = method.methodKey === inspectorMethodKey;
          return <button
            type="button"
            key={method.methodKey}
            className={`${selected ? "is-active" : ""}${inspected ? " is-inspected" : ""}`}
            aria-pressed={selected}
            onClick={() => inspectMethod(method)}
          >
            <span>{method.displayLabel}</span>
            <strong>{method.computedValue ?? "—"}</strong>
          </button>;
        })}
      </div>
    </div>

    <MethodInspector
      method={inspectorMethodKey ? inspectorMethod : null}
      projection={projection}
      tab={inspectorTab}
      setTab={setInspectorTab}
      traceState={traceState}
      traceOpen={traceOpen}
      traceSteps={traceSteps}
      onToggleTrace={onToggleTrace}
      onRazielAction={onRazielAction}
      onExpandRaziel={onExpandRaziel}
      onClose={() => setInspectorMethodKey(null)}
    />

    {worlds.length && !(inspectorMethodKey && inspectorTab === "worlds") ? <div className="sod29-number-core2029-world-strip">
      <span>עולמות</span>
      <div>{worlds.slice(0, compact ? 4 : 6).map((world) => <button type="button" key={world.label} onClick={openWorldsInspector}>{world.label}<small>{world.count || 0}</small></button>)}</div>
    </div> : null}

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

    <footer className="sod29-number-core2029-foot">
      {onOpenWorld ? <button type="button" onClick={onOpenWorld}>פתח בעולם</button> : null}
      {compact && onOpenPage ? <button type="button" className="primary" onClick={onOpenPage}>פתח דף מלא של {root}</button> : null}
    </footer>
  </section>;
}