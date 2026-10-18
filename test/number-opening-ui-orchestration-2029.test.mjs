import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";

import {
  createLatestNumberRequestGate,
  createNumberOpeningOrchestrator,
  numberProjectionAccessContext,
  summarizeNumberOpening,
} from "../src/lib/research/numberOpeningOrchestration2029.js";

const ACCESS_A = "viewer:a";
const identity = (value) => ({
  value,
  identity: {
    nodeId: `node-${value}`,
    type: "number",
    key: String(value),
    label: String(value),
    hubHref: `/entity-hub-preview/number/${value}`,
  },
});

function deferred() {
  let resolve;
  let reject;
  const promise = new Promise((yes, no) => { resolve = yes; reject = no; });
  return { promise, resolve, reject };
}

function family(method, phrases, { total = phrases.length, sortOrder = 1 } = {}) {
  return {
    method,
    count: total,
    phrases: phrases.map((phrase, index) => ({ phrase, bidId: `${method}-${index}` })),
    registry: { method_key: method, display_label: method, sort_order: sortOrder },
    openingSample: {
      returnedCount: phrases.length,
      totalCount: total,
      complete: phrases.length === total,
      hasMore: phrases.length < total,
    },
  };
}

function projected(value, families, { sourceRowCount = 50 } = {}) {
  return {
    identity: identity(value).identity,
    gematria: {
      families,
      completeness: { samples: families.every((row) => row.openingSample.complete) },
    },
    numberOpening: {
      value,
      familyCount: families.length,
      openingPhraseCount: families.reduce((sum, row) => sum + row.phrases.length, 0),
      sourceRowCount,
      distinctMethodPhraseCount: families.reduce((sum, row) => sum + row.count, 0),
      completeness: { samples: families.every((row) => row.openingSample.complete) },
      depth: { complete: sourceRowCount === 0, hasMore: sourceRowCount > 0, deferred: sourceRowCount > 0 },
    },
  };
}

test("root admission rejects coercible non-route values and preserves literal zero", async () => {
  const seen = [];
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => { seen.push(root); return null; },
  });

  for (const value of [
    null, undefined, "", " ", "\t", false, true, [], {}, "00", "+0", "01", " 0 ", "1e3",
    -1, 1.5, Number.NaN, Number.POSITIVE_INFINITY,
  ]) {
    assert.throws(
      () => orchestrator.loadOpening(value, { accessContext: ACCESS_A }),
      (error) => error?.code === "NUMBER_OPENING_ROOT_INVALID",
      `must reject ${JSON.stringify(value)}`,
    );
  }
  assert.deepEqual(seen, [], "invalid inputs fail before identity, compact or anchor reads");

  const zero = await orchestrator.loadOpening(0, { accessContext: ACCESS_A });
  assert.equal(zero.status, "empty");
  assert.deepEqual(seen, [0], "literal numeric zero reaches only the identity gate");

  const canonicalString = await orchestrator.loadOpening("0", { accessContext: "viewer:string-zero" });
  assert.equal(canonicalString.status, "empty");
  assert.deepEqual(seen, [0, 0]);
});

test("identity settles before the compact module, then compact and anchor start together", async () => {
  const identityGate = deferred();
  const compactGate = deferred();
  const anchorGate = deferred();
  const events = [];
  const families = [family("רגיל", ["א"]), family("אתבש", ["ב"], { sortOrder: 2 })];
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => {
      events.push(`identity:start:${root}`);
      const result = await identityGate.promise;
      events.push("identity:end");
      return result;
    },
    loadOpeningModule: async () => {
      events.push("module");
      return {
        fetchNumberOpeningProjection: async (root) => {
          events.push(`compact:start:${root}`);
          const result = await compactGate.promise;
          events.push("compact:end");
          return result;
        },
        projectNumberOpeningCore: (opening, options) => {
          events.push("project");
          return { ...projected(opening.value, families), anchorProfile: options.anchorProfile };
        },
      };
    },
    fetchAnchor: async (root) => {
      events.push(`anchor:start:${root}`);
      const result = await anchorGate.promise;
      events.push("anchor:end");
      return result;
    },
  });

  const pending = orchestrator.loadOpening(718, { accessContext: ACCESS_A });
  await Promise.resolve();
  assert.deepEqual(events, ["identity:start:718"]);

  identityGate.resolve(identity(718));
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(events, [
    "identity:start:718",
    "identity:end",
    "module",
    "compact:start:718",
    "anchor:start:718",
  ]);

  compactGate.resolve({ value: 718 });
  await Promise.resolve();
  assert.equal(events.includes("project"), false, "projection waits for both concurrent reads");
  anchorGate.resolve({ row: { value: 718 } });
  const result = await pending;
  assert.equal(result.status, "ready");
  assert.equal(result.data.identity.label, "718");
  assert.deepEqual(events.slice(-3), ["compact:end", "anchor:end", "project"]);
});

test("missing identity stops before the compact module, anchor and full projection", async () => {
  const calls = [];
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async () => { calls.push("identity"); return null; },
    fetchAnchor: async () => { calls.push("anchor"); },
    loadOpeningModule: async () => { calls.push("compact-module"); return {}; },
    loadDepthModule: async () => { calls.push("full-module"); return {}; },
  });

  assert.deepEqual(await orchestrator.loadOpening(0, { accessContext: ACCESS_A }), {
    status: "empty",
    root: 0,
    data: null,
  });
  assert.deepEqual(calls, ["identity"]);
});

test("opening requests deduplicate across StrictMode rerenders and back-forward but partition access", async () => {
  let identities = 0;
  let compactReads = 0;
  let anchorReads = 0;
  const families = [family("רגיל", ["שלום"], { total: 2 })];
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => { identities += 1; return identity(root); },
    fetchAnchor: async (root) => { anchorReads += 1; return { row: { value: root } }; },
    loadOpeningModule: async () => ({
      fetchNumberOpeningProjection: async (root) => { compactReads += 1; return { value: root }; },
      projectNumberOpeningCore: (opening) => projected(opening.value, families),
    }),
  });

  const first = orchestrator.loadOpening(1820, { accessContext: ACCESS_A });
  const strictReplay = orchestrator.loadOpening(1820, { accessContext: ACCESS_A });
  assert.strictEqual(first, strictReplay, "in-flight StrictMode effects share one request");
  const firstResult = await first;
  assert.strictEqual(await orchestrator.loadOpening(1820, { accessContext: ACCESS_A }), firstResult, "back-forward reuses the settled same-context promise");
  assert.deepEqual([identities, compactReads, anchorReads], [1, 1, 1]);

  await orchestrator.loadOpening(1820, { accessContext: "viewer:b" });
  assert.deepEqual([identities, compactReads, anchorReads], [2, 2, 2], "a different access context cannot reuse protected data");
});

test("compact module/RPC failure is retryable and never falls back to full projection", async () => {
  let attempts = 0;
  let fullLoads = 0;
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => identity(root),
    fetchAnchor: async () => ({ row: null }),
    loadOpeningModule: async () => ({
      fetchNumberOpeningProjection: async (root) => {
        attempts += 1;
        if (attempts === 1) throw Object.assign(new Error("compact unavailable"), { code: "NUMBER_OPENING_RPC_FAILED" });
        return { value: root };
      },
      projectNumberOpeningCore: (opening) => projected(opening.value, [family("רגיל", [" retry "])]),
    }),
    loadDepthModule: async () => { fullLoads += 1; return {}; },
  });

  await assert.rejects(orchestrator.loadOpening(376, { accessContext: ACCESS_A }), /compact unavailable/);
  assert.equal(fullLoads, 0);
  const retry = await orchestrator.loadOpening(376, { accessContext: ACCESS_A });
  assert.equal(retry.status, "ready");
  assert.equal(attempts, 2, "failed opening entries are evicted for bounded retry");
  assert.equal(fullLoads, 0, "opening retry still does not load full depth");
});

test("dynamic opening module failure is classified, evicted, and retryable without full fallback", async () => {
  let moduleAttempts = 0;
  let fullLoads = 0;
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => identity(root),
    fetchAnchor: async () => ({ row: null }),
    loadOpeningModule: async () => {
      moduleAttempts += 1;
      if (moduleAttempts === 1) throw new Error("synthetic chunk failure");
      return {
        fetchNumberOpeningProjection: async (root) => ({ value: root }),
        projectNumberOpeningCore: (opening) => projected(opening.value, [family("רגיל", ["module retry"])]),
      };
    },
    loadDepthModule: async () => { fullLoads += 1; return {}; },
  });

  await assert.rejects(
    orchestrator.loadOpening(718, { accessContext: ACCESS_A }),
    (error) => error?.code === "NUMBER_OPENING_MODULE_UNAVAILABLE" && /synthetic chunk failure/.test(error.cause?.message || ""),
  );
  assert.deepEqual([moduleAttempts, fullLoads], [1, 0]);
  assert.equal((await orchestrator.loadOpening(718, { accessContext: ACCESS_A })).status, "ready");
  assert.deepEqual([moduleAttempts, fullLoads], [2, 0]);
});

test("full depth stays idle until requested, shares one request, and retries without losing opening", async () => {
  const fullGate = deferred();
  let fullLoads = 0;
  let fullCalls = 0;
  let failNext = false;
  let capturedOptions = null;
  const opening = projected(718, [family("רגיל", ["פתיחה"], { total: 8 })]);
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => identity(root),
    fetchAnchor: async () => ({ row: null }),
    loadOpeningModule: async () => ({
      fetchNumberOpeningProjection: async (root) => ({ value: root }),
      projectNumberOpeningCore: () => opening,
    }),
    loadDepthModule: async () => {
      fullLoads += 1;
      return {
        fetchEntityHubProjection: async (options) => {
          fullCalls += 1;
          capturedOptions = options;
          if (failNext) {
            failNext = false;
            throw new Error("depth unavailable");
          }
          return fullGate.promise;
        },
      };
    },
  });

  const opened = await orchestrator.loadOpening(718, { accessContext: ACCESS_A });
  assert.strictEqual(opened.data, opening);
  assert.deepEqual([fullLoads, fullCalls], [0, 0], "opening does not start full/depth reads");

  const depthA = orchestrator.loadDepth(718, { accessContext: ACCESS_A });
  const depthB = orchestrator.loadDepth(718, { accessContext: ACCESS_A });
  assert.strictEqual(depthA, depthB, "one in-flight full projection is shared");
  await new Promise((resolve) => setImmediate(resolve));
  assert.deepEqual(capturedOptions, {
    type: "number",
    key: "718",
    relationLimit: 140,
    researchLimit: 80,
    topicLimit: 24,
    numberLookupLimit: 500,
  });
  assert.equal(Object.hasOwn(capturedOptions, "onNumberCore"), false, "depth starts from the canonical null cursor path");
  const full = { identity: identity(718).identity, gematria: { families: [family("רגיל", ["מלא"])] } };
  fullGate.resolve(full);
  assert.strictEqual(await depthA, full);
  assert.deepEqual([fullLoads, fullCalls], [1, 1]);

  failNext = true;
  await assert.rejects(orchestrator.loadDepth(1820, { accessContext: ACCESS_A }), /depth unavailable/);
  const openingStillUsable = await orchestrator.loadOpening(718, { accessContext: ACCESS_A });
  assert.strictEqual(openingStillUsable.data, opening, "a depth error cannot evict or collapse the usable opening");

  const retryFull = { identity: identity(1820).identity, retried: true };
  // A fresh module invocation follows an evicted failure. It can resolve independently.
  const retryPromise = orchestrator.loadDepth(1820, { accessContext: ACCESS_A });
  await new Promise((resolve) => setImmediate(resolve));
  fullGate.resolve(retryFull);
  // The original gate is already settled, so this fake returns the first full object; the assertion
  // that the reader ran again is the retry contract under test.
  await retryPromise;
  assert.deepEqual([fullLoads, fullCalls], [3, 3]);
});

test("latest-request gate rejects late root completion and completion after unmount", async () => {
  const gate = createLatestNumberRequestGate();
  const committed = [];
  const firstResult = deferred();
  const secondResult = deferred();
  const firstRoot = gate.begin();
  const firstCommit = firstResult.promise.then((value) => {
    if (gate.isCurrent(firstRoot)) committed.push(value);
  });
  const secondRoot = gate.begin();
  const secondCommit = secondResult.promise.then((value) => {
    if (gate.isCurrent(secondRoot)) committed.push(value);
  });
  assert.equal(gate.isCurrent(firstRoot), false);
  assert.equal(gate.isCurrent(secondRoot), true);
  firstResult.resolve("stale-root");
  await firstCommit;
  assert.deepEqual(committed, [], "a late result from the previous root cannot commit");
  secondResult.resolve("current-root");
  await secondCommit;
  assert.deepEqual(committed, ["current-root"]);

  const unmountedResult = deferred();
  const unmounted = gate.begin();
  const unmountedCommit = unmountedResult.promise.then((value) => {
    if (gate.isCurrent(unmounted)) committed.push(value);
  });
  gate.cancel(unmounted);
  unmountedResult.resolve("after-unmount");
  await unmountedCommit;
  assert.equal(gate.isCurrent(unmounted), false);
  assert.deepEqual(committed, ["current-root"], "completion after unmount cannot commit");
});

test("access cache key is stable within one context and changes across principals or roles", () => {
  const a = numberProjectionAccessContext({
    user: { id: "a", last_sign_in_at: "2026-10-18T10:00:00Z", app_metadata: { tier: "public" } },
    profile: { updated_at: "2026-10-18T09:00:00Z", role: "member" },
    isMember: true,
  });
  const same = numberProjectionAccessContext({
    isMember: true,
    profile: { role: "member", updated_at: "2026-10-18T09:00:00Z" },
    user: { app_metadata: { tier: "public" }, last_sign_in_at: "2026-10-18T10:00:00Z", id: "a" },
  });
  const b = numberProjectionAccessContext({ user: { id: "b" }, profile: { role: "member" }, isMember: true });
  const admin = numberProjectionAccessContext({ user: { id: "a" }, profile: { role: "admin" }, isAdmin: true });
  assert.equal(a, same);
  assert.notEqual(a, b);
  assert.notEqual(a, admin);
  assert.equal(numberProjectionAccessContext({ loading: true }), null);
});

test("representative roots preserve admission and selected method/order between opening and full truth", async () => {
  const methodsByRoot = new Map([
    [376, ["רגיל", "מסתתר", "אתבש"]],
    [718, ["רגיל", "קדמי", "מילוי"]],
    [1820, ["רגיל", "מילוי", "אתבש"]],
  ]);
  const fullCalls = [];
  const orchestrator = createNumberOpeningOrchestrator({
    fetchIdentity: async (root) => root === 0 ? null : identity(root),
    fetchAnchor: async (root) => ({ row: { value: root } }),
    loadOpeningModule: async () => ({
      fetchNumberOpeningProjection: async (root) => ({ value: root }),
      projectNumberOpeningCore: (opening) => projected(opening.value, methodsByRoot.get(opening.value).map((method, index) => (
        family(method, [`${method}-${opening.value}`], { total: index + 2, sortOrder: index + 1 })
      ))),
    }),
    loadDepthModule: async () => ({
      fetchEntityHubProjection: async ({ key }) => {
        const root = Number(key);
        fullCalls.push(root);
        return {
          identity: identity(root).identity,
          gematria: {
            families: methodsByRoot.get(root).map((method, index) => family(method, [`full-${method}`], { sortOrder: index + 1 })),
          },
        };
      },
    }),
  });

  const empty = await orchestrator.loadOpening(0, { accessContext: ACCESS_A });
  assert.equal(empty.status, "empty");
  assert.deepEqual(fullCalls, []);

  for (const root of [376, 718, 1820]) {
    const fullCountBeforeOpening = fullCalls.length;
    const openingResult = await orchestrator.loadOpening(root, { accessContext: ACCESS_A });
    const openingOrder = openingResult.data.gematria.families.map((row) => row.registry.method_key);
    assert.deepEqual(openingOrder, methodsByRoot.get(root));
    assert.equal(openingOrder[0], "רגיל", `${root} keeps the canonical selected first method`);
    assert.equal(fullCalls.length, fullCountBeforeOpening, "full truth remains deferred for every admitted opening");
    const full = await orchestrator.loadDepth(root, { accessContext: ACCESS_A });
    assert.deepEqual(full.gematria.families.map((row) => row.registry.method_key), openingOrder);
  }
  assert.deepEqual(fullCalls, [376, 718, 1820]);
});

test("compact summaries and page markers cannot claim a complete full projection", () => {
  const incomplete = projected(718, [
    family("רגיל", ["א", "ב"], { total: 10 }),
    family("אתבש", ["ג"], { total: 4, sortOrder: 2 }),
  ]);
  assert.deepEqual(summarizeNumberOpening(incomplete), {
    familyCount: 2,
    returnedCount: 3,
    totalCount: 14,
    samplesComplete: false,
    lookupDepthComplete: false,
    depthDeferred: true,
    fullProjectionComplete: false,
  });

  const page = fs.readFileSync(new URL("../src/pages/Number2029Page.jsx", import.meta.url), "utf8");
  const orchestration = fs.readFileSync(new URL("../src/lib/research/numberOpeningOrchestration2029.js", import.meta.url), "utf8");
  assert.doesNotMatch(page, /from\s+["'][^"']*entityHubProjection\.js["']/);
  assert.doesNotMatch(page, /\bfetchEntityHubProjection\b|\bresearchNumber\b/);
  assert.match(orchestration, /import\("\.\/numberOpeningProjection2029\.js"\)/);
  assert.match(orchestration, /import\("\.\/entityHubProjection\.js"\)/);
  assert.match(page, /data-number-opening-complete=\{openingSummary\?\.fullProjectionComplete/);
  assert.match(page, /const data = depthData \|\| openingData/);
  assert.match(page, /data-number-depth-action="load"/);
  assert.match(page, /data-number-depth-action="retry"/);
});
