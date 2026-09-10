// Local behaviour tests for the agent-upload Edge function.
//
//   node --experimental-strip-types supabase/functions/agent-upload/index.test.mts
//
// The function runs on Deno against live Storage, so here Deno.serve/env and fetch are stubbed:
// the ticket RPC, the object-exists probe and the Storage write are intercepted, which lets the
// real handler run unchanged against a real image and lets us assert the bytes it would store.
// This is what makes the undeployed mode=form branch reviewable before it is released.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const HERE = dirname(fileURLToPath(import.meta.url));
const bytes = await readFile(join(HERE, "../../../public/logo.png")); // a real 512x512 PNG
const SHA = createHash("sha256").update(bytes).digest("hex");
const MIME = "image/png";

let handler: any;
(globalThis as any).Deno = {
  env: { get: (k: string) => ({ SUPABASE_SERVICE_ROLE_KEY: "sr-test", SUPABASE_URL: "https://stub.local" } as any)[k] },
  serve: (h: any) => { handler = h; },
};

let stored: Uint8Array | null = null;
let ticket: any;
(globalThis as any).fetch = async (url: string, init: any = {}) => {
  const u = String(url);
  if (u.includes("agent_upload_ticket_consume")) return new Response(JSON.stringify(ticket), { status: 200 });
  if (u.includes("/object/info/")) return new Response("{}", { status: 404 });   // target does not exist yet
  if (u.includes("/object/upload/sign/")) return new Response(JSON.stringify({ url: "object/upload/sign/x?token=y" }), { status: 200 });
  if (u.includes("/storage/v1/object/")) {
    stored = new Uint8Array(await new Response(init.body).arrayBuffer());
    return new Response(JSON.stringify({ Key: "ok" }), { status: 200 });
  }
  throw new Error("unexpected fetch " + u);
};

await import("./index.ts");

const T = (over: any = {}) => ({
  ok: true, bucket: "gallery", path: "sod1820/agent/t.png", mime: MIME,
  max_bytes: bytes.length, sha256: SHA, allow_overwrite: false,
  public_url: "https://stub.local/public/gallery/sod1820/agent/t.png", ...over,
});

async function post(mode: string, body: any, t: any, headers: any = {}) {
  ticket = t; stored = null;
  const res = await handler(new Request(`https://stub.local/agent-upload?mode=${mode}`, {
    method: "POST", headers: { "x-agent-upload-ticket": "tok", ...headers }, body,
  }));
  return { status: res.status, body: await res.json() };
}

const form = (blobType = MIME, field = "file", data: any = bytes) => {
  const fd = new FormData();
  fd.append(field, new Blob([data], { type: blobType }), "logo.png");
  return fd;
};

const storedHash = () => (stored ? createHash("sha256").update(stored).digest("hex") : null);

let pass = 0, fail = 0;
const check = (label: string, cond: boolean, detail = "") => {
  if (cond) { pass++; console.log(`  PASS  ${label}`); }
  else { fail++; console.log(`  FAIL  ${label} ${detail}`); }
};

console.log("mode=form — real multipart attachment");
{
  const r = await post("form", form(), T());
  check("accepts a real image part", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
  check("returns correct sha256", r.body.sha256 === SHA);
  check("returns correct size", r.body.size === bytes.length);
  check("returns public_url", typeof r.body.public_url === "string" && r.body.public_url.length > 0);
  check("stored bytes are byte-identical", storedHash() === SHA);
}
check("accepts generic octet-stream part type", (await post("form", form("application/octet-stream"), T())).status === 200);
check("finds the file part under any field name", (await post("form", form(MIME, "attachment"), T())).status === 200);

console.log("mode=form — rejections");
check("rejects a part type disagreeing with the ticket", (await post("form", form("image/gif"), T())).status === 415);
{
  const r = await post("form", form(), T({ sha256: "0".repeat(64) }));
  check("rejects sha256 mismatch without storing", r.status === 422 && stored === null);
}
{
  const r = await post("form", form(), T({ max_bytes: 10 }));
  check("rejects payload over ticket size without storing", r.status === 413 && stored === null);
}
{
  const fd = new FormData(); fd.append("note", "no file here");
  check("rejects multipart carrying no file part", (await post("form", fd, T())).status === 400);
}
check("rejects non-multipart content-type",
  (await post("form", JSON.stringify({ b64: "x" }), T(), { "Content-Type": "application/json" })).status === 415);

console.log("regression — modes that were already live");
{
  const r = await post("base64", JSON.stringify({ b64: bytes.toString("base64"), mime: MIME }), T(), { "Content-Type": "application/json" });
  check("base64 uploads a real image", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
  check("base64 bytes are byte-identical", storedHash() === SHA);
  check("base64 now also reports sha256/size", r.body.sha256 === SHA && r.body.size === bytes.length);
}
{
  const r = await post("base64", JSON.stringify({ b64: bytes.toString("base64") }), T({ sha256: "0".repeat(64) }), { "Content-Type": "application/json" });
  check("base64 still rejects sha mismatch", r.status === 422 && stored === null);
}
check("base64 still rejects mime mismatch",
  (await post("base64", JSON.stringify({ b64: "AAAA", mime: "image/gif" }), T(), { "Content-Type": "application/json" })).status === 415);
check("base64 still enforces the 8 MiB ceiling",
  (await post("base64", JSON.stringify({ b64: bytes.toString("base64") }), T({ max_bytes: 9 * 1024 * 1024 }), { "Content-Type": "application/json" })).status === 413);
{
  const r = await post("put", bytes, T(), { "Content-Type": MIME });
  check("put uploads a real image", r.status === 200 && r.body.ok === true, JSON.stringify(r.body));
  check("put bytes are byte-identical", storedHash() === SHA);
}
check("put still rejects content-type mismatch", (await post("put", bytes, T(), { "Content-Type": "image/gif" })).status === 415);
check("sign mode still works", (await post("sign", null, T())).body.mode === "sign");
{
  const r = await post("bogus", bytes, T(), { "Content-Type": MIME });
  check("unknown mode still rejected", r.status === 400 && /unknown mode/.test(r.body.error));
}

console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
