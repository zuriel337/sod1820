import assert from "node:assert/strict";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, resolve } from "node:path";
import { preflightPost, preflightReceipt, STORAGE_PUBLIC_PREFIX } from "../supabase/functions/_shared/postPublishPreflight.js";
import { findPendingPosters, posterPathForOriginal } from "../supabase/functions/_shared/mediaPosterLane.js";
import { transcribeBlob, normalizeLanguage } from "../supabase/functions/_shared/sttTranscribe.js";
import { isUniqueViolation, planOriginal, resolveSourceLanguage, sttOriginalRow, translationTargets } from "../supabase/functions/_shared/videoTranscriptPolicy.js";

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
  release_authorized: true, release_authorization_state: "ZURIEL_HUMAN_GATE_RELEASE", // governance guard input, NOT a security boundary
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

// 7. M1 media-attribute bypass regressions (conservative pure scanner; ordinary <a href> links stay allowed).
{
  const credit = fx.intent.source_attribution.credit_text;
  const vid = `<video src="${videoUrl}"></video>${credit}`;
  const bad = (extra, label) => blocked(intentOf({ content: vid + extra }), factsOf(), label.code || label);
  bad(`<img src=//evil.example/x.png>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="//evil.example/x.png">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src=https://evil.example/x.png>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<IMG SRC='http://evil.example/x.png'>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img\nsrc\n=\n"https://evil.example/x.png">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img/src=https://evil.example/x.png>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img srcset="${videoUrl.replace("original.mp4", "derivatives/poster.jpg")} 1x, https://evil.example/x.png 2x">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img srcset=https://evil.example/a.png>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<video poster=//evil.example/p.jpg></video>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<embed src="https://evil.example/x.swf">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<object data=https://evil.example/x.swf></object>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<iframe src=//evil.example/f></iframe>`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<source src="https://evil.example/v.mp4">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="data:image/png;base64,AAAA">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="blob:https://x/123">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="javascript:alert(1)">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="${videoUrl}?token=1">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="${PUB}sod1820/2029/video/2026/10/../../../x.png">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="${PUB}sod1820/agent/2029/video/2026/10/${sv.planned_asset_id}/original.mp4">`, "RAW_EXTERNAL_MEDIA_IDENTITY");
  bad(`<img src="https://evil.example/&#120;.png">`, "MEDIA_ATTR_AMBIGUOUS");
  bad(`<img src="${videoUrl}&amp;x=1">`, "MEDIA_ATTR_AMBIGUOUS");
  bad(`<img src="https://evil.example/x.png`, "MEDIA_ATTR_AMBIGUOUS");
  // Final-audit regressions: generic over every start-tag attribute (no tag allowlist).
  const E = "https://evil.example/x.png";
  for (const x of [
    `<svg><image href="${E}"/></svg>`, `<svg><image xlink:href="${E}"/></svg>`, `<svg><use href="${E}#a"/></svg>`,
    `<svg><use xlink:href='//evil.example/s.svg#a'/></svg>`,
    `<div style="background:url(${E})"></div>`, `<div style="background-image: url('${E}')"></div>`, `<div style='background:URL( "${E}" )'></div>`,
    `<div style="background-image:image-set('${E}' 1x)"></div>`, `<div style="@import '${E}'"></div>`,
    `<style>.a{background:url(${E})}</style>`, `<style>@import "${E}";</style>`,
    `<meta property="og:image" content="${E}">`, `<meta content=//evil.example/x.png>`, `<meta http-equiv="refresh" content="0;url=${E}">`,
    `<input type="image" src="${E}">`, `<script src="${E}"></script>`, `<link rel="stylesheet" href="${E}">`, `<link rel="icon" href="x.png">`,
    `<table background="${E}"></table>`, `<body background=${E}>`, `<div data-bg="${E}"></div>`, `<div data-src="${E}"></div>`,
    `<a href="/ok" style="background:url(${E})">x</a>`, `<a href="/ok" ping="${E}">x</a>`,
    `<form action="${E}"></form>`, `<button formaction="${E}"></button>`, `<div src="${E}"></div>`, `<video data-poster="${E}"></video>`,
  ]) bad(x, "RAW_EXTERNAL_MEDIA_IDENTITY");
  for (const x of [
    `<div style="background:\\75rl(${E})"></div>`, `<div style="background:&#117;rl(${E})"></div>`, `<style>.a{background:\\75rl(${E})}</style>`,
    `<meta content="&#104;ttps://evil.example/x.png">`, `<svg><image href="&#104;ttps://evil.example/x.png"/></svg>`,
    `<style>.a{b:c}`, `<div style="background:url(${E}`,
  ]) bad(x, "MEDIA_ATTR_AMBIGUOUS");
  // canonical media in generic positions + same-document refs + ordinary text/non-URL attrs stay allowed
  const okImg = posterUrl;
  for (const x of [
    `<svg><image href="${okImg}"/><use href="#a"/><rect fill="url(#g)"/></svg>`, `<div style="background:url(${okImg})"></div>`,
    `<style>.a{background:url(${okImg})}</style>`, `<meta property="og:image" content="${okImg}">`,
    `<p title="see https://example.com/x" class="a b" data-x="1" aria-label="&#1488;">text https://example.com/plain</p>`,
    `<div style="color:red;margin:0"></div>`, `<img alt="&#1488;" src="${okImg}">`,
  ]) assert.equal(run(intentOf({ content: vid + x }), factsOf()).state, "READY", x);
  // ordinary external anchor links (citations / related) are NOT blocked
  const links = `<a href="https://he.wikipedia.org/wiki/x">ויקיפדיה</a> <a href=https://example.com/related>related</a> <A HREF='//cdn.example/s'>s</A>`;
  assert.equal(run(intentOf({ content: vid + links }), factsOf()).state, "READY");
  // canonical media-bearing attrs stay fine (video src/poster derivative)
  assert.equal(run(intentOf({ content: `<video src="${videoUrl}" poster="${posterUrl}"></video>${credit}` }), factsOf()).state, "READY");
  // kind downgrade: intent.kind=text cannot hide a video / image
  blocked(intentOf({ kind: "text" }), factsOf(), "KIND_DOWNGRADE_DETECTED");
  blocked(intentOf({ kind: "text", content: `<video src="https://evil.example/v.mp4"></video>` }), factsOf({ media: {} }), "SOURCE_VIDEO_REQUIRED");
  blocked(intentOf({ kind: "text", content: `<img src="${PUB}sod1820/2029/image/2026/10/${sv.planned_asset_id}/a.png">` }), factsOf({ media: {} }), "SOURCE_IMAGE_REQUIRED");
  blocked(intentOf({ kind: "text", content: "<p>x</p>", image_url: posterUrl }), factsOf({ media: {} }), "SOURCE_IMAGE_REQUIRED");
  assert.equal(run(intentOf({ kind: "text" }), factsOf()).kind, "video");
}

// 8. Image posts (post_og_image_law: JPG/PNG on Supabase Storage; released convention sod1820/2029/image/YYYY/MM/<uuid>/...).
{
  const A = "7c9e6679-7425-40de-944b-e07fc1f90ae7";
  const imgPath = (n = "cover.jpg") => `sod1820/2029/image/2026/10/${A}/${n}`;
  const imgFact = (n = "cover.jpg", mime = "image/jpeg", over = {}) => ({ public_url: PUB + imgPath(n), storage_path: imgPath(n), asset_id: A, read_back: { ok: true, mime, size: 10 }, ...over });
  const iIntent = (over = {}) => ({
    kind: "image", title: "תמונה", slug: "img-post", excerpt: "x", categories: [], tags: [], author: null, source: "ai", ai_touched: false,
    release_authorized: true, release_authorization_state: "ZURIEL_HUMAN_GATE_RELEASE",
    content: `<p>טקסט</p><img src="${PUB + imgPath()}" alt="">`, ...over,
  });
  const iFacts = (image, over = {}) => ({ taxonomy: { categories: new Set(), tags: new Set() }, existing_slugs: new Set(), media: { image }, transcripts: [], ...over });
  const ok = run(iIntent(), iFacts(imgFact()));
  assert.equal(ok.state, "READY", JSON.stringify(ok)); assert.equal(ok.kind, "image");
  assert.equal(ok.bundle.args.p_image_url, PUB + imgPath(), "exact canonical media-bucket URL, no query/hash");
  assert.equal(ok.bundle.writer, "public.sys_save_post"); assert.equal(ok.bundle.release, "NOT_PUBLISHED_BUNDLE_ONLY");
  assert.equal(run(iIntent({ image_url: PUB + imgPath() }), iFacts(imgFact())).state, "READY");
  assert.equal(run(iIntent({ content: "<p>x</p>" }), iFacts(imgFact("cover.png", "image/png"))).bundle.args.p_image_url, PUB + imgPath("cover.png"));
  // text-only post may omit image entirely
  const t = run({ ...iIntent({ kind: "text", content: "<p>טקסט</p>" }) }, iFacts(undefined, { media: {} }));
  assert.equal(t.state, "READY"); assert.equal(t.kind, "text"); assert.equal(t.bundle.args.p_image_url, null);
  const cb = (i, f, code) => blocked(i, f, code);
  cb(iIntent(), iFacts(undefined, { media: {} }), "SOURCE_IMAGE_REQUIRED");
  cb(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { asset_id: "nope" })), "MEDIA_NOT_CANONICAL");
  cb(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { asset_id: "11111111-2222-4333-8444-555555555555" })), "MEDIA_NOT_CANONICAL");
  cb(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { public_url: "https://example.com/c.jpg" })), "MEDIA_NOT_CANONICAL");
  cb(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { public_url: PUB + imgPath() + "?v=2" })), "MEDIA_NOT_CANONICAL");
  cb(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { storage_path: `sod1820/agent/2029/image/2026/10/${A}/cover.jpg`, public_url: PUB + `sod1820/agent/2029/image/2026/10/${A}/cover.jpg` })), "MEDIA_NOT_CANONICAL");
  cb(iIntent({ image_url: "https://evil.example/c.jpg" }), iFacts(imgFact()), "RAW_EXTERNAL_MEDIA_IDENTITY");
  cb(iIntent({ image_url: PUB + imgPath() + "?x=1" }), iFacts(imgFact()), "RAW_EXTERNAL_MEDIA_IDENTITY");
  cb(iIntent({ image_url: PUB + imgPath("other.jpg") }), iFacts(imgFact()), "IMAGE_URL_MISMATCH");
  // not yet verified -> continuation (no bundle); non-JPG/PNG canonical original -> explicit representation continuation, never published
  const pend = run(iIntent(), iFacts(imgFact("cover.jpg", "image/jpeg", { read_back: null })));
  assert.equal(pend.state, "CONTINUATION"); assert.equal(pend.bundle, null); assert.deepEqual(codes(pend), ["MEDIA_VERIFY_PENDING"]);
  for (const [n, mime] of [["cover.webp", "image/webp"], ["cover.svg", "image/svg+xml"], ["cover.heic", "image/heic"], ["cover.gif", "image/gif"]]) {
    const r = run(iIntent({ content: "<p>x</p>" }), iFacts(imgFact(n, mime)));
    assert.equal(r.state, "CONTINUATION", n); assert.equal(r.bundle, null);
    const c = r.continuations.find((x) => x.code === "IMAGE_RASTER_REPRESENTATION_PENDING");
    assert.ok(c && c.owner === "post_og_image_law", n);
  }
  // jpg extension with a non-raster mime is also not publishable as image_url
  assert.equal(run(iIntent({ content: "<p>x</p>" }), iFacts(imgFact("cover.jpg", "image/webp"))).state, "CONTINUATION");
}

// 9. M2/L1/L3: STT original integrity, canonical media fetch, identity URLs, human gate honesty, writer concurrency.
{
  // preflight blocks multiple originals (never rows.find arbitrarily)
  blocked(intentOf(), factsOf({ transcripts: [{ lang: "en", is_original: true }, { lang: "he", is_original: true }] }), "TRANSCRIPT_MULTIPLE_ORIGINALS");
  blocked(intentOf({ language_policy: {} }), factsOf({ transcripts: [{ lang: "en", is_original: true }, { lang: "en", is_original: true }] }), "TRANSCRIPT_MULTIPLE_ORIGINALS");
  // L3 identity URLs: poster / image_url exact, no query/hash
  blocked(intentOf(), factsOf({ media: { ...factsOf().media, poster: { public_url: posterUrl + "?v=1", mime: "image/jpeg" } } }), "POSTER_NOT_SUPABASE_STORAGE");
  blocked(intentOf(), factsOf({ media: { ...factsOf().media, poster: { public_url: posterUrl + "#x", mime: "image/jpeg" } } }), "POSTER_NOT_SUPABASE_STORAGE");
  blocked(intentOf({ image_url: posterUrl + "?v=1" }), factsOf(), "RAW_EXTERNAL_MEDIA_IDENTITY");
  blocked(intentOf({ image_url: PUB + "sod1820/other.jpg" }), factsOf(), "IMAGE_URL_POSTER_MISMATCH");
  assert.equal(run(intentOf({ image_url: posterUrl }), factsOf()).state, "READY");
  // Human gate: governance guard only (the caller can assert it) — no bundle without it; sys_save_post stays the service-only writer.
  for (const over of [{ release_authorized: false }, { release_authorized: undefined }, { release_authorized: "true" }, { release_authorization_state: "BRANCH_ONLY_NO_DB_APPLY_NO_MERGE_NO_DEPLOY_NO_REAL_POST" }]) {
    const r = run(intentOf(over), factsOf()); assert.equal(r.state, "BLOCKED"); assert.equal(r.bundle, null); assert.ok(codes(r).includes("HUMAN_RELEASE_REQUIRED"), JSON.stringify(over));
  }
  const pre = read("supabase/functions/_shared/postPublishPreflight.js");
  assert.match(pre, /governance guard, NOT a security authorization boundary/);
  assert.match(pre, /Publication != Canonical\/Verified/);
  assert.match(pre, /publish_post is already declared in the live\n\/\/ inter_agent_coordination_law/, "routing pointer only; no publish Edge/system");
  // L1: strict canonical media URL for STT fetch
  const { canonicalMediaPath, isCanonicalVideoOriginalPath } = await import("../supabase/functions/_shared/mediaPosterLane.js");
  const ok = (u) => { const p = canonicalMediaPath(u, SB); return !!p && isCanonicalVideoOriginalPath(p); };
  assert.equal(ok(videoUrl), true);
  const A = sv.planned_asset_id, base = `${PUB}sod1820/2029/video/2026/10/${A}`;
  for (const u of [
    videoUrl + "?x=1", videoUrl + "#t=1", videoUrl.replace("https://", "https://u:p@"), videoUrl.replace(".supabase.co", ".supabase.co.evil.com"),
    "http://" + videoUrl.slice(8), `${PUB}sod1820/2029/video/2026/10/../10/${A}/original.mp4`, `${PUB}sod1820/2029/video/2026/10/%2e%2e/10/${A}/original.mp4`,
    `${base}/%2e%2e/${A}/original.mp4`, `${base}%2foriginal.mp4`, `${base}\\original.mp4`, `${base}/original.exe`, `${base}/derivatives/poster.jpg`,
    `${PUB}sod1820/agent/2029/video/2026/10/${A}/original.mp4`, `${SB}/storage/v1/object/public/gallery/sod1820/2029/video/2026/10/${A}/original.mp4`,
    `${SB}/storage/v1/object/sign/media/sod1820/2029/video/2026/10/${A}/original.mp4`, `${base}//original.mp4`, "https://evil.example/x.mp4", "",
  ]) assert.equal(ok(u), false, u);
  const vt = read("supabase/functions/video-transcribe/index.ts");
  assert.match(vt, /canonicalMediaPath\(mediaUrl, SB_URL\)/); assert.match(vt, /isCanonicalVideoOriginalPath\(mediaPath\)/);
  assert.doesNotMatch(vt, /mediaUrl\.startsWith/); assert.match(vt, /redirect: "error"/);
  // M2: transcribe checks existing originals BEFORE any STT/fetch and never overwrites.
  const tr = vt.slice(vt.indexOf('if (action === "transcribe")'), vt.indexOf("const plan = planOriginal"));
  assert.ok(tr.indexOf("listOriginals(video_key)") > 0 && tr.indexOf("listOriginals(video_key)") < tr.indexOf("fetch(mediaUrl") && tr.indexOf("listOriginals(video_key)") < tr.indexOf("transcribeBlob("), "originals queried first");
  assert.match(tr, /original_conflict/); assert.match(tr, /state: "original_exists"/);
  assert.match(tr, /upsertRow\(built\.row, "ignore"\)/, "STT never merge-overwrites");
  assert.match(vt, /resolution=\$\{onDuplicate === "ignore" \? "ignore" : "merge"\}-duplicates/);
  // G: both existing writers take the SAME advisory lock immediately before the max()+1 allocation; signatures/guards preserved.
  const mig = read("supabase/migrations/20261005030000_post_writers_id_alloc_advisory_lock_v1.sql");
  const code = mig.replace(/^--.*$/gm, "");
  assert.doesNotMatch(code, /create\s+(table|sequence|index|extension)|\balter\s+table\b|\bdrop\b/i, "no new store/sequence/identity");
  assert.equal((code.match(/create or replace function/gi) || []).length, 2, "exactly the two existing writers");
  const fn = (name) => { const i = code.indexOf(`create or replace function public.${name}(`); const j = code.indexOf("$function$;", i); return code.slice(i, j); };
  const sys = fn("sys_save_post"), adm = fn("admin_save_post");
  const LOCK = "perform pg_advisory_xact_lock(hashtextextended('public.posts.id_wp_id_allocation', 0));";
  for (const [n, f] of [["sys", sys], ["admin", adm]]) {
    assert.equal(f.split(LOCK).length - 1, 1, `${n}: one lock`);
    const l = f.indexOf(LOCK), m = f.indexOf("select coalesce(max(id),0)+1");
    assert.ok(l > 0 && m > l, `${n}: lock before max(id)+1`);
    assert.equal(f.slice(l + LOCK.length, m).trim(), "", `${n}: lock immediately before allocation`);
    assert.ok(f.indexOf("if p_id is null then") < l, `${n}: lock only on INSERT path`);
    assert.ok(f.indexOf("max(wp_id),0)+1") > m, `${n}: wp_id allocated under the same lock`);
    assert.match(f, /security definer/); assert.match(f, /set search_path to 'public'/);
    assert.match(f, /overriding system value/); assert.match(f, /raise exception 'not_found'/);
  }
  assert.match(sys, /create or replace function public\.sys_save_post\(p_id bigint default null::bigint, p_title text default ''::text, p_slug text default null::text, p_content text default ''::text, p_excerpt text default ''::text, p_categories text\[\] default '\{\}'::text\[\], p_tags text\[\] default '\{\}'::text\[\], p_author text default null::text, p_image_url text default null::text, p_source text default 'ai'::text, p_ai_touched boolean default false\)\s+returns jsonb/);
  assert.doesNotMatch(sys, /auth\.uid|not_admin/, "sys_save_post stays a service-only technical writer");
  assert.match(adm, /p_theme text default null::text, p_keep_modified boolean default false, p_axis_pin smallint default null::smallint, p_axis_pin_set boolean default false, p_tree_priority smallint default null::smallint, p_tree_priority_set boolean default false\)/);
  assert.ok(adm.indexOf("auth.uid() and u.role='admin'") > 0 && adm.indexOf("raise exception 'not_admin'") > 0 && adm.indexOf("raise exception 'not_admin'") < adm.indexOf(LOCK), "admin gate precedes lock/allocation");
  assert.doesNotMatch(code, /\b(grant|revoke)\b/i, "ACLs untouched here (sys_save_post ACL from 20261005020000; admin_save_post unchanged)");
  assert.match(read("supabase/migrations/20261005020000_sys_save_post_service_only_acl_v1.sql"), /grant execute on function public\.sys_save_post\([^)]*\) to service_role;/);
}

// 7. ORIGINAL INVARIANT: one and only one original per video_key; stored original always wins; no silent dedupe.
{
  const he = { lang: "he", transcript: "מקור שמור" };
  // same-lang overwrite impossible: set_original over a stored original is refused (no create/mutation plan)
  assert.deepEqual(planOriginal({ originals: [he], action: "set_original", requestedText: "אחר", requestedLang: "he" }), { kind: "original_exists", error: "original_exists", lang: "he" });
  // different-lang second original impossible
  assert.equal(planOriginal({ originals: [he], action: "set_original", requestedText: "other", requestedLang: "en" }).kind, "original_exists");
  assert.equal(planOriginal({ originals: [he], action: "translate", requestedText: "other", requestedLang: "en" }).kind, "use_stored");
  // stored original wins for translation even when caller redundantly supplies text/lang
  const t = planOriginal({ originals: [he], action: "translate", requestedText: "caller text", requestedLang: "en" });
  assert.deepEqual([t.kind, t.lang, t.text, t.caller_original_ignored], ["use_stored", "he", "מקור שמור", true]);
  assert.equal(planOriginal({ originals: [he], action: "translate" }).caller_original_ignored, false);
  assert.equal(planOriginal({ originals: [he], action: "translate", requestedText: "מקור שמור", requestedLang: "he" }).caller_original_ignored, false);
  // >1 stored originals => conflict, never picked/deduped
  const c = planOriginal({ originals: [he, { lang: "en", transcript: "x" }], action: "translate", requestedText: "z", requestedLang: "he" });
  assert.deepEqual(c, { kind: "conflict", error: "original_conflict", originals: ["he", "en"] });
  assert.equal(planOriginal({ originals: [he, { lang: "en" }], action: "set_original", requestedText: "z", requestedLang: "he" }).kind, "conflict");
  // none stored: first source only with text and a KNOWN language (never defaulted)
  assert.deepEqual(planOriginal({ originals: [], action: "set_original", requestedText: " hi ", requestedLang: "en" }), { kind: "create", lang: "en", text: "hi" });
  assert.equal(planOriginal({ originals: [], action: "translate", requestedText: "hi" }).error, "source_language_unknown");
  assert.equal(planOriginal({ originals: [], action: "translate", requestedLang: "he" }).error, "original_text_required");
  assert.equal(planOriginal({ originals: [{ lang: "he", transcript: "" }], action: "translate" }).error, "stored_original_unusable");
  assert.equal(isUniqueViolation(new Error('upsert 409: {"code":"23505"}')), true);
  assert.equal(isUniqueViolation(new Error("upsert 500: boom")), false);

  // Edge wiring: originals inspected BEFORE caller text is trusted; insert never merges; race re-reads; no silent dedupe.
  const vt = read("supabase/functions/video-transcribe/index.ts");
  const tail = vt.slice(vt.indexOf("const plan = planOriginal"));
  assert.ok(vt.indexOf("planOriginal({ originals: await listOriginals(video_key)") > 0);
  assert.doesNotMatch(vt.slice(0, vt.indexOf("const plan = planOriginal")).slice(vt.indexOf('if (action === "transcribe")')), /b\.original_text/, "caller original_text untouched before the plan");
  assert.match(tail, /upsertRow\(\{\s*\.\.\.base, lang: original_lang[\s\S]*?"ignore"\)/, "first source is a non-overwriting insert");
  assert.doesNotMatch(tail, /upsertRow\(\{[^}]*is_original: true[^}]*\}\);/, "no merge-upsert of an original");
  assert.match(tail, /isUniqueViolation\(e\)/); assert.match(tail, /error: "original_exists"/); assert.match(tail, /error: "original_conflict"/);
  assert.doesNotMatch(vt, /method:\s*"DELETE"|is_original=eq\.false|is_original:\s*false\s*}\s*\)\s*,?\s*\n?\s*\{?\s*method:\s*"PATCH"/, "no delete/demote of originals");
  assert.match(tail, /translationRow\(\{ base, lang, text: t\.text/); // translation target semantics unchanged

  // DB invariant (static): partial unique index + fail-closed duplicate precondition; no table/store, no silent dedupe.
  const mig = read("supabase/migrations/20261005040000_video_transcripts_single_original_invariant_v1.sql");
  const code = mig.replace(/^--.*$/gm, "");
  assert.match(code, /create unique index if not exists video_transcripts_one_original_per_key_uidx\s+on public\.video_transcripts \(video_key\) where is_original;/);
  assert.match(code, /having count\(\*\) > 1[\s\S]*raise exception 'video_transcripts_duplicate_originals/);
  assert.ok(code.indexOf("raise exception") < code.indexOf("create unique index"), "duplicate check precedes index");
  assert.doesNotMatch(code, /create\s+(table|function|sequence)|\bdelete\b|\bupdate\b|\bdrop\b|\btruncate\b/i, "no new store, no silent dedupe");
}

console.log("post-publishing-2029-chain: all assertions passed");

// 9. STT unique-race: transcribe insert catches unique-violation, re-reads originals, reports (never 500, never overwrites).
{
  const src = readFileSync(resolve(dirname(fileURLToPath(import.meta.url)), "../supabase/functions/video-transcribe/index.ts"), "utf8");
  assert.match(src, /try \{ saved = await upsertRow\(built\.row, "ignore"\); \} catch \(e\) \{ if \(!isUniqueViolation\(e\)\) throw e; \}/);
}
