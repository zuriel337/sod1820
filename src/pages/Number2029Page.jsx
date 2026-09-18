import React, { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchGematriaMethodTrace } from "../lib/research/gematriaTrace.js";
import { applySeo } from "../lib/seo.js";
import "./number2029.css";

const GOLDEN_878_JOURNEY_ID = "golden:878:v1";

const clean = (value) => value == null ? "" : String(value).trim();

function phraseOf(item) {
  if (typeof item === "string") return clean(item);
  return clean(item?.phrase || item?.label);
}

function methodKey(group) {
  return clean(group?.registry?.method_key || group?.method_key || group?.method);
}

function methodLabel(group) {
  return clean(group?.registry?.display_label || group?.display_label || group?.method || group?.method_key) || "שיטה";
}

function sourceLabel(row) {
  return clean(row?.display_name || row?.title || row?.name || row?.label || row?.source_label) || "מקור";
}

function sourceDetail(row) {
  return clean(row?.locator || row?.citation || row?.reference || row?.subtitle || row?.kind);
}

function traceStepLabel(step) {
  if (typeof step === "string") return clean(step);
  return clean(step?.label || step?.word || step?.step || step?.expression || step?.description);
}

function NumberMetric({ value, label, note, onClick }) {
  const body = <>
    <strong>{value}</strong>
    <span>{label}</span>
    {note ? <small>{note}</small> : null}
  </>;
  return onClick
    ? <button type="button" className="sod29-number-metric" onClick={onClick}>{body}</button>
    : <div className="sod29-number-metric">{body}</div>;
}

function NumberPageBody() {
  const { value } = useParams();
  const navigate = useNavigate();
  const shell = use2029Shell();
  const research = useResearch();
  const root = Number(value);

  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [selectedMethodKey, setSelectedMethodKey] = useState("");
  const [activeExpression, setActiveExpression] = useState("");
  const [query, setQuery] = useState("");
  const [showAllMethods, setShowAllMethods] = useState(false);
  const [traceState, setTraceState] = useState({ loading: false, finding: null, error: null });
  const [traceOpen, setTraceOpen] = useState(false);

  useEffect(() => {
    if (!Number.isInteger(root) || root < 0) {
      setState({ loading: false, data: null, error: new Error("invalid-number") });
      return undefined;
    }
    let alive = true;
    setState({ loading: true, data: null, error: null });
    setSelectedMethodKey("");
    setActiveExpression("");
    setQuery("");
    setShowAllMethods(false);
    setTraceOpen(false);
    fetchEntityHubProjection({
      type: "number",
      key: String(root),
      relationLimit: 120,
      researchLimit: 80,
      topicLimit: 24,
    })
      .then((data) => {
        if (alive) setState({ loading: false, data, error: null });
      })
      .catch((error) => {
        if (alive) setState({ loading: false, data: null, error });
      });
    return () => { alive = false; };
  }, [root]);

  const data = state.data;
  const families = Array.isArray(data?.gematria?.families) ? data.gematria.families : [];
  const topics = Array.isArray(data?.topics?.rows) ? data.topics.rows : [];
  const relations = Array.isArray(data?.graph?.relations) ? data.graph.relations : [];
  const sources = Array.isArray(data?.sources) ? data.sources : [];
  const worlds = Array.isArray(data?.numberWorlds) ? data.numberWorlds : [];
  const researchFindings = Array.isArray(data?.research?.findings) ? data.research.findings : [];
  const zeroScale = Array.isArray(data?.zeroScale?.scale_chain) ? data.zeroScale.scale_chain : [];
  const surface = data?.surface || {};

  useEffect(() => {
    if (!families.length) return;
    if (selectedMethodKey && families.some((group) => methodKey(group) === selectedMethodKey)) return;
    const first = families[0];
    setSelectedMethodKey(methodKey(first));
    const firstPhrase = phraseOf(first?.phrases?.[0]);
    setActiveExpression(firstPhrase || String(root));
    setQuery(firstPhrase || "");
  }, [families, root, selectedMethodKey]);

  const selectedGroup = useMemo(
    () => families.find((group) => methodKey(group) === selectedMethodKey) || families[0] || null,
    [families, selectedMethodKey],
  );
  const selectedPhrases = useMemo(
    () => (Array.isArray(selectedGroup?.phrases) ? selectedGroup.phrases : []).map(phraseOf).filter(Boolean).slice(0, 24),
    [selectedGroup],
  );
  const visibleMethods = showAllMethods ? families : families.slice(0, 6);

  useEffect(() => {
    const key = methodKey(selectedGroup);
    if (!key || !activeExpression) {
      setTraceState({ loading: false, finding: null, error: null });
      return undefined;
    }
    let alive = true;
    setTraceState({ loading: true, finding: null, error: null });
    fetchGematriaMethodTrace(key, activeExpression)
      .then((finding) => {
        if (alive) setTraceState({ loading: false, finding: finding || null, error: null });
      })
      .catch((error) => {
        if (alive) setTraceState({ loading: false, finding: null, error });
      });
    return () => { alive = false; };
  }, [selectedGroup, activeExpression]);

  const trace = traceState.finding?.projection?.dimensions?.trace || null;
  const activeResult = traceState.finding?.subject?.value ?? trace?.result ?? trace?.value ?? null;
  const traceSteps = Array.isArray(trace?.steps) ? trace.steps.map(traceStepLabel).filter(Boolean) : [];

  const activityCount = [
    Number(surface.postsCount ?? surface.posts?.length ?? 0),
    Number(surface.galleriesCount ?? surface.galleries?.length ?? 0),
    Number(surface.insightsCount ?? surface.insights?.length ?? 0),
    Number(surface.commentsCount ?? 0),
    Number(surface.eventsCount ?? 0),
  ].reduce((sum, n) => sum + (Number.isFinite(n) ? n : 0), 0);

  const activeLayers = [
    families.length,
    topics.length,
    relations.length,
    sources.length,
    worlds.length,
    researchFindings.length,
  ].filter((count) => Number(count) > 0).length;

  useEffect(() => {
    if (!Number.isInteger(root)) return;
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: `/2029/number/${root}`,
    };
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: methodKey(selectedGroup) || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    const current = research.context;
    if (current?.subject?.type === "number" && String(current.subject.id) === String(root)) {
      research.updateResearchContext?.({ selection, lens: "number" });
    } else {
      research.setResearchContext?.({ subject, selection, lens: "number", locale: "he" });
    }
  }, [root, activeExpression, selectedGroup, activeResult]); // eslint-disable-line react-hooks/exhaustive-deps

  const openWorld = ({ journey = false } = {}) => {
    if (!Number.isInteger(root)) return;
    const current = research.context || {};
    const subject = {
      id: String(root),
      type: "number",
      label: String(root),
      href: `/2029/number/${root}`,
    };
    const selection = {
      entityId: String(root),
      entityType: "number",
      expression: activeExpression || null,
      method: methodKey(selectedGroup) || null,
      resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
    };
    const returnTo = {
      href: `/2029/number/${root}`,
      label: `דף ${root}`,
      subject,
      selection,
      lens: "number",
      dimensions: current.dimensions || {},
      journey: current.journey || null,
    };

    if (journey && root === 878) {
      research.addJourney?.({
        root: 878,
        path: [{ type: "number", value: 878 }],
        world: "world",
        msg: GOLDEN_878_JOURNEY_ID,
      });
      research.setResearchContext?.({
        subject,
        selection,
        lens: "world",
        journey: { id: GOLDEN_878_JOURNEY_ID, kind: "golden", position: 0 },
        dimensions: {
          ...(current.dimensions || {}),
          journeySource: "number-2029-preview",
          journeyRoot: 878,
          journeyVisitedValues: [878],
          journeyMeetingSlugs: [],
        },
        returnTo,
      });
    } else {
      research.setResearchContext?.({
        subject,
        selection,
        lens: "world",
        dimensions: {
          ...(current.dimensions || {}),
          numberHome: `/2029/number/${root}`,
        },
        returnTo,
      });
    }
    navigate("/world");
  };

  const askRaziel = () => {
    research.updateResearchContext?.({
      selection: {
        entityId: String(root),
        entityType: "number",
        expression: activeExpression || null,
        method: methodKey(selectedGroup) || null,
        resultValue: Number.isFinite(Number(activeResult)) ? Number(activeResult) : null,
      },
      lens: "number",
    });
    shell.openRaziel();
  };

  const submitQuery = (event) => {
    event?.preventDefault?.();
    const raw = clean(query);
    if (!raw) return;
    if (/^\d+$/.test(raw)) {
      navigate(`/2029/number/${Number(raw)}`);
      return;
    }
    setActiveExpression(raw);
    setTraceOpen(false);
  };

  if (!Number.isInteger(root) || root < 0) {
    return <FrameState kind="error" title="המספר לא תקין">הדוגמה הזאת מקבלת כרגע מספר שלם בלבד.</FrameState>;
  }
  if (state.loading) {
    return <FrameState kind="loading" title={`פותח את ${root}`}>טוען את ליבת המספר מה־2029 projection.</FrameState>;
  }
  if (state.error || !data) {
    return <FrameState kind="unavailable" title="דף המספר לא זמין כרגע">לא מוצג חומר חלופי ולא נעשה fallback ל־Legacy בתוך עץ 2029.</FrameState>;
  }

  return <div className="sod29-number-page" data-number-root={root} data-truth-safe="true">
    <section className="sod29-number-hero">
      <form className="sod29-number-resolver" onSubmit={submitQuery}>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          aria-label="שם, ביטוי או מספר"
          placeholder="שם · ביטוי · מספר"
        />
        <button className="sod29-action primary" type="submit">פתח</button>
      </form>

      <div className="sod29-number-identity">
        <div className="sod29-kicker">NUMBER / EXPRESSION · 2029 PREVIEW</div>
        <div className="sod29-number-expression">{activeExpression || root}</div>
        <div className="sod29-number-value">{root}</div>
        <div className="sod29-number-result">
          {traceState.loading ? "מחשב דרך המנוע…" : activeResult != null
            ? <><b>{methodLabel(selectedGroup)}</b><span>→</span><strong>{activeResult}</strong></>
            : <span>בחר ביטוי ושיטה כדי לפתוח תוצאה פעילה</span>}
        </div>
      </div>

      <div className="sod29-number-core" aria-label={`ליבת המספר ${root}`}>
        <NumberMetric value={families.length} label="שיטות" note="מה־projection הקנוני" onClick={() => document.getElementById("number-methods")?.scrollIntoView({ behavior: "smooth" })} />
        <NumberMetric value={topics.length} label="מפגשים" note="לא ציון אמת" onClick={() => document.getElementById("number-meetings")?.scrollIntoView({ behavior: "smooth" })} />
        <div className="sod29-number-pulse">
          <div className="sod29-number-pulse-ring" aria-hidden="true"><span /></div>
          <strong>מחקר חי</strong>
          <small>{activityCount ? `${activityCount} פעילויות` : "אין פעילות חדשה להצגה"}</small>
          <span>{activeLayers} שכבות זמינות</span>
        </div>
        <NumberMetric value={relations.length} label="נתיבים" note={zeroScale.length ? `כולל Zero Scale × ${zeroScale.length}` : "קשרים עם provenance"} onClick={() => document.getElementById("number-paths")?.scrollIntoView({ behavior: "smooth" })} />
        <NumberMetric value={sources.length} label="מקורות" note="מקור לפני פרשנות" onClick={() => document.getElementById("number-sources")?.scrollIntoView({ behavior: "smooth" })} />
      </div>

      <div className="sod29-number-actions">
        <button className="sod29-action primary" type="button" onClick={() => openWorld()}>פתח בעולם</button>
        {root === 878 ? <button className="sod29-action" type="button" onClick={() => openWorld({ journey: true })}>צא למסע 878</button> : null}
        <button className="sod29-action" type="button" onClick={askRaziel}>✦ שאל את רזיאל</button>
      </div>
    </section>

    <section className="sod29-section sod29-number-section" id="number-methods">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">SMART CORE · METHODS</div>
          <h2>שיטות ליבה</h2>
          <p className="sod29-muted">ה־Root והביטוי נשארים. בחירת שיטה משנה את התוצאה הפעילה בלבד. סדר השיטות מגיע מה־projection הקיים — אין כאן רשימת עדיפות חדשה בקוד.</p>
        </div>
        {families.length > 6 ? <button className="sod29-action" type="button" onClick={() => setShowAllMethods((v) => !v)}>{showAllMethods ? "פחות שיטות" : `כל ${families.length} השיטות`}</button> : null}
      </div>

      <div className="sod29-number-method-rail" role="list">
        {visibleMethods.map((group) => {
          const key = methodKey(group);
          const active = key === methodKey(selectedGroup);
          return <button
            type="button"
            role="listitem"
            key={key || methodLabel(group)}
            className={`sod29-number-method${active ? " is-active" : ""}`}
            aria-pressed={active}
            onClick={() => {
              setSelectedMethodKey(key);
              setTraceOpen(false);
            }}
          >
            <strong>{methodLabel(group)}</strong>
            <small>{Number(group?.count ?? group?.phrases?.length ?? 0)} ביטויים</small>
          </button>;
        })}
      </div>

      {selectedPhrases.length ? <div className="sod29-number-expression-rail" aria-label="ביטויים בשיטה הפעילה">
        {selectedPhrases.map((phrase) => <button
          type="button"
          key={phrase}
          className={`sod29-number-expression-chip${phrase === activeExpression ? " is-active" : ""}`}
          onClick={() => {
            setActiveExpression(phrase);
            setQuery(phrase);
            setTraceOpen(false);
          }}
        >{phrase}</button>)}
      </div> : null}

      <div className="sod29-number-trace-card">
        <div>
          <span className="sod29-kicker">DEEP METHOD</span>
          <h3>{activeExpression || root} · {methodLabel(selectedGroup)}{activeResult != null ? ` = ${activeResult}` : ""}</h3>
          <p>החישוב מגיע מ־Method Trace. רזיאל יכול לפרש אותו, אבל אינו מחשב את הגימטריה מחדש.</p>
        </div>
        <button className="sod29-action" type="button" disabled={!trace && !traceState.error} onClick={() => setTraceOpen((v) => !v)}>{traceOpen ? "סגור Trace" : "איך מחשבים?"}</button>
      </div>
      {traceState.error ? <div className="sod29-number-inline-state">Trace לא זמין כרגע לשילוב הזה.</div> : null}
      {traceOpen && trace ? <div className="sod29-number-trace-steps">
        {traceSteps.length ? traceSteps.map((step, index) => <span key={`${step}:${index}`}>{step}</span>) : <span>המנוע החזיר Trace מאומת ללא פירוט צעדים להצגה.</span>}
      </div> : null}
    </section>

    {worlds.length ? <section className="sod29-section sod29-number-section" id="number-meaning">
      <div className="sod29-section-head"><div><div className="sod29-kicker">MEANING / CONCEPT</div><h2>עולמות ומושגים</h2><p className="sod29-muted">אלה שכבות מחקר קיימות סביב המספר. הן אינן מחליפות את החישוב ואינן מוצגות כמשמעות מיסטית שנוצרה אוטומטית.</p></div></div>
      <div className="sod29-number-card-grid">{worlds.slice(0, 6).map((item, index) => <article className="sod29-number-card" key={item?.id || item?.key || index}><strong>{clean(item?.title || item?.label || item?.name) || "עולם מחקר"}</strong><small>{clean(item?.description || item?.summary || item?.kind) || "שכבת מחקר קיימת"}</small></article>)}</div>
    </section> : null}

    <section className="sod29-section sod29-number-section" id="number-meetings">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">MEETINGS</div>
          <h2>מפגשים סביב {root}</h2>
          <p className="sod29-muted">מפגש = כמה שכבות שנפגשות סביב אותו עוגן. כאן לא מניחים שהפריט הראשון הוא “האמת החזקה ביותר”; מציגים את המפגשים שה־projection מחזיר ומעמיקים בעולם.</p>
        </div>
        <span className="sod29-chip">{topics.length}</span>
      </div>
      {topics.length ? <div className="sod29-number-card-grid">
        {topics.slice(0, 6).map((topic) => <article className="sod29-number-card sod29-number-meeting" key={topic.id || topic.slug}>
          <span className="sod29-kicker">מפגש</span>
          <strong>{clean(topic.title) || `מפגש סביב ${root}`}</strong>
          <small>{clean(topic.subtitle) || (Array.isArray(topic.numbers) ? topic.numbers.slice(0, 6).join(" · ") : "מחקר קשור")}</small>
          <button className="sod29-action" type="button" onClick={() => {
            research.setResearchContext?.({
              subject: { id: String(root), type: "number", label: String(root), href: `/2029/number/${root}` },
              selection: { entityId: String(root), entityType: "number", expression: activeExpression || null, method: methodKey(selectedGroup) || null },
              lens: "world",
              dimensions: { ...(research.context?.dimensions || {}), meetingSlug: topic.slug || null },
              returnTo: { href: `/2029/number/${root}`, label: `דף ${root}` },
            });
            navigate("/world");
          }}>פתח בעולם</button>
        </article>)}
      </div> : <div className="sod29-number-inline-state">אין כרגע מפגש ציבורי זמין לעוגן הזה.</div>}
    </section>

    <section className="sod29-section sod29-number-section" id="number-paths">
      <div className="sod29-section-head"><div><div className="sod29-kicker">PATHS</div><h2>נתיבים מכאן</h2><p className="sod29-muted">מספר קשור אינו “דומה” אוטומטית. המעבר צריך לשאת relation / derivation / research provenance. בדוגמה הזאת Zero Scale נשאר DERIVATION, לא שוויון.</p></div></div>
      <div className="sod29-number-path-summary">
        <div><strong>{relations.length}</strong><span>קשרי גרף זמינים</span></div>
        <div><strong>{zeroScale.length}</strong><span>תחנות Zero Scale</span></div>
        <div><strong>{researchFindings.length}</strong><span>ממצאי מחקר</span></div>
      </div>
      {zeroScale.length ? <div className="sod29-number-zero-rail">{zeroScale.slice(0, 8).map((n) => <button key={n} type="button" onClick={() => navigate(`/2029/number/${Number(n)}`)}><strong>{n}</strong><small>Zero Scale · נגזרת</small></button>)}</div> : null}
    </section>

    <section className="sod29-section sod29-number-section" id="number-sources">
      <div className="sod29-section-head"><div><div className="sod29-kicker">SOURCES</div><h2>מקורות</h2><p className="sod29-muted">המקור קודם לפרשנות. technical refs נשארים בפרובננס ולא הופכים לכותרת האנושית של הכרטיס.</p></div><span className="sod29-chip">{sources.length}</span></div>
      {sources.length ? <div className="sod29-number-source-list">{sources.slice(0, 8).map((source, index) => <div className="sod29-number-source-row" key={source?.id || index}><div><strong>{sourceLabel(source)}</strong>{sourceDetail(source) ? <small>{sourceDetail(source)}</small> : null}</div><span>מקור</span></div>)}</div> : <div className="sod29-number-inline-state">אין כרגע מקור אנושי זמין להצגה בדוגמה הזאת.</div>}
    </section>
  </div>;
}

export default function Number2029Page() {
  const { value } = useParams();

  useEffect(() => {
    applySeo({
      title: `${value || "מספר"} · Number 2029 Preview`,
      description: "דוגמת Number / Expression native של SOD1820 2029",
      path: `/2029/number/${value || ""}`,
      noindex: true,
    });
  }, [value]);

  return <Sod2029Shell
    surface="number"
    symbol="123"
    eyebrow="NUMBER · EXPRESSION · RESEARCH CONTEXT"
    title="דף המספר"
    description="בית המספר ב־2029: חישוב קנוני, ביטוי פעיל, מפגשים, נתיבים, מקורות והמשך ישיר לעולם ולמסע — בלי Legacy authority."
    status="PREVIEW · BRANCH ONLY"
  >
    <NumberPageBody />
  </Sod2029Shell>;
}
