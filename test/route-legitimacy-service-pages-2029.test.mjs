// Audit 2026-11-06: the home navigation links to /updates and the map links to /raziel. Both have a designed "closed service / under construction"
// page (publicReadingCapability), but the edge allow-list did not know them, so visitors got a bare 404 before the page could answer.
import test from "node:test";
import assert from "node:assert/strict";
import { KNOWN_SINGLE_SEGMENT_ROUTES } from "../route-legitimacy.js";
import { publicReadingPath, publicReadingCapability } from "../src/lib/publicReadingRelease2029.js";

test("every single-segment path that the public reading policy answers with a designed page is known to the edge allow-list", () => {
  for (const path of ["/updates", "/raziel"]) {
    const state = publicReadingPath(path, { search: "" });
    assert.notEqual(state, "missing", `${path} is a deliberate (closed) page, not an unknown path`);
    assert.ok(KNOWN_SINGLE_SEGMENT_ROUTES.has(path), `${path} must pass the edge allow-list so its designed page can answer`);
  }
  assert.ok(publicReadingCapability("/raziel"), "the Raziel under-construction notice exists");
});
