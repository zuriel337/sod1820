// 🧭 Adaptive Shell — Context Spine (W1 Slice 1).
//
// ⛔ NOT AN OWNER. This module holds **zero state** and creates **no store**.
// It is a pure projection over two capability owners that already exist on main:
//   1. the route (react-router location), and
//   2. the canonical Research Context (src/lib/research/ResearchProvider.jsx
//      + researchContext.js normalization).
//
// Why it exists (System Frame Contract v2 addendum §3.1 "Global Orientation Header"):
// the route→orientation projection used to live privately inside BottomBar.jsx.
// A second surface that answers "where am I" would have had to copy it — which is
// exactly the parallel-system failure `canonical_ui_components_law` forbids.
// Extracting the derivation gives ONE spine that every shell projection reads.
//
// Invariants (system frame v2 §1 + workspace_layout_standard v2 "LAYOUT MUST NOT OWN SEMANTICS"):
// - no second Research Context store — the context object is passed IN, never held here;
// - no navigation performed here — callers own navigate();
// - no truth/access/AI semantics — orientation only. HOT != TRUE.
// - React-free on purpose, so the spine is unit-testable without a DOM.

// 🗺️ Route → coarse orientation ("what kind of place is this?").
// Moved verbatim in semantics from BottomBar.contextFromLocation so the Dock's
// existing behavior is preserved exactly; see test/shell-context-spine.test.mjs.
export function describeRoute(pathname, search = "") {
  const parts = String(pathname || "").split("/").filter(Boolean);
  const qs = new URLSearchParams(search || "");
  if (parts[0] === "number" && parts[1]) return { kind: "מספר", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "topic" && parts[1]) return { kind: "נושא", label: decodeURIComponent(parts.slice(1).join("/")) };
  if (parts[0] === "journey" || parts[0] === "מסע") return { kind: "מסע", label: "המסע הנוכחי" };
  if ((parts[0] === "lab" && parts[1] === "els") || (parts[0] === "research" && qs.get("tool") === "els")) return { kind: "ELS", label: "מרחב הצופן" };
  if (parts[0] === "book") return { kind: "ספר", label: qs.get("book") || parts[1] || "מרחב הספר" };
  if (parts[0] === "heichal" || parts[0] === "היכל") return { kind: "היכל", label: "היכל" };
  if (parts.length === 1 && !["admin", "login", "profile", "credits", "buy", "research"].includes(parts[0])) return { kind: "פוסט", label: decodeURIComponent(parts[0]) };
  return { kind: "SOD1820", label: "מרחב המחקר" };
}

export function lensLabel(lens) {
  const labels = { number: "מספר", topic: "נושא", post: "פוסט", els: "ELS", book: "ספר", source: "מקור", person: "אדם", name: "שם", journey: "מסע", graph: "קשרים" };
  return labels[lens] || lens || "הקשר";
}

export function lensForSubject(subject) {
  if (!subject) return null;
  if (subject.type === "number" || subject.type === "phrase") return "number";
  if (subject.type === "topic" || subject.type === "convergence") return "topic";
  if (subject.type === "els" || subject.type === "code") return "els";
  if (subject.type === "book" || subject.type === "source") return "book";
  if (subject.type === "person" || subject.type === "name") return "person";
  return subject.type || null;
}

// 🧭 The spine itself: (route + Research Context) → one orientation projection.
// Every field is derived; nothing is remembered between calls.
export function deriveShellContext({ pathname, search = "", context = null } = {}) {
  const route = describeRoute(pathname, search);
  const root = context?.subject || null;
  const lens = context?.lens || null;
  const returnTo = context?.returnTo || null;
  const selection = context?.selection || null;
  const currentRef = selection?.entityId || selection?.locator || null;
  const currentType = selection?.entityType || null;
  const rootLabel = root?.label || root?.id || null;
  // The research root is worth showing only when it is a *different* place than
  // the one currently on screen — otherwise it is noise, not orientation.
  const rootDiffers = Boolean(root?.href && root.href !== pathname && rootLabel && rootLabel !== route.label);
  return {
    route,
    kind: route.kind,
    label: route.label,
    href: `${pathname}${search || ""}`,
    root,
    rootLabel,
    rootDiffers,
    lens,
    lensLabel: lens ? lensLabel(lens) : null,
    selection,
    currentRef,
    currentType,
    returnTo,
    // ambient signal source (system frame v1 "Ambient signals"): real context only,
    // never fabricated prominence.
    hasContext: Boolean(root || selection || lens || returnTo),
  };
}

// ↩ return_exact (system frame v2 §5): the patch that restores the *exact* prior
// research position — subject/selection/lens — rather than a bare history pop.
// Returns null when there is no valid return target, so callers render an honest
// "no return available" state instead of silently redirecting elsewhere.
export function resolveReturnPatch(returnTo, activeLens = null) {
  if (!returnTo?.href) return null;
  const target = returnTo.subject || null;
  return {
    href: returnTo.href,
    patch: {
      selection: target ? { entityId: target.id, entityType: target.type } : null,
      lens: target ? lensForSubject(target) : activeLens,
      returnTo: null,
    },
  };
}

// ↩ Same exactness guarantee for jumping back to the research root.
export function resolveRootPatch(root) {
  if (!root?.href) return null;
  return {
    href: root.href,
    patch: {
      selection: { entityId: root.id, entityType: root.type },
      lens: lensForSubject(root),
      returnTo: null,
    },
  };
}
