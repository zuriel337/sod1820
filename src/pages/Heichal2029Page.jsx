import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { isRazielNextAction } from "../lib/research/razielActionContract.js";
import { resolveContextTools, CONTEXT_ACTION_KIND } from "../lib/research/contextualCapabilities.js";
import { supabase } from "../lib/supabase.js";
import { getVisitorId } from "../lib/visitorId.js";
import { newInteractionId } from "../lib/research/interactionCorrelation.js";
import { applySeo } from "../lib/seo.js";
import GematriaOpeningProjection from "../components/heichal/GematriaOpeningProjection.jsx";
import HeichalGuidedFirstStep from "../components/heichal/HeichalGuidedFirstStep.jsx";
import HeichalIntentUnderstanding, { HeichalFreeQuestionPlan } from "../components/heichal/HeichalIntentUnderstanding.jsx";
import HeichalEntryExamples from "../components/heichal/HeichalEntryExamples.jsx";
import HeichalDomainGates from "../components/heichal/HeichalDomainGates.jsx";
import { projectHeichalEntryInput } from "../lib/research/heichalFirstDecodingPlan.js";
import { boundFreeQuestion, buildFreeQuestionContext, buildExactExpressionContext, exactDirectionCapability, isFreeQuestionContext, ENTRY_INTENT_FREE_QUESTION } from "../lib/research/heichalEntryDirections.js";
import { fetchTanachVerseByOrdinal, TANACH_ORDINAL_SCOPE } from "../lib/research/tanachOrdinalSources.js";

const SCRIPTURE_BASIS_LABEL = Object.freeze({
  seed_numeric_value_to_verse_ragil_value: "פסוק באותו ערך · רגיל",
  lexical_exact_token: "הופעת מילה בתנ״ך",
  lexical_substring_spaceless: "התאמת טקסט רציף · ללא רווחים",
  same_finding_terms_same_verse: "מונחים מאותו ממצא · באותו פסוק",
  same_finding_terms_proximity: "מונחים מאותו ממצא · קרבה בפסוק",
  notarikon_rashei_tevot: "ראשי תיבות",
  notarikon_sofei_tevot: "סופי תיבות",
});

function scriptureCandidateKey(item, index) {
  return [
    item?.ref || "",
    item?.discoveryBasis || "",
    item?.queryTerm || "",
    Array.isArray(item?.queryTerms) ? item.queryTerms.join("|") : "",
    index,
  ].join(":");
}

function ScriptureDiscoveryPanel({ researchProjection, ordinalProjection, subject }) {
  const numeric = Array.isArray(researchProjection?.scriptureDiscovery?.candidates)
    ? researchProjection.scriptureDiscovery.candidates
    : [];
  const lexical = Array.isArray(researchProjection?.scriptureTermDiscovery?.candidates)
    ? researchProjection.scriptureTermDiscovery.candidates
    : [];
  const ordinal = ordinalProjection?.status === "ready" && ordinalProjection?.verse
    ? [{
        ...ordinalProjection.verse,
        discoveryBasis: "technical_torah_ordinal",
        ordinal: ordinalProjection.ordinal,
        countingScheme: ordinalProjection.countingScheme,
      }]
    : [];

  const candidates = [...numeric, ...lexical, ...ordinal].slice(0, 12);
  if (!candidates.length) return null;

  return (
    <section className="sod29-section" data-experience-capability="heichal-scripture-discovery">
      <div className="sod29-section-head">
        <div>
          <div className="sod29-kicker">SCRIPTURE DISCOVERY · READ ONLY</div>
          <h2>פסוקים ומבנים שנפתחו מהמחקר</h2>
          <div className="sod29-muted">
            אלה מועמדי גילוי שנגזרו מממצאים מובנים או מהמספר הפעיל. התאמה מספרית, הופעת מילה,
            קרבה או נוטריקון אינן הוכחת קשר ואינן הופכות אוטומטית ל־Finding קנוני.
          </div>
        </div>
        <div className="sod29-actions">
          {numeric.length ? <span className="sod29-chip">ערך · {numeric.length}</span> : null}
          {lexical.length ? <span className="sod29-chip">טקסט · {lexical.length}</span> : null}
          {ordinal.length ? <span className="sod29-chip">מיקום · 1</span> : null}
        </div>
      </div>

      <div className="sod29-list">
        {candidates.map((item, index) => {
          const basis = item.discoveryBasis === "technical_torah_ordinal"
            ? `פסוק #${item.ordinal} · סדר קורפוס התורה הנוכחי`
            : (SCRIPTURE_BASIS_LABEL[item.discoveryBasis] || "מועמד גילוי");
          return (
            <div className="sod29-row" key={scriptureCandidateKey(item, index)}>
              <div>
                <strong>{item.ref || "פסוק"}</strong>
                <div className="sod29-muted">{item.text || (Array.isArray(item.words) ? item.words.join(" · ") : basis)}</div>
                <div className="sod29-actions">
                  <span className="sod29-chip">{basis}</span>
                  <span className="sod29-chip">Discovery ≠ Truth</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="sod29-actions" style={{ marginTop: 14 }}>
        <Link
          className="sod29-action"
          to="/verse-gematria"
        >
          פתח חיפוש גימטריית פסוקים
        </Link>
      </div>
    </section>
  );
}

// Entry actions shared by the first screen and the active free-question panel. Intent first: the person's text is kept
// as asked; an expression is resolved ONLY after an explicit choice of an exact expression (projectHeichalEntryInput).
function useHeichalEntryActions(question) {
  const research = useResearch();
  const shell = use2029Shell();
  const [exact, setExact] = useState({ busy: false, error: null });

  const choose = (direction) => {
    if (!question) return;
    if (direction.action === "route" && direction.href) { shell.go(direction.href); return; }
    research.setResearchContext?.(buildFreeQuestionContext(question, direction.key));
    if (direction.action === "raziel") shell.openRaziel();
  };

  const confirmExact = async (expression, directionKey) => {
    const gate = projectHeichalEntryInput(expression, { explicitlyChoseGematria: directionKey === "gematria", exactExpressionSelected: true });
    if (!gate.ready) return;
    const dimensions = { entryIntent: question ? ENTRY_INTENT_FREE_QUESTION : "exact_expression", entryDirection: directionKey, entryQuestion: question || null, entryExactExpression: true };
    if (gate.inputKind === "number_literal") {
      // ELS searches letters: a bare number is not an ELS term. Relations/gematria may anchor on the number entity.
      if (directionKey === "els") { setExact({ busy: false, error: "ELS מחפש אותיות; מספר אינו מונח לחיפוש. הקלד מילים או בחר מילים מהשאלה." }); return; }
      const id = gate.candidateSubject.id;
      research.setResearchContext?.({ subject: { id, type: "number", label: id, href: `/2029/number/${id}` }, selection: { entityId: id, entityType: "number" }, lens: "heichal", locale: "he", dimensions });
      setExact({ busy: false, error: null });
      return;
    }
    // Relations / ELS stay inside their own capability: the exact expression is kept as a phrase anchor and NO gematria is resolved.
    if (!exactDirectionCapability(directionKey).resolvesNumber) {
      research.setResearchContext?.(buildExactExpressionContext(expression, directionKey, question));
      setExact({ busy: false, error: null });
      return;
    }
    if (!gate.canResolveExpression) return;
    setExact({ busy: true, error: null });
    try {
      const focus = await resolveExpressionFocus(expression);
      if (focus?.href) {
        research.setResearchContext?.({
          subject: { id: String(focus.root), type: "number", label: String(focus.root), href: focus.href },
          selection: { entityId: String(focus.root), entityType: "number", expression: focus.expression, method: focus.method, resultValue: focus.resultValue, focusKind: "expression" },
          lens: "heichal",
          locale: "he",
          dimensions: { ...dimensions, expressionFocusExplicit: true, focusOrigin: "heichal-entry" },
        });
        setExact({ busy: false, error: null });
        return;
      }
    } catch { /* honest phrase fallback below */ }
    // The chosen exact expression could not be resolved to a number focus: keep it as a phrase, never invent a value.
    research.setResearchContext?.(buildExactExpressionContext(expression, directionKey, question));
    setExact({ busy: false, error: "הביטוי נשמר כביטוי; לא נמצא עבורו מוקד מספרי מאומת, ולא חושב ערך." });
  };

  return { choose, confirmExact, exact };
}

function NoContextEntry() {
  const research = useResearch();
  const shell = use2029Shell();
  const [query, setQuery] = useState("");
  const [draft, setDraft] = useState(null); // { question } while the person is choosing a direction
  const { choose, confirmExact, exact } = useHeichalEntryActions(draft?.question || null);

  const start = (e) => {
    e?.preventDefault?.();
    const entry = projectHeichalEntryInput(query);
    if (!entry.ready) return;
    if (entry.inputKind === "number_literal") {
      const id = entry.candidateSubject.id;
      setDraft(null);
      research.setResearchContext?.({
        subject: { id, type: "number", label: id, href: `/2029/number/${id}` },
        selection: { entityId: id, entityType: "number" },
        lens: "heichal",
        locale: "he",
      });
      return;
    }
    // Free text: no expression resolution, no calculation, no tool. The question is shown back and directions are proposed.
    setDraft({ question: boundFreeQuestion(query) });
  };

  return <>
    <section className="sod29-section heichal-entry-command" data-experience-capability="heichal-entry-command">
      <div className="sod29-kicker">מה נחקור?</div>
      <form className="sod29-command-bar" onSubmit={start}>
        <input className="sod29-input" value={query} onChange={e => setQuery(e.target.value)} placeholder="מספר, ביטוי או שאלה" aria-label="נושא למחקר בהיכל" />
        <button className="sod29-action primary" type="submit">קבע עוגן מחקר</button>
      </form>
    </section>

    {draft ? <HeichalIntentUnderstanding question={draft.question} busy={exact.busy} error={exact.error}
      onChoose={choose} onExact={confirmExact} onReset={() => { setDraft(null); setQuery(""); }} /> : null}

    {!draft ? <HeichalEntryExamples busy={exact.busy} error={exact.error} onExplore={(expression) => confirmExact(expression, "gematria")} /> : null}
    {!draft ? <HeichalDomainGates /> : null}

    <section className="sod29-section heichal-entry-raziel">
      <button className="sod29-card sod29-action-card sod29-card-button" onClick={() => shell.openRaziel()}><h3>✦ שאל את רזיאל</h3><p>אותו רזיאל ואותו הקשר מחקר, לא צ׳אט נפרד של ההיכל.</p></button>
    </section>
  </>;
}

function ActiveResearchEnvironment() {
  const research = useResearch();
  const shell = use2029Shell();
  const context = research.context || null;
  const subject = context?.subject;
  // A free question is a temporary Research Context representation, not a canonical phrase/number identity.
  const freeQuestion = isFreeQuestionContext(context);
  const entryActions = useHeichalEntryActions(freeQuestion ? context.dimensions.entryQuestion : null);
  // The same semantic actions already used by Number/World/Books/ELS in System Frame.
  // This is a Heichal consumer, not a local tool registry or another navigation rail.
  const focusTarget = subject ? {
    ...subject,
    // A question is not a number/phrase to calculate: the "123 מספר / גימטריה" capability is not offered for it.
    ...(freeQuestion ? { type: "question" } : {}),
    expression: context?.selection?.expression || null,
    method: context?.selection?.method || null,
    resultValue: context?.selection?.resultValue ?? null,
    locator: context?.selection?.locator || null,
  } : null;
  const connectedTools = resolveContextTools({ surface: "heichal", target: focusTarget });
  // An exact expression chosen for relations / ELS: shown with its own honest status; no gematria was resolved for it.
  const exactDirection = context?.dimensions?.entryIntent === ENTRY_INTENT_FREE_QUESTION && context?.dimensions?.entryExactExpression === true
    && ["els", "relations"].includes(context?.dimensions?.entryDirection) && subject?.type === "phrase" ? context.dimensions.entryDirection : null;
  // An already-owned Number href may be used verbatim; never mint an URL for a finding.
  const numberHref = subject?.type === "number" && /^\/2029\/number\/\d+(?:\?|$)/.test(String(subject.href || ""))
    && String(subject.href).split(/[?#]/)[0] === `/2029/number/${subject.id}`
    ? subject.href : null;
  const [state, setState] = useState({ loading: true, data: null, error: null });
  const [ordinalState, setOrdinalState] = useState({ loading: false, data: null, error: null });
  const key = subject ? `${subject.type}:${subject.id}` : null;

  useEffect(() => {
    research.updateResearchContext?.({ lens: "heichal" });
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    let alive = true;
    if (!subject?.id || !subject?.type) return () => { alive = false; };
    // A free question is never sent to the entity reader as a key: no graph identity exists for it, and the text stays local.
    if (freeQuestion) { setState({ loading: false, data: null, error: null }); return () => { alive = false; }; }
    setState({ loading: true, data: null, error: null });
    fetchEntityHubProjection({ type: subject.type, key: subject.id, relationLimit: 100, researchLimit: 60, topicLimit: 12 })
      .then(data => alive && setState({ loading: false, data, error: null }))
      .catch(error => alive && setState({ loading: false, data: null, error }));
    return () => { alive = false; };
  }, [key]);

  useEffect(() => {
    // A new root clears any prior explicit ordinal probe. A bare number is NOT ordinal intent.
    setOrdinalState({ loading: false, data: null, error: null });
  }, [key]);

  const ordinalValue = subject?.type === "number" ? Number(subject.id) : null;
  const canProbeTorahOrdinal = Number.isSafeInteger(ordinalValue) && ordinalValue >= 1 && ordinalValue <= 5846;

  const runOrdinalDiscovery = async () => {
    if (!canProbeTorahOrdinal || ordinalState.loading) return;
    setOrdinalState({ loading: true, data: null, error: null });
    try {
      const data = await fetchTanachVerseByOrdinal(ordinalValue, { scope: TANACH_ORDINAL_SCOPE.TORAH });
      setOrdinalState({
        loading: false,
        data: { ...data, requestIntent: "explicit_user_action" },
        error: null,
      });
    } catch (error) {
      setOrdinalState({ loading: false, data: null, error });
    }
  };

  const data = state.data;
  const counts = useMemo(() => ({
    findings: data?.research?.findings?.length || 0,
    relations: data?.graph?.relations?.length || 0,
    sources: data?.sources?.length || 0,
  }), [data]);

  const addSubject = () => {
    if (!subject) return;
    research.addToResearch?.({
      id: data?.identity?.nodeId ? `node:${data.identity.nodeId}` : `${subject.type}:${subject.id}`,
      type: subject.type,
      title: subject.label || subject.id,
      label: subject.label || subject.id,
      link: subject.href || "/heichal",
      metadata: { source: "heichal-2029", nodeId: data?.identity?.nodeId || null },
    });
  };

  const openRazielFromServerGatedResult = async () => {
    // The first real Result Bundle consumer is deliberately bounded to the public Number
    // runtime that owns gate + trace + caller-RLS on PR #701. Other subjects keep the
    // existing generic Raziel entry until their own canonical server runtime exists.
    const numericValue = subject?.type === "number" ? Number(subject.id) : null;
    if (!Number.isSafeInteger(numericValue) || numericValue < 0) {
      shell.openRaziel();
      return;
    }

    try {
      let visitorId = null;
      try { visitorId = getVisitorId(); } catch { visitorId = null; }

      const { data: run, error } = await supabase.functions.invoke("research-run", {
        body: {
          number: String(numericValue),
          question: subject.label || String(numericValue),
          visitor_id: visitorId,
          // One non-PII interaction id per material action; the server owns trace_id/root_span_id.
          interaction_id: newInteractionId(),
          requested_capabilities: ["numeric", "numeric_operators"],
          surface: "heichal",
        },
      });

      if (error || run?.status !== "ok" || !run?.bundle) {
        throw error || new Error("research-run unavailable");
      }

      const razielRouteAction = (Array.isArray(run.bundle.next_actions) ? run.bundle.next_actions : [])
        .find((item) => isRazielNextAction(item)) || null;

      // Invalid/missing action fails closed. Never manufacture a local route/message and
      // never bypass the server runtime by falling back to browser-side composition.
      shell.openRaziel(razielRouteAction ? { razielRouteAction } : null);
    } catch {
      // Preserve the existing Research Context and generic Raziel entry on any transport,
      // identity, gate, trace, or runtime failure. No local answer/fallback text.
      shell.openRaziel();
    }
  };

  const selectionText = freeQuestion ? "שאלה חופשית · לא ביטוי לחישוב" : [
    context?.selection?.entityType && context?.selection?.entityId ? `${context.selection.entityType}:${context.selection.entityId}` : null,
    context?.selection?.expression ? `ביטוי: ${context.selection.expression}` : null,
    context?.selection?.method ? `שיטה: ${context.selection.method}` : null,
    context?.selection?.crossingPartner ? `הצלבה: ${context.selection.crossingPartner}` : null,
    context?.selection?.sourceRef || null,
    context?.selection?.locator || null,
  ].filter(Boolean).join(" · ");

  return <>
    <section className="sod29-section sod29-resume-panel">
      <div className="sod29-section-head">
        <div><div className="sod29-kicker">RESEARCH CONTEXT COMPILED</div><h2>{subject.label || subject.id}</h2><div className="sod29-muted">העוגן נשאר יציב; ה־Canvas והפעולות מתחלפים סביבו. בחירה בכלי אינה פתיחת אפליקציה חדשה.</div></div>
        <div className="sod29-actions">{freeQuestion ? null : <button className="sod29-action" onClick={addSubject}>＋ הוסף למחקר</button>}<button className="sod29-action" onClick={openRazielFromServerGatedResult}>✦ רזיאל</button><button className="sod29-action primary" onClick={() => shell.returnExact()}>↩ חזרה מדויקת</button></div>
      </div>
      <div className="sod29-spine" aria-label="Research Spine">
        <span>{freeQuestion ? "שאלה" : "שורש"} · {subject.label || subject.id}</span>
        {selectionText ? <span>בחירה · {selectionText}</span> : null}
        <span>היכל · Deep Research</span>
      </div>
      <div className="sod29-muted" style={{ marginTop: 9 }}>Research Spine מקרין את ה־Context הקיים. הוא לא טוען ל־research_path שמור אם runtime כזה עדיין לא נוצר.</div>
    </section>

    {exactDirection ? <section className="sod29-section heichal-intent" data-experience-capability="heichal-exact-direction" data-exact-direction={exactDirection} aria-label="ביטוי מדויק לכיוון שנבחר">
      <div className="sod29-kicker">{exactDirection === "els" ? "ביטוי מדויק · ELS" : "ביטוי מדויק · בדיקת קשרים"} · לא חושבה גימטריה</div>
      <blockquote className="heichal-intent-quote" dir="auto">{subject.label}</blockquote>
      <p className="sod29-muted">{exactDirectionCapability(exactDirection).note}</p>
      <div className="sod29-actions">
        {exactDirection === "els" ? <button type="button" className="sod29-action primary" onClick={() => shell.go("/els")}>פתח את מסך ELS עם הביטוי</button> : null}
        <button type="button" className="sod29-action" onClick={() => research.clearResearchContext?.()}>שנה שאלה</button>
      </div>
    </section> : null}

    {freeQuestion ? <>
      <HeichalIntentUnderstanding question={context.dimensions.entryQuestion} busy={entryActions.exact.busy} error={entryActions.exact.error}
        onChoose={entryActions.choose} onExact={entryActions.confirmExact} onReset={() => research.clearResearchContext?.()} />
      {context.dimensions.entryDirection ? <HeichalFreeQuestionPlan question={context.dimensions.entryQuestion} direction={context.dimensions.entryDirection} /> : null}
    </> : <HeichalGuidedFirstStep
      key={key}
      subject={subject}
      projection={data}
      loading={state.loading}
      onRunNumber={openRazielFromServerGatedResult}
    />}

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">RESEARCH CANVAS</div><h2>משטח העבודה</h2><div className="sod29-muted">זהו המוקד: עובדות, ממצאים, מקורות וקשרים נאספים סביב אותו Root, עם Evidence Inspector לצדם.</div></div></div>
      <div className="sod29-two">
        <div className="sod29-canvas">
          {state.loading ? <FrameState kind="loading" title="מרכיב את משטח המחקר" progress={{ phase: "מחבר את העוגן לנתוני המחקר", steps: [{ id: "anchor", label: "העוגן הפעיל נשמר", state: "done" }, { id: "projection", label: "קורא את ה־projection: קשרים, ממצאים ומקורות", state: "active" }], engagement: [{ id: "continuity", title: "העוגן לא הולך לאיבוד", detail: "אפשר להמשיך מאותה נקודה גם כשהעומק עוד נטען." }, { id: "truth", title: "אין תוכן מומצא בזמן ההמתנה", detail: "רק חומר שהגיע מה־owners הקנוניים יופיע בתוצאה." }] }}>ה־Context נשמר בזמן שהמערכת מרכיבה את התמונה העמוקה סביבו.</FrameState> : null}
          {state.error ? <div className="sod29-state error">ה־Context נשמר, אבל ה־Entity adapter נכשל: {String(state.error?.message || state.error)}</div> : null}
          {freeQuestion ? <div className="sod29-state warn">שאלה חופשית: אין לה עוגן זהות בגרף, ולכן לא נטענו ממצאים, קשרים או מקורות. זה אינו חיפוש שהחזיר אפס תוצאות. בחר כיוון או ביטוי מדויק.</div> : null}
          {!freeQuestion && !state.loading && !state.error && !data ? <div className="sod29-state warn">יש Research Context פעיל, אך אין Graph identity לקריאה דרך ה־Entity adapter. ההיכל לא ממציא ישות. אפשר לעבוד עם Calculator/ELS/Source ולשמור את אותו root.</div> : null}
          {data ? <>
            <div className="sod29-grid">
              <div className="sod29-card"><div className="sod29-stat">{counts.findings}</div><div className="sod29-stat-label">Findings</div></div>
              <div className="sod29-card"><div className="sod29-stat">{counts.relations}</div><div className="sod29-stat-label">Relations</div></div>
              <div className="sod29-card"><div className="sod29-stat">{counts.sources}</div><div className="sod29-stat-label">Sources</div></div>
            </div>
            {data.research?.findings?.length ? <div className="sod29-list" style={{ marginTop: 14 }}>{data.research.findings.slice(0, 8).map((f,i) => <div className="sod29-row" key={f.id || i}><div><strong>{f.statement || f.subject?.label || f.kind}</strong><small>{f.stage || f.kind || "research"} · {f.verification?.verification_state || "verification unknown"}</small></div></div>)}</div> : <div className="sod29-state" style={{ marginTop: 14 }}>אין Findings קריאים לעוגן הזה כרגע.</div>}
          </> : null}
        </div>

        <aside className="sod29-inspector">
          <div className="sod29-kicker">CONTEXT / EVIDENCE INSPECTOR</div>
          <h3 style={{ marginTop: 5 }}>מה ידוע על המצב הנוכחי</h3>
          <div className="sod29-divider" />
          <div className="sod29-muted">Subject</div><b>{freeQuestion ? `שאלה חופשית: ${subject.label || subject.id}` : `${subject.type}:${subject.id}`}</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Selection</div><b>{selectionText || "אין בחירה ממוקדת"}</b>
          <div className="sod29-divider" />
          <div className="sod29-muted">Access / Truth</div>
          <div className="sod29-actions">
            <span className="sod29-chip">projection ≠ truth</span>
            {data?.research?.access?.available === false ? <span className="sod29-chip">research protected</span> : null}
            {data?.truthLifecycle?.humanGateRequired ? <span className="sod29-chip">Human Gate</span> : null}
          </div>
          {data?.sources?.length ? <><div className="sod29-divider" /><div className="sod29-muted">מקורות זמינים</div>{data.sources.slice(0,5).map((s,i)=><div key={`${s.ref || s.label}-${i}`} style={{ fontSize: 12, marginTop: 6 }}>{s.label || s.ref}</div>)}</> : null}
        </aside>
      </div>
    </section>

    <ScriptureDiscoveryPanel
      researchProjection={data?.research || null}
      ordinalProjection={ordinalState.data}
      subject={subject}
    />

    {context?.selection?.expression ? (
      <GematriaOpeningProjection
        expression={context.selection.expression}
        initialMethodKey={context.selection.method || null}
      />
    ) : null}

    <section className="sod29-section">
      <div className="sod29-section-head"><div><div className="sod29-kicker">NEXT BEST ACTIONS</div><h2>מה אפשר לעשות עכשיו</h2><div className="sod29-muted">הפעולות נגזרות מההקשר ומהיכולות שכבר מחוברות; לא Toolbar קבוע של כל הכלים.</div></div></div>
      <div className="sod29-actions">
        {numberHref ? <button className="sod29-action primary" type="button" onClick={() => shell.go(numberHref)}>דף המספר · המשך בעוגן</button> : null}
        {connectedTools.map((tool) => tool.kind === CONTEXT_ACTION_KIND.CAPABILITY
          ? <button className="sod29-action" type="button" key={tool.id} onClick={() => shell.openCapability(tool.capability, focusTarget)}>{tool.label}</button>
          : tool.kind === CONTEXT_ACTION_KIND.ROUTE
            ? <button className="sod29-action" type="button" key={tool.id} onClick={() => shell.go(tool.href)}>{tool.label}</button>
            : null)}
        {canProbeTorahOrdinal ? (
          <button className="sod29-action" onClick={runOrdinalDiscovery} disabled={ordinalState.loading}>
            {ordinalState.loading ? "בודק מיקום פסוק…" : `בדוק כפסוק #${ordinalValue} בתורה`}
          </button>
        ) : null}
        <Link className="sod29-action" to="/verse-gematria">חיפוש גימטריית פסוקים</Link>
        <button className="sod29-action" onClick={openRazielFromServerGatedResult}>✦ שאל את רזיאל</button>
      </div>
    </section>

    <section className="sod29-section sod29-placeholder">
      <div className="sod29-section-head"><div><div className="sod29-kicker">FUTURE RENDERERS</div><h2>Journey persistence / Spatial renderer</h2></div></div>
      <p className="sod29-muted">ה־Foundation נעול, אבל research_path persistence וה־2029 Spatial renderer עדיין אינם מחוברים למסך הזה. לכן לא מוצג מסע או 3D מזויף. כשיתחברו, הם יצרכו את אותו Context/Result lineage ולא ידרשו Heichal חדש.</p>
    </section>
  </>;
}

export default function Heichal2029Page() {
  const research = useResearch();
  useEffect(() => { applySeo({ title: "היכל · SOD1820", description: "סביבת המחקר העמוקה של SOD1820 2029", path: "/heichal" }); }, []);
  const hasContext = Boolean(research.context?.subject);
  return <Sod2029Shell wide surface="heichal" symbol="◇" title="היכל" description={hasContext ? "אותו עוגן, אותו רזיאל, משטח מחקר אחד." : "כל גילוי מתחיל בשאלה."}>{hasContext ? <ActiveResearchEnvironment /> : <NoContextEntry />}</Sod2029Shell>;
}
