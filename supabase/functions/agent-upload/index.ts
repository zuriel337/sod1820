// agent-upload — single-use least-privilege Storage upload for agent runtimes.
const SR = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
const SB_URL = Deno.env.get("SUPABASE_URL") || "";
const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "content-type, x-agent-upload-ticket, authorization",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (b: unknown, s = 200) => new Response(JSON.stringify(b), { status: s, headers: { ...CORS, "Content-Type": "application/json" } });

type Ticket = { ok:boolean; bucket:string; path:string; mime:string; max_bytes:number; sha256:string|null; allow_overwrite:boolean; public_url:string };

async function consumeTicket(token:string):Promise<Ticket|null> {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/agent_upload_ticket_consume`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${SR}`, apikey:SR, "Content-Type":"application/json" },
    body:JSON.stringify({ p_token:token }),
  });
  if (!r.ok) return null;
  const d = await r.json().catch(()=>null);
  return d && d.ok ? d as Ticket : null;
}

async function objectExists(bucket:string,path:string) {
  const r = await fetch(`${SB_URL}/storage/v1/object/info/${bucket}/${path}`, { headers:{ Authorization:`Bearer ${SR}`, apikey:SR } });
  return r.ok;
}

function cappedStream(body:ReadableStream<Uint8Array>, maxBytes:number) {
  let seen = 0;
  return body.pipeThrough(new TransformStream<Uint8Array,Uint8Array>({ transform(chunk,controller) {
    seen += chunk.byteLength;
    if (seen > maxBytes) { controller.error(new Error(`payload exceeds max_bytes (${maxBytes})`)); return; }
    controller.enqueue(chunk);
  }}));
}

function decodeB64(s:string):Uint8Array {
  const bin = atob(s.replace(/\s+/g,""));
  const out = new Uint8Array(bin.length);
  for (let i=0;i<bin.length;i++) out[i]=bin.charCodeAt(i);
  return out;
}

async function sha256Hex(bytes:Uint8Array) {
  const d = new Uint8Array(await crypto.subtle.digest("SHA-256", bytes));
  return Array.from(d).map(x=>x.toString(16).padStart(2,"0")).join("");
}

async function putBytes(t:Ticket, body:BodyInit, meta?:{ sha256?:string; size?:number }) {
  const r = await fetch(`${SB_URL}/storage/v1/object/${t.bucket}/${t.path}`, {
    method:"POST",
    headers:{ Authorization:`Bearer ${SR}`, apikey:SR, "Content-Type":t.mime, "x-upsert":t.allow_overwrite?"true":"false" },
    body,
    // @ts-ignore
    duplex:"half",
  });
  const d = await r.json().catch(()=>({}));
  if (!r.ok) return json({ ok:false, error:d?.message || d?.error || `storage ${r.status}` }, 502);
  return json({ ok:true, bucket:t.bucket, path:t.path, mime:t.mime, size:meta?.size ?? null, sha256:meta?.sha256 ?? null, public_url:t.public_url });
}

// Shared tail for the modes that hand us a fully buffered payload (base64, form): size and
// hash are known up front, so both are checked against the ticket before anything is stored.
async function putBuffered(t:Ticket, bytes:Uint8Array) {
  if (bytes.byteLength === 0 || bytes.byteLength > t.max_bytes) return json({ ok:false, error:"payload exceeds ticket size" },413);
  const hash = await sha256Hex(bytes);
  if (t.sha256 && hash !== t.sha256) return json({ ok:false, error:"sha256 mismatch" },422);
  return await putBytes(t, bytes, { sha256:hash, size:bytes.byteLength });
}

Deno.serve(async req => {
  if (req.method === "OPTIONS") return new Response("ok", { headers:CORS });
  if (req.method !== "POST") return json({ ok:false, error:"POST only" },405);
  if (!SR || !SB_URL) return json({ ok:false, error:"missing service role / url" },500);
  const token = req.headers.get("x-agent-upload-ticket") || "";
  if (!token) return json({ ok:false, error:"x-agent-upload-ticket required" },401);
  const t = await consumeTicket(token);
  if (!t) return json({ ok:false, error:"invalid ticket" },401);
  if (!t.allow_overwrite && await objectExists(t.bucket,t.path)) return json({ ok:false, error:"object already exists and ticket does not allow overwrite" },409);

  const mode = new URL(req.url).searchParams.get("mode") || "put";
  if (mode === "sign") {
    const r = await fetch(`${SB_URL}/storage/v1/object/upload/sign/${t.bucket}/${t.path}`, { method:"POST", headers:{ Authorization:`Bearer ${SR}`, apikey:SR } });
    const d = await r.json().catch(()=>({}));
    if (!r.ok) return json({ ok:false, error:d?.message || `sign ${r.status}` },502);
    return json({ ok:true, mode:"sign", bucket:t.bucket, path:t.path, mime:t.mime, max_bytes:t.max_bytes, put_url:`${SB_URL}/storage/v1/${String(d.url||"").replace(/^\/+/,"")}`, public_url:t.public_url });
  }

  if (mode === "base64") {
    if (t.max_bytes > 8 * 1024 * 1024) return json({ ok:false, error:"base64 mode max is 8 MiB; use put/sign for larger files" },413);
    let b:any; try { b = await req.json(); } catch { return json({ ok:false, error:"invalid JSON" },400); }
    if (!b || typeof b.b64 !== "string") return json({ ok:false, error:"b64 required" },400);
    if (b.mime && String(b.mime).toLowerCase() !== t.mime) return json({ ok:false, error:"mime mismatch" },415);
    let bytes:Uint8Array; try { bytes = decodeB64(b.b64); } catch { return json({ ok:false, error:"invalid base64" },400); }
    return await putBuffered(t, bytes);
  }

  // form: a real multipart/form-data attachment — what a file picker, a FormData post or
  // `curl -F` produces. This is the shape an agent runtime has when it holds an actual file
  // rather than a byte stream it can address itself; the other modes all require the caller
  // to unwrap the file first, which is exactly the step that kept stalling.
  if (mode === "form") {
    const ct = (req.headers.get("content-type") || "").toLowerCase();
    if (!ct.startsWith("multipart/form-data")) return json({ ok:false, error:`mode=form requires multipart/form-data, got ${ct||"(none)"}` },415);
    let fd:FormData; try { fd = await req.formData(); } catch (e) { return json({ ok:false, error:`invalid multipart body: ${e}` },400); }
    const named = fd.get("file");
    const file:File|null = named instanceof File ? named : ((([...fd.values()].find(v=>v instanceof File)) as File|undefined) || null);
    if (!file) return json({ ok:false, error:'no file part found (expected a part named "file")' },400);
    // An empty or generic part type is fine — the ticket already pins the mime — but a stated
    // type that disagrees with the ticket means the caller is uploading the wrong file.
    const ft = (file.type || "").split(";")[0].trim().toLowerCase();
    if (ft && ft !== "application/octet-stream" && ft !== t.mime) return json({ ok:false, error:`file part type ${ft} does not match ticket mime ${t.mime}` },415);
    if (file.size > t.max_bytes) return json({ ok:false, error:"payload exceeds ticket size" },413);
    return await putBuffered(t, new Uint8Array(await file.arrayBuffer()));
  }

  if (mode !== "put") return json({ ok:false, error:`unknown mode ${mode}` },400);
  const ct = (req.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (ct !== t.mime) return json({ ok:false, error:`content-type ${ct||"(none)"} does not match ticket mime ${t.mime}` },415);
  if (!req.body) return json({ ok:false, error:"empty body" },400);
  try { return await putBytes(t, cappedStream(req.body,t.max_bytes)); }
  catch (e) { return json({ ok:false, error:String(e) },413); }
});
