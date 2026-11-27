// Read-only integrity audit of the admitted-number set against the anonymous database (S-62 / S-63). Never writes.
//   node scripts/audit-admitted-numbers.mjs [--sample=40] [--sitemap=https://sod1820.co.il/sitemap.xml?part=catalog]
// It proves, with the public anonymous key only: (1) the paged read of sitemap_numbers is complete (pages add up to the exact total);
// (2) the set is the same as one unpaged call restricted to its first 1,000 rows, extended (the old sitemap block listed only those);
// (3) a sample of numbers inside the set and of numbers next to it, asked one by one from is_number_indexable (the decision the document uses),
//     gives the same answer as membership; (4) optionally, what the live sitemap lists against the set.
import { readAdmittedNumberRows2029 } from "../src/lib/admittedNumbers2029.js";
const SUPABASE_URL = "https://linswmnnkjxvweumprav.supabase.co";
const ANON = (await import("node:fs")).readFileSync(new URL("../public-reading-deploy/first-words.js", import.meta.url), "utf8").match(/SUPABASE_ANON = "([^"]+)"/)[1];
const headers = { apikey: ANON, Authorization: "Bearer " + ANON };
const arg = name => process.argv.find(a => a.startsWith(`--${name}=`))?.split("=").slice(1).join("=");
const sample = Number(arg("sample") || 40);

const rows = await readAdmittedNumberRows2029({ supabaseUrl: SUPABASE_URL, headers, attempts: 2 });
const set = new Set(rows.map(r => r.value));
const first = await (await fetch(`${SUPABASE_URL}/rest/v1/rpc/sitemap_numbers`, { method: "POST", headers: { ...headers, "Content-Type": "application/json", Prefer: "count=exact" }, body: "{}" }));
const unpaged = await first.json();
const total = Number(first.headers.get("content-range")?.split("/")[1]);
const out = { admitted: set.size, exactTotal: total, pagedEqualsTotal: set.size === total, unpagedRows: unpaged.length, missingFromUnpaged: set.size - unpaged.length,
  unpagedIsPrefixOfPaged: unpaged.every((r, i) => r.value === rows[i]?.value), range: [rows[0]?.value, rows.at(-1)?.value],
  priorities: Object.fromEntries([...new Set(rows.map(r => r.priority))].map(p => [p, rows.filter(r => r.priority === p).length])) };
const pick = [];
for (let i = 0; i < sample; i += 1) { const r = rows[Math.floor((i / sample) * rows.length)]; pick.push(r.value, r.value + 1); }
const decide = async value => (await (await fetch(`${SUPABASE_URL}/rest/v1/rpc/is_number_indexable`, { method: "POST", headers: { ...headers, "Content-Type": "application/json" }, body: JSON.stringify({ p_value: value }) })).json());
const mismatches = [];
for (const value of [...new Set(pick)].filter(v => v <= 2147483647)) { const answer = await decide(value); if (answer !== set.has(value)) mismatches.push({ value, perKey: answer, inSet: set.has(value) }); }
out.sampled = new Set(pick).size; out.mismatchesAgainstPerKeyDecision = mismatches;
const sitemapUrl = arg("sitemap");
if (sitemapUrl) {
  const xml = await (await fetch(sitemapUrl, { headers: { "User-Agent": "Mozilla/5.0 (compatible; Googlebot/2.1)" } })).text();
  const listed = new Set([...xml.matchAll(/\/number\/(\d+)<\/loc>/g)].map(m => Number(m[1])));
  out.sitemap = { listed: listed.size, missingFromSitemap: [...set].filter(v => v >= 10 && !listed.has(v)).length, notAdmittedButListed: [...listed].filter(v => !set.has(v)).length };
}
console.log(JSON.stringify(out, null, 1));
process.exit(out.pagedEqualsTotal && mismatches.length === 0 ? 0 : 1);
