import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { publicReadingContinuation, publicReadingPath } from "../src/lib/publicReadingRelease2029.js";
import { requestedPublicInsight2029, readPublicInsight2029 } from "../src/lib/publicInsightReading2029.js";
import { publicReadingDocumentHandler } from "../public-reading-deploy/api/public-document.js";

const id = "3d53f034-e3c4-4c7c-8851-5777d479592c";
const href = "/findings?insight=" + id;
const old = "?tool=midrash&tab=community&insight=" + id;
const row = { id, title: "כותרת מקור", body: "טקסט מקור", space: "core", is_active: true, tags: ["חידושי גולשים"], forum_hidden: "true" };

test("the historical Midrash selection keeps its record, tracking and fragment without opening a workspace", () => {
  assert.equal(publicReadingContinuation("/research", old + "&utm_source=share", "#comm-" + id), href + "&utm_source=share#comm-" + id);
  for (const query of [old + "&mode=private", old + "&insight=" + id, old.replace("midrash", "other"), old.replace(id, "unrecognized")]) {
    assert.equal(publicReadingContinuation("/research", query), null);
    assert.equal(publicReadingPath("/research", { search: query }), "closed");
  }
  assert.equal(requestedPublicInsight2029(new URLSearchParams(href.split("?")[1])), id);
  for (const query of ["insight=bad", "insight=" + id + "&insight=" + id, "mode=workspace&insight=" + id]) {
    assert.equal(requestedPublicInsight2029(new URLSearchParams(query)), null);
  }
});

test("the exact read accepts published sources and excludes drafts, withdrawn items and private records", async () => {
  const found = await readPublicInsight2029(path => {
    const url = new URL(path, "https://fixture.invalid/");
    assert.equal(url.pathname, "/insights");
    for (const [key, expected] of Object.entries({ id: "eq." + id, is_active: "eq.true", space: "in.(core,lab)", "panel_data->>privacy_owner_user_id": "is.null", limit: "1" })) {
      assert.equal(url.searchParams.get(key), expected);
    }
    assert.match(url.searchParams.get("and"), /טיוטה,פרטי/);
    return [row];
  }, id);
  assert.deepEqual(found, { id, title: row.title, body: row.body, href });
  assert.ok(await readPublicInsight2029(() => [{ ...row, tags: null, forum_hidden: false }], id));
  for (const changed of [{ id: "unrelated" }, { space: "private" }, { is_active: false }, { tags: ["טיוטה"] }, { tags: ["פרטי"] }, { tags: [], forum_hidden: "true" }, { body: " " }]) {
    assert.equal(await readPublicInsight2029(() => [{ ...row, ...changed }], id), null);
  }
  assert.equal(await readPublicInsight2029(() => { throw Error("unexpected source read"); }, "bad"), null);
});

test("the public HTTP document includes the original finding or a genuine missing/unavailable status", async () => {
  const original = globalThis.fetch, origin = "https://sod1820.co.il";
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: () => true,
    readDocument: async () => readFileSync(new URL("../public-reading-deploy/.generated/2029.html", import.meta.url), "utf8") });
  async function probe(path) {
    const url = new URL(path, origin);
    const res = { headers: new Map(), setHeader(k,v) { this.headers.set(k.toLowerCase(), v); }, status(code) { this.code = code; return this; }, send(body) { this.body = String(body); } };
    await handler({ method: "GET", url: path, headers: { host: "sod1820.co.il" }, query: { path: url.pathname, ...Object.fromEntries(url.searchParams) } }, res);
    return res;
  }
  try {
    globalThis.fetch = async input => {
      assert.equal(new URL(input).pathname, "/rest/v1/insights");
      return Response.json([row]);
    };
    const redirect = await probe("/research" + old);
    assert.equal(redirect.code, 308); assert.equal(redirect.headers.get("location"), href);
    const good = await probe(href);
    assert.equal(good.code, 200); assert.equal(good.headers.get("x-sod-first-words"), "served");
    assert.equal(good.headers.get("x-robots-tag"), "index, follow");
    assert.ok(good.body.includes('rel="canonical" href="' + origin + href + '"'));
    assert.ok(good.body.includes(row.title) && good.body.includes(row.body));
    const tracked = await probe(href + "&utm_source=share");
    assert.equal(tracked.code, 200); assert.match(tracked.headers.get("x-robots-tag"), /noindex/);
    globalThis.fetch = async () => Response.json([]);
    const absent = await probe(href);
    assert.equal(absent.code, 404); assert.match(absent.headers.get("x-robots-tag"), /noindex/);
    assert.ok(!absent.body.includes(row.body));
    globalThis.fetch = async () => { throw Error("source unavailable"); };
    assert.equal((await probe(href)).code, 503);
    assert.equal((await probe("/findings?insight=bad")).code, 404);
    assert.equal((await probe("/research?mode=private")).code, 503);
  } finally { globalThis.fetch = original; }
});
