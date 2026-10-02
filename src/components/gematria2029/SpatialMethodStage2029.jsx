import React, { useEffect, useMemo, useState } from "react";
import { buildWordLetterAnatomySpecs, HEBREW_LETTER_NAMES_ENGINE_DEFAULT } from "../../lib/spatial/hebrewLetterAnatomy.js";
import { compileMistaterSceneV1, resolveSceneSocketWorld, resolveSceneWorldPosition, resolveSceneTraceValue } from "../../lib/spatial/semanticSceneCompiler.js";
import "./spatialMethodStage2029.css";

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

// Mistater relationships are NOT rebuilt here: the stage consumes the unified scene.v1 compiled from the
// canonical trace (fail-closed — any validation error yields null and the stage renders nothing).
function buildMistaterScene(expression, trace) {
  try {
    return compileMistaterSceneV1({ expression, methodTrace: trace });
  } catch {
    return null;
  }
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
        <small>TRACE VERIFIED</small>
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
        <small>המספרים מגיעים מה־Trace הקנוני; איות שם האות מסומן כשכבת תצוגה מעברית.</small>
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
      איות תצוגה · לא שדה Trace: האיותים עברו parity מספרי מלא מול ערכי מנוע המילוי, אך סמכות האיות עצמה נשארת כפופה לחוזה המנוע/Registry.
    </p>
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

const MISTATER_STAGE_PAD = 24;

function MistaterStage({ expression, trace, depth, onRazielAction, onOpenHeichal }) {
  const scene = useMemo(() => buildMistaterScene(expression, trace), [expression, trace]);
  if (!scene) return null;
  const { extent } = scene;
  const width = extent.maxX - extent.minX + MISTATER_STAGE_PAD * 2;
  const height = extent.maxY - extent.minY + MISTATER_STAGE_PAD * 2;
  // ONE coordinate space: cards and connector endpoints are both projected from scene world coordinates.
  const toScreen = (p) => ({ x: p.x - extent.minX + MISTATER_STAGE_PAD, y: extent.maxY - p.y + MISTATER_STAGE_PAD });
  const letters = scene.nodes.filter((n) => n.kind === "letter_anchor");
  const resultNode = scene.nodes.find((n) => n.id === scene.resultId);
  const result = resolveSceneTraceValue(scene, resultNode.identityRef).value;
  return <section className="sod29-spatial-method-stage" dir="rtl" data-experience-capability="spatial-method-stage" data-method-key="מסתתר" data-depth={depth} data-method-visual="adjacent-letter-tension" data-scene-schema={scene.schema}>
    <MethodStageHead methodKey="מסתתר" expression={expression} result={result} subtitle="המתח בין אותיות סמוכות" />
    <div className="sod29-spatial-method-stage__tension" role="list" aria-label="קשרי ההפרש בין אותיות סמוכות">
      <div className="sod29-spatial-method-stage__tension-scene" dir="ltr" style={{ width, height }}>
        <svg className="sod29-spatial-method-stage__tension-svg" viewBox={`0 0 ${width} ${height}`} width={width} height={height} aria-hidden="true" focusable="false">
          {scene.connectors.map((connector, index) => {
            const a = toScreen(resolveSceneSocketWorld(scene, connector.from));
            const b = toScreen(resolveSceneSocketWorld(scene, connector.to));
            const mx = (a.x + b.x) / 2;
            const my = (a.y + b.y) / 2;
            const lift = connector.curve.lift;
            const { difference } = resolveSceneTraceValue(scene, connector.identityRef);
            return <g key={connector.id} data-connector-id={connector.id} data-from-socket={connector.from.socket} data-to-socket={connector.to.socket}>
              <path className="sod29-spatial-method-stage__tension-path" d={`M ${a.x} ${a.y} Q ${mx} ${my - lift * 2} ${b.x} ${b.y}`} pathLength="1" style={{ "--sms-edge-delay": `${connector.motion.delayMs}ms` }} />
              <text className="sod29-spatial-method-stage__tension-diff" x={mx} y={my - lift - 8} textAnchor="middle">{difference}</text>
            </g>;
          })}
        </svg>
        {letters.map((node) => {
          const p = toScreen(resolveSceneWorldPosition(scene, node.id));
          const { value } = resolveSceneTraceValue(scene, node.identityRef);
          return <span key={node.id} className="sod29-spatial-method-stage__tension-letter" role="listitem" data-node-id={node.id} style={{ left: p.x, top: p.y, width: node.bounds.width, height: node.bounds.height }}>
            <b>{node.label}</b><small>{value}</small>
          </span>;
        })}
      </div>
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
  buildMistaterScene,
  buildTriangleWordRows,
  METHOD_TRACE_KIND,
};
