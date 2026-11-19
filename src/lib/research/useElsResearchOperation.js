import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { captureElsResearchReturn } from "./elsResearchReturnSnapshot.js";

// One transient operation in the existing principal-scoped ResearchProvider.
// No Provider, external store, persistence, engine or AI transport is created here.
export function useElsResearchOperation({ disabled, invoke }) {
  const [task, setTask] = useState(null);
  const active = useRef(false);
  const current = useRef(null);
  const latestSnapshot = useRef(null);
  const projectionRef = useRef(null);
  const observeElsProjection = useCallback((state, projection) => {
    if (!active.current) return;
    projectionRef.current = projection ? { state, projection } : null;
    latestSnapshot.current = captureElsResearchReturn(state, projection);
  }, []);
  const observeElsState = useCallback(state => {
    if (active.current) {
      const prior = projectionRef.current;
      const same = prior && prior.state?.axis?.occurrence_id === state.axis?.occurrence_id
        && prior.state?.axis?.hitId === state.axis?.hitId && prior.state?.term === state.term
        && prior.state?.verification?.corpus_id === state.verification?.corpus_id;
      latestSnapshot.current = captureElsResearchReturn(state, same ? prior.projection : null);
      if (!same) projectionRef.current = null;
    }
  }, []);
  useEffect(() => {
    active.current = !disabled;
    return () => { active.current = false; current.current?.controller.abort(); current.current = null; latestSnapshot.current = null; projectionRef.current = null; };
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
    try {
      const { executeElsResearchOperation } = await import("./elsBackgroundResearch.js");
      return await executeElsResearchOperation({ input, origin, captured, operation, owns, publish, invoke,
        release: () => { if (owns()) current.current = null; } });
    } catch {
      if (owns()) current.current = null;
      return { ok: false, error: "המחקר לא הושלם." };
    }
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
  return useMemo(() => ({ task, start, cancel, clear, observeElsState, observeElsProjection }), [task, start, cancel, clear, observeElsState, observeElsProjection]);
}
