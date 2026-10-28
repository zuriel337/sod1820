// Turns the model's proposals into located candidates and, after the canonical engine has spoken, into a verified / not verified split.
// Nothing here filters by dictionary, rarity or geometry: a proposal is dropped from "verified" only if its letters are not where they were claimed to be.
import { engineParams, foldFinals } from "./region.mjs";

export const MAX_OCCURRENCES_VERIFIED = 6;
export const MAX_ELSEWHERE_LINES = 8;

export function parseModelOutput(text) {
  let value;
  try { value = JSON.parse(text); } catch (error) { return { ok: false, error: `not JSON: ${error.message}` }; }
  if (!value || !Array.isArray(value.findings)) return { ok: false, error: "no findings array" };
  return { ok: true, value };
}

const allIndexes = (haystack, needle) => {
  const out = [];
  for (let at = haystack.indexOf(needle); at >= 0; at = haystack.indexOf(needle, at + 1)) out.push(at);
  return out;
};

/**
 * Where a proposed text sits in the region. `byReading` is the Map from readings(lines). Whitespace and final letters are normalised (formatting only);
 * any other difference between the proposal and the line is a failure to locate. Returns the status, the reasons and the occurrences with their engine parameters.
 */
export function locateFinding(finding, { region, byReading }) {
  const raw = String(finding.text ?? "");
  const text = foldFinals(raw.replace(/\s+/g, ""));
  const result = { id: String(finding.id ?? ""), line: String(finding.line ?? ""), text, rawText: raw, reasons: [], status: "invalid_text", occurrences: [], totalOccurrences: 0, segmentationOk: true };
  if (!/^[א-ת]{2,}$/u.test(text)) { result.reasons.push("text is not 2+ Hebrew letters"); return result; }
  if (text !== raw) result.reasons.push("formatting normalised (spaces or final letters)");
  const parts = Array.isArray(finding.parts) ? finding.parts.map((p) => foldFinals(String(p).replace(/\s+/g, ""))) : [];
  if (parts.length && parts.join("") !== text) { result.segmentationOk = false; result.reasons.push("parts do not concatenate to text"); }
  const make = (reading, from) => ({ reading: reading.id, from, to: from + text.length - 1, cells: reading.cells.slice(from, from + text.length), params: engineParams(region, reading.cells.slice(from, from + text.length)) });
  const cited = byReading.get(result.line);
  let found = cited ? allIndexes(cited.letters, text).map((from) => make(cited, from)) : [];
  if (found.length) {
    result.status = "located_in_cited_line";
  } else {
    const elsewhere = [];
    for (const reading of byReading.values()) for (const from of allIndexes(reading.letters, text)) elsewhere.push(make(reading, from));
    found = elsewhere;
    if (elsewhere.length) { result.status = "located_in_other_line"; result.reasons.push(cited ? `not in ${result.line}` : `unknown line id ${result.line}`); } else { result.status = "not_in_region"; result.reasons.push("these letters do not appear as a contiguous run in any line of the region"); }
  }
  result.totalOccurrences = found.length;
  result.occurrences = found.slice(0, result.status === "located_in_cited_line" ? MAX_OCCURRENCES_VERIFIED : MAX_ELSEWHERE_LINES);
  return result;
}

/** Items for the canonical verification SQL: one per located occurrence. */
export function verificationItems(located) {
  const items = [];
  for (const finding of located) finding.occurrences.forEach((occ, k) => items.push({ key: `${finding.id}.${k}`, term: finding.text, start: occ.params.start, skip: occ.params.skip, dir: occ.params.dir }));
  return items;
}

/** Combines the location with the engine's answer. `rows` are the objects returned by the verification SQL (matched by key). */
export function classify(located, rows) {
  const byKey = new Map(rows.map((row) => [row.key, row]));
  return located.map((finding) => {
    const checks = finding.occurrences.map((occ, k) => {
      const row = byKey.get(`${finding.id}.${k}`);
      if (!row) return { occurrence: occ.reading, status: "not_checked" };
      const plain = row.engine?.status === "plain_text_row_not_els";
      const synthetic = row.engine?.status === "synthetic_region";
      return { occurrence: occ.reading, from: occ.from, letters_match: row.letters_match === true, plain_text: plain, synthetic, engine_found: plain || synthetic ? null : row.engine?.found === true, engine_status: row.engine?.status ?? null, engine_followup: Boolean(row.engine?.followup), engine_hits: row.engine?.hits ?? null, engine_truncated: row.engine?.completion?.truncated === true, params: occ.params };
    });
    const ok = (c) => c.letters_match === true && (c.plain_text || c.synthetic || c.engine_found === true);
    const verifiedChecks = checks.filter(ok);
    let verdict;
    if (finding.status === "not_in_region" || finding.status === "invalid_text") verdict = "not_verified";
    else if (!verifiedChecks.length) verdict = "not_verified";
    else if (verifiedChecks.some((c) => c.synthetic)) verdict = "verified_synthetic";
    else verdict = verifiedChecks.some((c) => !c.plain_text) ? "verified_by_engine" : "verified_plain_text_only";
    const reasons = finding.reasons.slice();
    if (verdict === "not_verified" && !reasons.length) reasons.push(checks.some((c) => c.letters_match === false) ? "letters at the claimed position differ in the stream" : "the canonical engine returned no matching occurrence");
    return { ...finding, checks, verdict, verifiedOccurrences: verifiedChecks.length, reasons };
  });
}

/** Rows for a synthetic (planted) window: the letters were found in the window's own lines by construction; there is no stream or engine to ask. */
export function syntheticRows(located) {
  return verificationItems(located).map((item) => ({ key: item.key, term: item.term, letters_match: true, engine: { status: "synthetic_region" } }));
}
