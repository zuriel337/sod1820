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
  onOpenJourney,
  journeyLabel = null,
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
  const layers = Array.isArray(projection.layers) ? projection.layers : [];
  const coverage = projection.coverage || { percent: 0, present: 0, total: layers.length, note: "מהשכבות הזמינות מכילות חומר" };
  const connections = Array.isArray(projection.connections) ? projection.connections : [];
  const heroMedia = projection.heroMedia || null;

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
    <header className="sod29-number-dashboard-identity">
      {heroMedia?.src ? <figure className="sod29-number-dashboard-art">
        <img src={heroMedia.src} alt={heroMedia.label || `ייצוג חזותי של ${root}`} loading="lazy" />
      </figure> : <div className="sod29-number-dashboard-art is-fallback" aria-hidden="true"><span>✦</span></div>}

      <div className="sod29-number-dashboard-identity-copy">
        <span>מספר במערכת 2029</span>
        <div className="sod29-number-dashboard-number-line sod29-number-core2029-root">
          <b className="sod29-number-value">{root}</b>
          <span aria-hidden="true">☆</span>
        </div>
        <strong>{projection.expression || root}</strong>
        <div className="sod29-number-core2029-active sod29-number-dashboard-active">
          <span>{active?.displayLabel || "שיטה פעילה"}</span>
          <strong>{result != null ? result : "—"}</strong>
        </div>
        <small>{active?.displayLabel ? `Root נשאר ${root} · התוצאה הפעילה אינה משנה זהות` : "שורש חי · ביטוי פעיל"}</small>
      </div>

      <blockquote className="sod29-number-dashboard-quote">
        <strong>“בכל מספר מתגלה עולם שלם.”</strong>
        <span>{raziel?.text || "רזיאל מלווה את המספר דרך אותה Research Context."}</span>
        <cite>— רזיאל</cite>
      </blockquote>
    </header>

    <div className="sod29-number-core2029-upper-grid sod29-number-dashboard-top">
      {crossing ? <article className="sod29-number-core2029-crossing">
        <div className="sod29-number-core2029-label"><span>∞</span><b>הצלבה נסתרת</b><small>{crossing.methodCount} שיטות</small></div>
        <strong>{crossing.partner}</strong>
        <p>{crossing.methods.map((method) => method.methodLabel).join(" · ")}</p>
        <button type="button" onClick={() => onOpenCrossing?.(crossing)}>הצג הצלבה</button>
      </article> : <article className="sod29-number-core2029-crossing is-empty">
        <div className="sod29-number-core2029-label"><span>∞</span><b>הצלבה נסתרת</b></div>
        <strong>אין כרגע הצלבה עצמאית</strong>
        <p>לא מוצגת התאמה מלאכותית.</p>
      </article>}

      {zero ? <article className="sod29-number-core2029-zero">
        <div className="sod29-number-core2029-label"><span>◉</span><b>סולם האפס</b><small>DERIVATION</small></div>
        {compact ? <div className="sod29-number-core2029-zero-step">
          <strong>{root}</strong><span>→</span><b>{zero.next ?? zero.previous ?? zero.coreRoot}</b>
        </div> : <div className="sod29-number-core2029-zero-chain">
          {zero.chain.slice(0, 4).map((value, index) => <React.Fragment key={value}>
            {index > 0 ? <span>←</span> : null}
            <button type="button" className={Number(value) === Number(root) ? "is-current" : ""} onClick={() => onOpenZero?.(value)}>{value}</button>
          </React.Fragment>)}
        </div>}
        <p>אותו שורש ספרתי · סדר גודל אחר</p>
        {compact && zero.next != null ? <button type="button" onClick={() => onOpenZero?.(zero.next)}>הצג בסולם</button> : null}
      </article> : <article className="sod29-number-core2029-zero is-empty">
        <div className="sod29-number-core2029-label"><span>◉</span><b>סולם האפס</b></div>
        <strong>אין נגזרת זמינה</strong>
        <p>נגזרת מוצגת רק כשהחוק חל.</p>
      </article>}

      <article className="sod29-number-dashboard-worlds">
        <div className="sod29-number-core2029-label"><span>♧</span><b>עולמות</b><small>{worlds.length}</small></div>
        <strong>{worlds.length ? `${worlds.length} עולמות` : "אין עולם מחקר זמין"}</strong>
        <p>{worlds.slice(0, 3).map((world) => world.label).join(" · ") || "יופיעו רק עולמות עם חומר אמיתי"}</p>
        <button type="button" onClick={openWorldsInspector} disabled={!methods.length}>הצג עולמות</button>
      </article>
    </div>

    <div className="sod29-number-dashboard-body">
      <aside className="sod29-number-dashboard-coverage">
        <div className="sod29-number-dashboard-coverage-head">
          <span>ⓘ</span>
          <div><strong>{coverage.label || "כיסוי שכבות"}</strong><b>{coverage.percent}%</b><small>{coverage.note}</small></div>
        </div>
        <div className="sod29-number-dashboard-coverage-bar" aria-label={`כיסוי שכבות ${coverage.percent}%`}>
          <i style={{ width: `${Math.max(0, Math.min(100, coverage.percent))}%` }} />
        </div>
        <div className="sod29-number-dashboard-layer-list">
          {layers.map((layer) => <div key={layer.key} className={layer.count > 0 ? "is-live" : "is-empty"}>
            <span>{layer.count > 0 ? "✅" : "•"}</span>
            <b>{layer.label}</b>
            <small>{layer.count > 0 ? layer.count : "—"}</small>
          </div>)}
        </div>
      </aside>

      <div className="sod29-number-dashboard-main">
        <section className="sod29-number-dashboard-dna">
          <div className="sod29-number-dashboard-dna-head">
            <div><span aria-hidden="true">🧬</span><div><strong>DNA המספר</strong><small>החיבורים החיים של {root}</small></div></div>
            <button type="button" onClick={() => onOpenWorld?.()}>הצג הכל ↗</button>
          </div>

          {connections.length ? <div className="sod29-number-dashboard-connections">
            {connections.slice(0, compact ? 4 : 6).map((item, index) => <article key={`${item.label}:${index}`} data-tone={index % 6}>
              <span>{item.kind === "crossing" ? "✦" : "⌘"}</span>
              <strong>{item.label}</strong>
              <small>{item.note}</small>
            </article>)}
          </div> : <div className="sod29-number-core2029-note">אין כרגע חיבורי DNA נוספים להצגה.</div>}
        </section>

        <article className="sod29-number-core2029-raziel sod29-number-dashboard-raziel">
          <div className="sod29-number-core2029-raziel-orb" aria-hidden="true"><i /></div>
          <div className="sod29-number-core2029-raziel-copy">
            <div className="sod29-number-dashboard-raziel-head"><div><span>RAZIEL MICRO · SAME COMPANION</span><strong>רזיאל על המספר</strong></div><button type="button" onClick={() => onExpandRaziel?.()}>פתח רזיאל ↗</button></div>
            <p>{raziel?.lead || `אני איתך על ${root}`}{raziel?.text ? ` · ${raziel.text}` : ""}</p>
            <div className="sod29-number-core2029-raziel-actions">
              <button type="button" onClick={() => onRazielAction?.("explain_method")}>למה זה כאן?</button>
              <button type="button" onClick={() => onRazielAction?.("compare_methods")}>השווה שיטות</button>
              <button type="button" onClick={() => onRazielAction?.("next_research_step")}>צעד מחקרי הבא</button>
            </div>
          </div>
        </article>
      </div>
    </div>

    <section className="sod29-number-dashboard-spectrum">
      <div><strong>ספקטרום השכבות</strong><small>ייצוג חזותי של עומק החומר הקיים במספר</small></div>
      <div className="sod29-number-dashboard-spectrum-bar" aria-hidden="true" />
      <div className="sod29-number-dashboard-spectrum-legend">
        {layers.slice(0, 10).map((layer, index) => <span key={layer.key} className={layer.count > 0 ? "is-live" : ""} data-tone={index % 10}><i />{layer.label.replace(" / ", " ")}</span>)}
      </div>
    </section>

    <footer className="sod29-number-core2029-foot sod29-number-dashboard-actions">
      {onOpenJourney ? <button type="button" onClick={onOpenJourney}>🗺 {journeyLabel || "צא למסע"}</button>
        : onOpenWorld ? <button type="button" onClick={onOpenWorld}>🗺 מסע / עולם</button> : null}
      <button type="button" onClick={() => onRazielAction?.("compare_methods")}>⚖ השווה</button>
      <button type="button" onClick={() => onRazielAction?.("next_research_step")}>🔖 המשך מחקר</button>
      <button type="button" className="primary" onClick={() => onExpandRaziel?.()}>✨ פתח ברזיאל</button>
      {compact && onOpenPage ? <button type="button" onClick={onOpenPage}>פתח דף מלא ↗</button> : null}
    </footer>

    <div className="sod29-number-core2029-method-section sod29-number-dashboard-method-deck">
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

    {result != null && Number(result) !== Number(root) && onOpenResult ? <button className="sod29-number-dashboard-open-result" type="button" onClick={() => onOpenResult(result)}>פתח את התוצאה הפעילה {result}</button> : null}
  </section>;
}
