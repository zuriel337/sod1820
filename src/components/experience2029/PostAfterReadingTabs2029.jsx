import React, { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import "./postAfterReadingTabs2029.css";

// One post-ending disclosure menu. The destinations reuse the existing Post
// connections, convergence and source readers; there is no new graph or shell.
// Do not make these tabs persistent mobile chrome.
export const POST_DISCOVERY_TABS_2029 = Object.freeze([
  { id: "connections", label: "קשרים", heading: "לאן הסיפור ממשיך" },
  { id: "meeting", label: "מפגש", heading: "התכנסויות ועומק ההקשר" },
  { id: "sources", label: "מקורות", heading: "לראות את המקור המדויק" },
]);

export function discoveryTabFromHash2029(hash) {
  if (hash === "#post-discovery-meeting") return "meeting";
  if (hash === "#post-discovery-sources" || hash === "#post-sources") return "sources";
  if (hash === "#post-connections" || hash === "#source-region-post-connections") return "connections";
  return null;
}

export default function PostAfterReadingTabs2029({ postId, connections, meeting, sources }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [active, setActive] = useState(() => discoveryTabFromHash2029(location.hash) || "connections");
  useEffect(() => {
    const tab = discoveryTabFromHash2029(location.hash);
    if (tab) setActive(tab);
  }, [location.hash, postId]);

  const select = (next, focus = false) => {
    if (!POST_DISCOVERY_TABS_2029.some((tab) => tab.id === next)) return;
    setActive(next);
    navigate({ pathname: location.pathname, search: location.search, hash: "#post-discovery-" + next },
      { replace: true, state: location.state });
    if (focus) document.getElementById("post-discovery-tab-" + next)?.focus({ preventScroll: true });
  };
  const onKeyDown = (event) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    event.preventDefault();
    const index = POST_DISCOVERY_TABS_2029.findIndex((x) => x.id === active);
    const last = POST_DISCOVERY_TABS_2029.length - 1;
    const next = event.key === "Home" ? 0 : event.key === "End" ? last
      : (index + (event.key === "ArrowLeft" ? 1 : -1) + POST_DISCOVERY_TABS_2029.length) % POST_DISCOVERY_TABS_2029.length;
    select(POST_DISCOVERY_TABS_2029[next].id, true);
  };
  // A hash link from the Companion/mobile sheet opens the exact Post panel.
  // Do not touch unrelated source-region and update hashes.
  useEffect(() => {
    const tab = discoveryTabFromHash2029(location.hash);
    if (!tab) return undefined;
    let frame = requestAnimationFrame(() => {
      const anchor = document.getElementById("post-discovery-" + tab);
      anchor?.scrollIntoView?.({ block: "start", behavior: "auto" });
    });
    return () => cancelAnimationFrame(frame);
  }, [location.hash, active, postId]);
  const selected = POST_DISCOVERY_TABS_2029.find((item) => item.id === active) || POST_DISCOVERY_TABS_2029[0];
  const body = selected.id === "connections" ? connections
    : selected.id === "meeting" ? meeting : sources;

  return <section className="sod29-post-discovery" data-post-discovery="one-tree" aria-label="העמקה אחרי הפוסט">
    <header className="sod29-post-discovery-head">
      <h2>להמשיך מהסיפור אל העץ</h2>
      <p>אותו מקור, שלוש דרכי התבוננות. בוחרים כיוון ונשארים באותו פוסט.</p>
    </header>
    <div className="sod29-post-discovery-tabs" role="tablist" aria-label="קשרים, מפגש ומקורות" onKeyDown={onKeyDown}>
      {POST_DISCOVERY_TABS_2029.map((tab) => <button key={tab.id}
        type="button" role="tab" id={"post-discovery-tab-" + tab.id}
        aria-selected={active === tab.id} aria-controls="post-discovery-panel"
        tabIndex={active === tab.id ? 0 : -1} onClick={() => select(tab.id)}>
        <span id={"post-discovery-" + tab.id}>{tab.label}</span>
      </button>)}
    </div>
    <div id="post-discovery-panel" role="tabpanel" tabIndex={0}
      aria-labelledby={"post-discovery-tab-" + selected.id}
      className="sod29-post-discovery-panel" data-selected-discovery={selected.id}>
      <h3 className="sod29-post-discovery-panel-heading">{selected.heading}</h3>
      {body || <p className="sod29-post-discovery-no-data">אין כעת חומר מאושר להצגה במסלול הזה.</p>}
    </div>
  </section>;
}
