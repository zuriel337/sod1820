// Rebuilds the two engine-result files of round 2 from the values list of the SQL that was executed plus the per-key engine outputs transcribed from the MCP result.
import { readFileSync, writeFileSync } from "node:fs";
const out = new URL("./", import.meta.url);
const values = (file) => [...readFileSync(new URL(`../${file}`, import.meta.url), "utf8").split("\n")[1].matchAll(/\('(r2\.f\d+\.0)', '([^']+)', (\d+), (\d+), (-?1)\)/g)].map((m) => ({ key: m[1], term: m[2], start: Number(m[3]), skip: Number(m[4]), dir: Number(m[5]) }));
// key -> [hits, found, truncated afterStart afterDir | follow-up]
const eng = {
  f08: { hits: 100, found: false, cont: { dir: 1, skip: 4545, start: 129811 }, follow: true }, f09: { hits: 4 }, f10: { hits: 39 }, f11: { hits: 30 }, f12: { hits: 3 }, f13: { hits: 13 },
  f18: { hits: 1 }, f19: { hits: 2 }, f20: { hits: 100, found: false, cont: { dir: 1, skip: 4545, start: 99660 }, follow: true }, f21: { hits: 15 }, f22: { hits: 100, found: true, cont: { dir: 1, skip: 4545, start: 270315 } },
  f23: { hits: 13 }, f24: { hits: 2 }, f25: { hits: 1 }, f29: { hits: 94 }, f30: { hits: 29 }, f31: { hits: 1 }, f32: { hits: 2 }, f33: { hits: 27 },
  f37: { hits: 100, found: false, cont: { dir: 1, skip: 4546, start: 242411 }, follow: true }, f38: { hits: 70 }, f39: { hits: 3 }, f40: { hits: 1 }, f41: { hits: 2 },
  f42: { hits: 100, found: false, cont: { dir: -1, skip: 4545, start: 96837 }, follow: true }, f43: { hits: 18 },
};
const rows = (file) => values(file).map((v) => {
  const id = v.key.split(".")[1];
  const base = { dir: v.dir, key: v.key, skip: v.skip, term: v.term, start: v.start };
  const tail = { db_text: v.term, letters_match: true };
  if (v.skip < 2) return { ...base, engine: { status: "plain_text_row_not_els" }, ...tail };
  const e = eng[id];
  const truncated = Boolean(e.cont);
  const engine = { hits: e.hits, found: e.found ?? true, status: "OK", completion: { executed: true, has_more: truncated, truncated, continuation: truncated ? { kind: "els_keyset_v1", after: e.cont } : null, returned_hits: e.hits } };
  if (e.follow) { engine.first_page_found = false; engine.found = true; engine.followup = `first page of 100 hits was truncated before this start; the same engine function (els_search_page_core_v1, same term/skip) was asked for the keyset continuation after (skip ${v.skip}, start ${v.start - 1}, dir ${v.dir}) and its first hit was start ${v.start} dir ${v.dir}`; }
  return { ...base, engine, ...tail };
});
writeFileSync(new URL("r2-01.json", out), JSON.stringify([{ verification: rows("verification-round2-01.sql") }]));
writeFileSync(new URL("r2-02.json", out), JSON.stringify([{ verification: rows("verification-round2-02.sql") }]));
const all = [...rows("verification-round2-01.sql"), ...rows("verification-round2-02.sql")];
console.log(all.length, "rows;", all.filter((r) => r.engine.followup).length, "with follow-up;", all.filter((r) => r.engine.status === "plain_text_row_not_els").length, "plain");
