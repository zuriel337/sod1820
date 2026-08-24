import assert from "node:assert/strict";
import {
  parseElsHitKey,
  firstFindingAnchor,
  makeJourneySnapshot,
  buildJourneyPromotion,
  buildJourneyRestore,
  journeyAnchorMatches,
} from "../src/lib/elsJourney.js";

const state = {
  status: "ok",
  term: "משה",
  termRaw: "משה",
  scope: "torah",
  length: 3,
  axis: { hitId: "37_1_1200", skip: 37, direction: "fwd", start: 1200, length: 3 },
  occurrence: { index: 2, count: 18, capped: false },
  findings: [
    { t: "אור", color: "#123456", shown: ["-11_-1_1333", "29_1_1600"] },
    { t: "מים", color: "#abcdef", shown: ["7_1_1444"] },
  ],
};

assert.deepEqual(parseElsHitKey("-11_-1_1333"), {
  hitId: "-11_-1_1333",
  signedSkip: -11,
  skip: 11,
  dir: -1,
  direction: "back",
  start: 1333,
});
assert.equal(parseElsHitKey("bad"), null);
assert.equal(firstFindingAnchor(state.findings[0]).hitId, "-11_-1_1333");

const snap = makeJourneySnapshot(state, {
  mode: "investigate",
  viewMode: "3d",
  matrixRtl: true,
  cellSize: 30,
});
assert.equal(snap.axis.hitId, "37_1_1200");
assert.equal(snap.findings[0].shown[0], "-11_-1_1333");
assert.equal(snap.scope, "torah");

const promotion = buildJourneyPromotion(state, state.findings[0]);
assert.equal(promotion.ok, true);
assert.deepEqual(promotion.loadItem, {
  journey: true,
  term: "אור",
  skip: 11,
  start: 1333,
  dir: -1,
  hitId: "-11_-1_1333",
  words: [
    { t: "משה", color: "#e8c84a", sh: ["37_1_1200"] },
    { t: "מים", color: "#abcdef", sh: ["7_1_1444"] },
  ],
  scope: "torah",
});

const restore = buildJourneyRestore(snap);
assert.equal(restore.ok, true);
assert.deepEqual(restore.loadItem, {
  journey: true,
  term: "משה",
  skip: 37,
  start: 1200,
  dir: 1,
  hitId: "37_1_1200",
  words: [
    { t: "אור", color: "#123456", sh: ["-11_-1_1333", "29_1_1600"] },
    { t: "מים", color: "#abcdef", sh: ["7_1_1444"] },
  ],
  scope: "torah",
});

assert.equal(
  journeyAnchorMatches({ status: "ok", axis: { hitId: "-11_-1_1333" } }, promotion.target),
  true,
);
assert.equal(
  journeyAnchorMatches({ status: "ok", axis: { hitId: "-11_-1_9999" } }, promotion.target),
  false,
);

console.log("ELS Journey contract: 13 checks passed");
