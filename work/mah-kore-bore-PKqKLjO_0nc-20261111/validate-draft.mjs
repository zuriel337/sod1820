// Draft validation for the Mah Kore PKqKLjO_0nc package. Read-only; no DB, no network.
import fs from "node:fs";
import assert from "node:assert/strict";
const dir = new URL("./", import.meta.url);
const rd = (f) => fs.readFileSync(new URL(f, dir), "utf8");
const post = rd("post.html"), meta = JSON.parse(rd("post-meta.json")), trace = rd("method-trace.md"), g = JSON.parse(rd("graph-proposals.json"));
const SUB = "שני אירועי ריח חריגים בארץ, ובמקביל שמונה משפחות יהודיות מתחילות להתיישב בפאתי יריחו — מה הקשר בין הריח, יריחו והמשיח?";
const results = [];
const t = (name, fn) => { try { fn(); results.push(["PASS", name]); } catch (e) { results.push(["FAIL", name + " :: " + e.message]); } };
t("subtitle exact (meta+post)", () => { assert.equal(meta.subtitle, SUB); assert.ok(post.includes(SUB)); });
t("categories only תיעוד אירועים", () => assert.deepEqual(meta.categories, ["תיעוד אירועים"]));
t("no 'וידאו' category / no רמזים חזקים anywhere", () => { assert.ok(!meta.categories.includes("וידאו")); assert.ok(![...meta.tags, ...meta.categories].includes("רמזים חזקים")); assert.ok(!post.includes("רמזים חזקים")); });
t("series set separately", () => assert.equal(meta.series, "מה קורה הבורא"));
t("no personal voice / 'חברים' (quotes excluded)", () => { const txt = post.replace(/<blockquote>[\s\S]*?<\/blockquote>/g, "").replace(/<[^>]+>/g, " "); assert.ok(!/(^|\s)אני(\s|$)/.test(txt), "אני"); assert.ok(!txt.includes("חברים")); });
t("chapter timestamps match t= seconds", () => { const re = /t=(\d+)s">([\d:]+)</g; let m, n = 0; while ((m = re.exec(post))) { n++; const p = m[2].split(":").map(Number); const s = p.length === 3 ? p[0]*3600+p[1]*60+p[2] : p[0]*60+p[1]; assert.equal(Number(m[1]), s, m[2]); } assert.ok(n >= 15, "count " + n); });
t("creator credit + channel link", () => { assert.ok(post.includes("youtube.com/@alonlevifaithfull")); assert.ok(post.includes("שייכים ליוצר")); });
t("not presented as verbatim transcript", () => { assert.ok(post.includes("אינו תמלול מילולי")); });
t("event dates: 2.11 / 4.11 (event) / 5.11 (article)", () => { for (const d of ["2.11.2026", "4.11.2026", "5.11.2026"]) assert.ok(post.includes(d), d); assert.ok(post.includes("תאריך האירוע הוא 4.11 ותאריך פרסום הכתבה הוא 5.11")); });
t("gematria table values == method-trace.md", () => {
  const tr = new Map(); for (const l of trace.split("\n")) { const m = l.match(/^\| ([^|]+?) \| (\d+) \|/); if (m) tr.set(m[1].trim(), Number(m[2])); }
  const rows = [...post.matchAll(/<tr><td>([^<]+)<\/td><td>(\d+)<\/td>/g)];
  assert.ok(rows.length >= 9);
  const alias = { "חשון (כתיב חסר)": "חשון" };
  for (const [, ph, v] of rows) { const keys = (alias[ph] ? [alias[ph]] : ph.split(" / ")).map(s => s.trim()); for (const k of keys) { assert.ok(tr.has(k), "no trace for " + k); assert.equal(tr.get(k), Number(v), k); } }
});
t("354/353 caveat for לה׳ present", () => { assert.ok(post.includes("353")); assert.equal(trace.match(/אשה הוא לה׳ \| (\d+)/)[1], "353"); });
t("no mgketer/guessed links", () => assert.ok(!post.includes("mgketer")));
t("graph: all proposals are candidates, no writes", () => { assert.ok(g.proposed_edges.every(e => e.state === "candidate")); assert.ok(g._status.startsWith("PROPOSED ONLY")); });
t("media: image prepared, not uploaded", () => { assert.equal(meta.image.status, "PREPARED_NOT_UPLOADED"); for (const f of meta.image.files) assert.ok(fs.existsSync(new URL(f, dir)), f); });
for (const [s, n] of results) console.log(s, n);
process.exit(results.some(([s]) => s === "FAIL") ? 1 : 0);
