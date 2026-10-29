// Projection of the existing session only. No requests, persistence, polling or ELS calculation.
export function sameElsMatrixReadingAxis(a, b) {
  return Boolean(a && b && a.term === b.term && a.scope === b.scope && a.corpusId === b.corpusId
    && Number.isSafeInteger(a.start) && a.start === b.start && a.skip === b.skip && a.dir === b.dir);
}

export function selectElsMatrixReading(session, axis) {
  const axisOf = item => item?.continuation?.contextSnapshot?.elsMatrixContext?.axis;
  const turn = session?.currentTurn;
  const active = session?.busy && turn?.kind === "els_matrix_reading";
  const matching = active && sameElsMatrixReadingAxis(axisOf(turn), axis);
  const message = [...(session?.thread || [])].reverse().find(item => item.role === "raziel" && item.elsMatrixReading
    && sameElsMatrixReadingAxis(axisOf(item), axis));
  // A server response must also refer to the requested occurrence. Refusals may have no axis.
  const result = message?.elsMatrixReading;
  const resultAxis = result?.axis;
  const consistent = !resultAxis || (resultAxis.term === axis?.term && resultAxis.scope === axis?.scope
    && resultAxis.start === axis?.start && resultAxis.skip === axis?.skip && resultAxis.dir === axis?.dir);
  return { active: Boolean(active), matching: Boolean(matching), progress: matching ? turn.progress : null,
    result: consistent ? result || null : null };
}

export const elsMatrixReadingMode = value => ["preview", "on"].includes(value) ? value : "off";
