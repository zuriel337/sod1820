import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import CommunityLive2029 from "../components/community2029/CommunityLive2029.jsx";
import LegacyOpenWebChat2029 from "../components/community2029/LegacyOpenWebChat2029.jsx";

function HistoricalForumDiscussions() {
  const [open, setOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState(null);
  useEffect(() => {
    if (!open) return undefined;
    const controller = new AbortController();
    setResult(null);
    import("../lib/publicContinuityReaders2029.js")
      .then(({ loadPublicForumIndexPage2029 }) => loadPublicForumIndexPage2029(page, { signal: controller.signal }))
      .then(data => { if (!controller.signal.aborted) setResult(data); })
      .catch(() => { if (!controller.signal.aborted) setResult({ error: true }); });
    return () => controller.abort();
  }, [open, page, attempt]);
  return <details className="sod29-section" onToggle={event => setOpen(event.currentTarget.open)}>
    <summary>דיונים מארכיון הפורום</summary>
    {open && (!result ? <p role="status">טוען דיונים…</p> : result.error
      ? <button type="button" onClick={() => setAttempt(value => value + 1)}>ניסיון נוסף</button>
      : <>
        {result.items.length ? <ul>{result.items.map(item => <li key={item.id}><Link to={item.href}>{item.title}</Link></li>)}</ul> : <p>אין דיונים זמינים בעמוד זה.</p>}
        {page > 1 && <button type="button" onClick={() => setPage(value => value - 1)}>לעמוד הקודם</button>}
        {result.hasMore && <button type="button" onClick={() => setPage(value => value + 1)}>לעמוד הבא</button>}
      </>)}
  </details>;
}

export default function CommunityChatTransition2029Page() {
  return <CommunityLive2029
    canonicalPath="/community/chat"
    compactFeed
    deferFeedUntilVisible
    leadingContent={<LegacyOpenWebChat2029 autoOpen first />}
    trailingContent={<HistoricalForumDiscussions />}
  />;
}
