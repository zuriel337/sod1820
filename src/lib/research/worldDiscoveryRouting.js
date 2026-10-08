// Fail-closed numeric guard for World discovery routing.
// Number(null) === 0 and Number("") === 0, so a bare Number.isFinite(Number(v)) check
// turns a missing value into a fabricated Number 0 anchor. A value is routable only
// when it is semantically present AND a safe integer.
export function presentSafeNumber(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isSafeInteger(n) ? n : null;
}

// Same presence rule for finite (not necessarily integer) display values.
export function presentFiniteNumber(value) {
  if (value == null) return null;
  if (typeof value === "string" && value.trim() === "") return null;
  if (typeof value !== "number" && typeof value !== "string") return null;
  const n = Number(value);
  return Number.isFinite(n) ? n : null;
}
