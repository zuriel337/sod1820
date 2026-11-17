// src/lib/spatial/spatialLabRaziel.js — pure projection of the SELECTED path into the context the EXISTING Raziel already accepts.
// No new chat, agent, request field or contract: it fills the bounded channels the request normalizer keeps (readingFocus: label ≤120 / primary ≤160 / sourceLabel /
// reference, numberCoreFocus: root / expression / method / resultValue). `signals` is shown in the panel but is NOT part of the normalized request, so everything Raziel
// must know about the structure is packed deterministically into label/primary — roles and origins, from the typed operation (pathSemantics), never free text.
import { NUMERIC_OPERATION_REGISTRY } from "../research/numericArithmeticOperations.js";
import { razielSemanticFocus, semanticSummary } from "./pathSemantics.js";

const clean = (value, limit) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

export function buildRazielPathFocus({ card, path, partInfo, statusLabel }) {
  if (!card || !path) return null;
  const sem = razielSemanticFocus(path, { statusLabel });
  const verified = path.status === "verified";
  const summary = semanticSummary(path);
  const signals = [
    ...(summary.supported ? summary.parts.filter((p) => !p.engine).map((p) => `${p.text}: ${p.origin}`) : [`${path.unsupportedReason || "נוסחה שאינה נתמכת"}`]),
    partInfo?.note || null,
    verified ? "ערכי הביטויים אומתו במנוע" : statusLabel ? `${statusLabel} · לא נספר` : null,
  ].filter(Boolean).map((line) => clean(line, 160));
  return {
    readingFocus: {
      label: clean(`${partInfo?.label ? `${partInfo.label} · ` : ""}${sem.label}`, 120),
      primary: clean(sem.primary, 160),
      sourceLabel: clean(card.text?.ref || "חומרי צבי", 120),
      reference: clean(card.source?.locators?.[0]?.href || "", 120) || undefined,
      signals,
    },
    numberCoreFocus: {
      kind: "spatial_path",
      root: String(card.value),
      expression: clean(path.phrase || path.operand, 80),
      method: path.phrase ? "רגיל" : null,
      resultValue: path.operand,
    },
  };
}

// The questions a person may ask Raziel about the selected path (plain text; asking is the person's action in the existing chat). They name what is ON SCREEN:
// the operation's sign from the registry, the first number that is not a gematria value, the engine/geometry split, how the value is reached.
export function razielSampleQuestions(path, value, { pathsCount = 1, registry = NUMERIC_OPERATION_REGISTRY } = {}) {
  const summary = semanticSummary(path, registry);
  const questions = [];
  if (summary.supported) {
    questions.push(`למה יש כאן ${registry.symbolLabel(summary.operationKey) || "סימן פעולה"}?`);
    const source = summary.parts.find((p) => !p.engine);
    if (source) questions.push(`מה המקור של המספר ${source.text}?`);
    questions.push("איזה ערכים מחושבים בגימטריה ואילו מגיעים מהגיאומטריה?");
    questions.push(`איך מגיעים ל־${value}?`);
  } else questions.push("למה הנוסחה הזאת לא נתמכת, ומה כן אפשר לדעת עליה?");
  if (pathsCount > 1) questions.push("מה ההבדל בין שני מסלולים?");
  questions.push("איפה אפשר לראות את המקור?");
  return questions;
}
