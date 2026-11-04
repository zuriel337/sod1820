import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import vm from "node:vm";

const source = readFileSync("src/lib/supabase.js", "utf8");
const body = source.slice(source.indexOf("export async function getEntityBundle("), source.indexOf("// ── Comments ─"))
  .replace("export async function", "async function");
async function load(is2029) {
  const reads = [];
  const rows = [
    ...Array.from({ length: 30 }, (_, i) => ({ id: `unpublished-${i}`, primary_value: 1820, all_values: [1820], published: 0, min_tier: 0, curator_hidden: false })),
    { id: "public", primary_value: 1820, all_values: [1820], published: 1, min_tier: 0, curator_hidden: false },
    { id: "hidden", primary_value: 1820, all_values: [1820], published: 1, min_tier: 0, curator_hidden: true },
    { id: "private", primary_value: 1820, all_values: [1820], published: 1, min_tier: 2, curator_hidden: false },
  ];
  class Query {
    constructor(table) { this.table = table; this.filters = []; this.ops = []; this.maximum = Infinity; if (table === "gallery_images") reads.push(this); }
    select() { return this; }
    eq(key, value) { this.ops.push(`eq:${key}`); this.filters.push(row => row[key] === value); return this; }
    not(key, _op, value) { this.ops.push(`not:${key}`); this.filters.push(row => row[key] !== value); return this; }
    contains(key, values) { this.filters.push(row => values.every(value => row[key]?.includes(value))); return this; }
    order() { this.ops.push("order"); return this; }
    limit(value) { this.ops.push("limit"); this.maximum = value; return this; }
    then(resolve, reject) {
      const filtered = this.table === "gallery_images" ? rows.filter(row => this.filters.every(filter => filter(row))) : [];
      return Promise.resolve({ data: filtered.slice(0, this.maximum), count: filtered.length }).then(resolve, reject);
    }
  }
  const supabase = { from: table => new Query(table), rpc: () => Promise.resolve({ data: [] }) };
  const context = vm.createContext({ supabase, __SOD_2029_BUILD__: is2029 });
  vm.runInContext(body, context);
  return { result: await context.getEntityBundle({ term: "1820", value: 1820, isNumber: true }), reads };
}
test("2029 publication is applied before both bounded media windows and exact counts", async () => {
  const { result, reads } = await load(true);
  assert.deepEqual(Array.from(result.galleries, row => row.id), ["public"]);
  assert.equal(result.galleriesCount, 1);
  assert.equal(reads.length, 2);
  for (const query of reads) {
    assert.ok(query.ops.indexOf("eq:published") >= 0);
    assert.ok(query.ops.indexOf("eq:published") < query.ops.indexOf("limit"));
  }
});
test("Legacy keeps its existing numeric media query; no global behavior change", async () => {
  const { result, reads } = await load(false);
  assert.equal(result.galleriesCount, 31);
  assert.ok(result.galleries.some(row => row.id === "unpublished-0"));
  assert.ok(reads.every(query => !query.ops.includes("eq:published")));
});
