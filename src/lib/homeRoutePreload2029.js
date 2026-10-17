// The Home route graph is requested only after the entry has been downloaded, compiled and has rendered its providers
// (dependency-handoff D1). For the Home address alone, the same files the route would load are hinted as soon as the entry's own
// files have arrived: the network is idle while the entry compiles and runs, and nothing competes with the entry's download.
// Build side: derive the file sets from the bundle. Runtime side: one tiny serialized function; it hints nothing on any other route.
const HOME_FACADE = /\/src\/pages\/Home2029Page\.jsx$/;

function staticGraph(bundle, root) {
  const seen = new Set();
  const walk = (file) => {
    const chunk = bundle[file];
    if (!chunk || chunk.type !== 'chunk' || seen.has(file)) return;
    seen.add(file);
    for (const dep of chunk.imports || []) walk(dep);
  };
  walk(root);
  return seen;
}

// after: the entry document's own scripts (wait for these); js/css: what Home loads beyond them (hint these).
export function homeRoutePreloadPlan2029(bundle, entryFile, base = '/') {
  const homeFile = Object.keys(bundle).find((file) => bundle[file]?.type === 'chunk' && bundle[file].isDynamicEntry && HOME_FACADE.test(String(bundle[file].facadeModuleId || '').replaceAll('\\', '/')));
  if (!homeFile) return null;
  const inEntry = staticGraph(bundle, entryFile);
  const js = [];
  const css = [];
  for (const file of staticGraph(bundle, homeFile)) {
    if (inEntry.has(file)) continue;
    js.push(base + file);
    for (const sheet of bundle[file].viteMetadata?.importedCss || []) {
      if (!css.includes(base + sheet)) css.push(base + sheet);
    }
  }
  return js.length ? { after: [...inEntry].map((file) => base + file), js, css } : null;
}

// Runs inline in the document head. `host` is injectable for tests.
export function startHomeRoutePreload2029({ after, js, css, host = window }) {
  try {
    const { pathname, search } = host.location;
    // Same predicate as HomeEntry2029: ?preview=community renders another page, which must not pay for Home.
    if (pathname !== '/' || new URLSearchParams(search).get('preview') === 'community') return;
    const hint = () => {
      const head = host.document.head;
      for (const href of js) {
        const link = host.document.createElement('link');
        link.rel = 'modulepreload';
        link.crossOrigin = '';
        link.href = href;
        head.appendChild(link);
      }
      for (const href of css) {
        const link = host.document.createElement('link');
        link.rel = 'preload';
        link.as = 'style';
        link.crossOrigin = '';
        link.href = href;
        head.appendChild(link);
      }
    };
    // Without resource timing there is nothing to wait on: no hint (the route loads exactly as before).
    const Observer = host.PerformanceObserver;
    if (!Observer || !Observer.supportedEntryTypes || !Observer.supportedEntryTypes.includes('resource')) return;
    const waiting = new Set(after);
    const observer = new Observer((list) => {
      for (const entry of list.getEntries()) {
        try { waiting.delete(new URL(entry.name, host.location.href).pathname); } catch { /* ignore */ }
      }
      if (!waiting.size) { observer.disconnect(); hint(); }
    });
    observer.observe({ type: 'resource', buffered: true });
  } catch { /* A hint never prevents boot. */ }
}

export function homeRoutePreloadScript2029(plan) {
  return `<script id="sod2029-home-route-preload">(${startHomeRoutePreload2029.toString()})({after:${JSON.stringify(plan.after)},js:${JSON.stringify(plan.js)},css:${JSON.stringify(plan.css)}})</script>`;
}
