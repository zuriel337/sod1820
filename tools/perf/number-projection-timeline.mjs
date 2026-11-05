// Read-only: run the REAL Number-page projection in Node against the live Supabase (anon reads only) and log, for every
// request, start/end and the app frames that issued it; used to map the dependency chains (docs/reviews/number-page-speed-20261105).
//   NODE_USE_ENV_PROXY=1 NODE_EXTRA_CA_CERTS=<proxy ca> node tools/perf/number-projection-timeline.mjs 878   (the env vars only if a proxy is needed)
// Node's HTTP/1.1 client can fail the long label/phrase list reads that a browser sends over HTTP/2; supabase-js then retries with back-off, so read
// the first pass of the timeline (before the retries), not the absolute end time.
import path from "node:path";
const ROOT = new URL("../..", import.meta.url).pathname;
process.chdir(ROOT);
const t0 = Date.now();
const log = [];
const realFetch = globalThis.fetch.bind(globalThis);
function appFrames(stack) {
  return String(stack || "").split("\n").map((l) => l.trim())
    .filter((l) => /\/src\/(lib|pages|components)\//.test(l) && !/node_modules/.test(l))
    .map((l) => { const m = /at (?:async )?([^\s(]+)? ?\(?.*\/src\/((?:lib|pages|components)\/[^:]+):(\d+)/.exec(l); return m ? `${m[1] || "<anon>"}@${m[2].split("/").pop()}:${m[3]}` : null; })
    .filter(Boolean).slice(0, 4).join(" < ");
}
globalThis.fetch = async (input, init) => {
  const url = new URL(typeof input === "string" ? input : input.url);
  const method = String((init && init.method) || (typeof input !== "string" && input.method) || "GET").toUpperCase();
  if (/\.supabase\.co$/.test(url.hostname) && method !== "GET" && !/\/rest\/v1\/rpc\//.test(url.pathname)) throw new Error("probe refuses non-read request " + method + " " + url.pathname);
  const entry = { s: Date.now() - t0, method, path: url.pathname.replace("/rest/v1/", ""), q: decodeURIComponent(url.search).slice(0, 110), frames: appFrames(new Error().stack) };
  log.push(entry);
  try { const r = await realFetch(input, init); entry.e = Date.now() - t0; entry.status = r.status; if (/fn_number_lookup/.test(url.pathname)) { entry.body = (init && init.body) ? String(init.body).slice(0,90) : ''; r.clone().arrayBuffer().then((b) => { entry.bytes = b.byteLength; }); } return r; } catch (e) { entry.e = Date.now() - t0; entry.err = String(e.message).slice(0, 80); throw e; }
};
const { fetchEntityHubProjection } = await import(path.join(ROOT, "src/lib/research/entityHubProjection.js"));
const key = process.argv[2] || "878";
const start = Date.now() - t0;
const data = await fetchEntityHubProjection({ type: "number", key, relationLimit: 140, researchLimit: 80, topicLimit: 24, allowUnstoredNumber: true, parallelNumberReads: true });
const end = Date.now() - t0;
log.sort((a, b) => a.s - b.s);
console.log(`projection for ${key}: start ${start} ms, resolved at ${end} ms, requests ${log.length}, nodeId ${data?.identity?.nodeId}`);
for (const r of log) if (/fn_number_lookup/.test(r.path)) console.log("LOOKUP", r.body, "bytes", r.bytes, "dur", (r.e??0)-r.s, r.frames.slice(0,90));
for (const r of log) console.log(`${String(r.s).padStart(5)} ${String(r.e ?? "?").padStart(5)} ${String((r.e ?? 0) - r.s).padStart(5)} ${String(r.status ?? r.err ?? "").padEnd(4)} ${r.path.split("?")[0].padEnd(26)} ${r.frames.slice(0,110)}`);
