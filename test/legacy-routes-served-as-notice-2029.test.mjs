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

test("ordinary research and Heichal visits reach the public findings reader while workspace requests keep their gate", () => {
  for (const path of ["/research", "/heichal", encodeURI("/היכל")]) {
    assert.equal(publicReadingContinuation(path), "/findings");
    assert.equal(publicReadingContinuation(path, "?utm_source=share", "#item"), "/findings?utm_source=share#item");
    assert.equal(publicTemporarilyClosed(path), false);
    assert.equal(publicReadingCapability(path), null);
    assert.equal(publicReadingContinuation(path, "?mode=research"), null);
    assert.equal(publicTemporarilyClosed(path, "?mode=research"), true);
  }
  for (const [path, state] of [["/research-viewer", "closed"], ["/2029/control", "closed"], ["/journey", "closed"], ["/2029/me/notes", "account"]]) {
    assert.equal(publicReadingContinuation(path), null);
    assert.equal(publicReadingPath(path), state);
  }
  assert.equal(publicReadingContinuation("/heichal", "?demo=1"), null);
  assert.equal(publicReadingContinuation("/research", "?tool=gematria"), "/gematria?tool=gematria");
  assert.match(publicReadingContinuation("/research", "?finding=uf1:els:1"), /^\/code\?/);
});


test("timeline and broadcasts admit public reading at their historical addresses", () => {
  for (const [path, search] of [["/timeline", ""], ["/broadcasts", ""], ["/broadcasts", "?tab=channels&c=or-geula"]]) {
    assert.equal(publicReadingPath(path, { search }), "public");
    assert.equal(publicTemporarilyClosed(path, search), false);
    assert.equal(publicReadingCapability(path, search), null);
  }
});
