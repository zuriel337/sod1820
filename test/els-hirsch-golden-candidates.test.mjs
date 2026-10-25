import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  HIRSCH_GOLDEN_CANDIDATES,
  HIRSCH_GOLDEN_CONTRACT,
  HIRSCH_NEGATIVE_CONTROL,
} from "./fixtures/els-hirsch-golden-candidates.mjs";

const letters = readFileSync(new URL("../tools/els/data/tk-letters.txt", import.meta.url), "utf8").trim();
const TORAH_LENGTH = 304805;
const FINAL_LETTERS = { "ך": "כ", "ם": "מ", "ן": "נ", "ף": "פ", "ץ": "צ" };
const normalize = (value) => [...String(value || "")]
  .filter((letter) => letter >= "א" && letter <= "ת")
  .map((letter) => FINAL_LETTERS[letter] || letter)
  .join("");

function parseHitId(hitId) {
  const match = /^(\d+)_(-?1)_(\d+)$/.exec(hitId);
  assert.ok(match, `${hitId} is a canonical saved-hit key`);
  return { skip: Number(match[1]), dir: Number(match[2]), start: Number(match[3]) };
}

function exactReplay(term, hitId, scope) {
  const normalized = normalize(term);
  const { skip, dir, start } = parseHitId(hitId);
  const limit = scope === "torah" ? TORAH_LENGTH : letters.length;
  const positions = Array.from({ length: normalized.length }, (_, index) => start + index * skip * dir);
  return positions.length >= 2
    && positions.every((position, index) => position >= 0 && position < limit && letters[position] === normalized[index]);
}

function fixedSkipOccurrences(term, hitId, scope) {
  const normalized = normalize(term);
  const { skip } = parseHitId(hitId);
  const limit = scope === "torah" ? TORAH_LENGTH : letters.length;
  const hits = [];
  for (let start = 0; start < limit; start += 1) {
    if (letters[start] !== normalized[0]) continue;
    for (const dir of [1, -1]) {
      const end = start + (normalized.length - 1) * skip * dir;
      if (end < 0 || end >= limit) continue;
      if ([...normalized].every((letter, index) => letters[start + index * skip * dir] === letter)) hits.push(`${skip}_${dir}_${start}`);
    }
  }
  return hits;
}

test("Hirsch Golden fixture is test-only exact replay evidence, not semantic or runtime vocabulary", () => {
  assert.equal(HIRSCH_GOLDEN_CONTRACT, "els_hirsch_cold_golden_candidates_v1");
  assert.equal(HIRSCH_GOLDEN_CANDIDATES.length, 3);

  for (const golden of HIRSCH_GOLDEN_CANDIDATES) {
    assert.equal(golden.storedLegacy.startIndex, null);
    assert.equal(golden.storedLegacy.corpusId, null);
    assert.equal(golden.storedLegacy.verified, true);
    assert.equal(exactReplay(golden.label, golden.axis.hitId, golden.scope), true, `${golden.label} exact axis replays`);
    assert.deepEqual(fixedSkipOccurrences(golden.label, golden.axis.hitId, golden.scope), [golden.axis.hitId], `${golden.label} has one governed occurrence at its recorded skip`);

    const axis = parseHitId(golden.axis.hitId);
    assert.equal(exactReplay(golden.label, `${axis.skip}_${axis.dir}_${axis.start + 1}`, golden.scope), false, `${golden.label} rejects a shifted start`);
    assert.equal(exactReplay(golden.label, `${axis.skip}_${-axis.dir}_${axis.start}`, golden.scope), false, `${golden.label} rejects a reversed direction`);
    assert.equal(exactReplay(golden.label, `${axis.skip + 1}_${axis.dir}_${axis.start}`, golden.scope), false, `${golden.label} rejects a changed skip`);

    for (const finding of golden.findings) {
      assert.ok(finding.hitIds.length > 0, `${golden.label}/${finding.term} keeps exact coordinates`);
      for (const hitId of finding.hitIds) {
        const hit = parseHitId(hitId);
        assert.equal(exactReplay(finding.term, hitId, golden.scope), true, `${golden.label}/${finding.term}/${hitId} replays in scope`);
        assert.equal(hit.skip === 1, finding.kind === "source-sequence", "skip=1 remains literal source evidence, never ELS");
      }
    }
  }

  assert.equal(HIRSCH_NEGATIVE_CONTROL.storedLegacy.verified, false);
  assert.equal(HIRSCH_NEGATIVE_CONTROL.findings.length, 0);
  assert.equal(exactReplay(HIRSCH_NEGATIVE_CONTROL.label, HIRSCH_NEGATIVE_CONTROL.axis.hitId, HIRSCH_NEGATIVE_CONTROL.scope), true, "the negative control may have an axis");
  assert.equal(HIRSCH_GOLDEN_CANDIDATES.some((golden) => golden.recordId === HIRSCH_NEGATIVE_CONTROL.recordId), false, "an unverified axis without findings is never promoted to a positive Golden");
});
