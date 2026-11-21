import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { contentSeriesKeysForPost } from "../../lib/research/contentSeries2029Identity.js";
import { publicPostOnlyFilter } from "../../lib/research/publicPostBoundary.js";
import { addedDateLabel, orderedSourceUpdates, provenUpdateForHash } from "../../lib/research/postSourceUpdates2029.js";
import { mapUnitReading, mapLeadId, mapTimelinePostIds } from "../../lib/research/mapUnitReading2029.js";
import { publicPostUnitHref } from "../../lib/publicPostUrls.js";

import "./mapUnitTimeline2029.css";

const timelineHref = "/world?view=reality-map";

// Check each named anchor at the source without downloading either article body.
async function readTimeline(signal) {
  const client = getPublicResearchClient();
  const entries = await Promise.all(mapTimelinePostIds.map(async id => {
    const unit = mapUnitReading(id);
    const proof = provenUpdateForHash(id, unit.key);
    if (!proof) return null;
    const { data, error } = await client.from("posts").select("id,slug,tags,source,link,wp_id,image_url,thumb_url")
      .eq("id", id).eq("slug", unit.slug).eq("home_hidden", false)
      .or(publicPostOnlyFilter()).like("content", '%id="' + unit.key + '"%').abortSignal(signal).maybeSingle();
    if (error) throw error;
    if (!data || ["gpt-draft", "web"].includes(data.source) || !contentSeriesKeysForPost(data).includes("reality-map")) return null;
    return { ...unit, ...proof, postId: id, label: unit.label, href: publicPostUnitHref(data, unit.key),
      cover: data.image_url || data.thumb_url || null };
  }));
  return orderedSourceUpdates(entries.filter(Boolean));
}

export default function MapUnitTimeline2029({ children }) {
  const location = useLocation();
  const selected = new URLSearchParams(location.search).get("selected");
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEntries(null);
    setError(false);
    readTimeline(controller.signal).then(rows => {
      if (!controller.signal.aborted) setEntries(rows);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [attempt]);
  useEffect(() => {
    if (!entries?.some(row => row.key === selected)) return;
    document.getElementById("map-choice-" + selected)?.focus();
  }, [entries, selected]);
  const lead = entries?.find(row => row.postId === mapLeadId);
  if (children) return children({ lead, count: lead ? entries.length - 1 : 0, timelineHref, loading: !entries && !error });
  return <section dir="rtl" className="map29-timeline" aria-label="ציר מפת המציאות">
    <Link to="/world">חזרה לעולם</Link>
    <h2>ציר מפת המציאות</h2>
    {error ? <p role="status">טעינת היחידות נכשלה. <button type="button" onClick={() => setAttempt(n => n + 1)}>ניסיון נוסף</button></p>
      : !entries ? <p role="status">טוען את היחידות…</p>
      : entries.length === 0 ? <p>אין כרגע יחידות זמינות להצגה.</p>
      : <ol aria-label="יחידות לפי מועד הוספה">{entries.map(row => <li key={row.key} data-leading={row === lead || undefined} data-map-choice={row.key}>
        <small><span className="map29-status">{row === lead ? "האירוע המוביל" : lead ? "חיבור לאירוע המוביל" : "יחידת תוכן"}</span> · נוספה לפוסט ב־<time dateTime={row.updatedAt}>{addedDateLabel(row)}</time></small>
        <h3><Link id={"map-choice-" + row.key} to={row.href} aria-current={selected === row.key ? "true" : undefined} state={{ mapWorldUnit: row.key }}>{row.label}</Link></h3>
        <p>{row.essence}</p>
        {lead && row !== lead ? <details><summary>מה מחבר ביניהם?</summary><p>{row.reason}</p><Link to={lead.href}>{lead.label}</Link></details> : null}
      </li>)}</ol>}
  </section>;
}
