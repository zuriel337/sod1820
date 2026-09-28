import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { hardenPassiveMediaHtml } from "../src/lib/mediaEgressGuard.js";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");
const app = read("src/App2029.jsx");
const page = read("src/pages/ControlPlane2029Page.jsx");
const visits = read("src/lib/visits.js");
const workflow = read(".github/workflows/2029-isolation-gate.yml");
const vercel = JSON.parse(read("vercel.json"));
const frame = read("src/components/experience2029/SystemFrame2029.jsx");
const egressMigration = read("supabase/migrations/20260928113000_egress_hardening_monitoring_v1.sql");
const videoThumb = read("src/lib/videoThumb.js");
const homeOrGeula = read("src/components/HomeOrGeulaRail.jsx");
const storyChip = read("src/components/OrGeulaStoryChip.jsx");
const storyColumn = read("src/components/OrGeulaStoryColumn.jsx");
const legacy = read("src/legacy/legacy.jsx");
const post2029 = read("src/pages/Post2029Page.jsx");

assert.match(app, /ControlPlane2029Page/);
assert.match(app, /path="\/2029\/control"/);
assert.match(app, /pathname\.startsWith\("\/2029\/control"\).*return undefined/s,
  "internal Control Plane must not enter public product analytics");

assert.match(page, /useAuth\(\)/);
assert.match(page, /if \(!isAdmin\) return <Navigate replace to="\/2029" \/>/,
  "Control Plane must gate before rendering operational data");
assert.match(page, /getSystemHealth\(\)/);
assert.match(page, /getOperationalTraceList\(7, 100\)/);
assert.match(page, /getOperationalTrace\(selectedId\)/);
assert.match(page, /detail\.data\?\.rollup/);
assert.match(page, /detail\.data\?\.spans/);
assert.doesNotMatch(page, /\.from\(["']op_trace_/,
  "UI must consume canonical admin RPCs, not trace tables directly");

assert.match(visits, /rpc\("admin_op_trace_list_v1"/);
assert.match(visits, /rpc\("admin_op_trace_v1"/);
assert.match(visits, /Math\.max\(1, Math\.min\(Number\(days\).*90/s);
assert.match(visits, /Math\.max\(1, Math\.min\(Number\(limit\).*500/s);

assert.match(workflow, /Native 2029 Control Plane trace drill-down acceptance/);
const controlRewrite = (vercel.rewrites || []).filter(row => row.source === "/2029/control" && row.destination === "/2029.html");
assert.equal(controlRewrite.length, 1, "internal Control Plane must have one isolated 2029 document rewrite");
const controlHeaders = (vercel.headers || []).find(row => row.source === "/2029/control")?.headers || [];
assert.ok(controlHeaders.some(row => row.key === "X-Robots-Tag" && /noindex/.test(row.value)), "internal Control Plane must stay noindex");
assert.equal(frame.includes("/2029/control"), false, "internal Control Plane must not enter public 2029 navigation");
assert.doesNotMatch(page, /create table|create or replace function|new WebSocket|localStorage/,
  "Control Plane projection must not invent a store/runtime owner");

// EGRESS_HARDENING_MONITORING_V1 — same Control Plane / health owners, honest measurement axes.
assert.match(page, /data-experience-capability="storage-egress-health"/);
assert.match(page, /OBSERVED = bytes שנראו ב־Storage logs/);
assert.match(page, /Provider Cached Egress/);
assert.match(page, /storage_egress_observed_basis/);
assert.match(page, /supabase_cached_egress_basis/);
assert.match(page, /supabase_egress_historical_exact/);
assert.match(page, /EXACT_BILLING_HISTORY/);
assert.match(page, /Duplicate candidates/);
assert.match(page, /dedupe\.classification/);
assert.match(page, /אין מחיקה אוטומטית/);
assert.match(egressMigration, /create or replace function public\.admin_system_health\(\)/i);
assert.match(egressMigration, /create or replace function public\.fn_health_watch\(\)/i);
assert.match(egressMigration, /'storage_egress_observed_basis', 'OBSERVED_STORAGE_LOGS'/);
assert.match(egressMigration, /'supabase_egress_historical_exact_basis', 'EXACT_BILLING_HISTORY'/);
assert.match(egressMigration, /'dedupe_latest'/);
assert.match(egressMigration, /infra_media_dedupe_snapshot:%/);
assert.match(egressMigration, /'supabase_cached_egress_basis', 'UNKNOWN'/);
assert.match(egressMigration, /'warn_hour_bytes', 100 \* 1024 \* 1024/);
assert.match(egressMigration, /'critical_hour_bytes', 500 \* 1024 \* 1024/);
assert.match(egressMigration, /'warn_24h_bytes', 2::bigint \* 1024 \* 1024 \* 1024/);
assert.match(egressMigration, /'critical_24h_bytes', 5::bigint \* 1024 \* 1024 \* 1024/);
assert.match(egressMigration, /topic = '🚨 ניטור Egress\/Storage \(אוטומטי\)'/);
assert.match(egressMigration, /status = 'sensor_stale'/);
assert.ok(!/create table/i.test(egressMigration), "egress monitoring must reuse analytics_cache, not create a parallel ledger");
assert.ok(!/api\/sitemap\.js|video:content_loc|setVideoGalleryJsonLd|setPostVideoJsonLd|setOrGeulaVideosJsonLd/i.test(egressMigration), "egress monitoring must not seize the parallel SEO implementation scope");

// Public surfaces cannot generate thumbnails by fetching hidden videos anymore.
for (const [name, source] of [
  ["HomeOrGeulaRail", homeOrGeula],
  ["OrGeulaStoryChip", storyChip],
  ["OrGeulaStoryColumn", storyColumn],
]) {
  assert.equal(source.includes("ensureVideoThumbs"), false, `${name} must not invoke client thumbnail capture`);
}
assert.match(videoThumb, /retired: true/);
assert.equal(videoThumb.includes('document.createElement("video")'), false, "thumbnail compatibility module must never create hidden video");
assert.equal(videoThumb.includes('preload = "auto"'), false, "thumbnail compatibility module must never preload video");

// Raw post HTML keeps play capability but removes passive network intent.
const hardened = hardenPassiveMediaHtml(
  '<video autoplay preload="auto" src="https://example.invalid/a.mp4"><source src="https://example.invalid/a.mp4"></video>' +
  '<audio autoplay src="https://example.invalid/a.mp3"></audio>'
);
assert.match(hardened, /<video[^>]*preload="none"[^>]*data-sod-egress-guard="passive"/i);
assert.match(hardened, /<audio[^>]*preload="none"[^>]*data-sod-egress-guard="passive"/i);
assert.equal(/\sautoplay(?:\s|=|>)/i.test(hardened), false);
assert.equal(/preload="auto"/i.test(hardened), false);
assert.match(legacy, /hardenPassiveMediaHtml\(\(post\?\.content \?\? ""\)/);
assert.match(post2029, /hardenPassiveMediaHtml\(post\.content \|\| ""\)/);

// ONE OWNER / NO ISLANDS: Legacy /traffic is only a temporary projection of the exact same
// canonical System Health RPC consumed by /2029/control.
assert.match(legacy, /import \{ getSystemHealth \} from "\.\.\/lib\/visits\.js"/);
assert.match(legacy, /isAdmin \? getSystemHealth\(\)/);
assert.match(legacy, /אותה הקרנה של admin_system_health\(\) שמזינה את \/2029\/control/);
assert.match(legacy, /Control Plane 2029/);
assert.equal((legacy.match(/admin_system_health/g) || []).length, 1,
  "Legacy /traffic may name the canonical RPC in copy only; it must not define/call a second health RPC directly");


console.log("2029-control-plane-trace: PASS");
