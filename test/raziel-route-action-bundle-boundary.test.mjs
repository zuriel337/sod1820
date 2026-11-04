import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { RAZIEL_ROUTE_ACTION } from "../src/lib/research/razielRouteAction.js";
import { RAZIEL_ROUTE_ACTION as GRAMMAR_ROUTE_ACTION } from "../src/lib/research/razielRouteGrammar.js";

const actionContractSource = readFileSync(
  new URL("../src/lib/research/razielActionContract.js", import.meta.url),
  "utf8",
);
const grammarSource = readFileSync(
  new URL("../src/lib/research/razielRouteGrammar.js", import.meta.url),
  "utf8",
);

test("route-action identifiers stay dependency-free and preserve the grammar API", () => {
  assert.equal(GRAMMAR_ROUTE_ACTION, RAZIEL_ROUTE_ACTION);
  assert.equal(Object.isFrozen(RAZIEL_ROUTE_ACTION), true);
  assert.deepEqual(RAZIEL_ROUTE_ACTION, {
    UNDERSTAND: "understand",
    RESEARCH: "research",
    CONNECT: "connect",
    CONTINUE: "continue",
  });

  assert.match(actionContractSource, /from "\.\/razielRouteAction\.js"/);
  assert.doesNotMatch(actionContractSource, /razielRouteGrammar|razielSemanticIntentGate/);
  assert.match(grammarSource, /import \{ RAZIEL_ROUTE_ACTION \} from "\.\/razielRouteAction\.js"/);
  assert.match(grammarSource, /export \{ RAZIEL_ROUTE_ACTION \}/);
});
