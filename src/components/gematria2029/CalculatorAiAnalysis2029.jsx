import React, { useEffect, useRef, useState } from "react";
import { askRaziel } from "../../lib/supabase.js";
import { emit } from "../../lib/events.js";

const clean = (value) => value == null ? "" : String(value).trim();
const cap = (value, length) => clean(value).replace(/\s+/g, " ").slice(0, length);

// Facts sent to Raziel are the engine's own results only. The server contract bounds facts to
// ~1200 characters and the question to 300, same as the shell's Raziel chat.
export function buildMethodAnalysisFacts(selection, ledger, sameValueLabels = []) {
  const steps = Array.isArray(ledger?.steps) ? ledger.steps : [];
  const lines = [
    `ביטוי: ${selection.expression}`,
    `שיטה: ${selection.methodLabel} (${selection.methodKey})`,
    `תוצאה מהמנוע הקנוני: ${selection.resultValue}`,
    steps.length ? `פירוק אות אחרי אות (מהמנוע): ${steps.map((step) => `${step.token}=${step.value}`).join(", ")}` : "",
    steps.length ? `סכום מצטבר (מהמנוע): ${steps.map((step) => step.running).filter((value) => value != null).join(", ")}` : "",
    sameValueLabels.length ? `שיטות נוספות עם אותו ערך על אותו ביטוי: ${sameValueLabels.slice(0, 6).join(", ")}` : "",
    "גבול: עובדה היא החישוב בלבד. כל פרשנות מסומנת כפרשנות, בלי נבואות, ובלי ערכי גימטריה שלא מופיעים כאן.",
  ].filter(Boolean);
  return lines.join("\n").slice(0, 1200);
}

// Explicit-click only: nothing here calls the AI on render, selection change or timers.
export default function CalculatorAiAnalysis2029({ selection, ledger = null, sameValueLabels = [], surface = "calculator-pro-2029" }) {
  const key = selection ? `${selection.expression}::${selection.methodKey}` : "";
  const [state, setState] = useState({ key: "", busy: false, answer: "", level: "", note: "" });
  const requestRef = useRef(0);

  useEffect(() => {
    requestRef.current += 1;
    setState({ key: "", busy: false, answer: "", level: "", note: "" });
  }, [key]);

  if (!selection) return null;
  const done = state.key === key && state.answer;

  const run = async (again = false) => {
    if (state.busy) return;
    const id = ++requestRef.current;
    setState((current) => ({ ...current, key, busy: true, note: "" }));
    emit("calculator_2029", "ai_analysis_requested", {
      props: { surface, expression: selection.expression, method: selection.methodKey, again },
    });
    const result = await askRaziel({
      subject: cap(`הסבר את השיטה ${selection.methodLabel} על הביטוי ${selection.expression}`, 300),
      facts: buildMethodAnalysisFacts(selection, ledger, sameValueLabels),
      again,
      intelligenceLevel: "deep",
      surfaceSemantic: {
        surface: cap(surface, 40),
        number: {
          expression: cap(selection.expression, 60),
          method: cap(selection.methodKey, 40),
          result: cap(selection.resultValue, 30),
        },
      },
    });
    if (id !== requestRef.current) return;
    if (!result || !clean(result.answer)) {
      setState({ key, busy: false, answer: "", level: "", note: "רזיאל לא הצליח לענות כרגע, או שהמכסה להיום הסתיימה. החישוב עצמו תקין." });
      return;
    }
    setState({ key, busy: false, answer: clean(result.answer), level: clean(result.intelligence_level) || "deep", note: "" });
  };

  return (
    <section className="sod29-calcpro-ai" data-experience-capability="calculator-ai-analysis" aria-label="ניתוח AI של השיטה">
      <header>
        <b>ניתוח AI של השיטה · רזיאל</b>
        <small>פרשנות, לא תוצאת חישוב. רץ רק בלחיצה.</small>
      </header>
      {!done ? (
        <button type="button" onClick={() => run(false)} disabled={state.busy} aria-busy={state.busy}>
          {state.busy ? "רזיאל מנתח את התוצאה מהמנוע…" : `✦ נתח את ${selection.methodLabel} על ${selection.expression}`}
        </button>
      ) : (
        <>
          <p className="sod29-calcpro-ai-answer" aria-live="polite">{state.answer}</p>
          <footer>
            <span>{state.level === "fast" ? "ניתוח מהיר" : "ניתוח עמוק"} · מבוסס על התוצאה והפירוק מהמנוע</span>
            <button type="button" onClick={() => run(true)} disabled={state.busy}>{state.busy ? "מנתח…" : "נתח שוב"}</button>
          </footer>
        </>
      )}
      {state.note ? <p className="sod29-calcpro-ai-note" role="status">{state.note}</p> : null}
    </section>
  );
}
