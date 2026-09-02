// expression-extract — the channel-agnostic Shared Expression Extraction boundary.
//
// ⚠️ WRITTEN, NOT DEPLOYED THIS PASS (same convention as research-extract's MF-1 vendoring: reviewable
// in git, deploy is a separate, explicit, later step). See DEPLOY DEPENDENCY CLOSURE below — this is the
// one thing that must be gotten right at deploy time, and it is fully enumerated here so it is mechanical,
// not guessed.
//
// ── WHY THIS FUNCTION EXISTS (SOD1820 — SHARED RESEARCH EXECUTION BOUNDARY task) ──
// wa-raziel v48 tried to give WhatsApp-Raziel direct access to the deterministic Shared Expression
// Extraction pipeline (src/lib/triage.js) via a lazy relative import baked into the bot itself. v49
// correctly reverted that: it made WhatsApp the (accidental) owner of a channel-agnostic capability, and
// its deploy-safety was never actually provable from inside wa-raziel's own review. This function is the
// smallest correct fix: ONE thin, pure, deterministic, side-effect-free transport boundary — architecturally
// identical to the already-deployed, already-proven gematria-api/index.ts pattern (thin Edge Function wraps
// canonical DB logic; here it wraps canonical JS logic instead, since Shared Expression Extraction has no
// SQL-side twin) — that ANY channel (WhatsApp Raziel today, Web Raziel/Voice/App later) calls the SAME way.
// It performs ZERO duplication: it imports src/lib/triage.js and src/lib/analysisFlow.js UNCHANGED and
// calls their exported functions exactly as the website's own client bundle does. It contains no grammar,
// no regex, no gematria math of its own — only request/response transport, matching gematria-api's own
// stated principle ("הפונקציה הזו *לא* מחשבת גימטריה... ה-Edge כאן = שכבת-תעבורה בלבד").
//
// ── DEPLOY DEPENDENCY CLOSURE (must be included in `files` at deploy time — exhaustively verified) ──
// grep -n "^import" on the full chain found exactly these three relative imports and nothing else
// (no Node builtins, no browser/DOM API, no network call inside any of them):
//   index.ts        -> ../../../src/lib/triage.js
//   triage.js       -> ./analysisFlow.js, ./gematria.js
//   analysisFlow.js -> ./gematria.js
//   gematria.js     -> ../theme.js   (only for the GEM letter-value map — theme.js itself has ZERO imports)
// So a correct deploy must upload exactly: index.ts (this file) + src/lib/triage.js +
// src/lib/analysisFlow.js + src/lib/gematria.js + src/theme.js. Omitting any one of these four dependency
// files is expected to fail LOUDLY (a boot/import error on this function specifically — it has no other
// responsibility to silently keep working), never silently drop evidence the way a lazy in-bot import did.
// This is the one thing that could not be proven without an actual deploy — verifying that a real deploy
// with this exact file set boots and answers is the required first step before ANY caller (wa-raziel
// included) is wired to depend on this function. Not done in this pass (explicit no-deploy instruction).
//
// ── WHAT THIS IS NOT ──
// Not a second gematria engine (gematria.js IS the canonical client engine, parity-verified against
// fn_normalize_for_calc — same rule as gematria-api's SQL side, just the JS twin named in the Shared
// Expression Extraction contract §1 as "same fn's client+future-server"). Not a truth authority: every
// claim returned here is Claim-stage (per docs/research-universal-finding-contract.md's
// `input != candidate != finding != evidence != claim != interpretation != canonical != published`) —
// this function has NO Human Gate, NO research_objects write, NO promotion, NO publishing. Not aware of
// WhatsApp/wa_bot_log/phone numbers/any channel — callers own that; this only ever sees `text` in, JSON
// out. Not a router: it does not decide whether to run — the caller (having already consulted
// fn_raziel_route) decides that; this always runs when called, unconditionally.
import { extractCompoundClaims } from "../../../src/lib/triage.js";
import { extractCandidates } from "../../../src/lib/analysisFlow.js";

const SECRET = "s0d1820wahook_7yq2c9"; // same internal-function secret already shared by wa-raziel/research-extract

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json; charset=utf-8" } });
}

// Read-only crosswalk, not a redefinition: triage.js's own truth-classification vocabulary (see
// docs/shared-expression-extraction-v1-contract.md §1, "TRUTH CLASSIFICATION") mapped onto the
// verification_state vocabulary already ratified in docs/research-universal-finding-contract.md §5.
// Both vocabularies are returned; neither is invented here, neither replaces the other.
const VERIFICATION_STATE_MAP: Record<string, string> = {
  ENGINE_VERIFIED_COMPOSITE: "match",
  ENGINE_MISMATCH: "mismatch",
  METHOD_UNRESOLVED: "method_unknown",
};

Deno.serve(async (req) => {
  const u = new URL(req.url);
  if (u.searchParams.get("s") !== SECRET) return new Response("forbidden", { status: 403 });
  if (req.method !== "POST") return json({ status: "error", error: "method_not_allowed" }, 405);

  let text = "";
  try {
    const body = await req.json();
    text = String(body?.text ?? "").slice(0, 4000).trim();
  } catch {
    return json({ status: "error", error: "invalid_json_body" }, 400);
  }
  if (!text) return json({ status: "error", error: "empty_text" }, 400);

  // Pure, synchronous, deterministic — no DB, no network, no LLM. A throw here means the shared pipeline
  // itself errored on this input; it is reported, not swallowed (unlike a caller's own fail-open wrapper).
  try {
    const candidates = extractCandidates(text) || [];
    const compound_claims = extractCompoundClaims(text) || [];
    return json({
      status: "ok",
      input: text,
      contract: "shared_expression_extraction_contract_v1 (R01-R36) — docs/shared-expression-extraction-v1-contract.md",
      candidates,        // baseline R01-R19 — Claim-stage extraction (number-anchor / verse / emphasized / etc.)
      compound_claims,   // R20-R36 compound grammar — each carries its own native kind/raw/operands/result/status
      verification_state_map: VERIFICATION_STATE_MAP,
      truth_note: "Every item is Claim-stage only (input != candidate != finding != evidence != claim != canonical != published — docs/research-universal-finding-contract.md). No promotion, no publishing, no research_objects write happens here.",
    });
  } catch (e) {
    return json({ status: "error", error: "extraction_failed", detail: String(e).slice(0, 300) }, 500);
  }
});
