// SOD1820 Raziel Route Grammar v1.
//
// Pure Research Strategy / Experience composition only.
// It translates a user's human goal + current surface into one of four stable semantic actions.
// It does NOT execute tools, navigate, authorize, rank truth, call a model, or create a second router.
//
// Owners:
// - research_strategy_layer_law v15 — Research Plan / Capability Fabric
// - experience_governance_foundation_v1_law v7 — Surface Role Grammar
// - research_workspace_law v4 — One Context / Surface Transition Contract
// - raziel_companion_layer_law v3 — One Raziel, same context across modes

export const RAZIEL_ROUTE_GRAMMAR_VERSION = "raziel-route-grammar-v1";

export const RAZIEL_ROUTE_ACTION = Object.freeze({
  UNDERSTAND: "understand",
  RESEARCH: "research",
  CONNECT: "connect",
  CONTINUE: "continue",
});

const ACTION_ORDER = Object.freeze([
  RAZIEL_ROUTE_ACTION.UNDERSTAND,
  RAZIEL_ROUTE_ACTION.RESEARCH,
  RAZIEL_ROUTE_ACTION.CONNECT,
  RAZIEL_ROUTE_ACTION.CONTINUE,
]);

const ACTION_CONTRACT = Object.freeze({
  [RAZIEL_ROUTE_ACTION.UNDERSTAND]: Object.freeze({
    label: "להבין",
    human_question: "מה אני רואה כאן?",
    task_mode: "explain_current_context",
    preferred_home: "current",
    experience_role: "human-first explanation before deeper action",
  }),
  [RAZIEL_ROUTE_ACTION.RESEARCH]: Object.freeze({
    label: "לחקור",
    human_question: "איך בודקים את זה לעומק?",
    task_mode: "deepen_research",
    preferred_home: "heichal",
    experience_role: "verification / calculation / sources / tools",
  }),
  [RAZIEL_ROUTE_ACTION.CONNECT]: Object.freeze({
    label: "לחבר",
    human_question: "מה מתחבר לזה?",
    task_mode: "discover_connections",
    preferred_home: "world",
    experience_role: "typed contextual connections around the active subject",
  }),
  [RAZIEL_ROUTE_ACTION.CONTINUE]: Object.freeze({
    label: "להתקדם",
    human_question: "לאן זה מוביל מכאן?",
    task_mode: "continue_path",
    preferred_home: "journey",
    experience_role: "path continuity / why-transition / next meaningful branch",
  }),
});

function clean(value) {
  return value == null ? "" : String(value).trim();
}

function lower(value) {
  return clean(value).toLowerCase();
}

function includesAny(text, terms) {
  const q = lower(text);
  return terms.some((term) => q.includes(term));
}

function normalizedSurface(surfaceContext) {
  if (typeof surfaceContext === "string") return lower(surfaceContext) || "system";
  const raw = surfaceContext?.surface
    ?? surfaceContext?.surface_key
    ?? surfaceContext?.surfaceKey
    ?? surfaceContext?.type
    ?? surfaceContext?.home
    ?? "system";
  return lower(raw) || "system";
}

function explicitRequestedAction({ question = "", intent = "" } = {}) {
  const q = lower(question);
  const i = lower(intent);

  // User language is primary. A generic planner intent such as "research" must never steal a
  // conversational request like "מה זה 1820?". Specific intent values are only tie-break hints.
  // "מה הקשר" contains "מה" too; relation language therefore wins over generic explanation.
  if (includesAny(q, [
    "מה הקשר", "מה מתחבר", "תחבר", "לחבר", "השווה", "השוואה", "compare", "cross",
    "קשר בין", "קשרים בין", "יחס בין", "relation",
  ])) return RAZIEL_ROUTE_ACTION.CONNECT;

  if (includesAny(q, [
    "תמשיך", "המשך", "להמשיך", "קח אותי", "לאן זה מוביל", "לאן ממשיכים",
    "מסע", "מסלול", "next step", "continue", "journey", "resume",
  ])) return RAZIEL_ROUTE_ACTION.CONTINUE;

  if (includesAny(q, [
    "תחקור", "חקור", "לחקור", "תבדוק", "בדוק", "לעומק", "בדיקה עמוקה",
    "חפש מקור", "מקורות", "els", "דילוג", "trace", "research", "deep research",
  ])) return RAZIEL_ROUTE_ACTION.RESEARCH;

  if (includesAny(q, [
    "מה זה", "מה אני רואה", "תסביר", "הסבר", "למה", "מה אומר", "מה המשמעות",
    "explain", "understand", "what is",
  ])) return RAZIEL_ROUTE_ACTION.UNDERSTAND;

  if (["compare", "cross", "relation", "relations"].includes(i)) return RAZIEL_ROUTE_ACTION.CONNECT;
  if (["continue", "journey", "resume", "next_step"].includes(i)) return RAZIEL_ROUTE_ACTION.CONTINUE;
  if (["els", "gematria", "verify", "deep_research", "source_research"].includes(i)) return RAZIEL_ROUTE_ACTION.RESEARCH;
  if (["explain", "understand", "guide"].includes(i)) return RAZIEL_ROUTE_ACTION.UNDERSTAND;

  return null;
}

function defaultActionForSurface(surface) {
  switch (surface) {
    case "world":
      return RAZIEL_ROUTE_ACTION.CONNECT;
    case "journey":
      return RAZIEL_ROUTE_ACTION.CONTINUE;
    case "heichal":
    case "els":
    case "books":
    case "sources":
    case "inspect":
    case "trace":
      return RAZIEL_ROUTE_ACTION.RESEARCH;
    case "number":
    case "expression":
    case "post":
    case "home":
    case "system":
    default:
      return RAZIEL_ROUTE_ACTION.UNDERSTAND;
  }
}

function subjectType(identityResolution, surfaceContext) {
  const primary = identityResolution?.primary || null;
  return clean(primary?.type || surfaceContext?.subject?.type || surfaceContext?.target?.type) || null;
}

function actionHints(action, { surface, subject_type: type }) {
  const hints = [];
  if (action === RAZIEL_ROUTE_ACTION.RESEARCH) hints.push("verification_first", "deep_capability_allowed");
  if (action === RAZIEL_ROUTE_ACTION.CONNECT) hints.push("graph_context", "typed_relations", "bounded_connections");
  if (action === RAZIEL_ROUTE_ACTION.CONTINUE) hints.push("preserve_context", "why_transition", "exact_return");
  if (action === RAZIEL_ROUTE_ACTION.UNDERSTAND) hints.push("human_first", "bounded_explanation");

  if (type === "number" || type === "expression" || type === "phrase") hints.push("numeric_subject");
  if (type === "name" || type === "person") hints.push("name_or_person_subject");
  if (type === "post") hints.push("narrative_entry");
  if (surface === "journey") hints.push("active_path");
  return [...new Set(hints)];
}

export function buildRazielRouteGrammar({
  question = "",
  intent = "",
  identityResolution = null,
  surfaceContext = null,
} = {}) {
  const surface = normalizedSurface(surfaceContext);
  const subject_type = subjectType(identityResolution, surfaceContext);
  const explicit = explicitRequestedAction({ question, intent });
  const requested_action = explicit || defaultActionForSurface(surface);
  const requested_by = explicit ? "user_language" : "surface_default";

  const actions = ACTION_ORDER.map((id) => {
    const contract = ACTION_CONTRACT[id];
    return Object.freeze({
      id,
      label: contract.label,
      human_question: contract.human_question,
      task_mode: contract.task_mode,
      preferred_home: contract.preferred_home,
      experience_role: contract.experience_role,
      selected: id === requested_action,
      hints: actionHints(id, { surface, subject_type }),
    });
  });

  return Object.freeze({
    version: RAZIEL_ROUTE_GRAMMAR_VERSION,
    owner: "research_strategy_layer_law v15 + experience_governance_foundation_v1_law v7",
    surface,
    subject_type,
    requested_action,
    requested_by,
    actions: Object.freeze(actions),
    guards: Object.freeze({
      semantic_hint_only: true,
      no_navigation_execution: true,
      no_tool_execution: true,
      no_authorization_decision: true,
      no_truth_ranking: true,
      no_second_router: true,
      one_context_required: true,
    }),
  });
}

export function razielRouteActionContract(actionId) {
  return ACTION_CONTRACT[actionId] || null;
}

export default buildRazielRouteGrammar;
