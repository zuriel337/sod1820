import { createClient } from "jsr:@supabase/supabase-js@2";
import { buildUploadIntent, mayVerifyPath, normalizeMime } from "./contract.mjs";

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
  const bucket = scope === "public" ? "media" : scope === "submission" ? "submission-inbox" : "";
  const path = String(body.path || "");
  if (!bucket || !mayVerifyPath({ scope, path, userId: actor.userId, contributorId: actor.contributorId, isAdmin: actor.isAdmin })) throw new Error("verify_forbidden");
  const expectedSize = Number(body.size);
  if (!Number.isSafeInteger(expectedSize) || expectedSize <= 0) throw new Error("invalid_size");
  const expectedMime = normalizeMime(body.mime);
  if (!expectedMime) throw new Error("invalid_mime");
  const { data, error } = await actor.admin.storage.from(bucket).createSignedUrl(path, 60);
  if (error || !data?.signedUrl) throw new Error("object_not_found");
  const head = await fetch(data.signedUrl, { method: "HEAD", redirect: "follow" });
  if (!head.ok) throw new Error(`verify_head_failed:${head.status}`);
  const actualSize = Number(head.headers.get("content-length") || "0");
  const actualMime = normalizeMime(head.headers.get("content-type") || "");
  const checks = { size_match: actualSize === expectedSize, mime_match: actualMime === expectedMime };
  return { ok: checks.size_match && checks.mime_match, action: "verify", scope, bucket, path, expected: { size: expectedSize, mime: expectedMime }, actual: { size: actualSize, mime: actualMime }, checks };
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
    if (action === "verify") return json(await verifyIntent(actor, body));
    return json({ ok: false, error: "unsupported_action" }, 400);
  } catch (error) {
    const message = error instanceof Error ? error.message : "unknown_error";
    const status = /auth|required|admin_required|forbidden/.test(message) ? 403 : 400;
    return json({ ok: false, error: message }, status);
  }
});
