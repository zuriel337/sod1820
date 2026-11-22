// Owner decision 2026-11-06: /sulamot* (old 3D / experiment generation) is legacy/obsolete - it is only kept as a harmless notice, never as a feature.
import test from "node:test";
import assert from "node:assert/strict";
import { KNOWN_SINGLE_SEGMENT_ROUTES } from "../route-legitimacy.js";
import { publicReadingCapability, publicReadingContinuation, publicReadingPath, publicTemporarilyClosed } from "../src/lib/publicReadingRelease2029.js";

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

test("the public archive owns its address and the old gallery-update alias", () => {
  assert.equal(sulamot.includes("/archive"), false);
  assert.equal(publicTemporarilyClosed("/archive"), false);
  assert.equal(publicReadingPath("/archive"), "public");
  assert.equal(publicReadingCapability("/archive"), null);
  assert.equal(publicReadingContinuation("/gallery-updates"), "/archive");
});

test("/heichal stays closed (no accidental opening)", () => {
  assert.equal(publicTemporarilyClosed("/heichal"), true);
});


test("historical notices offer direct reading from the corresponding public sources", () => {
  const expected = {
    "/timeline": ["/post", "/topic/india-axis"],
    "/broadcasts": ["/or-geula"],
  };
  for (const [path, destinations] of Object.entries(expected)) {
    assert.equal(publicTemporarilyClosed(path), true);
    assert.deepEqual(publicReadingCapability(path).links.map(([href]) => href), destinations);
  }
});
