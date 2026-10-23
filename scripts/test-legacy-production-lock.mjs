import assert from "node:assert/strict";
import fs from "node:fs";

const read = (path) => fs.readFileSync(path, "utf8");
const config = JSON.parse(read("vercel.json"));
const launch = read("src/lib/publicLaunch2029.js");
const app = read("src/App.jsx");

const redirects = config.redirects || [];
const rewrites = config.rewrites || [];
const canonicalEntries = new Set(["/", "/post", "/community/chat", "/code"]);

assert.match(
  launch,
  /export const CORE_PUBLIC_LAUNCH_2029 = false;/,
  "Legacy Production lock requires CORE_PUBLIC_LAUNCH_2029=false",
);

for (const rule of redirects) {
  assert.equal(
    canonicalEntries.has(rule.source) && /^\/2029(?:\/|$)/.test(String(rule.destination || "")),
    false,
    `canonical Legacy entry ${rule.source} must not redirect to 2029`,
  );
}

for (const rule of rewrites) {
  assert.equal(
    canonicalEntries.has(rule.source) && String(rule.destination || "") === "/2029.html",
    false,
    `canonical Legacy entry ${rule.source} must not rewrite to the 2029 document`,
  );
}

assert.match(app, /path="\/post" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Posts2029DocumentHandoff \/> : <PostsPage \/>\}/);
assert.match(app, /path="\/community\/chat" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Product2029DocumentHandoff \/> : <SpotimChatRoute \/>\}/);
assert.match(app, /path="\/code" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Product2029DocumentHandoff \/> : <CodePage \/>\}/);
assert.match(app, /path="\/:slug" element=\{CORE_PUBLIC_LAUNCH_2029 \? <LegacyPostDocumentHandoff \/> : <PostBySlugRoute \/>\}/);

console.log("Legacy Production lock: PASS");
