import assert from "node:assert/strict";
import fs from "node:fs";
import { createHash } from "node:crypto";

const read = (path) => fs.readFileSync(path, "utf8");
const config = JSON.parse(read("vercel.json"));
const frozenLegacyBase = !fs.existsSync("src/lib/publicLaunch2029.js");
const launch = frozenLegacyBase ? null : read("src/lib/publicLaunch2029.js");
const app = read("src/App.jsx");

const redirects = config.redirects || [];
const rewrites = config.rewrites || [];
const canonicalEntries = new Set(["/", "/post", "/community/chat", "/code"]);

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

if (frozenLegacyBase) {
  // Exact approved live Legacy boot/routing/build envelope at8bc5980f only.
  // A missing launch file never admits an unknown Legacy tree or a2029 entry.
  const expected = {
    "src/App.jsx": "bb84c9ba10493fb328185a01e2a0504d68aa2ca592c27295d81d092847ad213d",
    "src/main.jsx": "93f7a2c0cf33bf888b5a41ddc557c47e27414a41f18fa3da1638b47656307890",
    "index.html": "0a55b9acc257be362686eb2855f9678baccb1a54f8d3969342cb71f03ebe0489",
    "vite.config.js": "e2b14a37cc02092064642cb3d523c839bee774793d115e074f812f68ee0ca60f",
    "vercel.json": "602a4c684572c043da40cdc9782b9e3dcc266e260578b8404b9901bad37d27c2",
    "package.json": "55e6d61b0e36b7052b20a2b3483057ea805f4cf5f9a518e576c8525794faf3b8",
    "package-lock.json": "b33e43bc391edaf257042fb088501c8a1cebd3e47b2e80ef3dd567edad202ff5"
  };
  for (const [path, hash] of Object.entries(expected)) {
    assert.equal(createHash("sha256").update(read(path)).digest("hex"), hash,
      `unknown frozen Legacy envelope: ${path}`);
  }
} else {
  assert.match(
    launch,
    /export const CORE_PUBLIC_LAUNCH_2029 = false;/,
    "Legacy Production lock requires CORE_PUBLIC_LAUNCH_2029=false",
  );

  assert.match(app, /path="\/post" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Posts2029DocumentHandoff \/> : <PostsPage \/>\}/);
  assert.match(app, /path="\/community\/chat" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Product2029DocumentHandoff \/> : <SpotimChatRoute \/>\}/);
  assert.match(app, /path="\/code" element=\{CORE_PUBLIC_LAUNCH_2029 \? <Product2029DocumentHandoff \/> : <CodePage \/>\}/);
  assert.match(app, /path="\/:slug" element=\{CORE_PUBLIC_LAUNCH_2029 \? <LegacyPostDocumentHandoff \/> : <PostBySlugRoute \/>\}/);
}

console.log("Legacy Production lock: PASS");
