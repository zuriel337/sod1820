import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { preflightPost, preflightReceipt, STORAGE_PUBLIC_PREFIX } from "../supabase/functions/_shared/postPublishPreflight.js";
import { findPendingPosters, posterPathForOriginal } from "../supabase/functions/_shared/mediaPosterLane.js";
import { transcribeBlob, normalizeLanguage } from "../supabase/functions/_shared/sttTranscribe.js";
import { resolveSourceLanguage, sttOriginalRow, translationTargets } from "../supabase/functions/_shared/videoTranscriptPolicy.js";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const read = (p) => readFileSync(resolve(ROOT, p), "utf8");
const fx = JSON.parse(read("test/fixtures/post-publishing/voice-from-nations.golden.json"));
const SB = fx.supabase_url;
const PUB = STORAGE_PUBLIC_PREFIX(SB);
const sv = fx.source_video;

const videoUrl = PUB + sv.planned_storage_path;
const posterUrl = PUB + sv.planned_poster_path;
const intentOf = (over = {}) => ({
  ...fx.intent,
  content: `<video controls playsinline src="${videoUrl}"></video>\n<p>${fx.intent.source_attribution.credit_text}</p>`,
  ...over,
});
const factsOf = (over = {}) => ({
  taxonomy: { categories: new Set(fx.facts_taxonomy.categories), tags: new Set(fx.facts_taxonomy.tags) },
  existing_slugs: new Set(fx.facts_existing_slugs),
  media: {
    video: { public_url: videoUrl, storage_path: sv.planned_storage_path, asset_id: sv.planned_asset_id, read_back: { ok: true, mime: "video/mp4", size: sv.original_size } },
    poster: { public_url: posterUrl, mime: "image/jpeg" },
  },
  transcripts: [{ lang: "en", is_original: true }, { lang: "he", is_original: false }],
  ...over,
});
const run = (i, f) => preflightPost({ intent: i, facts: f, supabaseUrl: SB });
const codes = (r) => [...r.blockers.map((b) => b.code), ...r.continuations.map((c) => c.code)];

// 1. Golden: everything verified -> READY bundle for the EXISTING sys_save_post writer; nothing published.
{
  const r = run(intentOf(), factsOf());
  assert.equal(r.state, "READY", JSON.stringify(r));
  assert.equal(r.bundle.writer, "public.sys_save_post");
  assert.equal(r.bundle.release, "NOT_PUBLISHED_BUNDLE_ONLY");
  assert.equal(r.bundle.args.p_image_url, posterUrl, "image_url is the verified Supabase raster poster");
  assert.equal(r.bundle.args.p_ai_touched, false);
  assert.deepEqual(Object.keys(r.bundle.args).sort(), ["p_ai_touched", "p_author", "p_categories", "p_content", "p_excerpt", "p_id", "p_image_url", "p_slug", "p_source", "p_tags", "p_title"].sort(), "bundle args == sys_save_post signature");
  assert.ok(!JSON.stringify(r.bundle).match(/verified|verify_level|canonical/i), "Publication is never Canonical/Verified truth");
  assert.deepEqual(preflightReceipt(r, { assignment_id: "x", checked_at: "t" }).blocker_codes, []);
}

// 2. Real current case state: video planned but not yet ingested -> never READY, no bundle.
{
  const r = run(intentOf(), factsOf({ media: { video: { public_url: videoUrl, storage_path: sv.planned_storage_path, asset_id: sv.planned_asset_id, read_back: null }, poster: null }, transcripts: [] }));
  assert.equal(r.state, "CONTINUATION");
  assert.equal(r.bundle, null);
  for (const c of ["MEDIA_VERIFY_PENDING", "POSTER_PENDING", "TRANSCRIPT_PENDING"]) assert.ok(codes(r).includes(c), c);
  const pp = r.continuations.find((c) => c.code === "POSTER_PENDING");
  assert.equal(pp.owner, "media-thumb-queue");
  assert.ok(pp.detail.includes("list_video_posters") && pp.detail.includes(sv.planned_poster_path), "points at the concrete existing derivative lane + exact path");
}

// 3. Blockers.
const blocked = (i, f, code) => { const r = run(i, f); assert.equal(r.state, "BLOCKED", code); assert.equal(r.bundle, null); assert.ok(codes(r).includes(code), `${code} in ${codes(r)}`); };
blocked(intentOf(), factsOf({ media: { poster: { public_url: posterUrl, mime: "image/jpeg" } } }), "SOURCE_VIDEO_REQUIRED");
blocked(intentOf({ content: `<video src="https://media.descriptusercontent.com/v/x.mp4"></video>${fx.intent.source_attribution.credit_text}` }), factsOf(), "RAW_EXTERNAL_MEDIA_IDENTITY");
blocked(intentOf({ content: `<iframe src="https://www.tiktok.com/embed/1"></iframe><video src="${videoUrl}"></video>${fx.intent.source_attribution.credit_text}` }), factsOf(), "RAW_EXTERNAL_MEDIA_IDENTITY");
blocked(intentOf({ content: "<p>no video here</p>" + fx.intent.source_attribution.credit_text }), factsOf(), "VIDEO_NOT_EMBEDDED");
blocked(intentOf(), factsOf({ media: { video: { public_url: "https://example.com/v.mp4", storage_path: "x", asset_id: "nope", read_back: { ok: true, mime: "video/mp4" } }, poster: { public_url: posterUrl } } }), "MEDIA_NOT_CANONICAL");
blocked(intentOf(), factsOf({ media: { ...factsOf().media, poster: { public_url: PUB + "sod1820/p/poster.svg", mime: "image/svg+xml" } } }), "POSTER_NOT_RASTER");
blocked(intentOf(), factsOf({ media: { ...factsOf().media, poster: { public_url: "https://raw.githubusercontent.com/a/b/p.png", mime: "image/png" } } }), "POSTER_NOT_SUPABASE_STORAGE");
blocked(intentOf({ categories: ["קטגוריה-מומצאת"] }), factsOf(), "TAXONOMY_UNKNOWN_CATEGORY");
blocked(intentOf({ tags: ["תג-מומצא"] }), factsOf(), "TAXONOMY_UNKNOWN_TAG");
blocked(intentOf({ source_attribution: null }), factsOf(), "PROVENANCE_MISSING");
blocked(intentOf({ source_attribution: { source_kind: "uploaded_file", credit_text: "credit not in body" } }), factsOf(), "ATTRIBUTION_NOT_VISIBLE");
// Source vs transport: ingest_transport alone is not provenance; it can't be the platform or appear in public credit.
{
  const credit = fx.intent.source_attribution.credit_text;
  blocked(intentOf({ source_attribution: { ingest_transport: "descript", credit_text: credit } }), factsOf(), "PROVENANCE_MISSING");
  blocked(intentOf({ source_attribution: { source_kind: "uploaded_file", credit_text: "" } }), factsOf(), "PROVENANCE_MISSING");
  blocked(intentOf({ source_attribution: { platform: "descript", ingest_transport: "descript", credit_text: credit } }), factsOf(), "TRANSPORT_ASSERTED_AS_SOURCE");
  const leak = "מקור: Descript";
  blocked(intentOf({ content: `<video src="${videoUrl}"></video>${leak}`, source_attribution: { source_kind: "uploaded_file", credit_text: leak, ingest_transport: "descript" } }), factsOf(), "TRANSPORT_ASSERTED_AS_SOURCE");
  // platform alone (a real external platform) still satisfies provenance
  const plat = "Source: TikTok";
  assert.equal(run(intentOf({ content: `<video src="${videoUrl}"></video>${plat}`, source_attribution: { platform: "tiktok", credit_text: plat } }), factsOf()).state, "READY");
  // Golden: neutral public credit, no personal identity, no transport; exact file identity stays in fixture metadata.
  const a = fx.intent.source_attribution;
  assert.equal(a.source_kind, "uploaded_file"); assert.equal(a.platform, undefined);
  assert.equal(a.credit_text, "מקור: סרטון שהתקבל במערכת");
  assert.doesNotMatch(intentOf().content, /descript|zuriel|1000702626/i, "public body carries no transport, personal identity or filename");
  assert.equal(sv.original_filename, "1000702626.mp4"); assert.equal(sv.original_sha256.length, 64);
}
blocked(intentOf(), factsOf({ existing_slugs: new Set(["voice-from-nations"]) }), "SLUG_TAKEN");
blocked(intentOf({ slug: "" }), factsOf(), "SLUG_REQUIRED");
blocked(intentOf(), factsOf({ transcripts: [{ lang: "", is_original: true }] }), "SOURCE_LANGUAGE_UNKNOWN");

// 3b. Canonical 2029 path + exact poster path; transition CONTINUATION -> READY once the poster fact appears.
{
  assert.match(sv.planned_storage_path, /^sod1820\/2029\/video\/\d{4}\/\d{2}\/[0-9a-f-]{36}\/original\.mp4$/);
  assert.ok(!/\/agent\//.test(sv.planned_storage_path + sv.planned_poster_path), "fixture never uses the agent path");
  assert.deepEqual(fx.intent.categories, ["קולות מאומות העולם", "תיעוד אירועים", "וידאו"]);
  assert.equal(posterPathForOriginal(sv.planned_storage_path), sv.planned_poster_path);
  assert.equal(posterPathForOriginal("sod1820/agent/2029/video/2026/10/" + sv.planned_asset_id + "/original.mp4"), null);
  const noPoster = factsOf({ media: { ...factsOf().media, poster: null } });
  const before = run(intentOf(), noPoster);
  assert.equal(before.state, "CONTINUATION"); assert.deepEqual(codes(before), ["POSTER_PENDING"]); assert.equal(before.bundle, null);
  const after = run(intentOf(), factsOf());
  assert.equal(after.state, "READY"); assert.equal(after.bundle.args.p_image_url, posterUrl);
  // agent path rejected for a new Golden
  const agentPath = "sod1820/agent/2029/video/2026/10/" + sv.planned_asset_id + "/original.mp4";
  const agentUrl = PUB + agentPath;
  blocked(intentOf({ content: `<video src="${agentUrl}"></video>${fx.intent.source_attribution.credit_text}` }),
    factsOf({ media: { ...factsOf().media, video: { public_url: agentUrl, storage_path: agentPath, asset_id: sv.planned_asset_id, read_back: { ok: true, mime: "video/mp4" } } } }), "MEDIA_PATH_NOT_2029_CANONICAL");
  // poster not at the derived location
  blocked(intentOf(), factsOf({ media: { ...factsOf().media, poster: { public_url: PUB + "sod1820/other/poster.jpg", mime: "image/jpeg" } } }), "POSTER_PATH_MISMATCH");
}

// 3c. Poster lane: derived from Storage, exact output path, bounded, idempotent, images/channel unaffected, service-only.
{
  const A = sv.planned_asset_id, B = "11111111-2222-4333-8444-555555555555", C = "99999999-2222-4333-8444-555555555555";
  const tree = {
    "sod1820/2029/video": ["2026/"], "sod1820/2029/video/2026": ["10/"], "sod1820/2029/video/2026/10": [A + "/", B + "/", C + "/"],
    [`sod1820/2029/video/2026/10/${A}`]: ["original.mp4", "derivatives/"],
    [`sod1820/2029/video/2026/10/${A}/derivatives`]: [],
    [`sod1820/2029/video/2026/10/${B}`]: ["original.mp4", "derivatives/"],
    [`sod1820/2029/video/2026/10/${B}/derivatives`]: ["poster.jpg"],
    [`sod1820/2029/video/2026/10/${C}`]: ["cover.png"], // image / non-original: unaffected
  };
  const listDir = async (p) => (tree[p] || []).map((n) => ({ name: n.replace(/\/$/, ""), isFolder: n.endsWith("/") }));
  const { pending } = await findPendingPosters({ listDir: async (p, o) => (await listDir(p, o)) });
  assert.deepEqual(pending, [{ original_path: sv.planned_storage_path, poster_path: sv.planned_poster_path }], "only original-without-poster is pending");
  assert.equal((await findPendingPosters({ listDir, limit: 1 })).pending.length, 1);
  const b1 = await findPendingPosters({ listDir, maxDirs: 1, limit: 99 });
  assert.equal(b1.truncated, true, "bounded"); assert.equal(b1.next_cursor, `2026/10/${A}`);

  // Starvation: >450 asset dirs, the ONLY missing poster is after dir 400 -> reachable via cursor continuation.
  {
    const N = 460, MISSING = 430;
    const uid = (i) => `00000000-0000-4000-8000-${String(i).padStart(12, "0")}`;
    const big = { "sod1820/2029/video": ["2026/"], "sod1820/2029/video/2026": ["10/"], "sod1820/2029/video/2026/10": [] };
    for (let i = 0; i < N; i++) {
      const d = `sod1820/2029/video/2026/10/${uid(i)}`;
      big["sod1820/2029/video/2026/10"].push(uid(i) + "/");
      big[d] = ["original.mp4", "derivatives/"];
      big[d + "/derivatives"] = i === MISSING ? [] : ["poster.jpg"];
    }
    const PAGE = 200; let calls = 0;
    const bigList = async (p, { limit = PAGE, offset = 0 } = {}) => { calls++; return (big[p] || []).slice(offset, offset + limit).map((n) => ({ name: n.replace(/\/$/, ""), isFolder: n.endsWith("/") })); };
    const want = { original_path: `sod1820/2029/video/2026/10/${uid(MISSING)}/original.mp4`, poster_path: `sod1820/2029/video/2026/10/${uid(MISSING)}/derivatives/poster.jpg` };
    // (a) one page (maxDirs 400) is NOT enough and says so exactly
    const p1 = await findPendingPosters({ listDir: bigList, maxDirs: 400 });
    assert.deepEqual(p1.pending, []); assert.equal(p1.truncated, true); assert.equal(p1.visited, 400); assert.equal(p1.next_cursor, `2026/10/${uid(399)}`);
    // (b) the continuation reaches it (asset dir listing is paged past 200 names)
    const p2 = await findPendingPosters({ listDir: bigList, maxDirs: 400, limit: 1, cursor: p1.next_cursor });
    assert.deepEqual(p2.pending, [want]); assert.equal(p2.truncated, true); assert.equal(p2.next_cursor, `2026/10/${uid(MISSING)}`);
    // (c) resuming after it reaches the end, not truncated, no repeats
    const p3 = await findPendingPosters({ listDir: bigList, maxDirs: 400, cursor: p2.next_cursor });
    assert.deepEqual(p3.pending, []); assert.equal(p3.truncated, false); assert.equal(p3.next_cursor, null); assert.equal(p3.visited, N - MISSING - 1);
    // (d) request budget is honoured with exact truncation
    const p4 = await findPendingPosters({ listDir: bigList, maxDirs: 400, maxRequests: 50 });
    assert.equal(p4.truncated, true); assert.ok(p4.requests <= 50 && p4.next_cursor);
    // (e) the worker loop follows next_cursor inside one invocation, bounded by maxPages
    process.env.FB_ADMIN_KEY = "test";
    const { collectPosterBatch } = await import("../scripts/media-thumbs.mjs");
    const queue = async (fn, body) => { const r = await findPendingPosters({ listDir: bigList, limit: body.limit, maxDirs: 400, cursor: body.cursor || null }); return { ok: true, rows: r.pending, truncated: r.truncated, next_cursor: r.next_cursor, visited: r.visited }; };
    const w = await collectPosterBatch({ postFn: queue });
    assert.deepEqual(w.rows, [want]); assert.equal(w.pages, 2, "reached after dir 400 within a single worker invocation");
    const wb = await collectPosterBatch({ postFn: queue, maxPages: 1 });
    assert.deepEqual(wb.rows, []); assert.equal(wb.truncated, true); assert.equal(wb.exhausted_budget, true); assert.equal(wb.next_cursor, p1.next_cursor);
    // (f) the Edge handler echoes cursor/next_cursor and pages with offset; no storage.objects shortcut
    const q = read("supabase/functions/media-thumb-queue/index.ts");
    assert.match(q, /offset/); assert.match(q, /next_cursor/); assert.match(q, /body\.cursor/);
    assert.doesNotMatch(q, /storage\.objects|rest\/v1\/objects/);
  }

  process.env.FB_ADMIN_KEY = "test";
  const { processVideoPoster } = await import("../scripts/media-thumbs.mjs");
  const calls = [];
  const post = async (fn, body) => { calls.push([fn, body]); return { ok: true, put_url: "https://put.example/x", public_url: posterUrl }; };
  const fetchImpl = async (u, init) => { calls.push(["fetch", u, init?.method || "GET"]); return new Response(init?.method === "PUT" ? "" : new Uint8Array([1, 2, 3]), { status: 200 }); };
  const r = await processVideoPoster({ original_path: sv.planned_storage_path, poster_path: sv.planned_poster_path, url: videoUrl }, { post, fetchImpl, frame: () => Buffer.from([0xff, 0xd8]) });
  assert.equal(r.ok, true);
  assert.deepEqual(calls.find((c) => c[0] === "sign-upload"), ["sign-upload", { bucket: "media", path: sv.planned_poster_path }], "exact poster output path in the media bucket");
  assert.equal(calls.some((c) => c[0] === "media-thumb-queue"), false, "no channel_updates write for the video poster lane");
  assert.equal((await processVideoPoster({ original_path: "x", poster_path: "sod1820/agent/2029/video/a/derivatives/poster.jpg", url: "u" }, { post, fetchImpl, frame: () => Buffer.from([1]) })).error, "bad_poster_path");

  // Existing channel lane stays intact and no new store/queue/identity is introduced.
  const worker = read("scripts/media-thumbs.mjs");
  assert.match(worker, /op: "list", limit: 100/); assert.match(worker, /bucket: "gallery", path: `sod1820\/channel-thumbs\/\$\{id\}\.jpg`/); assert.match(worker, /op: "set", id, thumb_url/);
  const q = read("supabase/functions/media-thumb-queue/index.ts");
  assert.match(q, /channel_updates\?select=id,image_url,channel/); assert.match(q, /op === "set"/); assert.match(q, /op === "list_video_posters"/);
  assert.doesNotMatch(q, /\.rpc\(|rest\/v1\/rpc|create table/i, "poster lane derives from Storage; no helper function / store");
  const lane = read("supabase/functions/_shared/mediaPosterLane.js");
  assert.doesNotMatch(lane, /fetch\(|createClient|insert|create table/i);
  assert.ok(!/\.\/\w*\.sql/.test(lane));
  // service-only ACL: no new SQL helper was added by this lane (only the sys_save_post ACL migration exists for this chain)
  const mig = readdirSync(resolve(ROOT, "supabase/migrations")).filter((f) => /poster|thumb/i.test(f));
  assert.deepEqual(mig, [], "no new SQL helper for the poster lane; ACL surface unchanged");
}

// 4. Translation requested but missing -> bounded continuation under video-transcribe (not a silent publish).
{
  const r = run(intentOf(), factsOf({ transcripts: [{ lang: "en", is_original: true }] }));
  assert.equal(r.state, "CONTINUATION");
  assert.deepEqual(r.continuations.map((c) => [c.code, c.owner, c.detail]), [["TRANSLATION_PENDING", "video-transcribe", "he"]]);
}

// 5. STT: reused implementation, language never hardcoded.
{
  let form;
  const okFetch = (reply) => async (_u, init) => { form = init.body; return new Response(JSON.stringify(reply), { status: 200 }); };
  const blob = new Blob([new Uint8Array(8)], { type: "video/mp4" });
  const unknown = await transcribeBlob({ key: "k", blob, filename: "a.mp4", type: "video/mp4", fetchImpl: okFetch({ text: "hello" }) });
  assert.equal(form.get("language"), null, "unknown language is omitted, not defaulted to he");
  assert.equal(unknown.language, null); assert.equal(unknown.language_evidence, "unknown");
  assert.equal((await sttOriginalRow({ base: {}, stt: unknown })).error, "source_language_unknown", "no original row without a known language");
  const rep = await transcribeBlob({ key: "k", blob, filename: "a.mp4", type: "video/mp4", fetchImpl: okFetch({ text: "hello", language: "en" }) });
  assert.equal(rep.language_evidence, "provider_reported");
  const decl = await transcribeBlob({ key: "k", blob, filename: "a.mp4", type: "video/mp4", language: "en-US", fetchImpl: okFetch({ text: "hello" }) });
  assert.equal(form.get("language"), "en"); assert.equal(decl.language_evidence, "declared");
  const row = sttOriginalRow({ base: { video_key: "k" }, stt: decl }).row;
  assert.equal(row.is_original, true); assert.equal(row.translated_by, "openai:gpt-transcribe"); assert.notEqual(row.translated_by, "human");
  assert.equal(normalizeLanguage("123-nope"), null);
  assert.deepEqual(resolveSourceLanguage({ requested: "", existingOriginalLang: "" }), { ok: false, error: "source_language_unknown" });
  assert.equal(resolveSourceLanguage({ requested: "he", existingOriginalLang: "en" }).lang, "en", "stored original wins over a caller guess");
  assert.ok(!translationTargets({ requested: null, sourceLang: "en" }).includes("en"));
}

// 6. Structural: one STT implementation, no new store/identity, writer is service-only, no page-view poster.
{
  const wa = read("supabase/functions/wa-video-enrich/index.ts");
  const vt = read("supabase/functions/video-transcribe/index.ts");
  assert.doesNotMatch(wa, /audio\/transcriptions/, "wa-video-enrich must reuse the shared STT, not embed its own");
  assert.doesNotMatch(vt, /audio\/transcriptions/, "video-transcribe must reuse the shared STT");
  assert.match(wa, /_shared\/sttTranscribe\.js/); assert.match(vt, /_shared\/sttTranscribe\.js/);
  assert.equal(read("supabase/functions/_shared/sttTranscribe.js").match(/audio\/transcriptions/g).length, 1);
  assert.doesNotMatch(vt, /original_lang"?\s*\|\|\s*"he"/, "source language must not default to he");
  assert.match(vt, /canonical_media_url_required/);
  const sql = read("supabase/migrations/20261005020000_sys_save_post_service_only_acl_v1.sql");
  assert.doesNotMatch(sql, /create\s+(table|function|or replace function)/i, "no new store / writer function");
  assert.match(sql, /revoke all on function public\.sys_save_post\([^)]*\) from public;/);
  assert.match(sql, /revoke all on function public\.sys_save_post\([^)]*\) from anon;/);
  assert.match(sql, /revoke all on function public\.sys_save_post\([^)]*\) from authenticated;/);
  assert.match(sql, /grant execute on function public\.sys_save_post\([^)]*\) to service_role;/);
  assert.doesNotMatch(sql.replace(/^--.*$/gm, ""), /grant[^;]*\bto\s+(public|anon|authenticated)\b/i);
  const pre = read("supabase/functions/_shared/postPublishPreflight.js");
  assert.doesNotMatch(pre, /fetch\(|createClient|\.rpc\(|\.from\(/, "preflight is pure: no I/O");
  assert.doesNotMatch(pre, /sys_save_post\(/, "preflight does not call the writer");
}

console.log("post-publishing-2029-chain: all assertions passed");
