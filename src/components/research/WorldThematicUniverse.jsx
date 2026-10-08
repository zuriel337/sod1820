import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { FrameState } from "../experience2029/Sod2029Shell.jsx";
import {
  WORLD_THEMES,
  WORLD_THEME_ALL,
  buildWorldThematicUniverse,
  createRequestGuard,
  fetchWorldThemeCounts,
  fetchWorldThemePosts,
  fetchWorldThemeTopics,
} from "../../lib/research/worldThematicUniverse.js";
import "./worldThematicUniverse.css";

const dateLabel = (iso) => (iso ? new Date(iso).toLocaleDateString("he-IL") : null);
const THEME_PARAM = "theme";

function initialTheme() {
  try {
    const value = new URLSearchParams(window.location.search).get(THEME_PARAM);
    return WORLD_THEMES.some((t) => t.key === value) ? value : WORLD_THEME_ALL;
  } catch (_) { return WORLD_THEME_ALL; }
}

// One spatial discovery surface: the focused theme drives BOTH source works (source-side paginated)
// and the approved Topic lane. Writer is a contextual lens over the loaded works, never a separate world.
export default function WorldThematicUniverse({ children = null }) {
  const [theme, setThemeState] = useState(initialTheme);
  const [writer, setWriter] = useState(WORLD_THEME_ALL);
  const [feed, setFeed] = useState({ loading: true, loadingMore: false, error: null, posts: [], total: null, hasMore: false });
  const [counts, setCounts] = useState(null);
  const [writerOptions, setWriterOptions] = useState([]);
  const guard = useRef(null);
  if (!guard.current) guard.current = createRequestGuard();
  const [topics, setTopics] = useState({ loading: true, error: null, rows: [] });

  const setTheme = useCallback((next) => {
    setThemeState(next);
    setWriter(WORLD_THEME_ALL);
    setWriterOptions([]);
    try { // exact return: browser back/refresh/share lands on the same focused theme
      const url = new URL(window.location.href);
      if (next === WORLD_THEME_ALL) url.searchParams.delete(THEME_PARAM); else url.searchParams.set(THEME_PARAM, next);
      window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
    } catch (_) { /* URL sync is a convenience only */ }
  }, []);

  useEffect(() => {
    let alive = true;
    fetchWorldThemeCounts().then((c) => alive && setCounts(c)).catch(() => alive && setCounts(null));
    fetchWorldThemeTopics().then((rows) => alive && setTopics({ loading: false, error: null, rows }))
      .catch((error) => alive && setTopics({ loading: false, error, rows: [] }));
    return () => { alive = false; };
  }, []);

  const rememberWriters = (posts) => setWriterOptions((prev) => {
    const names = new Set(prev);
    posts.forEach((p) => { const a = p?.author ? String(p.author).trim() : ""; if (a) names.add(a); });
    return [...names].sort();
  });

  // Theme/writer change starts a new request generation; any older page resolving later is dropped.
  useEffect(() => {
    const token = guard.current.next();
    setFeed({ loading: true, loadingMore: false, error: null, posts: [], total: null, hasMore: false });
    fetchWorldThemePosts({ theme, offset: 0, author: writer })
      .then((page) => {
        if (!guard.current.isCurrent(token)) return;
        rememberWriters(page.posts);
        setFeed({ loading: false, loadingMore: false, error: null, posts: page.posts, total: page.total, hasMore: page.hasMore });
      })
      .catch((error) => guard.current.isCurrent(token) && setFeed((prev) => ({ ...prev, loading: false, error })));
    return () => { guard.current.next(); };
  }, [theme, writer]);

  const loadMore = async () => {
    if (feed.loadingMore || !feed.hasMore) return;
    const token = guard.current.next(); // reserve: only this request may append
    setFeed((prev) => ({ ...prev, loadingMore: true, error: null }));
    try {
      const page = await fetchWorldThemePosts({ theme, offset: feed.posts.length, author: writer });
      if (!guard.current.isCurrent(token)) return;
      rememberWriters(page.posts);
      setFeed((prev) => ({ ...prev, loadingMore: false, posts: [...prev.posts, ...page.posts], total: page.total ?? prev.total, hasMore: page.hasMore }));
    } catch (error) {
      if (guard.current.isCurrent(token)) setFeed((prev) => ({ ...prev, loadingMore: false, error }));
    }
  };

  const universe = useMemo(
    () => buildWorldThematicUniverse(
      { posts: feed.posts, topics: topics.rows, page: { total: feed.total, hasMore: feed.hasMore } },
      { theme, writer: WORLD_THEME_ALL }, // writer is applied server-side over all eligible posts
    ),
    [feed.posts, feed.total, feed.hasMore, topics.rows, theme],
  );
  const { bounds } = universe;
  const activeTheme = WORLD_THEMES.find((t) => t.key === theme) || null;

  return <section className="sod29-section wtu" id="world-themes" aria-label="עולם נושאים">
    <div className="wtu-chips" role="group" aria-label="נושאים">
      {[{ key: WORLD_THEME_ALL, label: "כל יצירות המקור" }, ...WORLD_THEMES].map((t) => {
        const count = counts?.[t.key];
        return <button type="button" key={t.key} className={`wtu-chip${theme === t.key ? " is-active" : ""}`} aria-pressed={theme === t.key} onClick={() => setTheme(t.key)}>
          {t.label}{count != null ? <span className="wtu-count">{count}</span> : null}
        </button>;
      })}
    </div>
    {activeTheme ? <p className="wtu-hint">{activeTheme.hint}</p> : null}
    {writerOptions.length > 1 || writer !== WORLD_THEME_ALL ? <label className="wtu-writer">
      <span>זווית מקור (סינון על כל היצירות הפתוחות)</span>
      <select value={writer} onChange={(e) => setWriter(e.target.value)}>
        <option value={WORLD_THEME_ALL}>כולם</option>
        {writerOptions.map((w) => <option key={w} value={w}>{w}</option>)}
      </select>
    </label> : null}

    <div className="wtu-space">
      <div className="wtu-lane-block">
        <h3 className="wtu-lane">יצירות מקור</h3>
        {feed.loading ? <FrameState kind="loading" title="פותח את הנושא">טוען יצירות מקור לפי הנושא.</FrameState> : null}
        {feed.error && !feed.posts.length ? <FrameState kind="unavailable" title="הנושא לא נטען כרגע">לא נחליף חומר חסר בחומר מומצא.</FrameState> : null}
        {!feed.loading && !feed.error && !universe.sourceWorks.length ? <FrameState kind="empty" title="אין כרגע יצירות פתוחות בנושא הזה">{bounds.hasMore ? "אפשר לטעון עוד." : "אפשר לבחור ״הכול״."}</FrameState> : null}
        {universe.sourceWorks.length ? <ul className="wtu-grid">
          {universe.sourceWorks.map((w) => <li key={w.id}>
            <Link className="wtu-card" to={w.href} data-source-ref={w.sourceRef}>
              <span className="wtu-meta">{[w.writer, dateLabel(w.at)].filter(Boolean).join(" · ")}</span>
              <strong>{w.label}</strong>
              {w.summary ? <small>{w.summary}</small> : null}
            </Link>
          </li>)}
        </ul> : null}
        {!feed.loading ? <p className="wtu-bounds" role="status">
          {bounds.totalKnown ? `מוצגות ${bounds.loaded} מתוך ${bounds.total} יצירות בנושא` : `נטענו ${bounds.loaded} יצירות; היקף הנושא המלא אינו ידוע`}
          {Object.keys(universe.excluded).length ? ` · ${Object.values(universe.excluded).reduce((a, b) => a + b, 0)} לא הוצגו (הרשאה/מקור)` : ""}
        </p> : null}
        {feed.error && feed.posts.length ? <p className="wtu-bounds">טעינת העמוד הבא נכשלה. מה שכבר נטען נשאר.</p> : null}
        {bounds.hasMore ? <button type="button" className="wtu-more" disabled={feed.loadingMore} onClick={loadMore}>{feed.loadingMore ? "טוען…" : "טען עוד יצירות"}</button> : null}
      </div>

      <aside className="wtu-lane-block wtu-topics" aria-label="התכנסויות מאושרות">
        <h3 className="wtu-lane">התכנסויות מאושרות</h3>
        {universe.topicRelation === "none_attested" ? <p className="wtu-hint">אין עדיין קשר מאושר בין התכנסויות לנושא זה. מקור הקטגוריה אינו יוצר קשר. להלן המלצות כלליות מהקטלוג — לא מקושרות לנושא.</p> : null}
        {topics.error ? <FrameState kind="unavailable" title="ההתכנסויות לא נטענו">לא נחליף חומר חסר.</FrameState> : null}
        {universe.convergences.length ? <ul className="wtu-grid wtu-grid-compact">
          {universe.convergences.slice(0, 8).map((c) => <li key={c.id}>
            <Link className="wtu-card is-convergence" to={c.href} data-source-ref={c.sourceRef}>
              <span className="wtu-meta">{[c.writer, dateLabel(c.at)].filter(Boolean).join(" · ")}</span>
              <strong>{c.label}</strong>
              {c.summary ? <small>{c.summary}</small> : null}
              {c.value != null ? <b className="wtu-value">{c.value}</b> : null}
            </Link>
          </li>)}
        </ul> : null}
        {universe.generalTopics.length ? <ul className="wtu-grid wtu-grid-compact" aria-label="המלצות כלליות — לא מקושרות לנושא">
          {universe.generalTopics.slice(0, 8).map((c) => <li key={c.id}>
            <Link className="wtu-card is-convergence is-unlinked" to={c.href} data-source-ref={c.sourceRef} data-topic-link="not_linked">
              <span className="wtu-meta">כללי · לא מקושר לנושא{c.at ? ` · ${dateLabel(c.at)}` : ""}</span>
              <strong>{c.label}</strong>
              {c.summary ? <small>{c.summary}</small> : null}
            </Link>
          </li>)}
        </ul> : null}
      </aside>
    </div>
    <p className="wtu-note">פתוח לכולם ≠ מאומת. יצירות מקור, ניתוחי AI והתכנסויות הם סוגים נפרדים; הסדר לפי זמן, לא לפי דירוג אמת.</p>
    {children}
  </section>;
}
