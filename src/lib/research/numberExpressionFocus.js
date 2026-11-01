import { isRegularMethodIdentity } from "./methodIdentity.js";
import { publicPageShareUrl } from "../publicPostUrls.js";

export { isRegularMethodIdentity } from "./methodIdentity.js";

const clean = (value) => value == null ? "" : String(value).trim();

// A return address is the document actually being read, including its source,
// repeated query values and fragment. Reuse the existing credential sanitizer.
export function numberReadingReturnHref(location = {}) {
  const safe = publicPageShareUrl(location);
  if (!safe) return null;
  const url = new URL(safe);
  // Sharing sanitizes credentials and serializes URLSearchParams. Preserve the
  // actual document's harmless query encoding as well as repeated values when
  // that query contains exactly the same sanitized pairs. Never restore a
  // query from which the sanitizer removed credentials.
  if (typeof location.search === "string"
    && new URLSearchParams(location.search).toString() === url.searchParams.toString()) {
    url.search = location.search;
  }
  return url.pathname + url.search + url.hash;
}
const exactNonnegativeInteger = (value) => {
  if (typeof value !== "number" && typeof value !== "string") return null;
  if (typeof value === "string" && !/^\d+$/.test(value.trim())) return null;
  const numeric = Number(value);
  return Number.isSafeInteger(numeric) && numeric >= 0 ? numeric : null;
};

export function regularMethodProfile(rows = []) {
  return (Array.isArray(rows) ? rows : []).find((row) => (
    isRegularMethodIdentity(row?.methodKey)
    || isRegularMethodIdentity(row?.displayLabel)
  )) || null;
}

export function numberExpressionFocusHref(root, {
  expression = null,
  method = null,
  crossingPartner = null,
} = {}) {
  const numeric = exactNonnegativeInteger(root);
  if (numeric == null) return null;
  const params = new URLSearchParams();
  const expr = clean(expression);
  const methodKey = clean(method);
  const crossing = clean(crossingPartner);
  if (expr) params.set("focus", expr);
  if (methodKey) params.set("method", methodKey);
  if (crossing) params.set("cross", crossing);
  const query = params.toString();
  const prefix = (import.meta.env?.VITE_PUBLIC_FOUNDATION_PREVIEW === "true" || import.meta.env?.VITE_PUBLIC_READING_RELEASE === "public-reading-20261101") ? "/number" : "/2029/number";
  return `${prefix}/${numeric}${query ? `?${query}` : ""}`;
}

export function parseNumberExpressionFocus(search = "") {
  const params = new URLSearchParams(String(search || "").replace(/^\?/, ""));
  const expression = clean(params.get("focus"));
  const method = clean(params.get("method"));
  const crossingPartner = clean(params.get("cross"));
  return {
    expression: expression || null,
    method: method || null,
    crossingPartner: crossingPartner || null,
    explicit: Boolean(expression || crossingPartner),
  };
}

export async function resolveExpressionFocus(expression, {
  preferredMethod = null,
  expectedValue = null,
  profileReader = null,
} = {}) {
  const expr = clean(expression);
  if (!expr) return null;
  // Keep ResearchProvider's pure URL/context helpers lightweight. The canonical method reader is
  // loaded only when a real expression-resolution action occurs.
  const readProfile = profileReader || (await import("./numberCoreProjection.js")).fetchNumberMethodProfile;
  const rows = await readProfile(expr);
  const list = Array.isArray(rows) ? rows : [];
  const preferred = clean(preferredMethod);
  // A requested method is part of the user's selected identity, not a suggestion
  // that can silently fall back to the regular result.
  const selected = preferred
    ? list.find((row) => clean(row?.methodKey) === preferred || clean(row?.displayLabel) === preferred) || null
    : regularMethodProfile(list) || list[0] || null;
  const root = exactNonnegativeInteger(selected?.computedValue);
  if (root == null || (expectedValue != null && exactNonnegativeInteger(expectedValue) !== root)) return null;
  const method = clean(selected?.methodKey || selected?.displayLabel) || null;
  return {
    root,
    expression: expr,
    method,
    resultValue: root,
    focusKind: "expression",
    href: numberExpressionFocusHref(root, { expression: expr, method }),
    rows: list,
  };
}

export default resolveExpressionFocus;

// Address adaptation only. Expressions still go through the canonical profile
// reader; opening an address neither publishes nor creates a research record.
export async function resolvePublicNumberAddress(value, { search = "", profileReader = null } = {}) {
  const address = clean(value);
  if (!address || address.length > 500) throw new Error("invalid-number-address");
  const focus = parseNumberExpressionFocus(search);
  const numeric = resolveNumericNumberAddress(address, search);
  if (numeric) return numeric;
  const resolved = await resolveExpressionFocus(address, { preferredMethod: focus.method, profileReader });
  if (!resolved) throw new Error("expression-method-unavailable");
  return { root: resolved.root, address, publicAddress: true,
    focus: { ...focus, expression: address, method: resolved.method, explicit: true },
    // This is the execution just performed by the canonical resolver, not a
    // second calculation or a caller-supplied URL/history-state result.
    methodProfile: { expression: address, rows: resolved.rows } };
}

// Numeric addresses need no engine/network round trip or temporary frame
// replacement. Expression addresses still resolve through the canonical engine.
export function resolveNumericNumberAddress(value, search = "") {
  const address = clean(value);
  if (!/^\d+$/.test(address)) return null;
  const root = exactNonnegativeInteger(address);
  if (root == null || address.length > 500) throw new Error("invalid-number-address");
  return { root, address, focus: parseNumberExpressionFocus(search), publicAddress: true };
}
