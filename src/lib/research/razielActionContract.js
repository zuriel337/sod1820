// SOD1820 Raziel Action Contract v1.
//
// Projection over an already-built Research Plan / Result Bundle.
// Reuses the existing Result Bundle `next_actions` seam.
// It does NOT navigate, execute tools, authorize, rank truth, or generate a second answer.
//
// One-Synthesis invariant:
// - semantic message authority stays on bundle.synthesis;
// - this contract only says what human action is active and which existing product home can serve it.

export const RAZIEL_ACTION_CONTRACT_VERSION = 1;
export const RAZIEL_NEXT_ACTION_KEY = "raziel_route";

function clean(value) {
  if (value == null) return "";
  return String(value).trim();
}

function meaningfulContext(plan) {
  if (!plan || typeof plan !== "object") return false;
  if (clean(plan.question)) return true;
  if (plan.primary_identity) return true;
  if (plan.surface_context?.subject || plan.surface_context?.target) return true;
  return false;
}

function synthesisState(synthesis) {
  if (!synthesis || typeof synthesis !== "object") return "not_composed";
  return clean(synthesis.status) || "unknown";
}

function selectedAction(routeGrammar) {
  if (!routeGrammar || typeof routeGrammar !== "object") return null;
  const actions = Array.isArray(routeGrammar.actions) ? routeGrammar.actions : [];
  return actions.find((action) => action?.selected === true)
    || actions.find((action) => action?.id === routeGrammar.requested_action)
    || null;
}

export function buildRazielNextAction({
  plan = null,
  synthesis = null,
  coverage = null,
} = {}) {
  if (!meaningfulContext(plan)) return null;

  const grammar = plan?.route_grammar;
  const selected = selectedAction(grammar);
  if (!grammar || !selected || !clean(grammar.requested_action)) return null;

  const state = synthesisState(synthesis);
  const hasCanonicalSynthesisMessage = Boolean(
    synthesis
    && typeof synthesis === "object"
    && clean(synthesis.message)
  );

  const alternatives = (Array.isArray(grammar.actions) ? grammar.actions : [])
    .filter((action) => action && action.id !== selected.id)
    .map((action) => Object.freeze({
      id: clean(action.id),
      label: clean(action.label),
      task_mode: clean(action.task_mode),
      preferred_home: clean(action.preferred_home),
    }));

  return Object.freeze({
    action: RAZIEL_NEXT_ACTION_KEY,
    contract_version: RAZIEL_ACTION_CONTRACT_VERSION,
    route_action: clean(selected.id),
    label: clean(selected.label),
    task_mode: clean(selected.task_mode),
    preferred_home: clean(selected.preferred_home) || "current",
    requested_by: clean(grammar.requested_by) || "unknown",
    surface: clean(grammar.surface) || "system",
    subject_type: clean(grammar.subject_type) || null,
    reason_codes: Object.freeze(Array.isArray(selected.hints) ? [...selected.hints] : []),
    delivery: Object.freeze({
      mode: "in_place_first",
      preserve_context: true,
      exact_return_on_handoff: true,
      semantic_handoff_only: true,
    }),
    synthesis: Object.freeze({
      state,
      message_authority: hasCanonicalSynthesisMessage ? "bundle.synthesis" : null,
      local_message: null,
      must_not_mint_second_message: true,
    }),
    coverage: Object.freeze({
      requested: Number.isFinite(Number(coverage?.requested)) ? Number(coverage.requested) : null,
      executed: Number.isFinite(Number(coverage?.executed)) ? Number(coverage.executed) : null,
      partial: coverage?.partial === true,
      complete: coverage?.complete === true,
    }),
    alternatives: Object.freeze(alternatives),
    guards: Object.freeze({
      semantic_action_only: true,
      no_navigation_execution: true,
      no_tool_execution: true,
      no_authorization_decision: true,
      no_truth_ranking: true,
      no_local_message_generation: true,
      same_synthesis_is_message_authority: true,
      no_second_router: true,
      one_context_required: true,
    }),
  });
}

export function mergeRazielNextAction(existingNextActions = [], razielAction = null) {
  const existing = Array.isArray(existingNextActions) ? existingNextActions : [];
  // Caller-supplied/spoofed raziel_route envelopes are never trusted as the canonical Raziel action.
  // Keep every other existing continuation/action, replace this one slot from the canonical Plan.
  const withoutRaziel = existing.filter((item) => item?.action !== RAZIEL_NEXT_ACTION_KEY);
  return razielAction ? [...withoutRaziel, razielAction] : withoutRaziel;
}

export default buildRazielNextAction;
