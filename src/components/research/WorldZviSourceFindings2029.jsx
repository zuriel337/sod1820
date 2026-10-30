import React, { useEffect, useRef, useState } from "react";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { channelUpdateOccurrenceId } from "../../lib/research/worldContributorSourceLocator.js";
import { fetchZviSourceFindingsPage } from "../../lib/research/worldZviApprovedFindings2029.js";
import ZviFindingCards2029 from "./ZviFindingCards2029.jsx";

const initial = () => ({ opened: false, loading: false, rows: [], cursor: null, hasMore: false,
  error: false, omittedUnavailable: false, omittedForReview: false, lastPage: null });
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// This is a source-scoped view of the existing public reader. It never creates
// a graph relation or infers a number from the finding, and loads only on click.
export default function WorldZviSourceFindings2029({ sourceRef, returnTo, onShowMap }) {
  const occurrenceId = channelUpdateOccurrenceId(sourceRef);
  const exactSource = occurrenceId && sourceRef === `channel_updates:${occurrenceId}` ? sourceRef : null;
  const [state, setState] = useState(initial);
  const generation = useRef(0);
  const pending = useRef(false);

  useEffect(() => {
    generation.current += 1;
    pending.current = false;
    setState(initial());
    return () => { generation.current += 1; };
  }, [exactSource]);

  async function load() {
    if (!exactSource || pending.current) return;
    pending.current = true;
    const current = generation.current;
    const cursor = state.cursor;
    setState((previous) => ({ ...previous, opened: true, loading: true, error: false }));
    try {
      const page = await fetchZviSourceFindingsPage({ client: getPublicResearchClient(), sourceRef: exactSource, cursor });
      if (current !== generation.current) return;
      if (!page || !Array.isArray(page.rows) || typeof page.hasMore !== "boolean"
        || (page.hasMore && !page.nextCursor)) throw new Error("invalid_source_page");
      const rows = page.rows.filter((row) => UUID.test(String(row?.id || ""))
        && row.sourceRef === exactSource && row.findingHref === `/world?finding=${row.id}`);
      const pageIds = new Set();
      const pageRows = rows.filter((row) => {
        if (pageIds.has(row.id)) return false;
        pageIds.add(row.id);
        return true;
      });
      setState((previous) => {
        const known = new Set(previous.rows.map((row) => row.id));
        const additions = pageRows.filter((row) => {
          if (known.has(row.id)) return false;
          known.add(row.id);
          return true;
        });
        return { ...previous, loading: false, rows: [...previous.rows, ...additions],
          cursor: page.nextCursor, hasMore: page.hasMore, error: false,
          omittedUnavailable: previous.omittedUnavailable || page.omittedUnavailable,
          omittedForReview: previous.omittedForReview || page.omittedForReview || rows.length !== page.rows.length,
          lastPage: { ...page, rows: pageRows, omittedForReview: Boolean(page.omittedForReview || rows.length !== page.rows.length) } };
      });
    } catch {
      if (current === generation.current) setState((previous) => ({ ...previous, loading: false, error: true }));
    } finally {
      if (current === generation.current) pending.current = false;
    }
  }

  if (!exactSource) return null;
  return <section className="zvi-research" aria-label="ממצאים במקור" style={{ display: "grid", gap: 8, minWidth: 0 }}>
    {!state.opened ? <button className="sod29-action" type="button" onClick={load}
      style={{ minHeight: 44 }}>ממצאים במקור</button> : null}
    {state.loading ? <span role="status">טוען ממצאים מהמקור…</span> : null}
    {state.error ? <span role="status">לא הצלחנו לטעון את הממצאים. אפשר לנסות שוב.</span> : null}
    {state.omittedUnavailable ? <span role="status">חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.</span> : null}
    {state.omittedForReview ? <span role="status">חלק מהחומר ממתין לעיון.</span> : null}
    {state.opened && !state.loading && !state.error && !state.rows.length && !state.hasMore
      && !state.omittedUnavailable && !state.omittedForReview
      ? <span role="status">לא נמצאו ממצאים ציבוריים במקור שנקרא.</span> : null}
    {state.rows.length ? <ZviFindingCards2029 rows={state.rows} returnTo={returnTo} showSource={false} singleColumn /> : null}
    {!state.loading && (state.lastPage?.rows.length || 0) > 0 && typeof onShowMap === "function" ? <button className="sod29-action" type="button"
      onClick={() => onShowMap({ sourceRef: exactSource, page: state.lastPage })} style={{ minHeight: 44 }}>
      הצג במפת העולם
    </button> : null}
    {state.opened && !state.loading && (state.hasMore || state.error)
      ? <button className="sod29-action" type="button" onClick={load} style={{ minHeight: 44 }}>
        {state.error ? "נסה שוב" : "עוד ממצאים במקור"}
      </button> : null}
  </section>;
}
