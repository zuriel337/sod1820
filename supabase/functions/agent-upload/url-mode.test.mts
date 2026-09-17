import { createHash } from "node:crypto";

const bytes = Uint8Array.from(Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAusB9Wl2ZQAAAABJRU5ErkJggg==", "base64"));
const SHA = createHash("sha256").update(bytes).digest("hex");
const MIME = "image/png";
let handler: any;
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_SERVICE_ROLE_KEY: "sr-test", SUPABASE_URL: "https://stub.local" } as any)[k] },
  serve: (h: any) => { handler = h; },
};
let stored: Uint8Array | null = null;
let ticket: any;
let remoteMode = "ok";
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const u = String(url);
  if (u.includes("agent_upload_ticket_consume")) return new Response(JSON.stringify(ticket), { status: 200 });
  if (u.includes("/object/info/")) return new Response("{}", { status: 404 });
  if (u.includes("/storage/v1/object/")) {
    stored = new Uint8Array(await new Response(init.body).arrayBuffer());
    return new Response(JSON.stringify({ Key: "ok" }), { status: 200 });
  }
  if (u === "https://raw.githubusercontent.com/example/repo/main/image.png") {
    if (remoteMode === "oversize") return new Response(bytes, { status: 200, headers: { "content-type": MIME, "content-length": "999999" } });
    if (remoteMode === "wrong-type") return new Response(bytes, { status: 200, headers: { "content-type": "image/gif" } });
    if (remoteMode === "bad-bytes") return new Response(new TextEncoder().encode("not an image"), { status: 200, headers: { "content-type": MIME } });
    if (remoteMode === "redirect") return new Response(null, { status: 302, headers: { location: "https://cdn.example.com/nope.png" } });
    return new Response(bytes, { status: 200, headers: { "content-type": MIME, "content-length": String(bytes.length) } });
  }
  throw new Error("unexpected fetch " + u);
};
await import("./index.ts");
const T = (over: any = {}) => ({ ok:true, bucket:"gallery", path:"sod1820/agent/url.png", mime:MIME, max_bytes:bytes.length, sha256:SHA, allow_overwrite:false, public_url:"https://stub.local/public/url.png", ...over });
async function postUrl(url: string, t: any = T()) {
  ticket=t; stored=null;
  const res=await handler(new Request("https://stub.local/agent-upload?mode=url", { method:"POST", headers:{"x-agent-upload-ticket":"tok","content-type":"application/json"}, body:JSON.stringify({url}) }));
  return { status:res.status, body:await res.json() };
}
let pass=0, fail=0;
const check=(label:string, cond:boolean, detail="")=>{ if(cond){pass++; console.log(" PASS "+label)} else {fail++; console.log(" FAIL "+label+" "+detail)} };
remoteMode="ok";
{
 const r=await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png");
 check("allowed HTTPS URL uploads", r.status===200 && r.body.ok===true, JSON.stringify(r.body));
 check("stored bytes are identical", stored ? createHash("sha256").update(stored).digest("hex")===SHA : false);
 check("reports size and sha", r.body.size===bytes.length && r.body.sha256===SHA);
}
check("rejects plain http", (await postUrl("http://raw.githubusercontent.com/example/repo/main/image.png")).status===403);
check("rejects arbitrary host", (await postUrl("https://example.com/image.png")).status===403);
remoteMode="wrong-type"; check("rejects declared mime mismatch", (await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png")).status===415);
remoteMode="bad-bytes"; check("rejects bytes that are not the ticket mime", (await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png")).status===415);
remoteMode="oversize"; check("rejects declared oversize before storing", (await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png")).status===413 && stored===null);
remoteMode="redirect"; check("rejects redirect to unapproved host", (await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png")).status===403);
remoteMode="ok"; check("ticket sha still enforced", (await postUrl("https://raw.githubusercontent.com/example/repo/main/image.png", T({sha256:"0".repeat(64)}))).status===422 && stored===null);
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail?1:0);
