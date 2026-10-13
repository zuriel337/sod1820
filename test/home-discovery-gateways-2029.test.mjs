import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gateway = readFileSync(new URL("../src/components/experience2029/DiscoveryGateways2029.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const style = readFileSync(new URL("../src/components/experience2029/discoveryGateways2029.css", import.meta.url), "utf8");

test("2029 Home has exactly one composed four-gateway discovery projection", () => {
  assert.match(home, /<DiscoveryGateways2029\s*\/>/);
  assert.doesNotMatch(home, /Section label="צפנים וסרטים"/);
  for (const title of ["שבילי שפה", "הצופן בקולנוע", "הצפנים בסרטונים", "הצופן התנ״כי"]) {
    assert.ok(gateway.includes(`title="${title}"`), `missing ${title}`);
  }
});

test("gateways link to existing canonical readers and ELS replay rather than making a second tree", () => {
  for (const api of ["getRealityCodePosts", "getRealityVideos", "getMatrixLibraryPage", "savedMatrixWorkspaceHref"]) {
    assert.ok(gateway.includes(api));
  }
  assert.match(gateway, /video\?\.is_cipher/);
  assert.match(gateway, /getMatrixLibraryPage\(\{ view: "public"/);
  assert.match(gateway, /\/els\?library=public/);
  assert.match(gateway, /\/languages/);
  assert.doesNotMatch(gateway, /\.from\(|\.insert\(|\.upsert\(/);
});

test("home discovery controls remain compact and accessible", () => {
  assert.match(style, /min-height:\s*44px/);
  assert.match(style, /--s29-panel/);
  assert.match(style, /@container h29 \(max-width: 620px\)/);
});
