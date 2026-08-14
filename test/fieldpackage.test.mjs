// Pure-logic test for src/lib/fieldpackage.js (read-model projection).
// No network: feeds a trimmed real fn_gematria_pack fixture (ובתורתו) + P1 requests.
// Run: node test/fieldpackage.test.mjs
import { buildFieldPackage, projectFinding, classifyState, projectInterpretation, projectRequests } from "../src/lib/fieldpackage.js";

let pass = 0, fail = 0;
const ok = (c, m) => { if (c) { pass++; } else { fail++; console.error("✗ " + m); } };

// Trimmed real fixture from public.fn_gematria_pack('ובתורתו')
const PACK = {
  subject: "ובתורתו", value: 1020, cost: { tokens: 0, used_llm: false },
  stages_requested: ["methods", "convergence", "verses", "sources", "notarikon", "decompose", "cross", "zero_scale", "zero_navigation"],
  stages_with_findings: ["cross", "verses", "methods", "sources", "decompose", "zero_scale", "convergence", "zero_navigation"],
  stages: {
    methods: { found: true, method_count: 13, source_of_truth: "gematria_methods (registry-driven)",
      evidence: { "רגיל": 1020, "מילוי": 1820, "מסתתר": 1584, "קדמי": 3851, "גדול": 1020, "סידורי": 84, "אתבש": 545, "אלבם": 329, "אטבח": 180, "ריבוע": 3484 } },
    cross: { found: true, cross_count: 3, source_of_truth: "strongest_crossings (engine)",
      crossings: [{ partner: "תורה אחת", n_methods: 3, methods_detail: "אלבם=329 · סידורי=84 · רגיל=1020" }, { partner: "שישית", n_methods: 2, methods_detail: "סידורי=84 · רגיל=1020" }] },
    verses: { found: true, evidence: { count: 3, verses: [{ ref: "ישעיהו 37:15", text: "..." }] }, source_of_truth: "tanach_verses" },
    sources: { found: true, evidence: { count: 2, first: { ref: "תהלים 1:2" }, last: { ref: "תהלים 78:10" }, books: [{ book: "תהלים", n: 2 }] }, source_of_truth: "tanach_verses (fn_name_in_tanach)" },
    convergence: { found: true, group_count: 4, source_of_truth: "convergences (engine table)",
      groups: [
        { kind: "same_method_equality", method: "ragil", score: 13, group_size: 13, status: "new", phrases: ["אותי בראת", "חכמת המציאות"] },
        { kind: "same_method_equality", method: "miluy", score: 6, group_size: 6, status: "new", phrases: ["חקת", "עשיר"] },
        { kind: "same_method_equality", method: "misratar", score: 8, group_size: 8, status: "new", phrases: ["מחשבות"] },
      ] },
    decompose: { found: true, source_of_truth: "maftech_decompose engine",
      evidence: { FACT: { ragil: 1020, misratar: 1584 }, INTERPRETATION: { note: "שיטת המפתח — השערה", letters: [{ pos: 1, letter: "ו", meaning: "מחברת" }], mirror: ["ר↔ב"], sparks: { count: 0 } } } },
    notarikon: { found: false, method_id: "notarikon" },
    zero_scale: { applicable: true, core_root: 102, scale_chain: [102, 1020, 10200], root_matches: [{ ragil: 102, phrase: "אלהינו" }] },
    zero_navigation: { applicable: true, stripped: 102, core_matches: [{ ragil: 102, phrase: "בעל" }] },
  },
};
const REQUESTS = [
  { ref: "ir_1", why: "לאמת תאריך-האירוע", personRef: "p:zvi", missingKind: "תאריך", status: "pending", lang: "he", channel: "wa", response: null },
  { ref: "ir_2", why: "מקור הציטוט", personRef: "p:sivoni", missingKind: "מקור", status: "answered", response: { rawTable: "wa_vip_inbox", rawId: 42, linkedAt: "2026-08-14T00:00:00Z" } },
];

// 1 · NO COLLAPSE — every method survives (expression × method × value)
const f = projectFinding(PACK);
ok(f.methods.length >= 10, "all methods retained, not collapsed to one");
const byM = Object.fromEntries(f.methods.map((m) => [m.method, m.value]));
ok(byM["רגיל"] === 1020 && byM["מילוי"] === 1820 && byM["מסתתר"] === 1584, "ragil=1020 AND miluy=1820 AND misratar=1584 all present (no single-number reduction)");
ok(f.primaryValue === 1020, "primaryValue is ONE of the methods (ragil), not the sole identity");

// 2 · cross-method bridges preserved
ok(f.bridges.some((b) => b.kind === "cross_method" && b.partner === "תורה אחת" && b.nMethods === 3), "cross-method bridge preserved with detail");
ok(f.bridges.some((b) => b.kind === "zero_scale"), "zero-scale bridge preserved");

// 3 · convergences annotated with per-method value (the expression×method×value bridge)
const miluyConv = f.convergences.find((c) => c.method === "miluy");
ok(miluyConv && miluyConv.value === 1820, "miluy convergence group annotated with subject's miluy value=1820");
const ragilConv = f.convergences.find((c) => c.method === "ragil");
ok(ragilConv && ragilConv.value === 1020, "ragil convergence group annotated with value=1020");

// 4 · full source retained
ok(f.sources && f.sources.count === 2 && f.verses.length >= 1, "full source (tanach occurrences + verses) retained");

// 5 · state map — layers separated
const s = classifyState(PACK, REQUESTS);
ok(s.known.some((x) => x.kind === "methods") && s.known.some((x) => x.kind === "sources"), "known = engine facts");
ok(s.verified.some((x) => x.kind === "cross") && s.verified.some((x) => x.kind === "convergence"), "verified = engine-confirmed relations");
ok(s.missing.some((x) => x.kind === "stage_absent" && /notarikon/.test(x.label)), "missing includes absent notarikon stage");
ok(s.missing.some((x) => x.kind === "info_request" && x.ref === "ir_1"), "missing includes open info-request need (תאריך from zvi)");
ok(s.checkable.some((x) => x.kind === "miluy_drilldown"), "checkable offers miluy drill-down");
ok(s.claimed.some((x) => x.kind === "raw_response" && x.isFact === false), "answered request → claimed RAW, isFact:false (never auto-Fact)");

// 6 · interpretation is a SEPARATE layer, never Fact
const interp = projectInterpretation(PACK);
ok(interp && interp.isFact === false && interp.letters.length >= 1, "interpretation separate + isFact:false");
// interpretation content must NOT appear inside known/verified
ok(!s.known.some((x) => /מחברת|השערה/.test(x.label || "")), "interpretation not leaked into known facts");

// 7 · requests projection — response shown as RAW, not Fact
const pr = projectRequests(REQUESTS);
ok(pr.length === 2 && pr[0].from === "p:zvi" && pr[0].status === "pending", "requests projected (what/from/why/status)");
ok(pr[1].received && pr[1].received.isFact === false, "received answer marked RAW isFact:false");

// 8 · full package assembly + provenance (free facts, no AI)
const pkg = buildFieldPackage(PACK, REQUESTS);
ok(pkg.provenance.cost.tokens === 0 && pkg.provenance.cost.used_llm === false, "provenance: deterministic, 0 tokens, no LLM (facts free)");
ok(pkg.finding && pkg.stateMap && pkg.interpretation && pkg.requests, "package has all sections");

console.log(`\n${fail === 0 ? "✅ PASS" : "❌ FAIL"} — ${pass} passed, ${fail} failed`);
process.exit(fail === 0 ? 0 : 1);
