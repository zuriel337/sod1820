// Post-hoc check of the classified findings against evaluation targets. This module is the only reader of the targets file and is used only by the report step,
// after the model has answered; the prompt builder and the runner's call path never import it.
import { foldFinals } from "./region.mjs";

const keyOf = (reading, from, length) => reading.cells.slice(from, from + length).map(([i, j]) => `${reading.lineId}:${i},${j}`);

/** Where each target sits in the region (every reading of every line) and how the findings relate to it. */
export function evaluateTargets({ targets, classified, byReading }) {
  return targets.map((raw) => {
    const target = foldFinals(raw);
    const placements = [];
    for (const reading of byReading.values()) for (let at = reading.letters.indexOf(target); at >= 0; at = reading.letters.indexOf(target, at + 1)) placements.push({ reading: reading.id, keys: new Set(keyOf(reading, at, target.length)) });
    const hits = { exact_verified: [], exact_unverified: [], inside_longer_verified: [], inside_longer_unverified: [], overlap_same_line_verified: [], overlap_same_line_unverified: [] };
    for (const finding of classified) {
      const verified = finding.verdict !== "not_verified";
      const suffix = verified ? "verified" : "unverified";
      if (finding.text === target) hits[`exact_${suffix}`].push(finding.id);
      else if (finding.text.includes(target)) hits[`inside_longer_${suffix}`].push(finding.id);
      else {
        const overlaps = finding.occurrences.some((occ) => {
          const own = new Set(occ.cells.map(([i, j]) => `${occ.reading.slice(0, -1)}:${i},${j}`));
          return placements.some((p) => [...p.keys].filter((k) => own.has(k)).length >= 2);
        });
        if (overlaps) hits[`overlap_same_line_${suffix}`].push(finding.id);
      }
    }
    const best = ["exact_verified", "exact_unverified", "inside_longer_verified", "inside_longer_unverified", "overlap_same_line_verified", "overlap_same_line_unverified"].find((k) => hits[k].length) ?? "none";
    return { target: raw, placementsInRegion: placements.map((p) => p.reading), best, hits };
  });
}
