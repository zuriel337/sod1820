import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState } from "../components/experience2029/Sod2029Shell.jsx";
import NavigationIcon2029 from "../components/experience2029/NavigationIcon2029.jsx";
import ConvergenceRatings2029 from "../components/experience2029/ConvergenceRatings2029.jsx";
import MethodTraceExplanation2029 from "../components/gematria2029/MethodTraceExplanation2029.jsx";
import { useAuth } from "../lib/AuthContext.jsx";
import { fetchGematriaMethodStates } from "../lib/research/gematriaMethodRegistry.js";
import { fetchNumberMethodProfile } from "../lib/research/numberCoreProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { methodMechanicalDefinition } from "../lib/research/beitMidrashMethodDefinition.js";
import { fetchWorldAllResearchProjection } from "../lib/research/worldAllResearchProjection.js";
import { fetchWorldFindingReviewPage } from "../lib/research/worldFindingReviewClient.js";
import {
  BEIT_MIDRASH_WORLD_AUDIENCE,
  BEIT_MIDRASH_WORLD_SECTION,
  beitMidrashWorldSectionHref,
  buildBeitMidrashWorldSections,
} from "../lib/research/beitMidrashWorldSections.js";
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
const FINDING_SECTIONS = Object.freeze([
  Object.freeze({ key: BEIT_MIDRASH_WORLD_SECTION.CROSSES, label: "הצלבות", description: "כל הממצאים המותרים לקריאה" }),
  Object.freeze({ key: BEIT_MIDRASH_WORLD_SECTION.ATLAS, label: "אטלס", description: "ממצאים שכבר מחוברים ליעד בעץ" }),
  Object.freeze({ key: BEIT_MIDRASH_WORLD_SECTION.CONVERGENCE, label: "התכנסות", description: "ממצאים שליעד המדויק שלהם יש מד" }),
]);
const FINDING_SECTION_KEYS = new Set(FINDING_SECTIONS.map((section) => section.key));
const EMPTY_FINDING_ROWS = Object.freeze([]);

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

function missingLabel(value, fallback = "אין נתון") {
  return value == null || value === "" ? fallback : value;
}

function FindingCard({ finding, section, focused, admin }) {
  const rating = finding.linkedTopicRating || null;
  const ratingNumbers = rating?.numbers?.length ? rating.numbers : finding.values;
  const highlightedNumbers = rating?.highlightNumbers?.length ? rating.highlightNumbers : finding.values;
  const evidenceLabel = finding.evidenceQuality?.label || "אין נתון";
  const independentSources = finding.independentSourceCount > 0
    ? finding.independentSourceCount
    : "אין נתון";

  return <article
    id={`finding-${finding.sourceId}`}
    className={`sod29-midrash-finding${focused ? " is-focused" : ""}`}
    data-finding-id={finding.sourceId}
  >
    <header>
      <div className="sod29-midrash-finding-tags">
        <span>{finding.kind || "ממצא מחקר"}</span>
        <span>{finding.verification || "טרם נבדק"}</span>
        <span>{finding.status || "לא צוין"}</span>
        {admin && finding.access ? <span>{finding.access}</span> : null}
      </div>
      {finding.createdAt ? <time dateTime={finding.createdAt}>{new Date(finding.createdAt).toLocaleDateString("he-IL")}</time> : null}
    </header>

    <h3>{finding.statement || "ממצא מחקר"}</h3>
    {finding.secondary && finding.secondary !== finding.statement ? <p>{finding.secondary}</p> : null}

    <dl className="sod29-midrash-finding-measures" aria-label="מדדים נפרדים לממצא">
      <div><dt>איכות ראיות</dt><dd>{evidenceLabel}</dd></div>
      <div><dt>מקורות עצמאיים</dt><dd>{independentSources}</dd></div>
      <div><dt>ביטחון</dt><dd>{missingLabel(finding.confidence, "טרם דורג")}</dd></div>
      <div><dt>מצב אימות</dt><dd>{finding.verification || "טרם נבדק"}</dd></div>
    </dl>

    <section className="sod29-midrash-target-meter" aria-label="מד יעד מדויק">
      <div>
        <small>יעד מדויק בעולם</small>
        <strong>{rating?.title || "טרם חובר ליעד עם מד"}</strong>
        <p>{rating
          ? "זהו המד של יעד ההתכנסות בעץ, לא ציון של הממצא ולא ציון אמת."
          : "ערך חסר נשאר ללא נתון ואינו מוצג כאפס."}</p>
      </div>
      <ConvergenceRatings2029
        quality={rating?.quality ?? null}
        meterScore={rating?.meterScore ?? null}
        highlightNumbers={highlightedNumbers || []}
        numbers={ratingNumbers || []}
        popover
      />
      {rating?.href ? <Link to={rating.href}>פתחו את יעד העץ</Link> : null}
    </section>

    {finding.treeMatches.length ? <details className="sod29-midrash-tree-matches">
      <summary>חיבורים מתועדים לעץ · {finding.treeMatches.length}</summary>
      <ul>{finding.treeMatches.map((match, index) => <li key={`${match.type}:${match.key}:${index}`}>
        {match.label || match.key} <small>{match.type}</small>
      </li>)}</ul>
    </details> : null}

    {admin && finding.triage ? <details className="sod29-midrash-triage">
      <summary>סקירת מנהל · {finding.triage.strength || "טרם דורג"}</summary>
      <p>{finding.triage.evidenceReason || "אין עדיין נימוק מיון."}</p>
      <dl>
        <div><dt>המלצה</dt><dd>{finding.triage.recommendation || "טרם מוין"}</dd></div>
        <div><dt>יעד מוצע</dt><dd>{finding.triage.proposedTreeTarget || "אין נתון"}</dd></div>
      </dl>
    </details> : null}

    {finding.occurrences.length > 1 ? <details className="sod29-midrash-occurrences">
      <summary>כל ההופעות נשמרו · {finding.occurrences.length}</summary>
      <ul>{finding.occurrences.map((occurrence, index) => <li key={`${occurrence.sourceId || "source"}:${index}`}>
        <code dir="ltr">{occurrence.sourceRef || "אין source locator"}</code>
      </li>)}</ul>
    </details> : null}

    <footer>
      <div>
        <small>מקור מדויק</small>
        <code dir="ltr">{finding.sourceRef || "אין source locator"}</code>
      </div>
      <div className="sod29-midrash-finding-actions">
        <a href={finding.canonicalFindingHref} target="_blank" rel="noreferrer">פתחו את הממצא בעולם ↗</a>
        {finding.sourceHref ? <a href={finding.sourceHref} target="_blank" rel="noreferrer">פתחו מקור ↗</a> : null}
        <Link to={beitMidrashWorldSectionHref(section, finding.sourceId)}>קישור מדויק כאן</Link>
      </div>
    </footer>
  </article>;
}

function WorldFindingsStudy({ admin, authLoading }) {
  const location = useLocation();
  const params = new URLSearchParams(location.search);
  const requestedSection = params.get("tab");
  const activeSection = FINDING_SECTION_KEYS.has(requestedSection)
    ? requestedSection
    : BEIT_MIDRASH_WORLD_SECTION.CROSSES;
  const focusedFinding = clean(params.get("finding"));
  const [retryKey, setRetryKey] = useState(0);
  const [state, setState] = useState({ loading: false, data: null, error: null });

  useEffect(() => {
    if (authLoading) return undefined;
    let live = true;
    const controller = new AbortController();
    setState({ loading: true, data: null, error: null });
    const reader = admin
      ? fetchWorldFindingReviewPage({ signal: controller.signal })
      : fetchWorldAllResearchProjection();

    reader.then((projection) => {
      if (!live) return;
      setState({
        loading: false,
        data: buildBeitMidrashWorldSections(projection, {
          audience: admin ? BEIT_MIDRASH_WORLD_AUDIENCE.ADMIN : BEIT_MIDRASH_WORLD_AUDIENCE.PUBLIC,
        }),
        error: null,
      });
    }).catch((error) => {
      if (!live || error?.name === "AbortError") return;
      setState({ loading: false, data: null, error });
    });
    return () => { live = false; controller.abort(); };
  }, [admin, authLoading, retryKey]);

  const rows = state.data?.sections?.[activeSection] || EMPTY_FINDING_ROWS;
  const activeSpec = FINDING_SECTIONS.find((section) => section.key === activeSection);

  useEffect(() => {
    if (!focusedFinding || !rows.some((finding) => finding.sourceId === focusedFinding)) return undefined;
    const frame = requestAnimationFrame(() => {
      document.getElementById(`finding-${focusedFinding}`)?.scrollIntoView({ block: "center" });
    });
    return () => cancelAnimationFrame(frame);
  }, [focusedFinding, rows]);

  return <section className="sod29-midrash-discoveries" id="beit-midrash-discoveries" aria-labelledby="beit-midrash-discoveries-title">
    <header>
      <div>
        <span className="sod29-midrash-kicker">מגלים · אותם ממצאים, עדשות לימוד שונות</span>
        <h2 id="beit-midrash-discoveries-title">מן המקור אל מפת הידע</h2>
        <p>בית המדרש מסביר את הממצא ואת מקורותיו. הממצא המלא, הדירוג והקשרים הקנוניים נשארים בעולם.</p>
      </div>
      {admin ? <span className="sod29-midrash-admin-mode">תצוגת מנהל</span> : <span className="sod29-midrash-public-mode">חומר שפורסם לציבור</span>}
    </header>

    <nav className="sod29-midrash-finding-tabs" aria-label="עדשות ממצאים">
      {FINDING_SECTIONS.map((section) => <Link
        key={section.key}
        to={beitMidrashWorldSectionHref(section.key)}
        className={section.key === activeSection ? "is-active" : ""}
        aria-current={section.key === activeSection ? "page" : undefined}
      >
        <strong>{section.label}</strong>
        <small>{section.description}</small>
      </Link>)}
    </nav>

    {authLoading || state.loading ? <FrameState kind="loading" title="פותח את ממצאי העולם">
      אותה projection קנונית נטענת פעם אחת ומוצגת כאן כעדשת לימוד.
    </FrameState> : null}

    {state.error ? <FrameState kind="error" title="הממצאים אינם זמינים כרגע">
      <button type="button" className="sod29-midrash-retry" onClick={() => setRetryKey((value) => value + 1)}>נסו שוב</button>
    </FrameState> : null}

    {!authLoading && !state.loading && !state.error && !rows.length ? <FrameState kind="empty" title={`אין כרגע ממצאים במדור ${activeSpec?.label || "זה"}`}>
      אין נתון מוצג כאפס, ולא נפתחת רשימה מקומית חלופית.
    </FrameState> : null}

    {rows.length ? <div className="sod29-midrash-finding-list" aria-live="polite">
      {rows.map((finding) => <FindingCard
        key={finding.sourceId || finding.id}
        finding={finding}
        section={activeSection}
        focused={finding.sourceId === focusedFinding}
        admin={admin}
      />)}
    </div> : null}
  </section>;
}

export default function BeitMidrash2029Page() {
  const { method: routeMethod } = useParams();
  const { isAdmin, loading: authLoading } = useAuth();
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

      <WorldFindingsStudy admin={isAdmin} authLoading={authLoading} />
    </main>
  </Sod2029Shell>;
}
