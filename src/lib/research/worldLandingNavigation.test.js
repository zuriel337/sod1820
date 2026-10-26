import test from "node:test";
import assert from "node:assert/strict";

import {
  WORLD_KNOWLEDGE_KIND,
  resolveWorldFindingId,
  resolveWorldLandingView,
  resolveWorldKnowledgeKind,
  worldLandingViewLocation,
  WORLD_LANDING_VIEW,
} from "./worldLandingNavigation.js";

test("World knowledge navigation accepts the spatial lens", () => {
  assert.equal(resolveWorldKnowledgeKind("?view=explore&kind=spatial"), WORLD_KNOWLEDGE_KIND.SPATIAL);
  assert.equal(
    worldLandingViewLocation(WORLD_LANDING_VIEW.EXPLORE, "", { kind: WORLD_KNOWLEDGE_KIND.SPATIAL }),
    "/world?kind=spatial&view=explore",
  );
});

test("unknown knowledge kinds still fall back to numbers", () => {
  assert.equal(resolveWorldKnowledgeKind("?kind=not-real"), WORLD_KNOWLEDGE_KIND.NUMBERS);
});

test("exact source focus is retained only inside the source view", () => {
  const current = "?view=sources&source=tzvi-opoc&sourceRef=channel_updates%3Aabc";
  assert.match(worldLandingViewLocation(WORLD_LANDING_VIEW.SOURCES, current), /sourceRef=channel_updates%3Aabc/);
  assert.doesNotMatch(worldLandingViewLocation(WORLD_LANDING_VIEW.EXPLORE, current), /sourceRef=/);
});

test("public and admin finding links remain separate navigation states", () => {
  assert.equal(resolveWorldFindingId({ search: "?finding=abc%2F12" }), "abc/12");
  assert.equal(resolveWorldLandingView({ search: "?finding=f-1" }), WORLD_LANDING_VIEW.FINDING);
  assert.equal(resolveWorldLandingView({ search: "?admin=1&finding=f-1" }), WORLD_LANDING_VIEW.ADMIN);
  assert.equal(
    worldLandingViewLocation(WORLD_LANDING_VIEW.FINDING, "?admin=1&finding=f-1&view=admin"),
    "/world?finding=f-1",
  );
  assert.equal(
    worldLandingViewLocation(WORLD_LANDING_VIEW.ADMIN, "?finding=f-1"),
    "/world?finding=f-1&admin=1&view=admin",
  );
});
