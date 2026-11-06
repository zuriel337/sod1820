// Home atmosphere early fetch (performance only; no visual or semantic change).
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
  if (!["/", "/2029", "/2029/"].includes(pathname)) return null;
  // themePreset2029 falls back to "dark" for an absent or invalid value.
  const preset = ["light", "parchment", "dark"].includes(storedPreset) ? storedPreset : "dark";
  if (preset !== "dark") return null;
  return narrow ? HOME_ATMOSPHERE_2029.mobile : HOME_ATMOSPHERE_2029.desktop;
}

function run() {
  try {
    if (typeof document === "undefined" || typeof window === "undefined") return;
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
