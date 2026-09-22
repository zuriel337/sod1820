import { fetchNumberMethodProfile } from "./numberCoreProjection.js";

const clean = (value) => value == null ? "" : String(value).trim();

function normalizedMethodName(value) {
  return clean(value).replace(/[\s"'״׳’‘\-_/]/g, "");
}

export function isRegularMethodIdentity(value) {
  return normalizedMethodName(value) === "רגיל";
}

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
  const numeric = Number(root);
  if (!Number.isSafeInteger(numeric) || numeric < 0) return null;
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
} = {}) {
  const expr = clean(expression);
  if (!expr) return null;
  const rows = await fetchNumberMethodProfile(expr);
  const list = Array.isArray(rows) ? rows : [];
  const preferred = clean(preferredMethod);
  const selected = (preferred
    ? list.find((row) => clean(row?.methodKey) === preferred || clean(row?.displayLabel) === preferred)
    : null)
    || regularMethodProfile(list)
    || list[0]
    || null;
  const root = Number(selected?.computedValue);
  if (!Number.isSafeInteger(root) || root < 0) return null;
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
