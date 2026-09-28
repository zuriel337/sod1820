import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = p => readFileSync(new URL("../" + p, import.meta.url), "utf8");

const mig = read("supabase/migrations/20260928090955_unified_video_projection_2029_v1.sql");
const sitemap = read("api/sitemap.js");
const app = read("src/App.jsx");
const page = read("src/pages/VideoAssetPage.jsx");
const worker = read("supabase/functions/wa-video-enrich/index.ts");
const research = read("src/lib/researchAdmission.js");
const control = read("src/pages/ControlPlane2029Page.jsx");
const visits = read("src/lib/visits.js");

// One projection, no Video Store 2.
assert.match(mig, /create or replace view public\.video_media_placements_v1[\s\S]*security_invoker=true/i);
assert.match(mig, /create or replace view public\.video_media_assets_v1[\s\S]*security_invoker=true/i);
assert.doesNotMatch(mig, /create\s+table\s+(?:public\.)?(?:videos|video_assets|video_registry)\b/i);
assert.match(mig, /md5\(a\.asset_key\) as public_id/i);
assert.match(mig, /placement_count>1 as is_duplicate_asset/i);
assert.match(mig, /'https:\/\/sod1820\.co\.il\/video\/'\|\|md5\(a\.asset_key\)/i);

// Google consumes the deduplicated projection, not taxonomy membership.
assert.match(sitemap, /video_media_assets_v1/);
assert.match(sitemap, /unifiedVideoPages/);
assert.match(sitemap, /unifiedVideoPageTag/);
assert.doesNotMatch(sitemap, /vposts = await fetchAll\([^\n]+categories=cs/i);
assert.match(sitemap, /v\.video_kind === 'selfhost'/);
assert.match(sitemap, /youtube-nocookie\.com\/embed/);

// Generic public page is a fallback only; richer primary pages win.
assert.match(app, /path="\/video\/:assetId"/);
assert.match(page, /video_media_assets_v1/);
assert.match(page, /uses_generic_page/);
assert.match(page, /<Navigate replace to=\{target\}/);
assert.match(page, /const \[play, setPlay\] = useState\(false\)/);
assert.match(page, /if \(!play\)/);
assert.match(page, /preload="none"/);

// Cron is bounded and never opts into full-video STT.
assert.match(mig, /'video-map-enrich'[\s\S]*'\*\/30 \* \* \* \*'/);
assert.match(mig, /body:='\{"limit":8\}'::jsonb/);
assert.doesNotMatch(mig, /allow_stt/);
assert.match(worker, /PUBLIC_VIDEO_CHANNELS = \["or-geula", "torat-haremez"\]/);
assert.match(worker, /const allowStt = body\?\.allow_stt === true/);
assert.match(worker, /thumbnailMetadata\(row\)/);
assert.match(worker, /nearbyContext\(row\)/);

// Research OS receives Representation/Admission only; no truth promotion.
assert.match(research, /export function videoAssetToResearchAdmission/);
assert.match(research, /sourceType: 'video_asset_projection'/);
assert.match(research, /makeResearchAdmissionEnvelope/);

// Control Plane exposes ownership, backlog and token/cost attribution.
assert.match(visits, /export async function getVideoMapHealth/);
assert.match(visits, /rpc\("admin_video_map_health"\)/);
assert.match(control, /VIDEO MAP · 2029/);
assert.match(control, /getVideoMapHealth\(\)/);
assert.match(control, /Projection owner/);
assert.match(control, />0 tokens</);
assert.match(mig, /if v_role <> 'service_role' and not coalesce\(public\.rd_is_admin\(\), false\) then/);
assert.match(mig, /revoke all on function public\.admin_video_map_health\(\) from public,anon/);
assert.match(mig, /metadata_provider','Anthropic'/);
assert.match(mig, /metadata_model','claude-haiku-4-5'/);
assert.match(mig, /'stt_mode','MANUAL_ONLY'/);
assert.match(mig, /'stt_runs_from_cron',false/);

console.log("unified-video-projection-2029: PASS");
