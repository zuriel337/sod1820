import React, { useEffect, useMemo, useRef } from "react";
import { Link, useLocation } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";
import BeitMidrashLessonFlow from "./BeitMidrashLessonFlow.jsx";
import NavigationIcon2029 from "../experience2029/NavigationIcon2029.jsx";
import { FrameState, use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import MethodTraceExplanation2029 from "../gematria2029/MethodTraceExplanation2029.jsx";
import SpatialMethodStage2029 from "../gematria2029/SpatialMethodStage2029.jsx";
import { methodMechanicalDefinition } from "../../lib/research/beitMidrashMethodDefinition.js";
import { numberExpressionFocusHref } from "../../lib/research/numberExpressionFocus.js";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";

const CATEGORY_LABELS = Object.freeze({
  base: "שיטות יסוד",
  composite: "שיטות מורכבות",
  depth: "שיטות עומק",
  context: "שיטות תלויות הקשר",
});

const SKELETON_PILLS = Object.freeze([0, 1, 2, 3, 4]);
const SKELETON_GROUPS = Object.freeze(["base", "composite", "depth", "context"]);

/** Loading placeholder with the same blocks and minimum heights as the real lesson, so nothing below it moves. */
function MethodsSkeleton({ withLesson }) {
  const bars = (count) => [...new Array(count).keys()].map((index) => <i key={index} className="bm-sk-line" />);
  return <div className="bm-methods-layout bm-skeleton" role="status" aria-busy="true" data-has-lesson={withLesson ? "true" : "false"}>
    <span className="bm-sr">פותח את דרכי החישוב…</span>
    {withLesson ? <div className="bm-method-nav is-rail" aria-hidden="true">
      {SKELETON_PILLS.map((index) => <i key={index} className="bm-sk-pill" />)}
    </div> : <div className="bm-method-nav" aria-hidden="true">
      {SKELETON_GROUPS.map((group) => <div key={group} className="bm-method-group">
        <i className="bm-sk-line is-short" />
        <div>{SKELETON_PILLS.slice(0, 3).map((index) => <i key={index} className="bm-sk-pill" />)}</div>
      </div>)}
    </div>}
    {withLesson ? <article className="bm-lesson" aria-hidden="true">
      <header><i className="bm-sk-line is-short" /><i className="bm-sk-line is-title" /><i className="bm-sk-line is-short" /></header>
      <div className="bm-lesson-grid"><section>{bars(2)}</section><section>{bars(2)}</section></div>
      <section className="bm-example">{bars(3)}</section>
      <section className="bm-caution">{bars(2)}</section>
      <section className="bm-try">{bars(1)}</section>
    </article> : null}
  </div>;
}

const methodHref = (key) => `/beit-midrash/${encodeURIComponent(key)}`;

function MethodChooser({ methods, selectedKey, sampleExpression }) {
  const groups = useMemo(() => {
    const map = new Map();
    for (const method of methods) {
      const key = method.category || "other";
      if (!map.has(key)) map.set(key, []);
      map.get(key).push(method);
    }
    return [...map.entries()];
  }, [methods]);

  const nav = useRef(null);
  // Keep the chosen method visible in the rail without moving the page.
  useEffect(() => {
    const link = nav.current?.querySelector('[aria-current="page"]');
    link?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "auto" });
  }, [selectedKey]);

  return <nav ref={nav} className={`bm-method-nav${selectedKey ? " is-rail" : ""}`} aria-label="שיטות הגימטריה">
    {groups.map(([category, rows]) => <div key={category} className="bm-method-group">
      <h4>{CATEGORY_LABELS[category] || "שיטות נוספות"}</h4>
      <div>
        {rows.map((method) => <Link
          key={method.methodKey}
          to={methodHref(method.methodKey)}
          className={method.methodKey === selectedKey ? "is-selected" : ""}
          aria-current={method.methodKey === selectedKey ? "page" : undefined}
        >
          <span>{method.displayLabel}</span>
          <small>{method.computedValue == null ? "אין דוגמה כרגע" : `${sampleExpression} = ${method.computedValue}`}</small>
        </Link>)}
      </div>
    </div>)}
  </nav>;
}

function MethodLesson({ method, methods, blocks, sampleExpression, traceState, onLoadTrace }) {
  const location = useLocation();
  const research = useResearch();
  const shell = use2029Shell();
  const labels = useMemo(() => new Map(methods.map((item) => [item.methodKey, item.displayLabel])), [methods]);
  const definition = useMemo(
    () => methodMechanicalDefinition(method.registry, method, labels),
    [labels, method],
  );
  const trace = traceState?.finding?.projection?.dimensions?.trace || null;
  const traceRequested = Boolean(traceState?.loading || traceState?.finding || traceState?.error);
  const resultValue = Number(method.computedValue);
  const numberHref = method.computedValue != null && Number.isSafeInteger(resultValue)
    ? numberExpressionFocusHref(resultValue, { expression: sampleExpression, method: method.methodKey })
    : null;
  const [doesTitle, buildTitle, exampleTitle, cautionTitle, tryTitle] = blocks;

  const rememberAndOpenNumber = (event) => {
    if (!numberHref) return;
    const lessonHref = `${location.pathname}${location.search}${location.hash}`;
    const selection = {
      entityId: String(resultValue),
      entityType: "number",
      expression: sampleExpression,
      method: method.methodKey,
      resultValue,
      focusKind: "expression",
    };
    research.updateResearchContext?.({
      subject: { id: String(resultValue), type: "number", label: String(resultValue), href: numberHref },
      selection,
      lens: "number",
      returnTo: {
        href: lessonHref,
        label: `בית המדרש · ${method.displayLabel}`,
        subject: { id: method.methodKey, type: "method", label: method.displayLabel, href: lessonHref },
        selection: { entityId: method.methodKey, entityType: "method", method: method.methodKey },
        lens: "beit-midrash",
      },
    });
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    shell.go(numberHref, { preserve: false });
  };

  return <article className="bm-lesson" aria-labelledby="bm-lesson-title" data-method-key={method.methodKey}>
    <header>
      <span className="bm-eyebrow">שיעור שיטה</span>
      <h4 id="bm-lesson-title">{method.displayLabel}</h4>
      {method.displayLabel !== method.methodKey ? <code dir="ltr">{method.methodKey}</code> : null}
      <BeitMidrashLessonFlow expression={sampleExpression} methodLabel={method.displayLabel} result={method.computedValue} />
    </header>

    <div className="bm-lesson-grid">
      <section>
        <h5>{doesTitle}</h5>
        <p>{definition.what}</p>
        {definition.interpretation ? <p className="bm-aside"><b>פירוש: </b>{definition.interpretation} <small>הפירוש נפרד מן החישוב.</small></p> : null}
      </section>
      <section>
        <h5>{buildTitle}</h5>
        <p>{definition.structure || "ההגדרה המדויקת נפתחת בצעדי החישוב שבדוגמה."}</p>
      </section>
    </div>

    <section className="bm-example" aria-label={exampleTitle}>
      <h5>{exampleTitle}</h5>
      <div className="bm-example-line">
        <span>{sampleExpression}</span>
        <b>{method.computedValue ?? "—"}</b>
      </div>
      <small>{method.computedValue == null
        ? "לא התקבלה כרגע תוצאה לשיטה זו."
        : "התוצאה התקבלה מפרופיל השיטות הקנוני."}</small>
      <button type="button" className="bm-button" onClick={onLoadTrace} disabled={traceState?.loading || method.computedValue == null}>
        <NavigationIcon2029 name="layers" />
        {traceState?.loading ? "פותח את צעדי החישוב…" : traceRequested ? "טענו את הצעדים מחדש" : "איך הגענו לתוצאה?"}
      </button>
      {traceState?.error ? <FrameState kind="error" title="צעדי החישוב אינם זמינים כרגע">
        הדוגמה נשארת גלויה; לא הומצאו צעדים חלופיים.
      </FrameState> : null}
      {traceState?.loading ? <FrameState kind="loading" title="פותח את צעדי החישוב">
        הצעדים נטענים רק לאחר בקשה מפורשת.
      </FrameState> : null}
      {traceState?.finding ? <div className="bm-trace">
        <SpatialMethodStage2029
          expression={sampleExpression}
          methodKey={method.methodKey}
          trace={trace}
          expectedValue={method.computedValue ?? null}
          contextRequired={method.executionKind === "context_activated" || method.registry?.execution_kind === "context_activated"}
          depth="S2"
        />
        <MethodTraceExplanation2029 method={method} methods={methods} expression={sampleExpression} trace={trace} />
      </div> : null}
    </section>

    <section className="bm-caution">
      <h5>{cautionTitle}</h5>
      <ul>
        <li>זמינות השיטה מתארת רישום וחישוב בלבד; מצב זה אינו אישור מחקרי, פרסום או חותמת אמת.</li>
        {definition.dependencies.map((item) => <li key={item}>{item}</li>)}
      </ul>
    </section>

    <section className="bm-try">
      <h5>{tryTitle}</h5>
      <Link className="bm-button is-primary" to={`/2029/calculator?q=${encodeURIComponent(sampleExpression)}&m=${encodeURIComponent(method.methodKey)}`}>
        <NavigationIcon2029 name="number" /> נסו במחשבון
      </Link>
      {numberHref ? <Link className="bm-button" to={numberHref} onClick={rememberAndOpenNumber} data-number-example-link="true">
        <NavigationIcon2029 name="number" /> ראו את הדוגמה בדף המספר
      </Link> : null}
      <Link className="bm-link" to={methodHref(method.methodKey)} data-canonical-method-link="true">קישור קבוע לשיעור</Link>
    </section>
  </article>;
}

export default function BeitMidrashMethods({
  section, focused, state, activeMethods, unavailableMethods, methods,
  requestedMethod, selectedMethod, blocks, sampleExpression, traceState, onLoadTrace,
}) {
  return <BeitMidrashSection id="methods" icon="tools" title={section.title} description={section.description} focused={focused}>
    {state.loading ? <MethodsSkeleton withLesson={Boolean(requestedMethod)} /> : null}
    {state.error ? <FrameState kind="error" title="דרכי החישוב אינן זמינות כרגע">
      לא מוצגת רשימה מקומית חלופית.
    </FrameState> : null}
    {!state.loading && !state.error && !activeMethods.length ? <FrameState kind="empty" title="אין כרגע שיטות להצגה">
      שיטות שאינן פעילות אינן מוצגות כאילו הן זמינות לחישוב.
    </FrameState> : null}
    {state.profileError && !state.error ? <p className="bm-note" role="status">
      רישום השיטות נטען, אך הדוגמה החיה אינה זמינה כרגע. לא יוצגו ערכים חלופיים.
    </p> : null}
    {requestedMethod && !state.loading && !state.error && !selectedMethod ? <FrameState kind="error" title="השיטה המבוקשת לא נמצאה">
      אפשר לבחור שיטה מן הרשימה. הכתובת לא הוסבה לעמוד אחר.
    </FrameState> : null}

    {activeMethods.length ? <div className="bm-methods-layout" data-has-lesson={selectedMethod ? "true" : "false"}>
      <MethodChooser methods={activeMethods} selectedKey={selectedMethod?.methodKey || ""} sampleExpression={sampleExpression} />
      {selectedMethod ? <MethodLesson
        method={selectedMethod}
        methods={methods}
        blocks={blocks}
        sampleExpression={sampleExpression}
        traceState={traceState}
        onLoadTrace={onLoadTrace}
      /> : <p className="bm-note bm-pick">בחרו שיטה כדי לפתוח שיעור: מה היא עושה, איך היא בנויה, דוגמה מודרכת והזהרות.</p>}
    </div> : null}

    {unavailableMethods.length ? <details className="bm-unavailable">
      <summary>שיטות שאינן זמינות כרגע · {unavailableMethods.length}</summary>
      <ul>{unavailableMethods.map((method) => <li key={method.methodKey}>
        <span>{method.displayLabel}</span>
        <small>{method.unavailableReason || "רשומה, לא פעילה כרגע"}</small>
      </li>)}</ul>
    </details> : null}
  </BeitMidrashSection>;
}
