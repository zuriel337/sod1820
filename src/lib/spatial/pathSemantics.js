// src/lib/spatial/pathSemantics.js — PURE: how a derived path is PRESENTED and EXPLAINED, from its typed operation. No React/three import.
// Every consumer (the lab's DOM, the 3D tags, the World shelf, Raziel) calls these helpers instead of writing "×", "=" or "כפול" itself, so the sign shown is the
// registry's symbol for the path's operation_key, and a change in the shared registry or tree is a change everywhere. An operator is rendered next to numbers;
// it is never a number, a shape or an entity (and never a node of the 3D scene).
import { RELATION_SYMBOL, SEMANTIC_ROLE, formulaToText, tokensToText } from "../research/numericOperationTree.js";
import { NUMERIC_OPERATION_REGISTRY } from "../research/numericArithmeticOperations.js";

const ROLE_LABEL = Object.freeze({
  [SEMANTIC_ROLE.EXPRESSION]: "ביטוי",
  [SEMANTIC_ROLE.VALUE]: "ערך",
  [SEMANTIC_ROLE.QUANTITY]: "כמות",
  [SEMANTIC_ROLE.GEOMETRY]: "גיאומטריה",
  [SEMANTIC_ROLE.RESULT]: "תוצאה",
  [SEMANTIC_ROLE.OPERATOR]: "פעולה",
  derived: "ביניים",
});
export const semanticRoleLabel = (role) => ROLE_LABEL[role] || String(role);

const isShapeQuantity = (t) => t.role === SEMANTIC_ROLE.QUANTITY || t.role === SEMANTIC_ROLE.GEOMETRY;

// The terms in DISPLAY order: for a two-term commutative operation the expression leads (the finding is the hero); everything else keeps the declared order.
export function pathPresentation(path, registry = NUMERIC_OPERATION_REGISTRY) {
  const terms = Array.isArray(path?.terms) ? path.terms : [];
  const row = registry.get(path?.operationKey);
  const lead = terms.find((t) => t.role === SEMANTIC_ROLE.EXPRESSION) || terms[0] || null;
  // only a two-term commutative operation is reordered (the finding leads: "אל × 20"); a longer product keeps the order the model declares ("6 × 10 × טוב")
  const ordered = row?.commutative && lead && terms[0] !== lead && terms.length === 2 ? [lead, ...terms.filter((t) => t !== lead)] : terms;
  return { lead: ordered[0] || null, rest: ordered.slice(1), ordered, operatorSymbol: path?.operatorSymbol || null, operationKey: path?.operationKey || null, spoken: registry.spoken(path?.operationKey) };
}

// "31 × 20 = 620" — from the tokens (declared roles); with showValues an expression is followed by its (declared/engine) value: "אל (31) × 20 = 620".
// numeric: every expression is replaced by its value ("31 × 20 = 620"): the digits-and-signs line, safe inside a left-to-right run.
export function pathEquationText(path, { showValues = false, numeric = false, registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  if (!path || path.formulaStatus === "unsupported" || !Array.isArray(path.terms) || !path.terms.length) return String(path?.expression || "");
  return `${pathOperandsText(path, { showValues, numeric, registry })} ${RELATION_SYMBOL} ${path.result}`;
}

// The left side only ("31 × 20", "208 + 702"): the operands joined by the operation's registered symbol.
export function pathOperandsText(path, { showValues = false, numeric = false, registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  if (!path || !Array.isArray(path.terms) || !path.terms.length) return String(path?.expression || "");
  const { ordered, operatorSymbol } = pathPresentation(path, registry);
  const show = (t) => (t.role === SEMANTIC_ROLE.EXPRESSION ? (numeric ? String(t.value ?? "?") : showValues && t.value != null ? `${t.text} (${t.value})` : t.text) : t.text);
  return ordered.map(show).join(` ${operatorSymbol} `);
}

// The badge a 3D scene puts next to the part that carries the path: the operation's sign and the shape/quantity term ("× 20"). Never a free-text guess.
export function pathTagText(path, registry = NUMERIC_OPERATION_REGISTRY) {
  const { rest, lead, operatorSymbol } = pathPresentation(path, registry);
  const q = path?.terms?.find(isShapeQuantity) || rest[0] || lead;
  return q && operatorSymbol ? `${operatorSymbol} ${q.text}` : q ? q.text : "";
}

export function pathAriaLabel(path, statusLabel, registry = NUMERIC_OPERATION_REGISTRY) {
  const { lead, rest, spoken } = pathPresentation(path, registry);
  const name = (t) => (t.role === SEMANTIC_ROLE.EXPRESSION ? `${t.text} ${t.value ?? ""}`.trim() : t.text);
  return `${lead ? name(lead) : "ללא ביטוי"}${rest.length ? `, ${spoken} ${rest.map(name).join(` ${spoken} `)}` : ""}, שווה ${path?.result}. ${statusLabel}`;
}

const originOf = (t) => (t.role === SEMANTIC_ROLE.EXPRESSION ? (t.value != null ? "מנוע הגימטריה (רגיל)" : "ביטוי ללא ערך מוצהר") : t.origin || (t.declaredOnly ? "ערך מוצהר ללא ביטוי — לא אומת" : "לא צוין מקור"));

// What each part of the calculation IS, one line per part, for a person (and the source of Raziel's wording). Pure data: [{role, roleLabel, text, value, origin}].
export function semanticSummary(path, registry = NUMERIC_OPERATION_REGISTRY) {
  if (!path || path.formulaStatus === "unsupported") return { supported: false, code: path?.unsupportedCode || null, reason: path?.unsupportedReason || null, parts: [] };
  const { ordered, operationKey, spoken, operatorSymbol } = pathPresentation(path, registry);
  const row = registry.get(operationKey);
  const parts = ordered.map((t) => ({ role: t.role, roleLabel: semanticRoleLabel(t.role), text: t.text, value: t.value ?? null, origin: originOf(t), engine: t.role === SEMANTIC_ROLE.EXPRESSION }));
  return {
    supported: true, operationKey, operationLabel: row?.display_label || operationKey, operatorSymbol, spoken, parts,
    result: { role: SEMANTIC_ROLE.RESULT, roleLabel: semanticRoleLabel(SEMANTIC_ROLE.RESULT), value: path.result, origin: "חישוב מתמטי מוצהר, נבדק מחדש (לא עובדת מנוע)" },
    engineParts: parts.filter((p) => p.engine).map((p) => `${p.text}=${p.value}`), geometryParts: parts.filter((p) => p.role === SEMANTIC_ROLE.GEOMETRY).map((p) => `${p.text} (${p.origin})`),
    otherParts: parts.filter((p) => !p.engine && p.role !== SEMANTIC_ROLE.GEOMETRY).map((p) => `${p.text} (${p.roleLabel}: ${p.origin})`),
  };
}

// Compact, deterministic Hebrew for Raziel's EXISTING bounded channels (label ≤120, primary ≤160, reference ≤120): roles + origins, no free text, no guess.
// The request normalizer keeps only these fields, so everything Raziel must know about the structure is packed here.
const cut = (text, limit) => { const t = String(text).replace(/\s+/g, " ").trim(); return t.length <= limit ? t : `${t.slice(0, limit - 1)}…`; };
export function razielSemanticFocus(path, { statusLabel = "", registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  const sum = semanticSummary(path, registry);
  if (!sum.supported) return { primary: cut(`נוסחה שאינה נתמכת — לא אומתה: ${path?.expression || ""}`, 160), label: cut(`לא נתמך: ${path?.unsupportedReason || ""}`, 120), reference: null };
  const piece = (p) => (p.engine ? `${p.text} (${p.value}, מנוע)` : p.role === SEMANTIC_ROLE.GEOMETRY ? `${p.text} (גיאומטריה)` : p.role === SEMANTIC_ROLE.QUANTITY ? `${p.text} (כמות מהמקור)` : p.text);
  const eq = `${sum.parts.map(piece).join(` ${sum.operatorSymbol} `)} ${RELATION_SYMBOL} ${path.result}`;
  const verified = path.status === "verified";
  return {
    primary: cut(`${sum.operationLabel}: ${eq}${verified ? "" : ` · ${statusLabel || "לא אומת"}, לא נספר`}`, 160),
    label: cut(`${sum.operationLabel} · מנוע: ${sum.engineParts.join(", ") || "אין"} · ${sum.parts.filter((p) => !p.engine).map((p) => `${p.text} ${p.roleLabel === "גיאומטריה" ? "גיאומטריה" : p.roleLabel}: ${p.origin}`).join("; ") || "ללא כמויות"}`, 120),
    reference: null,
  };
}

export { formulaToText, tokensToText };
