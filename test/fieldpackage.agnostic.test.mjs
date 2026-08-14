// Guarantee test: the Field Package read-model FIXES NO METHOD COUNT.
// Feeds a pack with 21 methods (13 known + 8 novel) and asserts zero loss / zero cap.
// This is the invariant the P2-server wrapper must also honor: return fn_gematria_pack
// output UNCHANGED (no method filtering/reduction). Run: node test/fieldpackage.agnostic.test.mjs
import { buildFieldPackage, projectFinding, classifyState } from "../src/lib/fieldpackage.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// Build a synthetic engine pack with an arbitrary 21 methods — including 8 the client has never heard of.
const KNOWN = { "רגיל": 1020, "מילוי": 1820, "מסתתר": 1584, "קדמי": 3851, "גדול": 1020, "סידורי": 84, "אתבש": 545, "אלבם": 329, "אטבח": 180, "ריבוע": 3484, "מילוי בלבד": 800, "הכפלה": 9001, "משולש גדול": 4000 };
const NOVEL = {};
for (let i = 1; i <= 8; i++) NOVEL["שיטה-חדשה-" + i] = 10000 + i; // methods that do NOT exist in gematria.js
const EVIDENCE = { ...KNOWN, ...NOVEL };
const TOTAL = Object.keys(EVIDENCE).length; // 21

const PACK = {
  subject: "ובתורתו", value: 1020, cost: { tokens: 0, used_llm: false },
  stages_requested: ["methods", "convergence", "cross"],
  stages_with_findings: ["methods", "convergence", "cross"],
  stages: {
    methods: { found: true, method_count: TOTAL, source_of_truth: "gematria_methods (registry)", evidence: EVIDENCE },
    // a convergence keyed on a NOVEL method — must still render (row not dropped)
    convergence: { found: true, group_count: 2, source_of_truth: "convergences",
      groups: [
        { kind: "same_method_equality", method: "ragil", score: 5, group_size: 5, status: "new", phrases: ["אותי בראת"] },
        { kind: "same_method_equality", method: "שיטה-חדשה-3", score: 3, group_size: 3, status: "new", phrases: ["דבר חדש"] },
      ] },
    // a cross bridge referencing novel methods in its detail — must pass through verbatim
    cross: { found: true, cross_count: 1, source_of_truth: "strongest_crossings",
      crossings: [{ partner: "מילה אחרת", n_methods: 4, methods_detail: "שיטה-חדשה-1=10001 · רגיל=1020" }] },
  },
};

// 1 · NO CAP — all 21 methods survive
const f = projectFinding(PACK);
ok(TOTAL === 21, "fixture really has 21 methods");
ok(f.methods.length === 21, `finding.methods keeps all 21 (got ${f.methods.length}) — no cap/slice`);
const keys = new Set(f.methods.map((m) => m.method));
ok([1, 2, 3, 4, 5, 6, 7, 8].every((i) => keys.has("שיטה-חדשה-" + i)), "all 8 NOVEL methods present (client-unknown methods not dropped)");
const byM = Object.fromEntries(f.methods.map((m) => [m.method, m.value]));
ok(byM["שיטה-חדשה-5"] === 10005 && byM["מילוי"] === 1820, "novel + known values both intact (no ragil-only reduction)");

// 1b · selfBridge is method-agnostic too — every distinct value becomes a node, novel methods included
ok(Array.isArray(f.selfBridge) && f.selfBridge.length >= 1, "selfBridge built for N methods");
const sbVals = new Set(f.selfBridge.map((b) => b.value));
ok([1, 2, 3, 4, 5, 6, 7, 8].every((i) => sbVals.has(10000 + i)), "all 8 novel-method values appear as bridge nodes (no cap)");

// 2 · convergence on a novel method is not dropped
ok(f.convergences.length === 2, "both convergence groups render (incl. novel-method group)");
ok(f.convergences.some((c) => c.method === "שיטה-חדשה-3"), "convergence keyed on a novel method still appears (row not filtered out)");

// 3 · cross bridge passes through verbatim (novel method in detail)
ok(f.bridges.some((b) => /שיטה-חדשה-1/.test(b.detail || "")), "cross bridge detail passes through unchanged");

// 4 · dynamic count label — reflects 21, not a hard-coded number
const s = classifyState(PACK, []);
ok(s.known.some((x) => /21 שיטות/.test(x.label || "")), "state-map method count is dynamic (says 21)");

// 5 · full assembly does not throw and preserves the set
const pkg = buildFieldPackage(PACK, []);
ok(pkg.finding.methods.length === 21, "buildFieldPackage preserves all 21 end-to-end");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (Field Package fixes NO method count)`);
process.exit(fail === 0 ? 0 : 1);
