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
  return out;
}

function surfaceAction(surface, target) {
  const key = clean(surface);
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
    ],
    books: [
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
    ],
    els: [
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
    ],
    number: [
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
    ],
    heichal: [
      toolRoute("world", ROUTES.WORLD, "◌ עולם"),
      toolRoute("els", ROUTES.ELS, "✦ ELS"),
      toolRoute("books", ROUTES.BOOKS, "▤ ספרים / מקורות"),
    ],
  };

  out.push(...(bySurface[key] || [
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


/**
 * Visual-trial projection for the 2029 command island.
 * Two semantic anchors stay stable in SystemFrame (Command + Raziel).
 * This resolver owns only the three contextual presentation slots between/around them.
 * It is not a capability registry, router, entitlement source or truth owner.
 */
export function resolveCommandIslandSlots({ surface = "system", target = null } = {}) {
  const key = clean(surface);
  const isCalculation = Boolean(
    target?.focusKind === "calculation"
    || target?.method
    || target?.methodKey
    || (target?.expression && target?.resultValue != null)
  );

  if (isCalculation) {
    return [
      { id: "inspect-calculation", trigger: "inspect", icon: "◎", label: "מה יש כאן" },
      { id: "open-number", trigger: "number", icon: "123", label: "מספר" },
      { id: "open-heichal", trigger: "route", href: ROUTES.HEICHAL, icon: "◇", label: "היכל" },
    ];
  }

  if (numericFamily(target)) {
    return [
      { id: "inspect-number", trigger: "inspect", icon: "◎", label: key === "number" ? "חיבורים" : "בדוק" },
      { id: "open-world", trigger: "route", href: ROUTES.WORLD, icon: "◌", label: "עולם" },
      { id: "open-heichal", trigger: "heichal", icon: "◇", label: "היכל" },
    ];
  }

  if (sourceFamily(target)) {
    return [
      { id: "inspect-source", trigger: "inspect", icon: "◎", label: "בדוק" },
      { id: "source-actions", trigger: "action", icon: "↟", label: "פעולה" },
      { id: "source-tools", trigger: "tools", icon: "▤", label: "מקורות" },
    ];
  }

  return [
    { id: "context-action", trigger: "action", icon: "◎", label: "פעולה" },
    { id: "attention", trigger: "attention", icon: "◉", label: "עכשיו" },
    { id: "context-tools", trigger: "tools", icon: "◇", label: "כלים" },
  ];
}
