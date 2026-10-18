import React, { useId } from "react";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";
import SignatureResearchIcon from "../SignatureResearchIcon.jsx";
import MethodTraceExplanation2029 from "../gematria2029/MethodTraceExplanation2029.jsx";
import MethodLens2029 from "../gematria2029/MethodLens2029.jsx";
import SpatialMethodStage2029 from "../gematria2029/SpatialMethodStage2029.jsx";

const TABS = Object.freeze([
  { key: "calc", label: "חישוב" },
  { key: "learn", label: "למד" },
  { key: "raziel", label: "רזיאל" },
  { key: "worlds", label: "עולמות" },
]);

function publicMethodLabel(method) {
  return canonicalMethodPublicLabel({
    method_key: method?.methodKey,
    display_label: method?.displayLabel,
  });
}

export default function NumberMethodInspector2029({
  method,
  projection,
  tab,
  setTab,
  traceState,
  traceOpen,
  traceSteps,
  traceDetail,
  onToggleTrace,
  onRazielAction,
  onExpandRaziel,
  onOpenHeichal,
  onMethodLensExpression,
  onClose,
}) {
  const inspectorId = useId();
  if (!method) return null;
  const worlds = Array.isArray(projection?.worlds) ? projection.worlds : [];
  const raziel = projection?.razielMicro;
  const methodLensSelection = {
    expression: projection?.expression || "",
    methodKey: method.methodKey,
    methodLabel: publicMethodLabel(method),
    resultValue: method.computedValue ?? null,
  };

  return <div className="sod29-number-method-inspector" data-method-inspector={method.methodKey}>
    <div className="sod29-number-method-inspector-head">
      <SignatureResearchIcon name="number" label="דף המספר" />
      <div>
        <span>השיטה שבחרתם</span>
        <strong>{publicMethodLabel(method)}</strong>
        <small>{projection.expression} → {method.computedValue ?? "—"}</small>
      </div>
      <button type="button" className="close" onClick={onClose} aria-label="סגור פירוט שיטה">×</button>
    </div>

    <div className="sod29-number-method-inspector-tabs" role="tablist" aria-label="פירוט השיטה" onKeyDown={(event) => {
      const current = TABS.findIndex((item) => item.key === tab);
      const next = event.key === "Home" ? 0 : event.key === "End" ? TABS.length - 1
        : event.key === "ArrowLeft" ? (current + 1) % TABS.length
        : event.key === "ArrowRight" ? (current - 1 + TABS.length) % TABS.length : null;
      if (next == null) return;
      event.preventDefault();
      setTab(TABS[next].key);
      event.currentTarget.querySelectorAll('[role="tab"]')[next]?.focus();
    }}>
      {TABS.map((item) => <button
        type="button"
        role="tab"
        id={`${inspectorId}-${item.key}`}
        aria-controls={`${inspectorId}-panel`}
        aria-selected={tab === item.key}
        tabIndex={tab === item.key ? 0 : -1}
        className={tab === item.key ? "is-active" : ""}
        key={item.key}
        onClick={() => setTab(item.key)}
      >{item.label}</button>)}
    </div>

    {tab === "calc" ? <div role="tabpanel" id={`${inspectorId}-panel`} aria-labelledby={`${inspectorId}-calc`} className="sod29-number-method-inspector-pane">
      <div className="sod29-number-method-calc-line">
        <span>{projection.expression}</span>
        <b>{publicMethodLabel(method)}</b>
        <strong>{method.computedValue ?? "—"}</strong>
      </div>
      <p>בחרו אות או צעד בהמחשה, או פתחו את הפירוט המלא. בלשונית למד תמצאו הסבר ודוגמה עם הביטוי שלכם.</p>
      <div className="sod29-number-method-inspector-actions">
        <button type="button" disabled={!traceState?.finding && !traceState?.error} onClick={onToggleTrace}>{traceOpen ? "סגור פירוט" : "איך מחשבים?"}</button>
        {method.computedValue == null ? <span className="sod29-number-method-result-note">נדרש הקשר לחישוב</span> : Number(method.computedValue) !== Number(projection.root)
          ? <span className="sod29-number-method-result-note">תוצאת השיטה שונה ממספר הדף</span>
          : <span className="sod29-number-method-result-note">תוצאת השיטה זהה למספר הדף</span>}
      </div>
      {traceState?.error ? <div className="sod29-number-core2029-note">פירוט החישוב אינו זמין כרגע.</div> : null}
      {traceOpen && traceState?.finding ? <div className="sod29-number-core2029-trace-steps">
        {traceSteps.length ? traceSteps.map((step, index) => <span key={`${step}:${index}`}>{step}</span>) : <span>אין צעדי חישוב זמינים להצגה.</span>}
      </div> : null}
      <SpatialMethodStage2029
        expression={projection.expression}
        methodKey={method.methodKey}
        trace={traceDetail}
        expectedValue={method.computedValue ?? null}
        contextRequired={method.executionKind === "context_activated"}
        depth="S2"
        loading={traceState?.loading === true}
        onRazielAction={onRazielAction}
        onOpenHeichal={onOpenHeichal}
      />
      <MethodLens2029 selection={methodLensSelection} compact onOpenExpression={onMethodLensExpression} />
    </div> : null}

    {tab === "learn" ? <div role="tabpanel" id={`${inspectorId}-panel`} aria-labelledby={`${inspectorId}-learn`} className="sod29-number-method-inspector-pane sod29-number-method-learn">
      <MethodTraceExplanation2029 method={method} methods={projection.methods} expression={projection.expression} trace={traceDetail} loading={traceState?.loading} />
    </div> : null}

    {tab === "raziel" ? <div role="tabpanel" id={`${inspectorId}-panel`} aria-labelledby={`${inspectorId}-raziel`} className="sod29-number-method-inspector-pane sod29-number-method-raziel">
      <div className="sod29-number-method-raziel-mini">
        <div className="orb" aria-hidden="true"><i /></div>
        <div>
          <span>RAZIEL MICRO · אותו רזיאל</span>
          <strong>✦ {projection.expression} · {publicMethodLabel(method)} → {method.computedValue ?? "—"}</strong>
          <p>{raziel?.text || "אפשר להסביר את השיטה, להשוות אותה לשיטות אחיות או לבחור את הצעד המחקרי הבא."}</p>
        </div>
      </div>
      <div className="sod29-number-core2029-raziel-actions">
        <button type="button" onClick={() => onRazielAction?.("explain_method", { kind: "method", methodKey: method.methodKey, methodLabel: publicMethodLabel(method), resultValue: method.computedValue ?? null })}>הסבר את השיטה</button>
        <button type="button" onClick={() => onRazielAction?.("compare_methods", { kind: "method", methodKey: method.methodKey, methodLabel: publicMethodLabel(method), resultValue: method.computedValue ?? null })}>השווה שיטות</button>
        <button type="button" onClick={() => onRazielAction?.("next_research_step", { kind: "method", methodKey: method.methodKey, methodLabel: publicMethodLabel(method), resultValue: method.computedValue ?? null })}>מה לבדוק עכשיו?</button>
        <button type="button" className="expand" onClick={() => onExpandRaziel?.()}>הרחב לרזיאל ←</button>
      </div>
    </div> : null}

    {tab === "worlds" ? <div role="tabpanel" id={`${inspectorId}-panel`} aria-labelledby={`${inspectorId}-worlds`} className="sod29-number-method-inspector-pane">
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
