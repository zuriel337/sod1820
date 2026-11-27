import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

// Cumulative open activity (27.11.2026): the pure model and the page contract. The SQL is proved by test/open-activity-20261127-realpg.sh.
const lib = await import("../src/lib/researchOpenActivity2029.js");
const payload = (over = {}) => ({
  version: 1, state: "measured", window: "week", from: "2026-11-20", to: "2026-11-26",
  families: {
    number: { items: 5, opens: 9, list: [{ href: "/number/10", n: 10, opens: 4, tier: "popular" }, { href: "/number/20", n: 20, opens: 1, tier: "seen" }, { href: "/number/30", n: 30, opens: 2, tier: "seen" }] },
    post: { items: 2, opens: 3, list: [{ href: "/post/a", title: "כותרת", opens: 1, tier: "seen" }, { href: "javascript:alert(1)", title: "x", opens: 1, tier: "seen" }, { href: "/post/b", title: "  ", opens: 2, tier: "seen" }] },
    video: { items: 1, opens: 1, list: [{ href: "/video/0123456789abcdef0123456789abcdef", opens: 1, tier: "seen" }] },
    cipher: { items: 2, opens: 3, list: [{ href: "/codes/x", title: "צופן ציבורי", opens: 2, tier: "seen" }, { href: "/codes/y", opens: 1, tier: "seen" }] },
    ghost: { items: 9, opens: 9, list: [{ href: "/ghost/x", opens: 1, tier: "seen" }] },
  },
  unknown: { number: { items: 1, opens: 2 }, post: { items: 4, opens: 4 } },
  machines: { served: 500 },
  not_measured_by_item: ["topic_card"], ...over,
});

test("a payload that is not measured or not version 1 draws nothing", () => {
  assert.equal(lib.openActivityModel(null), null);
  assert.equal(lib.openActivityModel(payload({ state: "insufficient", families: {} })), null);
  assert.equal(lib.openActivityModel(payload({ version: 2 })), null);
  assert.equal(lib.openActivityModel(payload({ state: "refreshing" })), null);
});

test("activity (seen, even once) is kept apart from popularity (popular tier)", () => {
  const m = lib.openActivityModel(payload());
  const n = m.families.find(f => f.key === "number");
  assert.deepEqual(n.popular.map(x => x.text), ["10"]);
  assert.deepEqual(n.seen.map(x => x.text), ["20", "30"]);
  assert.equal(n.items, 5);
  assert.equal(n.hidden, 2, "the items beyond the server list are a count, never invented rows");
});

test("an unsafe address or an empty label is dropped; a family outside the four is ignored", () => {
  const m = lib.openActivityModel(payload());
  const p = m.families.find(f => f.key === "post");
  assert.deepEqual(p.seen.map(x => x.href), ["/post/a"]);
  assert.equal(m.families.some(f => f.key === "ghost"), false);
  const c = m.families.find(f => f.key === "cipher");
  assert.deepEqual(c.seen.map(x => x.text), ["צופן ציבורי"], "a cipher without a title is dropped, never given an invented name");
});

test("unknown-class opens and machines are totals only, never lists", () => {
  const m = lib.openActivityModel(payload());
  assert.equal(m.unknownOpens, 6);
  assert.equal(m.machinesServed, 500);
  assert.equal(JSON.stringify(m).includes("bot"), false);
  assert.deepEqual(m.unmeasured, ["topic_card"]);
});

test("a video without a title gets a neutral label, never an invented name", () => {
  const v = lib.openActivityModel(payload()).families.find(f => f.key === "video");
  assert.equal(v.seen[0].text, "סרטון 1");
});

test("the three windows are settled ranges with names the page shows", () => {
  assert.deepEqual(lib.OPEN_ACTIVITY_WINDOWS.map(w => w[0]), ["day", "week", "month"]);
});

test("the page mounts the section, the section calls only the one reader, and nothing here identifies a person", () => {
  const page = readFileSync(new URL("../src/pages/Stats2029Page.jsx", import.meta.url), "utf8");
  assert.match(page, /<OpenActivity2029 \/>/);
  const comp = readFileSync(new URL("../src/components/experience2029/OpenActivity2029.jsx", import.meta.url), "utf8");
  const reader = readFileSync(new URL("../src/lib/researchOpenActivity2029.js", import.meta.url), "utf8");
  assert.match(reader, /rpc\("research_open_activity_2029"/);
  for (const text of [comp, reader]) {
    assert.doesNotMatch(text, /session_id|sod_id|visitor|person_id|emit\(|\.from\(|localStorage/);
  }
  assert.match(comp, /if \(state\.unavailable\) return null/, "an unapplied reader draws no block");
});
