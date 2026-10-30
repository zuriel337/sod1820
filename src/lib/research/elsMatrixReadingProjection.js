import { isLiveFableReading } from "../../../supabase/functions/_shared/elsMatrixReadingAction.js";

// Presentation of existing replay receipts, not a search, verifier, or findings store.
const finals = { ך: "כ", ם: "מ", ן: "נ", ף: "פ", ץ: "צ" };
const endings = { כ: "ך", מ: "ם", נ: "ן", פ: "ף", צ: "ץ" };
const canonical = text => String(text || "").replace(/[ךםןףץ]/g, c => finals[c]);
const integer = Number.isSafeInteger;

export function readableElsFinding(item) {
  const text = String(item?.text || "");
  const parts = Array.isArray(item?.parts) && item.parts.length > 0
    && item.parts.every(part => typeof part === "string" && /^[א-ת]+$/u.test(part))
    && canonical(item.parts.join("")) === canonical(text) ? item.parts : [text];
  return parts.map(part => part.replace(/[כמנפצ]$/u, c => endings[c])).join(" ");
}

export function projectElsReadingFindings(result, axis, matrix) {
  const empty = { findings: [], visibleCount: 0, partialCount: 0, outsideCount: 0 };
  if (!axis || result?.contract !== "els_matrix_reading_v1" || result?.state !== "COMPLETE" || !(isLiveFableReading(result) || result.is_test_fixture === true || result.provider?.kind === "test_double")
    || !["term", "scope", "start", "skip", "dir"].every(key => result.axis?.[key] === axis[key])
    || result.axis?.corpus_id !== axis.corpusId || !integer(axis.start) || axis.start < 0 || !integer(axis.skip)
    || axis.skip < 2 || ![1, -1].includes(axis.dir) || !/^[א-ת]{2,24}$/u.test(axis.term)
    || !Array.isArray(result.findings) || result.findings.length > 60) return empty;
  const axisPositions = new Set(Array.from(axis.term, (_, i) => axis.start + axis.dir * axis.skip * i));
  const findings = [], seen = new Set();
  for (const item of result.findings) {
    if (!item || typeof item !== "object") continue;
    const hit = item.occurrence, receipt = item.verification, engine = receipt?.engine;
    const text = canonical(item.text);
    if (!/^[א-ת]{2,64}$/u.test(text) || !hit || !integer(hit.start) || hit.start < 0 || !integer(hit.skip) || hit.skip < 2
      || ![1, -1].includes(hit.dir) || hit.length !== text.length || receipt?.state !== "ENGINE_VERIFIED"
      || receipt.letters_match !== true || !integer(receipt.occurrences_verified) || receipt.occurrences_verified < 1
      || engine?.verification_state !== "MATCH" || engine.contract !== "els_occurrence_replay_v1"
      || engine.corpus_id !== axis.corpusId) continue;
    const key = `els:${axis.corpusId}:${text}:${hit.skip}:${hit.dir}:${hit.start}`;
    if (engine.occurrence_id !== key || seen.has(key)) continue;
    const positions = Array.from(text, (_, i) => hit.start + hit.dir * hit.skip * i);
    if (positions.some(index => !integer(index) || index < 0)) continue;
    seen.add(key);
    const visiblePositions = [];
    let mismatch = false;
    if (matrix?.S === axis.skip && Array.isArray(matrix.rows) && integer(matrix.r0) && integer(matrix.c0) && integer(matrix.cw)) {
      for (let i = 0; i < positions.length; i++) {
        const row = Math.floor(positions[i] / matrix.S) - matrix.r0, col = positions[i] % matrix.S - matrix.c0;
        if (row < 0 || row >= matrix.rows.length || col < 0 || col >= matrix.cw) continue;
        if (canonical(matrix.rows[row]?.[col]) !== text[i]) { mismatch = true; break; }
        visiblePositions.push(positions[i]);
      }
    }
    // Never paint even a partial occurrence over conflicting current corpus letters.
    if (mismatch) visiblePositions.length = 0;
    const axisPart = positions.every(index => axisPositions.has(index));
    findings.push({ key, item, label: readableElsFinding(item), positions, visiblePositions, axisPart, mismatch,
      visibility: mismatch ? "mismatch" : visiblePositions.length === positions.length ? "full" : visiblePositions.length ? "partial" : "outside" });
  }
  return { findings, visibleCount: findings.filter(f => f.visibility === "full").length,
    partialCount: findings.filter(f => f.visibility === "partial").length,
    outsideCount: findings.filter(f => ["outside", "mismatch"].includes(f.visibility)).length };
}
