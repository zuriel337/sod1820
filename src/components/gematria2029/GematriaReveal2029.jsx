import React, { useEffect, useMemo, useRef, useState } from "react";
import { projectRevealSteps, traceIdentityMatches } from "../../lib/research/gematriaRevealProjection.js";
import "./gematriaReveal2029.css";

// GEMATRIA_REVEAL_2029_V1 -- presentation only. The counter is a visual interpolation toward the
// canonical result and is never a calculation or evidence source. Step values are shown exactly as
// the canonical trace returned them; nothing is derived or summed here.
const COUNT_MS = 1100;
const STEP_MS = 420;

function prefersReducedMotion() {
  try {
    return typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches === true;
  } catch { return false; }
}

export default function GematriaReveal2029({
  selection,
  trace = { loading: false, finding: null, error: null, key: null },
  onToggleTrace,
  children = null,
}) {
  const expression = selection?.expression || "";
  const methodKey = selection?.methodKey || "";
  const result = selection?.resultValue;
  const verified = Number.isSafeInteger(result);
  const identity = `${expression}::${methodKey}::${verified ? result : "x"}`;

  const [display, setDisplay] = useState(verified ? result : null);
  const [animating, setAnimating] = useState(false);
  const [stepIndex, setStepIndex] = useState(-1);
  const rafRef = useRef(0);
  const timerRef = useRef(0);

  const stop = () => {
    if (rafRef.current) cancelAnimationFrame(rafRef.current);
    if (timerRef.current) clearInterval(timerRef.current);
    rafRef.current = 0;
    timerRef.current = 0;
  };

  useEffect(() => {
    stop();
    if (!verified) { setDisplay(null); setAnimating(false); return undefined; }
    if (prefersReducedMotion()) { setDisplay(result); setAnimating(false); return undefined; }
    setAnimating(true);
    setDisplay(0);
    const start = performance.now();
    const tick = (now) => {
      const t = Math.min(1, (now - start) / COUNT_MS);
      const eased = 1 - Math.pow(1 - t, 3);
      if (t >= 1) { setDisplay(result); setAnimating(false); rafRef.current = 0; return; }
      setDisplay(Math.round(result * eased));
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return stop;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [identity]);

  const skip = () => { stop(); setDisplay(result); setAnimating(false); };

  const finding = trace?.finding && traceIdentityMatches(trace.finding, selection) ? trace.finding : null;
  const steps = useMemo(() => finding ? projectRevealSteps(finding, selection) : null, [finding, selection]);

  useEffect(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = 0;
    if (!steps) { setStepIndex(-1); return undefined; }
    if (prefersReducedMotion()) { setStepIndex(steps.length - 1); return undefined; }
    setStepIndex(0);
    let i = 0;
    timerRef.current = setInterval(() => {
      i += 1;
      if (i >= steps.length) { clearInterval(timerRef.current); timerRef.current = 0; setStepIndex(steps.length - 1); return; }
      setStepIndex(i);
    }, STEP_MS);
    return () => { if (timerRef.current) clearInterval(timerRef.current); timerRef.current = 0; };
  }, [steps]);

  useEffect(() => stop, []);

  if (!selection) return null;
  const traceOpen = Boolean(trace?.finding || trace?.error);
  const staleTrace = Boolean(trace?.finding) && !finding;
  const shown = steps ? steps.slice(0, stepIndex + 1) : [];

  return (
    <div className="sod29-reveal" data-reveal-state={animating ? "counting" : "done"}>
      <div className="sod29-reveal-expression">{expression} · {selection.methodLabel}</div>
      <div className="sod29-reveal-number" aria-hidden="true">{display ?? "—"}</div>
      <p className="sod29-reveal-live" role="status" aria-live="polite">
        {verified && !animating ? `${expression} = ${result}` : ""}
      </p>
      <div className="sod29-reveal-actions">
        {animating ? <button type="button" onClick={skip}>הצג מיד</button> : null}
        {verified && !animating ? (
          <button type="button" onClick={onToggleTrace} disabled={trace?.loading} aria-expanded={traceOpen}>
            {trace?.finding ? "סגור חישוב" : trace?.loading ? "טוען…" : "הצג חישוב"}
          </button>
        ) : null}
      </div>

      {trace?.error ? <div className="sod29-reveal-trace is-error">הסבר החישוב לא זמין כרגע לשילוב הזה.</div> : null}
      {finding ? (
        <div className="sod29-reveal-trace">
          {steps ? (
            <ol className="sod29-reveal-steps">
              {shown.map((step, index) => (
                <li key={index} className={index === stepIndex ? "is-active" : ""}>
                  <span className="sod29-reveal-letter">{step.token}</span>
                  <span className="sod29-reveal-contrib">{step.contribution}</span>
                  <span className="sod29-reveal-subtotal">{step.subtotal}</span>
                </li>
              ))}
            </ol>
          ) : <small>התוצאה אומתה. פירוט אות-אחר-אות לא זמין לשיטה הזו.</small>}
        </div>
      ) : null}
      {staleTrace ? <small className="sod29-reveal-stale">ההסבר שנטען אינו תואם לבחירה הנוכחית.</small> : null}
      {children}
    </div>
  );
}
