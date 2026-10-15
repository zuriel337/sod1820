// Resource preparation only: no import(), evaluation, data fetch or access decision.
// This function is serialized into the 2029 document by the dedicated build plugin.
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
