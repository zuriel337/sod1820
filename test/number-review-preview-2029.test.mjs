import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  isNumberReviewPreviewBuild2029,
  projectNumberReviewFlag2029,
  readNumberReviewFlagUncached2029,
} from "../src/lib/numberReviewPreview2029.js";
import { createSiteFlagsReader2029 } from "../src/lib/siteFlagsReadScope2029.js";

const source = (path) => readFileSync(new URL(`../${path}`, import.meta.url), "utf8");

test("Number review opening is compiled only for the exact 2029 Preview branch", () => {
  const exact = {
    SOD_BUILD_TARGET: "2029",
    VERCEL_ENV: "preview",
    VERCEL_GIT_COMMIT_REF: NUMBER_REVIEW_PREVIEW_BRANCH_2029,
  };
  assert.equal(isNumberReviewPreviewBuild2029(exact), true);
  for (const changed of [
    { ...exact, SOD_BUILD_TARGET: "legacy" },
    { ...exact, VERCEL_ENV: "production" },
    { ...exact, VERCEL_GIT_COMMIT_REF: "main" },
    { ...exact, VERCEL_GIT_COMMIT_REF: "gpt/another-preview" },
    {},
  ]) assert.equal(isNumberReviewPreviewBuild2029(changed), false);

  const config = source("vite.config.js");
  assert.match(config, /__SOD_NUMBER_REVIEW_PREVIEW_OPEN__:\s*JSON\.stringify\(numberReviewPreviewOpen\)/);
});

test("the Preview projection opens only an existing Number launch flag and never mutates it", () => {
  const number = { key: "lock_number", enabled: true, mode: "all", message: "closed" };
  const world = { key: "lock_world", enabled: true, mode: "all" };
  const projected = projectNumberReviewFlag2029("lock_number", number, true);
  assert.deepEqual(projected, { ...number, enabled: false });
  assert.equal(number.enabled, true);
  assert.equal(projectNumberReviewFlag2029("lock_world", world, true), world);
  assert.equal(projectNumberReviewFlag2029("lock_number", number, false), number);
  assert.equal(projectNumberReviewFlag2029("lock_number", null, true), null);
});

test("the Preview retry reads only lock_number without touching a shared flag snapshot", async () => {
  const calls = [];
  let sharedInvalidations = 0;
  let sharedReads = 0;
  const shared = createSiteFlagsReader2029({
    reuseResolved: true,
    getNavigationIdentity: () => "number:a",
    client: {
      from: () => ({ select: async () => {
        sharedReads += 1;
        return { data: [{ key: "fx_now_feed", enabled: false, mode: "all" }], error: null };
      } }),
    },
  });
  shared.subscribeInvalidation(() => { sharedInvalidations += 1; });
  await shared.read();
  const row = { key: "lock_number", enabled: true, message: "closed", mode: "all" };
  const client = {
    from(table) {
      calls.push(["from", table]);
      return {
        select(columns) {
          calls.push(["select", columns]);
          return {
            eq(column, value) {
              calls.push(["eq", column, value]);
              return {
                async limit(valueLimit) {
                  calls.push(["limit", valueLimit]);
                  return { data: [row], error: null };
                },
              };
            },
          };
        },
      };
    },
  };
  const result = await readNumberReviewFlagUncached2029(client);
  assert.equal(result, row);
  assert.deepEqual(calls, [
    ["from", "site_flags"],
    ["select", "key,enabled,message,mode"],
    ["eq", "key", "lock_number"],
    ["limit", 1],
  ]);
  assert.equal((await shared.read()).fx_now_feed.enabled, false);
  assert.equal(sharedReads, 1, "the shared switch snapshot was retained");
  assert.equal(sharedInvalidations, 0, "the targeted reader emitted no shared-snapshot callback");
});

test("initial Home fallback is quiet while route transitions retain the loading status", () => {
  const app = source("src/App2029.jsx");
  assert.match(app, /initial2029Pathname === "\/" && pathname === "\/"/);
  assert.match(app, /role=\{quiet \? undefined : "status"\}/);
  assert.match(app, /\{quiet \? null : <span>טוען את התוכן…<\/span>\}/);
  assert.match(app, /<Suspense fallback=\{<RouteLoading2029 \/>\}>/);
  assert.match(app, /return <Loading2029 \/>;/,
    "non-route document handoffs must retain the visible loading state");
});
