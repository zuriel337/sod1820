import test from "node:test";
import assert from "node:assert/strict";

test("runtime switches reuse one read per navigation and refresh on route/auth scope changes", async (t) => {
  const previousBuild = globalThis.__SOD_2029_BUILD__;
  const previousFetch = globalThis.fetch;
  const previousWindow = globalThis.window;
  t.after(() => {
    if (previousBuild === undefined) delete globalThis.__SOD_2029_BUILD__;
    else globalThis.__SOD_2029_BUILD__ = previousBuild;
    globalThis.fetch = previousFetch;
    if (previousWindow === undefined) delete globalThis.window;
    else globalThis.window = previousWindow;
  });

  globalThis.__SOD_2029_BUILD__ = true;
  let requests = 0;
  globalThis.fetch = async (input) => {
    const url = String(input?.url || input);
    assert.match(url, /\/rest\/v1\/site_flags\?/);
    requests += 1;
    return new Response(JSON.stringify([
      { key: "fx_now_feed", enabled: requests > 1, message: null, mode: "all" },
    ]), { status: 200, headers: { "content-type": "application/json" } });
  };

  const runtime = await import(`../src/lib/runtimeSwitches2029.js?navigation-scope=${Date.now()}`);
  const flags = await import("../src/lib/supabase.js");
  globalThis.window = {
    location: { pathname: "/", search: "", hash: "" },
    history: { state: { key: "home-entry" } },
  };

  const [shell, delayedRoute] = await Promise.all([
    runtime.readRuntimeSwitches(),
    runtime.readRuntimeSwitches(),
  ]);
  assert.equal(shell.fx_now_feed, false);
  assert.equal(delayedRoute.fx_now_feed, false);
  assert.equal(requests, 1);
  assert.equal((await runtime.readRuntimeSwitches()).fx_now_feed, false);
  assert.equal(requests, 1, "staggered consumers reuse the same navigation snapshot");

  globalThis.window.location.pathname = "/world";
  globalThis.window.history.state = { key: "world-entry" };
  assert.equal((await runtime.readRuntimeSwitches()).fx_now_feed, true);
  assert.equal(requests, 2, "navigation identity changes bypass the 30 second runtime cache");

  flags.invalidateSiteFlagsReadScope2029();
  await runtime.readRuntimeSwitches();
  assert.equal(requests, 3, "an auth/viewer invalidation starts a fresh read on the same route");
});
