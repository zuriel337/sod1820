// One watcher of the EXISTING world discovery stream for the whole frame (panel, phone chip). Visibility-bound polling
// is owned by watchWorldDiscoveryStream. Tiers (Gold/Diamond) are read lazily for the first three convergences.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feedRows, feedSeenKey, mergeSystemFeedItems } from "../../lib/systemFeed2029.js";
import { readSeen, markSeen } from "../../lib/homeMotion2029.js";
import { tierLookupNumbers } from "../../lib/ratings2029.js";
import { fetchNumberTierSignals } from "../../lib/research/numberTierSignals.js";

export function useSystemFeed2029({ enabled = true } = {}) {
  const [state, setState] = useState({ loading: true, items: [], error: false, unavailableSources: [], groupArrivals: null });
  const [seen, setSeen] = useState(readSeen);
  const [strongIds, setStrongIds] = useState({});
  const asked = useRef(new Set());
  const requestedNow = useRef(false), nowEpoch = useRef(0), nowController = useRef(null), nowPending = useRef(false), streamResults = useRef(0);
  const [nowSources, setNowSources] = useState({ requested: false, loading: false, items: [], sourceStates: [], error: false });
  const refreshNowDetails = useCallback(() => {
    if (nowPending.current) return;
    nowPending.current = true;
    const epoch = ++nowEpoch.current;nowController.current?.abort();
    const controller = new AbortController();nowController.current = controller;
    setNowSources({ requested: true, items: [], sourceStates: [], loading: true, error: false });
    import("../../lib/research/systemFeedPublicSources2029.js")
      .then(({ fetchSystemFeedPublicSources2029 }) => fetchSystemFeedPublicSources2029({ signal: controller.signal }))
      .then(result => { if (epoch === nowEpoch.current && !controller.signal.aborted) setNowSources({ ...result, requested: true, loading: false, error: false }); })
      .catch(() => { if (epoch === nowEpoch.current && !controller.signal.aborted) setNowSources({ requested: true, items: [], sourceStates: [], loading: false, error: true }); })
      .finally(() => { if (epoch === nowEpoch.current) nowPending.current = false; });
  }, []);
  const requestNowDetails = useCallback(() => { if (!requestedNow.current) { requestedNow.current = true;refreshNowDetails(); } }, [refreshNowDetails]);
  useEffect(() => () => { nowEpoch.current += 1;nowController.current?.abort(); }, []);


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
          if (streamResults.current++ > 0 && requestedNow.current) refreshNowDetails();
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
  }, [enabled, refreshNowDetails]);

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

  const items = useMemo(() => mergeSystemFeedItems(state.items, nowSources.items), [state.items, nowSources.items]);
  const rows = useMemo(() => feedRows(items, { seen, strongIds }), [items, seen, strongIds]);
  const expandedRows = useMemo(() => feedRows(items, { seen, strongIds, limit: 160,
    caps: { group: 40, post: 40, convergence: 40, finding: 12, gallery: 10,
      ...Object.fromEntries(nowSources.items.filter(item => item.channel).map(item => [`channel:${item.channel}`, 12])) },
  }), [items, seen, strongIds, nowSources.items]);
  const newCount = rows.filter((row) => row.isNew).length;
  const newest = rows.filter((row) => row.isNew).map((row) => row.at).filter(Boolean).sort().reverse()[0] || null;
  const see = useCallback((row) => setSeen((current) => (current[feedSeenKey(row.item)] ? current : markSeen(feedSeenKey(row.item), current))), []);
  return { ...state, items, rows, expandedRows, nowSources, requestNowDetails, refreshNowDetails, newCount, newest, see };
}
