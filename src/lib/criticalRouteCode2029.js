// Resource preparation only: no import(), evaluation, data fetch or access decision.
// The build emits an inert route-to-files map; bootstrap calls this after the
// entry code is loaded, so preparation cannot compete with that initial download.
export function prepareCurrentRouteCode2029(files, host = window) {
  try {
    const { pathname, search } = host.location;
    const route = pathname.replace(/^\/2029(?=\/|$)/, '') || '/';
    const key = /^\/$/.test(route) && new URLSearchParams(search).get('preview') !== 'community'
      ? 'home' : /^\/world\/?$/i.test(route) ? 'world' : /^\/post\/[^/]+\/?$/i.test(route) ? 'post' : null;
    if (!key) return;
    const doc = host.document;
    if (!doc.createElement('link').relList?.supports?.('modulepreload')) return;
    for (const href of files[key] || []) {
      if ([...doc.querySelectorAll('link[rel="modulepreload"]')].some(link => link.getAttribute('href') === href)) continue;
      const link = doc.createElement('link');
      link.rel = 'modulepreload';
      link.crossOrigin = '';
      link.href = href;
      doc.head.appendChild(link);
    }
  } catch { /* Preparation is optional; the existing lazy import remains authoritative. */ }
}

export function prepareEntryRouteCode2029(host = window) {
  try {
    const map = host.document.getElementById('sod2029-current-route-code');
    if (map) prepareCurrentRouteCode2029(JSON.parse(map.textContent), host);
  } catch { /* A missing/invalid build hint never blocks normal route loading. */ }
}
