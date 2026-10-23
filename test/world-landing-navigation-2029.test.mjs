import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";

import {
  WORLD_LANDING_VIEW,
  WORLD_KNOWLEDGE_KIND,
  resolveWorldFindingId,
  resolveWorldLandingView,
  resolveWorldKnowledgeKind,
  worldLandingViewLocation,
} from "../src/lib/research/worldLandingNavigation.js";

const worldPageSource = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");

test("World opens with a calm beginner view and resolves existing deep links", () => {
  assert.equal(resolveWorldLandingView(), WORLD_LANDING_VIEW.START);
  assert.equal(resolveWorldLandingView({ hash: "#world-sources" }), WORLD_LANDING_VIEW.LIVE);
  assert.equal(resolveWorldLandingView({ hash: "#world-all-convergences" }), WORLD_LANDING_VIEW.CONNECTIONS);
  assert.equal(resolveWorldLandingView({ hash: "#world-source-homes" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ hash: "#world-journey-entry" }), WORLD_LANDING_VIEW.JOURNEY);
  assert.equal(resolveWorldLandingView({ hash: "#world-all-research" }), WORLD_LANDING_VIEW.ADMIN);
});

test("World knowledge kinds are stable URL state with a beginner-safe default", () => {
  assert.equal(resolveWorldKnowledgeKind(""), WORLD_KNOWLEDGE_KIND.NUMBERS);
  assert.equal(resolveWorldKnowledgeKind("?kind=languages"), WORLD_KNOWLEDGE_KIND.LANGUAGES);
  assert.equal(resolveWorldKnowledgeKind("?kind=unknown"), WORLD_KNOWLEDGE_KIND.NUMBERS);
  assert.equal(
    worldLandingViewLocation(WORLD_LANDING_VIEW.EXPLORE, "?admin=1", { kind: WORLD_KNOWLEDGE_KIND.CIPHERS }),
    "/world?admin=1&kind=ciphers&view=explore",
  );
  assert.equal(
    worldLandingViewLocation(WORLD_LANDING_VIEW.SOURCES, "?view=explore&kind=media"),
    "/world?view=sources",
  );
});

test("source and finding deep links open only their relevant World projection", () => {
  assert.equal(resolveWorldLandingView({ search: "?source=tzvi-opoc" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ search: "?subjectSource=hashmal" }), WORLD_LANDING_VIEW.SOURCES);
  assert.equal(resolveWorldLandingView({ search: "?finding=f-1" }), WORLD_LANDING_VIEW.FINDING);
  assert.equal(resolveWorldLandingView({ search: "?admin=1&finding=f-1" }), WORLD_LANDING_VIEW.ADMIN);
  assert.equal(resolveWorldFindingId({ search: "?finding=abc%2F12" }), "abc/12");
  assert.equal(resolveWorldFindingId({ hash: "#finding-abc%2F12" }), "abc/12");
});

test("World view URLs preserve unrelated context and remove the default view", () => {
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.CONNECTIONS, "?admin=1"), "/world?admin=1&view=connections");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.START, "?admin=1&view=live"), "/world?admin=1");
  assert.equal(worldLandingViewLocation("not-a-view", "?view=live"), "/world");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.LIVE, "?subjectSource=zvi&finding=f-1"), "/world?view=live");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.FINDING, "?admin=1&finding=f-1&view=admin"), "/world?finding=f-1");
  assert.equal(worldLandingViewLocation(WORLD_LANDING_VIEW.ADMIN, "?finding=f-1"), "/world?finding=f-1&admin=1&view=admin");
});

test("public focused finding uses only the public World reader and keeps exact return", () => {
  const landing = worldPageSource.slice(
    worldPageSource.indexOf("function LiveWorldLanding"),
    worldPageSource.indexOf("function AnchoredWorld"),
  );
  assert.match(landing, /activeView !== WORLD_LANDING_VIEW\.FINDING/);
  assert.match(landing, /fetchWorldAllResearchProjection\(\)/);
  assert.match(landing, /findWorldPublicResearchFinding\(projection, focusedPublicFindingId\)/);
  assert.match(landing, /הממצא המבוקש אינו זמין לציבור/);
  assert.match(landing, /לא הוחלף בממצא אחר/);
  assert.match(worldPageSource, /canReturnToBeitMidrash[\s\S]*shell\.returnExact\(\)/);
  assert.doesNotMatch(landing, /fetchWorldFindingReviewPage|admin_convergence_candidates|research_candidates/);
  assert.match(landing, /activeView === WORLD_LANDING_VIEW\.ADMIN \? \(isAdmin/);
});
