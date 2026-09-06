import { useSyncExternalStore } from "react";

// 📣 Shared owner for the existing LiveChannelFeed launcher state + its ambient unseen signal.
// This does not fetch or calculate updates; LiveChannelFeed remains the producer of unseen truth.
let state = { open: false, unseen: 0 };
const subs = new Set();
const emit = () => subs.forEach(f => f());
const patch = next => { state = { ...state, ...next }; emit(); };

export function openSiteUpdates() { patch({ open: true }); }
export function closeSiteUpdates() { patch({ open: false }); }
export function toggleSiteUpdates() { patch({ open: !state.open }); }
export function setSiteUpdatesUnseen(unseen = 0) {
  const n = Math.max(0, Number(unseen) || 0);
  if (n !== state.unseen) patch({ unseen: n });
}
export function useSiteUpdates() {
  return useSyncExternalStore(
    cb => { subs.add(cb); return () => subs.delete(cb); },
    () => state, () => state
  );
}

const SITE_UPDATES_ROUTES = [/^\/$/, /^\/home-new$/, /^\/בית-חדש$/, /^\/community\/chat$/];
export function isSiteUpdatesRoute(pathname) {
  return SITE_UPDATES_ROUTES.some(re => re.test(pathname));
}
