// Home atmosphere early fetch (performance only; no visual or semantic change). Since 17.11.2026 it also starts the pinned card's catalog read
// and cover (homePinnedLeadEarlyWanted below).
//
// On the public reading release the Home hero's atmosphere is a CSS background
// image that the browser discovers only after the Home chunk renders, so on slow
// links it was the last LCP candidate. This asks for the same file at entry-module
// time instead. It is the exact URL the Home CSS already uses, so the later CSS
// request is served from this one. Scope is deliberately narrow: only the Home
// path, only the release that renders the atmosphere, only the dark preset (the
// only preset whose CSS paints it) and only the viewport variant that will be used.
import { HOME_ATMOSPHERE_2029 } from "./brandAssets2029.js";
import { PUBLIC_READING_RELEASE } from "./publicReadingRelease2029.js";
import { THEME_STORAGE_KEY_2029 } from "./themePreset2029.js";

// Same breakpoint as homeComposition2029.css (@media (max-width:760px)).
export const HOME_ATMOSPHERE_MOBILE_MAX_WIDTH = 760;

export function homeAtmospherePreloadHref({ release, pathname, storedPreset, narrow }) {
  if (!release) return null;
  if (!/^\/(?:2029\/?)?$/.test(pathname)) return null;
  // themePreset2029 falls back to "dark" for an absent or invalid value.
  const preset = ["light", "parchment", "dark"].includes(storedPreset) ? storedPreset : "dark";
  if (preset !== "dark") return null;
  return narrow ? HOME_ATMOSPHERE_2029.mobile : HOME_ATMOSPHERE_2029.desktop;
}

// The Home's pinned card: its catalog read and cover start from its own small helper chunk. It does not wait
// for the much larger Home route module, and it adds no static code to the entry or to other pages. Same scope as the Home route of
// the public release; a WordPress ?p= address on "/" opens a Post, not the Home.
export function homePinnedLeadEarlyWanted({ release, pathname, search = "" }) {
  if (!release || !/^\/(?:2029\/?)?$/.test(pathname)) return false;
  try { return !new URLSearchParams(search).get("p"); } catch { return true; }
}

function run() {
  try {
    if (!globalThis.document || !globalThis.window) return;
    if (homePinnedLeadEarlyWanted({ release: PUBLIC_READING_RELEASE, pathname: window.location.pathname, search: window.location.search }))
      import("./homePinnedLeadEarly2029.js").then(module => module.default()).catch(() => {});
    let storedPreset = null;
    try { storedPreset = localStorage.getItem(THEME_STORAGE_KEY_2029); } catch { /* storage unavailable: default preset */ }
    const href = homeAtmospherePreloadHref({
      release: PUBLIC_READING_RELEASE,
      pathname: window.location.pathname,
      storedPreset,
      narrow: window.matchMedia(`(max-width:${HOME_ATMOSPHERE_MOBILE_MAX_WIDTH}px)`).matches,
    });
    if (!href || document.querySelector(`link[rel="preload"][href="${href}"]`)) return;
    const link = document.createElement("link");
    link.rel = "preload";
    link.as = "image";
    link.type = "image/webp";
    link.href = href;
    document.head.appendChild(link);
  } catch { /* a missed preload only restores the previous timing */ }
}

run();
