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
      truncated: !!page.cursor, error: page.error || null });
    onProgress({ phase: "שומר את תוצאת הדף", rows: [...rows] });
    return response;
  } });
  check();
  return result;
}
