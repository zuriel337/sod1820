import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = path => readFileSync(new URL("../" + path, import.meta.url), "utf8");

test("public video link metadata is enriched by bounded Edge worker, not fetched by every card", () => {
  const edge = read("supabase/functions/wa-video-enrich/index.ts");
  const now = read("src/lib/research/systemFeedPublicSources2029.js");
  assert.match(edge, /providerLinkMetadata/);
  for (const provider of ["youtube.com\/oembed", "tiktok.com\/oembed", "vimeo.com\/api\/oembed"]) {
    assert.ok(edge.includes(provider.replaceAll("\\", "")), provider);
  }
  assert.match(edge, /redirect: "error"/);
  assert.match(edge, /setTimeout\(\(\) => ctl\.abort\(\), 4500\)/);
  assert.match(edge, /total > 32000/);
  assert.match(edge, /response\.body\.getReader\(\)/);
  assert.match(edge, /enrichment_status: "retry_metadata"/);
  assert.match(edge, /\.eq\("status", "live"\)/);
  assert.match(edge, /seo_title: metadata\.title/);
  assert.match(now, /sourceTitle = text\(row\.seo_title\)/);
  assert.match(now, /publicProviderVideoPoster/);
  assert.doesNotMatch(now, /fetch\(/, "no provider or card fetch in public projection");
});

test("SQL World v3 is an inert review-only proposal behind existing v2 proof", () => {
  const sql = read("supabase/proposed/world_group_source_video_titles_v3_REVIEW_ONLY.sql");
  assert.match(sql, /world_group_source_arrivals_v2\(p_limit, p_before\)/);
  assert.match(sql, /revoke all on function public\.world_group_source_arrivals_v3/);
  assert.doesNotMatch(sql, /grant execute/i);
  assert.match(sql, /source_video_title/);
});
