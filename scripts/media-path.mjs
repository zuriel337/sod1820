#!/usr/bin/env node
import { randomUUID } from "node:crypto";

const KINDS = new Set(["image", "video", "audio", "document"]);
const SCOPES = new Set(["public", "submission"]);
const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function parse(argv) {
  const out = { scope: "public", role: "original" };
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    const next = () => argv[++i];
    if (k === "--scope") out.scope = next();
    else if (k === "--kind") out.kind = next();
    else if (k === "--ext") out.ext = next();
    else if (k === "--asset-id") out.assetId = next();
    else if (k === "--submission-id") out.submissionId = next();
    else if (k === "--contributor-id") out.contributorId = next();
    else if (k === "--unresolved") out.unresolved = true;
    else if (k === "--date") out.date = next();
    else if (k === "--role") out.role = next();
    else if (k === "--lang") out.lang = next();
    else if (k === "--help" || k === "-h") out.help = true;
    else throw new Error(`unknown argument: ${k}`);
  }
  return out;
}

const USAGE = `media-path — canonical SOD1820 2029 storage path generator\n\n` +
`Public/approved:\n  node scripts/media-path.mjs --scope public --kind image --ext png\n  node scripts/media-path.mjs --scope public --kind video --ext mp4\n  node scripts/media-path.mjs --scope public --kind video --ext jpg --role poster\n  node scripts/media-path.mjs --scope public --kind video --ext vtt --role captions --lang he\n\n` +
`Private submission:\n  node scripts/media-path.mjs --scope submission --contributor-id <uuid> --kind image --ext jpg\n  node scripts/media-path.mjs --scope submission --unresolved --kind video --ext mp4\n\n` +
`Kinds: image | video | audio | document\n`;

function cleanExt(ext) {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9]{1,8}$/.test(e)) throw new Error("--ext must be a simple file extension");
  return e;
}

function dateParts(input) {
  const d = input ? new Date(`${input}T00:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error("--date must be YYYY-MM-DD");
  return [String(d.getUTCFullYear()), String(d.getUTCMonth() + 1).padStart(2, "0")];
}

function publicPath(a, ext, yyyy, mm) {
  const assetId = a.assetId || randomUUID();
  if (!UUID_RE.test(assetId)) throw new Error("--asset-id must be a UUID");
  const root = `sod1820/2029/${a.kind}/${yyyy}/${mm}/${assetId}`;
  let path;
  if (a.role === "original") path = `${root}/original.${ext}`;
  else if (a.role === "captions") {
    const lang = String(a.lang || "").toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]+)?$/.test(lang)) throw new Error("--lang is required for captions");
    path = `${root}/captions/${lang}.${ext}`;
  } else {
    const role = String(a.role || "").toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,40}$/.test(role)) throw new Error("invalid --role");
    path = `${root}/derivatives/${role}.${ext}`;
  }
  return { bucket: "media", asset_id: assetId, path };
}

function submissionPath(a, ext, yyyy, mm) {
  const submissionId = a.submissionId || randomUUID();
  if (!UUID_RE.test(submissionId)) throw new Error("--submission-id must be a UUID");
  if (a.contributorId && a.unresolved) throw new Error("choose --contributor-id or --unresolved, not both");
  let ownerRoot;
  if (a.contributorId) {
    if (!UUID_RE.test(a.contributorId)) throw new Error("--contributor-id must be a UUID");
    ownerRoot = `contributors/${a.contributorId}`;
  } else if (a.unresolved) {
    ownerRoot = "unresolved";
  } else {
    throw new Error("submission scope requires --contributor-id <uuid> or --unresolved");
  }
  return {
    bucket: "submission-inbox",
    submission_id: submissionId,
    path: `sod1820/2029/${ownerRoot}/${yyyy}/${mm}/${submissionId}/${a.kind}/original.${ext}`,
  };
}

function main() {
  const a = parse(process.argv.slice(2));
  if (a.help) { console.log(USAGE); return; }
  if (!SCOPES.has(a.scope)) throw new Error("--scope must be public or submission");
  if (!KINDS.has(a.kind)) throw new Error(`--kind must be one of: ${[...KINDS].join(", ")}`);
  const ext = cleanExt(a.ext);
  const [yyyy, mm] = dateParts(a.date);
  const out = a.scope === "public" ? publicPath(a, ext, yyyy, mm) : submissionPath(a, ext, yyyy, mm);
  console.log(JSON.stringify({ scope: a.scope, kind: a.kind, ...out }, null, 2));
}

try { main(); } catch (e) { console.error(`error: ${e.message}\n\n${USAGE}`); process.exit(1); }
