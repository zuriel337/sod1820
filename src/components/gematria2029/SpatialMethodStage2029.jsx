import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { buildWordLetterAnatomySpecs, HEBREW_LETTER_NAMES_ENGINE_DEFAULT } from "../../lib/spatial/hebrewLetterAnatomy.js";
import "./spatialMethodStage2029.css";

const SpatialGlyphScene2029 = lazy(() => import("../experience2029/SpatialGlyphScene2029.jsx"));

const METHOD_TRACE_KIND = Object.freeze({
  "רגיל": "LETTER_LEDGER",
  "מילוי": "LETTER_LEDGER",
  "מסתתר": "ADJACENT_DIFFERENCE",
  "קדמי": "LETTER_LEDGER",
  "משולש מילה": "CUMULATIVE_PREFIX",
});

function normalizedTrace(trace, expression, methodKey) {
  if (!trace || typeof trace !== "object") return null;
  const key = String(trace.method_key || trace.methodKey || methodKey || "").trim();
  const input = String(trace.input || expression || "").trim();
  const value = Number(trace.result ?? trace.value);
  const verification = trace.verification || null;
  return {
    ...trace,
    method_key: key,
    input,
    result: value,
    value,
    verification,
  };
}

function verifiedTrace(trace, expression, methodKey, expectedValue = null) {
  if (!trace) return false;
  if (trace.method_key !== methodKey || trace.input !== expression) return false;
  const requiredTraceKind = METHOD_TRACE_KIND[methodKey];
  if (!requiredTraceKind || trace.trace_kind !== requiredTraceKind) return false;
  if (!Number.isSafeInteger(Number(trace.result))) return false;
  if (trace.verification?.parity !== true) return false;
  if (Number(trace.verification?.trace_value) !== Number(trace.result)) return false;
  if (Number(trace.verification?.canonical_value) !== Number(trace.result)) return false;
  if (expectedValue != null && Number(expectedValue) !== Number(trace.result)) return false;
  return true;
}

function buildMiluiRows(expression, trace) {
  const specs = buildWordLetterAnatomySpecs(expression);
  const steps = (Array.isArray(trace?.steps) ? trace.steps : [])
    .filter((step) => step && step.scope === "letter" && Number(step.base_value) > 0 && HEBREW_LETTER_NAMES_ENGINE_DEFAULT[String(step.token || "")]);

  if (specs.length !== steps.length) return null;

  const rows = [];
  for (let i = 0; i < specs.length; i += 1) {
    const spec = specs[i];
    const step = steps[i];
    const token = String(step.token || "");
    if (token !== spec.letter.codepoint) return null;
    const value = Number(step.contribution ?? step.base_value);
    const subtotal = Number(step.running_subtotal);
    if (!Number.isFinite(value) || !Number.isFinite(subtotal)) return null;
    rows.push({
      id: `milui:${i}:${token}`,
      token,
      spelling: String(spec.expansions?.[0]?.spelling || token),
      value,
      subtotal,
      position: Number.isFinite(Number(step.position)) ? Number(step.position) : i + 1,
      step,
      spec,
    });
  }
  return rows;
}

function buildLedgerRows(trace) {
  const rows = [];
  let wordIndex = 0;
  for (const [index, step] of (Array.isArray(trace?.steps) ? trace.steps : []).entries()) {
    if (!step || step.scope !== "letter") continue;
    const token = String(step.token || "");
    if (!token.trim()) {
      wordIndex += 1;
      continue;
    }
    const value = Number(step.contribution ?? step.base_value);
    const subtotal = Number(step.running_subtotal);
    if (!Number.isFinite(value) || !Number.isFinite(subtotal)) return null;
    rows.push({
      id: `ledger:${index}:${token}`,
      token,
      value,
      subtotal,
      position: Number.isFinite(Number(step.position)) ? Number(step.position) : index + 1,
      wordIndex,
      step,
    });
  }
  return rows.length ? rows : null;
}

function buildMistaterWords(trace) {
  const words = [];
  const steps = Array.isArray(trace?.steps) ? trace.steps : [];
  for (let wordIndex = 0; wordIndex < steps.length; wordIndex += 1) {
    const step = steps[wordIndex];
    const word = String(step?.word || "");
    const letters = [...word];
    const values = Array.isArray(step?.letter_values) ? step.letter_values.map(Number) : [];
    const pairs = Array.isArray(step?.pairs) ? step.pairs : [];
    if (!word || letters.length !== values.length || pairs.length !== Math.max(letters.length - 1, 0)) return null;
    if (values.some((value) => !Number.isFinite(value))) return null;
    const edges = pairs.map((pair, index) => ({
      id: `mistater-edge:${wordIndex}:${index}`,
      difference: Number(pair?.difference),
      leftValue: Number(pair?.left_value),
      rightValue: Number(pair?.right_value),
    }));
    if (edges.some((edge) => !Number.isFinite(edge.difference) || !Number.isFinite(edge.leftValue) || !Number.isFinite(edge.rightValue))) return null;
    words.push({
      id: `mistater-word:${wordIndex}`,
      word,
      letters: letters.map((token, index) => ({ token, value: values[index], index })),
      edges,
      subtotal: Number(step?.word_subtotal),
    });
  }
  return words.length ? words : null;
}

function buildTriangleWordRows(trace) {
  const rows = [];
  let prefix = "";
  for (const [index, step] of (Array.isArray(trace?.steps) ? trace.steps : []).entries()) {
    const token = String(step?.token || "");
    const value = Number(step?.prefix_subtotal);
    if (!token || !Number.isFinite(value)) return null;
    prefix += token;
    rows.push({
      id: `triangle-word:${index}:${token}`,
      token,
      prefix,
      value,
      position: Number.isFinite(Number(step?.original_position)) ? Number(step.original_position) : index + 1,
      step,
    });
  }
  return rows.length ? rows : null;
}

function MethodStageHead({ methodKey, expression, result, subtitle }) {
  return <>
    <div className="sod29-spatial-method-stage__head">
      <div>
        <span>{methodKey} · {subtitle}</span>
        <strong>{expression}</strong>
        <small>הערכים והתוצאה מגיעים מה־Trace הקנוני; התצוגה מסבירה ואינה מחשבת אמת.</small>
      </div>
      <div className="sod29-spatial-method-stage__result">
        <small>תוצאת החישוב</small>
        <b>{result}</b>
      </div>
    </div>
  </>;
}

function GenericActions({ methodKey, expression, trace, onRazielAction, onOpenHeichal }) {
  if (!onRazielAction && !onOpenHeichal) return null;
  return <div className="sod29-spatial-method-stage__generic-actions">
    {onRazielAction ? <button type="button" onClick={() => onRazielAction("explain_method_projection", {
      kind: "method_projection",
      methodKey,
      expression,
      resultValue: Number(trace.result),
    })}>✦ רזיאל</button> : null}
    {onOpenHeichal ? <button type="button" className="primary" onClick={() => onOpenHeichal({
      kind: "method_projection",
      methodKey,
      expression,
      resultValue: Number(trace.result),
    })}>◇ פתח בהיכל</button> : null}
  </div>;
}

function MiluiStage({
  expression,
  trace,
  mode = "full",
  depth = "S2",
  onRazielAction,
  onOpenHeichal,
}) {
  const rows = useMemo(() => buildMiluiRows(expression, trace), [expression, trace]);
  const [focusIndex, setFocusIndex] = useState(0);

  useEffect(() => { setFocusIndex(0); }, [expression, trace?.result]);

  if (!rows?.length) {
    return <section className="sod29-spatial-method-stage" data-state="unverified" dir="rtl" aria-live="polite">
      <p>אין כרגע צעדי אות־אות מאומתים להצגה המרחבית.</p>
    </section>;
  }

  const focus = rows[Math.min(focusIndex, rows.length - 1)];
  const result = Number(trace.result);
  const density = rows.length > 24 ? "long" : "normal";

  return <section
    className="sod29-spatial-method-stage is-milui"
    dir="rtl"
    data-experience-capability="spatial-method-stage"
    data-method-key="מילוי"
    data-depth={depth}
    data-mode={mode}
    data-density={density}
    data-spelling-source="ui_transitional_unverified"
    aria-label={`מילוי מרחבי עבור ${expression}`}
  >
    <div className="sod29-spatial-method-stage__head">
      <div>
        <span>מילוי · עומק שכבות</span>
        <strong>אות → שם האות → ערך → סכום</strong>
        <small>בחרו אות כדי לחשוף את המילוי שלה.</small>
      </div>
      <div className="sod29-spatial-method-stage__result">
        <small>תוצאת החישוב</small>
        <b>{result}</b>
      </div>
    </div>

    <div className="sod29-spatial-method-stage__expression">
      <span>הביטוי הפעיל</span>
      <strong>{expression}</strong>
      <i aria-hidden="true" />
    </div>

    <Suspense fallback={null}>
      <SpatialGlyphScene2029 expression={expression} selectedIndex={focusIndex} onSelect={setFocusIndex}
        expansion={focus.spelling} surface="number" label="המילוי במרחב">
        <p>ערך האות במילוי: {focus.value} · סכום מצטבר: {focus.subtotal}</p>
      </SpatialGlyphScene2029>
    </Suspense>

    <div className="sod29-spatial-method-stage__focus">
      <div>
        <span>אות {focus.position}</span>
        <strong>{focus.token} <em>→</em> {focus.spelling} <em>→</em> {focus.value}</strong>
        <p>סכום מצטבר: {focus.subtotal}</p>
      </div>
      <div className="sod29-spatial-method-stage__actions">
        <button type="button" onClick={() => setFocusIndex((index) => (index + 1) % rows.length)}>האות הבאה ←</button>
        {onRazielAction ? <button type="button" onClick={() => onRazielAction("explain_miluy_step", {
          kind: "miluy_step",
          methodKey: "מילוי",
          expression,
          step: focus.step,
          spelling: focus.spelling,
          resultValue: result,
        })}>✦ רזיאל</button> : null}
        {onOpenHeichal ? <button type="button" className="primary" onClick={() => onOpenHeichal({
          kind: "miluy_step",
          methodKey: "מילוי",
          expression,
          step: focus.step,
          spelling: focus.spelling,
          resultValue: result,
        })}>◇ פתח בהיכל</button> : null}
      </div>
    </div>

    <details className="sod29-spatial-method-stage__boundary">
      <summary>על המילוי והחישוב</summary>
      <p>הערכים ופירוט החישוב מגיעים מהמנוע הקנוני. שמות האותיות מוצגים לפי מפת האיות הקיימת; הם עדיין אינם שדה שמוחזר בפירוט המנוע.</p>
    </details>
  </section>;
}

function RegularStage({ expression, trace, depth, onRazielAction, onOpenHeichal }) {
  const rows = useMemo(() => buildLedgerRows(trace), [trace]);
  if (!rows) return null;
  const words = [...new Set(rows.map((row) => row.wordIndex))].map((wordIndex) => rows.filter((row) => row.wordIndex === wordIndex));
  return <section className="sod29-spatial-method-stage" dir="rtl" data-experience-capability="spatial-method-stage" data-method-key="רגיל" data-depth={depth} data-method-visual="visible-letter-body">
    <MethodStageHead methodKey="רגיל" expression={expression} result={trace.result} subtitle="הערך יושב על האות הגלויה" />
    <div className="sod29-spatial-method-stage__ledger" role="list">
      {words.map((wordRows, wordIndex) => <span className="sod29-spatial-method-stage__ledger-word" key={wordIndex}>
        {wordRows.map((row) => <span className="sod29-spatial-method-stage__ledger-letter" role="listitem" key={row.id}>
          <b>{row.token}</b><small>{row.value}</small>
        </span>)}
      </span>)}
    </div>
    <p className="sod29-spatial-method-stage__boundary">רגיל = האות הגלויה נושאת את ערכה. רווחים נשמרים כגבולות מילים ואינם מוצגים כאות.</p>
    <GenericActions methodKey="רגיל" expression={expression} trace={trace} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />
  </section>;
}

function MistaterStage({ expression, trace, depth, onRazielAction, onOpenHeichal }) {
  const words = useMemo(() => buildMistaterWords(trace), [trace]);
  if (!words) return null;
  return <section className="sod29-spatial-method-stage" dir="rtl" data-experience-capability="spatial-method-stage" data-method-key="מסתתר" data-depth={depth} data-method-visual="adjacent-letter-tension">
    <MethodStageHead methodKey="מסתתר" expression={expression} result={trace.result} subtitle="המתח בין אותיות סמוכות" />
    <div className="sod29-spatial-method-stage__tension" role="list" aria-label="קשרי ההפרש בין אותיות סמוכות">
      {words.map((word) => <span className="sod29-spatial-method-stage__tension-word" key={word.id}>
        {word.letters.map((letter, index) => <React.Fragment key={`${word.id}:${letter.index}`}>
          <span className="sod29-spatial-method-stage__tension-letter" role="listitem"><b>{letter.token}</b><small>{letter.value}</small></span>
          {word.edges[index] ? <span className="sod29-spatial-method-stage__tension-edge" role="listitem" aria-label={`הפרש ${word.edges[index].difference}`}><i aria-hidden="true" /><strong>{word.edges[index].difference}</strong></span> : null}
        </React.Fragment>)}
      </span>)}
    </div>
    <p className="sod29-spatial-method-stage__boundary">המסתתר מוקרן כיחסים בין אותיות סמוכות. ההפרשים המוצגים מגיעים מה־Trace; ה־UI אינו גוזר אותם מחדש.</p>
    <GenericActions methodKey="מסתתר" expression={expression} trace={trace} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />
  </section>;
}

function KadmiStage({ expression, trace, depth, onRazielAction, onOpenHeichal }) {
  const rows = useMemo(() => buildLedgerRows(trace), [trace]);
  if (!rows) return null;
  return <section className="sod29-spatial-method-stage" dir="rtl" data-experience-capability="spatial-method-stage" data-method-key="קדמי" data-depth={depth} data-method-visual="letter-potential-triangle">
    <MethodStageHead methodKey="קדמי / משולש" expression={expression} result={trace.result} subtitle="פוטנציאל משולשי לכל אות" />
    <div className="sod29-spatial-method-stage__potential" role="list">
      {rows.map((row) => <span className="sod29-spatial-method-stage__potential-item" role="listitem" key={row.id}>
        <i aria-hidden="true" />
        <b>{row.token}</b>
        <strong>{row.value}</strong>
        <small>Σ {row.subtotal}</small>
      </span>)}
    </div>
    <p className="sod29-spatial-method-stage__boundary">קדמי / משולש מציג את התרומה המשולשית שהמנוע נתן לכל אות. הצורה היא המחשה בלבד.</p>
    <GenericActions methodKey="קדמי" expression={expression} trace={trace} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />
  </section>;
}

function TriangleWordStage({ expression, trace, depth, onRazielAction, onOpenHeichal }) {
  const rows = useMemo(() => buildTriangleWordRows(trace), [trace]);
  if (!rows) return null;
  return <section className="sod29-spatial-method-stage" dir="rtl" data-experience-capability="spatial-method-stage" data-method-key="משולש מילה" data-depth={depth} data-method-visual="cumulative-prefix-formation">
    <MethodStageHead methodKey="משולש מילה" expression={expression} result={trace.result} subtitle="התהוות מצטברת של קידומות" />
    <div className="sod29-spatial-method-stage__prefix" role="list">
      {rows.map((row, index) => <span className="sod29-spatial-method-stage__prefix-row" role="listitem" key={row.id} style={{ "--sms-prefix-step": index + 1 }}>
        <b>{row.prefix}</b><strong>{row.value}</strong>
      </span>)}
    </div>
    <p className="sod29-spatial-method-stage__boundary">כל שורה היא קידומת שה־Trace מסר. התוצאה הסופית נשארת תוצאת המנוע, לא סכום שמחושב מחדש בתצוגה.</p>
    <GenericActions methodKey="משולש מילה" expression={expression} trace={trace} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />
  </section>;
}

export default function SpatialMethodStage2029({
  expression,
  methodKey,
  trace,
  expectedValue = null,
  mode = "full",
  depth = "S2",
  loading = false,
  onRazielAction,
  onOpenHeichal,
}) {
  const normalized = useMemo(
    () => normalizedTrace(trace, expression, methodKey),
    [trace, expression, methodKey],
  );

  if (!expression || !methodKey || !METHOD_TRACE_KIND[methodKey]) return null;

  if (!verifiedTrace(normalized, expression, methodKey, expectedValue)) {
    return <section
      className="sod29-spatial-method-stage"
      dir="rtl"
      data-experience-capability="spatial-method-stage"
      data-state={loading ? "loading" : "unverified"}
      aria-live="polite"
      aria-busy={loading ? "true" : undefined}
    >
      <p>{loading ? "טוען את צעדי השיטה מהמנוע הקנוני…" : "התצוגה המרחבית נפתחת רק אחרי Trace קנוני מאומת."}</p>
    </section>;
  }

  if (methodKey === "מילוי") return <MiluiStage expression={expression} trace={normalized} mode={mode} depth={depth} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />;
  if (methodKey === "רגיל") return <RegularStage expression={expression} trace={normalized} depth={depth} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />;
  if (methodKey === "מסתתר") return <MistaterStage expression={expression} trace={normalized} depth={depth} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />;
  if (methodKey === "קדמי") return <KadmiStage expression={expression} trace={normalized} depth={depth} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />;
  if (methodKey === "משולש מילה") return <TriangleWordStage expression={expression} trace={normalized} depth={depth} onRazielAction={onRazielAction} onOpenHeichal={onOpenHeichal} />;

  return null;
}

export const spatialMethodStageInternals = {
  normalizedTrace,
  verifiedTrace,
  buildMiluiRows,
  buildLedgerRows,
  buildMistaterWords,
  buildTriangleWordRows,
  METHOD_TRACE_KIND,
};
