import React, { useEffect, useMemo, useState } from "react";
import { buildWordLetterAnatomySpecs, HEBREW_LETTER_NAMES_ENGINE_DEFAULT } from "../../lib/spatial/hebrewLetterAnatomy.js";
import "./spatialMethodStage2029.css";

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
    .filter((step) => step && step.scope === "letter" && HEBREW_LETTER_NAMES_ENGINE_DEFAULT[String(step.token || "")]);

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

function MiluiStage({
  expression,
  trace,
  expectedValue,
  mode = "full",
  depth = "S2",
  loading = false,
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

  return <section
    className="sod29-spatial-method-stage sod29-miluy-spatial"
    dir="rtl"
    data-experience-capability="spatial-method-stage"
    data-method-key="מילוי"
    data-depth={depth}
    data-mode={mode}
    aria-label={`מילוי מרחבי עבור ${expression}`}
  >
    <div className="sod29-spatial-method-stage__head">
      <div>
        <span>מילוי · עומק שכבות</span>
        <strong>אות → שם האות → ערך → סכום</strong>
        <small>המספרים מגיעים מה־Trace הקנוני; התצוגה אינה מחשבת אמת.</small>
      </div>
      <div className="sod29-spatial-method-stage__result">
        <small>TRACE VERIFIED</small>
        <b>{result}</b>
      </div>
    </div>

    <div className="sod29-spatial-method-stage__expression">
      <span>הביטוי הפעיל</span>
      <strong>{expression}</strong>
      <i aria-hidden="true" />
    </div>

    <div className="sod29-spatial-method-stage__letters" role="list" style={{ "--sms-count": Math.max(1, rows.length) }}>
      {rows.map((row, index) => {
        const active = index === focusIndex;
        return <button
          type="button"
          role="listitem"
          key={row.id}
          className={`sod29-spatial-method-stage__letter${active ? " is-focus" : ""}`}
          onClick={() => setFocusIndex(index)}
          aria-pressed={active}
          aria-label={`${row.token}, מילוי ${row.spelling}, ערך ${row.value}`}
        >
          <span className="sod29-spatial-method-stage__glyph">{row.token}</span>
          <span className="sod29-spatial-method-stage__opening" aria-hidden={mode === "visible" ? "true" : undefined}>
            <b>{row.spelling.slice(1)}</b>
            <small>{row.spelling}</small>
          </span>
          <span className="sod29-spatial-method-stage__value">{row.value}</span>
          <span className="sod29-spatial-method-stage__subtotal">Σ {row.subtotal}</span>
        </button>;
      })}
    </div>

    <div className="sod29-spatial-method-stage__focus">
      <div className="sod29-spatial-method-stage__orb" aria-hidden="true"><i /></div>
      <div>
        <span>אות {focus.position}</span>
        <strong>{focus.token} <em>→</em> {focus.spelling} <em>→</em> {focus.value}</strong>
        <p>הערך והסכום מגיעים מהמנוע. איות שם האות הוא כרגע metadata תצוגתי שתואם מספרית למנוע.</p>
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

    <p className="sod29-spatial-method-stage__boundary">
      איותי המילוי בתצוגה עברו parity מספרי מלא מול ערכי מנוע המילוי; סמכות האיות עצמה תישאר כפופה לחוזה המנוע/Registry.
    </p>
  </section>;
}

export default function SpatialMethodStage2029({
  expression,
  methodKey,
  trace,
  expectedValue = null,
  mode = "full",
  depth = "S2",
  onRazielAction,
  onOpenHeichal,
}) {
  const normalized = useMemo(
    () => normalizedTrace(trace, expression, methodKey),
    [trace, expression, methodKey],
  );

  if (!expression || !methodKey) return null;

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

  if (methodKey === "מילוי") {
    return <MiluiStage
      expression={expression}
      trace={normalized}
      expectedValue={expectedValue}
      mode={mode}
      depth={depth}
      onRazielAction={onRazielAction}
      onOpenHeichal={onOpenHeichal}
    />;
  }

  return null;
}

export const spatialMethodStageInternals = {
  normalizedTrace,
  verifiedTrace,
  buildMiluiRows,
};
