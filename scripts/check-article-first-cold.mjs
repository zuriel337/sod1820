// Does a cold Vercel instance finish loading the server DOM after it has answered? (OLD_POST_ARTICLE_FIRST; Codex review 16.11.2026: the
// background load "requires evidence that it is not cut off after the document is returned".) For a PROTECTED PREVIEW of the exact commit only,
// never the live site, and only once ZURIEL has approved that Preview. Read-only and bounded: at most 2 × rounds GET requests, each to a different
// proven old-Post address (so no CDN copy answers instead of the function), with pauses between them.
//
//   VERCEL_PROTECTION_BYPASS=<token> node scripts/check-article-first-cold.mjs --base https://<preview>.vercel.app [--rounds 4] [--pause 3000]
//
// Each round: request A (a cold or idle instance should answer "warming"), wait --pause ms, request B (a different Post): "served" means the load
// that A started finished after A's answer. The report lists, per request, the X-Sod-Article-First state, the cache answer and the time to the
// first byte, and counts how many documents carried the article. A round whose A was already "served" says the instance was warm.
import { readFileSync } from "node:fs";

const args = Object.fromEntries(process.argv.slice(2).reduce((pairs, value, index, all) => (value.startsWith("--") ? [...pairs, [value.slice(2), all[index + 1]]] : pairs), []));
const base = String(args.base || "").replace(/\/+$/, "");
if (!/^https:\/\/[^/]+\.vercel\.app$/.test(base)) throw new Error("check_article_first_cold_needs_a_preview_base: --base https://<preview>.vercel.app (never the live domain)");
const rounds = Math.min(Number(args.rounds || 4), 6), pause = Math.max(Number(args.pause || 3000), 500);
const bypass = process.env.VERCEL_PROTECTION_BYPASS || "";
const API = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = /SUPABASE_ANON\s*=\s*'([^']+)'/.exec(readFileSync(new URL("../src/lib/supabase.js", import.meta.url), "utf8"))[1];
const proof = JSON.parse(readFileSync(new URL("../public-reading-deploy/article-first-proven.json", import.meta.url), "utf8"));
const ids = Object.keys(proof.posts).slice(0, rounds * 2 + 4);
const rows = await (await fetch(`${API}/rest/v1/posts?id=in.(${ids.join(",")})&select=id,slug`, { headers: { apikey: ANON, Authorization: `Bearer ${ANON}` } })).json();
const paths = rows.map(row => `/${row.slug}`).slice(0, rounds * 2);
if (paths.length < rounds * 2) throw new Error("check_article_first_cold_not_enough_proven_posts");
const sleep = ms => new Promise(done => setTimeout(done, ms));

async function get(path) {
  const started = performance.now();
  const response = await fetch(base + path, { headers: { ...(bypass ? { "x-vercel-protection-bypass": bypass } : {}), "user-agent": "sod1820-article-first-cold-check" }, redirect: "manual" });
  const firstByte = Math.round(performance.now() - started);
  const body = await response.text();
  return { path, status: response.status, state: response.headers.get("x-sod-article-first"), cache: response.headers.get("x-vercel-cache"), id: response.headers.get("x-vercel-id"),
    firstByte, article: body.includes('id="sod29-ssr-article"') };
}

const report = [];
for (let round = 0; round < rounds; round += 1) {
  const a = await get(paths[round * 2]);
  await sleep(pause);
  const b = await get(paths[round * 2 + 1]);
  report.push({ round: round + 1, a, b, verdict: a.state === "warming" ? (b.state === "served" ? "cold load finished after the answer" : `cold load not finished (${b.state})`) : `instance already ${a.state}` });
  if (round < rounds - 1) await sleep(pause * 4);
}
const all = report.flatMap(entry => [entry.a, entry.b]);
console.log(JSON.stringify({ base, rounds, pause, served: all.filter(item => item.state === "served").length, documents: all.length, report }, null, 2));
