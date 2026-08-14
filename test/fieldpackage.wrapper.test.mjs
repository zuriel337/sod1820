// Tests the CLIENT wrapper path (assembleFieldPackage → field-pack edge) end-to-end,
// with supabase.functions.invoke mocked. Proves: (a) a 21-method engine pack passes through
// UNCHANGED (no slice/filter/reduction), (b) a denied/error response surfaces as a thrown reason.
// Run: node test/fieldpackage.wrapper.test.mjs
import supabase from "../src/lib/supabase.js";
import { assembleFieldPackage } from "../src/lib/fieldpackage.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// Build a 21-method engine pack (13 known + 8 novel) — what the edge would return verbatim.
const EVID = { "רגיל": 1020, "מילוי": 1820, "מסתתר": 1584, "קדמי": 3851, "גדול": 1020, "סידורי": 84, "אתבש": 545, "אלבם": 329, "אטבח": 180, "ריבוע": 3484, "מילוי בלבד": 800, "הכפלה": 9001, "משולש גדול": 4000 };
for (let i = 1; i <= 8; i++) EVID["שיטה-חדשה-" + i] = 20000 + i;
const PACK21 = {
  subject: "בדיקה", value: 1020, cost: { tokens: 0, used_llm: false },
  stages_requested: ["methods"], stages_with_findings: ["methods"],
  stages: { methods: { found: true, method_count: 21, source_of_truth: "gematria_methods", evidence: EVID } },
};

// Pin a stable mock regardless of supabase-js's lazy `functions` getter.
let mockImpl = async () => ({ data: null, error: null });
Object.defineProperty(supabase, "functions", {
  value: { invoke: (name, opts) => mockImpl(name, opts) }, writable: true, configurable: true,
});

// --- 1 · success path: mock invoke → verbatim 21-method pack ---
mockImpl = async (name, opts) => {
  ok(name === "field-pack", "client invokes the field-pack edge (not rpc)");
  ok(opts?.body?.subject === "בדיקה", "client sends {subject}");
  return { data: PACK21, error: null };
};
const pkg = await assembleFieldPackage("בדיקה", { uid: null });
ok(pkg.finding.methods.length === 21, `wrapper→read-model keeps all 21 methods (got ${pkg.finding.methods.length})`);
const keys = new Set(pkg.finding.methods.map((m) => m.method));
ok([1, 2, 3, 4, 5, 6, 7, 8].every((i) => keys.has("שיטה-חדשה-" + i)), "all 8 novel methods survive the round-trip (no reduction)");
const byM = Object.fromEntries(pkg.finding.methods.map((m) => [m.method, m.value]));
ok(byM["מילוי"] === 1820 && byM["שיטה-חדשה-8"] === 20008, "known + novel values intact (no ragil-only fallback)");

// --- 2 · denied path: mock invoke → FunctionsHttpError-like error with context ---
mockImpl = async () => ({
  data: null,
  error: { message: "Edge Function returned a non-2xx status code", context: { json: async () => ({ error: "denied" }) } },
});
let threw = null;
try { await assembleFieldPackage("בדיקה", { uid: null }); } catch (e) { threw = e.message; }
ok(threw === "denied", `denied response surfaces as thrown reason (got "${threw}")`);

// --- 3 · engine error in body ---
mockImpl = async () => ({ data: { error: "engine_error" }, error: null });
threw = null;
try { await assembleFieldPackage("בדיקה", { uid: null }); } catch (e) { threw = e.message; }
ok(threw === "engine_error", "engine_error in body surfaces as thrown reason");

// --- 4 · empty expression short-circuits (no network) ---
let called = false;
mockImpl = async () => { called = true; return { data: {}, error: null }; };
const none = await assembleFieldPackage("   ", { uid: null });
ok(none === null && !called, "empty expression returns null without calling the edge");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed (field-pack client wrapper)`);
process.exit(fail === 0 ? 0 : 1);
