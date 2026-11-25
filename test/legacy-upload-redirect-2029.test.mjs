// S-56 (ZURIEL 25.11.2026): old WordPress image addresses go to their stored public copy in one permanent hop; nothing that no public Post
// shows becomes reachable, by any address or encoding, and a later publication change applies at once. Examples are real rows of media_migration_queue (read 25.11.2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { legacyUploadKey, legacyUploadTarget, legacyUploadPublicNow, LEGACY_UPLOAD_STORAGE } from "../public-reading-deploy/legacy-upload-redirect.js";

const shownNow = async () => true;
const allow = JSON.parse(readFileSync(new URL("../public-reading-deploy/legacy-upload-public-keys.json", import.meta.url), "utf8"));

test("the copy's name is the migration's own rule: first 16 hex of sha256(decoded path), lower-case extension", async () => {
  assert.equal(await legacyUploadKey("/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg"), "2016/09/03d475b5ed0008fe.jpg");
  // a Hebrew file name, in upper- and lower-case percent-encoding (WordPress links used both): the same file
  assert.equal(await legacyUploadKey("/wp-content/uploads/2013/11/%D7%AA%D7%9E%D7%95%D7%A0%D7%9410.png"), "2013/11/97132661cc7f5ce5.png");
  assert.equal(await legacyUploadKey("/wp-content/uploads/2013/11/%d7%aa%d7%9e%d7%95%d7%a0%d7%9410.png"), "2013/11/97132661cc7f5ce5.png");
  assert.equal(await legacyUploadKey("/wp-content/uploads/2014/01/%D7%A9%D7%A7%D7%95%D7%A4%D7%99%D7%AA1.jpg"), "2014/01/cc12c01be4278fb6.jpg");
  // a WordPress size variant leads to its original
  assert.equal(await legacyUploadKey("/wp-content/uploads/2016/09/FB_IMG_1461616903968-387x1024.jpg"), "2016/09/03d475b5ed0008fe.jpg");
});

test("only image addresses of the uploads folder are considered; anything else is not an old image address", async () => {
  for (const path of ["/wp-content/uploads/2016/09/doc.pdf", "/wp-content/uploads/2016/09/a/b.jpg", "/wp-content/uploads/../x.jpg",
    "/wp-content/uploads/2016/09/", "/wp-content/plugins/x.jpg", "/post/x", "/wp-content/uploads/2016/9/a.jpg", "/wp-content/uploads/2016/09/%E0%A4%A.jpg"])
    assert.equal(await legacyUploadKey(path), null, path);
});

test("one permanent hop to the stored public copy, only for an image a public Post shows", async () => {
  const keys = new Set(["2016/09/03d475b5ed0008fe.jpg"]);
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", { keys, publicNow: shownNow }), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg");
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2013/11/%D7%AA%D7%9E%D7%95%D7%A0%D7%9410.png", { keys, publicNow: shownNow }), null, "not on the public list: stays 404");
  assert.match(LEGACY_UPLOAD_STORAGE, /^https:\/\/linswmnnkjxvweumprav\.supabase\.co\/storage\/v1\/object\/public\/media\/uploads\/$/, "the final public object, not another redirect");
});

test("no address or encoding trick reaches a file outside the public list: the target is built from the hash, never from the request", async () => {
  const keys = new Set(["2016/09/03d475b5ed0008fe.jpg"]);
  const asked = [];
  const publicNow = async key => { asked.push(key); return true; };
  const tricks = [
    "/wp-content/uploads/2016/09/../../2016/09/FB_IMG_1461616903968.jpg", "/wp-content/uploads/2016/09/%2e%2e/%2e%2e/x.jpg",
    "/wp-content/uploads/2016/09/%2e%2e%2fx.jpg", "/wp-content/uploads/2016/09/%252e%252e%252fx.jpg", "/wp-content/uploads/2016/09/FB_IMG_1461616903968%252Ejpg",
    "/wp-content/uploads/2016/09/FB_IMG_1461616903968.JPG", "/wp-content/uploads/2016/09/fb_img_1461616903968.jpg", "/WP-CONTENT/UPLOADS/2016/09/FB_IMG_1461616903968.jpg",
    "/wp-content/uploads//2016/09/FB_IMG_1461616903968.jpg", "/wp-content/uploads/2016/09//FB_IMG_1461616903968.jpg", "/wp-content/uploads/2016/09/x%5c..%5cy.jpg",
    "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg%00.png", "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg%0a", "/wp-content/uploads/2016/09/03d475b5ed0008fe.jpg",
    "/wp-content/uploads/media/uploads/2016/09/03d475b5ed0008fe.jpg", "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg/", "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg.php",
    // the same Hebrew name in decomposed Unicode (NFD) and with an added invisible mark: different bytes, a different file
    "/wp-content/uploads/2013/11/" + encodeURIComponent("תמונה10".normalize("NFD") + "\u200f") + ".png",
    "/wp-content/uploads/2016/09/FB_IMG_1461616903968-0x0-1x1.jpg", "/wp-content/uploads/2016/09/FB_IMG_1461616903968-99999x99999.jpg",
  ];
  for (const path of tricks) {
    const target = await legacyUploadTarget(path, { keys, publicNow });
    assert.ok(target === null || target === LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg", `${path} → ${target}`);
  }
  for (const key of asked) assert.ok(keys.has(key), `the live check is asked only about listed keys: ${key}`);
  // whatever the request, the only possible targets are hashed names under media/uploads/ (no request text is copied into them)
  for (const path of ["/wp-content/uploads/2016/09/a.jpg", "/wp-content/uploads/2016/09/%D7%90.webp", "/wp-content/uploads/2016/09/x-1x1.GIF"]) {
    const key = await legacyUploadKey(path);
    assert.match(key, /^\d{4}\/\d{2}\/[0-9a-f]{16}\.(?:jpe?g|png|gif|webp)$/, path);
  }
});

test("future publication changes apply at once: a listed image whose Post is no longer public is not redirected; a failed check redirects nothing", async () => {
  const keys = new Set(["2016/09/03d475b5ed0008fe.jpg"]);
  const path = "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg";
  assert.equal(await legacyUploadTarget(path, { keys, publicNow: async () => false }), null, "withdrawn, tagged טיוטה/פורום or deleted after the list was built");
  await assert.rejects(legacyUploadTarget(path, { keys, publicNow: async () => { throw new Error("down"); } }), "the handler turns this into the existing 404");
  assert.equal(await legacyUploadTarget(path, { keys, publicNow: async () => "yes" }), null, "only an explicit true redirects");

  // the live read: the site's one public boundary, the exact stored name, the anonymous key, a bounded wait
  const seen = [];
  const fetchImpl = async (url, init) => { seen.push({ url: new URL(url), init }); return { ok: true, json: async () => [{ id: 1201 }] }; };
  assert.equal(await legacyUploadPublicNow("2016/09/03d475b5ed0008fe.jpg", { fetchImpl }), true);
  const { url, init } = seen[0];
  assert.equal(url.origin + url.pathname, "https://linswmnnkjxvweumprav.supabase.co/rest/v1/posts");
  assert.equal(url.searchParams.get("select"), "id"); assert.equal(url.searchParams.get("limit"), "1");
  assert.equal(url.searchParams.get("and"), '(or(tags.is.null,tags.not.ov.{טיוטה,פורום}),or(content.ilike."*/storage/v1/object/public/media/uploads/2016/09/03d475b5ed0008fe.jpg*",image_url.ilike."*/storage/v1/object/public/media/uploads/2016/09/03d475b5ed0008fe.jpg*"))');
  assert.match(init.headers.apikey, /^eyJ/); assert.ok(init.signal, "bounded wait");
  assert.doesNotMatch(JSON.stringify(init.headers), /service_role/);
  assert.equal(await legacyUploadPublicNow("2016/09/03d475b5ed0008fe.jpg", { fetchImpl: async () => ({ ok: true, json: async () => [] }) }), false, "no public Post shows it");
  await assert.rejects(legacyUploadPublicNow("2016/09/03d475b5ed0008fe.jpg", { fetchImpl: async () => ({ ok: false, status: 503 }) }));
  assert.equal(await legacyUploadPublicNow("2016/09/x*\",or(id.gt.0).jpg", { fetchImpl }), false, "nothing but a stored name reaches the filter");
  assert.equal(seen.length, 1);
});

test("the allow list is sorted, unique, hashed copies only, and holds the real examples", async () => {
  assert.equal(allow.schema, 1);
  assert.equal(allow.count, allow.keys.length);
  assert.deepEqual(allow.keys, [...new Set(allow.keys)].sort());
  for (const key of allow.keys) assert.match(key, /^\d{4}\/\d{2}\/[0-9a-f]{16}\.(?:jpe?g|png|gif|webp)$/, key);
  assert.ok(allow.keys.includes("2016/09/03d475b5ed0008fe.jpg"), "post 1201 image");
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", { publicNow: shownNow }), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg", "the real list loads lazily");
});

test("the document handler answers the old address before any document work, and reads the list only there", () => {
  const source = readFileSync(new URL("../public-reading-deploy/api/public-document.js", import.meta.url), "utf8");
  const branch = source.indexOf("if (path.startsWith(LEGACY_UPLOAD_PREFIX))");
  assert.ok(branch > 0 && branch < source.indexOf("metadataHandler("), "before metadata and article work");
  assert.match(source.slice(branch, branch + 1400), /res\.status\(308\)/);
  const module = readFileSync(new URL("../public-reading-deploy/legacy-upload-redirect.js", import.meta.url), "utf8");
  assert.doesNotMatch(module, /^import .*legacy-upload-public-keys/m, "the list is never a static import");
  assert.match(module, /import\("\.\/legacy-upload-public-keys\.json"/);
});

// End to end through the real document handler (needs the generated build receipt, like test/public-reading-asset-miss.test.mjs).
test("the document handler: a known old image is one 308 to the stored copy with no document work; an unknown one is unchanged", async () => {
  const { publicReadingDocumentHandler } = await import("../public-reading-deploy/api/public-document.js");
  const calls = { shell: 0, metadata: 0, fetch: 0 };
  const handler = publicReadingDocumentHandler({ authorized: () => true, indexable: origin => origin === "https://sod1820.co.il",
    readDocument: async () => { calls.shell++; return "<html><head></head><body><div id=\"root\"></div></body></html>"; },
    metadataHandler: async (_req, res) => { calls.metadata++; res.status(404).send("<head><title>x</title></head>"); } });
  const response = () => ({ headers: new Map(), code: null, body: "", setHeader(k, v) { this.headers.set(k.toLowerCase(), v); },
    status(code) { this.code = code; return this; }, send(value) { this.body = String(value); return this; } });
  // the live publication check is the only read: public now for the real image, and the call is counted
  let publicNow = true;
  const original = globalThis.fetch; globalThis.fetch = async url => { calls.fetch++;
    assert.match(String(url), /^https:\/\/linswmnnkjxvweumprav\.supabase\.co\/rest\/v1\/posts\?/);
    if (publicNow === "down") throw new Error("down");
    return { ok: true, json: async () => publicNow ? [{ id: 1201 }] : [] }; };
  try {
    for (const url of ["/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", "/wp-content/uploads/2016/09/FB_IMG_1461616903968-387x1024.jpg"]) {
      for (const method of ["GET", "HEAD"]) {
        const res = response(); await handler({ method, headers: { host: "sod1820.co.il" }, url, query: {} }, res);
        assert.equal(res.code, 308, url);
        assert.equal(res.headers.get("location"), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg", url);
        assert.equal(res.headers.get("cache-control"), "no-store", "the browser never keeps the redirect: a later publication change cannot be bypassed");
        assert.equal(res.headers.get("vercel-cdn-cache-control"), "max-age=300", "only the CDN keeps it, as long as a Post document, with no stale serving");
      }
    }
    assert.deepEqual(calls, { shell: 0, metadata: 0, fetch: 4 }, "no document or metadata work for a redirect; one publication check each");
    const res = response(); await handler({ method: "GET", headers: { host: "sod1820.co.il" }, url: "/wp-content/uploads/2024/02/logo.jpg", query: {} }, res);
    assert.equal(res.code, 404); assert.equal(res.headers.get("location"), undefined);
    assert.equal(calls.fetch, 4, "an address not on the list makes no read at all");
    for (const state of [false, "down"]) {
      publicNow = state;
      const res = response(); await handler({ method: "GET", headers: { host: "sod1820.co.il" }, url: "/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", query: {} }, res);
      assert.equal(res.code, 404, `publication ${state}: the existing not-found document`); assert.equal(res.headers.get("location"), undefined);
      assert.equal(res.headers.get("vercel-cdn-cache-control"), undefined, "a refusal is never kept by the CDN as a redirect");
    }
  } finally { globalThis.fetch = original; }
});
