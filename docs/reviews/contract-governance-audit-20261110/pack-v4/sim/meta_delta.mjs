// Metadata delta for the execution form, computed by Postgres itself (canonical jsonb text).
import { PGlite } from "@electric-sql/pglite";
import { readFileSync, writeFileSync } from "node:fs";
const EX = new URL("../", import.meta.url).pathname;
const x = JSON.parse(readFileSync(EX + "out/exec_extract.json", "utf8"));
const db = new PGlite();
const one = async (sql, p) => (await db.query(sql, p)).rows[0];
const out = { rules: {} };
let ok = true;
for (const [rid, r] of Object.entries(x.rules)) {
  const base = readFileSync(EX + `base/meta/${rid}@v${r.from}.json`, "utf8");
  const lit = r.meta_literal;
  const b = await one("select md5($1::jsonb::text) m", [base]);
  const n = await one("select md5($1::jsonb::text) m", [lit]);
  const rem = await one("select coalesce(array_agg(k order by k), '{}') ks from jsonb_object_keys($1::jsonb) k where not ($2::jsonb ? k)", [base, lit]);
  const dl = await one("select coalesce(jsonb_object_agg(key, value), '{}'::jsonb)::text d from jsonb_each($2::jsonb) where not ($1::jsonb ? key) or ($1::jsonb -> key) is distinct from value", [base, lit]);
  const chk = await one("select md5((($1::jsonb - $2::text[]) || $3::jsonb)::text) m", [base, rem.ks, dl.d]);
  const good = b.m === r.base_meta_md5 && chk.m === n.m;
  ok &&= good;
  out.rules[rid] = { base_md5: b.m, new_md5: n.m, removed: rem.ks, delta: dl.d, delta_chars: dl.d.length, rebuilt_md5: chk.m, ok: good };
  console.log(`${good ? "OK " : "BAD"} ${rid}: base ${b.m} (guard ${r.base_meta_md5}) new ${n.m} rebuilt ${chk.m} removed=${JSON.stringify(rem.ks)} delta=${dl.d.length} chars`);
}
writeFileSync(EX + "out/meta_delta.json", JSON.stringify(out, null, 1));
await db.close();
process.exit(ok ? 0 : 1);
