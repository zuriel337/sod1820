// Royal background loading belongs to App2029. Keep the independent pinned Home lead warmup.
// The old pure asset selector remains for provenance only; run() never invokes it.
import { HOME_ATMOSPHERE_2029 } from "./brandAssets2029.js";
import { PUBLIC_READING_RELEASE } from "./publicReadingRelease2029.js";

// Same breakpoint as homeComposition2029.css (@media (max-width:760px)).
export const HOME_ATMOSPHERE_MOBILE_MAX_WIDTH = 760;

export function homeAtmospherePreloadHref({ release, pathname, storedPreset, narrow }) {
  if (!release) return null;
  if (!["/", "/2029", "/2029/"].includes(pathname)) return null;
  // themePreset2029 falls back to "dark" for an absent or invalid value.
  const preset = ["light", "parchment", "dark"].includes(storedPreset) ? storedPreset : "dark";
  if (preset !== "dark") return null;
  return narrow ? HOME_ATMOSPHERE_2029.mobile : HOME_ATMOSPHERE_2029.desktop;
}

// The Home's pinned card: its catalog read and cover start from here too (homePinnedLeadEarly2029.js, reached through the Home route module that
// the router loads anyway, on demand, so the entry gains no static import and no other page's code changes). Same scope as the Home route of
// the public release; a WordPress ?p= address on "/" opens a Post, not the Home.
export function homePinnedLeadEarlyWanted({ release, pathname, search = "" }) {
  if (!release || !["/", "/2029", "/2029/"].includes(pathname)) return false;
  try { return !new URLSearchParams(search).get("p"); } catch { return true; }
}

function run() {
  try {
    if (typeof document === "undefined" || typeof window === "undefined") return;
    if (homePinnedLeadEarlyWanted({ release: PUBLIC_READING_RELEASE, pathname: window.location.pathname, search: window.location.search }))
      import("../pages/Home2029Page.jsx").then(module => module.startHomePinnedLeadEarly2029?.()).catch(() => {});
  } catch { /* a missed preload only restores the previous timing */ }
}

run();
