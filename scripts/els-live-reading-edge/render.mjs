#!/usr/bin/env node
// Renders the source (index.ts) of the temporary pass-through function `els-live-reading` for EXP-25 from the SAME handler as EXP-15..24 (handler.mjs here, a verbatim copy).
// Same protections as before: the function carries only the SHA-256 of a one-time token, the approved lock hashes (the reviewed requests, at most 20), the allowed models, an expiry,
// no round 2; the credential is the site's existing ANTHROPIC_API_KEY secret and never leaves the function. The disabled version answers 410 to everything.
// One difference from EXP-23/24, on purpose: EXP-25 compares Claude Fable 5.1 with 5.2, so up to two model ids are allowed (each request is still locked by its own hash).
//   node scripts/els-live-reading-edge/render.mjs live --token-sha256 <hex> --approve <lock-sha256>[,...] --model <id>[,<id>] --expires <ISO time> > index.ts
//   node scripts/els-live-reading-edge/render.mjs disabled > index.ts
import { readFileSync } from "node:fs";

export const MAX_LOCKS = 20;
export const MAX_MODELS = 2;
export const DISABLED_SOURCE = '// els-live-reading is disabled: the EXP-25 run is over. Every request is refused.\nDeno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));\n';

export function renderSource(mode, args = {}) {
  if (mode === "disabled") return DISABLED_SOURCE;
  if (mode !== "live") throw new Error("usage: render.mjs live|disabled");
  const handler = readFileSync(new URL("./handler.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  if (!/^[0-9a-f]{64}$/.test(args["token-sha256"] || "")) throw new Error("--token-sha256 must be 64 hex characters");
  const approved = String(args.approve || "").split(",").filter(Boolean);
  if (!approved.length || approved.length > MAX_LOCKS || !approved.every((h) => /^[0-9a-f]{64}$/.test(h)) || new Set(approved).size !== approved.length) throw new Error(`--approve needs 1 to ${MAX_LOCKS} distinct 64-hex lock hashes`);
  const models = String(args.model || "").split(",").filter(Boolean);
  if (!models.length || models.length > MAX_MODELS || !models.every((m) => /^claude-fable-[a-z0-9.-]{1,24}$/.test(m)) || new Set(models).size !== models.length) throw new Error(`--model needs 1 to ${MAX_MODELS} distinct claude-fable-* ids`);
  const expires = Date.parse(args.expires || "");
  if (!Number.isFinite(expires)) throw new Error("--expires must be an ISO time");
  const boot = `
const CONFIG = { tokenSha256: ${JSON.stringify(args["token-sha256"])}, approved: new Set(${JSON.stringify(approved)}), models: ${JSON.stringify(models)}, maxBody: 400000, expiresAt: ${expires}, round2Bases: new Set([]), round2Prefix: "", round2MaxCards: 0, round2MaxAssistant: 0, round2MaxUser: 0 };
Deno.serve((req) => handle(req, { ...CONFIG, apiKey: (Deno.env.get("ANTHROPIC_API_KEY") || "").trim() }, fetch));
`;
  return `${handler}\n${boot}`;
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  const [mode, ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
  process.stdout.write(renderSource(mode, args));
}
