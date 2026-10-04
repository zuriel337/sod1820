import React, { useEffect, useMemo, useRef, useState } from "react";
import { buildSemanticAnimationProjection } from "../../lib/research/semanticAnimationProjection.js";
import "./gematriaReveal2029.css";

const clean = (value) => value == null ? "" : String(value).trim();

function prefersReducedMotion() {
  try {
    return typeof window !== "undefined"
      && window.matchMedia?.("(prefers-reduced-motion: reduce)")?.matches === true;
  } catch {
    return false;
  }
}

export default function GematriaReveal2029({
  selection,
  trace = null,
  compact = false,
  truthState = null,
  provenance = null,
  className = "",
}) {
  const signatureRef = useRef(null);
  const timersRef = useRef([]);
  const rafRef = useRef(0);
  const reducedMotion = prefersReducedMotion();
  const expression = clean(selection?.expression);
  const method = clean(selection?.method || selection?.methodKey);
  const methodLabel = clean(selection?.methodLabel || method);
  const resultValue = Number(selection?.resultValue);
  const hasResult = Number.isFinite(resultValue);

  const projection = useMemo(() => buildSemanticAnimationProjection({
    selection: selection ? {
      ...selection,
      expression: expression || null,
      method: method || null,
      resultValue: hasResult ? resultValue : null,
    } : null,
    trace,
    provenance,
    truthState,
    reducedMotion,
    previousSignature: signatureRef.current,
  }), [selection, trace, provenance, truthState, reducedMotion, expression, method, hasResult, resultValue]);

  const [visibleOrder, setVisibleOrder] = useState(-1);
  const [displayResult, setDisplayResult] = useState(hasResult ? resultValue : null);

  useEffect(() => {
    signatureRef.current = projection.signature;
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    rafRef.current = 0;

    if (projection.status !== "ready") {
      setVisibleOrder(-1);
      setDisplayResult(hasResult ? resultValue : null);
      return undefined;
    }

    if (reducedMotion) {
      setVisibleOrder(projection.cues.length - 1);
      setDisplayResult(hasResult ? resultValue : null);
      return undefined;
    }

    setVisibleOrder(-1);
    setDisplayResult(hasResult ? 0 : null);
    projection.cues.forEach((cue) => {
      const timer = setTimeout(() => setVisibleOrder((current) => Math.max(current, cue.order)), cue.startMs);
      timersRef.current.push(timer);
    });

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [projection.signature, reducedMotion, hasResult, resultValue]); // eslint-disable-line react-hooks/exhaustive-deps

  const resultCue = projection.cues.find((cue) => cue.kind === "result_reveal") || null;
  const resultVisible = Boolean(resultCue && visibleOrder >= resultCue.order);

  useEffect(() => {
    if (!hasResult || !resultVisible) return undefined;
    if (reducedMotion || !resultCue?.presentation?.countUp) {
      setDisplayResult(resultValue);
      return undefined;
    }
    const duration = Math.max(1, Number(resultCue.durationMs) || 240);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const eased = 1 - Math.pow(1 - t, 3);
      setDisplayResult(Math.round(resultValue * eased));
      if (t < 1) rafRef.current = requestAnimationFrame(tick);
      else rafRef.current = 0;
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      rafRef.current = 0;
    };
  }, [resultVisible, resultCue, resultValue, hasResult, reducedMotion]);

  if (!selection || projection.status !== "ready" || !expression || !hasResult) return null;

  const expressionCue = projection.cues.find((cue) => cue.kind === "expression_reveal");
  const expressionVisible = Boolean(expressionCue && visibleOrder >= expressionCue.order);
  const visibleSteps = projection.cues
    .filter((cue) => cue.kind === "trace_step_reveal" && visibleOrder >= cue.order)
    .map((cue) => cue.target.step)
    .filter(Boolean);

  return <section
    className={`sod29-gematria-reveal${compact ? " is-compact" : ""}${className ? ` ${className}` : ""}`}
    data-experience-capability="gematria-reveal"
    data-semantic-animation-version="1"
    data-animation-signature={projection.signature}
    data-trace-state={projection.trace.status}
  >
    <div className={`sod29-gematria-reveal-expression${expressionVisible ? " is-visible" : ""}`}>
      <span>{expression}</span>
      {methodLabel ? <small>{methodLabel}</small> : null}
    </div>
    <div className={`sod29-gematria-reveal-result${resultVisible ? " is-visible" : ""}`} aria-hidden="true">
      {displayResult ?? "—"}
    </div>
    <p className="sod29-gematria-reveal-live" role="status" aria-live="polite">
      {resultVisible ? `${expression} = ${resultValue}` : ""}
    </p>
    {visibleSteps.length ? <ol className="sod29-gematria-reveal-steps" aria-label="שלבי החישוב">
      {visibleSteps.map((step, index) => <li key={`${step.token || "step"}:${index}`}>
        <span>{step.token}</span>
        <b>{step.contribution ?? step.base_value}</b>
        <small>{step.running_subtotal}</small>
      </li>)}
    </ol> : null}
  </section>;
}
