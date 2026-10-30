#!/usr/bin/env node
// Renders the source of the temporary pass-through function (index.ts) from handler.mjs. As in EXP-15..18: the live version carries only the SHA-256 of the one-time token and the
// approved lock hashes (here exactly the two reviewed requests), an allow-listed model and an expiry; the disabled version answers 410 to everything. No round 2 in this experiment.
//   node edge/render.mjs live --token-sha256 <hex> --approve <lock-sha256>[,<lock-sha256>] --model <id> --expires <ISO time> > index.ts
//   node edge/render.mjs disabled > index.ts
import { readFileSync } from "node:fs";

export function renderSource(mode, args = {}) {
  const handler = readFileSync(new URL("./handler.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
  if (mode === "disabled") return '// els-live-reading is disabled: the EXP-22 run is over. Every request is refused.\nDeno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));\n';
  if (mode !== "live") throw new Error("usage: render.mjs live|disabled");
  if (!/^[0-9a-f]{64}$/.test(args["token-sha256"] || "")) throw new Error("--token-sha256 must be 64 hex characters");
  const approved = String(args.approve || "").split(",").filter(Boolean);
  if (!approved.length || approved.length > 2 || !approved.every((h) => /^[0-9a-f]{64}$/.test(h))) throw new Error("--approve needs one or two 64-hex lock hashes");
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
