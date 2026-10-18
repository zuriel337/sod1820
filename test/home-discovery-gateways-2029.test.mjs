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
  assert.match(gateway, /fetchHomePostCards2029\(\{ category: "שבילי שפה"/);
  assert.match(gateway, /fetchHomePostCards2029\(\{ category: "הצופן בסרטים"/);
  assert.match(gateway, /fetchHomePostCards2029\(\{ category: "מימד חמש"/);
  assert.match(gateway, /getCategoryVideos\("צפונות בתורה"/);
  assert.doesNotMatch(gateway, /getRealityCodePosts|getRealityVideos|\.tags|isCinemaPost|includes\("מטריקס"\)/);
});

test("the costly video reader is the only deferred gateway read and keeps an explicit bounded fallback", () => {
  assert.match(gateway, /const INITIAL_READS = ALL_READS\.filter\(\(name\) => name !== "videos"\)/);
  assert.match(gateway, /export const BIBLICAL_VIDEO_ROOT_MARGIN = "600px 0px"/);
  assert.match(gateway, /new IntersectionObserver\([\s\S]+rootMargin: BIBLICAL_VIDEO_ROOT_MARGIN/);
  assert.match(gateway, /typeof IntersectionObserver === "undefined"[\s\S]+loadVideos\(\)/);
  assert.match(gateway, /if \(live\.current\.videosRequested\) return/);
  assert.match(gateway, /data-dg29-videos-state=\{videoState\}/);
  assert.match(gateway, /const loading = INITIAL_READS\.some/);
});


test("Shvilei Safa exposes source-backed highlights in place of a duplicate Post tile", () => {
  assert.match(gateway, /function languagePostHighlights\(post\)/);
  assert.ok(gateway.includes('post.id !== "post:5018"'));
  assert.ok(gateway.includes('post.slug !== "chibur-bein-hasafot-mafteach-lagan"'));
  for (const value of ["26", "86", "611", "1820"]) {
    assert.ok(gateway.includes(`value: "${value}"`), `missing source example ${value}`);
  }
  assert.match(gateway, /\.filter\(item => item\.exists\)/);
  assert.match(gateway, /languageHighlights\.length/);
  assert.match(gateway, /language\.items\.filter\(item => item !== languagePost\)/);
  assert.ok(gateway.includes('feature={languageFeature} items={languageLinks}'));
  assert.match(style, /\.dg29-language-metrics \{ display: grid;/);
  assert.match(style, /\.dg29-language-metric b \{/);
  assert.match(style, /--s29-discovery/);
});

test("canonical followers cover each configured category and ELS without a second notification engine", () => {
  assert.match(gateway, /import WatchButton from/);
  for (const category of ["שבילי שפה", "הצופן בסרטים", "צפונות בתורה"]) {
    assert.ok(gateway.includes(`category: "${category}"`));
  }
  assert.match(gateway, /topic: "codes:new"/);
  assert.ok(gateway.includes('topic="cat:מימד חמש"'));
  assert.match(gateway, /noPush variant="icon"/);
  assert.match(gateway, /followTopics\.slice\(0, 1\)\.map\(followControl\)/);
  assert.match(gateway, /followTopics\.slice\(1\)\.map\(followControl\)/);
  assert.match(gateway, /dg29-head-follow/);
  assert.doesNotMatch(gateway, /className="dg29-follow"/);
  assert.ok(style.includes(".dg29-head-follow"));
  assert.ok(style.includes(".dg29-secondary-row"));
  assert.doesNotMatch(gateway, /saveNotificationPrefs|watchToggle\(|\.upsert\(/);
});

test("Follow is the same canonical WatchButton with shared compact control projection", () => {
  const watch = readFileSync(new URL("../src/components/WatchButton.jsx", import.meta.url), "utf8");
  const sharedActions = readFileSync(new URL("../src/components/experience2029/contentActions2029.css", import.meta.url), "utf8");
  const icons = readFileSync(new URL("../src/components/experience2029/NavigationIcon2029.jsx", import.meta.url), "utf8");
  assert.match(watch, /variant === "icon"/);
  assert.match(watch, /NavigationIcon2029 name="follow"/);
  assert.match(watch, /aria-pressed={following}/);
  assert.match(watch, /regCta/);
  assert.match(sharedActions, /width:44px; height:44px/);
  assert.match(sharedActions, /\[data-follow-state="following"\]/);
  assert.match(sharedActions, /--s29-accent/);
  assert.match(icons, /follow: <>/);
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
