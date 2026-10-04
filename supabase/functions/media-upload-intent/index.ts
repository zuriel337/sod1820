import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildUploadIntent, evaluateReadBack, mayVerifyPath, normalizeMime, normalizeSha256, VERIFY_HASH_MAX_BYTES } from "./contract.mjs";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const PROJECT_REF = "linswmnnkjxvweumprav";
const TUS_ENDPOINT = `https://${PROJECT_REF}.storage.supabase.co/storage/v1/upload/resumable`;
const TUS_CHUNK_SIZE = 6 * 1024 * 1024;

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, content-type, apikey, x-client-info",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Content-Type": "application/json",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: CORS });

async function actorFromRequest(req: Request) {
  const match = (req.headers.get("authorization") || "").match(/^Bearer\s+(.+)$/i);
  if (!match || !SUPABASE_URL || !SERVICE_ROLE_KEY) return null;
  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data, error } = await admin.auth.getUser(match[1]);
  if (error || !data.user) return null;
  const userId = data.user.id;
  const [{ data: userRow }, { data: contributor }] = await Promise.all([
    admin.from("users").select("id,role").eq("id", userId).maybeSingle(),
    admin.from("contributors").select("id").eq("user_id", userId).limit(1).maybeSingle(),
  ]);
  return { admin, userId, contributorId: contributor?.id || null, isAdmin: userRow?.role === "admin" };
}

async function issueIntent(actor: any, body: any) {
  const intent = buildUploadIntent({
    scope: body.scope, kind: body.kind, mime: body.mime, size: body.size, filename: body.filename,
    userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin,
  });
  const { data, error } = await actor.admin.storage.from(intent.bucket).createSignedUploadUrl(intent.path, { upsert: false });
  if (error || !data?.token) throw new Error(`signed_upload_failed:${error?.message || "missing_token"}`);
  return {
    ok: true, action: "issue", scope: intent.scope, bucket: intent.bucket, path: intent.path,
    kind: intent.kind, mime: intent.mime, size: intent.size, max_bytes: intent.maxBytes,
    asset_id: intent.assetId, submission_id: intent.submissionId, transport: intent.transport,
    signed_upload: { token: data.token, expires_in_seconds: 7200, upsert: false },
    tus: {
      endpoint: TUS_ENDPOINT, chunk_size: TUS_CHUNK_SIZE, headers: { "x-signature": data.token },
      metadata: { bucketName: intent.bucket, objectName: intent.path, contentType: intent.mime, cacheControl: intent.scope === "public" ? "3600" : "0" },
    },
  };
}

async function verifyIntent(actor: any, body: any) {
  const scope = String(body.scope || "");
  const bucket = scope === "public" ? "media" : ["submission","personal"].includes(scope) ? "submission-inbox" : "";
  const path = String(body.path || "");
  if (!bucket || !mayVerifyPath({ scope, path, userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin })) throw new Error("verify_forbidden");
  const expectedSize = Number(body.size);
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) throw new Error("invalid_size");
  const expectedMime = normalizeMime(body.mime);
  if (!expectedMime) throw new Error("invalid_mime");
  const expectedSha256 = body.sha256 ? normalizeSha256(body.sha256) : "";
  if (body.sha256 && !expectedSha256) throw new Error("invalid_sha256");
  const { data, error } = await actor.admin.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error("object_not_found");
  // Owner-readable read-back is the completion boundary. HEAD for size/mime; the body is only
  // fetched (and hashed) when the caller declared a sha256 and the object is within the bounded cap.
  const head = await fetch(data.signedUrl, { method: "HEAD", redirect: "follow" });
  if (!head.ok) throw new Error(`verify_head_failed:${head.status}`);
  const actual: { size: number; mime: string; sha256?: string } = {
    size: Number(head.headers.get("content-length") || "0"),
    mime: normalizeMime(head.headers.get("content-type") || ""),
  };
  if (expectedSha256 && actual.size === expectedSize && actual.size <= VERIFY_HASH_MAX_BYTES) {
    const get = await fetch(data.signedUrl, { redirect: "follow" });
    if (!get.ok) throw new Error(`verify_get_failed:${get.status}`);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await get.arrayBuffer()));
    actual.sha256 = Array.from(digest).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  const verified = evaluateReadBack({ scope, bucket, path, expected: { size: expectedSize, mime: expectedMime, ...(expectedSha256 ? { sha256: expectedSha256 } : {}) }, actual });
  if (!verified.ok) return verified;
  const { data: objectRow, error: objectError } = await actor.admin.schema("storage").from("objects")
    .select("id").eq("bucket_id", bucket).eq("name", path).maybeSingle();
  if (objectError || !objectRow?.id) throw new Error("verified_object_identity_missing");
  return {
    ...verified,
    storage_object_id: objectRow.id,
    receipt: { ...verified.receipt, storage_object_id: objectRow.id },
  };
}

async function deleteVerifiedUpload(actor: any, body: any) {
  const scope = String(body.scope || "submission");
  const bucket = scope === "public" ? "media" : scope === "submission" ? "submission-inbox" : "";
  const path = String(body.path || "");
  if (!bucket || !mayVerifyPath({ scope, path, userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin })) {
    throw new Error("delete_forbidden");
  }
  const { error } = await actor.admin.storage.from(bucket).remove([path]);
  if (error) throw new Error(`verified_delete_failed:${error.message}`);
  return { ok: true, action: "delete_verified_upload", bucket, path, deleted: true };
}

async function readPersonalMedia(actor: any, body: any) {
  const itemId = String(body.item_id || "");
  const storageObjectId = String(body.storage_object_id || "");
  if (!itemId || !storageObjectId) throw new Error("media_reference_required");
  const { data: resolved, error } = await actor.admin.rpc("private_personal_intake_media_access_v1", {
    p_item_id: itemId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (error || !resolved?.ok) throw new Error(`media_access_denied:${error?.message || "not_resolved"}`);
  const { data, error: signError } = await actor.admin.storage.from(resolved.bucket).createSignedUrl(resolved.path, 60);
  if (signError || !data?.signedUrl) throw new Error("private_read_sign_failed");
  return {
    ok: true, action: "read_personal_media", item_id: itemId,
    storage_object_id: storageObjectId, mime: resolved.mime || null,
    size: Number(resolved.size || 0), signed_url: data.signedUrl, expires_in_seconds: 60,
  };
}

async function cleanupAllPersonalMedia(actor: any) {
  const { data: items, error: itemError } = await actor.admin.from("research_items")
    .select("id,metadata")
    .eq("user_id", actor.userId)
    .eq("bucket", "library")
    .eq("entity_type", "personal_intake");
  if (itemError) throw new Error(`personal_items_read_failed:${itemError.message}`);
  const ids = (items || []).map((row: any) => String(row?.metadata?.artifact?.storage_object_id || "")).filter(Boolean);
  if (!ids.length) return { ok: true, action: "cleanup_personal_media", deleted: 0 };
  const { data: objects, error: objectError } = await actor.admin.schema("storage").from("objects")
    .select("id,name")
    .eq("bucket_id", "submission-inbox")
    .in("id", ids);
  if (objectError) throw new Error(`personal_objects_read_failed:${objectError.message}`);
  const prefix = `sod1820/2029/accounts/${actor.userId}/`;
  const paths = (objects || []).map((row: any) => String(row.name || "")).filter((p: string) => p.startsWith(prefix));
  if (!paths.length) return { ok: true, action: "cleanup_personal_media", deleted: 0 };
  const { error: removeError } = await actor.admin.storage.from("submission-inbox").remove(paths);
  if (removeError) throw new Error(`personal_cleanup_failed:${removeError.message}`);
  return { ok: true, action: "cleanup_personal_media", deleted: paths.length };
}

async function deletePersonalMedia(actor: any, body: any) {
  const itemId = String(body.item_id || "");
  const storageObjectId = String(body.storage_object_id || "");
  if (!itemId || !storageObjectId) throw new Error("media_reference_required");
  const { data: resolved, error } = await actor.admin.rpc("private_personal_intake_media_access_v1", {
    p_item_id: itemId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (error || !resolved?.ok) throw new Error(`media_access_denied:${error?.message || "not_resolved"}`);
  const { error: removeError } = await actor.admin.storage.from(resolved.bucket).remove([resolved.path]);
  if (removeError) throw new Error(`private_delete_failed:${removeError.message}`);
  return {
    ok: true, action: "delete_personal_media", item_id: itemId,
    storage_object_id: storageObjectId, deleted: true,
  };
}

async function readContributionMedia(actor: any, body: any) {
  const contributionId = String(body.contribution_id || "");
  const storageObjectId = String(body.storage_object_id || "");
  if (!contributionId || !storageObjectId) throw new Error("media_reference_required");
  const { data: resolved, error } = await actor.admin.rpc("private_contribution_media_access", {
    p_contribution_id: contributionId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (error || !resolved?.ok) throw new Error(`media_access_denied:${error?.message || "not_resolved"}`);
  const { data, error: signError } = await actor.admin.storage.from(resolved.bucket).createSignedUrl(resolved.path, 60);
  if (signError || !data?.signedUrl) throw new Error("private_read_sign_failed");
  return {
    ok: true, action: "read_contribution_media", contribution_id: contributionId,
    storage_object_id: storageObjectId, mime: resolved.mime || null,
    size: Number(resolved.size || 0), signed_url: data.signedUrl, expires_in_seconds: 60,
  };
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  const actor = await actorFromRequest(req);
  if (!actor) return json({ ok: false, error: "unauthorized" }, 401);
  let body: any;
  try { body = await req.json(); } catch { return json({ ok: false, error: "invalid_json" }, 400); }
  try {
    const action = String(body.action || "issue");
    if (action === "issue") return json(await issueIntent(actor, body));
    if (action === "verify") { const v = await verifyIntent(actor, body); return json(v, v.ok ? 200 : 422); }
    if (action === "read_contribution_media") return json(await readContributionMedia(actor, body));
    if (action === "delete_verified_upload") return json(await deleteVerifiedUpload(actor, body));
    if (action === "read_personal_media") return json(await readPersonalMedia(actor, body));
    if (action === "delete_personal_media") return json(await deletePersonalMedia(actor, body));
    if (action === "cleanup_personal_media") return json(await cleanupAllPersonalMedia(actor));
    return json({ ok: false, error: "unsupported_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = /auth|required|admin_required|forbidden|denied/.test(message) ? 403 : 400;
    return json({ ok: false, error: message }, status);
  }
});
