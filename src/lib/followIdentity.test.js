import test from "node:test";
import assert from "node:assert/strict";
import { canonicalFollowTopic, followTopicAliases, includesFollowSubject } from "./followIdentity.js";

test("number legacy and canonical keys resolve to one subject", () => {
  assert.equal(canonicalFollowTopic("num_358"), "number:358");
  assert.deepEqual(followTopicAliases("number:358"), ["number:358", "num_358"]);
  assert.equal(includesFollowSubject(["num_358"], "number:358"), true);
});

test("category namespace and quote representation aliases dedupe", () => {
  assert.equal(canonicalFollowTopic('category:רמזי "גאולה"'), "cat:רמזי ״גאולה״");
  assert.equal(includesFollowSubject(['category:רמזי "גאולה"'], "cat:רמזי ״גאולה״"), true);
});

test("cipher feed aliases resolve to codes:new", () => {
  assert.equal(canonicalFollowTopic("els"), "codes:new");
  assert.equal(includesFollowSubject(["els"], "codes:new"), true);
});

test("Or Geula aliases resolve to one channel subject", () => {
  for (const alias of ["orgeula:new", "or-geula", "channel:orgeula", "channel:or-geula"]) {
    assert.equal(canonicalFollowTopic(alias), "channel:or-geula");
  }
  assert.equal(includesFollowSubject(["orgeula:new"], "channel:or-geula"), true);
});

test("author tokens are not derived from URL or display transformations", () => {
  assert.equal(canonicalFollowTopic("author:אלון לוי"), "author:אלון לוי");
  assert.deepEqual(followTopicAliases("author:אלון לוי"), ["author:אלון לוי"]);
});
