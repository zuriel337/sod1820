#!/usr/bin/env node
import { randomUUID } from "node:crypto";

const KINDS = new Set(["image", "video", "audio", "document"]);

function parse(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    const k = argv[i];
    if (k === "--kind") out.kind = argv[++i];
    else if (k === "--ext") out.ext = argv[++i];
    else if (k === "--asset-id") out.assetId = argv[++i];
    else if (k === "--date") out.date = argv[++i];
    else if (k === "--role") out.role = argv[++i];
    else if (k === "--lang") out.lang = argv[++i];
    else if (k === "--help" || k === "-h") out.help = true;
    else throw new Error(`unknown argument: ${k}`);
  }
  return out;
}

const USAGE = `agent-media-path — canonical SOD1820 2029 agent media path\n\n` +
`  node scripts/agent-media-path.mjs --kind image --ext png\n` +
`  node scripts/agent-media-path.mjs --kind video --ext mp4 --role original\n` +
`  node scripts/agent-media-path.mjs --kind video --ext jpg --role poster\n` +
`  node scripts/agent-media-path.mjs --kind video --ext vtt --role captions --lang he\n\n` +
`Kinds: image | video | audio | document\n` +
`Default role: original. Derivative roles are stored below derivatives/. Captions use captions/<lang>.vtt.\n`;

function cleanExt(ext) {
  const e = String(ext || "").toLowerCase().replace(/^\./, "");
  if (!/^[a-z0-9]{1,8}$/.test(e)) throw new Error("--ext must be a simple file extension");
  return e;
}

function main() {
  const a = parse(process.argv.slice(2));
  if (a.help) { console.log(USAGE); return; }
  if (!KINDS.has(a.kind)) throw new Error(`--kind must be one of: ${[...KINDS].join(", ")}`);
  const ext = cleanExt(a.ext);
  const assetId = a.assetId || randomUUID();
  if (!/^[0-9a-f-]{36}$/i.test(assetId)) throw new Error("--asset-id must be a UUID");
  const d = a.date ? new Date(`${a.date}T00:00:00Z`) : new Date();
  if (Number.isNaN(d.getTime())) throw new Error("--date must be YYYY-MM-DD");
  const yyyy = String(d.getUTCFullYear());
  const mm = String(d.getUTCMonth() + 1).padStart(2, "0");
  const root = `sod1820/agent/2029/${a.kind}/${yyyy}/${mm}/${assetId}`;
  const role = a.role || "original";
  let path;
  if (role === "original") path = `${root}/original.${ext}`;
  else if (role === "captions") {
    const lang = String(a.lang || "").toLowerCase();
    if (!/^[a-z]{2,3}(?:-[a-z0-9]+)?$/.test(lang)) throw new Error("--lang is required for captions");
    path = `${root}/captions/${lang}.${ext}`;
  } else {
    const safeRole = String(role).toLowerCase();
    if (!/^[a-z0-9][a-z0-9_-]{0,40}$/.test(safeRole)) throw new Error("invalid --role");
    path = `${root}/derivatives/${safeRole}.${ext}`;
  }
  console.log(JSON.stringify({ bucket: "media", kind: a.kind, asset_id: assetId, path }, null, 2));
}

try { main(); } catch (e) { console.error(`error: ${e.message}\n\n${USAGE}`); process.exit(1); }
