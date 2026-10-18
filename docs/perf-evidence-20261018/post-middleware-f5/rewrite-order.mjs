// F5: static evaluation of the routing order for the post path, from the REAL vercel.json and the
// REAL middleware matcher. Assumed Vercel order (documented platform behaviour, not re-measured here):
//   redirects -> Edge Middleware (if matcher matches) -> filesystem -> vercel.json rewrites in file order (first match wins).
// `has` header values are tried both anchored (^(?:v)$) and unanchored; the table is flagged if they differ.
// Usage: node docs/perf-evidence-20261018/post-middleware-f5/rewrite-order.mjs [out.json]
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../..");
const vercel = JSON.parse(readFileSync(path.join(root, "vercel.json"), "utf8"));
const core = readFileSync(path.join(root, "middleware-core.js"), "utf8");
const matcher = /matcher:\s*\[\s*'([^']+)'/.exec(core)[1].replace(/\\\\/g, "\\");
const matcherRe = new RegExp("^" + matcher + "$");

// minimal path-to-regexp for the patterns used in this file: literals, (regex) groups, :name*
function compile(source) {
  if (source === "/:path*") return { re: /^(.*)$/, names: 1 };
  let re = "", i = 0, groups = 0;
  while (i < source.length) {
    const ch = source[i];
    if (ch === "(") {
      let depth = 0, j = i;
      for (; j < source.length; j++) { if (source[j] === "(") depth++; else if (source[j] === ")" && --depth === 0) break; }
      re += source.slice(i, j + 1); groups++; i = j + 1;
    } else { re += ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"); i++; }
  }
  return { re: new RegExp("^" + re + "$"), names: groups };
}
function hasOk(has, ctx, anchored) {
  return (has || []).every((h) => {
    if (h.type === "host") return new RegExp(anchored ? `^(?:${h.value})$` : h.value).test(ctx.host);
    if (h.type === "header") return new RegExp(anchored ? `^(?:${h.value})$` : h.value, "i").test(ctx.headers[h.key] || "");
    return false;
  });
}
function expand(dest, m) { return dest.replace(/\$(\d)/g, (_, n) => m[Number(n)] ?? ""); }
function firstMatch(list, ctx, anchored) {
  for (let idx = 0; idx < list.length; idx++) {
    const r = list[idx], c = compile(r.source);
    let p = ctx.path; let m = c.re.exec(p);
    if (!m) { try { m = c.re.exec(decodeURIComponent(p)); } catch { /* */ } }
    if (m && hasOk(r.has, ctx, anchored)) return { idx, rule: r, dest: expand(r.destination, m) };
  }
  return null;
}

const UA = {
  chrome: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0.0.0 Safari/537.36",
  googlebot: "Mozilla/5.0 (compatible; Googlebot/2.1; +http://www.google.com/bot.html)",
  bing: "Mozilla/5.0 (compatible; bingbot/2.0; +http://www.bing.com/bingbot.htm)",
  facebook: "facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)",
  gptbot: "Mozilla/5.0 AppleWebKit/537.36 (KHTML, like Gecko; compatible; GPTBot/1.2; +https://openai.com/gptbot)",
  slurp: "Mozilla/5.0 (compatible; Yahoo! Slurp; http://help.yahoo.com/help/us/ysearch/slurp)",
};
const cases = [
  ["browser", "/post/some-slug", "chrome"], ["Googlebot", "/post/some-slug", "googlebot"], ["Bingbot", "/post/some-slug", "bing"],
  ["facebookexternalhit", "/post/some-slug", "facebook"], ["GPTBot", "/post/some-slug", "gptbot"], ["Yahoo Slurp (kind=browser)", "/post/some-slug", "slurp"],
  ["Googlebot, trailing slash", "/post/some-slug/", "googlebot"], ["browser, Hebrew slug", "/post/%D7%AA%D7%A4%D7%99%D7%9C%D7%94", "chrome"],
  ["Googlebot, legacy /slug", "/some-slug", "googlebot"], ["browser, legacy /slug", "/some-slug", "chrome"],
  ["browser, /post (list alias)", "/post", "chrome"], ["browser, slug with dot", "/post/foo.bar", "chrome"],
  ["Googlebot, direct /api/og", "/api/og", "googlebot"],
];
const out = [];
for (const [label, p, ua] of cases) {
  const ctx = { path: p, host: "sod1820.co.il", headers: { "user-agent": UA[ua] } };
  const row = { case: label, path: p };
  const chain = [];
  const red = firstMatch(vercel.redirects, ctx, true);
  if (p.startsWith("/api/")) chain.push("FILESYSTEM: serverless function wins before rewrites (middleware skipped by matcher)");
  else if (red) { chain.push(`REDIRECT ${red.rule.statusCode || (red.rule.permanent ? 308 : 307)} -> ${red.dest} (redirects[${red.idx}])`); }
  else {
    const inMw = matcherRe.test(p);
    chain.push(inMw ? "MIDDLEWARE runs (matcher matches)" : "middleware SKIPPED (matcher excludes path)");
    const a = firstMatch(vercel.rewrites, ctx, true), u = firstMatch(vercel.rewrites, ctx, false);
    if (a?.idx !== u?.idx) row.anchoringSensitive = true;
    chain.push(a ? `REWRITE rewrites[${a.idx}] -> ${a.dest}` : "no rewrite (filesystem / 404)");
  }
  row.chain = chain; out.push(row);
}
const summary = { matcher, firstPostRewriteIdx: vercel.rewrites.findIndex((r) => r.source === "/post/(.*)" && r.has), genericShareBotRewriteIdx: vercel.rewrites.findIndex((r) => r.source === "/(.*)" && r.has), plain2029PostRewriteIdx: vercel.rewrites.findIndex((r) => r.source === "/post/(.*)" && !r.has), catchAllIdx: vercel.rewrites.length - 1, cases: out };
if (process.argv[2]) writeFileSync(process.argv[2], JSON.stringify(summary, null, 2) + "\n");
for (const r of out) console.log(r.case.padEnd(30), r.path.padEnd(24), r.chain.join("  |  "), r.anchoringSensitive ? " [anchoring-sensitive]" : "");
console.log("indices:", JSON.stringify({ ...summary, cases: undefined }));
