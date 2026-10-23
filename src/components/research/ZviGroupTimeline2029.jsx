import React, { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import { fetchGroupSourceArrivals } from "../../lib/research/worldGroupSource.js";
import { bilingualDateLabel } from "../../lib/relativeTime2029.js";
import { readSeen, markSeen } from "../../lib/homeMotion2029.js";
import "./ZviGroupTimeline2029.css";

const PAGE = 40;
const ZVI = "tzvi-opoc";
const EMPTY = { loading: false, loadingMore: false, rows: [], oldest: null, hasMore: true, error: false };
const time = (row) => Date.parse(row?.arrivalAt || row?.at || "") || 0;

// Existing public source occurrence identity is the only stable key. A source
// without a verified Finding remains visible; no research/Topic admission check.
export function mergeZviTimelineRows(previous = [], next = []) {
  const byRef = new Map();
  for (const item of [...previous, ...next]) {
    if (item?.creatorSlug !== ZVI || item?.kind !== "source" || item?.sourceKind !== "group_message" || !item.sourceRef) continue;
    if (!byRef.has(item.sourceRef)) byRef.set(item.sourceRef, item);
  }
  return [...byRef.values()].sort((a, b) => time(b) - time(a) || String(b.id).localeCompare(String(a.id)));
}

export default function ZviGroupTimeline2029({ recentItems = [] }) {
  const location = useLocation();
  const [opened, setOpened] = useState(false);
  const [state, setState] = useState(EMPTY);
  const [search, setSearch] = useState("");
  const [seen, setSeen] = useState(readSeen);

  const load = async ({ older = false } = {}) => {
    if (state.loading || state.loadingMore || (older && !state.hasMore)) return;
    if (older) setState((v) => ({ ...v, loadingMore: true, error: false }));
    else setState((v) => ({ ...v, loading: true, error: false }));
    try {
      // Server-side proof/RLS/hold filtering and redaction, not raw WhatsApp.
      const rows = await fetchGroupSourceArrivals({ limit: PAGE, before: older ? state.oldest : null });
      const last = rows.at(-1)?.arrivalAt || null;
      setState((current) => ({
        ...current, loading: false, loadingMore: false,
        rows: mergeZviTimelineRows(older ? current.rows : [], rows),
        oldest: last && (!older || time({ arrivalAt: last }) < time({ arrivalAt: current.oldest })) ? last : current.oldest,
        hasMore: rows.length === PAGE && Boolean(last) && (!older || last !== current.oldest),
        error: false,
      }));
    } catch {
      setState((v) => ({ ...v, loading: false, loadingMore: false, error: true }));
    }
  };

  useEffect(() => {
    if (location.hash !== "#world-zvi-source-timeline" || opened) return;
    setOpened(true);
    if (!state.rows.length) void load();
  }, [location.hash]); // deliberate deep-link trigger, not an extra fetch watcher

  // This World section is lazy by user choice; the existing World watcher can
  // append newer proven occurrences without a second poller or API subscription.
  useEffect(() => {
    if (!opened) return;
    setState((v) => ({ ...v, rows: mergeZviTimelineRows(v.rows, recentItems) }));
  }, [opened, recentItems]);
  const visible = useMemo(() => {
    const q = search.trim().toLocaleLowerCase("he");
    return !q ? state.rows : state.rows.filter((row) => (row.fullText || "").toLocaleLowerCase("he").includes(q));
  }, [state.rows, search]);
  const acknowledge = (item) => {
    const key = `source:${item.id}`;
    setSeen((current) => current[key] ? current : markSeen(key, current));
  };

  return <section id="world-zvi-source-timeline" className="sod29-zvi-timeline" aria-label="כל הודעות המקור של צבי">
    <header className="sod29-zvi-timeline-head">
      <div>
        <div className="sod29-kicker">הודעות צבי · מקור חי</div>
        <h2>כל ההודעות בסדר הזמן</h2>
        <p>מהחדש לישן, גם לפני בדיקה. אפשר לקרוא ולהמשיך אחורה; שיוך לנושא אינו תנאי להצגה.</p>
      </div>
      <button type="button" className="sod29-action" aria-expanded={opened}
        onClick={() => { if (!opened && !state.rows.length) void load(); setOpened((v) => !v); }}>
        {opened ? "סגור את ההודעות" : "פתח את הודעות צבי"}
      </button>
    </header>
    {opened ? <div className="sod29-zvi-timeline-body">
      <label>חיפוש בהודעות שנטענו
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="חפש מילים בהודעות…" />
      </label>
      {state.loading ? <p role="status">טוען הודעות מהקבוצות המאושרות…</p> : null}
      {state.error ? <p role="status">לא ניתן להציג כעת חלק מההודעות. <button type="button" onClick={() => void load()}>נסה שוב</button></p> : null}
      {!state.loading && !state.error && !visible.length ? <p role="status">לא נמצאו הודעות בחומר שנטען.</p> : null}
      <div className="sod29-zvi-timeline-count">נטענו {state.rows.length} הודעות של צבי · מוצגות {visible.length}</div>
      <ol className="sod29-zvi-timeline-list">
        {visible.map((item) => {
          const isSeen = Boolean(seen[`source:${item.id}`]);
          return <li key={item.sourceRef}>
            <details onToggle={(event) => { if (event.currentTarget.open) acknowledge(item); }}>
              <summary>
                <span>{bilingualDateLabel(item.arrivalAt || item.at, "זמן לא צוין")}</span>
                <strong>{item.label}</strong>
                <small>{isSeen ? "נקראה" : "טרם נקראה"} · הודעת מקור</small>
              </summary>
              <p>{item.fullText}</p>
              <small>דברי צבי · הודעת מקור</small>
            </details>
          </li>;
        })}
      </ol>
      {!state.loading && !state.loadingMore && state.hasMore ? <button type="button" className="sod29-action"
        onClick={() => void load({ older: true })}>עוד הודעות ישנות יותר</button> : null}
      {state.loadingMore ? <p role="status">טוען הודעות קודמות…</p> : null}
      {!state.loading && !state.loadingMore && !state.hasMore && state.rows.length ? <p>הגעת לסוף ההודעות הזמינות דרך קורא המקור המאושר.</p> : null}
    </div> : null}
  </section>;
}
