import test from "node:test";
import assert from "node:assert/strict";

import {
  WORLD_KNOWLEDGE_KIND,
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
