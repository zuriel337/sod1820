// M1 truth-contract test — Universal Finding envelope (truth_axes_foundation_law, HG-1..HG-5).
// Pure offline test: universalFinding.js has no imports, touches no DB, no network, no build.
// Run: node test/universal-finding-truth-contract.test.mjs   (exit 1 on any failure)
//
// Covers the M1 FINAL ACCEPTANCE PATCH (GPT cross-verification of PR #236) in addition to the
// original M1 pass: MISSING semantic state stays honestly null on ALL FOUR axes — including the
// VERIFICATION axis, which used to be resolved to "not_tested" generically. "not_tested" is still
// a valid canonical state; it may only be DECLARED by a source that knows it, never inferred.
import {
  makeUniversalFinding,
  universalFindingToResearchEntity,
  elsStateToUniversalFindings,
  VALID_STAGES,
  VALID_VERIFICATION_STATES,
} from "../src/lib/research/universalFinding.js";

let pass = 0, fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; return; }
  fail++; failures.push(`${name}${detail ? " — " + detail : ""}`);
};
const throws = (name, fn) => {
  try { fn(); check(name, false, "expected a throw, got none"); }
  catch (e) { check(name, e instanceof TypeError, `expected TypeError, got ${e?.constructor?.name}`); }
};

// ── A. Generic envelope, verification omitted → does NOT claim "not_tested" ──────────────
const bare = makeUniversalFinding({ kind: "other", subject: { key: "x", label: "x" } });
check("A1 missing verification_state stays null (not 'not_tested')", bare.verification.verification_state === null,
  `got ${JSON.stringify(bare.verification.verification_state)}`);
check("A2 verification envelope still present/shaped", "claimed_expression" in bare.verification && "engine_result" in bare.verification);
check("A3 empty verification object also stays null",
  makeUniversalFinding({ verification: {} }).verification.verification_state === null);
check("A4 empty-string verification_state stays null",
  makeUniversalFinding({ verification: { verification_state: "" } }).verification.verification_state === null);
check("A5 claimed fields without a state do not manufacture one",
  makeUniversalFinding({ verification: { claimed_value: 256 } }).verification.verification_state === null);
check("A6 entity projection reports null verification, not 'not_tested'",
  universalFindingToResearchEntity(bare).findingVerification === null);

// the other three axes stay honestly absent too (original M1 pass — regression guard)
check("A7 stage stays null", bare.stage === null);
check("A8 status (governance) stays null", bare.status === null);
check("A9 createdBy stays null (never 'SYSTEM')", bare.provenance.createdBy === null);
check("A10 access tier stays null (never 'public')", bare.access.tier === null);
check("A11 findingStage projection stays null", universalFindingToResearchEntity(bare).findingStage === null);

// ── B. Explicit adapter that genuinely knows no test occurred MAY declare "not_tested" ───
const explicitNotTested = makeUniversalFinding({
  kind: "gematria",
  verification: { engine_method_tested: "ragil", engine_result: 256, verification_state: "not_tested" },
});
check("B1 explicit not_tested is preserved", explicitNotTested.verification.verification_state === "not_tested");
check("B2 not_tested remains in the ratified vocabulary (HG-3 not weakened)",
  VALID_VERIFICATION_STATES.includes("not_tested"));
for (const s of VALID_VERIFICATION_STATES) {
  check(`B3 explicit "${s}" preserved`,
    makeUniversalFinding({ verification: { verification_state: s } }).verification.verification_state === s);
}
const els = elsStateToUniversalFindings({
  status: "ok", scope: "torah", termRaw: "משיח",
  axis: { hitId: "50_1_1000" },
  findings: [{ t: "גאולה", shown: ["7_1_2000"] }],
});
check("B4 ELS adapter emits findings", els.length === 2, `got ${els.length}`);
check("B5 ELS adapter still DECLARES not_tested explicitly",
  els.every(f => f.verification.verification_state === "not_tested"));
check("B6 ELS adapter records the real engine output alongside it",
  els.every(f => f.verification.engine_method_tested === "els" && f.verification.engine_result));
check("B7 ELS adapter never fabricates 'match'", els.every(f => f.verification.verification_state !== "match"));
check("B8 ELS adapter leaves stage/status honestly unset",
  els.every(f => f.stage === null && f.status === null));

// ── C. Explicit INVALID semantic state is rejected, never coerced ────────────────────────
throws("C1 invalid verification_state throws", () => makeUniversalFinding({ verification: { verification_state: "verified" } }));
throws("C2 invalid verification_state 'true' throws", () => makeUniversalFinding({ verification: { verification_state: true } }));
throws("C3 invalid stage throws", () => makeUniversalFinding({ stage: "fact" }));
for (const s of VALID_STAGES) {
  check(`C4 valid stage "${s}" preserved`, makeUniversalFinding({ stage: s }).stage === s);
}

console.log(`\nUniversal Finding truth contract: ${pass} passed, ${fail} failed`);
if (fail) { console.error("FAILURES:\n" + failures.map(f => "  ✗ " + f).join("\n")); process.exit(1); }
console.log("✓ all checks pass");
