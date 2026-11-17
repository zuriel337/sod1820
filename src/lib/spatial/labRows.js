// src/lib/spatial/labRows.js — PURE: the ONE derived dataset every lab direction (Museum / Discovery / Lab / V1) presents.
// It reads only already-evaluated paths (evaluateConvergencePaths + bindPathsToStructure), the structure spec and the card's locators.
// It computes nothing new: operands come from the canonical engine, quantities from the model, results from the model's declared operation.
// Discovery's progressive reveal and the Lab table are two views of these same rows; an unverified path is NEVER promoted here.
import { describePathSource, describeStructurePart } from "../spatialRenderModel.js";
import { SEMANTIC_ROLE } from "../research/numericOperationTree.js";
import { pathAriaLabel, pathEquationText, pathPresentation, pathTagText, semanticSummary } from "./pathSemantics.js";

export function buildLabRows({ paths = [], spec = null, locators = [], statusLabels = {} } = {}) {
  return paths.map((path, index) => {
    const verified = path.status === "verified";
    return {
      index,
      id: path.id,
      part: path.part || "relation",
      geometric: Boolean(path.geometric),
      phrase: path.phrase || null,
      operand: path.operand,
      quantity: path.quantity,
      result: path.result,
      status: path.status,
      statusLabel: statusLabels[path.status] || path.status,
      // the typed operation (roles + registry sign) — every view renders the equation from these, never from a hand-written "×" or "="
      operationKey: path.operationKey || null,
      operatorSymbol: path.operatorSymbol || null,
      terms: path.terms || [],
      formulaStatus: path.formulaStatus || "supported",
      equationText: pathEquationText(path, { numeric: true }),
      tag: pathTagText(path),
      ariaLabel: pathAriaLabel(path, statusLabels[path.status] || path.status),
      summary: semanticSummary(path),
      path,
      verified,
      counted: verified, // only engine-verified paths are counted; an unverified path stays visible and is not promoted
      info: spec ? describeStructurePart(path, spec) : null,
      source: describePathSource(path, locators),
    };
  });
}

// Discovery: the ordered steps of ONE path's calculation, each tagged with the kind of fact it is. `reveal` (0..steps.length-1) selects how many
// are shown; the last step of an unverified path states that it is the model's declared operation, not an engine result, and is not counted.
export function buildRevealSteps(row) {
  if (!row) return [];
  const steps = [];
  const pres = pathPresentation(row.path);
  const terms = pres.ordered;
  const expressions = terms.filter((t) => t.role === SEMANTIC_ROLE.EXPRESSION);
  // expressions first (the finding leads), each as "the expression" then "its engine value"
  if (!expressions.length) {
    steps.push({ id: "phrase", title: "הביטוי", text: "אין ביטוי מאומת למספר הזה", kind: "missing" });
    steps.push({ id: "engine", title: "הערך במנוע", text: row.operand, note: row.statusLabel, kind: "unverified" });
  }
  terms.forEach((t, i) => {
    const sign = i && pres.operatorSymbol ? `${pres.operatorSymbol} ` : "";
    if (t.role === SEMANTIC_ROLE.EXPRESSION) {
      steps.push({ id: `phrase:${i}`, title: "הביטוי", text: t.text, kind: "text" });
      steps.push(row.verified
        ? { id: `engine:${i}`, title: "הערך במנוע", text: t.value, display: `${sign}${t.value}`, note: "מחושב ומאומת במנוע הקנוני", kind: "engine" }
        : { id: `engine:${i}`, title: "הערך במנוע", text: t.value, display: `${sign}${t.value}`, note: row.statusLabel, kind: "unverified" });
    } else if (t.role === SEMANTIC_ROLE.QUANTITY || t.role === SEMANTIC_ROLE.GEOMETRY) {
      steps.push({ id: `quantity:${i}`, title: t.role === SEMANTIC_ROLE.GEOMETRY ? "הכמות מהגיאומטריה" : "הכמות", text: t.value, display: `${sign}${t.value}`, note: t.origin || "המקור לא צוין במודל", kind: "quantity", state: t.origin ? "declared" : "not_stated", role: t.role });
    }
  });
  // the operation is explained, and named as what it is: a sign between the numbers, not a research entity
  if (row.summary?.supported) steps.push({ id: "operation", title: "הפעולה", text: `${row.summary.operationLabel} ${row.summary.operatorSymbol}`, note: "פעולה מתמטית מוצהרת; אינה ישות מחקרית וחלק מהצורה", kind: "operation" });
  steps.push({ id: "result", title: row.verified ? "התוצאה" : "הפעולה המוצהרת במודל", text: row.result, note: row.verified ? "הפעולה חושבה מחדש והתוצאה זהה למוצהרת" : "לא אומתה במנוע ולא נספרת", kind: row.verified ? "result" : "declared" });
  return steps;
}
