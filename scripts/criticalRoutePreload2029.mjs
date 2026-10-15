// Follow static JS imports only. Dynamic imports and styles retain their existing
// lifecycle; neither another route nor a deferred feature is prepared speculatively.
export function currentRouteFiles2029(bundle, base = '/') {
  const targets = { home: '/src/pages/Home2029Page.jsx', world: '/src/pages/World2029Page.jsx', post: '/src/pages/Post2029Page.jsx' };
  const result = {};
  for (const [route, suffix] of Object.entries(targets)) {
    const entry = Object.values(bundle).find(chunk => chunk.type === 'chunk' && chunk.facadeModuleId?.replaceAll('\\', '/').endsWith(suffix));
    if (!entry) throw new Error(`Missing 2029 route chunk: ${route}`);
    const seen = new Set();
    function visit(name) {
      if (seen.has(name)) return;
      const chunk = bundle[name];
      if (chunk?.type !== 'chunk') return;
      seen.add(name);
      for (const dep of chunk.imports) visit(dep);
    }
    visit(entry.fileName);
    result[route] = [...seen].map(name => `${base}${name}`);
  }
  return result;
}

export function criticalRoutePreload2029() {
  let base = '/';
  return {
    name: '2029-current-route-code',
    apply: 'build',
    configResolved(config) { base = config.base; },
    transformIndexHtml: {
      order: 'post',
      handler(html, { bundle }) {
        const files = currentRouteFiles2029(bundle, base);
        return { html, tags: [{ tag: 'script', attrs: { id: 'sod2029-current-route-code', type: 'application/json' }, children: JSON.stringify(files), injectTo: 'head' }] };
      },
    },
  };
}
