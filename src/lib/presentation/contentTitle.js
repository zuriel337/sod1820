import { stripHtml } from "../format.js";

const LEGACY_TRAILING_SEGMENT = /^(?:פוסט\s*(?:אין|in)?\s*#?\d*|פוסט\s*#?\d+|פוסט(?:\s+[^|]{1,24}){1,2}\s+(?:#\d+|\d+#)|#\d+)$/i;

function unescapeStoredQuotes(value) {
  return String(value || "")
    .replace(/\\(["'])/g, "$1")
    .replace(/\\{2,}/g, "\\");
}

const NAMED_ENTITIES = Object.freeze({
  amp: "&", quot: '"', apos: "'", lt: "<", gt: ">", nbsp: " ",
  hellip: "…", ndash: "–", mdash: "—", lsquo: "'", rsquo: "'", ldquo: '"', rdquo: '"',
});

function decodeEntitiesOnce(value) {
  return String(value || "").replace(/&(?:#(\d{1,6})|#[xX]([0-9a-fA-F]{1,6})|([a-zA-Z]{2,8}));/g, (match, dec, hex, name) => {
    if (name) return NAMED_ENTITIES[name] ?? match;
    const code = dec ? Number(dec) : parseInt(hex, 16);
    try { return code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : match; } catch { return match; }
  });
}

/** Decodes repeated / double-encoded HTML entities (&amp;quot; -> &quot; -> ") with a bounded pass count. */
export function decodePublicEntities(value, passes = 4) {
  let text = String(value ?? "");
  for (let i = 0; i < passes; i += 1) {
    const next = decodeEntitiesOnce(text);
    if (next === text) break;
    text = next;
  }
  return text;
}

function dropDisplayOnlyLegacySuffixes(value) {
  const parts = String(value || "")
    .split("|")
    .map((part) => part.trim())
    .filter(Boolean);
  while (parts.length > 1 && LEGACY_TRAILING_SEGMENT.test(parts[parts.length - 1])) parts.pop();
  return parts.join(" | ");
}

function boundedWords(value, max) {
  const text = String(value || "").trim();
  if (!max || text.length <= max) return text;
  const cut = text.slice(0, Math.max(1, max - 1));
  const wordBoundary = cut.lastIndexOf(" ");
  const bounded = wordBoundary > Math.floor(max * .6) ? cut.slice(0, wordBoundary) : cut;
  return bounded.trimEnd() + "…";
}

/**
 * Presentation-only cleanup for content/post titles arriving from legacy/WP-shaped sources.
 * Never mutates canonical content or source identity.
 */
export function humanContentTitle(value, { max = 96 } = {}) {
  const decoded = stripHtml(decodePublicEntities(unescapeStoredQuotes(value)))
    .replace(/\s*\|\s*/g, " | ")
    .replace(/\s+/g, " ")
    .trim();
  return boundedWords(dropDisplayOnlyLegacySuffixes(decoded), max);
}

export default humanContentTitle;
