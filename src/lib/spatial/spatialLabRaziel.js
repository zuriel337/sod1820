// src/lib/spatial/spatialLabRaziel.js — pure projection of the SELECTED path into the context the EXISTING Raziel already accepts.
// No new chat, agent, request field or contract: it fills the existing bounded channels (readingFocus: label / primary / sourceLabel / reference /
// signals, and numberCoreFocus: root / expression / method / resultValue) that SystemFrame2029 and razielSessionRequest2029 normalise.
// It states what is already on screen (phrase, operand, quantity, result, status, provenance); it never adds a calculation or a claim.
const clean = (value, limit) => String(value ?? "").replace(/\s+/g, " ").trim().slice(0, limit);

export function buildRazielPathFocus({ card, path, partInfo, statusLabel }) {
  if (!card || !path) return null;
  const subject = path.phrase ? `${path.phrase} (${path.operand})` : String(path.operand);
  const verified = path.status === "verified";
  const signals = [
    `כמות ${path.quantity}: ${path.quantityProvenance || "מוצהרת במודל"}`,
    partInfo?.note || null,
    verified ? "ערך הביטוי אומת במנוע" : statusLabel ? `${statusLabel} · לא נספר` : null,
  ].filter(Boolean).map((line) => clean(line, 160));
  return {
    readingFocus: {
      label: clean(`${card.value} · ${partInfo?.label || "מסלול"} · ${subject} × ${path.quantity}`, 120),
      primary: clean(`${path.operand} × ${path.quantity} = ${path.result}`, 160),
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

// The sample questions a person may ask Raziel about the selected path. Plain text; asking is the person's action in the existing chat.
export function razielSampleQuestions(path, value) {
  return [
    `תסביר לי איך ${path.operand} כפול ${path.quantity} מגיע ל־${value}.`,
    "מה ההבדל בין המחומש החיצוני לפנימי?",
    "הראה לי את חמשת המסלולים.",
    "איזה חלק מהמבנה מגיע מדברי צבי?",
    "איפה אפשר לראות את המקור?",
  ];
}
