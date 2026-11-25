// S-56 (ZURIEL 25.11.2026): old WordPress image addresses go to their stored public copy in one permanent hop; nothing that no public Post
// shows becomes reachable. Examples are real rows of media_migration_queue (read 25.11.2026).
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { legacyUploadKey, legacyUploadTarget, LEGACY_UPLOAD_STORAGE } from "../public-reading-deploy/legacy-upload-redirect.js";

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
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", { keys }), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg");
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2013/11/%D7%AA%D7%9E%D7%95%D7%A0%D7%9410.png", { keys }), null, "not on the public list: stays 404");
  assert.match(LEGACY_UPLOAD_STORAGE, /^https:\/\/linswmnnkjxvweumprav\.supabase\.co\/storage\/v1\/object\/public\/media\/uploads\/$/, "the final public object, not another redirect");
});

test("the allow list is sorted, unique, hashed copies only, and holds the real examples", async () => {
  assert.equal(allow.schema, 1);
  assert.equal(allow.count, allow.keys.length);
  assert.deepEqual(allow.keys, [...new Set(allow.keys)].sort());
  for (const key of allow.keys) assert.match(key, /^\d{4}\/\d{2}\/[0-9a-f]{16}\.(?:jpe?g|png|gif|webp)$/, key);
  assert.ok(allow.keys.includes("2016/09/03d475b5ed0008fe.jpg"), "post 1201 image");
  assert.equal(await legacyUploadTarget("/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg"), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg", "the real list loads lazily");
});

test("the document handler answers the old address before any document work, and reads the list only there", () => {
  const source = readFileSync(new URL("../public-reading-deploy/api/public-document.js", import.meta.url), "utf8");
  const branch = source.indexOf("if (path.startsWith(LEGACY_UPLOAD_PREFIX))");
  assert.ok(branch > 0 && branch < source.indexOf("metadataHandler("), "before metadata and article work");
  assert.match(source.slice(branch, branch + 900), /res\.status\(308\)/);
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
  const original = globalThis.fetch; globalThis.fetch = async () => { calls.fetch++; throw new Error("no data read"); };
  try {
    for (const url of ["/wp-content/uploads/2016/09/FB_IMG_1461616903968.jpg", "/wp-content/uploads/2016/09/FB_IMG_1461616903968-387x1024.jpg"]) {
      for (const method of ["GET", "HEAD"]) {
        const res = response(); await handler({ method, headers: { host: "sod1820.co.il" }, url, query: {} }, res);
        assert.equal(res.code, 308, url);
        assert.equal(res.headers.get("location"), LEGACY_UPLOAD_STORAGE + "2016/09/03d475b5ed0008fe.jpg", url);
        assert.match(res.headers.get("cache-control"), /^public, /, url);
      }
    }
    assert.deepEqual(calls, { shell: 0, metadata: 0, fetch: 0 }, "no document, metadata or data work for a redirect");
    const res = response(); await handler({ method: "GET", headers: { host: "sod1820.co.il" }, url: "/wp-content/uploads/2024/02/logo.jpg", query: {} }, res);
    assert.equal(res.code, 404); assert.equal(res.headers.get("location"), undefined);
  } finally { globalThis.fetch = original; }
});
