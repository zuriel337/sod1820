// Evidence-tool input rules for the Home runner: corpus admission over the shared snapshot decoder, image decodability, safe miss digests.
// No browser, no network. The legacy corpus (docs/perf-evidence-20261015) is read as a repository file only to prove why it is not accepted.
import test from "node:test";
import assert from "node:assert/strict";
import { createRequire } from "node:module";
import { readFileSync } from "node:fs";
import zlib from "node:zlib";
import { admitCorpus, corpusImageReport, imageProblem, isImageEntry, missDigest, requestShape } from "../docs/perf-evidence-20261016/home-stability-v3/fixtures.mjs";

const require = createRequire(import.meta.url);
const { decodeSnapshot } = require("../scripts/ci-isolation/snapshot-contract.cjs");
const SB = "https://linswmnnkjxvweumprav.supabase.co";

const png = Buffer.concat([Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 13]), Buffer.from("IHDR"), Buffer.from([0, 0, 0, 1, 0, 0, 0, 1, 8, 6, 0, 0, 0]), Buffer.alloc(8)]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xc0, 0x00, 0x11, 0x08, 0x00, 0x01, 0x00, 0x05, 0x03, 0x01, 0x11, 0x00, 0x02, 0x11, 0x01, 0x03, 0x11, 0x01, 0xff, 0xd9]);
const gif = Buffer.from("GIF89a\u0001\u0000\u0001\u0000", "latin1");
const webp = Buffer.concat([Buffer.from("RIFF"), Buffer.from([4, 0, 0, 0]), Buffer.from("WEBPVP8 ")]);
const svg = Buffer.from('<svg xmlns="http://www.w3.org/2000/svg" width="1" height="1"/>');
// What a text conversion does to binary bytes: every invalid UTF-8 byte becomes U+FFFD (EF BF BD).
const throughText = (bytes) => Buffer.from(bytes.toString("utf8"), "utf8");
const row = (bytes, type = "image/png") => ({ status: 200, body: bytes.toString("base64"), type });

test("decodable image bytes of every common format are accepted", () => {
  for (const [name, bytes] of Object.entries({ png, jpeg, gif, webp, svg })) assert.equal(imageProblem(bytes), null, name);
});

test("bytes that went through a text conversion, empty bodies, unknown signatures and cut headers are not images", () => {
  assert.equal(imageProblem(throughText(png)), "utf8-replacement-characters");
  assert.equal(imageProblem(throughText(jpeg)), "utf8-replacement-characters");
  assert.equal(imageProblem(Buffer.alloc(0)), "empty-body");
  assert.equal(imageProblem(Buffer.from("not an image at all")), "unknown-signature");
  assert.equal(imageProblem(jpeg.subarray(0, 6)), "jpeg-header");
  assert.equal(imageProblem(png.subarray(0, 14)), "png-header");
});

test("an image entry is recognised by type, by extension and by the render endpoint", () => {
  assert.equal(isImageEntry(`GET ${SB}/storage/v1/object/public/gallery/a.jpg `, { type: "application/octet-stream" }), true);
  assert.equal(isImageEntry(`GET ${SB}/storage/v1/render/image/public/gallery/a?width=768 `, {}), true);
  assert.equal(isImageEntry(`GET ${SB}/rest/v1/posts?select=* `, { type: "image/webp" }), true);
  assert.equal(isImageEntry(`GET ${SB}/rest/v1/posts?select=* `, { type: "application/json" }), false);
});

test("admission blocks a corpus with one broken image, and reports counts and shapes only", () => {
  const good = { [`GET ${SB}/storage/v1/object/public/gallery/ok.png `]: row(png) };
  assert.deepEqual(admitCorpus(good), { images: 1, problems: [] });
  const bad = { ...good, [`GET ${SB}/storage/v1/object/public/gallery/secret-slug.jpg `]: row(throughText(jpeg), "image/jpeg") };
  assert.throws(() => admitCorpus(bad), (error) => {
    assert.equal(error.code, "CORPUS_IMAGES_NOT_DECODABLE");
    assert.match(error.message, /^BLOCKED: 1 of 2 image responses/);
    assert.doesNotMatch(error.message, /secret-slug/, "identifiers are not part of the message");
    assert.deepEqual(error.report.problems, [{ shape: `GET linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/secret-slug.jpg`, status: 200, reason: "utf8-replacement-characters" }]);
    return true;
  });
});

test("the legacy corpus is refused by the shared decoder, and its 18 images are exactly the undecodable ones", () => {
  const legacy = readFileSync(new URL("../docs/perf-evidence-20261015/scroll-integration/fixtures-combined.json.gz", import.meta.url));
  assert.throws(() => decodeSnapshot(legacy), /Noncanonical or corrupted response body/, "string bodies are not canonical Base64: not admitted by the shared mechanism");
  // Re-expressing the legacy bodies the only way a UTF-8 string can be (what the old runner sent) reproduces the defect from the file itself.
  const asBytes = Object.fromEntries(Object.entries(JSON.parse(zlib.gunzipSync(legacy))).map(([key, value]) => [key, { status: value.status, type: value.ct, body: Buffer.from(value.body, "utf8").toString("base64") }]));
  assert.equal(Object.keys(asBytes).length, 106);
  const report = corpusImageReport(asBytes);
  assert.equal(report.images, 18);
  assert.equal(report.problems.length, 18);
  assert.deepEqual([...new Set(report.problems.map((problem) => problem.reason))], ["utf8-replacement-characters"]);
  assert.throws(() => admitCorpus(asBytes), /BLOCKED: 18 of 18 image responses/);
});

test("a miss digest carries a count, a digest and shapes, never request values", () => {
  const keys = [`GET ${SB}/rest/v1/posts?select=*&slug=in.(matrix-506)&limit=1 `, `GET ${SB}/rest/v1/posts?select=*&slug=in.(other-private-slug)&limit=1 `, `GET ${SB}/storage/v1/object/public/gallery/x.png `];
  const digest = missDigest(keys);
  assert.equal(digest.count, 3);
  assert.match(digest.sha256, /^[0-9a-f]{64}$/);
  assert.deepEqual(digest.shapes, [{ shape: "GET linswmnnkjxvweumprav.supabase.co/rest/v1/posts?limit&select&slug", n: 2 }, { shape: "GET linswmnnkjxvweumprav.supabase.co/storage/v1/object/public/gallery/x.png", n: 1 }]);
  assert.doesNotMatch(JSON.stringify(digest), /matrix-506|other-private-slug/);
  assert.equal(missDigest([...keys].reverse()).sha256, digest.sha256, "order independent");
  assert.notEqual(missDigest(keys.slice(1)).sha256, digest.sha256);
  assert.equal(requestShape("garbage"), "unparsed");
});
