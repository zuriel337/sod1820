import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { isRazielNextAction } from "./razielActionContract.js";

const heichal = readFileSync(
  new URL("../../pages/Heichal2029Page.jsx", import.meta.url),
  "utf8",
);
const frame = readFileSync(
  new URL("../../components/experience2029/SystemFrame2029.jsx", import.meta.url),
  "utf8",
);

test("Heichal consumes the server-gated research-run Result Bundle exactly once", () => {
  assert.match(heichal, /const openRazielFromServerGatedResult = async \(\) =>/);
  assert.equal((heichal.match(/supabase\.functions\.invoke\("research-run"/g) || []).length, 1);
  assert.match(heichal, /getVisitorId\(\)/);
  assert.match(heichal, /visitor_id:\s*visitorId/);
  assert.match(heichal, /requested_capabilities:\s*\["numeric", "numeric_operators"\]/);
  assert.match(heichal, /surface:\s*"heichal"/);
  assert.match(heichal, /run\?\.status !== "ok"/);
  assert.match(heichal, /!run\?\.bundle/);

  // The UI may consume only the canonical action that survived the server-side Result Bundle.
  assert.match(heichal, /\.find\(\(item\) => isRazielNextAction\(item\)\)/);
  assert.match(heichal, /shell\.openRaziel\(razielRouteAction \? \{ razielRouteAction \} : null\)/);

  // No direct browser composer/executor/provider fallback is allowed after the server seam exists.
  assert.doesNotMatch(heichal, /composeResearchW2|createCanonicalW2Executors|createCanonicalNumberW2Executors/);
  assert.doesNotMatch(heichal, /askRazielAdvanced|ai-analyze|synthesizer\s*:/);
});

test("invalid action or server failure fails closed to generic Raziel with context preserved", () => {
  assert.match(heichal, /if \(!Number\.isSafeInteger\(numericValue\) \|\| numericValue < 0\) \{[\s\S]*?shell\.openRaziel\(\);/);
  assert.match(heichal, /if \(error \|\| run\?\.status !== "ok" \|\| !run\?\.bundle\)/);
  assert.match(heichal, /catch \{[\s\S]*?shell\.openRaziel\(\);/);
  assert.doesNotMatch(heichal, /local_message|localMessage|navigate\(/);
});

test("existing SystemFrame receives, validates, and presents the action without execution", () => {
  assert.match(frame, /payload\?\.razielRouteAction/);
  assert.match(frame, /razielRouteAction=\{transient\?\.payload\?\.razielRouteAction \|\| null\}/);
  assert.match(frame, /routeActionValid = isRazielNextAction\(razielRouteAction\)/);
  assert.match(frame, /routeActionValid \? <button/);
  assert.match(frame, /type="button"\s*\n\s*disabled\s*\n\s*data-raziel-route-action/);

  const valid = {
    action: "raziel_route",
    contract_version: 1,
    route_action: "research",
    label: "לחקור",
    task_mode: "research",
    preferred_home: "heichal",
    synthesis: { state: "not_composed", message_authority: null, local_message: null },
    guards: {
      semantic_action_only: true,
      no_navigation_execution: true,
      no_tool_execution: true,
      no_local_message_generation: true,
    },
  };
  assert.equal(isRazielNextAction(valid), true);
  assert.equal(isRazielNextAction({ ...valid, route_action: "invented" }), false);
  assert.equal(isRazielNextAction({
    ...valid,
    synthesis: { ...valid.synthesis, local_message: "forbidden" },
  }), false);
});
