import assert from "node:assert/strict";
import fs from "node:fs";

const ingest = fs.readFileSync("supabase/functions/wa-channel-ingest/index.ts", "utf8");
const edge = fs.readFileSync("supabase/functions/live-whatsapp-feed/index.ts", "utf8");
const client = fs.readFileSync("src/lib/supabase.js", "utf8");
const feed = fs.readFileSync("src/components/LiveChannelFeed.jsx", "utf8");
const frameTest = fs.readFileSync("scripts/test-2029-system-frame.mjs", "utf8");

// Research/source state stays unchanged: Torat remains research-first/private at ingest.
assert.match(ingest, /RESEARCH_FIRST_CHANNELS = new Set\(\["torat-haremez", "gilui-yomi", "sfot-vheker"\]\)/);
assert.match(ingest, /STORY_LIVE_CHANNELS = new Set\(\["or-geula"\]\)/);

// Public projection is fixed to Torat, bounded, and strips private storage refs from media output.
assert.match(edge, /\.eq\("channel", "torat-haremez"\)/);
assert.match(edge, /Math\.min\([^,]+, 60\)/);
assert.match(edge, /safePublicUrl\(row\.image_url\)/);
assert.match(edge, /if \(!hasText && !imageUrl\) continue/);
assert.match(edge, /credit: row\.status === "live" \? \(row\.credit \|\| "תורת הרמז"\) : "תורת הרמז"/);

// Only the existing Legacy LiveChannelFeed consumes this projection.
assert.match(client, /getToratHaremezLiveFeed/);
assert.match(client, /functions\.invoke\('live-whatsapp-feed'/);
assert.match(feed, /k === "torat-haremez" \? getToratHaremezLiveFeed\(60\) : getChannelUpdates\(12, k, true\)/);

// 2029 remains isolated from the Legacy BottomBar/feed family.
assert.match(frameTest, /BottomBar/);
assert.match(frameTest, /siteUpdates/);
assert.equal(/live-whatsapp-feed|getToratHaremezLiveFeed/.test(fs.readFileSync("src/App2029.jsx", "utf8")), false);
