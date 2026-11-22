// Owner decision 2026-11-06: /sulamot* (old 3D / experiment generation) is legacy/obsolete - it is only kept as a harmless notice, never as a feature.
import test from "node:test";
import assert from "node:assert/strict";
import { KNOWN_SINGLE_SEGMENT_ROUTES } from "../route-legitimacy.js";
import { publicReadingCapability, publicTemporarilyClosed } from "../src/lib/publicReadingRelease2029.js";

const sulamot = [...KNOWN_SINGLE_SEGMENT_ROUTES].filter((p) => /^\/sulamot/.test(p));

test("every /sulamot* path is answered by the experimental-preview notice, not by a feature", () => {
  assert.ok(sulamot.length >= 10, "the old generation is still listed (old links keep answering)");
  for (const path of sulamot) {
    const cap = publicReadingCapability(path);
    assert.ok(cap, `${path} has a served notice`);
    assert.match(cap.description, /ניסיונית/, `${path} says it is an experimental preview`);
    assert.equal(publicTemporarilyClosed(path), false, `${path} is not the temporary-closure (503) family: it is obsolete, not 'opening soon'`);
  }
});

test("/archive is never classified as legacy: it is the new archive, closed while it is completed", () => {
  assert.equal(sulamot.includes("/archive"), false);
  assert.equal(publicTemporarilyClosed("/archive"), true, "closed temporarily, not retired");
});

test("/heichal stays closed (no accidental opening)", () => {
  assert.equal(publicTemporarilyClosed("/heichal"), true);
});
