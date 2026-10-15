// Playwright load states are latched. Observe the current request lifecycle so
// a late burst cannot reuse an earlier networkidle event as a completion signal.
export function observeNetworkQuiet(page) {
  const active = new Set();
  let lastActivity = performance.now();
  page.on('request', request => { active.add(request); lastActivity = performance.now(); });
  const finish = request => { active.delete(request); lastActivity = performance.now(); };
  page.on('requestfinished', finish);
  page.on('requestfailed', finish);
  return {
    pending: () => active.size,
    async wait({ quietMs = 500, timeoutMs = 30000 } = {}) {
      const start = performance.now();
      while (active.size || performance.now() - lastActivity < quietMs) {
        if (performance.now() - start >= timeoutMs) throw new Error('Current network did not become quiet');
        await new Promise(resolve => setTimeout(resolve, 25));
      }
    },
  };
}
