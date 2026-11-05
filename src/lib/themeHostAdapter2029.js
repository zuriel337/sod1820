// LEGACY-HOST THEME ADAPTER — compiled ONLY into the Legacy build (vite.config.js legacyHostThemeAdapter).
//
// Why it exists: the Legacy runtime hosts a few 2029 pages (/world, /heichal, /היכל, /2029 while not handed off,
// the shadow preview). Those pages import the 2029-owned theme store (themePreset2029.js). Inside the Legacy runtime that
// import resolves HERE, so a hosted 2029 page follows the HOST's theme exactly as it did before the separation.
//
// Boundaries (one-way, theme only):
//  - Legacy -> hosted page: the host theme (Legacy themeMode.js, key "sod-theme") is passed through unchanged.
//  - The Legacy build contains NO 2029 theme store: no "sod2029:*" keys are read or written here.
//  - Nothing flows hosted/2029 -> Legacy storage. The hosted page's chooser calls Legacy setThemePreset, which was already true.
//  - 2029-owned CSS keys on [data-theme-2029]; this adapter mirrors the host's preset attribute into it (attribute only, no storage).
//
// REMOVAL: delete this file, paletteHostAdapter2029.js and the legacyHostThemeAdapter plugin when the 2029 pages are
// detached from Legacy (routes handed off to the 2029 document). Nothing else references them.
export * from "./themeMode.js";

const SOURCE_ATTRIBUTE = "data-theme-preset"; // written by the Legacy theme store
const HOSTED_ATTRIBUTE = "data-theme-2029";   // read by 2029-owned CSS

if (typeof document !== "undefined" && typeof MutationObserver !== "undefined") {
  const root = document.documentElement;
  const mirror = () => {
    const value = root.getAttribute(SOURCE_ATTRIBUTE);
    if (value) root.setAttribute(HOSTED_ATTRIBUTE, value);
    else root.removeAttribute(HOSTED_ATTRIBUTE);
  };
  mirror();
  new MutationObserver(mirror).observe(root, { attributes: true, attributeFilter: [SOURCE_ATTRIBUTE] });
}
