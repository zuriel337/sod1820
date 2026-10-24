// Pure helpers for the Raziel session seam in the 2029 frame (#1142). No reads, no storage, no calls.
// The session itself (thread, single in-flight turn, bounded request, provenance) is the Codex module
// src/lib/research/razielSession2029.js, consumed unchanged.
import { buildRazielSurfaceContext } from "../../lib/research/razielSurfaceContext.js";

// Keeps the existing Phase I cross-surface descriptor in surface_semantic.context, exactly as the frame
// sent it before the shared session (the session's own descriptor carries only lens/journey).
export function withRazielSurfaceContext(request, context) {
  if (!request || typeof request !== "object") return request;
  // A deep continuation already carries the bounded descriptor reconstructed from its original
  // snapshot. Never replace it with the surface that happens to be open when the person deepens it.
  if (request.again === true) return request;
  const surfaceContext = buildRazielSurfaceContext(context);
  if (!surfaceContext) return request;
  return { ...request, surfaceSemantic: { ...(request.surfaceSemantic || {}), context: surfaceContext } };
}

// Hebrew nouns for entity types. A raw type key is never shown to a person.
const TYPE_NOUN_HE = Object.freeze({
  post: "פוסט", number: "מספר", phrase: "ביטוי", word: "מילה", book: "ספר", source: "מקור", topic: "נושא",
  world: "העולם", els: "צופן", cipher: "צופן", heichal: "היכל", journey: "מסע", calculator: "מחשבון",
  video: "וידאו", image: "תמונה", researcher: "חוקר", community: "קהילה", finding: "ממצא", verse: "פסוק",
  person: "אדם", entity: "ישות", home: "דף הבית", date: "תאריך", name: "שם",
  frame: "העמוד הנוכחי", system: "העמוד הנוכחי", research: "מחקר", path: "מסלול",
});

export function entityTypeNounHe(type) {
  return TYPE_NOUN_HE[String(type || "").trim().toLowerCase()] || "פריט";
}

const clean = (value, limit = 80) => (value == null
  ? ""
  : String(value).replace(/<[^>]*>/g, " ").replace(/[\u0000-\u001f\u007f]/g, " ").replace(/\s+/g, " ").trim().slice(0, limit));
// slug / key / camelCase identifiers (post-5107, surface_focus, sourceRef) — internal, never a visible label
export const looksLikeInternalKey = (value) => {
  const text = clean(value, 200);
  return /^[a-z0-9]+(?:[_:\-./][a-z0-9]+)+$/i.test(text) || /^[a-z]+(?:[A-Z][a-z0-9]*)+$/.test(text);
};
const visible = (value, limit) => {
  const text = clean(value, limit);
  return text && !looksLikeInternalKey(text) ? text : "";
};
const HEBREW = /[֐-׿]/;

export function razielSubjectLabel(subject) {
  if (!subject || typeof subject !== "object") return "";
  const type = clean(subject.type, 30).toLowerCase();
  if (type === "number") {
    const value = [subject.label, subject.id].map((v) => clean(v, 30)).find((v) => /^\d+$/.test(v));
    return value ? `מספר ${value}` : visible(subject.label, 80) || entityTypeNounHe(type);
  }
  return visible(subject.label, 80) || entityTypeNounHe(type);
}

export function razielSavedLabel(item) {
  if (!item || typeof item !== "object") return "";
  if (String(item.type) === "number" && /^\d+$/.test(clean(item.id, 30))) return `מספר ${clean(item.id, 30)}`;
  return visible(item.label, 80) || entityTypeNounHe(item.type);
}

// Context strip parts from the session snapshot (createRazielContextSnapshot over the existing Research Context).
export function razielContextParts(snapshot) {
  if (!snapshot || typeof snapshot !== "object") return [];
  const parts = [];
  const subject = razielSubjectLabel(snapshot.subject);
  if (subject) parts.push({ key: "subject", label: subject });
  const reading = snapshot.focus?.reading;
  const readingText = visible(reading?.primary || reading?.label, 80);
  if (readingText) parts.push({ key: "reading", prefix: "קוראים", label: readingText });
  const number = snapshot.focus?.number;
  const expression = visible(number?.expression, 60);
  const subjectValue = snapshot.subject?.type === "number" ? clean(snapshot.subject?.id || snapshot.subject?.label, 30) : "";
  if (expression && expression !== subjectValue) {
    const method = clean(number?.method, 40);
    const result = Number.isFinite(number?.result) ? ` = ${number.result}` : "";
    parts.push({ key: "number", prefix: "ביטוי", label: `${expression}${method && HEBREW.test(method) ? ` · ${method}` : ""}${result}` });
  }
  const term = visible(snapshot.focus?.els?.term, 60);
  if (term) parts.push({ key: "els", prefix: "צופן", label: term });
  const sources = Array.isArray(snapshot.sourceNames) ? snapshot.sourceNames.map((s) => visible(s, 120)).filter(Boolean).slice(0, 2) : [];
  if (sources.length) parts.push({ key: "sources", prefix: "מקורות", label: sources.join(" · ") });
  return parts;
}

// Lightweight display-only projection for the context strip. The full bounded request snapshot
// lives in the submit-time chunk and is built only after an explicit send.
export function razielContextPartsFromContext(context, view = {}) {
  const current = context && typeof context === "object" ? context : {};
  const dimensions = current.dimensions && typeof current.dimensions === "object" ? current.dimensions : {};
  const surfaceContext = buildRazielSurfaceContext(current) || {};
  const subject = view.subject || current.subject || null;
  const numberValue = view.numberFocus || dimensions.numberCoreFocus || dimensions.surfaceFocus || null;
  const readingValue = view.readingFocus || surfaceContext.reading || dimensions.readingFocus || null;
  const elsValue = view.elsFocus || null;
  const occurrence = elsValue?.occurrence && typeof elsValue.occurrence === "object" ? elsValue.occurrence : elsValue;
  const rawResult = numberValue?.resultValue ?? numberValue?.result;
  const result = rawResult == null || rawResult === "" ? null : Number(rawResult);
  const sourceNames = [
    ...(Array.isArray(view.sources) ? view.sources : []),
    readingValue?.sourceLabel,
    dimensions.surfaceFocus?.sourceLabel,
    ...(Array.isArray(dimensions.surfaceFindings) ? dimensions.surfaceFindings.map((item) => item?.sourceLabel) : []),
  ].filter(Boolean);
  return razielContextParts({
    subject,
    focus: {
      number: numberValue ? {
        expression: numberValue.expression ?? numberValue.root,
        method: numberValue.method,
        result: Number.isFinite(result) ? result : null,
      } : null,
      reading: readingValue,
      els: occurrence ? { term: occurrence.term ?? elsValue?.term } : null,
    },
    sourceNames,
  });
}
