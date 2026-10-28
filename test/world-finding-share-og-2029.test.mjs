import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import handler from "../api/og.js";
import {
  worldFindingShareCard,
  worldFindingPublicShare,
  worldFindingFollowTarget,
  WORLD_FINDING_SHARE_ORIGIN,
} from "../src/lib/research/worldFindingShare.js";

const ID = "da13e802-aaaa-4a41-82d1-123456789abc";
const PUBLIC_HREF = `/world?finding=${ID}#finding-${ID}`;
const publicFinding = {
  family: "research_object", access: "public", status: "approved", sourceId: ID,
  canonicalFindingHref: PUBLIC_HREF,
  statement: "ממצא ציבורי אמיתי", typeLabel: "תצפית", sourceLabel: "פוסט מקור",
  attributionLabel: "תווית ייחוס במקור: צוריאל · זהות המחבר לא הוכרעה",
};
const row = {
  id: ID, statement: "מקור הפנימי אינו כותרת", kind: "observation",
  source: "posts", source_ref: "posts:5123", contributor: "ZURIEL",
  status: "approved", privacy_scope: "public",
  meta: { ext: { presentation: { variants: { he: {
    title: publicFinding.statement, summary: "משפט קצר ומדויק" } } } } },
};
const jsonResponse = (data, status = 200) => ({
  ok: status >= 200 && status < 300, status, json: async () => data,
});
async function ogResponse(query, resolveRow) {
  const oldFetch = globalThis.fetch;
  const called = [];
  globalThis.fetch = async (input) => {
    const url = String(input);
    called.push(url);
    if (url.includes("/rest/v1/site_flags?")) return jsonResponse([]);
    if (url.includes("/rest/v1/research_objects?")) return jsonResponse(resolveRow ? [resolveRow] : []);
    if (url.includes("/rest/v1/channel_updates?")) return jsonResponse([{ id: "source", status: "live", channel: "sources" }]);
    throw new Error("Unrecognized network request: " + url);
  };
  const res = {
    headers: {},
    statusCode: 0,
    setHeader(k, v) { this.headers[k.toLowerCase()] = v; },
    status(n) { this.statusCode = n; return this; },
    send(html) { this.html = html; return this; },
  };
  try { await handler({ query }, res); return { ...res, called }; }
  finally { globalThis.fetch = oldFetch; }
}

test("share uses *reader-provided* exact public href and existing 1200×630 branded card", () => {
  const share = worldFindingPublicShare(publicFinding);
  assert.equal(share.url, WORLD_FINDING_SHARE_ORIGIN + PUBLIC_HREF);
  assert.equal(share.title, publicFinding.statement);
  assert.match(share.image, /\/api\/card\?/);
  const card = new URL(share.image);
  assert.equal(card.searchParams.get("sig"), "finding");
  assert.match(card.searchParams.get("sub"), /תצפית.*פוסט מקור/);
  assert.match(card.searchParams.get("cap"), /תווית ייחוס/);
  assert.equal(worldFindingShareCard({ title: "" }), null);
  const cardSource = readFileSync(new URL("../api/card.js", import.meta.url), "utf8");
  assert.match(cardSource, /const W = story \? 1080 : 1200/);
  assert.match(cardSource, /const H = story \? 1920 : 630/);
  assert.match(cardSource, /sig === 'finding' \? 'ממצא · מקור · מחקר'/);
});

test("private, draft, unrelated id, admin and forged outbound URLs cannot be shared", () => {
  const nope = [
    { ...publicFinding, access: "private" },
    { ...publicFinding, status: "draft" },
    { ...publicFinding, sourceId: "admin-raw-id" },
    { ...publicFinding, canonicalFindingHref: "/world?finding=" + ID + "&admin=1#finding-" + ID },
    { ...publicFinding, canonicalFindingHref: "/research?finding=" + ID },
    { ...publicFinding, canonicalFindingHref: "https://bad.example/world?finding=" + ID },
    { ...publicFinding, canonicalFindingHref: null },
  ];
  for (const finding of nope) assert.equal(worldFindingPublicShare(finding), null);
});

test("WatchButton target is only a linked approved canonical Topic; sharing never follows", () => {
  assert.equal(worldFindingFollowTarget(publicFinding), null);
  const rating = { status: "approved", slug: "india-axis", title: "הודו", href: "/topic/india-axis" };
  const allowed = worldFindingFollowTarget({ ...publicFinding, linkedTopicRating: rating });
  assert.deepEqual(allowed, { topic: "topic:india-axis", title: "הודו", href: "/topic/india-axis" });
  assert.equal(worldFindingFollowTarget({ ...publicFinding, linkedTopicRating: { ...rating, status: "draft" } }), null);
  assert.equal(worldFindingFollowTarget({ ...publicFinding, linkedTopicRating: { ...rating, href: "/admin" } }), null);
  assert.equal(worldFindingFollowTarget({ ...publicFinding, linkedTopicRating: { ...rating, slug: "admin?scope=all" } }), null);
});

test("OG exact finding preview uses anonymous approved/public row, real title, credit and canonical hash", async () => {
  const { html, headers, called } = await ogResponse({ path: "/world", finding: ID }, row);
  assert.match(html, /ממצא ציבורי אמיתי/);
  assert.match(html, /פוסטים/);
  assert.match(html, /תווית ייחוס במקור/);
  assert.match(html, /og:image:width" content="1200"/);
  assert.match(html, /og:image:height" content="630"/);
  assert.match(html, /\/api\/card\?/);
  assert.match(html, /og:url" content="https:\/\/sod1820.co.il\/world\?finding=/);
  assert.equal(headers["cache-control"], "no-store");
  const query = called.find(x => x.includes("/rest/v1/research_objects?"));
  assert.match(query, /privacy_scope=eq.public/);
  assert.match(query, /status=in\.\(approved,canonical\)/);
  assert.doesNotMatch(html, /מקור הפנימי אינו כותרת/);
});

test("non-public, missing or excluded finding fails closed, without identifier or private text", async () => {
  for (const badRow of [
    null,
    { ...row, privacy_scope: "private", statement: "TOP_SECRET_CONTENT" },
    { ...row, status: "draft", statement: "TOP_SECRET_CONTENT" },
    { ...row, meta: { ext: { personal_scope: { scope: "person_only" } } }, statement: "TOP_SECRET_CONTENT" },
    { ...row, source: "openweb_legacy", statement: "TOP_SECRET_CONTENT" },
  ]) {
    const response = await ogResponse({ path: "/world", finding: ID }, badRow);
    assert.match(response.html, /noindex, nofollow/);
    assert.match(response.html, /הממצא המבוקש אינו זמין/);
    assert.doesNotMatch(response.html, new RegExp(ID));
    assert.doesNotMatch(response.html, /TOP_SECRET_CONTENT/);
  }
});

test("OG accepts direct path query, and ignores invalid id without querying private storage", async () => {
  const direct = await ogResponse({ path: "/world?finding=" + ID }, row);
  assert.match(direct.html, /ממצא ציבורי אמיתי/);
  const invalid = await ogResponse({ path: "/world", finding: "admin-secret-id" }, row);
  assert.match(invalid.html, /noindex, nofollow/);
  assert.ok(!invalid.called.some(x => x.includes("/rest/v1/research_objects?")));
});

test("World only mounts the shared controls inside public focus, without follow on share callback", () => {
  const page = readFileSync(new URL("../src/pages/World2029Page.jsx", import.meta.url), "utf8");
  const publicFocus = page.split("function PublicWorldFindingFocus")[1].split("function LiveWorldLanding")[0];
  assert.match(publicFocus, /worldFindingPublicShare\(finding\)/);
  assert.match(publicFocus, /<ShareActions\s+type="finding"/);
  assert.match(publicFocus, /channels=\{\["native", "copy"\]\}/);
  assert.match(publicFocus, /<WatchButton topic=\{linkedFollow\.topic\}/);
  assert.match(publicFocus, /noPush compact ghost/);
  assert.doesNotMatch(publicFocus, /onShare=.*[Ff]ollow|onShare=.*[Ww]atch/);
});

test("public reader ignores numeric/namespaced entity targets in UUID Topic filter but keeps documented slug", async () => {
  const { fetchWorldPublicFindingById } = await import("../src/lib/research/worldPublicFindingReader.js");
  const uuidTarget = "aeb9b6ba-9c2b-4792-8ae7-a5c577f62717";
  const targetFilters = [];
  const research = {
    ...row,
    meta: { ext: { wa_channel_intake: { tree_matches: [
      { type: "number", key: "476" },
      { type: "entity", key: "gw:missing-uuid" },
      { type: "number", key: uuidTarget },
      { type: "topic", key: "india-axis" },
    ] } } },
  };
  const byTable = {
    research_objects: { data: research, error: null },
    topic_cards: { data: [{ id: "a238cb3e-ff78-4f68-ad00-4bd2f3640083", slug: "india-axis",
      title: "הודו", status: "approved", node_id: uuidTarget }], error: null },
  };
  const fakeClient = {
    from(table) {
      const builder = {
        select() { return builder; },
        eq() { return builder; },
        in() { return builder; },
        or(filter) { targetFilters.push(filter); return builder; },
        limit() { return builder; },
        maybeSingle() { return Promise.resolve(byTable[table] || { data: null, error: null }); },
        then(resolve, reject) { return Promise.resolve(byTable[table] || { data: [], error: null }).then(resolve, reject); },
      };
      return builder;
    },
  };
  const finding = await fetchWorldPublicFindingById(ID, { publicClient: () => fakeClient, cache: false });
  assert.ok(finding);
  assert.equal(finding.linkedTopicRating?.slug, "india-axis");
  assert.deepEqual(worldFindingFollowTarget(finding), {
    topic: "topic:india-axis", title: "הודו", href: "/topic/india-axis",
  });
  assert.equal(targetFilters.length, 1);
  assert.match(targetFilters[0], /slug\.in\.\("india-axis"\)/);
  assert.match(targetFilters[0], /node_id\.in\.\("aeb9b6ba-/);
  assert.doesNotMatch(targetFilters[0], /476|gw:/);
});
