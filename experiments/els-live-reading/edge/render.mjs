#!/usr/bin/env node
// Renders the source of the temporary edge function (index.ts) from handler.mjs: the live version carries the SHA-256 of the one-time token and the approved
// lock hashes; the disabled version answers 410 to everything.
//   node edge/render.mjs live --token-sha256 <hex> --approve <lock-sha256>[,<lock-sha256>] --model <id>[,<id>] [--round2 <lock-sha256>[,...] --expires <ISO time>] > index.ts
//   node edge/render.mjs disabled > index.ts
import { readFileSync } from "node:fs";

const [mode, ...rest] = process.argv.slice(2);
const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
const handler = readFileSync(new URL("./handler.mjs", import.meta.url), "utf8").replace(/^export /gm, "");
if (mode === "disabled") {
  process.stdout.write('// els-live-reading is disabled: the EXP-15 run is over. Every request is refused.\nDeno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));\n');
} else if (mode === "live") {
  if (!/^[0-9a-f]{64}$/.test(args["token-sha256"] || "")) throw new Error("--token-sha256 must be 64 hex characters");
  const approved = String(args.approve || "").split(",").filter(Boolean);
  if (!approved.length || !approved.every((h) => /^[0-9a-f]{64}$/.test(h))) throw new Error("--approve needs one or more 64-hex lock hashes");
  const models = String(args.model || "").split(",").filter(Boolean); // one or more allow-listed models (comma-separated)
  if (!models.length || !models.every((m) => /^[a-z0-9][a-z0-9.-]{2,60}$/.test(m))) throw new Error("--model is required (one or more model ids, comma-separated)");
  const round2 = String(args.round2 || "").split(",").filter(Boolean);
  if (!round2.every((h) => approved.includes(h))) throw new Error("--round2 hashes must be among the approved ones");
  const expires = args.expires ? Date.parse(args.expires) : 0;
  if (args.expires && !Number.isFinite(expires)) throw new Error("--expires must be an ISO time");
  const { ROUND2_PREFIX } = await import("../lib/prompt.mjs");
  const boot = `
const CONFIG = { tokenSha256: ${JSON.stringify(args["token-sha256"])}, approved: new Set(${JSON.stringify(approved)}), models: ${JSON.stringify(models)}, maxBody: 400000, expiresAt: ${expires}, round2Bases: new Set(${JSON.stringify(round2)}), round2Prefix: ${JSON.stringify(ROUND2_PREFIX)}, round2MaxCards: 6, round2MaxAssistant: 150000, round2MaxUser: 20000 };
Deno.serve((req) => handle(req, { ...CONFIG, apiKey: (Deno.env.get("ANTHROPIC_API_KEY") || "").trim() }, fetch));
`;
  process.stdout.write(`${handler}\n${boot}`);
} else {
  throw new Error("usage: render.mjs live|disabled");
}
