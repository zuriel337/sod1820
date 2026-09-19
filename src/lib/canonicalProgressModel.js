export const CANONICAL_PROGRESS_TIMING = Object.freeze({
  explainAfterMs: 3000,
  engageAfterMs: 12000,
});

export function canonicalProgressPercent({ progress = null, current = null, total = null } = {}) {
  if (progress !== null && progress !== "") {
    const explicit = Number(progress);
    if (Number.isFinite(explicit) && explicit >= 0 && explicit <= 100) return explicit;
  }

  if (current !== null && current !== "" && total !== null && total !== "") {
    const done = Number(current);
    const all = Number(total);
    if (Number.isFinite(done) && Number.isFinite(all) && all > 0 && done >= 0 && done <= all) {
      return (done / all) * 100;
    }
  }
  return null;
}

export function canonicalProgressTier({
  elapsedMs = 0,
  expectedLong = false,
  compact = false,
} = {}) {
  if (compact) return "compact";
  if (expectedLong || elapsedMs >= CANONICAL_PROGRESS_TIMING.engageAfterMs) return "engage";
  if (elapsedMs >= CANONICAL_PROGRESS_TIMING.explainAfterMs) return "explain";
  return "standard";
}
