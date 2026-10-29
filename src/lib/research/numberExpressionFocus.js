import { isRegularMethodIdentity } from "./methodIdentity.js";

export { isRegularMethodIdentity } from "./methodIdentity.js";

const clean = (value) => value == null ? "" : String(value).trim();
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
  return `/2029/number/${numeric}${query ? `?${query}` : ""}`;
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
