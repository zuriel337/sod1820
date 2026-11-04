// A projection of the ONE global session. No requests, timers, storage or new job owner.
import { normalizeElsRazielMatrixContext } from "./elsRazielMatrixContext.js";
import { sameElsMatrixReadingAxis } from "./elsMatrixReadingPresentation.js";

const labels = {
  starting: "מתחיל סריקה", running: "סריקת מטריצה ברקע", cancelling: "ממתין לביטול הסריקה",
  COMPLETE: "תוצאות הסריקה מוכנות", INCOMPLETE: "הסריקה לא הושלמה",
  FAILED_WITH_REASON: "הסריקה לא הסתיימה בהצלחה", REFUSED: "הסריקה לא הופעלה",
  RUNNING: "המעקב נעצר — אפשר לחזור לסריקה", CANCEL_REQUESTED: "בקשת ביטול נשלחה",
  error: "המעקב נעצר — בדקו את הסריקה הקיימת",
};

function project(item, active = false) {
  if (item?.readingOp === "preview") return null;
  const context = normalizeElsRazielMatrixContext(item?.continuation?.contextSnapshot?.elsMatrixContext);
  const turnId = item?.turnId || item?.id;
  if (!context || typeof turnId !== "string" || !turnId || turnId.length > 160) return null;
  const result = item.elsMatrixReading;
  if (result?.axis && !sameElsMatrixReadingAxis(context.axis, {
    ...result.axis, corpusId: result.axis.corpus_id || result.axis.corpusId,
  })) return null;
  if (result?.state === "PREVIEW") return null;
  const phase = active ? item.progress?.phase || "starting" : result?.state || "error";
  const elapsed = active ? item.progress?.elapsedMs : result?.timing?.elapsed_ms;
  return {
    turnId, axis: context.axis, active,
    label: labels[phase] || "מצב הסריקה אינו ידוע",
    phase,
    minutes: Number.isFinite(elapsed) && elapsed >= 0 ? Math.floor(elapsed / 60000) : null,
    canCancel: active && !item.progress?.cancelling && phase !== "cancelling",
    fixture: result?.is_test_fixture === true || result?.provider?.kind === "test_double",
    saved: result?.saved_snapshot === true,
  };
}

export function selectElsMatrixReadingActivity(session) {
  const turn = session?.currentTurn;
  if (session?.busy && turn?.kind === "els_matrix_reading") return project(turn, true);
  if (turn?.kind === "els_matrix_reading" && turn.status === "error") return project(turn);
  // An ordinary question or changing the current page does not replace the scan's origin.
  const last = [...(session?.thread || [])].reverse().find(item => item?.role === "raziel" && item.elsMatrixReading);
  return last ? project(last) : null;
}

// Only an opaque turn reference travels in router state, never the phrase, job token or coordinates.
// The destination resolves it against the current authenticated session and lets the canonical
// engine replay this load item. This is replay intent, NOT a new verification receipt.
export function elsMatrixReadingReturnLoad(session, turnId) {
  if (typeof turnId !== "string" || !turnId) return null;
  const turn = session?.currentTurn;
  const item = (session?.thread || []).find(row => row.role === "raziel" && row.turnId === turnId && row.elsMatrixReading)
    || (turn?.id === turnId && turn.kind === "els_matrix_reading" ? turn : null);
  const activity = item && project(item, session?.busy && item === turn);
  if (!activity) return null;
  const axis = activity.axis;
  return { term: axis.term, scope: axis.scope, corpusId: axis.corpusId, skip: axis.skip,
    dir: axis.dir, start: axis.start, hitId: axis.hitId, words: [], researchNonce: turnId };
}
