const clean = (value) => value == null ? "" : String(value).trim();

// Text identity only. This never aliases formulae or method families; it merely recognizes the
// canonical Hebrew Regular label across harmless punctuation/spacing variants.
export function normalizedMethodIdentity(value) {
  return clean(value).replace(/[\s"'״׳’‘\-_/]/g, "");
}

export function isRegularMethodIdentity(value) {
  return normalizedMethodIdentity(value) === "רגיל";
}
