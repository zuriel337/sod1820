// SOD1820 2029 contextual capability resolver.
// Pure presentation/runtime composition only.
// It is NOT a capability registry, store, router, truth owner or permission system.
// Research Strategy v15 owns Capability Fabric; this resolver composes already-existing homes.

const clean = (value) => value == null ? "" : String(value).trim().toLowerCase();

export const CONTEXT_ACTION_KIND = Object.freeze({
  INSPECT: "inspect",
  CAPABILITY: "capability",
  ROUTE: "route",
  RAZIEL: "raziel",
  DEEPEN: "deepen",
});

const ROUTES = Object.freeze({
  WORLD: "/world",
  BOOKS: "/books",
  ELS: "/els",
  HEICHAL: "/heichal",
});

function numericFamily(target) {
  return target?.type === "number" || target?.type === "phrase";
}

function sourceFamily(target) {
  return ["book", "source", "verse", "witness", "locator"].includes(clean(target?.type));
}

function unique(actions) {
  const seen = new Set();
  return actions.filter((action) => {
    const key = [action.kind, action.capability || "", action.href || "", action.id || action.label].join(":");
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function baseContextActions(target) {
  const out = [];
  if (target) {
    out.push({ id: "inspect", kind: CONTEXT_ACTION_KIND.INSPECT, label: "◎ בדוק", primary: true });
    if (numericFamily(target)) {
      out.push({ id: "number", kind: CONTEXT_ACTION_KIND.CAPABILITY, capability: "number", label: "123 מספר / גימטריה" });
    }
  }
  out.push({ id: "raziel", kind: CONTEXT_ACTION_KIND.RAZIEL, label: "● רזיאל" });
  out.push({ id: "heichal", kind: CONTEXT_ACTION_KIND.DEEPEN, label: "◇ העמק בהיכל" });
  return out;
}

function surfaceAction(surface, target) {
  const key = clean(surface);
  if (key === "books" && target) return { id: "book-deepen", kind: CONTEXT_ACTION_KIND.DEEPEN, label: "▤ חקור את המקור בהיכל" };
  if (key === "els") return { id: "els-deepen", kind: CONTEXT_ACTION_KIND.DEEPEN, label: "✦ העמק את בדיקת ELS" };
  if (key === "world" && target) return { id: "world-focus", kind: CONTEXT_ACTION_KIND.ROUTE, href: ROUTES.WORLD, label: "◌ פתח בעולם" };
  if (key === "number" && target) return { id: "number-world", kind: CONTEXT_ACTION_KIND.ROUTE, href: ROUTES.WORLD, label: "◌ ראה בעולם" };
  return null;
}

export function resolveContextActions({ surface = "system", target = null } = {}) {
  const actions = baseContextActions(target);
  const contextual = surfaceAction(surface, target);
  if (contextual) {
    const insertAt = target ? Math.min(actions.length - 2, 2) : 0;
    actions.splice(insertAt, 0, contextual);
  }
  return unique(actions);
}

function toolRoute(id, href, label) {
  return { id, kind: CONTEXT_ACTION_KIND.ROUTE, href, label };
}

function deepenTool(label = "◇ היכל") {
  return { id: "heichal", kind: CONTEXT_ACTION_KIND.DEEPEN, label };
}

export function resolveContextTools({ surface = "system", target = null } = {}) {
  const key = clean(surface);
  const out = [];

  if (numericFamily(target)) {
    out.push({ id: "number", kind: CONTEXT_ACTION_KIND.CAPABILITY, capability: "number", label: "123 מספר / גימטריה", primary: true });
  }

  // Current product homes only. Ordering adapts to the active surface; semantic identity does not.
  const bySurface = {
    world: [
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
      deepenTool(),
    ],
    books: [
      deepenTool(),
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
    ],
    els: [
      deepenTool(),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
    ],
    number: [
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
      deepenTool(),
    ],
    heichal: [
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
    ],
  };

  out.push(...(bySurface[key] || [
    deepenTool(),
    toolRoute("world", ROUTES.WORLD, "◌ עולם"),
    toolRoute("els", ROUTES.ELS, "✦ ELS"),
    toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
  ]));

  if (sourceFamily(target) && key !== "books") {
    out.unshift(toolRoute("books", ROUTES.BOOKS, "▤ פתח מקור / ספר"));
  }

  return unique(out);
}

export function describeContextCapabilityResolution({ surface = "system", target = null } = {}) {
  return {
    surface: clean(surface) || "system",
    subjectType: clean(target?.type) || null,
    actionCount: resolveContextActions({ surface, target }).length,
    toolCount: resolveContextTools({ surface, target }).length,
    owner: "research_strategy_layer_law v15 + research_workspace_law v4",
    boundary: "presentation-composition-only",
  };
}
