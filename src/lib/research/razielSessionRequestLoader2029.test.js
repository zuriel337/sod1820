import test from "node:test";
import assert from "node:assert/strict";
import { createRazielRequestBuilderLoader } from "./razielSessionRequestLoader2029.js";

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((resolvePromise, rejectPromise) => {
    resolve = resolvePromise;
    reject = rejectPromise;
  });
  return { promise, resolve, reject };
}

test("factory is zero-cost and concurrent loads share one cached import", async () => {
  const chunk = deferred();
  const builder = () => ({ ok: true });
  let imports = 0;
  const load = createRazielRequestBuilderLoader(() => {
    imports += 1;
    return chunk.promise;
  });

  assert.equal(imports, 0, "creating the eager seam must not request the lazy chunk");
  const first = load();
  const second = load();
  assert.strictEqual(first, second, "concurrent callers share the same in-flight promise");
  await Promise.resolve();
  assert.equal(imports, 1);

  chunk.resolve({ buildRazielSessionRequest: builder });
  assert.strictEqual(await first, builder);
  assert.strictEqual(await second, builder);
  assert.strictEqual(await load(), builder, "a successful builder remains cached for later turns");
  assert.equal(imports, 1);
});

test("a rejected import clears the cache and a later turn can retry", async () => {
  const builder = () => ({ ok: true });
  let imports = 0;
  const load = createRazielRequestBuilderLoader(() => {
    imports += 1;
    return imports === 1
      ? Promise.reject(new Error("chunk unavailable"))
      : Promise.resolve({ buildRazielSessionRequest: builder });
  });

  await assert.rejects(load(), /chunk unavailable/);
  assert.strictEqual(await load(), builder);
  assert.equal(imports, 2);
});
test("a malformed module fails closed and does not poison a later valid import", async () => {
  const builder = () => ({ ok: true });
  let imports = 0;
  const load = createRazielRequestBuilderLoader(() => {
    imports += 1;
    return Promise.resolve(imports === 1
      ? { default: builder }
      : { buildRazielSessionRequest: builder });
  });

  await assert.rejects(load(), /buildRazielSessionRequest export is required/);
  assert.strictEqual(await load(), builder);
  assert.equal(imports, 2);
});
