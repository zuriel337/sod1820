// 🧭 Adaptive Shell — semantic slot declaration (W1 Slice 1).
//
// System Frame Contract v2 addendum §2 retires the fixed "one physical rail per
// device" model: **capability is stable, placement is adaptive**. This file is the
// single honest declaration of which semantic shell capabilities exist and how each
// is projected today — so a later slice can move a projection without anyone having
// to guess which surface secretly owns it.
//
// ⛔ This is a DECLARATION, not a registry that renders or owns anything. It creates
// no component, no store, no navigation and no second User Center. `owner` names the
// module that already carries the capability on main; `status` states the live truth
// so a prepared slot is never mistaken for a shipped one (DOCUMENTED != IMPLEMENTED).

export const SHELL_SLOTS = {
  // WHERE AM I? — shipped in this slice.
  orientation: {
    capability: "orientation",
    owner: "src/components/layout/OrientationHeader.jsx",
    spine: "src/lib/shell/shellContext.js",
    projections: { mobile: "inline-header", desktop: "inline-header" },
    status: "IMPLEMENTED_GATED_ADMIN_PILOT",
  },
  // WHAT CAN I DO NOW? — already live on main as the canonical Bottom Dock.
  commands: {
    capability: "adaptive_commands",
    owner: "src/components/layout/BottomBar.jsx",
    spine: "src/lib/shell/shellContext.js",
    projections: { mobile: "bottom-dock", desktop: "bottom-dock" },
    status: "IMPLEMENTED_GATED_ADMIN_PILOT",
  },
  // WHERE CAN I GO? — the desktop Sidebar projection is W1 Slice 2+, not built here.
  globalNavigation: {
    capability: "global_navigation",
    owner: "src/components/layout/Navbar.jsx",
    projections: { mobile: "navbar-drawer", desktop: "navbar-mega-menu" },
    plannedProjections: { desktop: "collapsible-sidebar" },
    status: "SLOT_PREPARED_LEGACY_NAVBAR_STILL_CANONICAL",
  },
  // One companion, many projections. The desktop Companion Rail is NOT built here;
  // Raziel still lives exactly where it lives on main (RazielChat under /research).
  raziel: {
    capability: "raziel_companion",
    owner: "src/pages/research (RazielChat via ResearchShell)",
    launcher: "src/components/layout/BottomBar.jsx",
    projections: { mobile: "dock-slot", desktop: "dock-slot" },
    plannedProjections: { desktop: "companion-rail" },
    status: "SLOT_PREPARED_NO_NEW_AI_SESSION",
  },
  // One personal area. Multiple launchers, single capability (v2 addendum §3.6).
  myWorkspace: {
    capability: "open_my_workspace",
    owner: "src/components/userCenter/UserCenter.jsx",
    store: "src/lib/userCenter/UserCenterContext.jsx",
    projections: { mobile: "sheet", desktop: "drawer" },
    status: "SLOT_PREPARED_EXISTING_USER_CENTER_ONLY",
  },
};

// Slots whose projection is prepared but whose 2027 target rendering is deliberately
// deferred to a later W1/W2 slice. Kept explicit so "prepared" never reads as "done".
export const DEFERRED_SLOT_PROJECTIONS = ["globalNavigation", "raziel"];
