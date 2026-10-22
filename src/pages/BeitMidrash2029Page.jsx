import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import MethodTraceExplanation2029 from "../components/gematria2029/MethodTraceExplanation2029.jsx";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { methodMechanicalDefinition } from "../lib/research/beitMidrashMethodDefinition.js";
import { applySeo } from "../lib/seo.js";
import "../components/gematria2029/spatialMethodStage2029.css";
import "./beitMidrash2029.css";

const SAMPLE_EXPRESSION = "חכמה";
const CATEGORY_LABELS = Object.freeze({
  base: "שיטות יסוד",
  composite: "שיטות מורכבות",
  depth: "שיטות עומק",
  context: "שיטות תלויות הקשר",
});

const clean = (value) => value == null ? "" : String(value).trim();

function decodeMethod(value) {
  if (!value) return "";
  try {
    return decodeURIComponent(value).trim();
  } catch {
    return clean(value);
  }
}

function projectMethod(row, profileByKey) {
  const profile = profileByKey.get(row.method_key) || {};
  return Object.freeze({
    ...profile,
    registry: row,
    methodKey: row.method_key,
    displayLabel: row.display_label || profile.displayLabel || row.method_key,
    category: row.category || profile.category || null,
    lifecycleActive: row.active === true,
    registered: row.registered === true,
    executable: row.executable === true,
    engineVerified: row.engine_verified === true,
    scannable: row.scannable !== false,
    executionKind: row.execution_kind || profile.executionKind || null,
    operator: row.operator || profile.operator || null,
    derivedFrom: Array.isArray(row.derived_from) ? row.derived_from : profile.derivedFrom || [],
    definitionVersion: row.method_version ?? profile.definitionVersion ?? null,
    requiredEntitlement: row.required_entitlement || profile.requiredEntitlement || null,
    unavailableReason: row.not_scannable_reason || null,
  });
}

function MethodStatus({ method }) {
  if (!method.lifecycleActive) return <span className="sod29-midrash-status is-resting">רשומה · לא פעילה</span>;
  if (!method.executable) return <span className="sod29-midrash-status is-warning">פעילה ברישום · לא זמינה לחישוב</span>;
  return <span className="sod29-midrash-status is-active">פעילה במנוע</span>;
}

function MethodList({ methods, selectedKey, onSelect }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const method of methods) {
      const key = method.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(method);
    }
    return [...map.entries()];
  }, [methods]);

  return <nav className="sod29-midrash-method-nav" aria-label="שיטות הגימטריה הפעילות">
    {groups.map(([category, rows]) => <section key={category}>
      <h2>{CATEGORY_LABELS[category] || "שיטות נוספות"} <span>{rows.length}</span></h2>
      <div>
        {rows.map((method) => <Link
          key={method.methodKey}
          to={`/beit-midrash/${encodeURIComponent(method.methodKey)}`}
          className={method.methodKey === selectedKey ? "is-selected" : ""}
          aria-current={method.methodKey === selectedKey ? "page" : undefined}
          onClick={() => onSelect(method.methodKey)}
        >
          <span>{method.displayLabel}</span>
          <small>{method.computedValue == null ? "דוגמה לא זמינה" : `${SAMPLE_EXPRESSION} = ${method.computedValue}`}</small>
        </Link>)}
      </div>
    </section>)}
  </nav>;
}

function MethodStudy({ method, methods, traceState, onLoadTrace }) {
  const labels = useMemo(
    () => new Map(methods.map((item) => [item.methodKey, item.displayLabel])),
    [methods],
  );
  const definition = useMemo(
    () => methodMechanicalDefinition(method.registry, method, labels),
    [labels, method],
  );
  const trace = traceState?.finding?.projection?.dimensions?.trace || null;
  const traceRequested = Boolean(traceState?.loading || traceState?.finding || traceState?.error);

  return <article className="sod29-midrash-study" aria-labelledby="beit-midrash-method-title">
    <header>
      <div>
        <span className="sod29-midrash-kicker">לימוד שיטה</span>
        <h2 id="beit-midrash-method-title">{method.displayLabel}</h2>
        {method.displayLabel !== method.methodKey ? <code>{method.methodKey}</code> : null}
      </div>
      <MethodStatus method={method} />
    </header>

    <p className="sod29-midrash-truth-note">
      מצב פעיל מתאר זמינות ברישום ובמנוע בלבד; הוא אינו אישור מחקרי, פרסום או חותמת אמת.
    </p>

    <div className="sod29-midrash-definition-grid">
      <section>
        <h3>מה השיטה עושה</h3>
        <p>{definition.what}</p>
      </section>
      {definition.structure ? <section>
        <h3>איך היא בנויה</h3>
        <p>{definition.structure}</p>
      </section> : null}
      {definition.dependencies.length ? <section>
        <h3>תלויות וזהירות מספירה כפולה</h3>
        <ul>{definition.dependencies.map((item) => <li key={item}>{item}</li>)}</ul>
      </section> : null}
      {definition.interpretation ? <section>
        <h3>רעיון מחקרי</h3>
        <p>{definition.interpretation}</p>
        <small>פרשנות זו נפרדת מן החישוב המספרי.</small>
      </section> : null}
    </div>

    <section className="sod29-midrash-sample" aria-label="דוגמה קנונית">
      <div>
        <span>דוגמה חיה מהמנוע</span>
        <strong>{SAMPLE_EXPRESSION}</strong>
      </div>
      <b>{method.computedValue ?? "—"}</b>
      <small>{method.computedValue == null ? "לא התקבלה כרגע תוצאה קנונית לשיטה זו." : "התוצאה התקבלה מפרופיל השיטות הקנוני."}</small>
    </section>

    <div className="sod29-midrash-actions">
      <button type="button" onClick={onLoadTrace} disabled={traceState?.loading || method.computedValue == null}>
        <NavigationIcon2029 name="layers" />
        {traceState?.loading ? "פותח את צעדי החישוב…" : traceRequested ? "טען את העקבה מחדש" : "איך המנוע הגיע לתוצאה?"}
      </button>
      <Link to={`/2029/calculator?q=${encodeURIComponent(SAMPLE_EXPRESSION)}&m=${encodeURIComponent(method.methodKey)}`}>
        <NavigationIcon2029 name="number" /> נסו במחשבון הקנוני
      </Link>
      <Link to={`/beit-midrash/${encodeURIComponent(method.methodKey)}`} data-canonical-method-link="true">
        קישור קנוני לשיטה
      </Link>
    </div>

    {traceState?.error ? <FrameState kind="error" title="עקבת החישוב אינה זמינה כרגע">
      הגדרת השיטה והדוגמה נשארות גלויות; לא הומצאו צעדים חלופיים.
    </FrameState> : null}

    {traceState?.loading ? <FrameState kind="loading" title="פותח את עקבת המנוע">
      הצעדים נטענים רק לאחר בקשה מפורשת.
    </FrameState> : null}

    {traceState?.finding ? <section className="sod29-midrash-trace" aria-label="הסבר ועקבת חישוב">
      <MethodTraceExplanation2029
        method={method}
        methods={methods}
        expression={SAMPLE_EXPRESSION}
        trace={trace}
      />
    </section> : null}
  </article>;
}

export default function BeitMidrash2029Page() {
  const { method: routeMethod } = useParams();
  const requestedMethod = decodeMethod(routeMethod);
  const [state, setState] = useState({ loading: true, registry: [], profile: [], profileError: false, error: null });
  const [selectedKey, setSelectedKey] = useState("");
  const [traces, setTraces] = useState({});

  useEffect(() => {
    applySeo({
      title: "בית המדרש · לימוד שיטות · SOD1820",
      description: "לימוד שיטות הגימטריה מתוך הרישום והמנוע הקנוניים של SOD1820.",
      path: "/beit-midrash",
      noindex: true,
    });

    let live = true;
    Promise.allSettled([
      fetchGematriaMethodStates(),
      fetchNumberMethodProfile(SAMPLE_EXPRESSION),
    ]).then(([registryResult, profileResult]) => {
      if (!live) return;
      if (registryResult.status === "rejected") {
        setState({ loading: false, registry: [], profile: [], profileError: profileResult.status === "rejected", error: registryResult.reason });
        return;
      }
      setState({
        loading: false,
        registry: Array.isArray(registryResult.value) ? registryResult.value : [],
        profile: profileResult.status === "fulfilled" && Array.isArray(profileResult.value) ? profileResult.value : [],
        profileError: profileResult.status === "rejected",
        error: null,
      });
    });
    return () => { live = false; };
  }, []);

  const methods = useMemo(() => {
    const profileByKey = new Map(state.profile.map((row) => [row.methodKey, row]));
    return state.registry.map((row) => projectMethod(row, profileByKey));
  }, [state.profile, state.registry]);
  const activeMethods = useMemo(() => methods.filter((method) => method.lifecycleActive), [methods]);
  const unavailableMethods = useMemo(() => methods.filter((method) => method.registered && !method.lifecycleActive), [methods]);

  useEffect(() => {
    if (!methods.length) return;
    if (requestedMethod) {
      const exact = methods.find((method) => method.methodKey === requestedMethod || method.displayLabel === requestedMethod);
      setSelectedKey(exact?.methodKey || "");
      return;
    }
    setSelectedKey((current) => methods.some((method) => method.methodKey === current)
      ? current
      : activeMethods[0]?.methodKey || "");
  }, [activeMethods, methods, requestedMethod]);

  const selectedMethod = methods.find((method) => method.methodKey === selectedKey) || null;

  const loadTrace = async () => {
    if (!selectedMethod || selectedMethod.computedValue == null) return;
    const key = selectedMethod.methodKey;
    setTraces((current) => ({ ...current, [key]: { loading: true, finding: null, error: null } }));
    try {
      const finding = await fetchGematriaMethodTrace(key, SAMPLE_EXPRESSION);
      setTraces((current) => ({
        ...current,
        [key]: finding
          ? { loading: false, finding, error: null }
          : { loading: false, finding: null, error: new Error("TRACE_UNAVAILABLE") },
      }));
    } catch (error) {
      setTraces((current) => ({ ...current, [key]: { loading: false, finding: null, error } }));
    }
  };

  return <Sod2029Shell
    surface="beit-midrash"
    introVariant="compact"
    symbol={<NavigationIcon2029 name="books" />}
    eyebrow="לומדים · שיטות ומקורות"
    title="בית המדרש"
    description="בית עצמאי ללימוד דרכי החישוב והמקורות. החישוב עצמו נשאר במחשבון הקנוני."
  >
    <main className="sod29-midrash" data-experience-surface="beit-midrash" data-canonical-route="/beit-midrash">
      <header className="sod29-midrash-intro">
        <div>
          <span>חתך ראשון · לימוד שיטות</span>
          <h1>לומדים איך השיטה עובדת</h1>
          <p>כל הגדרה, מצב ודוגמה נפתחים מן הרישום והמנוע הקיימים. בית המדרש אינו מחשבון נוסף ואינו חלק מן העולם.</p>
        </div>
        <Link to="/2029/calculator"><NavigationIcon2029 name="number" /> למחשבון</Link>
      </header>

      {state.loading ? <FrameState kind="loading" title="פותח את רישום השיטות">
        קורא את השיטות והדוגמה מן המקורות הקנוניים.
      </FrameState> : null}

      {state.error ? <FrameState kind="error" title="לא ניתן לפתוח כרגע את רישום השיטות">
        לא מוצגת רשימה מקומית חלופית.
      </FrameState> : null}

      {!state.loading && !state.error && !activeMethods.length ? <FrameState kind="empty" title="אין כרגע שיטות פעילות להצגה">
        שיטות שאינן פעילות אינן מוצגות כאילו הן זמינות לחישוב.
      </FrameState> : null}

      {state.profileError && !state.error ? <div className="sod29-midrash-inline-warning" role="status">
        רישום השיטות נטען, אך הדוגמה החיה אינה זמינה כרגע. לא יוצגו ערכים חלופיים.
      </div> : null}

      {requestedMethod && !state.loading && !state.error && !selectedMethod ? <FrameState kind="error" title="השיטה המבוקשת לא נמצאה ברישום החי">
        אפשר לבחור שיטה קיימת מן הרשימה. הכתובת לא הוסבה לעמוד אחר.
      </FrameState> : null}

      {activeMethods.length ? <div className="sod29-midrash-layout">
        <MethodList methods={activeMethods} selectedKey={selectedKey} onSelect={setSelectedKey} />
        {selectedMethod ? <MethodStudy
          method={selectedMethod}
          methods={methods}
          traceState={traces[selectedMethod.methodKey]}
          onLoadTrace={loadTrace}
        /> : <FrameState kind="empty" title="בחרו שיטה ללימוד">
          הרשימה נשארת זמינה גם אם קישור ישיר אינו מזוהה.
        </FrameState>}
      </div> : null}

      {unavailableMethods.length ? <details className="sod29-midrash-unavailable">
        <summary>שיטות רשומות שאינן פעילות כרגע · {unavailableMethods.length}</summary>
        <div>{unavailableMethods.map((method) => <div key={method.methodKey}>
          <span>{method.displayLabel}</span>
          <small>{method.unavailableReason || "רשומה, לא פעילה כרגע"}</small>
        </div>)}</div>
      </details> : null}
    </main>
  </Sod2029Shell>;
}
