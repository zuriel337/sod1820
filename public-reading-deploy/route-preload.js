// The Home's own code, fetched with the document (ZURIEL 17.11.2026, speed: "דף הבית ... הבשר של האתר שלנו"). Without a hint the browser asks for the
// Home's chunk only after the entry has downloaded and run (Slow 4G lab: ~4.2 s after the navigation), and then for the System Frame and the
// rest of the Home's static imports, one wave after another. The build lists exactly those files (the Home page's static import graph beyond
// the entry, from the Vite manifest) inside an inert comment of the shared document; the document handler turns them into preload hints for the
// Home address only and removes the comment from every other document. The hints fetch the same URLs the app imports (one request each, kept
// in the document's module map / HTTP cache); nothing about what runs, or when, changes.
export const HOME_PRELOAD_MARK = "sod-home-preload";

// Slow networks (21.11.2026): the app opens only after the Service Worker is admitted, and the worker's script (/sw.js, ~24KB) competed for the
// line with ~70 module/style hints (~950KB on the Home). On Slow 3G the registration then missed the 10 s bootstrap deadline and the page failed.
// The hints are therefore applied by this loader instead of the markup:
//   - the page is already controlled by a worker (a returning reader, the common case): the hints start at once, exactly as before;
//   - no worker controls the page yet (first visit, hard reload): the hints start as soon as the browser holds the worker's script
//     (the registration has an installing/waiting/active worker), so /sw.js is never queued behind them;
//   - no Service Worker API: the app cannot open there (the bootstrap fails closed), so the hints are not fetched at all.
// The URLs, CORS mode and order are the same as the markup hints had; the bootstrap's import() consumes them (one request each).
export function sodHintLoader2029(w, d, n) {
  let open = false, tries = 0; const queue = [];
  const add = list => { for (const [href, style] of list) { const link = d.createElement("link"); link.rel = style ? "preload" : "modulepreload"; if (style) link.as = "style"; link.crossOrigin = "anonymous"; link.href = href; d.head.appendChild(link); } };
  w.__sodHints = list => { if (open) add(list); else queue.push(list); };
  const start = () => { if (open) return; open = true; for (const list of queue.splice(0)) add(list); };
  const sw = n.serviceWorker;
  if (!sw) return;
  if (sw.controller) return start();
  const wait = () => sw.getRegistration("/").then(r => { if (r && (r.installing || r.waiting || r.active)) start(); else if (++tries < 300) setTimeout(wait, 50); }, () => {});
  wait();
}

const hintList = hrefs => JSON.stringify(hrefs.map(href => href.endsWith(".css") ? [href, 1] : [href]));
/** Build side: the loader and the given hints (the entry first), in place of their markup links. */
export function hintLoaderScript2029(hrefs) {
  return `<script>(${sodHintLoader2029.toString()})(window,document,navigator);__sodHints(${hintList(hrefs)})</script>`;
}
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
  // Applied by the hint loader above (same URLs, CORS mode "anonymous" like the app's own loader, styles before scripts).
  return `<!--${HOME_PRELOAD_MARK} <script>__sodHints(${hintList([...styles, ...scripts])})</script> -->`;
}

/** Request side: the Home address gets the hints; every other document loses the comment. */
export function withRoutePreloads2029(html, { path, status } = {}) {
  const document = String(html || "");
  const match = BLOCK.exec(document);
  if (!match) return document;
  return document.replace(match[0], path === "/" && status === 200 ? match[1] : "");
}
