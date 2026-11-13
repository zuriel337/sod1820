// One watcher of the EXISTING world discovery stream for the whole frame (panel, phone chip). Visibility-bound polling
// is owned by watchWorldDiscoveryStream. Tiers (Gold/Diamond) are read lazily for the first three convergences.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { feedRows, feedSeenKey, mergeNowDiscussionItems, mergeSystemFeedItems } from "../../lib/systemFeed2029.js";
import { readSeen, markSeen } from "../../lib/homeMotion2029.js";
import { tierLookupNumbers } from "../../lib/ratings2029.js";
import { fetchNumberTierSignals } from "../../lib/research/numberTierSignals.js";

// `homeStrip`: the Home "עדכונים אחרונים" strip needs the same public details once (reality-stream images, channel updates, series
// Posts). It loads them ONCE after mount; only an open Now panel keeps re-reading them on every poll.
const DETAILS_FRESH_MS = 60 * 1000;
export function useSystemFeed2029({ enabled = true, nowOpen = false, homeStrip = false } = {}) {
  const [state, setState] = useState({ loading: true, items: [], error: false, unavailableSources: [], groupArrivals: null });
  const [seen, setSeen] = useState(readSeen);
  const [strongIds, setStrongIds] = useState({});
  const asked = useRef(new Set());
  const nowActive = useRef(false);
  nowActive.current = enabled && nowOpen;
  const detailsWanted = useRef(false);
  detailsWanted.current = enabled && (nowOpen || homeStrip);
  const nowEpoch = useRef(0), nowController = useRef(null), nowPending = useRef(false), streamResults = useRef(0);
  const [nowSources, setNowSources] = useState({ requested: false, loading: false, items: [], sourceStates: [], error: false });
  const detailsAt = useRef(0), detailsFromHome = useRef(false);
  // `force` (retry buttons, poll refresh while Now is open) always re-reads. The ONLY reuse: the first time Now opens after the Home strip
  // loaded the details less than a minute ago (one read instead of two); closing and reopening Now re-reads exactly as before.
  const loadNowDetails = useCallback((force) => {
    if (!detailsWanted.current || nowPending.current) return;
    if (!force && detailsFromHome.current && Date.now() - detailsAt.current < DETAILS_FRESH_MS) return;
    detailsFromHome.current = !nowActive.current;
    nowPending.current = true;
    const epoch = ++nowEpoch.current;nowController.current?.abort();
    const controller = new AbortController();nowController.current = controller;
    setNowSources(current => ({ ...current, requested: true, loading: true, error: false }));
    import("../../lib/research/systemFeedPublicSources2029.js")
      .then(({ fetchSystemFeedPublicSources2029 }) => {
        // Closing while the chunk is still loading must not start a detached read.
        if (epoch !== nowEpoch.current || !detailsWanted.current || controller.signal.aborted) { controller.abort(); return null; }
        return fetchSystemFeedPublicSources2029({ signal: controller.signal });
      })
      .then(result => { if (epoch === nowEpoch.current && !controller.signal.aborted) { detailsAt.current = Date.now(); setNowSources({ ...result, requested: true, loading: false, error: false }); } })
      .catch(() => { if (epoch === nowEpoch.current && !controller.signal.aborted) setNowSources({ requested: true, items: [], sourceStates: [], loading: false, error: true }); })
      .finally(() => { if (epoch === nowEpoch.current) nowPending.current = false; });
  }, []);
  // Closing Now consumes the Home-loaded details: a later reopen re-reads exactly as before.
  useEffect(() => { if (!nowOpen) return undefined; return () => { detailsFromHome.current = false; }; }, [nowOpen]);
  const refreshNowDetails = useCallback(() => loadNowDetails(true), [loadNowDetails]);
  const requestNowDetails = useCallback(() => loadNowDetails(false), [loadNowDetails]);
  useEffect(() => {
    if (enabled && (nowOpen || homeStrip)) loadNowDetails(false);
    else setNowSources(current => current.loading ? { ...current, loading: false } : current);
    return () => {
      nowEpoch.current += 1;
      nowController.current?.abort();
      nowPending.current = false;
    };
  }, [enabled, nowOpen, homeStrip, loadNowDetails]);


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
          if (streamResults.current++ > 0 && nowActive.current) refreshNowDetails();
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

  // The featured Post's whole message (ZURIEL 8.11.2026) is ONE more item of this same feed: identity `post:<id>`, listed first so it is the
  // single enriched row even if the stream also carries that Post. Read once (shared with Home); nothing here reads anything else.
  const [featuredItem, setFeaturedItem] = useState(null);
  useEffect(() => {
    if (!enabled) return undefined;
    let live = true;
    Promise.all([import("../../lib/research/homeFeaturedPost2029.js"), import("../../lib/research/worldDiscoveryStream.js")])
      .then(([featured, stream]) => featured.getFeaturedPostRow2029().then(row => featured.featuredFeedItem(row, stream.postRowToWorldUpdate)))
      .then(item => { if (live) setFeaturedItem(item); }).catch(() => { if (live) setFeaturedItem(null); });
    return () => { live = false; };
  }, [enabled]);
  const items = useMemo(() => mergeSystemFeedItems(featuredItem ? [featuredItem] : [], mergeNowDiscussionItems(state.items, nowSources.items)), [featuredItem, state.items, nowSources.items]);
  const rows = useMemo(() => feedRows(items, { seen, strongIds }), [items, seen, strongIds]);
  const expandedRows = useMemo(() => feedRows(items, { seen, strongIds, limit: 160,
    caps: { group: 40, post: 40, convergence: 40, finding: 12, gallery: 10,
      ...Object.fromEntries(nowSources.items.filter(item => item.channel).map(item => [`channel:${item.channel}`, 12])) },
  }), [items, seen, strongIds, nowSources.items]);
  const newCount = rows.filter((row) => row.isNew).length;
  const newest = rows.filter((row) => row.isNew).map((row) => row.at).filter(Boolean).sort().reverse()[0] || null;
  const see = useCallback((row) => setSeen((current) => (current[feedSeenKey(row.item)] ? current : markSeen(feedSeenKey(row.item), current))), []);
  // The Home strip waits for the details read it asked for (settled = loaded or failed), so it never flashes empty between stages.
  const detailsPending = enabled && homeStrip && !nowOpen && (!nowSources.requested || nowSources.loading);
  return { ...state, items, rows, expandedRows, nowSources, detailsPending, requestNowDetails, refreshNowDetails, newCount, newest, see };
}
