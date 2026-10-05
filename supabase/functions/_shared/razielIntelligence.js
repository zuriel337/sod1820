// SOD1820 — Raziel minimum-sufficient-intelligence selector (raziel_routing_law v2, Phase D).
//
// EXTEND_EXISTING: a pure, side-effect-free function used inside the existing ai-analyze Raziel request path.
// It is NOT a router, store or model brain. It reads ONLY semantic plan metadata (fn_raziel_plan/fn_raziel_answer)
// and the user's explicit fast/deep request. Never subscription tier, admin, question length or "use all power".
//
// Semantic levels (raziel_routing_law §3): L0_DETERMINISTIC (no LLM) · L2_FAST · L3_DEEP.
// Implementation-only mapping (kept in ai-analyze, not here): L2_FAST → FAST_MODEL, L3_DEEP → MODEL.
// L4/L5 are NOT executable here.

export const RAZIEL_LEVELS = Object.freeze({ L0: "L0_DETERMINISTIC", L2: "L2_FAST", L3: "L3_DEEP" });

const RANK = { L0_DETERMINISTIC: 0, L2_FAST: 2, L3_DEEP: 3 };

function normPlanMin(v) {
  return typeof v === "string" && Object.prototype.hasOwnProperty.call(RANK, v) ? v : null;
}

function requestedLevel(v) {
  const s = String(v || "").toLowerCase();
  return s === "deep" ? RAZIEL_LEVELS.L3 : s === "fast" ? RAZIEL_LEVELS.L2 : null;
}

// Conservative automatic L3 triggers — only when the plan metadata actually carries the evidence.
// Absent/unknown evidence ⇒ no trigger ⇒ stay L2.
export function razielEscalationTrigger(plan) {
  if (!plan || typeof plan !== "object") return null;
  if (plan.route_intent === "multi_domain") return "multi_domain_intent";
  if (plan.cross_check_required === true && plan.contradictory === true) return "contradictory_evidence";
  if (plan.compare === true && Array.isArray(plan.domains) && new Set(plan.domains).size > 1) return "compare_multi_capability";
  return null;
}

/**
 * @param {{plan?: object|null, requested?: string|null}} input  plan = razielPlanMeta() output (or null)
 * @returns {{requested_level: string|null, selected_level: string, plan_minimum: string, escalation_reason: string|null,
 *            request_overridden: boolean, may_run_model: boolean, model_tier: "none"|"fast"|"deep"}}
 */
export function selectRazielIntelligence({ plan = null, requested = null } = {}) {
  const req = requestedLevel(requested);
  const planMin = normPlanMin(plan && plan.minimum_intelligence) || RAZIEL_LEVELS.L2;
  const deterministic = planMin === RAZIEL_LEVELS.L0;
  // This selector is only consulted once no deterministic answer short-circuited the request, so an L0 plan that
  // reaches it is a separate interpretive continuation: floor is L2, and it is never auto-promoted.
  let level = deterministic ? RAZIEL_LEVELS.L2 : planMin;
  let reason = null;

  if (req === RAZIEL_LEVELS.L3 && RANK[level] < RANK.L3_DEEP) { level = RAZIEL_LEVELS.L3; reason = "explicit_deep_request"; }
  if (!deterministic && RANK[level] < RANK.L3_DEEP) {
    const trig = razielEscalationTrigger(plan);
    if (trig) { level = RAZIEL_LEVELS.L3; reason = trig; }
  }
  const overridden = req !== null && RANK[req] < RANK[planMin === RAZIEL_LEVELS.L0 ? RAZIEL_LEVELS.L2 : planMin];
  return {
    requested_level: req,
    selected_level: level,
    plan_minimum: planMin,
    escalation_reason: reason,
    request_overridden: overridden,
    may_run_model: true,
    model_tier: level === RAZIEL_LEVELS.L3 ? "deep" : "fast",
  };
}
