// expression-extract — the channel-agnostic Shared Expression Extraction boundary.
//
// Deployed (controlled verification pass, 2.9.2026): boots, verify_jwt rejects unauthorized calls,
// all 5 canonical regression cases pass. See DEPLOY DEPENDENCY CLOSURE below for how this file is
// packaged for deploy — that step is now scripted and reproducible, not hand-assembled.
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
// ── DEPLOY DEPENDENCY CLOSURE (2.9.2026 — Git↔live parity closure) ──
// This file's own imports (below) stay exactly as authored — real repo-relative paths
// (../../../src/lib/...), correct for the actual on-disk layout, IDE-navigable, unchanged by packaging.
// They are NOT what gets uploaded as-is: the Supabase Edge deploy sandbox mounts the entrypoint at
// approximately /source/index.ts (one level deep), so a raw upload of this file with these import
// specifiers 404s at deploy time (confirmed empirically — see docs/expression-extract-parity-closure.md).
//
// scripts/package-expression-extract.mjs is the ONE canonical, deterministic packaging step: it bundles
// this file plus src/lib/triage.js + src/lib/analysisFlow.js + src/lib/gematria.js + src/theme.js
// (all UNMODIFIED — the same files the browser bundle imports, zero forked/trimmed copy) with esbuild
// into a single self-contained ESM output with zero remaining relative imports left to resolve at deploy
// time — eliminating the sandbox-mount-depth problem structurally rather than by guessing a path depth.
// `npm run package:expression-extract` regenerates the deploy artifact from committed source; the deploy
// call itself (verify_jwt: true — see AUTH below, no secret to configure, no env var to set) is a
// separate, explicit, Human-Gated step, not run automatically by the packaging script.
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
//
// ── AUTH — the platform's own mechanism, not a second one ──
// This function carries NO secret/API-key constant and does NO auth check in code. It has no natural
// external/browser caller (unlike gematria-api, which is deliberately public) and no natural unauthenticated-
// webhook caller (unlike wa-webhook/wa-raziel's own `?s=` pattern, which exists only because WhatsApp/cron
// hit those functions directly with no Supabase session at all). Every real caller of THIS function is other
// trusted server-side code that already holds a Supabase-issued credential — so the correct, already-canonical
// mechanism is Supabase's own platform-level `verify_jwt` gate (the Edge Functions default — the deploy
// tooling itself: "You SHOULD ALWAYS enable this... ONLY disable if... the function body implements custom
// authentication"). Deploy this function with `verify_jwt: true` (not false). The gateway rejects a request
// with a missing/invalid JWT BEFORE this file's code ever runs — no committed secret, no second auth system,
// no code to keep in sync with wa-raziel's separate webhook-secret pattern. A caller passes
// `Authorization: Bearer <SUPABASE_SERVICE_ROLE_KEY or a valid user/session JWT>`, exactly like any other
// authenticated `supabase.functions.invoke(...)`/`fetch` call already made elsewhere in this codebase (e.g.
// gematria-api's own `svcHeaders()` pattern for its internal RPC calls, reused here at the platform level
// instead of re-implemented in-function).
import { extractCompoundClaims } from "../../../src/lib/triage.js";
import { extractCandidates } from "../../../src/lib/analysisFlow.js";

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
  // No manual auth check here — see AUTH above. Unauthorized requests never reach this line
  // (the platform's verify_jwt gate, enabled at deploy time, rejects them first with 401).
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
