// GAP-1 · numLink — canonical /number/:phrase link + arrival context (provenance) as query.
// Run: node test/ccnav.test.mjs
import { numLink } from "../src/lib/ccnav.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };
const dec = (u) => decodeURIComponent(u);

// 1 · bare (no ctx) — unchanged canonical node
ok(numLink(1820) === "/number/1820", "number → /number/1820");
ok(dec(numLink("ובתורתו")) === "/number/ובתורתו", "phrase → /number/<phrase> (encoded)");
ok(numLink("תורה אחת").includes("%20") || numLink("תורה אחת").includes("%D7"), "spaces/hebrew are encoded");

// 2 · with context — method+expr+src as query (provenance, does NOT change the node)
const u = numLink(1820, { method: "מילוי", expr: "ובתורתו", src: "פורום · צבי" });
ok(u.startsWith("/number/1820?"), "value stays the canonical node, ctx is query");
const q = new URLSearchParams(u.split("?")[1]);
ok(q.get("method") === "מילוי", "method carried");
ok(q.get("expr") === "ובתורתו", "expr carried");
ok(q.get("src") === "פורום · צבי", "src carried");

// 3 · partial ctx — only provided keys appear
const u2 = numLink("תורה אחת", { src: "פורום" });
const q2 = new URLSearchParams(u2.split("?")[1]);
ok(q2.get("src") === "פורום" && !q2.get("method") && !q2.get("expr"), "only provided ctx keys included");

// 4 · empty ctx → no query (identical to bare)
ok(numLink(764, {}) === "/number/764", "empty ctx adds no query");
ok(numLink(764, { method: "", expr: "", src: "" }) === "/number/764", "all-empty ctx adds no query");

// 5 · the node is NEVER a new route — always /number/<key>
ok(numLink(1020, { method: "רגיל" }).startsWith("/number/1020"), "no /method/ route — number stays canonical");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (ccnav / GAP-1)`);
process.exit(fail === 0 ? 0 : 1);
