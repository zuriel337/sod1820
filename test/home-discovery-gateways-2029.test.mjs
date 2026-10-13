import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const gateway = readFileSync(new URL("../src/components/experience2029/DiscoveryGateways2029.jsx", import.meta.url), "utf8");
const home = readFileSync(new URL("../src/components/experience2029/HomeComposition2029.jsx", import.meta.url), "utf8");
const style = readFileSync(new URL("../src/components/experience2029/discoveryGateways2029.css", import.meta.url), "utf8");

test("2029 Home presents three research gateways and an independent Dimension Five full-width row", () => {
  assert.match(home, /<DiscoveryGateways2029 excludedPostKeys=\{reservedPostKeys\}/);
  assert.doesNotMatch(home, /Section label="צפנים וסרטים"/);
  for (const title of ["שבילי שפה", "הצופן בקולנוע", "הצופן התנ״כי"]) {
    assert.ok(gateway.includes(`title="${title}"`), `missing ${title}`);
  }
  assert.ok(!gateway.includes('title="הצפנים בסרטונים"'));
  assert.ok(gateway.includes('<DimensionFiveFeature items={dimension.items}'));
  assert.ok(gateway.includes('secondaryHref="/els?library=public"'));
  assert.ok(gateway.includes('...videos.items.slice(0, 2)'));
  assert.ok(gateway.includes('...state.matrices.slice(0, 2)'));
});

test("automatic gateway membership comes ONLY from categories, not tags/keywords", () => {
  assert.match(gateway, /getPostsFromSupabase\(\{ category: "שבילי שפה"/);
  assert.match(gateway, /getPostsFromSupabase\(\{ category: "הצופן בסרטים"/);
  assert.match(gateway, /getPostsFromSupabase\(\{ category: "מימד חמש"/);
  assert.match(gateway, /getCategoryVideos\("צפונות בתורה"/);
  assert.doesNotMatch(gateway, /getRealityCodePosts|getRealityVideos|\.tags|isCinemaPost|includes\("מטריקס"\)/);
});

test("canonical followers cover each configured category and ELS without a second notification engine", () => {
  assert.match(gateway, /import WatchButton from/);
  for (const category of ["שבילי שפה", "הצופן בסרטים", "צפונות בתורה", "מימד חמש"]) {
    assert.ok(gateway.includes(`category: "${category}"`));
  }
  assert.match(gateway, /topic: "codes:new"/);
  assert.match(gateway, /noPush compact/);
  assert.doesNotMatch(gateway, /saveNotificationPrefs|watchToggle\(|\.upsert\(/);
});

test("ELS uses canonical reader, source identity and replay, no duplicate research store", () => {
  assert.match(gateway, /getMatrixLibraryPage\(\{ view: "public"/);
  assert.match(gateway, /savedMatrixWorkspaceHref\(row\)/);
  assert.match(gateway, /\/els\?library=public/);
  assert.match(gateway, /\/languages/);
  assert.match(gateway, /claimHomeItems/);
});
test("home discovery controls remain compact and accessible", () => {
  assert.match(style, /min-height:\s*44px/);
  assert.match(style, /--s29-panel/);
  assert.match(style, /@container h29 \(max-width: 620px\)/);
  assert.ok(style.includes(".dg29-grid { display: grid; grid-template-columns: minmax(0, 1fr);"));
  assert.ok(style.includes(".dg29-dimension-sources"));
  assert.ok(!style.includes("scroll-snap-type: x mandatory"));
});
