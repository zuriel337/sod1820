// One watcher of the EXISTING world discovery stream for the whole frame (panel, phone chip). Visibility-bound polling
// is owned by watchWorldDiscoveryStream. Tiers (Gold/Diamond) are read lazily for the first three convergences.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feedRows, feedSeenKey } from "../../lib/systemFeed2029.js";
import { readSeen, markSeen } from "../../lib/homeMotion2029.js";
import { tierLookupNumbers } from "../../lib/ratings2029.js";
import { fetchNumberTierSignals } from "../../lib/research/numberTierSignals.js";
import { useAuth } from "../../lib/AuthContext.jsx";

// Navigation remounts the frame. Freshness policy: the PUBLIC stream (includeResearch:false, anonymous-safe readers
// only) is reused for at most the existing 60s poll bound, never across a principal change, never after an error.
// The first refresh is still scheduled at that bound, so staleness is not extended. Tier signals use the same bound.
const FEED_FRESH_MS = 60000;
let sharedFeed = null; // { at, principal, state }
const tierMemo = new Map(); // item.id -> { at, strong }
const freshFeed = (principal) => (sharedFeed && sharedFeed.principal === principal && Date.now() - sharedFeed.at < FEED_FRESH_MS ? sharedFeed : null);

export function useSystemFeed2029({ enabled = true } = {}) {
  const { user, loading: authLoading } = useAuth() || {};
  const principal = authLoading ? "auth-loading" : user?.id || "guest";
  const [state, setState] = useState(() => freshFeed(principal)?.state || { loading: true, items: [], error: false, unavailableSources: [], groupArrivals: null });
  const [seen, setSeen] = useState(readSeen);
  const [strongIds, setStrongIds] = useState(() => Object.fromEntries([...tierMemo].filter(([, v]) => Date.now() - v.at < FEED_FRESH_MS).map(([k, v]) => [k, v.strong])));
  const asked = useRef(new Set());

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true; let stop;
    const reuse = freshFeed(principal);
    import("../../lib/research/worldDiscoveryStream.js").then(({ watchWorldDiscoveryStream }) => {
      if (!live) return;
      stop = watchWorldDiscoveryStream({
        limit: 40, includeResearch: false,
        immediate: !reuse, firstRefreshInMs: reuse ? Math.max(1000, FEED_FRESH_MS - (Date.now() - reuse.at)) : 0,
        onResult: (result) => {
          if (!live) return;
          // Share the public stream's availability with BOTH the desktop left rail and
          // the mobile Now sheet. One subscription, no second reader or private payload.
          const next = {
            loading: false,
            items: Array.isArray(result?.items) ? result.items : [],
            error: false,
            unavailableSources: Array.isArray(result?.unavailableSources) ? result.unavailableSources : [],
            groupArrivals: result?.groupArrivals || null,
          };
          sharedFeed = { at: Date.now(), principal, state: next };
          setState(next);
        },
        onError: () => { sharedFeed = null; if (live) setState((current) => ({ ...current, loading: false, error: current.items.length === 0 })); },
      });
    }).catch(() => { if (live) setState({ loading: false, items: [], error: true }); });
    return () => { live = false; stop?.(); };
  }, [enabled, principal]);

  useEffect(() => {
    state.items.filter((item) => item.kind === "convergence").slice(0, 3).forEach((item) => {
      if (asked.current.has(item.id)) return;
      asked.current.add(item.id);
      const memo = tierMemo.get(item.id);
      if (memo && Date.now() - memo.at < FEED_FRESH_MS) return;
      const numbers = tierLookupNumbers(item.numbers, item.numbers);
      if (!numbers.length) return;
      fetchNumberTierSignals(numbers).then((tiers) => {
        if (tiers?.loaded) tierMemo.set(item.id, { at: Date.now(), strong: (tiers.diamond || 0) > 0 || (tiers.gold || 0) > 0 });
        if (tiers?.loaded) setStrongIds((current) => ({ ...current, [item.id]: (tiers.diamond || 0) > 0 || (tiers.gold || 0) > 0 }));
      });
    });
  }, [state.items]);

  const rows = useMemo(() => feedRows(state.items, { seen, strongIds }), [state.items, seen, strongIds]);
  const newCount = rows.filter((row) => row.isNew).length;
  const newest = rows.filter((row) => row.isNew).map((row) => row.at).filter(Boolean).sort().reverse()[0] || null;
  const see = useCallback((row) => setSeen((current) => (current[feedSeenKey(row.item)] ? current : markSeen(feedSeenKey(row.item), current))), []);
  return { ...state, rows, newCount, newest, see };
}
