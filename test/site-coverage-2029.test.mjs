import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";

// Permanent measurement coverage guard (27.11.2026). ONE existing mechanism: the client allow-list (readingActionSpec), ingest_event and Traffic
// Intelligence. This test adds no collection: it keeps docs/reviews/measurement-coverage-20261127/coverage.json honest against the real code.
const root = new URL("../", import.meta.url).pathname;
const coverage = JSON.parse(readFileSync(join(root, "docs/reviews/measurement-coverage-20261127/coverage.json"), "utf8"));
const { readingActionSpec } = await import("../src/lib/publicReadingTelemetry2029.js");
const { registerVideoSpec2029 } = await import("../src/lib/publicReadingVideoSpec2029.js");
registerVideoSpec2029();
const spec = readingActionSpec();
// page, performance and the visit RPC have their own validators outside the family spec.
const OWN_VALIDATOR = new Set(["page", "performance"]);
const accepted = (surface, event) => {
  if (OWN_VALIDATOR.has(surface)) return true;
  const f = spec[surface];
  if (!f) return false;
  return Array.isArray(f.events) ? f.events.includes(event) : /^[a-z][a-z0-9_]{0,47}$/.test(event);
};
const files = [];
(function walk(d) { for (const n of readdirSync(d)) { const p = join(d, n); const s = statSync(p); if (s.isDirectory()) { if (n !== "node_modules") walk(p); } else if (/\.(jsx?|mjs)$/.test(n) && !/\.test\./.test(n)) files.push(p); } })(join(root, "src"));
const source = files.map(f => readFileSync(f, "utf8")).join("\n");

test("every row is complete and every gap points at a staged closure step", () => {
  const stages = new Set(coverage.plan.map(p => p.id));
  assert.equal(stages.size, coverage.plan.length, "plan ids are unique");
  for (const p of coverage.plan) { assert.ok(Array.isArray(p.needs) && p.needs.length, p.id + " names its approvals"); assert.equal(typeof p.db, "boolean"); assert.equal(typeof p.contract, "boolean"); }
  const ids = new Set();
  for (const r of coverage.rows) {
    assert.ok(!ids.has(r.id), "duplicate row " + r.id); ids.add(r.id);
    assert.deepEqual(Object.keys(r.stages).sort(), ["click", "failure", "start", "success", "view"], r.id);
    for (const [k, s] of Object.entries(r.stages)) assert.ok(coverage.vocabulary[s.status], `${r.id}.${k} status`);
    const open = Object.values(r.stages).some(s => s.status === "not_emitted" || s.status === "not_sent" || s.status === "other_channel");
    if (open) assert.ok(stages.has(r.gap_stage), r.id + " has an open stage and needs a gap_stage in the plan");
    if (r.gap_stage) assert.ok(stages.has(r.gap_stage), r.id + " names an unknown stage");
  }
});

test("a stage marked measured is a real emission and is accepted by the allow-list", () => {
  for (const r of coverage.rows) for (const [k, s] of Object.entries(r.stages)) {
    if (s.status !== "measured") continue;
    const [surface, event] = s.event.split("/");
    assert.ok(accepted(surface, event), `${r.id}.${k}: ${s.event} is not accepted by the public allow-list`);
    if (!OWN_VALIDATOR.has(surface)) assert.ok(source.includes(`"${event}"`), `${r.id}.${k}: no emission of "${event}" in src`);
  }
});

test("a stage marked not_sent is still emitted in the code and still refused by the allow-list", () => {
  for (const r of coverage.rows) for (const [k, s] of Object.entries(r.stages)) {
    if (s.status !== "not_sent") continue;
    const [surface, event] = s.event.split("/");
    if (["story_2029", "journey_2029"].includes(surface)) continue; // allow-listed families without a reachable emitter: tracked by their own rows
    assert.equal(accepted(surface, event), false, `${r.id}.${k}: ${s.event} is now accepted: mark it measured`);
  }
});

test("drift guard: a literal emit() that the public build would silently drop must be declared in known_not_sent", () => {
  const found = new Set();
  for (const m of source.matchAll(/\bemit\(\s*"([a-z0-9_-]+)"\s*,\s*"([a-z0-9_]+)"/g)) found.add(m[1] + "/" + m[2]);
  const dropped = [...found].filter(p => { const [s, e] = p.split("/"); return !accepted(s, e); });
  const declared = new Set(coverage.known_not_sent);
  const undeclared = dropped.filter(p => !declared.has(p));
  assert.deepEqual(undeclared, [], "new emission(s) the public build drops silently; add to the allow-list (with the ingest_event entry) or declare it");
  // The list cannot rot: every declared pair is still literally emitted somewhere via emit() or track().
  for (const p of declared) {
    const [s, e] = p.split("/");
    const present = found.has(p) || new RegExp(`track\\(\\s*"${s}"[^)]*"${e}"`).test(source) || source.includes(`"${e}"`);
    assert.ok(present, `${p} is declared not-sent but no longer appears in src: remove it`);
    assert.equal(accepted(s, e), false, `${p} is accepted now: remove it from known_not_sent`);
  }
});

test("privacy and speed rails: the allow-list carries only tokens, booleans and bounded integers", () => {
  for (const [name, f] of Object.entries(spec)) {
    for (const [field, kind] of Object.entries(f.fields)) assert.ok(["token", "bool", "int"].includes(kind), `${name}.${field} is ${kind}: free text is never allowed`);
  }
});
