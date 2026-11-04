// Dependency-free semantic action identifiers shared by the lightweight browser validator and
// the full Raziel route grammar. Labels, routing hints and selection logic remain owned by the
// grammar; this module only prevents presentation consumers from eagerly loading that machinery.

export const RAZIEL_ROUTE_ACTION = Object.freeze({
  UNDERSTAND: "understand",
  RESEARCH: "research",
  CONNECT: "connect",
  CONTINUE: "continue",
});

export default RAZIEL_ROUTE_ACTION;
