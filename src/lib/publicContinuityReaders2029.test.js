import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  loadPublicOrGeulaCollection2029, loadPublicOrGeulaOccurrence2029, publicOrGeulaItem2029,
  loadPublicPeopleContinuation2029, loadPublicForumContinuation2029,
  loadPublicCommentPostContinuation2029, publicContinuityHttpStatus2029,
  publicContinuityPlaybackTime2029, publicOrGeulaOccurrenceHref2029,
  publicContinuityPage2029,
} from "./publicContinuityReaders2029.js";

const ID = "10000000-0000-4000-8000-000000000001";
const OTHER = "10000000-0000-4000-8000-000000000002";
const NOW = Date.parse("2026-11-03T06:00:00Z");
const MEDIA = "https://linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/media/public-clip.mp4";
const row = (patch = {}) => ({ id: ID, channel: "or-geula", status: "live", page_only: false, expires_at: null,
  created_at: "2026-11-01T10:00:00Z", text: "תיאור המקור", seo_title: "כותרת המקור", credit: "קרדיט המקור", speaker: "דובר",
  image_url: MEDIA, thumb_url: MEDIA.replace(".mp4", ".jpg"), ...patch });
const post = (patch = {}) => ({ id: 40, wp_id: 839, slug: "פוסט-מקורי", title: "הפוסט המקורי", source: "wordpress", tags: [], ...patch });
function fixture(rows, { error, onRead } = {}) {
  const calls = [];
  return { calls, readRows: async (table, params, options) => {
    calls.push({ table, params, options }); onRead?.();
    if (error) throw error;
    return typeof rows === "function" ? rows(table, params) : rows;
  } };
}

test("Or Geula continuation uses the exact public channel occurrence and preserves credit", async () => {
  const f = fixture([row()]);
  const result = await loadPublicOrGeulaOccurrence2029(ID, { readRows: f.readRows, now: NOW });
  assert.equal(result.status, "ready");
  assert.equal(result.item.id, ID);
  assert.equal(result.item.sourceRef, `channel_updates:${ID}`);
  assert.equal(result.item.occurrenceRef, result.item.sourceRef);
  assert.equal(result.item.credit, "קרדיט המקור");
  assert.equal(result.item.speaker, "דובר");
  assert.equal(result.item.href, `/or-geula/video/${ID}`);
  assert.equal(result.item.mediaHref, MEDIA);
  assert.equal(f.calls.length, 1);
  assert.equal(f.calls[0].table, "channel_updates");
  assert.equal(f.calls[0].params.id, `eq.${ID}`);
  assert.equal(f.calls[0].params.channel, "eq.or-geula");
  assert.equal(f.calls[0].params.status, "eq.live");
  assert.equal(f.calls[0].params.page_only, "eq.false");
  assert.match(f.calls[0].params.or, /expires_at\.gt\.2026-11-03T06:00:00\.000Z/);
  assert.doesNotMatch(f.calls[0].params.select, /metadata|user_id|topics|placements|enrichment/);
});

test("wrong channel, wrong occurrence, private, expired and page-only rows remain missing", async () => {
  for (const patch of [{ channel: "other" }, { id: OTHER }, { status: "draft" }, { status: "hidden" },
    { page_only: true }, { page_only: null }, { expires_at: "2026-11-03T06:00:00Z" }, { expires_at: "invalid" }, { created_at: "invalid" }]) {
    const f = fixture([row(patch)]);
    const result = await loadPublicOrGeulaOccurrence2029(ID, { readRows: f.readRows, now: NOW });
    assert.equal(result.status, "not-found", JSON.stringify(patch));
    assert.equal(result.item, null);
    assert.equal(publicContinuityHttpStatus2029(result), 404);
  }
  for (const id of ["", "arbitrary", `${ID}/extra`, "../private", "10000000-0000-0000-0000-000000000001"]) {
    const f = fixture([row()]);
    assert.equal((await loadPublicOrGeulaOccurrence2029(id, { readRows: f.readRows })).status, "not-found");
    assert.equal(f.calls.length, 0);
  }
});

test("only canonical public object media and redacted attribution reach the source DTO", () => {
  for (const href of [MEDIA + "?token=secret", MEDIA.replace("/public/", "/sign/"), MEDIA.replace("/public/", "/authenticated/"),
    "https://outside.example/video.mp4", "javascript:alert(1)"]) {
    const value = publicOrGeulaItem2029(row({ image_url: href, thumb_url: href, credit: "+972501234567", speaker: "private@example.invalid", metadata: { secret: true } }), { now: NOW });
    assert.equal(value.mediaHref, null); assert.equal(value.posterHref, null);
    assert.ok(!value.credit.includes("972")); assert.ok(!value.speaker.includes("@"));
    assert.ok(!("metadata" in value));
  }
  assert.equal(publicOrGeulaItem2029(row({ text: "", seo_title: "", image_url: null }), { now: NOW }), null);
  const text = publicOrGeulaItem2029(row({ text: "א".repeat(1300) }), { now: NOW });
  assert.equal(text.text.length, 1200); assert.equal(text.textTruncated, true);
});

test("collection reads a bounded stable page without changing occurrence identity", async () => {
  const rows = Array.from({ length: 19 }, (_, index) => row({ id: `10000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}` }));
  const f = fixture(rows);
  const result = await loadPublicOrGeulaCollection2029({ page: 3, readRows: f.readRows, now: NOW });
  assert.equal(result.items.length, 18); assert.equal(result.hasMore, true); assert.equal(result.page, 3);
  assert.equal(new Set(result.items.map(item => item.sourceRef)).size, 18);
  assert.equal(f.calls[0].params.limit, "19"); assert.equal(f.calls[0].params.offset, "36");
  assert.equal(f.calls[0].params.order, "created_at.desc,id.desc");
  assert.ok(!("id" in f.calls[0].params));
  const empty = await loadPublicOrGeulaCollection2029({ readRows: fixture([]).readRows });
  assert.equal(empty.status, "empty"); assert.equal(publicContinuityHttpStatus2029(empty), 200);
  const missing = await loadPublicOrGeulaCollection2029({ page: 2, readRows: fixture([]).readRows });
  assert.equal(missing.status, "not-found"); assert.equal(publicContinuityHttpStatus2029(missing), 404);
});

test("invalid, duplicate and out-of-range collection pages never become page one", async () => {
  for (const value of ["", "0", "-1", "1.5", "01", "1e2", "1001", ["1", "2"], [], "not-a-page"]) {
    assert.equal(publicContinuityPage2029(value), null);
    const f = fixture([row()]);
    const result = await loadPublicOrGeulaCollection2029({ page: value, readRows: f.readRows });
    assert.equal(result.status, "not-found"); assert.equal(f.calls.length, 0);
  }
  assert.equal(publicContinuityPage2029(null), 1);
  assert.equal(publicContinuityPage2029(["2"]), 2);
  const f = fixture([row()]);
  assert.equal((await loadPublicOrGeulaCollection2029({ page: null, readRows: f.readRows })).status, "not-found");
  assert.equal(f.calls.length, 0);
});

test("forum preserves its existing gate and reads no thread body or private account fields", async () => {
  const f = fixture([{ id: ID, status: "approved", body: "not projected" }]);
  const result = await loadPublicForumContinuation2029(ID, { readRows: f.readRows });
  assert.deepEqual(result, { status: "gated", exists: true });
  assert.deepEqual(f.calls[0].params, { select: "id,status", id: `eq.${ID}`, status: "eq.approved", limit: "1" });
  assert.equal(f.calls[0].table, "research_contributions");
  const root = fixture([]);
  assert.deepEqual(await loadPublicForumContinuation2029(null, { readRows: root.readRows }), { status: "gated", exists: null });
  assert.equal(root.calls.length, 0);
  for (const rows of [[], [{ id: OTHER, status: "approved" }], [{ id: ID, status: "pending" }], [{ id: ID, status: "published" }]]) {
    assert.equal((await loadPublicForumContinuation2029(ID, { readRows: fixture(rows).readRows })).status, "not-found");
  }
});

test("comment continuation re-admits its exact parent post and links to the canonical comments", async () => {
  const f = fixture([post()]);
  const result = await loadPublicCommentPostContinuation2029("839", { readRows: f.readRows });
  assert.equal(result.status, "ready");
  assert.equal(result.post.href, `/${encodeURIComponent("פוסט-מקורי")}#post-comments`);
  assert.equal(f.calls.length, 1); assert.equal(f.calls[0].table, "posts");
  assert.equal(f.calls[0].params.wp_id, "eq.839");
  assert.match(f.calls[0].params.or, /טיוטה/); assert.match(f.calls[0].params.or, /פורום/);
  for (const patch of [{ wp_id: 840 }, { tags: ["טיוטה"] }, { tags: ["פורום"] }, { slug: "" }]) {
    assert.equal((await loadPublicCommentPostContinuation2029("839", { readRows: fixture([post(patch)]).readRows })).status, "not-found");
  }
  const root = fixture([]);
  assert.deepEqual(await loadPublicCommentPostContinuation2029(null, { readRows: root.readRows }), { status: "scoped", post: null });
  assert.equal(root.calls.length, 0);
  const native = await loadPublicCommentPostContinuation2029(40000, { readRows: fixture([post({ source: "sod1820", wp_id: 40000 })]).readRows });
  assert.ok(native.post.href.startsWith("/post/"));
});

test("all public loaders keep failure distinct from missing or empty", async () => {
  const outage = new Error("synthetic outage");
  for (const load of [
    readRows => loadPublicOrGeulaOccurrence2029(ID, { readRows }),
    readRows => loadPublicOrGeulaCollection2029({ readRows }),
    readRows => loadPublicForumContinuation2029(ID, { readRows }),
    readRows => loadPublicCommentPostContinuation2029(839, { readRows }),
  ]) {
    await assert.rejects(load(fixture([], { error: outage }).readRows), /synthetic outage/);
    await assert.rejects(load(fixture(null).readRows), /invalid_public_continuation_response/);
  }
  assert.equal(publicContinuityHttpStatus2029({ status: "failed" }), 503);
  await assert.rejects(loadPublicPeopleContinuation2029({ peopleReader: async () => { throw outage; } }), /synthetic outage/);
  await assert.rejects(loadPublicPeopleContinuation2029({ peopleReader: async () => ({ people: null }) }), /invalid_public_people_response/);
});

test("cancellation before and after each read discards results", async () => {
  for (const load of [
    (readRows, signal) => loadPublicOrGeulaOccurrence2029(ID, { readRows, signal }),
    (readRows, signal) => loadPublicOrGeulaCollection2029({ readRows, signal }),
    (readRows, signal) => loadPublicForumContinuation2029(ID, { readRows, signal }),
    (readRows, signal) => loadPublicCommentPostContinuation2029(839, { readRows, signal }),
  ]) for (const before of [true, false]) {
    const controller = new AbortController();
    const f = fixture([], { onRead: () => controller.abort() });
    if (before) controller.abort();
    await assert.rejects(load(f.readRows, controller.signal), { name: "AbortError" });
    assert.equal(f.calls.length, before ? 0 : 1);
    if (!before) assert.equal(f.calls[0].options.signal, controller.signal);
  }
});

test("people use the existing public people projection and propagate cancellation", async () => {
  const people = [{ id: ID, slug: "public-person", displayName: "שם ציבורי", href: "/community/researcher/public-person" }];
  const controller = new AbortController();
  const result = await loadPublicPeopleContinuation2029({ signal: controller.signal, peopleReader: async options => {
    assert.equal(options.signal, controller.signal); return { people, total: 1 };
  } });
  assert.equal(result.people, people); assert.equal(result.total, 1);
  await assert.rejects(loadPublicPeopleContinuation2029({ signal: controller.signal, peopleReader: async () => {
    controller.abort(); return { people, total: 1 };
  } }), { name: "AbortError" });
});

test("exact media links retain repeated context, return and hash without granting exposure", () => {
  const href = publicOrGeulaOccurrenceHref2029(ID, { pathname: "/or-geula", search: `?v=${OTHER}&sourceRef=one&sourceRef=two&returnTo=%2Fpost%2Fpublic%23source&t=1m30s&token=private`, hash: "#source" });
  const parsed = new URL(href, "https://sod1820.co.il");
  assert.equal(parsed.pathname, `/or-geula/video/${ID}`);
  assert.deepEqual(parsed.searchParams.getAll("sourceRef"), ["one", "two"]);
  assert.equal(parsed.searchParams.get("returnTo"), "/post/public#source");
  assert.equal(parsed.hash, "#source"); assert.equal(parsed.searchParams.has("v"), false); assert.equal(parsed.searchParams.has("token"), false);
  assert.equal(publicContinuityPlaybackTime2029(parsed.search), 90);
  assert.equal(publicContinuityPlaybackTime2029("", "#t=45"), 45);
  assert.equal(publicContinuityPlaybackTime2029("?time=1h2m3s"), 3723);
  assert.equal(publicContinuityPlaybackTime2029("?t=-1"), 0);
  assert.equal(publicContinuityPlaybackTime2029("?t=Infinity"), 0);
  assert.equal(publicOrGeulaOccurrenceHref2029("unknown"), null);
});

test("continuation module is server-importable and UI mounts no legacy activity machinery", () => {
  const helper = readFileSync(new URL("./publicContinuityReaders2029.js", import.meta.url), "utf8");
  assert.doesNotMatch(helper, /^import .*supabase|^import .*researchViewMode|\.rpc\(|\.insert\(|\.update\(|query\.delete\(/m);
  const page = readFileSync(new URL("../pages/PublicContinuity2029Page.jsx", import.meta.url), "utf8");
  assert.doesNotMatch(page, /<iframe|<Discourse|<ForumFeed|<OrGeulaPage|<ResearchersIndexPage|\btrack\(|storyEvent|useAuth|markForumSeen/);
  // The one raw-HTML sink is the preserved historical lecture body (43a26b7ff). It is exactly one site, inside
  // HistoricalLecturesContent, fed only by the sanitising presentation adapter over the bundled page record,
  // never by a fetched, URL or user-supplied value. The "bundled" half is pinned below: the adapter's only
  // source is the static JSON import and the only value it parses is that record's html. This matters because
  // the sanitiser is a denylist; its safety rests on the input being these bundled records, so the data itself
  // is also checked for the vectors the denylist does not remove.
  assert.equal(page.match(/dangerouslySetInnerHTML/g).length, 1);
  const lectureStart = page.indexOf("function HistoricalLecturesContent()"), lectureEnd = page.indexOf("export default function PublicContinuity2029Page");
  assert.ok(lectureStart > -1 && lectureEnd > lectureStart);
  const lecture = page.slice(lectureStart, lectureEnd);
  assert.match(lecture, /const page = React\.useMemo\(\(\) => publicHistoricalLecturePage2029\(location\.pathname\), \[location\.pathname\]\);/);
  assert.match(lecture, /const html = React\.useMemo\(\(\) => historicalLectureHtml2029\(page\), \[page\]\);/);
  assert.match(lecture, /dangerouslySetInnerHTML=\{\{__html:html\}\}/);
  assert.match(helper, /^import historicalLecturePages from "\.\.\/data\/publicLegacyLecturePages2029\.json" with \{ type: "json" \};$/m);
  assert.match(helper, /template\.innerHTML = page\.html;/);
  const bundledLectures = JSON.parse(readFileSync(new URL("../data/publicLegacyLecturePages2029.json", import.meta.url), "utf8"));
  assert.ok(Array.isArray(bundledLectures) && bundledLectures.length > 0);
  for (const record of bundledLectures) {
    assert.doesNotMatch(String(record.html), /<svg|<math|xlink|formaction|javascript:|<script|srcdoc|[\s"'\/]on[a-z]+\s*=/i, `bundled lecture ${record.path} carries active content the denylist sanitiser does not remove`);
  }
  // ... and the adapter still neutralises active content: it removes script/object/embed/form/base/link/meta,
  // strips every on* handler and srcdoc, keeps only YouTube-identified frames (lazy, no-referrer, sandboxed,
  // src withheld until the viewer opens them) and drops non-http(s) link targets.
  assert.match(helper, /querySelectorAll\("script,style,object,embed,form,base,link,meta"\)\) unsafe\.remove\(\)/);
  assert.match(helper, /\/\^on\/i\.test\(attr\.name\) \|\| attr\.name === "srcdoc"\) node\.removeAttribute\(attr\.name\)/);
  assert.match(helper, /if \(!item\) \{ frame\.remove\(\); continue; \}/);
  assert.match(helper, /\[A-Za-z0-9_-\]\{11\}/);
  assert.match(helper, /frame\.setAttribute\("referrerpolicy","no-referrer"\)/);
  assert.match(helper, /frame\.setAttribute\("sandbox","/);
  assert.match(helper, /frame\.removeAttribute\("src"\); frame\.dataset\.videoSrc=embed\.href/);
  assert.match(helper, /!\/\^https\?:\$\/\.test\(url\.protocol\) \|\| url\.username \|\| url\.password\) link\.removeAttribute\("href"\)/);
  assert.match(page, /openIssueReport\(\)/);
  assert.match(page, /controller\.abort\(\)/);
  assert.match(page, /data-read-state=\{state\}/);
});
