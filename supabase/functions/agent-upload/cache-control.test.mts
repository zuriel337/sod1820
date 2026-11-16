// agent-upload cache (ZURIEL 16.11.2026, new Posts' images): a public file written once to its own path is stored with an hour of cache, like
// the site's own public uploads; an overwritable or a private path keeps Storage's default. Drives the real handler with a stubbed Deno/fetch.
import { createHash } from "node:crypto";

const png = Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,0,0,0,0]);
const SHA = createHash("sha256").update(png).digest("hex");
let handler: any, ticket: any, stored: Uint8Array | null = null, sent: Record<string, string> = {};
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_SERVICE_ROLE_KEY: "sr-test", SUPABASE_URL: "https://stub.local" } as any)[k] },
  serve: (h: any) => { handler = h; },
};
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const u = String(url);
  if (u.includes("agent_upload_ticket_consume")) return new Response(JSON.stringify(ticket), { status: 200 });
  if (u.includes("/object/info/")) return new Response("{}", { status: 404 });
  if (u.includes("/object/authenticated/")) return new Response(init.method === "HEAD" ? null : stored, { status: 200, headers: { "content-type": ticket.mime, "content-length": String(stored?.length || 0) } });
  if (u.includes("/storage/v1/object/")) { sent = { ...init.headers }; stored = new Uint8Array(await new Response(init.body).arrayBuffer()); return new Response(JSON.stringify({ Key: "ok" }), { status: 200 }); }
  throw new Error("unexpected fetch " + u);
};
await import("./index.ts");
const T = (over: any = {}) => ({ ok: true, bucket: "media", path: "sod1820/2029/image/2026/11/x/derivatives/reading.jpg", mime: "image/png", max_bytes: 1000, sha256: SHA,
  allow_overwrite: false, public_url: "https://stub.local/storage/v1/object/public/media/sod1820/2029/image/2026/11/x/derivatives/reading.jpg", ...over });
async function upload(t: any) {
  ticket = t; stored = null; sent = {};
  const res = await handler(new Request("https://stub.local/agent-upload?mode=base64", { method: "POST", headers: { "x-agent-upload-ticket": "tok", "content-type": "application/json" },
    body: JSON.stringify({ b64: Buffer.from(png).toString("base64"), mime: "image/png" }) }));
  return { status: res.status, body: await res.json() };
}
let fail = 0;
const check = (label: string, ok: boolean, detail = "") => { if (ok) console.log(" PASS " + label); else { fail++; console.log(" FAIL " + label + " " + detail); } };
{ const r = await upload(T()); check("public, written once: an hour of cache", r.status === 200 && sent["cache-control"] === "max-age=3600", JSON.stringify({ r, sent })); }
{ const r = await upload(T({ allow_overwrite: true })); check("overwritable: Storage's default (no cache header)", r.status === 200 && !("cache-control" in sent), JSON.stringify(sent)); }
{ const r = await upload(T({ public_url: "" })); check("private: Storage's default (no cache header)", r.status === 200 && !("cache-control" in sent), JSON.stringify(sent)); }
{ const r = await upload(T()); check("the existing headers stay", sent["x-upsert"] === "false" && sent["Content-Type"] === "image/png" && sent.apikey === "sr-test", JSON.stringify(sent)); }
if (fail) { console.log(`agent-upload cache: ${fail} failed`); process.exit(1); }
console.log("agent-upload cache: PASS");
