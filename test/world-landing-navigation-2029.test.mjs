import assert from "node:assert/strict";
import test from "node:test";

import {
  WORLD_LANDING_VIEW,
  resolveWorldLandingView,
  worldLandingViewLocation,
} from "../src/lib/research/worldLandingNavigation.js";

test("World opens with a calm beginner view and resolves existing deep links", () => {
  assert.equal(resolveWorldLandingView(), WORLD_LANDING_VIEW.START);
  assert.equal(resolveWorldLandingView({ hash: "#world-sources" }), WORLD_LANDING_VIEW.LIVE);
  assert.equal(resolveWorldLandingView({ hash: "#world-all-convergences" }), WORLD_LANDING_VIEW.CONNECTIONS);
  assert.equal(resolveWorldLandingView({ hash: "#world-source-homes" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ hash: "#world-journey-entry" }), WORLD_LANDING_VIEW.JOURNEY);
  assert.equal(resolveWorldLandingView({ hash: "#world-all-research" }), WORLD_LANDING_VIEW.ADMIN);
});

test("source and finding deep links open only their relevant World projection", () => {
  assert.equal(resolveWorldLandingView({ search: "?source=tzvi-opoc" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ search: "?subjectSource=hashmal" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ search: "?admin=1&finding=f-1" }), WORLD_LANDING_VIEW.ADMIN);
});

test("World view URLs preserve unrelated context and remove the default view", () => {
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.CONNECTIONS, "?admin=1"), "/world?admin=1&view=connections");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.START, "?admin=1&view=live"), "/world?admin=1");
  assert.equal(worldLandingViewLocation("not-a-view", "?view=live"), "/world");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.LIVE, "?subjectSource=zvi&finding=f-1"), "/world?view=live");
});
