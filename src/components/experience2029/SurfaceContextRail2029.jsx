import React, { useEffect, useState } from "react";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { researchContextNumber } from "../../lib/research/researchContext.js";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";
import SurfaceProgressSpine2029 from "./SurfaceProgressSpine2029.jsx";
import LearnMark2029 from "./LearnMark2029.jsx";
import GoldenProjectorModeLayer2029 from "./GoldenProjectorModeLayer2029.jsx";
import ContextualVideoLayer2029 from "./ContextualVideoLayer2029.jsx";
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
  onOpenSheet,
  onNavigate,
  sheet = false,
  onNeedHelp,
  compact = false,
  suppressLearn = false,
}) {
  const subject = focus || context?.dimensions?.surfaceFocus || context?.selection || context?.subject || null;
  const number = researchContextNumber(subject?.number ?? subject?.resultValue ?? (subject?.type === "number" ? subject?.id : null));
  const hasNumber = Number.isSafeInteger(number);
  const title = String(subject?.primary || subject?.label || subject?.expression || subject?.id || "הקשר פעיל");
  const subtitle = String(subject?.type === "verse" ? (subject?.reference || subject?.label || "פסוק") : (subject?.sectionLabel || subject?.subtitle || subject?.type || ""));
  const signals = Array.isArray(subject?.signals) ? subject.signals.filter(Boolean).slice(0, 4) : [];
  const sections = Array.isArray(context?.dimensions?.surfaceSections) ? context.dimensions.surfaceSections : [];
  const activeSectionId = context?.dimensions?.activeSectionId || null;
  const mapLabel = String(context?.dimensions?.surfaceMapLabel || (
    surface === "post" ? "בתוך הפוסט"
      : surface === "topic" ? "בתוך הציר"
        : surface === "heichal" ? "מה אנחנו בודקים"
          : surface === "world" ? "מה מחובר עכשיו"
            : "איפה אני כאן"
  ));
  const defaultKicker = sections.length
    ? (surface === "post" || surface === "topic" ? "פתוח עכשיו" : mapLabel)
    : surface === "heichal"
      ? "מה אנחנו בודקים עכשיו"
      : surface === "world"
        ? "מה מחובר עכשיו"
        : "הקשר פעיל";
  const resultValue = researchContextNumber(subject?.resultValue);
  const hasMethodContext = Boolean(subject?.expression && subject?.method && Number.isSafeInteger(resultValue));
  // Post/Topic: REST orients (where am I, outward connections, pointer to in-body depth).
  // Only an explicit expression FOCUS replaces it; reading alone never traces or calculates here.
  const documentSurface = surface === "post" || surface === "topic";
  const restMode = documentSurface && !hasMethodContext && subject?.type !== "gematria_expression";
  const activeSection = sections.find((item) => item?.id === activeSectionId) || null;
  const conceptKey = restMode ? null : hasMethodContext ? "method" : hasNumber ? "anchor" : null;
  const fragment = conceptKey && isEntryLearnSurfaceActive(surface) && !suppressLearn ? getLearnFragment(conceptKey) : null;
  const research = useResearch();
  const findings = Array.isArray(context?.dimensions?.surfaceFindings) ? context.dimensions.surfaceFindings : [];
  const focusedFinding = subject?.type === "finding";
  const setSurfaceFocus = (surfaceFocus) => research.updateResearchContext?.({
    dimensions: { ...(context?.dimensions || {}), surfaceFocus },
  });
  const focusFinding = (finding) => setSurfaceFocus({
    id: finding.id,
    type: "finding",
    sectionLabel: "חיבור נוסף",
    label: finding.label,
    primary: finding.label,
    number: finding.value != null && /^\d+$/.test(finding.value) ? Number(finding.value) : undefined,
    reason: finding.reason,
    href: finding.href,
    sourceLabel: finding.sourceLabel || finding.kind,
  });
  const restFromFinding = () => {
    const reading = context?.dimensions?.readingFocus || {};
    setSurfaceFocus({
      id: reading.id, type: "post_region", sectionLabel: "הסיפור", label: reading.label,
      primary: reading.primary, signals: reading.signals, number: reading.number ?? undefined,
      sourceLabel: reading.sourceLabel, locator: reading.locator,
    });
  };
  const [conceptFamiliarity, setConceptFamiliarity] = useState(() => conceptKey ? getConceptFamiliarity(conceptKey) : null);

  useEffect(() => {
    setConceptFamiliarity(conceptKey ? getConceptFamiliarity(conceptKey) : null);
  }, [conceptKey]);

  if (!subject) return null;

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

  const jumpToDepth = () => {
    const node = activeSection ? document.getElementById(activeSection.targetId || activeSection.id) : null;
    node?.scrollIntoView?.({ behavior: "smooth", block: "start" });
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
      resultValue,
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

  const stations = sections.filter((item) => item?.id && item?.label);
  const stationIndex = stations.findIndex((item) => item.id === activeSectionId);
  const useLocator = !sheet && stations.length > 1 && stationIndex >= 0;
  const goStation = (offset) => {
    const next = stations[stationIndex + offset];
    if (!next) return;
    const reduce = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches;
    document.getElementById(next.targetId || next.id)?.scrollIntoView?.({ behavior: reduce ? "auto" : "smooth", block: "start" });
  };
  const openSheet = onOpenSheet || onOpenContext;
  const prevStation = stations[stationIndex - 1] || null;
  const nextStation = stations[stationIndex + 1] || null;

  return <>
    <ContextualInspector2029
      className={`sod29-surface-context-rail${sheet ? " is-sheet" : ""}${compact ? " is-compact" : ""}${restMode ? " is-rest" : documentSurface ? " is-focus" : ""}`}
      data-context-rail-mode={documentSurface ? (restMode ? "rest" : "focus") : undefined}
      ariaLabel="ההקשר הפעיל"
      contextId={subject.id || subject.entityId || subject.locator || title}
      kicker={subject.kicker || defaultKicker}
      title={title}
      subtitle={subtitle}
      actions={<div className="sod29-surface-context-actions">
        {hasNumber ? <button type="button" onClick={() => onOpenNumber?.({ id: String(number), type: "number", label: String(number), href: `/2029/number/${number}` })}>פתח את {number}</button> : null}
        {onOpenWorld ? <button type="button" onClick={onOpenWorld}>פתח בעולם</button> : null}
        <button className="is-raziel" type="button" onClick={onAskRaziel}>✦ שאל את רזיאל</button>
      </div>}
      footer={<button className="sod29-surface-context-deepen" type="button" onClick={onOpenContext}>פתח לעומק <span aria-hidden="true">←</span></button>}
    >
      {sections.length ? <div className="sod29-surface-context-progress">
        <div className="sod29-context-inspector-kicker">{mapLabel}</div>
        <SurfaceProgressSpine2029
          items={sections}
          activeId={activeSectionId}
          interactive
          onSelect={sheet ? onNavigate : undefined}
          ariaLabel={mapLabel}
        />
      </div> : null}
      {restMode && activeSection ? <button className="sod29-surface-context-depth-pointer" type="button" onClick={() => { jumpToDepth(); if (sheet) onNavigate?.(activeSection); }}>
        <small>העומק בגוף {surface === "post" ? "הפוסט" : "הציר"}</small>
        <b>{activeSection.label}</b>
        <span aria-hidden="true">↓</span>
      </button> : null}
      {subject.type === "verse" && subject.text ? <blockquote className="sod29-surface-context-verse">{subject.text}</blockquote> : null}
      {restMode ? null : subject.expression ? <div className="sod29-surface-context-expression"><span>{subject.expression}</span>{subject.method ? <small>{subject.method}</small> : null}{subject.resultValue != null ? <b>{subject.resultValue}</b> : null}</div> : null}
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
      {focusedFinding && subject.reason ? <p className="sod29-surface-context-reason" data-sidecar-finding-reason="true">{subject.reason}</p> : null}
      {focusedFinding && subject.href ? <a className="sod29-surface-context-deeplink" href={subject.href}>פתח את החיבור <span aria-hidden="true">←</span></a> : null}
      {findings.length ? <div className="sod29-surface-context-findings" data-sidecar-state={focusedFinding ? "focus" : "rest"}>
        {focusedFinding ? <button type="button" className="sod29-surface-context-findings-back" onClick={restFromFinding}>← כל החיבורים</button> : <>
          <div className="sod29-context-inspector-kicker">חיבורים נוספים</div>
          <ul>{findings.map((finding) => <li key={finding.id}><button type="button" onClick={() => focusFinding(finding)}>
            <span>{finding.label}</span>{finding.value ? <b>{finding.value}</b> : null}
          </button></li>)}</ul>
        </>}
      </div> : null}
      <ContextualVideoLayer2029 subject={subject} context={context} />
      {surface === "post" ? <GoldenProjectorModeLayer2029 context={context} surface={surface} /> : null}
      {signals.length ? <div className="sod29-surface-context-signals">{signals.map((signal) => <span key={signal}>{signal}</span>)}</div> : null}
      {subject.sourceLabel ? <small className="sod29-surface-context-source">מקור · {subject.sourceLabel}</small> : null}
    </ContextualInspector2029>
    {sheet ? null : useLocator ? <nav
      className="sod29-glass-locator"
      aria-label={`${mapLabel} · תחנה ${stationIndex + 1} מתוך ${stations.length}`}
      data-experience-capability="glass-rolling-locator"
      data-station-index={stationIndex}
      data-station-count={stations.length}
    >
      <button type="button" className="sod29-glass-locator-step is-prev" disabled={!prevStation} onClick={() => goStation(-1)} aria-label={prevStation ? `לתחנה הקודמת: ${prevStation.label}` : "זו התחנה הראשונה"}>
        <span aria-hidden="true">⌃</span>
        <small aria-hidden="true">{prevStation?.label || ""}</small>
      </button>
      <button type="button" className="sod29-glass-locator-core" onClick={openSheet} aria-haspopup="dialog" aria-label={`פתח הקשר: ${stations[stationIndex].label}`}>
        <small>{stationIndex + 1}/{stations.length}</small>
        <b>{stations[stationIndex].label}</b>
      </button>
      <button type="button" className="sod29-glass-locator-step is-next" disabled={!nextStation} onClick={() => goStation(1)} aria-label={nextStation ? `לתחנה הבאה: ${nextStation.label}` : "זו התחנה האחרונה"}>
        <small aria-hidden="true">{nextStation?.label || ""}</small>
        <span aria-hidden="true">⌄</span>
      </button>
    </nav> : <button className="sod29-surface-context-mobile-cue" type="button" onClick={openSheet} aria-label="פתח הקשר">
      <span className="sod29-surface-context-mobile-cue-icon">✦</span>
      <span className="sod29-surface-context-mobile-cue-copy">
        <small>{sections.length ? mapLabel : "הקשר"}</small>
        <b>{title}</b>
      </span>
      <span className="sod29-surface-context-mobile-cue-value">{hasNumber ? number : "פתח"}</span>
    </button>}
  </>;
}
