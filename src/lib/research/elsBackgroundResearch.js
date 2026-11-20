import { elsResearchSnapshotMatches } from "./elsResearchReturnSnapshot.js";
// Execution adapter only: the existing batch planner and canonical bridge own search/replay.
// Loaded on explicit start, never on entering Research or rendering the global frame.
import { prepareElsAdvancedBatch, runElsAdvancedBatch } from "./elsAdvancedBatch.js";
import { buildEls2029ReplayRequest, verifyEls2029Selection } from "./els2029ReplayClient.js";
import { elsSearchSpelling, projectElsAdvancedPage } from "./elsAdvancedPage.js";

export function prepareElsBackgroundResearch(input, origin) {
  const replay = buildEls2029ReplayRequest(origin);
  if (!replay || !origin?.corpusId || typeof origin.corpusId !== "string") return { error: "בחרו מופע מאומת במטריצה לפני התחלת המחקר ברקע." };
  const plan = prepareElsAdvancedBatch({ ...input,
    axis: elsSearchSpelling(input?.axis, input?.spelling),
    related: String(input?.related || "").split(/[,;\n]+/).map(term => elsSearchSpelling(term, input?.spelling)).join("\n") });
  if (plan.error) return plan;
  if (plan.scope !== replay.scope) return { error: "היקף המחקר צריך להתאים למופע שנבחר במטריצה." };
  // Copy only replay identity. No mutable current-page reference, story, job token or private URL.
  return { plan: Object.freeze({ ...plan, terms: Object.freeze([...plan.terms]) }),
    origin: Object.freeze({ entityType: "els", term: replay.term, corpus: replay.scope,
      corpusId: origin.corpusId, skip: replay.skip, dir: replay.dir, start: replay.start }) };
}

export async function runElsBackgroundResearch({ prepared, invoke, signal, onProgress = () => {} }) {
  const check = () => { if (signal.aborted) throw new Error("cancelled"); };
  check();
  onProgress({ phase: "מאמת את מופע המוצא", rows: [] });
  const verified = await verifyEls2029Selection(prepared.origin, request => invoke(request, signal));
  check();
  if (!verified.ok || verified.result?.status !== "OK" || verified.result?.corpus_id !== prepared.origin.corpusId) {
    throw new Error("המופע המקורי לא אומת באותו מקור. המחקר לא התחיל.");
  }
  const rows = [];
  const result = await runElsAdvancedBatch({ plan: prepared.plan, invokePage: async request => {
    check();
    onProgress({ phase: `בודק: ${request.term}`, rows: [...rows] });
    const response = await invoke(request, signal);
    check();
    const page = projectElsAdvancedPage(response);
    rows.push({ term: request.term, state: page.error ? "FAILED" : "OK",
      count: page.projection?.occurrences.length || 0, projection: page.projection || null,
      truncated: !!page.cursor, scanPending: page.scanPending === true, error: page.error || null });
    onProgress({ phase: "שומר את תוצאת הדף", rows: [...rows] });
    return response;
  } });
  check();
  return result;
}

// Execution lifecycle is loaded with the existing bounded executor, only on explicit start.
// Reservation, principal ownership, synchronous origin capture and cancel stay in the hook.
export async function executeElsResearchOperation({ input, origin, captured, operation, owns, publish, invoke, release, createTelemetry }) {
  let timer, tracker, stop;
  try {
    if (!owns()) return { ok: false };
    const prepared = prepareElsBackgroundResearch(input, origin);
    if (prepared.error) { release(); return { ok: false, error: prepared.error }; }
    try {
      const start = createTelemetry || (await import("./elsTelemetryRuntime2029.js")).startElsTelemetry;
      if (!owns() || operation.controller.signal.aborted) return { ok: false };
      tracker = start("terms", { mode: "research", scope: prepared.plan.scope });
      operation.telemetry = tracker;
      stop = () => tracker?.update("tracking_stopped");
      operation.controller.signal.addEventListener("abort", stop, { once: true });
    } catch { /* Optional analytics never blocks research. */ }
    if (!owns() || operation.controller.signal.aborted) return { ok: false };
    publish({ id: crypto.randomUUID(), kind: "els_terms", status: "RUNNING", startedAt: Date.now(),
      plan: prepared.plan, origin: prepared.origin,
      returnSnapshot: elsResearchSnapshotMatches(captured, prepared.origin) ? captured : null,
      phase: "מכין מחקר מונחים", rows: [], result: null });
    // The batch itself remains capped at 4 first pages / 15s between calls. This is the
    // outer request watchdog, not a promise that a server computation can be killed.
    timer = setTimeout(() => {
      if (!owns() || operation.task.status !== "RUNNING") return;
      tracker?.update("partial");
      operation.controller.abort();
      publish({ status: "PARTIAL", phase: "הזמן שהוקצה הסתיים; המחקר לא הושלם", finishedAt: Date.now() });
    }, 60000);
    const result = await runElsBackgroundResearch({ prepared, invoke, signal: operation.controller.signal,
      onProgress: update => { if (!operation.controller.signal.aborted) publish(update); } });
    if (owns() && !operation.controller.signal.aborted) {
      const partial = !result.scan?.complete || result.rows.some(row => row.state !== "OK" || row.truncated);
      const failed = result.rows.length > 0 && result.rows.every(row => row.state === "FAILED");
      tracker?.update(failed ? "failed" : partial ? "partial" : "done", { count: result.rows.length });
      publish({ status: failed ? "FAILED" : partial ? "PARTIAL" : "COMPLETE", phase: failed ? "בדיקות המונחים נכשלו; אין להסיק שאין מופעים" : partial ? "הבדיקה הסתיימה עם כיסוי חלקי" : "תוצאות המחקר מוכנות",
        rows: result.rows, result, finishedAt: Date.now() });
    }
    return { ok: true };
  } catch {
    tracker?.update(operation.controller.signal.aborted ? "tracking_stopped" : "failed");
    if (owns() && !operation.controller.signal.aborted) {
      if (operation.task) publish({ status: "FAILED", phase: "המחקר לא הושלם. נסו שוב במפורש לאחר בדיקת ההגדרות.", finishedAt: Date.now() });
      else release();
    }
    return { ok: false, error: "המחקר לא הושלם." };
  } finally { clearTimeout(timer); operation?.controller?.signal.removeEventListener("abort", stop); tracker?.update("tracking_stopped"); }
}
