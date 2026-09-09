// agent-upload — redeems a single-use upload ticket so an agent can put ONE object into Storage
// without ever holding a reusable admin credential.
//
// AGENT_MEDIA_UPLOAD_BRIDGE_V1. Companion to the DB layer in
// supabase/migrations/20260909101500_agent_media_upload_bridge_v1.sql.
//
// The ticket is minted server-side by public.agent_upload_ticket_issue (service context only) and
// names exactly one bucket + path + mime + size cap. This function redeems it with its OWN service
// role, so FB_ADMIN_KEY — the single auth factor of storage-put / storage-put-raw / sign-upload —
// never has to travel to the agent. Existing upload paths are untouched.
//
//   POST /agent-upload            header x-agent-upload-ticket: <token>
//     mode=put  (default) — body = raw bytes. This function streams them to Storage itself, so
//                           mime, byte cap and overwrite are enforced HARD, server-side.
//     mode=sign            — returns a Storage signed-upload URL for direct PUT of large binaries.
//
// TRUTH BOUNDARY on mode=sign: once the signed URL is handed out, Storage — not this function —
// accepts the bytes. The path is still pinned by the signed token, but the byte cap and the
// content-type become advisory, and the caller could set its own x-upsert. mode=put is therefore
// the correct choice for the image workflow, and mode=sign is only for binaries too large to
// stream through an Edge function. Do not "simplify" by making sign the default.

const SR     = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-agent-upload-ticket, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) =>
  new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Ticket = {
  ok: boolean;
  error?: string;
  bucket: string;
  path: string;
  mime: string;
  max_bytes: number;
  sha256: string | null;
  allow_overwrite: boolean;
  public_url: string;
};

// Claim the ticket. This is the atomic single-use step: a second redemption of the same token
// fails here, in the database, not in this function.
async function consumeTicket(token: string): Promise<Ticket | null> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/agent_upload_ticket_consume`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SR}`,
      apikey: SR,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ p_token: token }),
  });
  if (!r.ok) return null;
  const d = await r.json().catch(() => null);
  return d && d.ok ? (d as Ticket) : null;
}

async function objectExists(bucket: string, path: string): Promise<boolean> {
  const r = await fetch(`${SB_URL}/storage/v1/object/info/${bucket}/${path}`, {
    headers: { Authorization: `Bearer ${SR}`, apikey: SR },
  });
  return r.ok;
}

// Cap the stream at max_bytes. Erroring the stream aborts the upload in flight rather than
// buffering the whole body first, so an oversize payload cannot exhaust the function's memory.
function cappedStream(body: ReadableStream<Uint8Array>, maxBytes: number) {
  let seen = 0;
  return body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        seen += chunk.byteLength;
        if (seen > maxBytes) {
          controller.error(new Error(`payload exceeds max_bytes (${maxBytes})`));
          return;
        }
        controller.enqueue(chunk);
      },
    }),
  );
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: CORS });
  if (req.method !== "POST") return json({ ok: false, error: "POST only" }, 405);
  if (!SR || !SB_URL) return json({ ok: false, error: "missing service role / url" }, 500);

  const token = req.headers.get("x-agent-upload-ticket") || "";
  if (!token) return json({ ok: false, error: "x-agent-upload-ticket required" }, 401);

  const t = await consumeTicket(token);
  // Unknown, spent and expired tickets are indistinguishable by design — do not add detail here.
  if (!t) return json({ ok: false, error: "invalid ticket" }, 401);

  if (!t.allow_overwrite && (await objectExists(t.bucket, t.path))) {
    return json({ ok: false, error: "object already exists and ticket does not allow overwrite" }, 409);
  }
  const upsert = t.allow_overwrite ? "true" : "false";

  const mode = new URL(req.url).searchParams.get("mode") || "put";

  if (mode === "sign") {
    const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/${t.bucket}/${t.path}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${SR}`, apikey: SR },
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || `sign ${r.status}` }, 502);
    return json({
      ok: true,
      mode: "sign",
      bucket: t.bucket,
      path: t.path,
      mime: t.mime,
      max_bytes: t.max_bytes,
      put_url: `${SB_URL}/storage/v1/${String(d.url || "").replace(/^\/+/, "")}`,
      public_url: t.public_url,
      note: "byte cap and content-type are advisory on this mode; prefer mode=put for images",
    });
  }

  if (mode !== "put") return json({ ok: false, error: `unknown mode ${mode}` }, 400);

  // The declared content-type must match what the ticket was minted for, so a ticket for
  // image/png cannot be redeemed to park an object the site later serves as something else.
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (ct !== t.mime) {
    return json({ ok: false, error: `content-type ${ct || "(none)"} does not match ticket mime ${t.mime}` }, 415);
  }
  if (!req.body) return json({ ok: false, error: "empty body" }, 400);

  try {
    const r = await fetch(`${SB_URL}/storage/v1/object/${t.bucket}/${t.path}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SR}`,
        apikey: SR,
        "Content-Type": t.mime,
        "x-upsert": upsert,
      },
      body: cappedStream(req.body, t.max_bytes),
      // @ts-ignore — duplex is required for a streaming outgoing request body
      duplex: "half",
    });
    const d = await r.json().catch(() => ({}));
    if (!r.ok) return json({ ok: false, error: d?.message || d?.error || `storage ${r.status}` }, 502);
    return json({
      ok: true,
      mode: "put",
      bucket: t.bucket,
      path: t.path,
      mime: t.mime,
      public_url: t.public_url,
    });
  } catch (e) {
    // The cap error lands here. The ticket is already spent, which is intended: an oversize
    // attempt burns the ticket rather than letting the caller retry against the same object.
    return json({ ok: false, error: String(e) }, 413);
  }
});
