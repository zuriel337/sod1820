import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { addedDateLabel, plainDayLabel } from "../../lib/research/postSourceUpdates2029.js";
import { mapLeadId } from "../../lib/research/mapUnitReading2029.js";
import { readMapTimeline } from "../../lib/research/mapUnitCatalog2029.js";
import { mapIntegrationReview } from "../../lib/research/mapIntegrationReviewStorage.js";

import "./mapUnitTimeline2029.css";

const timelineHref = "/world?view=reality-map";

export default function MapUnitTimeline2029({ children }) {
  const location = useLocation();
  const selected = new URLSearchParams(location.search).get("selected");
  const all = mapIntegrationReview && !children;
  const [entries, setEntries] = useState(null);
  const [error, setError] = useState(false);
  const [attempt, setAttempt] = useState(0);
  useEffect(() => {
    const controller = new AbortController();
    setEntries(null);
    setError(false);
    readMapTimeline(controller.signal, { all }).then(rows => {
      if (!controller.signal.aborted) setEntries(rows);
    }).catch(() => { if (!controller.signal.aborted) setError(true); });
    return () => controller.abort();
  }, [all, attempt]);
  useEffect(() => {
    if (!entries?.some(row => row.key === selected)) return;
    document.getElementById("map-choice-" + selected)?.focus();
  }, [entries, selected]);
  const lead = entries?.find(row => row.postId === mapLeadId && row.relatedKey);
  const leadConnection = lead && entries.find(row => row.postId === lead.relatedPostId && row.key === lead.relatedKey);
  if (children) return children({ lead, count: leadConnection ? 1 : 0, timelineHref, loading: !entries && !error });
  return <section dir="rtl" className="map29-timeline" aria-label="ציר מפת המציאות">
    <Link to="/world">חזרה לעולם</Link>
    <h2>ציר מפת המציאות</h2>
    {error ? <p role="status">טעינת היחידות נכשלה. <button type="button" onClick={() => setAttempt(n => n + 1)}>ניסיון נוסף</button></p>
      : !entries ? <p role="status">טוען את היחידות…</p>
      : entries.length === 0 ? <p>אין כרגע יחידות זמינות להצגה.</p>
      : <ol aria-label="יחידות לפי מועד הוספה">{entries.map(row => {
        const added = addedDateLabel(row);
        const related = row.relatedKey && entries.find(candidate => candidate.postId === row.relatedPostId && candidate.key === row.relatedKey);
        return <li key={row.key} data-leading={row === lead || undefined} data-map-choice={row.key}>
          <small><span className="map29-status">{row === lead ? "האירוע המוביל" : related && related === lead ? "חיבור לאירוע המוביל" : "יחידת תוכן"}</span>
            {added ? <> · נוספה לפוסט ב־<time dateTime={row.updatedAt}>{added}</time></> : null}</small>
          <h3><Link id={"map-choice-" + row.key} to={row.href} aria-current={selected === row.key ? "true" : undefined} state={{ mapWorldUnit: row.key }}>{row.label}</Link></h3>
          {row.essence ? <p>{row.essence}</p> : <small>{row.postTitle}</small>}
          {row.eventDate ? <p className="map29-date"><small>{row.eventLabel || "האירוע"} · <time dateTime={row.eventDate}>{plainDayLabel(row.eventDate)}</time></small></p> : null}
          {related && row !== lead ? <details open={selected === row.key || selected === related.key || undefined}>
            <summary>מה מחבר ביניהם?</summary><p>{row.reason}</p>
            <p className="map29-date"><small>הקשר תועד · <time dateTime={row.connectionDocumentedOn}>{plainDayLabel(row.connectionDocumentedOn)}</time></small></p>
            <Link to={related.href} state={{ mapWorldUnit: row.key }}>{related.label}</Link>
          </details> : null}
        </li>;
      })}</ol>}
  </section>;
}
