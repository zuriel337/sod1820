#!/usr/bin/env node
// Renders the source of the temporary pass-through function for EXP-23 from the SAME handler as EXP-15..22 (experiments/els-axis-addendum/edge/handler.mjs, a verbatim copy of EXP-15..18's).
// Same protections as before: only the SHA-256 of the one-time token, the approved lock hashes (the reviewed requests, at most 20), exactly one model, an expiry, no round 2. Disabled version: 410.
//   node edge/render.mjs live --token-sha256 <hex> --approve <lock-sha256>[,...] --model <id> --expires <ISO time> > index.ts
//   node edge/render.mjs disabled > index.ts
import { readFileSync } from "node:fs";

export const MAX_LOCKS = 20;
export function renderSource(mode, args = {}) {
  const handler = readFileSync(new URL("../../els-axis-addendum/edge/handler.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  if (mode === "disabled") return '// els-live-reading is disabled: the EXP-23 run is over. Every request is refused.\nDeno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));\n';
  if (mode !== "live") throw new Error("usage: render.mjs live|disabled");
  if (!/^[0-9a-f]{64}$/.test(args["token-sha256"] || "")) throw new Error("--token-sha256 must be 64 hex characters");
  const approved = String(args.approve || "").split(",").filter(Boolean);
  if (!approved.length || approved.length > MAX_LOCKS || !approved.every((h) => /^[0-9a-f]{64}$/.test(h)) || new Set(approved).size !== approved.length) throw new Error(`--approve needs 1 to ${MAX_LOCKS} distinct 64-hex lock hashes`);
  const models = String(args.model || "").split(",").filter(Boolean);
  if (models.length !== 1 || !/^[a-z0-9][a-z0-9.-]{2,60}$/.test(models[0])) throw new Error("--model is required (exactly one model id)");
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
