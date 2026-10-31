import React, { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";

// Technical consumer of the existing public number lens; no author-specific
// finding list, new reader, scoring, graph relation or publication decision.
const NumberResearch = React.lazy(() => import("../number2029/NumberZviPublicResearch2029.jsx"));
const PAGE = 6;
const sectionId = "topic-number-research";
const numberId = (value) => `${sectionId}-${value}`;

export default function TopicNumberResearch2029({ projection }) {
  const location = useLocation();
  const navigate = useNavigate();
  const research = useResearch();
  const numbers = useMemo(() => [...new Set([
    ...(projection?.highlightNumbers || []), ...(projection?.numbers || []),
  ].filter((value) => Number.isSafeInteger(value) && value >= 0))], [projection?.slug, projection?.highlightNumbers, projection?.numbers]);
  const requested = /^#topic-number-research-(\d+)$/.exec(location.hash);
  const requestedValue = requested ? Number(requested[1]) : null;
  const initial = requestedValue != null && numbers.includes(requestedValue) ? requestedValue : null;
  const requestedIndex = numbers.indexOf(initial);
  const [expanded, setExpanded] = useState(initial);
  const [shown, setShown] = useState(Math.max(PAGE, requestedIndex + 1));
  const topicRef = useRef(projection?.slug);

  useEffect(() => {
    setExpanded(initial);
    const changedTopic = topicRef.current !== projection?.slug;
    topicRef.current = projection?.slug;
    setShown((previous) => Math.max(changedTopic ? PAGE : previous, PAGE, requestedIndex + 1));
  }, [projection?.slug, location.hash, requestedIndex]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!projection?.canonicalPath || projection.withheld || !numbers.length) return null;

  const toggle = (event, value) => {
    if (event.currentTarget.open) {
      setExpanded(value);
      const href = `${location.pathname}${location.search}#${numberId(value)}`;
      if (location.hash !== `#${numberId(value)}`) navigate(href, { replace: true });
    } else if (expanded === value) {
      setExpanded(null);
      if (location.hash === `#${numberId(value)}`) navigate(`${location.pathname}${location.search}`, { replace: true });
    }
  };

  const rememberOrigin = (event, value) => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey || event.defaultPrevented) return;
    const anchor = event.target.closest?.("a[href]");
    if (!anchor || !event.currentTarget.contains(anchor)) return;
    const destination = new URL(anchor.href, window.location.href);
    if (destination.origin !== window.location.origin || destination.pathname !== "/world") return;
    const locator = `#${numberId(value)}`;
    const href = `${location.pathname}${location.search}${locator}`;
    research.updateResearchContext?.({ returnTo: {
      href, label: projection.title,
      subject: { id: projection.slug, type: "topic", label: projection.title, href: projection.canonicalPath },
      selection: { entityId: projection.slug, entityType: "topic", sourceRef: projection.sourceRef, locator },
      lens: "topic",
      dimensions: { ...(research.context?.dimensions || {}), activeSectionId: sectionId,
        topicNumberLens: value, topicFindingPath: "shared-number-not-direct-topic-relation" },
      journey: research.context?.journey || null,
    } });
  };

  return <section id={sectionId} className="sod29-section sod29-topic-section" aria-label="ממצאים דרך המספר">
    <div className="sod29-section-head"><div><div className="sod29-kicker">עוד חומר למחקר</div><h2>ממצאים דרך המספר</h2></div></div>
    <p>אפשר לחקור ממצאים שבהם מופיע אחד ממספרי הטופיק. זהו מסלול דרך המספר, ולא קשר ישיר מתועד בין הממצא לנושא.</p>
    <p className="sod29-muted">החיפוש כולל ממצאים ציבוריים ממקורות שונים, ככל שעברו בדיקת תצוגה ומקור. מקור וסטטוס נשמרים בכל ממצא; חומר שטרם הותר להצגה אינו נכלל.</p>
    {numbers.slice(0, shown).map((value) => <details key={`${projection.slug}:${value}`} id={numberId(value)}
      className="sod29-topic-depth-equations" open={expanded === value} onToggle={(event) => toggle(event, value)}>
      <summary>מחקר דרך המספר {value}</summary>
      {expanded === value ? <div onClickCapture={(event) => rememberOrigin(event, value)}>
        <React.Suspense fallback={<p role="status">פותח את מסלול המחקר…</p>}>
          <NumberResearch key={`${projection.slug}:${value}`} value={value} />
        </React.Suspense>
      </div> : null}
    </details>)}
    {numbers.length > shown ? <button type="button" className="sod29-action" onClick={() => setShown((value) => value + PAGE)}>
      עוד מספרים בטופיק ({numbers.length - shown})
    </button> : null}
  </section>;
}
