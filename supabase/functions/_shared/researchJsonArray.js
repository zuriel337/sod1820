export function parseResearchJsonArray(value) {
  const text = String(value || "").trim();
  const start = text.indexOf("[");
  if (start < 0) return null;

  const end = text.lastIndexOf("]");
  if (end > start) {
    try {
      const parsed = JSON.parse(text.slice(start, end + 1));
      if (Array.isArray(parsed)) return parsed;
    } catch {
      // A model response can hit its output-token ceiling after emitting one or
      // more complete objects. Recover only complete JSON objects below.
    }
  }

  const recovered = [];
  let objectStart = -1;
  let objectDepth = 0;
  let inString = false;
  let escaped = false;

  for (let i = start + 1; i < text.length; i += 1) {
    const char = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (char === "\\") escaped = true;
      else if (char === '"') inString = false;
      continue;
    }
    if (char === '"') {
      inString = true;
      continue;
    }
    if (char === "{") {
      if (objectDepth === 0) objectStart = i;
      objectDepth += 1;
      continue;
    }
    if (char !== "}" || objectDepth === 0) continue;

    objectDepth -= 1;
    if (objectDepth !== 0 || objectStart < 0) continue;
    try {
      const object = JSON.parse(text.slice(objectStart, i + 1));
      if (object && typeof object === "object" && !Array.isArray(object)) recovered.push(object);
    } catch {
      // Never repair or invent malformed content; only retain independently
      // valid objects that the model finished before truncation.
    }
    objectStart = -1;
  }

  return recovered.length ? recovered : null;
}
