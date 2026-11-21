// Private search wall writer (ZURIEL 21.11.2026): one row per settled term per source, never per keystroke; nothing for the
// anonymous mode, empty/symbol-only text or an unknown source; the value is sent only when it is a safe integer.
import test from "node:test";
import assert from "node:assert/strict";

const store = new Map();
globalThis.sessionStorage = { getItem: k => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)), removeItem: k => store.delete(k) };
const { logSearch2029, normalizeSearchTerm, regularValueOf } = await import("../src/lib/searchLog2029.js");
const wait = ms => new Promise(r => setTimeout(r, ms));

test("typing settles into one row per source with the last term; a repeat is not sent twice", async () => {
  const calls = [], rpc = (name, args) => { calls.push([name, args]); return Promise.resolve({}); };
  for (const t of ["ש", "של", "שלום"]) logSearch2029(t, 376, "gematria", { rpc, settleMs: 20 });
  logSearch2029("אבג", null, "els", { rpc, settleMs: 20 });
  await wait(60);
  assert.deepEqual(calls, [["log_search_2029", { p_term: "שלום", p_value: 376, p_source: "gematria" }], ["log_search_2029", { p_term: "אבג", p_value: null, p_source: "els" }]]);
  logSearch2029("שלום", 376, "gematria", { rpc, settleMs: 20 });
  await wait(40);
  assert.equal(calls.length, 2, "the same settled term is not logged again");
});

test("nothing is sent for the anonymous mode, empty or symbol-only text, or an unknown source", async () => {
  const calls = [], rpc = (...a) => { calls.push(a); return Promise.resolve({}); };
  assert.equal(logSearch2029("   ", 1, "site", { rpc, settleMs: 5 }), false);
  assert.equal(logSearch2029("!!!", 1, "site", { rpc, settleMs: 5 }), false);
  assert.equal(logSearch2029("דוד", 1, "evil", { rpc, settleMs: 5 }), false);
  store.set("anon-search", "1");
  assert.equal(logSearch2029("דוד", 14, "site", { rpc, settleMs: 5 }), false);
  store.delete("anon-search");
  await wait(20);
  assert.equal(calls.length, 0);
});

test("normalization and the regular value", () => {
  assert.equal(normalizeSearchTerm("  a   b "), "a b");
  assert.equal(normalizeSearchTerm("א".repeat(200)).length, 120);
  assert.equal(regularValueOf([{ methodKey: "קדמי", computedValue: 5 }, { methodKey: "רגיל", computedValue: 26 }]), 26);
  assert.equal(regularValueOf([{ methodKey: "רגיל", computedValue: "x" }]), null);
});

test("before the SQL is applied (PGRST202) the writer stops for the page life and never throws", async () => {
  const calls = [], rpc = (...a) => { calls.push(a); return Promise.resolve({ error: { code: "PGRST202" } }); };
  logSearch2029("ראשון", 1, "site", { rpc, settleMs: 5 });
  await wait(20);
  assert.equal(logSearch2029("שני", 2, "site", { rpc, settleMs: 5 }), false);
  await wait(20);
  assert.equal(calls.length, 1);
});

test("the admin wall (admin_search_wall_2029) explains a missing reader (PGRST202) instead of an empty wall, and is admin-console only", async () => {
  const { readFile } = await import("node:fs/promises");
  const wall = await readFile(new URL("../src/components/experience2029/SearchWall2029.jsx", import.meta.url), "utf8");
  assert.match(wall, /supabase\.rpc\("admin_search_wall_2029"/);
  assert.match(wall, /PGRST202/);
  const control = await readFile(new URL("../src/pages/ControlPlane2029Page.jsx", import.meta.url), "utf8");
  assert.match(control, /React\.lazy\(\(\) => import\("\.\.\/components\/experience2029\/SearchWall2029\.jsx"\)\)/);
  const { execSync } = await import("node:child_process");
  const users = execSync("grep -rl SearchWall2029 src", { encoding: "utf8" }).trim().split("\n").sort();
  assert.deepEqual(users, ["src/components/experience2029/SearchWall2029.jsx", "src/pages/ControlPlane2029Page.jsx"], "no public surface imports the wall");
});
