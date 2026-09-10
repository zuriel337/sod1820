#!/usr/bin/env node
// agent-upload adapter — hand this a real file (an attachment on disk) and it drives the
// canonical AGENT_MEDIA_UPLOAD_BRIDGE_V1 path end to end: sniff → ticket → upload → verify.
//
// It exists because an agent runtime that HAS a file often cannot hand raw bytes to Storage:
// the bridge is live, but every caller had to hand-roll hashing, mime checks and the HTTP put.
// No new storage system — it only calls agent_upload_ticket_issue + the agent-upload function.
//
//   node scripts/agent-upload.mjs --file ./hero.png --path sod1820/agent/hero.png [--bucket gallery]
//
// Ticket issuing needs service-role reach. With SUPABASE_SERVICE_ROLE_KEY set the script issues
// one itself; without it, it prints the exact SQL to run through your DB tool and exits 2, so a
// runtime holding only DB access (the GPT case) can issue the ticket and re-run with --ticket.

import { readFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { basename } from "node:path";

const PROJECT = "linswmnnkjxvweumprav"; // canonical project — do not point this elsewhere
const SB_URL = process.env.SUPABASE_URL || `https://${PROJECT}.supabase.co`;
const SR = process.env.SUPABASE_SERVICE_ROLE_KEY || "";

// Mirrors public.agent_upload_allowed_mimes() / agent_upload_mime_extensions(). The DB is
// authoritative; these are here so a bad file fails locally instead of burning a single-use ticket.
const MIME_EXT = { "image/png": ["png"], "image/jpeg": ["jpg", "jpeg"], "image/webp": ["webp"], "image/gif": ["gif"] };

function sniffMime(buf) {
  const b = buf;
  if (b.length >= 8 && b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4e && b[3] === 0x47) return "image/png";
  if (b.length >= 3 && b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return "image/jpeg";
  if (b.length >= 6 && b.subarray(0, 4).toString("latin1") === "GIF8") return "image/gif";
  if (b.length >= 12 && b.subarray(0, 4).toString("latin1") === "RIFF" && b.subarray(8, 12).toString("latin1") === "WEBP") return "image/webp";
  return null;
}

function parseArgs(argv) {
  const a = { bucket: "gallery", mode: "put", ttl: 600, overwrite: false, json: false };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const val = () => argv[++i];
    if (k === "--file") a.file = val();
    else if (k === "--path") a.path = val();
    else if (k === "--bucket") a.bucket = val();
    else if (k === "--ticket") a.ticket = val();
    else if (k === "--mode") a.mode = val();
    else if (k === "--ttl") a.ttl = Number(val());
    else if (k === "--issued-by") a.issuedBy = val();
    else if (k === "--overwrite") a.overwrite = true;
    else if (k === "--json") a.json = true;
    else if (k === "--help" || k === "-h") a.help = true;
    else throw new Error(`unknown argument: ${k}`);
  }
  return a;
}

const USAGE = `agent-upload adapter — upload a real file through the canonical bridge

  --file <path>        REQUIRED. The actual file/attachment to upload.
  --path <storage>     REQUIRED. Destination path, e.g. sod1820/agent/hero.png
  --bucket <name>      gallery (default) | media
  --ticket <token>     Ticket from agent_upload_ticket_issue. Omit to issue one (needs service role).
  --mode put|form|base64
                       put (default, streams bytes) · form (multipart attachment) · base64 (<=8 MiB)
  --ttl <seconds>      Ticket TTL, max 600.
  --issued-by <name>   Provenance label recorded on the ticket.
  --overwrite          Allow replacing an existing object.
  --json               Emit only the final JSON result.

Allowed: image/png, image/jpeg, image/webp, image/gif. Path prefixes are enforced server-side
(gallery: sod1820/posts/, sod1820/agent/ · media: sod1820/agent/).`;

async function issueTicket({ bucket, path, mime, size, sha256, ttl, overwrite, issuedBy }) {
  const r = await fetch(`${SB_URL}/rest/v1/rpc/agent_upload_ticket_issue`, {
    method: "POST",
    headers: { Authorization: `Bearer ${SR}`, apikey: SR, "Content-Type": "application/json" },
    body: JSON.stringify({
      p_bucket: bucket, p_path: path, p_mime: mime, p_max_bytes: size, p_ttl_seconds: ttl,
      p_sha256: sha256, p_allow_overwrite: overwrite, p_issued_by: issuedBy || "agent-upload-adapter",
    }),
  });
  const d = await r.json().catch(() => null);
  if (!r.ok || !d?.ok) throw new Error(`ticket issue failed: ${d?.message || d?.error || r.status}`);
  return d;
}

function ticketSql(o) {
  const q = (v) => (v === null || v === undefined ? "null" : `'${String(v).replace(/'/g, "''")}'`);
  return `select public.agent_upload_ticket_issue(
  ${q(o.bucket)}, ${q(o.path)}, ${q(o.mime)},
  ${o.size}, ${o.ttl}, ${q(o.sha256)}, ${o.overwrite}, ${q(o.issuedBy || "agent-upload-adapter")}
);`;
}

async function upload({ token, mode, bytes, mime, filename }) {
  const url = `${SB_URL}/functions/v1/agent-upload?mode=${mode}`;
  const headers = { "x-agent-upload-ticket": token };
  let body;
  if (mode === "form") {
    const fd = new FormData();
    fd.append("file", new Blob([bytes], { type: mime }), filename);
    body = fd; // fetch sets the multipart boundary itself
  } else if (mode === "base64") {
    headers["Content-Type"] = "application/json";
    body = JSON.stringify({ b64: bytes.toString("base64"), mime });
  } else {
    headers["Content-Type"] = mime;
    body = bytes;
  }
  const r = await fetch(url, { method: "POST", headers, body });
  const d = await r.json().catch(() => ({}));
  if (!r.ok || !d.ok) throw new Error(`upload failed (${r.status}): ${d.error || "unknown error"}`);
  return d;
}

// Proof the object is really readable at its public URL and byte-identical to what we sent.
async function verify(publicUrl, expected) {
  const r = await fetch(publicUrl, { cache: "no-store" });
  if (!r.ok) return { ok: false, error: `public URL returned ${r.status}` };
  const got = Buffer.from(await r.arrayBuffer());
  const sha256 = createHash("sha256").update(got).digest("hex");
  const contentType = (r.headers.get("content-type") || "").split(";")[0].trim();
  const checks = {
    sha256_match: sha256 === expected.sha256,
    size_match: got.length === expected.size,
    mime_match: contentType === expected.mime,
  };
  return { ok: Object.values(checks).every(Boolean), sha256, size: got.length, content_type: contentType, checks };
}

async function main() {
  const a = parseArgs(process.argv.slice(2));
  if (a.help) { console.log(USAGE); return 0; }
  const log = (...m) => { if (!a.json) console.log(...m); };
  if (!a.file || !a.path) { console.error(USAGE); throw new Error("--file and --path are required"); }
  if (!["put", "form", "base64"].includes(a.mode)) throw new Error(`--mode must be put, form or base64`);

  const bytes = await readFile(a.file);
  if (!bytes.length) throw new Error("file is empty");
  const mime = sniffMime(bytes);
  if (!mime) throw new Error("unsupported file type — allowed: png, jpeg, webp, gif");
  const ext = (a.path.match(/\.([A-Za-z0-9]+)$/)?.[1] || "").toLowerCase();
  if (!MIME_EXT[mime].includes(ext)) throw new Error(`--path extension ".${ext}" does not match detected ${mime} (expected: ${MIME_EXT[mime].join(", ")})`);
  const sha256 = createHash("sha256").update(bytes).digest("hex");
  const size = bytes.length;
  if (a.mode === "base64" && size > 8 * 1024 * 1024) throw new Error("base64 mode is capped at 8 MiB — use put or form");

  log(`file      ${a.file}\nmime      ${mime}\nsize      ${size} bytes\nsha256    ${sha256}\ntarget    ${a.bucket}/${a.path}`);

  const spec = { bucket: a.bucket, path: a.path, mime, size, sha256, ttl: a.ttl, overwrite: a.overwrite, issuedBy: a.issuedBy };
  let token = a.ticket;
  if (!token) {
    if (!SR) {
      console.error(`\nNo --ticket and no SUPABASE_SERVICE_ROLE_KEY. Issue one with this SQL, then re-run with --ticket <token>:\n\n${ticketSql(spec)}\n`);
      return 2;
    }
    const t = await issueTicket(spec);
    token = t.token;
    log(`ticket    issued, expires ${t.expires_at}`);
  }

  const res = await upload({ token, mode: a.mode, bytes, mime, filename: basename(a.file) });
  log(`upload    ok via mode=${a.mode}`);

  const v = await verify(res.public_url, { sha256, size, mime });
  const out = { ok: v.ok, bucket: res.bucket, path: res.path, mime, size, sha256, public_url: res.public_url, verified: v };
  if (a.json) console.log(JSON.stringify(out, null, 2));
  else log(`verify    ${v.ok ? "PASS" : "FAIL"} — sha256 ${v.checks.sha256_match ? "✓" : "✗"} size ${v.checks.size_match ? "✓" : "✗"} mime ${v.checks.mime_match ? "✓" : "✗"}\nurl       ${res.public_url}`);
  return v.ok ? 0 : 1;
}

main().then((c) => process.exit(c)).catch((e) => { console.error(`error: ${e.message}`); process.exit(1); });
