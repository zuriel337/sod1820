import { parseElsHitKey } from "../../lib/elsJourney.js";

// Read-only projection of the canonical lens. Never guess a word boundary when
// the supplied source text and inclusive corpus range disagree.
export function projectVerseWords(verse) {
  if (!Number.isInteger(verse?.from) || !Number.isInteger(verse?.to) || verse.from < 0 || verse.to < verse.from) return null;
  const words = String(verse.text || "").split(/[\s־–-]+/u).map((text) => ({ text, count: (text.match(/[א-ת]/gu) || []).length })).filter((word) => word.count);
  if (!words.length || words.reduce((n, word) => n + word.count, 0) !== verse.to - verse.from + 1) return null;
  const parity = new Map();let index = verse.from;
  words.forEach((word, wordIndex) => { for (let i = 0; i < word.count; i++) parity.set(index++, wordIndex % 2); });
  return { ...verse, words, parity };
}

// Same presenter order as Classic: primary axis, then each currently shown word.
// Coordinates come only from admitted occurrences; crossings reveal at the first step.
export function projectPresentation(state) {
  const steps = [], earliest = new Map();
  if (state?.status !== "ok" || state?.verification?.state !== "MATCH") return { steps, earliest, key: "" };
  const main = (state.matrix?.marks || []).filter((mark) => mark.type === "main").map((mark) => Number(mark.i));
  if (main.length) steps.push({ label: state.termRaw || state.term, indices: main });
  for (const finding of state.findings || []) {
    const indices = new Set();
    for (const hit of [...(finding.hits || []), ...(finding.sourceHits || [])]) {
      if (!hit.shown || hit.withinRadius === false || !(hit.verified || hit.kind === "source-sequence")) continue;
      const anchor = parseElsHitKey(hit.hitId);
      if (!anchor || !Number.isInteger(anchor.start) || !Number.isInteger(anchor.skip) || anchor.skip < 1) continue;
      Array.from(finding.t).forEach((_, i) => indices.add(anchor.start + anchor.dir * anchor.skip * i));
    }
    if (indices.size) steps.push({ label: finding.t, indices: [...indices] });
  }
  steps.forEach((step, order) => step.indices.forEach((index) => { if (!earliest.has(index)) earliest.set(index, order); }));
  return { steps, earliest, key: JSON.stringify([state.scope, state.axis?.hitId, steps]) };
}
