// Self-contained functions: these are serialized into the measured document.
export function primaryContentState(pathname) {
  const rendered = el => !!el && !!el.getClientRects().length
    && getComputedStyle(el).visibility !== 'hidden' && getComputedStyle(el).display !== 'none'
    && !el.closest('[aria-busy="true"], [aria-hidden="true"], .h29-skel, .dg29-skeleton, .is-loading');
  const text = el => rendered(el) && !!el.innerText.trim();
  const home = document.querySelector('[data-experience-capability="home-composition"]');
  const world = document.querySelector('[data-flight-story="world"] .sod29-flight-feature');
  const post = document.querySelector('[data-experience-capability="post-master-reading-stage"]');
  const shell = rendered(document.querySelector('main'));
  if (pathname === '/') {
    const hero = home?.querySelector('.h29-hero');
    const cards = [...(home?.querySelectorAll('.h29-card') || [])];
    const ready = (rendered(hero) && text(hero.querySelector('h1')) && rendered(hero.querySelector('a[href^="/post/"]')))
      || cards.some(card => text(card.querySelector('.h29-card-t')) && rendered(card.querySelector('a[href^="/post/"]')));
    return { shell, primary: !!ready, kind: 'home-post-title-and-destination' };
  }
  if (pathname === '/world') return { shell,
    primary: !!(rendered(world) && text(world.querySelector('h2')) && text(world.querySelector('.sod29-flight-meta'))
      && rendered(world.querySelector('.sod29-actions button'))), kind: 'world-admitted-story-and-action' };
  if (pathname.startsWith('/post/')) return { shell,
    primary: !!(rendered(post) && post.dataset.postSlug === decodeURIComponent(pathname.slice(6))
      && text(post.querySelector('h1')) && text(post.querySelector('.sod29-reading-source'))), kind: 'post-matching-slug-title-and-source' };
  return { shell, primary: false, kind: 'unsupported-route' };
}

// CWV session-window aggregation, excluding shifts after recent input. This
// runner observes a bounded lab window, not the complete field page lifetime.
export function sessionWindowCls(entries) {
  let max = 0, value = 0, first = 0, previous = 0;
  for (const e of entries.filter(e => !e.hadRecentInput).sort((a, b) => a.startTime - b.startTime)) {
    if (value > 0 && e.startTime - previous < 1000 && e.startTime - first < 5000) value += e.value;
    else { first = e.startTime; value = e.value; }
    previous = e.startTime;
    max = Math.max(max, value);
  }
  return max;
}

export function installBrowserMetrics({ pathname }) {
  window.__resetPerf = (start = 0) => {
    window.__perfStart = start;
    window.__perf = { shell: null, ready: null, lcp: 0, cls: 0, layoutShiftSum: 0 };
    window.__shifts = [];
  };
  window.__resetPerf();
  const lcp = new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.startTime >= window.__perfStart) window.__perf.lcp = e.startTime;
  });
  const shifts = new PerformanceObserver(list => {
    for (const e of list.getEntries()) if (e.startTime >= window.__perfStart)
      window.__shifts.push({ startTime: e.startTime, value: e.value, hadRecentInput: e.hadRecentInput });
    window.__perf.layoutShiftSum = window.__shifts.filter(e => !e.hadRecentInput).reduce((sum, e) => sum + e.value, 0);
    window.__perf.cls = window.__sessionWindowCls(window.__shifts);
  });
  lcp.observe({ type: 'largest-contentful-paint', buffered: true });
  shifts.observe({ type: 'layout-shift', buffered: true });
  let frame;
  const check = () => {
    cancelAnimationFrame(frame);
    const state = window.__primaryContentState(pathname);
    if (state.shell && window.__perf.shell == null) window.__perf.shell = performance.now();
    if (state.primary && window.__perf.ready == null) window.__perf.ready = performance.now();
    if (window.__perf.ready == null) frame = requestAnimationFrame(check);
  };
  window.__checkPrimaryReady = check;
  frame = requestAnimationFrame(check);
}
