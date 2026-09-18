#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");

const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const els = read("src/pages/Els2029Page.jsx");
const og = read("api/og.js");

assert.match(frame, /import ShareActions from "\.\.\/ShareActions\.jsx"/);
assert.doesNotMatch(frame, /shareOrCopy/);
assert.match(frame, /<ShareActions[\s\S]*channels=\{\["native", "copy"\]\}[\s\S]*force/);

assert.match(els, /useFeatureState\("lock_els"\)/);
assert.match(els, /FeatureClosedNotice/);
assert.match(els, /if \(elsState\.blocked\)/);

for (const route of ["/2029", "/world", "/books", "/els", "/heichal", "/היכל"]) {
  assert.ok(og.includes(`'${route}':`), `api/og STATIC must include ${route}`);
}
assert.match(og, /key\.startsWith\('\/book\/'\) \|\| key\.startsWith\('\/books\/'\)/);
assert.match(og, /bookPrefix = key\.startsWith\('\/books\/'\)/);

console.log("2029 canonical contract wiring regression passed");
