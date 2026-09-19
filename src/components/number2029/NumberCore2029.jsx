import React, { useEffect, useMemo, useState } from "react";
import { PALETTES } from "../../lib/palette.js";
import { canonicalMethodPublicLabel } from "../../lib/presentation/canonicalPresentation.js";
import "./numberCore2029.css";

const LAB = PALETTES.lab;
const NUMBER_CORE_PALETTE = Object.freeze({
  "--s29-page": LAB.pageBg,
  "--s29-panel": LAB.card,
  "--s29-panel-soft": LAB.cardSoft,
  "--s29-panel-grad": LAB.cardGrad,
  "--s29-line": LAB.border,
  "--s29-line-strong": LAB.borderStrong,
  "--s29-ink": LAB.ink,
  "--s29-muted": LAB.inkSoft,
  "--s29-accent": LAB.accent,
  "--s29-hero": LAB.heroNum,
  "--s29-glow": LAB.glow,
  "--s29-accent-btn": LAB.accentBtn,
  "--s29-on-accent": LAB.onAccent,
});

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


function MiluySpatialExplain({
  expression,
  method,
  traceDetail,
  traceState,
  onRazielAction,
  onOpenHeichal,
}) {
  const rawSteps = Array.isArray(traceDetail?.steps) ? traceDetail.steps : [];
  const steps = rawSteps
    .filter((step) => step && typeof step === "object" && step.scope === "letter" && step.token)
    .map((step, index) => ({
      token: String(step.token),
      value: Number.isFinite(Number(step.contribution ?? step.base_value)) ? Number(step.contribution ?? step.base_value) : null,
      subtotal: Number.isFinite(Number(step.running_subtotal)) ? Number(step.running_subtotal) : null,
      position: Number.isFinite(Number(step.position)) ? Number(step.position) : index + 1,
    }));
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => { setFocusIndex(0); }, [expression, method?.methodKey]);
  if (method?.methodKey !== "מילוי") return null;

  const focus = steps[Math.min(focusIndex, Math.max(0, steps.length - 1))] || null;
  const parity = traceDetail?.verification?.parity === true;
  const result = Number.isFinite(Number(traceDetail?.value ?? traceDetail?.result))
    ? Number(traceDetail?.value ?? traceDetail?.result)
    : method?.computedValue ?? null;

  return <section className="sod29-miluy-spatial" data-miluy-spatial-explain="true" aria-label={`פתיחה מרחבית של מילוי עבור ${expression}`}>
    <div className="sod29-miluy-spatial-head">
      <div>
        <span>SPATIAL EXPLAIN · S2 LAYERED DEPTH</span>
        <strong>אות → שם האות המלא → ערך → סכום</strong>
        <small>אותו Method Trace · בלי חישוב מקומי ובלי לעזוב את המספר</small>
      </div>
      <div className="sod29-miluy-spatial-result">
        <small>{parity ? "TRACE VERIFIED" : traceState?.loading ? "TRACE LOADING" : "TRACE"}</small>
        <b>{result ?? "—"}</b>
      </div>
    </div>

    <div className="sod29-miluy-spatial-expression">
      <span>הביטוי הפעיל</span>
      <strong>{expression}</strong>
      <i aria-hidden="true" />
    </div>

    {steps.length ? <>
      <div className="sod29-miluy-spatial-stage" style={{ "--miluy-count": Math.max(1, steps.length) }}>
        {steps.map((step, index) => {
          const active = index === focusIndex;
          return <button
            type="button"
            key={`${step.position}:${step.token}`}
            className={`sod29-miluy-spatial-letter${active ? " is-focus" : ""}`}
            onClick={() => setFocusIndex(index)}
            aria-pressed={active}
          >
            <span className="sod29-miluy-layer is-letter"><small>אות</small><b>{step.token}</b></span>
            <span className="sod29-miluy-connector" aria-hidden="true">↓</span>
            <span className="sod29-miluy-layer is-name"><small>מילוי</small><b>שם האות המלא</b></span>
            <span className="sod29-miluy-connector" aria-hidden="true">↓</span>
            <span className="sod29-miluy-layer is-value"><small>ערך מאומת</small><b>{step.value ?? "—"}</b></span>
            <span className="sod29-miluy-subtotal">Σ {step.subtotal ?? "—"}</span>
          </button>;
        })}
      </div>

      <div className="sod29-miluy-spatial-focus">
        <div className="sod29-miluy-spatial-focus-orb" aria-hidden="true"><i /></div>
        <div>
          <span>FOCUS · אות {focus?.position ?? 1}</span>
          <strong>{focus?.token || "—"} <em>→</em> מילוי <em>→</em> {focus?.value ?? "—"}</strong>
          <p>הערך מגיע ישירות מה־Trace הקנוני. המעבר החזותי מסביר את החישוב; הוא אינו יוצר תוצאה חדשה.</p>
        </div>
        <div className="sod29-miluy-spatial-focus-actions">
          <button type="button" onClick={() => setFocusIndex((value) => steps.length ? (value + 1) % steps.length : 0)}>האות הבאה ←</button>
          <button type="button" onClick={() => onRazielAction?.("explain_miluy_step", { kind: "miluy_step", methodKey: "מילוי", expression, step: focus })}>✦ רזיאל</button>
          <button type="button" className="primary" onClick={() => onOpenHeichal?.({ kind: "miluy_step", methodKey: "מילוי", expression, step: focus, resultValue: result })}>◇ פתח בהיכל</button>
        </div>
      </div>
    </> : <div className="sod29-number-core2029-note">
      {traceState?.loading ? "טוען את צעדי המילוי מהמנוע הקנוני…" : "המנוע החזיר ערך מילוי, אבל עדיין אין צעדי אות־אות להצגה."}
    </div>}

    <p className="sod29-miluy-spatial-boundary">האיות המלא של שם האות אינו מומצא ב־UI. ה־Proof מציג כרגע רק מידע שמגיע מה־Trace המאומת; אפשר להעשיר את חוזה ה־Trace באיות קנוני בשלב הבא.</p>
  </section>;
}

function MethodInspector({
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
  onClose,
}) {
  if (!method) return null;
  const worlds = Array.isArray(projection?.worlds) ? projection.worlds : [];
  const raziel = projection?.razielMicro;

  return <div className="sod29-number-method-inspector" data-method-inspector={method.methodKey}>
    <div className="sod29-number-method-inspector-head">
      <div>
        <span>METHOD INSPECTOR</span>
        <strong>{publicMethodLabel(method)}</strong>
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
        <b>{publicMethodLabel(method)}</b>
        <strong>{method.computedValue ?? "—"}</strong>
      </div>
      <p>הערך מגיע מהמנוע הקנוני. הביטוי נשאר {projection.expression}; פתיחת מספר אחר היא פעולה מפורשת.</p>
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
      <MiluySpatialExplain
        expression={projection.expression}
        method={method}
        traceDetail={traceDetail}
        traceState={traceState}
        onRazielAction={onRazielAction}
        onOpenHeichal={onOpenHeichal}
      />
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
  stageProjection = null,
  stageLoading = false,
  methodsLoading = false,
  languageBridges = [],
  regularExpressions = [],
  mode = "page",
  traceState = null,
  traceOpen = false,
  traceSteps = [],
  traceDetail = null,
  onMethodSelect,
  onToggleTrace,
  onOpenCrossing,
  onOpenZero,
  onOpenPage,
  onOpenWorld,
  onOpenJourney,
  onOpenHeichal,
  onOpenResult,
  onResolveQuery,
  onExpressionSelect,
  journeyLabel = null,
  onRazielAction,
  onExpandRaziel,
} = {}) {
  const [inspectorMethodKey, setInspectorMethodKey] = useState(null);
  const [inspectorTab, setInspectorTab] = useState("calc");
  const [showCalculation, setShowCalculation] = useState(false);
  const [query, setQuery] = useState("");

  if (!projection) return null;
  const compact = mode === "drawer";
  const root = projection.root;
  const active = projection.selectedMethod;
  const methods = Array.isArray(projection.methods) ? projection.methods : [];
  const stage = stageProjection || projection;
  const stageRoot = Number.isSafeInteger(Number(stage?.root)) ? Number(stage.root) : root;
  const stageWorlds = Array.isArray(stage?.worlds) ? stage.worlds : [];
  const stageRelatedNumbers = Array.isArray(stage?.relatedNumbers) ? stage.relatedNumbers : [];
  const stageConnections = Array.isArray(stage?.connections) ? stage.connections : [];
  const regularExpressionSet = new Set(
    (Array.isArray(regularExpressions) ? regularExpressions : [])
      .map((item) => String(item?.phrase || item || "").trim())
      .filter(Boolean),
  );
  const visibleStageConnections = stageConnections.filter((item) => (
    !(item?.kind === "expression" && regularExpressionSet.has(String(item?.label || "").trim()))
  ));
  const stageLayers = Array.isArray(stage?.layers) ? stage.layers : [];
  const stageCoverage = stage?.coverage || { percent: 0, present: 0, total: stageLayers.length, note: "כיסוי שכבות" };
  const stagePulse = stage?.pulse || { activityCount: 0, meetingCount: 0, sourceCount: 0, worldCount: 0 };
  const stageCrossing = stage?.crossing || null;
  const stageZero = stage?.zeroScale || null;
  const raziel = projection.razielMicro;
  const result = active?.computedValue ?? projection.activeResult ?? null;

  const primaryMethods = useMemo(() => (
    [...methods]
      .sort((a, b) => {
        const ao = Number.isFinite(Number(a?.sortOrder)) ? Number(a.sortOrder) : Number.MAX_SAFE_INTEGER;
        const bo = Number.isFinite(Number(b?.sortOrder)) ? Number(b.sortOrder) : Number.MAX_SAFE_INTEGER;
        return ao - bo || String(a?.methodKey || "").localeCompare(String(b?.methodKey || ""), "he");
      })
      .slice(0, 6)
  ), [methods]);

  const inspectorMethod = useMemo(() => (
    methods.find((method) => method.methodKey === inspectorMethodKey)
    || methods.find((method) => method.methodKey === active?.methodKey)
    || primaryMethods[0]
    || null
  ), [methods, inspectorMethodKey, active?.methodKey, primaryMethods]);

  useEffect(() => {
    setInspectorMethodKey(active?.methodKey || primaryMethods[0]?.methodKey || null);
    setInspectorTab("calc");
    setShowCalculation(false);
  }, [active?.methodKey, root]); // eslint-disable-line react-hooks/exhaustive-deps

  const selectMethod = (method) => {
    setInspectorMethodKey(method.methodKey);
    setInspectorTab("calc");
    setShowCalculation(false);
    onMethodSelect?.(method.methodKey);
  };

  const submitQuery = (event) => {
    event?.preventDefault?.();
    const raw = query.trim();
    if (!raw) return;
    onResolveQuery?.(raw);
  };

  const bridgeFlag = (lang) => ({ en: "🇺🇸", ru: "🇷🇺", ar: "🇸🇦", es: "🇪🇸", fr: "🇫🇷", de: "🇩🇪" }[lang] || "🌐");
  const coverageValue = Math.max(0, Math.min(100, Number(stageCoverage.percent) || 0));
  const activitySummary = [
    stagePulse.meetingCount ? `${stagePulse.meetingCount} מפגשים` : null,
    stagePulse.sourceCount ? `${stagePulse.sourceCount} מקורות` : null,
    stagePulse.worldCount ? `${stagePulse.worldCount} עולמות` : null,
    stagePulse.activityCount ? `${stagePulse.activityCount} פעילויות` : null,
  ].filter(Boolean);

  return <section className={`sod29-number-core2029 sod29-number-v10 ${compact ? "is-drawer" : "is-page"}`} data-number-core-root={root} style={NUMBER_CORE_PALETTE}>
    <header className="sod29-number-v10-identity">
      <div className="sod29-number-v10-expression">
        <span>ביטוי / מספר</span>
        <strong>{projection.expression || root}</strong>
        <small>Root {root} · השיטה הפעילה משנה את התוצאה, לא את זהות הביטוי</small>
      </div>
      <div className="sod29-number-v10-root sod29-number-core2029-root">
        <small>המספר</small>
        <b className="sod29-number-value">{root}</b>
      </div>
      <button type="button" className="sod29-number-v10-raziel-orb" onClick={() => onExpandRaziel?.()} aria-label="פתח את רזיאל">
        <i aria-hidden="true" />
        <span>רזיאל</span>
      </button>
    </header>

    {onResolveQuery ? <form className="sod29-number-v10-search" onSubmit={submitQuery}>
      <input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="חפש מילה · ביטוי · מספר"
        aria-label="חפש מילה ביטוי או מספר"
      />
      <button type="submit">חפש ✦</button>
    </form> : null}

    {regularExpressions.length ? <section className={`sod29-number-v11-regular-rail${regularExpressions.length > 1 ? " has-overflow-hint" : ""}`} aria-label={`ביטויים רגילים על ${root}`}>
      <div className="sod29-number-v11-regular-head">
        <div>
          <span>רגיל = {root}</span>
          <strong>ביטויים רגילים על אותו מספר</strong>
        </div>
        <small>{regularExpressions.length} ביטויים · ↔ גרור ימינה / שמאלה</small>
      </div>
      <div className="sod29-number-v11-regular-track" role="list" key={`regular-rail:${root}`}>
        {regularExpressions.map((item) => {
          const phrase = String(item?.phrase || item || "").trim();
          const selected = phrase === String(projection.expression || "").trim();
          return <button
            type="button"
            role="listitem"
            key={phrase}
            className={selected ? "is-active" : ""}
            aria-pressed={selected}
            onClick={() => onExpressionSelect?.(phrase)}
          >
            <strong>{phrase}</strong>
            <small>= {root} · רגיל</small>
          </button>;
        })}
      </div>
    </section> : null}

    <section className="sod29-number-v10-method-switcher" aria-label="שש שיטות ראשיות">
      <div className="sod29-number-v10-method-head">
        <div><span>שש שיטות מהירות · לפי הסדר הקנוני</span><strong>{methodsLoading ? "מחשב את השיטות של הביטוי החדש…" : "נגיעה מחליפה את כל המחקר שמתחת"}</strong></div>
        {methodsLoading ? <small className="is-loading">מתעדכן…</small>
          : methods.length > primaryMethods.length ? <small>+{methods.length - primaryMethods.length} שיטות נוספות בבית המדרש</small> : null}
      </div>
      <div className="sod29-number-v10-method-grid">
        {primaryMethods.map((method) => {
          const selected = method.methodKey === active?.methodKey;
          return <button
            type="button"
            key={method.methodKey}
            className={`sod29-number-v10-method-card sod29-number-v7-method-main${selected ? " is-active" : ""}`}
            aria-pressed={selected}
            disabled={methodsLoading}
            onClick={() => selectMethod(method)}
          >
            <span>{publicMethodLabel(method)}</span>
            <strong>{method.computedValue ?? "—"}</strong>
            <small>{method.mathematicalFamily || method.category || "שיטה"}</small>
          </button>;
        })}
      </div>
    </section>

    <section className="sod29-number-v10-stage" data-stage-root={stageRoot} aria-live="polite">
      <header className="sod29-number-v10-stage-head">
        <div>
          <span>{publicMethodLabel(active)} · התוצאה הפעילה</span>
          <strong>{projection.expression || root} <em>→</em> {stageRoot}</strong>
          <small>{stageLoading ? "מחבר את המחקר של התוצאה…" : "החלל שמתחת שייך עכשיו לתוצאה הזאת בלבד"}</small>
        </div>
        <div className="sod29-number-v10-vitality" aria-label={stageLoading ? "כיסוי שכבות מתעדכן" : `כיסוי שכבות ${coverageValue} אחוז`}>
          <div className="sod29-number-v10-vitality-ring" style={{ "--vitality": stageLoading ? "0deg" : `${coverageValue * 3.6}deg` }}>
            <strong>{stageLoading ? "…" : coverageValue}</strong><small>{stageLoading ? "" : "%"}</small>
          </div>
          <div><b>כיסוי שכבות</b><small>{stageLoading ? "המידע העמוק מתעדכן ברקע" : "כמה שכבות חומר זמינות כרגע · לא ציון אמת"}</small></div>
        </div>
      </header>

      {activitySummary.length ? <div className="sod29-number-v10-pulse-row">
        {activitySummary.map((item) => <span key={item}>{item}</span>)}
      </div> : null}

      {stageLoading ? <div className="sod29-number-v10-loading is-inline"><i /> מעדכן את החיבורים של {stageRoot} ברקע…</div> : null}
        <div className="sod29-number-v10-research-grid">
          <section className="sod29-number-v10-convergence">
            <div className="sod29-number-v10-panel-head">
              <div><span>התכנסויות וחיבורים</span><strong>מה חי סביב {stageRoot}</strong></div>
              <small>{visibleStageConnections.length}</small>
            </div>
            {visibleStageConnections.length ? <div className="sod29-number-v10-chip-list">
              {visibleStageConnections.slice(0, compact ? 6 : 10).map((item, index) => <button
                type="button"
                key={`${item.label}:${index}`}
                onClick={() => onRazielAction?.("explain_connection", { kind: item.kind, label: item.label, note: item.note, resultValue: stageRoot })}
              >
                <strong>{item.label}</strong>
                <small>{item.note}</small>
              </button>)}
            </div> : <div className="sod29-number-core2029-note">{stageLoading ? `מעדכן התכנסויות של ${stageRoot}…` : "אין כרגע התכנסות נוספת להצגה בשיטה הזאת."}</div>}
          </section>

          <section className="sod29-number-v10-crossing">
            <div className="sod29-number-v10-panel-head"><div><span>הצלבה נסתרת</span><strong>{stageCrossing ? stageCrossing.partner : "אין כרגע הצלבה עצמאית"}</strong></div><span>∞</span></div>
            {stageCrossing ? <>
              <p>{stageCrossing.methods.map((method) => method.methodLabel === "קדמי · משולש" ? "משולש" : method.methodLabel).join(" · ")}</p>
              <div className="sod29-number-v10-inline-actions">
                <button type="button" onClick={() => onOpenCrossing?.(stageCrossing)}>הצג הצלבה</button>
                <button type="button" onClick={() => onRazielAction?.("explain_crossing", { kind: "crossing", partner: stageCrossing.partner, methods: stageCrossing.methods, resultValue: stageRoot })}>✦ רזיאל</button>
              </div>
            </> : <p>{stageLoading ? "בודק הצלבה לתוצאה הפעילה…" : "לא מוצגת התאמה מלאכותית רק כדי למלא את הכרטיס."}</p>}
          </section>

          {stageZero ? <section className="sod29-number-v10-zero">
            <div className="sod29-number-v10-panel-head">
              <div><span>סולם האפס</span><strong>{stageRoot}{stageZero.next != null ? ` → ${stageZero.next}` : ""}</strong></div>
              <span>◉</span>
            </div>
            <p>אותו שורש ספרתי · סדר גודל אחר · DERIVATION, לא שוויון.</p>
            {stageZero.next != null ? <button type="button" onClick={() => onOpenZero?.(stageZero.next)}>פתח {stageZero.next}</button> : null}
          </section> : null}

          {languageBridges.length ? <section className="sod29-number-v10-languages">
            <div className="sod29-number-v10-panel-head"><div><span>גשרים חוצי־שפות</span><strong>{projection.expression}</strong></div><small>{languageBridges.length}</small></div>
            <div className="sod29-number-v10-language-list">
              {languageBridges.map((bridge) => <article key={bridge.id || `${bridge.lang}:${bridge.foreign_word}`}>
                <span>{bridgeFlag(bridge.lang)}</span>
                <div><strong>{projection.expression} ↔ {bridge.foreign_word}</strong><small>{bridge.relationship_type || bridge.method || "קשר שפה"} · מאומת אנושית</small></div>
              </article>)}
            </div>
          </section> : null}

          <section className="sod29-number-v10-worlds">
            <div className="sod29-number-v10-panel-head"><div><span>עולמות ומספרים</span><strong>הסביבה של {stageRoot}</strong></div><button type="button" onClick={() => onOpenWorld?.()}>פתח בעולם ↗</button></div>
            <div className="sod29-number-v10-world-row">
              {stageWorlds.slice(0, 4).map((world) => <button key={world.label} type="button" onClick={() => onRazielAction?.("explain_world", { kind: "world", world: world.label, count: world.count || 0, resultValue: stageRoot })}>
                <span>{world.label}</span><small>{world.count || 0}</small>
              </button>)}
              {stageRelatedNumbers.slice(0, 4).map((item) => <button key={`n:${item.value}`} type="button" onClick={() => onOpenResult?.(item.value)}>
                <strong>{item.value}</strong><small>{item.sourceKind === "meeting" ? "מפגש" : item.relationType}</small>
              </button>)}
            </div>
            {!stageWorlds.length && !stageRelatedNumbers.length ? <div className="sod29-number-core2029-note">{stageLoading ? "מעדכן עולמות ומספרים קשורים…" : "אין כרגע שכבת עולם נוספת לתוצאה הזאת."}</div> : null}
          </section>
        </div>

        <section className="sod29-number-v10-calculation-card">
          <div>
            <span>חישוב השיטה</span>
            <strong>{projection.expression} · {publicMethodLabel(active)} = {stageRoot}</strong>
            <small>Trace קנוני · החישוב הבסיסי נשאר גלוי; העומק נפתח לפי דרישה</small>
          </div>
          <button type="button" onClick={() => setShowCalculation((value) => !value)}>{showCalculation ? "סגור חישוב" : "פתח חישוב"}</button>
        </section>

        {showCalculation ? <MethodInspector
          method={inspectorMethod}
          projection={stage}
          tab={inspectorTab}
          setTab={setInspectorTab}
          traceState={traceState}
          traceOpen={traceOpen}
          traceSteps={traceSteps}
          traceDetail={traceDetail}
          onToggleTrace={onToggleTrace}
          onRazielAction={onRazielAction}
          onExpandRaziel={onExpandRaziel}
          onOpenHeichal={onOpenHeichal}
          onClose={() => setShowCalculation(false)}
        /> : null}

        <footer className="sod29-number-v10-stage-actions">
          <button type="button" onClick={() => onRazielAction?.("next_research_step", { kind: "method_result", methodKey: active?.methodKey || null, methodLabel: publicMethodLabel(active), resultValue: stageRoot })}>✦ שאל את רזיאל</button>
          <button type="button" onClick={() => onOpenWorld?.()}>◉ פתח בעולם</button>
          <button type="button" className="primary" onClick={() => onOpenHeichal?.({ kind: "method_result_deep", root, expression: projection.expression, methodKey: active?.methodKey || null, resultValue: stageRoot })}>◇ חקור בהיכל</button>
        </footer>

        <div className="sod29-number-v10-premium-ready">
          <span>👑 עומק מתקדם</span>
          <small>השוואות כבדות, גרף עמוק וכלים מתקדמים אינם נטענים מראש. Premium runtime אמיתי יחובר רק דרך entitlement קנוני.</small>
        </div>
    </section>

    <footer className="sod29-number-core2029-foot sod29-number-dashboard-actions">
      {onOpenJourney ? <button type="button" onClick={onOpenJourney}>🗺 {journeyLabel || "צא למסע"}</button>
        : onOpenWorld ? <button type="button" onClick={onOpenWorld}>🗺 עולם</button> : null}
      <button type="button" onClick={() => onRazielAction?.("compare_methods")}>⚖ השווה</button>
      <button type="button" onClick={() => onExpandRaziel?.()}>✨ רזיאל</button>
      {compact && onOpenPage ? <button type="button" className="primary" onClick={onOpenPage}>פתח דף מלא ↗</button> : null}
    </footer>

    {stageZero && compact && stageZero.next != null ? <button className="sod29-number-dashboard-open-result" type="button" onClick={() => onOpenZero?.(stageZero.next)}>Zero Scale · {stageRoot} → {stageZero.next}</button> : null}
  </section>;
}
