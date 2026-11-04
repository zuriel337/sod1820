import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureElsResearchReturn, elsResearchSnapshotMatches } from "./elsResearchReturnSnapshot.js";

// One transient operation in the existing principal-scoped ResearchProvider.
// No Provider, external store, persistence, engine or AI transport is created here.
export function useElsResearchOperation({ disabled, invoke }) {
  const [task, setTask] = useState(null);
  const active = useRef(false);
  const current = useRef(null);
  const latestSnapshot = useRef(null);
  const observeElsState = useCallback(state => {
    if (active.current) latestSnapshot.current = captureElsResearchReturn(state);
  }, []);
  useEffect(() => {
    active.current = !disabled;
    return () => { active.current = false; current.current?.controller.abort(); current.current = null; latestSnapshot.current = null; };
  }, [disabled]);
  const start = useCallback(async (input, origin) => {
    if (!active.current || current.current) return { ok: false, error: "קיים מחקר במעקב. עצרו או נקו אותו לפני התחלת מחקר נוסף." };
    // Reserve synchronously, before import/validation, so a double click cannot start two jobs.
    const operation = { controller: new AbortController(), task: null };
    const captured = latestSnapshot.current;
    current.current = operation;
    const owns = () => active.current && current.current === operation;
    const publish = patch => {
      if (!owns()) return;
      operation.task = { ...operation.task, ...patch };
      setTask(operation.task);
    };
    let timer;
    try {
      const { prepareElsBackgroundResearch, runElsBackgroundResearch } = await import("./elsBackgroundResearch.js");
      if (!owns()) return { ok: false };
      const prepared = prepareElsBackgroundResearch(input, origin);
      if (prepared.error) { current.current = null; return { ok: false, error: prepared.error }; }
      publish({ id: crypto.randomUUID(), kind: "els_terms", status: "RUNNING", startedAt: Date.now(),
        plan: prepared.plan, origin: prepared.origin,
        returnSnapshot: elsResearchSnapshotMatches(captured, prepared.origin) ? captured : null,
        phase: "מכין מחקר מונחים", rows: [], result: null });
      // The batch itself remains capped at 4 first pages / 15s between calls. This is the
      // outer request watchdog, not a promise that a server computation can be killed.
      timer = setTimeout(() => {
        if (!owns() || operation.task.status !== "RUNNING") return;
        operation.controller.abort();
        publish({ status: "PARTIAL", phase: "הזמן שהוקצה הסתיים; המחקר לא הושלם", finishedAt: Date.now() });
      }, 60000);
      const result = await runElsBackgroundResearch({ prepared, invoke, signal: operation.controller.signal,
        onProgress: update => { if (!operation.controller.signal.aborted) publish(update); } });
      if (owns() && !operation.controller.signal.aborted) {
        const partial = !result.scan?.complete || result.rows.some(row => row.state !== "OK" || row.truncated);
        const failed = result.rows.length > 0 && result.rows.every(row => row.state === "FAILED");
        publish({ status: failed ? "FAILED" : partial ? "PARTIAL" : "COMPLETE", phase: failed ? "בדיקות המונחים נכשלו; אין להסיק שאין מופעים" : partial ? "הבדיקה הסתיימה עם כיסוי חלקי" : "תוצאות המחקר מוכנות",
          rows: result.rows, result, finishedAt: Date.now() });
      }
      return { ok: true };
    } catch {
      if (owns() && !operation.controller.signal.aborted) {
        if (operation.task) publish({ status: "FAILED", phase: "המחקר לא הושלם. נסו שוב במפורש לאחר בדיקת ההגדרות.", finishedAt: Date.now() });
        else current.current = null;
      }
      return { ok: false, error: "המחקר לא הושלם." };
    } finally { clearTimeout(timer); }
  }, [invoke]);
  const cancel = useCallback(() => {
    const operation = current.current;
    if (!operation || operation.task?.status !== "RUNNING") return;
    operation.controller.abort();
    operation.task = { ...operation.task, status: "CANCELLED", phase: "המחקר נעצר; התוצאות שכבר התקבלו נשמרו", finishedAt: Date.now() };
    setTask(operation.task);
  }, []);
  const clear = useCallback(() => {
    if (current.current?.task?.status === "RUNNING") return false;
    current.current?.controller.abort(); current.current = null; setTask(null); return true;
  }, []);
  return useMemo(() => ({ task, start, cancel, clear, observeElsState }), [task, start, cancel, clear, observeElsState]);
}
