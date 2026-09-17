import assert from "node:assert/strict";
import { buildUploadIntent, mayVerifyPath, validateDeclaredFile, SIX_MIB } from "../supabase/functions/media-upload-intent/contract.mjs";
import { encodeTusMetadata, TUS_CHUNK_SIZE, TUS_VERSION, uploadResumableMedia } from "../src/lib/mediaResumableUpload.js";

const USER = "11111111-1111-4111-8111-111111111111";
const CONTRIBUTOR = "22222222-2222-4222-8222-222222222222";
const ID = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-09-17T12:00:00Z");
const idFactory = () => ID;

const accountImage = buildUploadIntent({ scope: "submission", kind: "image", mime: "image/png", size: 1024, filename: "image.png", userId: USER, now: NOW, idFactory });
assert.equal(accountImage.bucket, "submission-inbox");
assert.equal(accountImage.path, `sod1820/2029/accounts/${USER}/2026/09/${ID}/image/original.png`);
assert.equal(accountImage.transport, "tus");

const contributorVideo = buildUploadIntent({ scope: "submission", kind: "video", mime: "video/mp4", size: SIX_MIB + 1, filename: "clip.mp4", userId: USER, contributorId: CONTRIBUTOR, now: NOW, idFactory });
assert.equal(contributorVideo.path, `sod1820/2029/contributors/${CONTRIBUTOR}/2026/09/${ID}/video/original.mp4`);

const publicVideo = buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: 10 * 1024 * 1024, filename: "movie.mp4", userId: USER, isAdmin: true, now: NOW, idFactory });
assert.equal(publicVideo.path, `sod1820/2029/video/2026/09/${ID}/original.mp4`);
assert.throws(() => buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: 100, filename: "x.mp4", userId: USER, isAdmin: false, idFactory }), /admin_required/);
assert.throws(() => validateDeclaredFile({ kind: "video", mime: "video/mp4", size: 100, filename: "x.exe" }), /extension_mismatch/);
assert.throws(() => validateDeclaredFile({ kind: "video", mime: "video/mp4", size: 3 * 1024 * 1024 * 1024, filename: "x.mp4" }), /invalid_size/);
assert.equal(mayVerifyPath({ scope: "submission", path: accountImage.path, userId: USER }), true);
assert.equal(mayVerifyPath({ scope: "submission", path: `sod1820/2029/accounts/${CONTRIBUTOR}/x`, userId: USER }), false);
assert.equal(mayVerifyPath({ scope: "public", path: publicVideo.path, userId: USER, isAdmin: false }), false);
assert.equal(mayVerifyPath({ scope: "public", path: publicVideo.path, userId: USER, isAdmin: true }), true);

const metadata = encodeTusMetadata({ bucketName: "media", objectName: publicVideo.path, contentType: "video/mp4" });
assert.match(metadata, /^bucketName /);
assert.equal(TUS_CHUNK_SIZE, 6 * 1024 * 1024);
assert.equal(TUS_VERSION, "1.0.0");

const total = TUS_CHUNK_SIZE + 16;
const file = new Blob([new Uint8Array(total)], { type: "video/mp4" });
const intent = { bucket: "media", path: publicVideo.path, mime: "video/mp4", size: total, signed_upload: { token: "signed-token" }, tus: { endpoint: "https://project.storage.supabase.co/storage/v1/upload/resumable", chunk_size: TUS_CHUNK_SIZE, metadata: { bucketName: "media", objectName: publicVideo.path, contentType: "video/mp4" } } };
const originalFetch = globalThis.fetch;
let serverOffset = 0;
let firstPatch = true;
let secondPatchOffset = null;
globalThis.fetch = async (url, options = {}) => {
  const method = options.method || "GET";
  if (method === "POST") return new Response(null, { status: 201, headers: { location: "https://upload.test/tus/1", "upload-offset": "0" } });
  if (method === "HEAD") return new Response(null, { status: 204, headers: { "upload-offset": String(serverOffset) } });
  if (method === "PATCH") {
    const sentOffset = Number(options.headers["Upload-Offset"]);
    if (firstPatch) { firstPatch = false; assert.equal(sentOffset, 0); serverOffset = TUS_CHUNK_SIZE; throw new TypeError("simulated lost response"); }
    secondPatchOffset = sentOffset; assert.equal(sentOffset, TUS_CHUNK_SIZE); assert.equal(options.body.size, 16); serverOffset = total;
    return new Response(null, { status: 204, headers: { "upload-offset": String(total) } });
  }
  throw new Error(`unexpected fetch ${method} ${url}`);
};
try {
  const uploaded = await uploadResumableMedia(file, intent, { retryDelays: [0, 0] });
  assert.equal(uploaded.ok, true);
  assert.equal(secondPatchOffset, TUS_CHUNK_SIZE);
} finally { globalThis.fetch = originalFetch; }

console.log("G3 media upload runtime acceptance: PASS");
