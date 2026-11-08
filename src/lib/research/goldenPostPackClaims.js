// Golden Post pilot packs: the source-claimed expressions and the pure pack/connection merge.
// Dependency-free on purpose. The Post page and the reading projection need these for EVERY Post, while the
// governed owner chain (event compiler, System Method runtime, Nasrallah golden) that goldenPostContextPacks.js
// composes is needed only for the two pilot Posts and is therefore loaded on demand.
// The values and function bodies are the exact ones that previously lived in goldenPostContextPacks.js,
// which re-exports them (same API, same behaviour).

const clean = (v) => (v == null ? "" : String(v).replace(/\s+/g, " ").trim());

// Typed SOURCE inputs only. `claims` are expressions the Post source itself states with a numeric value
// (live source presence verified); anything not listed here can never become a calculation row.
export const GOLDEN_PACK_CLAIMS = Object.freeze({
  "5112": [
    { expression: "אשר בשמים ממעל", method_key: "רגיל", claimed_value: 1073 },
    { expression: "ולמות לא נתנני", method_key: "רגיל", claimed_value: 1073 },
    { expression: "משיח בן דוד", method_key: "רגיל", claimed_value: 424 },
    { expression: "ולדימיר פוטין", method_key: "מסתתר", claimed_value: 424 },
    { expression: "שבעים וחמש", method_key: "רגיל", claimed_value: 776 },
    { expression: "ביאת המשיח", method_key: "רגיל", claimed_value: 776 },
  ],
  "92": [
    { expression: "משיח", method_key: "רגיל", claimed_value: 358 },
    { expression: "חכמה", method_key: "רגיל", claimed_value: 73 },
    // 1202 is admitted by the owner compiler only as the sourced Oct7 cross-time member with a מסתתר receipt.
    { expression: "סוד יהונתן תשפד", method_key: "מסתתר", claimed_value: 1202, scope: "cross_time", cross_time_subject: "oct7" },
  ],
});

/** Source claims (expression + exact registered method) whose live Trace the caller must fetch. */
export function goldenContextPackClaims(postId) {
  const key = clean(postId);
  return (Object.hasOwn(GOLDEN_PACK_CLAIMS, key) ? GOLDEN_PACK_CLAIMS[key] : null) || [];
}

// Pack rows lead (bounded); an existing connection that merely repeats a pack value is a reference, so
// it is dropped from the list (the number stays reachable from the pack row). Other connections keep
// their place: the pack never crowds out the rest of the existing adapter list.
export function mergeContextPackWithConnections(pack, connections = []) {
  if (!pack) return Array.isArray(connections) ? connections : [];
  const packValues = new Set(pack.rows.map((r) => r.value).filter(Boolean));
  const rest = (Array.isArray(connections) ? connections : [])
    .filter((c) => !(c?.value != null && packValues.has(String(c.value))));
  return [...pack.rows, ...rest];
}
