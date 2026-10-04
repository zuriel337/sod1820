import { createHash } from "node:crypto";

const mp4 = new Uint8Array([0,0,0,0x18,0x66,0x74,0x79,0x70,0x69,0x73,0x6f,0x6d,0,0,2,0,0x69,0x73,0x6f,0x6d,0x6d,0x70,0x34,0x31,0,0,0,8,0x66,0x72,0x65,0x65]);
const SHA = createHash("sha256").update(mp4).digest("hex");
const MIME = "video/mp4";
const DESCRIPT = "https://media.descriptusercontent.com/v/clip.mp4";
let handler: any;
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_SERVICE_ROLE_KEY: "sr-test", SUPABASE_URL: "https://stub.local" } as any)[k] },
  serve: (h: any) => { handler = h; },
};
let stored: Uint8Array | null = null, ticket: any, remoteMode = "ok", readBackMode = "ok";
const pngSig = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const u = String(url);
  if (u.includes("agent_upload_ticket_consume")) return new Response(JSON.stringify(ticket), { status: 200 });
  if (u.includes("/object/info/")) return new Response("{}", { status: 404 });
  if (u.includes("/object/authenticated/")) {
    if (readBackMode === "missing" || !stored) return new Response("{}", { status: 404 });
    return new Response(init.method === "HEAD" ? null : stored, { status: 200, headers: { "content-type": readBackMode === "wrong-mime" ? "text/plain" : ticket.mime, "content-length": String(stored.length) } });
  }
  if (u.includes("/storage/v1/object/")) { stored = new Uint8Array(await new Response(init.body).arrayBuffer()); return new Response(JSON.stringify({ Key: "ok" }), { status: 200 }); }
  if (u === DESCRIPT) {
    const h = (t: string) => ({ "content-type": t });
    if (remoteMode === "oversize") return new Response(mp4, { status: 200, headers: { ...h(MIME), "content-length": "999999" } });
    if (remoteMode === "stream-oversize") return new Response(new Uint8Array(mp4.length + 10), { status: 200, headers: h(MIME) });
    if (remoteMode === "audio") return new Response(mp4, { status: 200, headers: h("audio/mpeg") });
    if (remoteMode === "html") return new Response("<html></html>", { status: 200, headers: h("text/html") });
    if (remoteMode === "html-as-mp4") return new Response("<html>not a video at all</html>", { status: 200, headers: h(MIME) });
    if (remoteMode === "octet") return new Response(mp4, { status: 200, headers: h("application/octet-stream") });
    if (remoteMode === "redirect-bad") return new Response(null, { status: 302, headers: { location: "https://evil.example.com/a.mp4" } });
    if (remoteMode === "redirect-gcs") return new Response(null, { status: 302, headers: { location: "https://storage.googleapis.com/bucket/final.mp4" } });
    if (remoteMode === "redirect-gcs-sub") return new Response(null, { status: 302, headers: { location: "https://evil.storage.googleapis.com/bucket/final.mp4" } });
    if (remoteMode === "redirect-http") return new Response(null, { status: 302, headers: { location: "http://media.descriptusercontent.com/a.mp4" } });
    if (remoteMode === "redirect-ok") return new Response(null, { status: 302, headers: { location: "https://media.descriptusercontent.com/v/final.mp4" } });
    return new Response(mp4, { status: 200, headers: { ...h(MIME), "content-length": String(mp4.length) } });
  }
  if (u === "https://media.descriptusercontent.com/v/final.mp4") return new Response(mp4, { status: 200, headers: { "content-type": MIME } });
  if (u === "https://storage.googleapis.com/bucket/final.mp4") return new Response(mp4, { status: 200, headers: { "content-type": MIME } });
  if (u === "https://storage.googleapis.com/bucket/img.png") return new Response(pngSig, { status: 200, headers: { "content-type": "image/png" } });
  if (u === "https://media.descriptusercontent.com/img.png") return new Response(pngSig, { status: 200, headers: { "content-type": "image/png" } });
  if (u === "https://raw.githubusercontent.com/example/img.png") return new Response(pngSig, { status: 200, headers: { "content-type": "image/png" } });
  if (u === "https://raw.githubusercontent.com/example/v.mp4") return new Response(mp4, { status: 200, headers: { "content-type": MIME } });
  throw new Error("unexpected fetch " + u);
};
await import("./index.ts");
const T = (over: any = {}) => ({ ok:true, bucket:"gallery", path:"sod1820/agent/v.mp4", mime:MIME, max_bytes:mp4.length, sha256:SHA, allow_overwrite:false, public_url:"https://stub.local/public/v.mp4", ...over });
async function postUrl(url: string, t: any = T()) {
  ticket = t; stored = null;
  const res = await handler(new Request("https://stub.local/agent-upload?mode=url", { method:"POST", headers:{"x-agent-upload-ticket":"tok","content-type":"application/json"}, body:JSON.stringify({url}) }));
  return { status: res.status, body: await res.json() };
}
let pass = 0, fail = 0;
const check = (l: string, c: boolean, d = "") => { if (c) { pass++; console.log(" PASS " + l); } else { fail++; console.log(" FAIL " + l + " " + d); } };

remoteMode = "ok";
{
  const r = await postUrl(DESCRIPT);
  check("descript video/mp4 uploads with verified receipt", r.status === 200 && r.body.ok === true && r.body.verified === true, JSON.stringify(r.body));
  check("stored bytes identical", !!stored && createHash("sha256").update(stored).digest("hex") === SHA);
}
remoteMode = "octet"; check("octet-stream declared + ftyp bytes accepted", (await postUrl(DESCRIPT)).status === 200);
remoteMode = "ok";
check("github host still works for video", (await postUrl("https://raw.githubusercontent.com/example/v.mp4")).status === 200);
check("descript host is NOT allowed for image tickets", (await postUrl("https://media.descriptusercontent.com/img.png", T({ mime:"image/png", path:"x.png", sha256:null, max_bytes:100 }))).status === 403);
check("image regression: github png still works", (await postUrl("https://raw.githubusercontent.com/example/img.png", T({ mime:"image/png", path:"x.png", sha256:null, max_bytes:100 }))).status === 200);
check("rejects descript subdomain-suffix lookalike", (await postUrl("https://evil.media.descriptusercontent.com/v.mp4")).status === 403);
check("rejects descriptusercontent.com apex / sibling hosts", (await postUrl("https://other.descriptusercontent.com/v.mp4")).status === 403 && (await postUrl("https://descriptusercontent.com.evil.com/v.mp4")).status === 403);
check("rejects http", (await postUrl("http://media.descriptusercontent.com/v/clip.mp4")).status === 403);
check("rejects credentials", (await postUrl("https://u:p@media.descriptusercontent.com/v/clip.mp4")).status === 403);
check("rejects non-443 port", (await postUrl("https://media.descriptusercontent.com:8443/v/clip.mp4")).status === 403);
remoteMode = "redirect-ok"; check("follows redirect to allowed host", (await postUrl(DESCRIPT)).status === 200);
remoteMode = "redirect-gcs"; check("follows Descript video redirect to storage.googleapis.com", (await postUrl(DESCRIPT)).status === 200);
check("storage.googleapis.com direct video url accepted", (await postUrl("https://storage.googleapis.com/bucket/final.mp4")).status === 200);
check("storage.googleapis.com NOT allowed for image tickets", (await postUrl("https://storage.googleapis.com/bucket/img.png", T({ mime:"image/png", path:"x.png", sha256:null, max_bytes:100 }))).status === 403);
check("rejects googleapis.com subdomain/lookalikes", (await postUrl("https://evil.storage.googleapis.com/bucket/final.mp4")).status === 403 && (await postUrl("https://www.googleapis.com/x.mp4")).status === 403 && (await postUrl("https://storage.googleapis.com.evil.com/x.mp4")).status === 403);
remoteMode = "redirect-gcs-sub"; check("rejects redirect to googleapis subdomain", (await postUrl(DESCRIPT)).status === 403);
remoteMode = "redirect-bad"; check("rejects redirect to unapproved host", (await postUrl(DESCRIPT)).status === 403);
{
  remoteMode = "redirect-bad"; const b = await postUrl(DESCRIPT);
  check("redirect rejection reports blocked hostname only", b.status === 403 && String(b.body.error).includes("evil.example.com") && !JSON.stringify(b.body).includes("a.mp4") && !JSON.stringify(b.body).includes("https://"), JSON.stringify(b.body));
}
remoteMode = "redirect-http"; check("rejects redirect downgrade to http", (await postUrl(DESCRIPT)).status === 403);
remoteMode = "audio"; check("rejects audio content-type", (await postUrl(DESCRIPT)).status === 415);
remoteMode = "html"; check("rejects html content-type", (await postUrl(DESCRIPT)).status === 415);
remoteMode = "html-as-mp4"; check("rejects non-ftyp bytes declared video/mp4", (await postUrl(DESCRIPT)).status === 415);
remoteMode = "oversize"; check("rejects declared oversize before storing", (await postUrl(DESCRIPT)).status === 413 && stored === null);
remoteMode = "stream-oversize"; check("rejects streamed oversize (no content-length)", (await postUrl(DESCRIPT)).status === 413 && stored === null);
remoteMode = "ok";
check("ticket sha still enforced", (await postUrl(DESCRIPT, T({ sha256:"0".repeat(64) }))).status === 422 && stored === null);
readBackMode = "wrong-mime"; check("readback mime mismatch yields no success", (await postUrl(DESCRIPT)).status === 502);
readBackMode = "missing"; check("readback missing yields no success", (await postUrl(DESCRIPT)).status === 502);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
