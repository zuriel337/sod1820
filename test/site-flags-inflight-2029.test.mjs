import test from "node:test";
import assert from "node:assert/strict";
import { createSiteFlagsReader2029 } from "../src/lib/siteFlagsReadScope2029.js";

function clientFixture(handler) {
  return {
    from(table) {
      assert.equal(table, "site_flags");
      return {
        select(columns) {
          assert.equal(columns, "key,enabled,message,mode");
          return handler();
        },
      };
    },
  };
}

test("2029 simultaneous and staggered consumers share one navigation snapshot", async () => {
  let requests = 0;
  let release;
  let navigation = "home:a";
  const reader = createSiteFlagsReader2029({
    reuseResolved: true,
    getNavigationIdentity: () => navigation,
    client: clientFixture(() => {
      requests += 1;
      return new Promise((resolve) => { release = resolve; });
    }),
  });

  const shell = reader.read();
  const simultaneousLocks = Array.from({ length: 6 }, () => reader.read());
  assert.equal(requests, 1, "simultaneous shell and lock hooks share the in-flight read");
  release({ data: [{ key: "lock_world", enabled: false, message: "", mode: "all" }], error: null });
  await Promise.all([shell, ...simultaneousLocks]);

  assert.equal((await reader.read()).lock_world.enabled, false);
  assert.equal(requests, 1, "a lazy route wave reuses the resolved snapshot in the same navigation");

  navigation = "world:b";
  const next = reader.read();
  assert.equal(requests, 2, "a new navigation always starts a fresh canonical read");
  release({ data: [{ key: "lock_world", enabled: true, message: "", mode: "all" }], error: null });
  assert.equal((await next).lock_world.enabled, true);
});

test("Legacy retains in-flight-only behavior", async () => {
  let requests = 0;
  const reader = createSiteFlagsReader2029({
    reuseResolved: false,
    getNavigationIdentity: () => "legacy",
    client: clientFixture(async () => {
      requests += 1;
      await Promise.resolve();
      return { data: [{ key: "lock_books", enabled: requests === 1, mode: "all" }], error: null };
    }),
  });

  const first = await Promise.all([reader.read(), reader.read(), reader.read()]);
  assert.equal(requests, 1);
  for (const value of first) assert.equal(value.lock_books.enabled, true);
  assert.equal((await reader.read()).lock_books.enabled, false);
  assert.equal(requests, 2, "resolved values are not retained for Legacy");
});

test("auth invalidation prevents cross-user snapshot reuse", async () => {
  let requests = 0;
  const reader = createSiteFlagsReader2029({
    reuseResolved: true,
    getNavigationIdentity: () => "same-route",
    client: clientFixture(async () => {
      requests += 1;
      return { data: [{ key: "lock_heichal", enabled: requests === 1, mode: "all" }], error: null };
    }),
  });

  assert.equal((await reader.read()).lock_heichal.enabled, true);
  reader.invalidate();
  assert.equal((await reader.read()).lock_heichal.enabled, false);
  assert.equal(requests, 2, "a viewer transition cannot inherit the previous viewer's snapshot");
});

test("failed reads are shared but never retained, so retry is fresh", async () => {
  let requests = 0;
  const reader = createSiteFlagsReader2029({
    reuseResolved: true,
    getNavigationIdentity: () => "world:a",
    client: clientFixture(async () => {
      requests += 1;
      await Promise.resolve();
      if (requests === 1) return { data: null, error: new Error("temporary network error") };
      return { data: [{ key: "lock_world", enabled: false, mode: "all" }], error: null };
    }),
  });

  const failed = await Promise.all([reader.read(), reader.read(), reader.read()]);
  assert.equal(requests, 1);
  for (const value of failed) assert.deepEqual(value, {});
  assert.equal((await reader.read()).lock_world.enabled, false);
  assert.equal(requests, 2);
});

test("a late old-navigation response cannot poison the current scope", async () => {
  let navigation = "home:a";
  const releases = [];
  let requests = 0;
  const reader = createSiteFlagsReader2029({
    reuseResolved: true,
    getNavigationIdentity: () => navigation,
    client: clientFixture(() => {
      requests += 1;
      return new Promise((resolve) => releases.push(resolve));
    }),
  });

  const oldRead = reader.read();
  navigation = "world:b";
  const currentRead = reader.read();
  releases[1]({ data: [{ key: "lock_world", enabled: false, mode: "all" }], error: null });
  assert.equal((await currentRead).lock_world.enabled, false);
  releases[0]({ data: [{ key: "lock_world", enabled: true, mode: "all" }], error: null });
  assert.equal((await oldRead).lock_world.enabled, true);
  assert.equal((await reader.read()).lock_world.enabled, false);
  assert.equal(requests, 2, "the old response did not replace the current navigation cache");
});

test("no database client keeps the existing empty projection", async () => {
  const reader = createSiteFlagsReader2029({ client: null, reuseResolved: true });
  assert.deepEqual(await reader.read(), {});
});
