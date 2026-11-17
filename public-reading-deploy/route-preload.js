// The Home's own code, fetched with the document (ZURIEL 17.11.2026, speed: "דף הבית ... הבשר של האתר שלנו"). Without a hint the browser asks for the
// Home's chunk only after the entry has downloaded and run (Slow 4G lab: ~4.2 s after the navigation), and then for the System Frame and the
// rest of the Home's static imports, one wave after another. The build lists exactly those files (the Home page's static import graph beyond
// the entry, from the Vite manifest) inside an inert comment of the shared document; the document handler turns them into preload hints for the
// Home address only and removes the comment from every other document. The hints fetch the same URLs the app imports (one request each, kept
// in the document's module map / HTTP cache); nothing about what runs, or when, changes.
export const HOME_PRELOAD_MARK = "sod-home-preload";
const BLOCK = new RegExp(`<!--${HOME_PRELOAD_MARK} ([\\s\\S]*?) -->`);
const ASSET = /^\/assets\/[A-Za-z0-9._-]+\.(?:js|css)$/;

/** Build side: the Home's static graph beyond the entry, as preload links inside one inert comment (empty string when the graph is unknown). */
export function homePreloadComment(manifest, { page = "src/pages/Home2029Page.jsx" } = {}) {
  const closure = (key, seen = new Set()) => { if (seen.has(key) || !manifest?.[key]) return seen; seen.add(key); for (const next of manifest[key].imports || []) closure(next, seen); return seen; };
  const entryKey = Object.keys(manifest || {}).find(key => manifest[key]?.isEntry && /(^|\/)2029\.html$/.test(key));
  if (!entryKey || !manifest[page]) return "";
  const entry = closure(entryKey);
  const keys = [...closure(page)].filter(key => !entry.has(key));
  const scripts = keys.map(key => `/${manifest[key].file}`).filter(href => ASSET.test(href));
  const styles = [...new Set(keys.flatMap(key => manifest[key].css || []).map(file => `/${file}`))].filter(href => ASSET.test(href));
  if (!scripts.length) return "";
  // `crossorigin` on both: the app's loader asks for these stylesheets and modules in CORS mode, and a hint in another mode is a second download.
  const links = [...styles.map(href => `<link rel="preload" as="style" crossorigin href="${href}">`), ...scripts.map(href => `<link rel="modulepreload" crossorigin href="${href}">`)].join("");
  return `<!--${HOME_PRELOAD_MARK} ${links} -->`;
}

/** Request side: the Home address gets the hints; every other document loses the comment. */
export function withRoutePreloads2029(html, { path, status } = {}) {
  const document = String(html || "");
  const match = BLOCK.exec(document);
  if (!match) return document;
  return document.replace(match[0], path === "/" && status === 200 ? match[1] : "");
}
