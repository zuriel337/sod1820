import { buildExactReturnPatch, normalizeResearchContext, researchContextNumber } from "./researchContext.js";

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
  if (root == null || String(root).trim() === "") return null;
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

// Capture the surface underneath the contextual Number window before its selection
// changes Research Context. A caller may already have recorded a more precise locus.
export function numberWindowSourceReturn(context, { href, locator = null } = {}) {
  const current = normalizeResearchContext(context);
  const sourceHref = clean(href);
  if (!sourceHref.startsWith("/") || sourceHref.startsWith("//")) return null;
  const recorded = current?.returnTo;
  const sourceRoute = sourceHref.split("#")[0];
  const sameRoute = recorded?.href.split("#")[0] === sourceRoute;
  const hash = clean(locator) || (sourceHref.includes("#") ? `#${sourceHref.split("#").slice(1).join("#")}` : "");
  const recordedHash = recorded?.href.includes("#") ? `#${recorded.href.split("#").slice(1).join("#")}` : recorded?.selection?.locator;
  if (sameRoute && (!hash || recordedHash === hash)) return recorded;
  // A Post caller can already have changed the subject to Number. Reuse only
  // the source identity from its same-route snapshot, never an old selection.
  const sourceIdentity = sameRoute && current?.subject?.href?.split("#")[0] !== sourceRoute ? recorded : current;
  return normalizeResearchContext({ returnTo: {
    href: hash.startsWith("#") ? `${sourceRoute}${hash}` : sourceHref,
    label: sourceIdentity?.subject?.label || null,
    subject: sourceIdentity?.subject || null,
    selection: hash.startsWith("#") ? { ...current?.selection, locator: hash } : current?.selection || null,
    lens: sourceIdentity?.lens || null,
    dimensions: current?.dimensions || {},
    journey: current?.journey || null,
  } })?.returnTo || null;
}

// Navigation intent only. Crossings must come from the current expression's
// canonical hidden-crossing reader; the destination still re-reads its evidence.
export function buildNumberExpressionHandoff({
  context, root, expression = null, method = null, resultValue = null,
  methodVersion = null, findingId = null, crossingPartner = null,
  verifiedCrossings = [], sourceReturn = null, lens = "number",
} = {}) {
  const numeric = researchContextNumber(root);
  if (!Number.isSafeInteger(numeric) || numeric < 0) return null;
  const current = normalizeResearchContext(context);
  const expr = clean(expression) || null;
  const methodKey = expr ? clean(method) || null : null;
  const crossing = expr && (Array.isArray(verifiedCrossings) ? verifiedCrossings : []).find((item) => (
    item?.kind === "hidden_crossing" && clean(item.partner) === clean(crossingPartner)
  ));
  const partner = crossing ? clean(crossing.partner) || null : null;
  const href = numberExpressionFocusHref(numeric, { expression: expr, method: methodKey, crossingPartner: partner });
  const sameFocus = current?.selection?.expression === expr && current?.selection?.method === methodKey;
  const selection = {
    ...(sameFocus ? current.selection : {}),
    entityId: String(numeric), entityType: "number",
    expression: expr, method: methodKey,
    resultValue: expr ? researchContextNumber(resultValue) : null,
    methodVersion: expr ? clean(methodVersion) || null : null,
    findingId: expr ? clean(findingId) || null : null,
    focusKind: partner ? "crossing" : expr ? "expression" : null,
    crossingPartner: partner,
  };
  // Reconcile the captured source with the LIVE Path. A snapshot must never
  // roll back a revision, replace a fork, or resurrect a cleared Journey.
  const restoredSource = sourceReturn?.href ? buildExactReturnPatch(current, sourceReturn) : null;
  const returnTo = restoredSource ? { ...sourceReturn, ...restoredSource } : current?.returnTo || null;
  return {
    href,
    context: normalizeResearchContext({
      ...current,
      subject: { id: String(numeric), type: "number", label: String(numeric), href },
      selection, lens,
      dimensions: { ...current?.dimensions, expressionFocusExplicit: Boolean(expr), numberHome: href },
      returnTo,
    }),
  };
}

export async function resolveExpressionFocus(expression, {
  preferredMethod = null,
} = {}) {
  const expr = clean(expression);
  if (!expr) return null;
  // Keep ResearchProvider's pure URL/context helpers lightweight. The canonical method reader is
  // loaded only when a real expression-resolution action occurs.
  const { fetchNumberMethodProfile } = await import("./numberCoreProjection.js");
  const rows = await fetchNumberMethodProfile(expr);
  const list = Array.isArray(rows) ? rows : [];
  const preferred = clean(preferredMethod);
  const selected = (preferred
    ? list.find((row) => clean(row?.methodKey) === preferred || clean(row?.displayLabel) === preferred)
    : null)
    || regularMethodProfile(list)
    || list[0]
    || null;
  // null / missing output is NOT numeric zero. Keep actual calculated zero valid.
  if (selected?.computedValue == null || String(selected.computedValue).trim() === "") return null;
  const root = Number(selected.computedValue);
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
