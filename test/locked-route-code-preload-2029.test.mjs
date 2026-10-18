import test from "node:test";
import assert from "node:assert/strict";
import {
  loadNumber2029RouteCode,
  loadWorld2029RouteCode,
  lockedRouteCodeLoaderForPath2029,
} from "../src/lib/lockedRouteCode2029.js";

test("only an explicitly requested World or Number route receives a code loader", () => {
  assert.equal(lockedRouteCodeLoaderForPath2029("/world"), loadWorld2029RouteCode);
  assert.equal(lockedRouteCodeLoaderForPath2029("/world/"), loadWorld2029RouteCode);
  assert.equal(lockedRouteCodeLoaderForPath2029("/number/718"), loadNumber2029RouteCode);
  assert.equal(lockedRouteCodeLoaderForPath2029("/number/718/"), loadNumber2029RouteCode);

  for (const path of ["/", "/post/synthetic-control", "/posts", "/topic/world", "/number", "/number/718/more"])
    assert.equal(lockedRouteCodeLoaderForPath2029(path), null, path);
});
