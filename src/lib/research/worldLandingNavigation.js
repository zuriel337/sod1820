export const WORLD_LANDING_VIEW = Object.freeze({
  START: "start",
  LIVE: "live",
  CONNECTIONS: "connections",
  SOURCES: "sources",
  EXPLORE: "explore",
  JOURNEY: "journey",
  FINDING: "finding",
  ADMIN: "admin",
});

export const WORLD_KNOWLEDGE_KIND = Object.freeze({
  NUMBERS: "numbers",
  LANGUAGES: "languages",
  CIPHERS: "ciphers",
  MEDIA: "media",
  TIME: "time",
  BOOKS: "books",
  SPATIAL: "spatial",
});

const VALID_VIEWS = new Set(Object.values(WORLD_LANDING_VIEW));
const VALID_KINDS = new Set(Object.values(WORLD_KNOWLEDGE_KIND));

function clean(value) {
  return String(value || "").trim();
}

function decodeFragmentValue(value) {
  try {
    return decodeURIComponent(value);
  } catch {
    return "";
  }
}

export function resolveWorldFindingId({ search = "", hash = "" } = {}) {
  const queryId = clean(new URLSearchParams(search).get("finding"));
  if (queryId) return queryId;
  const anchor = clean(hash).replace(/^#/, "");
  return anchor.startsWith("finding-")
    ? clean(decodeFragmentValue(anchor.slice("finding-".length)))
    : "";
}

export function resolveWorldLandingView({ search = "", hash = "" } = {}) {
  const params = new URLSearchParams(search);
  const findingId = resolveWorldFindingId({ search, hash });
  if (findingId) {
    return params.get("admin") === "1"
      ? WORLD_LANDING_VIEW.ADMIN
      : WORLD_LANDING_VIEW.FINDING;
  }
  const requested = clean(params.get("view"));
  if (VALID_VIEWS.has(requested)) return requested;

  if (params.get("source") || params.get("subjectSource")) return WORLD_LANDING_VIEW.SOURCES;

  const anchor = clean(hash).replace(/^#/, "");
  if (!anchor) return WORLD_LANDING_VIEW.START;
  if (anchor === "world-all-research") return WORLD_LANDING_VIEW.ADMIN;
  if (anchor === "world-journey-entry" || anchor.startsWith("world-journey")) return WORLD_LANDING_VIEW.JOURNEY;
  if (anchor === "world-source-homes" || anchor === "world-contributor-material" || anchor.startsWith("world-corpus-")) {
    return WORLD_LANDING_VIEW.SOURCES;
  }
  if (anchor === "world-all-convergences" || anchor === "world-connections" || anchor.startsWith("world-discovery-")) {
    return WORLD_LANDING_VIEW.CONNECTIONS;
  }
  if (anchor === "world-sources" || anchor.startsWith("group-source-")) return WORLD_LANDING_VIEW.LIVE;
  return WORLD_LANDING_VIEW.START;
}

export function resolveWorldKnowledgeKind(search = "") {
  const requested = clean(new URLSearchParams(search).get("kind"));
  return VALID_KINDS.has(requested) ? requested : WORLD_KNOWLEDGE_KIND.NUMBERS;
}

export function worldLandingViewLocation(view, currentSearch = "", { kind = null } = {}) {
  const safeView = VALID_VIEWS.has(view) ? view : WORLD_LANDING_VIEW.START;
  const params = new URLSearchParams(currentSearch);
  if (safeView !== WORLD_LANDING_VIEW.SOURCES) {
    params.delete("source");
    params.delete("subjectSource");
    params.delete("sourceRef");
  }
  if (![WORLD_LANDING_VIEW.ADMIN, WORLD_LANDING_VIEW.FINDING].includes(safeView)) params.delete("finding");
  if (safeView === WORLD_LANDING_VIEW.FINDING) params.delete("admin");
  if (safeView === WORLD_LANDING_VIEW.ADMIN && params.get("finding")) params.set("admin", "1");
  if (safeView === WORLD_LANDING_VIEW.EXPLORE) {
    const safeKind = VALID_KINDS.has(kind) ? kind : resolveWorldKnowledgeKind(currentSearch);
    if (safeKind === WORLD_KNOWLEDGE_KIND.NUMBERS) params.delete("kind");
    else params.set("kind", safeKind);
  } else params.delete("kind");
  if ([WORLD_LANDING_VIEW.START, WORLD_LANDING_VIEW.FINDING].includes(safeView)) params.delete("view");
  else params.set("view", safeView);
  const query = params.toString();
  return `/world${query ? `?${query}` : ""}`;
}
