// The hourly Egress Watch (an external automation, not in this repository) is preserved by its output contract: a live row must satisfy
// it, and the database readers must read only fields the contract guarantees. No collector is added.
import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const dir = new URL("../docs/reviews/analytics-google-seo-closure-20261118/egress-watch/", import.meta.url);
const contract = JSON.parse(readFileSync(new URL("contract.json", dir), "utf8"));
const sample = JSON.parse(readFileSync(new URL("sample-infra_egress_hour-2026-11-18T15.json", dir), "utf8"));
const get = (o, path) => path.split(".").reduce((v, k) => (v == null ? v : v[k]), o);

function check(kind, value) {
  if (kind === "integer>=0") return Number.isSafeInteger(value) && value >= 0;
  if (kind === "array") return Array.isArray(value);
  if (kind === "string") return typeof value === "string" && value.length > 0;
  if (kind === "false") return value === false;
  if (kind === "iso-hour") return /^\d{4}-\d{2}-\d{2}T\d{2}:00:00Z$/.test(value);
  return kind.split("|").includes(value);
}

test("the live sample satisfies the contract", () => {
  assert.match(sample.cache_key, new RegExp(contract.cache_key_pattern));
  assert.equal(sample.producer, contract.row.producer); assert.equal(sample.producer_version, contract.row.producer_version);
  for (const [path, kind] of Object.entries(contract.required)) assert.ok(check(kind, get(sample.payload, path)), `${path}: ${kind}`);
  assert.equal(sample.payload.producer_automation_id, contract.producer_automation_id);
  assert.equal(`infra_egress_hour:${sample.payload.window_start}`, sample.cache_key, "the key is the hour the row describes");
});

test("no client identifier or object path anywhere in the row", () => {
  const keys = []; (function walk(v) { if (v && typeof v === "object") for (const [k, x] of Object.entries(v)) { keys.push(k.toLowerCase()); walk(x); } })(sample.payload);
  for (const bad of contract.forbidden_anywhere) assert.equal(keys.includes(bad), false, bad);
});

test("the database readers in the repository read only contract fields of infra_egress_hour", () => {
  for (const file of ["20260928113000_egress_hardening_monitoring_v1.sql", "20261103175126_control_health_unknown_failures.sql"]) {
    const sql = readFileSync(new URL(`../supabase/migrations/${file}`, import.meta.url), "utf8");
    assert.ok(sql.includes("infra_egress_hour:"), file);
    for (const m of sql.matchAll(/payload\s*->>?\s*'([a-z_0-9]+)'/g)) {
      if (["storage_get_bytes"].includes(m[1]) || m[1] in sample.payload) continue;
      assert.fail(`${file} reads payload.${m[1]}, which the contract does not carry`);
    }
  }
});
