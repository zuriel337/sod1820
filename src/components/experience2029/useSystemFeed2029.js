// One watcher of the EXISTING world discovery stream for the whole frame (panel, phone chip). Visibility-bound polling
// is owned by watchWorldDiscoveryStream. Tiers (Gold/Diamond) are read lazily for the first three convergences.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feedRows, feedSeenKey } from "../../lib/systemFeed2029.js";
import { readSeen, markSeen } from "../../lib/homeMotion2029.js";
import { tierLookupNumbers } from "../../lib/ratings2029.js";
import { fetchNumberTierSignals } from "../../lib/research/numberTierSignals.js";
import { useRuntimeSwitch } from "../../lib/runtimeSwitches2029.js";

export function useSystemFeed2029({ enabled = true } = {}) { // eslint-disable-line no-param-reassign
  const [state, setState] = useState({ loading: true, items: [], error: false, unavailableSources: [], groupArrivals: null });
  const [seen, setSeen] = useState(readSeen);
  const [strongIds, setStrongIds] = useState({});
  const asked = useRef(new Set());
  // Owner switch (control panel). Nothing starts until the switch is known, so a function that is OFF never fires a request.
  const switchState = useRuntimeSwitch("fx_now_feed");
  const off = !switchState.loading && !switchState.on;
  enabled = enabled && !switchState.loading && switchState.on;

  useEffect(() => {
    if (!enabled) return undefined;
    let live = true; let stop;
    import("../../lib/research/worldDiscoveryStream.js").then(({ watchWorldDiscoveryStream }) => {
      if (!live) return;
      stop = watchWorldDiscoveryStream({
        limit: 40, includeResearch: false,
        onResult: (result) => {
          if (!live) return;
          // Share the public stream's availability with BOTH the desktop left rail and
          // the mobile Now sheet. One subscription, no second reader or private payload.
          setState({
            loading: false,
            items: Array.isArray(result?.items) ? result.items : [],
            error: false,
            unavailableSources: Array.isArray(result?.unavailableSources) ? result.unavailableSources : [],
            groupArrivals: result?.groupArrivals || null,
          });
        },
        onError: () => { if (live) setState((current) => ({ ...current, loading: false, error: current.items.length === 0 })); },
      });
    }).catch(() => { if (live) setState({ loading: false, items: [], error: true }); });
    return () => { live = false; stop?.(); };
  }, [enabled]);

  useEffect(() => {
    state.items.filter((item) => item.kind === "convergence").slice(0, 3).forEach((item) => {
      if (asked.current.has(item.id)) return;
      asked.current.add(item.id);
      const numbers = tierLookupNumbers(item.numbers, item.numbers);
      if (!numbers.length) return;
      fetchNumberTierSignals(numbers).then((tiers) => {
        if (tiers?.loaded) setStrongIds((current) => ({ ...current, [item.id]: (tiers.diamond || 0) > 0 || (tiers.gold || 0) > 0 }));
      });
    });
  }, [state.items]);

  const rows = useMemo(() => feedRows(state.items, { seen, strongIds }), [state.items, seen, strongIds]);
  const newCount = rows.filter((row) => row.isNew).length;
  const newest = rows.filter((row) => row.isNew).map((row) => row.at).filter(Boolean).sort().reverse()[0] || null;
  const see = useCallback((row) => setSeen((current) => (current[feedSeenKey(row.item)] ? current : markSeen(feedSeenKey(row.item), current))), []);
  return { ...state, loading: off ? false : state.loading, off, rows: off ? [] : rows, newCount: off ? 0 : newCount, newest: off ? null : newest, see };
}
