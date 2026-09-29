import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const queue = readFileSync(new URL("../supabase/functions/media-thumb-queue/index.ts", import.meta.url), "utf8");
const worker = readFileSync(new URL("../scripts/media-thumbs.mjs", import.meta.url), "utf8");

assert.match(queue, /select=id,image_url,thumb_url,channel/);
assert.match(queue, /return !thumb \|\| thumb === image \|\| VID\.test\(thumb\)/);
assert.match(queue, /\.slice\(0, limit\)/);
assert.doesNotMatch(queue, /or=\(thumb_url\.is\.null,thumb_url\.eq\.\)/);

assert.match(worker, /Number\(process\.env\.MEDIA_THUMB_LIMIT\) \|\| 10/);
assert.match(worker, /Math\.min\(50, Math\.max\(1,/);
assert.match(worker, /media-thumb-queue", \{ op: "list", limit: requestedLimit \}/);

console.log("media thumbnail real-poster backfill gate: PASS");
