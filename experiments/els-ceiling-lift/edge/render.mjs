#!/usr/bin/env node
// Renders the source of the temporary pass-through function for EXP-24 from the SAME handler as EXP-15..23 (experiments/els-axis-addendum/edge/handler.mjs, a verbatim copy of EXP-15..18's).
// Same protections as before: only the SHA-256 of the one-time token, the approved lock hashes (the reviewed requests, at most 20), exactly one model, an expiry, no round 2. Disabled version: 410.
//   node edge/render.mjs live --token-sha256 <hex> --approve <lock-sha256>[,...] --model <id> --expires <ISO time> > index.ts
//   node edge/render.mjs disabled > index.ts
import { renderSource as renderPrevious, MAX_LOCKS } from "../../els-line-groups/edge/render.mjs";

export { MAX_LOCKS };
export function renderSource(mode, args = {}) {
  if (mode === "disabled") return '// els-live-reading is disabled: the EXP-24 run is over. Every request is refused.\nDeno.serve(() => new Response(JSON.stringify({ error: "gone" }), { status: 410, headers: { "content-type": "application/json" } }));\n';
  return renderPrevious(mode, args);
}

if (process.argv[1] && import.meta.url === new URL(process.argv[1], "file://").href) {
  const [mode, ...rest] = process.argv.slice(2);
  const args = Object.fromEntries(rest.map((item, i, all) => (item.startsWith("--") ? [item.slice(2), all[i + 1]] : null)).filter(Boolean));
  process.stdout.write(renderSource(mode, args));
}
