// Pure helpers for the Raziel session seam in the 2029 frame (#1142). No reads, no storage, no calls.
// The session itself (thread, single in-flight turn, bounded request, provenance) is the Codex module
// src/lib/research/razielSession2029.js, consumed unchanged.
// The submit-time adapter now projects the same bounded Phase-I descriptor into the canonical request.
// Keep this seam as an identity adapter for existing callers without re-projecting or loading it eagerly.
export function withRazielSurfaceContext(request) {
  return request;
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

const clean = (value, limit = 80) => (value == null ? "" : String(value).replace(/\s+/g, " ").trim().slice(0, limit));
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

// One short Hebrew state for the compact Raziel header (sheet header and desktop Companion).
export function razielStatusLabel({ closed = false, busy = false, status = "idle" } = {}) {
  if (closed) return "נעול כרגע";
  if (busy) return "חושב…";
  if (status === "error") return "לא זמין כרגע";
  return "איתך כאן";
}
