// src/lib/spatial/labRows.js — PURE: the ONE derived dataset every lab direction (Museum / Discovery / Lab / V1) presents.
// It reads only already-evaluated paths (evaluateConvergencePaths + bindPathsToStructure), the structure spec and the card's locators.
// It computes nothing new: operands come from the canonical engine, quantities from the model, results from the model's declared operation.
// Discovery's progressive reveal and the Lab table are two views of these same rows; an unverified path is NEVER promoted here.
import { describePathSource, describeStructurePart } from "../spatialRenderModel.js";

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
  steps.push(row.phrase
    ? { id: "phrase", title: "הביטוי", text: row.phrase, kind: "text" }
    : { id: "phrase", title: "הביטוי", text: "אין ביטוי מאומת למספר הזה", kind: "missing" });
  steps.push(row.verified
    ? { id: "engine", title: "הערך במנוע", text: row.operand, note: "מחושב ומאומת במנוע הקנוני", kind: "engine" }
    : { id: "engine", title: "הערך במנוע", text: row.operand, note: row.statusLabel, kind: "unverified" });
  steps.push({ id: "quantity", title: "הכמות", text: row.quantity, note: row.source.quantity.origin || "המקור לא צוין במודל", kind: "quantity", state: row.source.quantity.state });
  steps.push({ id: "result", title: row.verified ? "התוצאה" : "הפעולה המוצהרת במודל", text: row.result, note: row.verified ? "הכפל הוא פעולה מתמטית מוצהרת" : "לא אומתה במנוע ולא נספרת", kind: row.verified ? "result" : "declared" });
  return steps;
}
