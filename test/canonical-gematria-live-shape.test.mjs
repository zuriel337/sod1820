// Canonical Gematria adapter — live-shape regression test (31.8.2026, NUMBER/GEMATRIA ADAPTER
// FOUNDATION MUST-NOW fix). Pure offline test: feeds gematriaApiResultToFindings() a fixture that
// is a byte-for-byte copy of a real `select gematria_api('אב')` response captured live from the
// canonical Supabase project (linswmnnkjxvweumprav) this session — no DB/network access here.
// Run: node test/canonical-gematria-live-shape.test.mjs   (exit 1 on any failure)
import { gematriaApiResultToFindings } from "../src/lib/research/canonicalGematria.js";

let pass = 0, fail = 0;
const failures = [];
const check = (name, cond, detail = "") => {
  if (cond) { pass++; return; }
  fail++; failures.push(`${name}${detail ? " — " + detail : ""}`);
};

// ── A. Live-shape fixture (methods as OBJECT, no `normalized` field) must produce findings ────
// Captured live: select gematria_api('אב') ->
//   {"input":"אב","value":3,"distance_from_1820":1817,
//    "methods":{"ragil":3,"miluy":523,"misratar":1,"kadmi":4,"gadol":3,"siduri":3,"atbash":790,
//               "albam":70,"kadmi_gadol":4}}
const liveFixture = {
  input: "אב",
  value: 3,
  distance_from_1820: 1817,
  methods: {
    ragil: 3, miluy: 523, misratar: 1, kadmi: 4, gadol: 3,
    siduri: 3, atbash: 790, albam: 70, kadmi_gadol: 4,
  },
};

const findings = gematriaApiResultToFindings(liveFixture, { inputText: "אב" });
check("A1 live object-map shape produces 9 findings (one per engine-returned method)", findings.length === 9,
  `got ${findings.length}`);
check("A2 every emitted method key came from the live response (no hardcoded list, no extras)",
  findings.every(f => Object.prototype.hasOwnProperty.call(liveFixture.methods, f.source.method)));
check("A3 every live-response key is represented exactly once (data-driven, nothing dropped)",
  Object.keys(liveFixture.methods).every(k => findings.filter(f => f.source.method === k).length === 1));
check("A4 engine_result is the exact live value, never recomputed",
  findings.every(f => f.verification.engine_result === liveFixture.methods[f.source.method]));
check("A5 subject.value is the exact live value",
  findings.every(f => f.subject.value === liveFixture.methods[f.source.method]));
check("A6 verification_state is explicitly 'not_tested' (no claim was submitted)",
  findings.every(f => f.verification.verification_state === "not_tested"));
check("A7 verification_state is never fabricated as 'match'",
  findings.every(f => f.verification.verification_state !== "match"));
check("A8 stage stays honestly unset (adapter does not own epistemic type)",
  findings.every(f => f.stage === null));
check("A9 subject.key (normalized identity) is derived, non-empty, stable across the batch",
  findings.every(f => typeof f.subject.key === "string" && f.subject.key.length > 0) &&
  new Set(findings.map(f => f.subject.key)).size === 1);
check("A10 subject.label preserves the original expression",
  findings.every(f => f.subject.label === "אב"));

// ── B. The OLD array-shaped contract (never matched live reality) must not silently pass ──────
const oldArrayShape = { normalized: "אב", methods: [{ key: "ragil", value: 3 }] };
check("B1 old array-shaped input (methods as Array) is rejected, not misread",
  gematriaApiResultToFindings(oldArrayShape, { inputText: "אב" }).length === 0);

// ── C. Defensive edge cases ─────────────────────────────────────────────────────────────────
check("C1 null apiResult -> []", gematriaApiResultToFindings(null).length === 0);
check("C2 methods missing entirely -> []", gematriaApiResultToFindings({ input: "אב", value: 3 }).length === 0);
check("C3 methods = null -> []", gematriaApiResultToFindings({ input: "אב", methods: null }).length === 0);
check("C4 empty expression (no inputText, no apiResult.input) -> []",
  gematriaApiResultToFindings({ methods: { ragil: 3 } }).length === 0);
check("C5 non-numeric method value is dropped, not fabricated as 0",
  gematriaApiResultToFindings({ input: "אב", methods: { ragil: 3, broken: "not-a-number" } }, { inputText: "אב" })
    .every(f => f.source.method !== "broken"));
check("C6 apiResult.input used as expression fallback when inputText is omitted",
  gematriaApiResultToFindings({ input: "אב", methods: { ragil: 3 } }).length === 1);

console.log(`\nCanonical Gematria live-shape adapter test: ${pass} passed, ${fail} failed`);
if (fail) { console.error("FAILURES:\n" + failures.map(f => "  ✗ " + f).join("\n")); process.exit(1); }
console.log("✓ all checks pass");
