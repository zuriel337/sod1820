import test from "node:test";
import assert from "node:assert/strict";
import {
  attachLifeJourneyHintImage,
  detachLifeJourneyHintImage,
  lifeJourneyHintMediaErrorMessage,
  readLifeJourneyHintImage,
  retryLifeJourneyHintImageCleanup,
  validateLifeJourneyHintImage,
} from "./lifeJourneyHintMedia.js";

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const HINT_ID = "33333333-3333-4333-8333-333333333333";
const OBJECT_ID = "44444444-4444-4444-8444-444444444444";
const EDGE = "https://edge.test/media-upload-intent";
const TUS = "https://storage.test/resumable";

function json(body, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } });
}

function imageFile(name = "evidence.png", type = "image/png") {
  const file = new Blob([new Uint8Array([1, 2, 3, 4])], { type });
  Object.defineProperty(file, "name", { value: name });
  return file;
}

function authClient(currentUser) {
  return {
    auth: {
      async getSession() {
        return { data: { session: { access_token: `token-${currentUser.value}`, user: { id: currentUser.value } } }, error: null };
      },
    },
  };
}

test("private hint image follows issue → TUS → verify → bind and returns opaque data only", async () => {
  const currentUser = { value: USER_A };
  const edgeActions = [];
  const phases = [];
  const progress = [];
  const fetchImpl = async (url, init = {}) => {
    if (url === EDGE) {
      assert.equal(init.cache, "no-store");
      assert.equal(init.headers.Authorization, `Bearer token-${USER_A}`);
      const body = JSON.parse(init.body);
      edgeActions.push(body);
      if (body.action === "issue") return json({
        ok: true,
        action: "issue",
        owner_kind: "research_item_hint",
        hint_id: HINT_ID,
        scope: "submission",
        bucket: "submission-inbox",
        path: `sod1820/2029/accounts/${USER_A}/2026/10/55555555-5555-4555-8555-555555555555/image/original.png`,
        kind: "image",
        mime: "image/png",
        size: 4,
        signed_upload: { token: "signed-upload", upsert: false },
        tus: { endpoint: TUS, chunk_size: 6 * 1024 * 1024, metadata: { bucketName: "submission-inbox", objectName: "private-object", contentType: "image/png" } },
        upload_receipt: "issued-receipt",
      });
      if (body.action === "verify_hint_media") return json({ ok: true, verified: true, binding_receipt: "verified-receipt" });
      if (body.action === "bind_hint_media") return json({ ok: true, storage_object_id: OBJECT_ID, kind: "image", role: "evidence_image", visibility: "private", already_bound: false });
      throw new Error(`unexpected edge action ${body.action}`);
    }
    if (url === TUS && init.method === "POST") return new Response(null, { status: 201, headers: { location: "/upload/one", "upload-offset": "0" } });
    if (url === "https://storage.test/upload/one" && init.method === "PATCH") return new Response(null, { status: 204, headers: { "upload-offset": "4" } });
    throw new Error(`unexpected request ${init.method} ${url}`);
  };

  const result = await attachLifeJourneyHintImage({
    hintId: HINT_ID,
    file: imageFile(),
    expectedUserId: USER_A,
    client: authClient(currentUser),
    endpoint: EDGE,
    anonKey: "publishable-test",
    fetchImpl,
    onPhase: phase => phases.push(phase),
    onProgress: value => progress.push(value.percentage),
  });

  assert.deepEqual(edgeActions.map(item => item.action), ["issue", "verify_hint_media", "bind_hint_media"]);
  assert.deepEqual(phases, ["issuing", "uploading", "verifying", "binding", "ready"]);
  assert.deepEqual(progress, [100]);
  assert.deepEqual(result, {
    hintId: HINT_ID,
    storageObjectId: OBJECT_ID,
    kind: "image",
    role: "evidence_image",
    visibility: "private",
    alreadyBound: false,
  });
  assert.equal(JSON.stringify(result).includes("receipt"), false);
  assert.equal(JSON.stringify(result).includes("sod1820/2029/accounts"), false);
});

test("principal change stops the flow before TUS or binding and exposes no receipt", async () => {
  const currentUser = { value: USER_A };
  let tusCalls = 0;
  const fetchImpl = async (url, init = {}) => {
    if (url === EDGE) {
      currentUser.value = USER_B;
      return json({
        ok: true,
        hint_id: HINT_ID,
        scope: "submission",
        bucket: "submission-inbox",
        path: `sod1820/2029/accounts/${USER_A}/private.png`,
        mime: "image/png",
        size: 4,
        signed_upload: { token: "must-not-escape" },
        tus: { endpoint: TUS },
        upload_receipt: "must-not-escape",
      });
    }
    tusCalls += 1;
    throw new Error(`unexpected request ${init.method} ${url}`);
  };
  await assert.rejects(() => attachLifeJourneyHintImage({
    hintId: HINT_ID,
    file: imageFile(),
    expectedUserId: USER_A,
    client: authClient(currentUser),
    endpoint: EDGE,
    anonKey: "publishable-test",
    fetchImpl,
  }), /principal_changed/);
  assert.equal(tusCalls, 0);
});

test("read, detach and cleanup retry remain owner-bound and transient", async () => {
  const currentUser = { value: USER_A };
  const actions = [];
  const fetchImpl = async (_url, init = {}) => {
    const body = JSON.parse(init.body);
    actions.push(body);
    if (body.action === "read_hint_media") return json({ ok: true, signed_url: "https://signed.test/short-lived", expires_in_seconds: 60, mime: "image/png", size: 4 });
    if (body.action === "detach_hint_media") return json({ ok: false, cleanup_pending: true, cleanup_receipt: "cleanup-receipt" }, 202);
    if (body.action === "retry_hint_media_cleanup") return json({ ok: true, cleanup_pending: false });
    throw new Error("unexpected action");
  };
  const common = { expectedUserId: USER_A, client: authClient(currentUser), endpoint: EDGE, anonKey: "publishable-test", fetchImpl };
  const read = await readLifeJourneyHintImage({ hintId: HINT_ID, storageObjectId: OBJECT_ID, ...common });
  assert.equal(read.signedUrl, "https://signed.test/short-lived");
  assert.equal(read.expiresInSeconds, 60);
  const detached = await detachLifeJourneyHintImage({ hintId: HINT_ID, storageObjectId: OBJECT_ID, ...common });
  assert.equal(detached.cleanupPending, true);
  assert.equal(detached.cleanupReceipt, "cleanup-receipt");
  const retried = await retryLifeJourneyHintImageCleanup({ cleanupReceipt: detached.cleanupReceipt, ...common });
  assert.equal(retried.ok, true);
  assert.deepEqual(actions.map(item => item.action), ["read_hint_media", "detach_hint_media", "retry_hint_media_cleanup"]);
});

test("client preflight is bounded and server remains authoritative", () => {
  assert.deepEqual(validateLifeJourneyHintImage(imageFile()), { ok: true });
  assert.equal(validateLifeJourneyHintImage(imageFile("note.txt", "text/plain")).error, "unsupported_mime");
  assert.equal(lifeJourneyHintMediaErrorMessage(new Error("extension_mismatch")), "אפשר לצרף תמונת PNG, JPG, WEBP, GIF או AVIF בלבד.");
  const controller = new AbortController();
  controller.abort();
  return assert.rejects(() => readLifeJourneyHintImage({
    hintId: HINT_ID,
    storageObjectId: OBJECT_ID,
    expectedUserId: USER_A,
    signal: controller.signal,
    client: authClient({ value: USER_A }),
    endpoint: EDGE,
    fetchImpl: () => { throw new Error("must not fetch"); },
  }), error => error?.name === "AbortError");
});
