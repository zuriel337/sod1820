// EXPERIMENT (private worktree only): start the World's first data read from the boot script,
// in parallel with the route chunk. Same reader (fetchExplorerFacetPage), same arguments.
let slot = null;
export function startEarlyWorld(pathname = '') {
  if (import.meta.env.VITE_WORLD_EARLY === '0') return;
  try {
    if (pathname === '/world' || pathname === '/world/') {
      slot = import('./research/explorerFacets.js').then((m) => m.fetchExplorerFacetPage('topic', { limit: 8, offset: 0 }));
      slot.catch(() => {});
    }
  } catch { /* optimisation only */ }
}
export function takeEarlyWorld() { const p = slot; slot = null; return p; }

// First-paint gate: work that is not drawn first (flight story data, its code chunk) waits for it.
let paintedResolve; export const worldPainted = new Promise((r) => { paintedResolve = r; });
export function markWorldPainted() { paintedResolve(); }
