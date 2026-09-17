import assert from "node:assert/strict";
import { buildUploadIntent, mayVerifyPath, validateDeclaredFile, SIX_MIB } from "./contract.mjs";

const USER = "11111111-1111-4111-8111-111111111111";
const CONTRIBUTOR = "22222222-2222-4222-8222-222222222222";
const ID1 = "33333333-3333-4333-8333-333333333333";
const NOW = new Date("2026-09-17T12:00:00Z");

const small = buildUploadIntent({ scope: "submission", kind: "image", mime: "image/png", size: 1024, filename: "x.png", userId: USER, now: NOW, idFactory: () => ID1 });
assert.equal(small.bucket, "submission-inbox");
assert.equal(small.transport, "signed");
assert.equal(small.path, `sod1820/2029/accounts/${USER}/2026/09/${ID1}/image/original.png`);

const contributor = buildUploadIntent({ scope: "submission", kind: "video", mime: "video/mp4", size: SIX_MIB + 1, filename: "x.mp4", userId: USER, contributorId: CONTRIBUTOR, now: NOW, idFactory: () => ID1 });
assert.equal(contributor.transport, "tus");
assert.equal(contributor.path, `sod1820/2029/contributors/${CONTRIBUTOR}/2026/09/${ID1}/video/original.mp4`);

const pub = buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: SIX_MIB + 1, filename: "movie.mp4", userId: USER, isAdmin: true, now: NOW, idFactory: () => ID1 });
assert.equal(pub.bucket, "media");
assert.equal(pub.path, `sod1820/2029/video/2026/09/${ID1}/original.mp4`);
assert.equal(pub.transport, "tus");

assert.throws(() => buildUploadIntent({ scope: "public", kind: "video", mime: "video/mp4", size: 10, filename: "x.mp4", userId: USER, isAdmin: false, idFactory: () => ID1 }), /admin_required/);
assert.throws(() => validateDeclaredFile({ kind: "video", mime: "video/mp4", size: 10, filename: "x.exe" }), /extension_mismatch/);
assert.throws(() => validateDeclaredFile({ kind: "video", mime: "application/x-msdownload", size: 10, filename: "x.exe" }), /unsupported_mime/);
assert.throws(() => validateDeclaredFile({ kind: "video", mime: "video/mp4", size: 3 * 1024 * 1024 * 1024, filename: "x.mp4" }), /invalid_size/);

assert.equal(mayVerifyPath({ scope: "submission", path: small.path, userId: USER }), true);
assert.equal(mayVerifyPath({ scope: "submission", path: contributor.path, userId: USER, contributorId: CONTRIBUTOR }), true);
assert.equal(mayVerifyPath({ scope: "submission", path: `sod1820/2029/accounts/${CONTRIBUTOR}/x`, userId: USER }), false);
assert.equal(mayVerifyPath({ scope: "public", path: pub.path, userId: USER, isAdmin: false }), false);
assert.equal(mayVerifyPath({ scope: "public", path: pub.path, userId: USER, isAdmin: true }), true);

console.log("media-upload-intent contract: PASS");
