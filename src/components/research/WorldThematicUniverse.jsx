import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { FrameState, use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { timeAgoHe } from "../../lib/format.js";
import { WORLD_THEMES, WORLD_THEME_ALL, readWorldThemeSearch, fetchWorldThemeCounts, fetchWorldThemePosts } from "../../lib/research/worldThematicUniverse.js";
import "./worldThematicUniverse.css";

// A source-category lens, below current updates. Attested Topic relationships continue
// to belong to WorldSourceDepth; this component does not build a second Topic catalog.
export default function WorldThematicUniverse() {
  const shell = use2029Shell();
  const location = useLocation();
  const navigate = useNavigate();
  const { theme, writer, page } = readWorldThemeSearch(location.search);
  const host = useRef(null);
  const [armed, setArmed] = useState(false);
  const [counts, setCounts] = useState(null);
  const [writers, setWriters] = useState([]);
  const [retry, setRetry] = useState(0);
  const [feed, setFeed] = useState({ loading: true, items: [], error: null });

  useEffect(() => {
    if (!host.current || typeof IntersectionObserver === "undefined") { setArmed(true); return; }
    const observer = new IntersectionObserver((entries) => {
      if (entries.some((entry) => entry.isIntersecting)) { setArmed(true); observer.disconnect(); }
    }, { rootMargin: "400px" });
    observer.observe(host.current);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!armed) return;
    let current = true;
    fetchWorldThemeCounts().then((value) => { if (current) setCounts(value); }).catch(() => { if (current) setCounts(null); });
    return () => { current = false; };
  }, [armed]);

  useEffect(() => { setWriters([]); }, [theme]);
  useEffect(() => {
    if (!armed) return;
    let current = true;
    setFeed({ loading: true, items: [], error: null });
    fetchWorldThemePosts({ theme, writer, page }).then((value) => {
      if (!current) return;
      setFeed({ ...value, loading: false, error: null });
      setWriters((previous) => [...new Set([...previous, ...value.items.map((item) => item.writer).filter(Boolean)])].sort());
    }).catch((error) => { if (current) setFeed({ loading: false, items: [], error }); });
    return () => { current = false; }; // stale theme, writer or page responses cannot replace the current view
  }, [armed, theme, writer, page, retry]);

  const change = (patch) => {
    const next = { theme, writer, page, ...patch };
    const params = new URLSearchParams(location.search);
    for (const [key, value, empty] of [["theme", next.theme, WORLD_THEME_ALL], ["writer", next.writer, WORLD_THEME_ALL], ["sourcePage", next.page, 0]]) {
      if (value === empty) params.delete(key); else params.set(key, String(value));
    }
    setArmed(true);
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { preventScrollReset: true });
  };
  const openSource = (event, href) => {
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    shell.go(href); // existing System Frame captures the complete router URL for exact return
  };
  const writerOptions = [...new Set([...writers, ...(writer === WORLD_THEME_ALL ? [] : [writer])])].sort();

  return <section ref={host} className="sod29-section wtu" id="world-themes" aria-label="עיון לפי נושא">
    <div className="sod29-section-head"><div>
      <h2>עיון לפי נושא</h2>
      <p className="wtu-note">מקורות ופרסומים מהאתר, מעבר לעדכונים האחרונים.</p>
    </div></div>
    <div className="wtu-chips" role="group" aria-label="בחירת נושא">
      {[{ key: WORLD_THEME_ALL, label: "כל המקורות" }, ...WORLD_THEMES].map((item) => <button type="button" key={item.key}
        className={`wtu-chip${theme === item.key ? " is-active" : ""}`} aria-pressed={theme === item.key}
        onClick={() => change({ theme: item.key, writer: WORLD_THEME_ALL, page: 0 })}>
        {item.label}{counts?.[item.key] != null ? <span className="wtu-count">{counts[item.key]}</span> : null}
      </button>)}
    </div>
    {writerOptions.length ? <label className="wtu-writer">
      <span>סינון לפי כותב מהמקורות שנטענו</span>
      <select value={writer} onChange={(event) => change({ writer: event.target.value, page: 0 })}>
        <option value={WORLD_THEME_ALL}>כל הכותבים</option>
        {writerOptions.map((name) => <option key={name} value={name}>{name}</option>)}
      </select>
    </label> : null}
    {feed.loading ? <FrameState kind="loading" title="טוען מקורות">המקורות בנושא שבחרתם יופיעו כאן.</FrameState> : null}
    {feed.error ? <FrameState kind="unavailable" title="המקורות לא נטענו כרגע"><button type="button" className="wtu-more" onClick={() => setRetry((value) => value + 1)}>נסו שוב</button></FrameState> : null}
    {!feed.loading && !feed.error && !feed.items.length ? <FrameState kind="empty" title="אין מקורות להצגה בעמוד הזה">אפשר לבחור נושא אחר או לחזור לעמוד הקודם.</FrameState> : null}
    {feed.items.length ? <ul className="wtu-grid">{feed.items.map((item) => <li key={item.id}>
      <Link className="wtu-card" to={item.href} onClick={(event) => openSource(event, item.href)} data-source-ref={`posts:${item.id}`}>
        <span className="wtu-meta">{[item.writer, timeAgoHe(item.date), item.origin === "ai" ? "פרסום שנוצר בעזרת AI" : null].filter(Boolean).join(" · ")}</span>
        <strong>{item.title}</strong>
        {item.excerpt ? <small>{item.excerpt}</small> : null}
      </Link>
    </li>)}</ul> : null}
    {!feed.loading && !feed.error ? <p className="wtu-bounds" role="status">
      {feed.total == null ? `מוצגים ${feed.items.length} מקורות; ההיקף הכולל אינו ידוע` : `מוצגים ${feed.items.length} מקורות בעמוד ${page + 1}, מתוך ${feed.total} רשומות`}
    </p> : null}
    <div className="wtu-pagination">
      {page > 0 ? <button type="button" className="wtu-more" disabled={feed.loading} onClick={() => change({ page: page - 1 })}>העמוד הקודם</button> : null}
      {feed.hasMore ? <button type="button" className="wtu-more" disabled={feed.loading} onClick={() => change({ page: page + 1 })}>עוד מקורות</button> : null}
    </div>
    <p className="wtu-note">החלוקה לפי קטגוריות האתר. פרסום מקור אינו אימות של הטענות שבו.</p>
  </section>;
}
