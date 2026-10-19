// Presentation hint from the existing Preview transport guard. The worker/guard
// remains the write boundary; this only avoids offering actions it will reject.
export function isCommunityReadOnlyPreview(doc = typeof document === "undefined" ? null : document) {
  return Boolean(doc?.getElementById("sod-hybrid-local-readonly")
    || doc?.getElementById("sod-preview-readonly-bootstrap"));
}
