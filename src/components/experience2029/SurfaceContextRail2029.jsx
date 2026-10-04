import React, { useEffect, useState } from "react";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import LearnMark2029 from "./LearnMark2029.jsx";
import {
  buildLearnHelpSeed,
  emitEntryLearn,
  getConceptFamiliarity,
  getLearnFragment,
  isEntryLearnSurfaceActive,
  LEARN_LAYER,
  LEARN_SCOPE,
  markConceptFamiliarity,
} from "../../lib/entryLearn2029.js";

export default function SurfaceContextRail2029({
  focus,
  context,
  surface = "world",
  onOpenNumber,
  onOpenWorld,
  onAskRaziel,
  onOpenContext,
  onNeedHelp,
  compact = false,
  suppressLearn = false,
}) {
  const pageSubject = context?.subject || null;
  const surfaceFocus = context?.dimensions?.surfaceFocus || null;
  const contextSelection = context?.selection || null;
  const candidate = focus || surfaceFocus || contextSelection || null;
  const pageId = String(pageSubject?.id ?? "");
  const candidateId = String(candidate?.entityId ?? candidate?.id ?? "");
  const candidateType = String(candidate?.entityType || candidate?.type || "");
  const explicitFocus = Boolean(
    surfaceFocus
    || candidate?.source === "selection"
    || candidate?.focusKind
    || candidate?.locator
    || candidate?.expression
    || candidate?.resultValue != null
    || (candidateId && pageId && candidateId !== pageId)
    || ["phrase", "verse", "source", "media", "image", "person", "event", "finding", "relation"].includes(candidateType)
  );
  const subject = explicitFocus ? candidate : null;
  const number = Number(subject?.number ?? subject?.resultValue ?? (subject?.type === "number" ? subject?.id : null));
  const hasNumber = Number.isSafeInteger(number);
  const title = String(subject?.primary || subject?.label || subject?.expression || subject?.id || "הקשר פעיל");
  const subtitle = String(subject?.type === "verse" ? (subject?.reference || subject?.label || "פסוק") : (subject?.sectionLabel || subject?.subtitle || subject?.type || ""));
  const signals = Array.isArray(subject?.signals) ? subject.signals.filter(Boolean).slice(0, 4) : [];
  const hasMethodContext = Boolean(subject?.expression && subject?.method && Number.isSafeInteger(Number(subject?.resultValue)));
  const conceptKey = hasMethodContext ? "method" : hasNumber ? "anchor" : null;
  const fragment = conceptKey && isEntryLearnSurfaceActive(surface) && !suppressLearn ? getLearnFragment(conceptKey) : null;
  const [conceptFamiliarity, setConceptFamiliarity] = useState(() => conceptKey ? getConceptFamiliarity(conceptKey) : null);

  useEffect(() => {
    setConceptFamiliarity(conceptKey ? getConceptFamiliarity(conceptKey) : null);
  }, [conceptKey]);

  if (!subject) return <>
    <ContextualInspector2029
      className={`sod29-surface-context-rail is-rest${compact ? " is-compact" : ""}`}
      ariaLabel="מסעות גילוי"
      contextId={`rest:${surface}`}
      kicker="לאן אפשר להעמיק"
      title="מסעות גילוי"
      subtitle="בבנייה"
    >
      <section className="sod29-surface-context-journeys-idle" data-context-mode="rest">
        <div className="sod29-surface-context-journeys-visual" aria-hidden="true">
          <i /><i /><i /><b>↝</b>
        </div>
        <p>מספרים, אנשים, מקורות ורמזים יתחברו למסלולי גילוי מודרכים — באותו Research Context, בלי מערכת מקבילה.</p>
        <span className="sod29-surface-context-building">בבנייה</span>
      </section>
    </ContextualInspector2029>
    <div className="sod29-surface-context-mobile-cue is-idle" aria-label="מסעות גילוי בבנייה" aria-disabled="true">
      <span className="sod29-surface-context-mobile-cue-icon">↝</span>
      <span className="sod29-surface-context-mobile-cue-copy"><small>מסעות גילוי</small><b>בבנייה</b></span>
      <span className="sod29-surface-context-mobile-cue-value">בקרוב</span>
    </div>
  </>;

  const openLearn = () => {
    if (!conceptKey || !fragment) return;
    const familiarity = markConceptFamiliarity(conceptKey, "seen", fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn("learn_opened", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.SEE,
      manifestVersion: fragment.version,
    });
    emitEntryLearn("learn_layer", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLAIN,
      manifestVersion: fragment.version,
    });
  };

  const askForLearnHelp = () => {
    if (!conceptKey || !fragment) return;
    const tried = conceptFamiliarity?.stage === "tried";
    const learnStage = tried ? LEARN_LAYER.TRY : LEARN_LAYER.EXPLAIN;
    const actionTried = tried && hasNumber ? "open_number" : null;
    emitEntryLearn("learn_help_requested", {
      entrySurface: surface,
      conceptKey,
      layer: learnStage,
      actionId: actionTried,
      manifestVersion: fragment.version,
    });
    onNeedHelp?.({
      initialText: buildLearnHelpSeed(conceptKey),
      capability: hasNumber ? "number" : null,
      concept: conceptKey,
      learnStage,
      actionTried,
    });
  };

  const tryLearn = () => {
    if (!conceptKey || !fragment || !hasNumber) return;
    const stage = hasMethodContext ? "tried" : "seen";
    const familiarity = markConceptFamiliarity(conceptKey, stage, fragment.version);
    setConceptFamiliarity(familiarity);
    emitEntryLearn(hasMethodContext ? "method_tried" : "example_tried", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.TRY,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    emitEntryLearn("continued_to_research", {
      entrySurface: surface,
      conceptKey,
      layer: LEARN_LAYER.EXPLORE,
      actionId: "open_number",
      targetSurface: "number",
      manifestVersion: fragment.version,
    });
    onOpenNumber?.(hasMethodContext ? {
      id: String(subject.id || number),
      type: "phrase",
      label: String(subject.expression),
      href: subject.href || null,
      expression: String(subject.expression),
      method: String(subject.method),
      resultValue: Number(subject.resultValue),
      locator: subject.locator || null,
      source: "contextual-learn",
    } : {
      id: String(number),
      type: "number",
      label: String(number),
      href: `/2029/number/${number}`,
      source: "contextual-learn",
    });
  };

  return <>
    <ContextualInspector2029
      className={`sod29-surface-context-rail${compact ? " is-compact" : ""}`}
      ariaLabel="ההקשר הפעיל"
      contextId={subject.id || subject.entityId || subject.locator || title}
      kicker={subject.kicker || "מה פעיל עכשיו"}
      title={title}
      subtitle={subtitle}
      actions={<div className="sod29-surface-context-actions">
        {hasNumber ? <button type="button" onClick={() => onOpenNumber?.({ id: String(number), type: "number", label: String(number), href: `/2029/number/${number}` })}>פתח את {number}</button> : null}
        {onOpenWorld ? <button type="button" onClick={onOpenWorld}>פתח בעולם</button> : null}
        <button className="is-raziel" type="button" onClick={onAskRaziel}>✦ שאל את רזיאל</button>
      </div>}
      footer={<button className="sod29-surface-context-deepen" type="button" onClick={onOpenContext}>פתח לעומק <span aria-hidden="true">←</span></button>}
    >
      {subject.type === "verse" && subject.text ? <blockquote className="sod29-surface-context-verse">{subject.text}</blockquote> : null}
      {subject.expression ? <div className="sod29-surface-context-expression"><span>{subject.expression}</span>{subject.method ? <small>{subject.method}</small> : null}{subject.resultValue != null ? <b>{subject.resultValue}</b> : null}</div> : null}
      {fragment ? <LearnMark2029
        className="sod29-surface-context-learn"
        scope={LEARN_SCOPE.CONCEPT}
        label={fragment.label}
        compact={Number(conceptFamiliarity?.v) === Number(fragment.version)}
        onOpen={openLearn}
        onStillUnclear={askForLearnHelp}
        actions={hasNumber ? <button type="button" onClick={tryLearn}>{hasMethodContext ? "ראה את החישוב" : `פתח את ${number}`}</button> : null}
      >
        <p>{fragment.explain}</p>
        {hasMethodContext ? <p><strong>{subject.expression}</strong> מוצג כאן בשיטה <strong>{subject.method}</strong> עם תוצאה <strong>{subject.resultValue}</strong>. ההסבר רק מתאר את המוקד הפעיל; הוא אינו מחשב את הערך בעצמו.</p> : null}
      </LearnMark2029> : null}
      {signals.length ? <div className="sod29-surface-context-signals">{signals.map((signal) => <span key={signal}>{signal}</span>)}</div> : null}
      {subject.sourceLabel ? <small className="sod29-surface-context-source">מקור · {subject.sourceLabel}</small> : null}
    </ContextualInspector2029>
    <button className="sod29-surface-context-mobile-cue" type="button" onClick={onOpenContext} aria-label="פתח הקשר">
      <span className="sod29-surface-context-mobile-cue-icon">✦</span>
      <span className="sod29-surface-context-mobile-cue-copy">
        <small>הקשר</small>
        <b>{title}</b>
      </span>
      <span className="sod29-surface-context-mobile-cue-value">{hasNumber ? number : "פתח"}</span>
    </button>
  </>;
}
