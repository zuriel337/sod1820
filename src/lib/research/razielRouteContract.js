// Lightweight stable values shared by eager projections and the lazy Raziel route grammar.
// Keeping these constants separate prevents an action-label consumer from eagerly loading the
// semantic intent gate and Research Plan implementation.

export const RAZIEL_ROUTE_GRAMMAR_VERSION = "raziel-route-grammar-v1";

export const RAZIEL_ROUTE_ACTION = Object.freeze({
  UNDERSTAND: "understand",
  RESEARCH: "research",
  CONNECT: "connect",
  CONTINUE: "continue",
});
