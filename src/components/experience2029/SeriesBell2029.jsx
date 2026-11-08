// The small follow bell next to a series name on Home. It owns no follow logic: when the server can resolve the series identity
// it mounts the ONE canonical WatchButton (its existing small "mini" variant; WatchButton.jsx is byte-pinned, so it is not edited here); otherwise it shows the truthful reason as an inert bell.
// A series never falls back to a category, author or post (same rule as postFollowCandidates2029).
import React, { useEffect, useState } from "react";
import WatchButton from "../WatchButton.jsx";
import BellGlyph from "../BellGlyph.jsx";
import { useAuth } from "../../lib/AuthContext.jsx";
import { publicReadingActionsLocked } from "../../lib/publicReadingRelease2029.js";
import { fetchPostFollowTargets2029 } from "../../lib/research/postsCatalog2029Projection.js";

/** Pure: what the bell shows. `state` is the server resolver result (ready | unsupported | unavailable) or null while unknown. */
export function seriesBellView({ locked, state }) {
  if (locked) return { kind: "off", reason: "מעקב ייפתח בהמשך" };
  if (state === "ready") return { kind: "live" };
  if (state === "unsupported") return { kind: "off", reason: "עדכוני הסדרה עדיין אינם פעילים" };
  if (state === "unavailable") return { kind: "off", reason: "לא ניתן לאמת כרגע את מעקב הסדרה" };
  return { kind: "pending", reason: "בודק את מעקב הסדרה…" };
}

export default function SeriesBell2029({ seriesKey, label, source = "home_series_2029" }) {
  const { isAdmin } = useAuth();
  const locked = publicReadingActionsLocked(isAdmin);
  const [state, setState] = useState(null);
  useEffect(() => {
    if (locked) return undefined;
    let live = true;
    setState(null);
    fetchPostFollowTargets2029({ scope: { kind: "series", key: seriesKey } })
      .then(items => { if (live) setState(items.find(item => item.entityType === "series")?.state || "unavailable"); })
      .catch(() => { if (live) setState("unavailable"); });
    return () => { live = false; };
  }, [locked, seriesKey]);
  const view = seriesBellView({ locked, state });
  if (view.kind === "live") {
    return <span className="h29-bell-slot" data-home-series-bell="live"><WatchButton variant="mini" topic={`series:${seriesKey}`} source={source} noPush
      label="מעקב" followLabel="עוקבים" explainer={`עדכון באתר כשמתפרסם פוסט חדש ב${label}`} /></span>;
  }
  return <span className="h29-bell-slot"><span className="h29-bell is-off" role="img" aria-label={`${label}: ${view.reason}`} title={view.reason} data-home-series-bell={view.kind}><BellGlyph /></span></span>;
}
