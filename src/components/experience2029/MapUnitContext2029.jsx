import React, { useEffect, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { mapLeadId, mapUnitReading, mapWorldHref } from "../../lib/research/mapUnitReading2029.js";
import { readMapTimeline } from "../../lib/research/mapUnitCatalog2029.js";
import { publicPostUnitHref } from "../../lib/publicPostUrls.js";
import ContextualInspector2029 from "./ContextualInspector2029.jsx";

export default function MapUnitContext2029({ context, rail = false, sheet = false, onNavigate, onFollowConnection }) {
  const location = useLocation();
  const dimensions = context?.dimensions || {};
  const reading = mapUnitReading(context.subject.id, dimensions.activeUnitRef || undefined);
  const [available, setAvailable] = useState([]);
  useEffect(() => {
    if (!reading?.id) return undefined;
    const controller = new AbortController();
    readMapTimeline(controller.signal).then(rows => {
      if (!controller.signal.aborted) setAvailable(rows);
    }).catch(() => { if (!controller.signal.aborted) setAvailable([]); });
    return () => controller.abort();
  }, [reading?.id]);
  const current = reading && available.find(row => row.postId === reading.id && row.key === reading.key);
  const related = current && available.find(row => row.postId === current.relatedPostId && row.key === current.relatedKey);
  const worldHref = related && mapWorldHref(current.postId === mapLeadId ? related.key : current.key);
  const sections = dimensions.surfaceSections || [];
  const activeId = dimensions.activeUnitRef || dimensions.activeSectionId;
  const seriesHref = dimensions.postRailSeriesHref;
  const categoryHref = dimensions.postRailCategoryHref;
  const categories = related && current.categories.filter(name => related.categories.includes(name));
  const relation = related && <li data-post-context-relation>
    <Link to={related.href} onClick={onNavigate}>{related.label}</Link>
    <p>אותה סדרה{categories.length ? ` · ${categories.join(", ")}` : ""}</p>
    <p>{current.reason}</p>
    <Link to={worldHref} onClick={onNavigate}>לקשר בעולם · {related.label}</Link>
  </li>;
  const treeLink = item => {
    const id = item.targetId || item.id;
    const precise = dimensions.postRailUnitIds?.includes(id) && publicPostUnitHref(context.subject.href, id);
    const href = precise || { pathname: location.pathname, hash: `#${encodeURIComponent(id)}` };
    return <Link to={href} state={location.state} data-context-map-item={id}
      aria-current={item.id === activeId ? "location" : undefined} onClick={onNavigate} title={item.label}>{item.label}</Link>;
  };
  const relatedPath = related?.href.split("?")[0];
  const currentPath = context.subject.href;
  const seen = new Set([relatedPath, currentPath, seriesHref].filter(Boolean));
  const findings = (dimensions.surfaceFindings || []).filter(item => {
    if (!item.href?.startsWith("/") || item.href.startsWith("//") || item.href.startsWith("/world?view=reality-map")) return false;
    const key = item.href.split(/[?#]/)[0];
    if (seen.has(key) || seen.has(item.href)) return false;
    seen.add(item.href);
    return true;
  }).slice(0, 4);

  const content = <div className="map29-post-context" dir="rtl">
    {sections.length ? <nav aria-label="בתוך הפוסט">
      <h2>בתוך הפוסט</h2>
      <ul>{sections.filter(item => item.level !== 2).map(item => {
        const children = sections.filter(child => child.parentId === item.id);
        return <li key={item.id}>{children.length ? <details open={item.id === activeId || children.some(child => child.id === activeId) || undefined}>
          <summary>{item.label}</summary><ul>{children.map(child => <li key={child.id}>{treeLink(child)}</li>)}</ul>
        </details> : treeLink(item)}</li>;
      })}</ul>
    </nav> : null}
    {relation || seriesHref || categoryHref || findings.length ? <section aria-label="המשך המחקר">
      <h2>המשך המחקר</h2>
      <ul>{relation}
        {seriesHref ? <li><Link to={seriesHref} onClick={onNavigate}>{dimensions.postRailSeriesLabel}</Link><small>סדרה</small></li> : null}
        {categoryHref ? <li><Link to={categoryHref} onClick={onNavigate}>רמזים חזקים</Link><small>קטגוריה</small></li> : null}
        {findings.map(item => <li key={item.id}>
          <Link to={item.href} onClick={event => { onNavigate?.(event); onFollowConnection?.(event, item); }}>{item.label}</Link>
          {item.reason || item.sourceLabel || item.kind ? <p>{item.reason || item.sourceLabel || item.kind}</p> : null}
        </li>)}
      </ul>
    </section> : null}
  </div>;
  return rail ? <ContextualInspector2029 className={`sod29-surface-context-rail${sheet ? " is-sheet" : ""} is-rest`}
    ariaLabel="הקשר הפוסט" contextId={context.subject.id}>{content}</ContextualInspector2029> : content;
}
