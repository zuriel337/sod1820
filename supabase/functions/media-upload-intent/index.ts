import { createClient } from "jsr:@supabase/supabase-js@2";
import {
  buildHintMediaIntent,
  buildUploadIntent,
  evaluateReadBack,
  HINT_MEDIA_CONTRACT,
  makeHintMediaReceiptPayload,
  mayVerifyPath,
  normalizeMime,
  normalizeSha256,
  signHintMediaReceipt,
  verifyHintMediaReceipt,
  VERIFY_HASH_MAX_BYTES,
} from "./contract.mjs";

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
  "Cache-Control": "private, no-store, max-age=0",
  "Pragma": "no-cache",
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
  const isHintMedia = body.owner_kind === HINT_MEDIA_CONTRACT.ownerKind;
  let intent;
  if (isHintMedia) {
    const hintId = String(body.hint_id || "");
    const { data: owner, error: ownerError } = await actor.admin.rpc("private_research_item_hint_media_owner_check", {
      p_hint_id: hintId,
      p_actor_id: actor.userId,
    });
    if (ownerError || !owner?.ok) throw new Error("hint_media_owner_denied");
    intent = buildHintMediaIntent({
      hintId,
      mime: body.mime,
      size: body.size,
      filename: body.filename,
      userId: actor.userId,
    });
  } else {
    intent = buildUploadIntent({
      scope: body.scope, kind: body.kind, mime: body.mime, size: body.size, filename: body.filename,
      userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin,
    });
  }
  const { data, error } = await actor.admin.storage.from(intent.bucket).createSignedUploadUrl(intent.path, { upsert: false });
  if (error || !data?.token) throw new Error(`signed_upload_failed:${error?.message || "missing_token"}`);
  const response: any = {
    ok: true, action: "issue", scope: intent.scope, bucket: intent.bucket, path: intent.path,
    kind: intent.kind, mime: intent.mime, size: intent.size, max_bytes: intent.maxBytes,
    asset_id: intent.assetId, submission_id: intent.submissionId, transport: intent.transport,
    signed_upload: { token: data.token, expires_in_seconds: 7200, upsert: false },
    tus: {
      endpoint: TUS_ENDPOINT, chunk_size: TUS_CHUNK_SIZE, headers: { "x-signature": data.token },
      metadata: { bucketName: intent.bucket, objectName: intent.path, contentType: intent.mime, cacheControl: intent.scope === "public" ? "3600" : "0" },
    },
  };
  if (isHintMedia) {
    const receiptPayload = makeHintMediaReceiptPayload({
      phase: "issued",
      userId: actor.userId,
      hintId: intent.ownerId,
      path: intent.path,
      submissionId: intent.submissionId,
      mime: intent.mime,
      size: intent.size,
    });
    response.owner_kind = intent.ownerKind;
    response.hint_id = intent.ownerId;
    response.role = intent.role;
    response.upload_receipt = await signHintMediaReceipt(receiptPayload, SERVICE_ROLE_KEY);
  }
  return response;
}

async function readBack(actor: any, { bucket, path, size, mime, sha256 = "" }: any) {
  const expectedSize = Number(size);
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) throw new Error("invalid_size");
  const expectedMime = normalizeMime(mime);
  if (!expectedMime) throw new Error("invalid_mime");
  const expectedSha256 = sha256 ? normalizeSha256(sha256) : "";
  if (sha256 && !expectedSha256) throw new Error("invalid_sha256");
  const { data, error } = await actor.admin.storage.from(bucket).createSignedUrl(path, HINT_MEDIA_CONTRACT.signedReadTtlSeconds);
  if (error || !data?.signedUrl) throw new Error("object_not_found");
  const head = await fetch(data.signedUrl, { method: "HEAD", redirect: "follow", cache: "no-store" });
  if (!head.ok) throw new Error(`verify_head_failed:${head.status}`);
  const actual: { size: number; mime: string; sha256?: string } = {
    size: Number(head.headers.get("content-length") || "0"),
    mime: normalizeMime(head.headers.get("content-type") || ""),
  };
  if (expectedSha256 && actual.size === expectedSize && actual.size <= VERIFY_HASH_MAX_BYTES) {
    const get = await fetch(data.signedUrl, { redirect: "follow", cache: "no-store" });
    if (!get.ok) throw new Error(`verify_get_failed:${get.status}`);
    const digest = new Uint8Array(await crypto.subtle.digest("SHA-256", await get.arrayBuffer()));
    actual.sha256 = Array.from(digest).map((x) => x.toString(16).padStart(2, "0")).join("");
  }
  return evaluateReadBack({
    scope: bucket === "media" ? "public" : "submission",
    bucket,
    path,
    expected: { size: expectedSize, mime: expectedMime, ...(expectedSha256 ? { sha256: expectedSha256 } : {}) },
    actual,
  });
}

async function verifyIntent(actor: any, body: any) {
  const scope = String(body.scope || "");
  const bucket = scope === "public" ? "media" : scope === "submission" ? "submission-inbox" : "";
  const path = String(body.path || "");
  if (!bucket || !mayVerifyPath({ scope, path, userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin })) throw new Error("verify_forbidden");
  return readBack(actor, { bucket, path, size: body.size, mime: body.mime, sha256: body.sha256 });
}

async function verifyHintMedia(actor: any, body: any) {
  const issued = await verifyHintMediaReceipt(body.upload_receipt, SERVICE_ROLE_KEY, {
    phase: "issued",
    userId: actor.userId,
    hintId: body.hint_id ? String(body.hint_id) : null,
  });
  const { data: owner, error: ownerError } = await actor.admin.rpc("private_research_item_hint_media_owner_check", {
    p_hint_id: issued.hint_id,
    p_actor_id: actor.userId,
  });
  if (ownerError || !owner?.ok) throw new Error("hint_media_owner_denied");
  const verified = await readBack(actor, issued);
  if (!verified.ok || !verified.verified) return { ok: false, verified: false, action: "verify_hint_media", checks: verified.checks };
  const bindingPayload = makeHintMediaReceiptPayload({
    phase: "verified",
    userId: actor.userId,
    hintId: issued.hint_id,
    path: issued.path,
    submissionId: issued.submission_id,
    mime: issued.mime,
    size: issued.size,
  });
  return {
    ok: true,
    verified: true,
    action: "verify_hint_media",
    owner_kind: HINT_MEDIA_CONTRACT.ownerKind,
    hint_id: issued.hint_id,
    kind: issued.kind,
    role: issued.role,
    mime: verified.actual.mime,
    size: verified.actual.size,
    checks: verified.checks,
    binding_receipt: await signHintMediaReceipt(bindingPayload, SERVICE_ROLE_KEY),
  };
}

async function bindHintMedia(actor: any, body: any) {
  const verified = await verifyHintMediaReceipt(body.binding_receipt, SERVICE_ROLE_KEY, {
    phase: "verified",
    userId: actor.userId,
    hintId: body.hint_id ? String(body.hint_id) : null,
  });
  const { data, error } = await actor.admin.rpc("private_research_item_hint_media_bind", {
    p_hint_id: verified.hint_id,
    p_storage_path: verified.path,
    p_expected_mime: verified.mime,
    p_expected_size: verified.size,
    p_role: verified.role,
    p_actor_id: actor.userId,
  });
  if (error || !data?.ok) throw new Error("hint_media_bind_denied");
  return {
    ok: true,
    action: "bind_hint_media",
    hint_id: verified.hint_id,
    storage_object_id: data.storage_object_id,
    kind: data.kind,
    role: data.role,
    visibility: "private",
    already_bound: Boolean(data.already_bound),
  };
}

async function readHintMedia(actor: any, body: any) {
  const hintId = String(body.hint_id || "");
  const storageObjectId = String(body.storage_object_id || "");
  const { data: resolved, error } = await actor.admin.rpc("private_research_item_hint_media_access", {
    p_hint_id: hintId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (error || !resolved?.ok) throw new Error("hint_media_access_denied");
  const { data, error: signError } = await actor.admin.storage.from(resolved.bucket).createSignedUrl(resolved.path, HINT_MEDIA_CONTRACT.signedReadTtlSeconds);
  if (signError || !data?.signedUrl) throw new Error("private_read_sign_failed");
  return {
    ok: true,
    action: "read_hint_media",
    hint_id: hintId,
    storage_object_id: storageObjectId,
    mime: resolved.mime || null,
    size: Number(resolved.size || 0),
    signed_url: data.signedUrl,
    expires_in_seconds: HINT_MEDIA_CONTRACT.signedReadTtlSeconds,
  };
}

function submissionIdFromPath(path: string) {
  const value = String(path || "").split("/")[6];
  if (!value) throw new Error("invalid_private_media_path");
  return value;
}

async function cleanupReceipt(actor: any, hintId: string, media: any, cleanupMode: 'detach' | 'delete') {
  const payload = makeHintMediaReceiptPayload({
    phase: "cleanup",
    userId: actor.userId,
    hintId,
    path: media.path,
    submissionId: submissionIdFromPath(media.path),
    mime: media.mime,
    size: Number(media.size),
    storageObjectId: media.storage_object_id,
    cleanupMode,
  });
  return signHintMediaReceipt(payload, SERVICE_ROLE_KEY);
}

async function detachHintMedia(actor: any, body: any) {
  const hintId = String(body.hint_id || "");
  const storageObjectId = String(body.storage_object_id || "");
  const { data: pending, error } = await actor.admin.rpc("private_research_item_hint_media_detach", {
    p_hint_id: hintId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (error || !pending?.ok) throw new Error("hint_media_detach_denied");
  if (pending.object_missing) {
    const { data: finalized, error: finalizeError } = await actor.admin.rpc("private_research_item_hint_media_finalize", {
      p_hint_id: hintId,
      p_storage_object_id: storageObjectId,
      p_actor_id: actor.userId,
    });
    if (finalizeError || !finalized?.ok) throw new Error("hint_media_finalize_failed");
    return { ok: true, action: "detach_hint_media", hint_id: hintId, storage_object_id: storageObjectId, detached: true };
  }
  const { error: removeError } = await actor.admin.storage.from(pending.bucket).remove([pending.path]);
  if (removeError) {
    return {
      ok: false,
      cleanup_pending: true,
      action: "detach_hint_media",
      hint_id: hintId,
      storage_object_id: storageObjectId,
      cleanup_receipt: await cleanupReceipt(actor, hintId, pending, 'detach'),
    };
  }
  const { data: finalized, error: finalizeError } = await actor.admin.rpc("private_research_item_hint_media_finalize", {
    p_hint_id: hintId,
    p_storage_object_id: storageObjectId,
    p_actor_id: actor.userId,
  });
  if (finalizeError || !finalized?.ok) throw new Error("hint_media_finalize_failed");
  return { ok: true, action: "detach_hint_media", hint_id: hintId, storage_object_id: storageObjectId, detached: true };
}

async function deleteHintWithMedia(actor: any, body: any) {
  const hintId = String(body.hint_id || "");
  const { data: deleted, error } = await actor.admin.rpc("private_research_item_hint_delete", {
    p_hint_id: hintId,
    p_actor_id: actor.userId,
  });
  if (error || !deleted?.ok) throw new Error("hint_delete_denied");
  const failed = [];
  for (const media of deleted.media || []) {
    const { error: removeError } = await actor.admin.storage.from(media.bucket).remove([media.path]);
    if (removeError) {
      failed.push({
        storage_object_id: media.storage_object_id,
        cleanup_receipt: await cleanupReceipt(actor, hintId, media, 'delete'),
      });
    }
  }
  if (failed.length === 0 && deleted.delete_pending) {
    const { data: finalized, error: finalizeError } = await actor.admin.rpc("private_research_item_hint_delete_finalize", {
      p_hint_id: hintId,
      p_actor_id: actor.userId,
    });
    if (finalizeError || !finalized?.ok || finalized.delete_pending) throw new Error("hint_delete_finalize_failed");
  }
  return {
    ok: failed.length === 0,
    action: "delete_hint_with_media",
    hint_id: hintId,
    deleted: failed.length === 0,
    cleanup_pending: failed.length > 0,
    cleanup: failed,
  };
}

async function retryHintMediaCleanup(actor: any, body: any) {
  const receipt = await verifyHintMediaReceipt(body.cleanup_receipt, SERVICE_ROLE_KEY, {
    phase: "cleanup",
    userId: actor.userId,
  });
  const { data: resolved, error } = await actor.admin.rpc("private_research_item_hint_media_cleanup_access", {
    p_hint_id: receipt.hint_id,
    p_storage_object_id: receipt.storage_object_id,
    p_storage_path: receipt.path,
    p_cleanup_mode: receipt.cleanup_mode,
    p_actor_id: actor.userId,
  });
  if (error || !resolved?.ok) throw new Error("hint_media_cleanup_denied");
  const { error: removeError } = await actor.admin.storage.from(resolved.bucket).remove([resolved.path]);
  if (removeError) return { ok: false, cleanup_pending: true, action: "retry_hint_media_cleanup", cleanup_receipt: body.cleanup_receipt };
  if (receipt.cleanup_mode === 'delete') {
    const { data: finalized, error: finalizeError } = await actor.admin.rpc("private_research_item_hint_delete_finalize", {
      p_hint_id: receipt.hint_id,
      p_actor_id: actor.userId,
    });
    if (finalizeError || !finalized?.ok) throw new Error("hint_delete_finalize_failed");
    return {
      ok: true,
      cleanup_pending: Boolean(finalized.delete_pending),
      action: "retry_hint_media_cleanup",
      storage_object_id: receipt.storage_object_id,
      hint_deleted: Boolean(finalized.deleted),
    };
  }
  const { data: finalized, error: finalizeError } = await actor.admin.rpc("private_research_item_hint_media_finalize", {
    p_hint_id: receipt.hint_id,
    p_storage_object_id: receipt.storage_object_id,
    p_actor_id: actor.userId,
  });
  if (finalizeError || !finalized?.ok) throw new Error("hint_media_finalize_failed");
  return { ok: true, cleanup_pending: false, action: "retry_hint_media_cleanup", storage_object_id: receipt.storage_object_id };
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
    if (action === "verify_hint_media") { const v = await verifyHintMedia(actor, body); return json(v, v.ok ? 200 : 422); }
    if (action === "bind_hint_media") return json(await bindHintMedia(actor, body));
    if (action === "read_hint_media") return json(await readHintMedia(actor, body));
    if (action === "detach_hint_media") { const v = await detachHintMedia(actor, body); return json(v, v.ok ? 200 : 202); }
    if (action === "delete_hint_with_media") { const v = await deleteHintWithMedia(actor, body); return json(v, v.ok ? 200 : 202); }
    if (action === "retry_hint_media_cleanup") { const v = await retryHintMediaCleanup(actor, body); return json(v, v.ok ? 200 : 202); }
    if (action === "read_contribution_media") return json(await readContributionMedia(actor, body));
    return json({ ok: false, error: "unsupported_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = /auth|required|admin_required|forbidden|denied/.test(message) ? 403 : 400;
    return json({ ok: false, error: message }, status);
  }
});
