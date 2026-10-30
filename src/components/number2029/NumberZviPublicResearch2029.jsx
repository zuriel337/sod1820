import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { channelUpdateOccurrenceId } from "../../lib/research/worldContributorSourceLocator.js";
import ZviFindingCards2029 from "../research/ZviFindingCards2029.jsx";
import "../research/WorldZviApprovedFindings2029.css";

// Reuse the existing anonymous World reader. Neither its module nor its network
// request is loaded until the visitor explicitly asks to see these findings.
const defaultReader = async (args) => {
  const { fetchZviNumberFindingsPage } = await import("../../lib/research/worldZviApprovedFindings2029.js");
  return fetchZviNumberFindingsPage(args);
};
const emptyState = () => ({
  opened: false, loading: false, rows: [], cursor: null,
  hasMore: false, error: false, omittedUnavailable: false, omittedForReview: false,
});
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function validFindingHref(href, id) {
  if (typeof href !== "string" || !href.startsWith("/world?")) return false;
  try {
    const url = new URL(href, "https://example.invalid");
    return url.origin === "https://example.invalid"
      && url.pathname === "/world"
      && UUID.test(id || "")
      && url.searchParams.get("finding") === id
      && [...url.searchParams.keys()].every((key) => key === "finding")
      && url.searchParams.getAll("finding").length === 1
      && !url.hash;
  } catch { return false; }
}

export function validSourceHref(href) {
  if (typeof href !== "string" || !href.startsWith("/world?")) return false;
  try {
    const url = new URL(href, "https://example.invalid");
    const sourceRef = url.searchParams.get("sourceRef");
    const occurrenceId = channelUpdateOccurrenceId(sourceRef);
    return url.origin === "https://example.invalid" && url.pathname === "/world"
      && url.searchParams.get("view") === "sources" && url.searchParams.get("source") === "tzvi-opoc"
      && [...url.searchParams.keys()].every((key) => ["view", "source", "sourceRef"].includes(key))
      && ["view", "source", "sourceRef"].every((key) => url.searchParams.getAll(key).length === 1)
      && Boolean(occurrenceId) && sourceRef === `channel_updates:${occurrenceId}`
      && url.hash === `#source-occurrence-${occurrenceId}`;
  } catch { return false; }
}

/**
 * A source-value lens on the existing public research, not a tree or engine.
 * The reader validates exact number, source, publication and review status.
 */
export default function NumberZviPublicResearch2029({
  value,
  reader = defaultReader,
  clientFactory = getPublicResearchClient,
}) {
  const location = useLocation();
  const [state, setState] = useState(emptyState);
  const epoch = useRef(0);
  const pending = useRef(null);
  const currentValue = useRef(value);
  currentValue.current = value;
  const validValue = Number.isSafeInteger(value) && value >= 0;

  useEffect(() => {
    epoch.current += 1;
    pending.current = null;
    setState(emptyState());
    return () => {
      epoch.current += 1;
      pending.current = null;
    };
  }, [value]);

  async function load() {
    if (!validValue || pending.current !== null) return;
    const requestedValue = value;
    const token = ++epoch.current;
    pending.current = token;
    const cursor = state.cursor;
    setState((previous) => ({ ...previous, opened: true, loading: true, error: false }));
    try {
      const page = await reader({ client: clientFactory(), value: requestedValue, cursor });
      if (epoch.current !== token || currentValue.current !== requestedValue) return;
      if (!page || !Array.isArray(page.rows) || (page.hasMore && !page.nextCursor)) {
        throw new Error("invalid_public_number_page");
      }
      const rows = page.rows.filter((row) => {
        const status = row?.publicationState ?? row?.status;
        return ["approved", "canonical"].includes(status)
          && (!row?.status || row.status === status)
          && (!row?.publicationState || row.publicationState === status)
          && (row?.privacy_scope == null || row.privacy_scope === "public")
          && row?.claimedNumber === requestedValue
          && validFindingHref(row?.findingHref, row?.id);
      });
      setState((previous) => {
        const seen = new Set(previous.rows.map((row) => row.id));
        const fresh = rows.filter((row) => {
          if (!row?.id || seen.has(row.id)) return false;
          seen.add(row.id);
          return true;
        });
        return {
          ...previous,
          loading: false,
          rows: [...previous.rows, ...fresh],
          cursor: page.nextCursor || null,
          hasMore: page.hasMore === true,
          error: false,
          omittedUnavailable: previous.omittedUnavailable || page.omittedUnavailable === true,
          omittedForReview: previous.omittedForReview || page.omittedForReview === true || rows.length < page.rows.length,
        };
      });
    } catch {
      if (epoch.current === token && currentValue.current === requestedValue) {
        setState((previous) => ({ ...previous, loading: false, error: true }));
      }
    } finally {
      if (pending.current === token) pending.current = null;
    }
  }

  if (!validValue) return null;
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return <section className="zvi-research" aria-label="ממצאים ממקורות צבי למספר" dir="rtl">
    <header className="zvi-research__header">
      <h3 className="zvi-research__title">ממצאים ממקורות צבי</h3>
      <p className="zvi-research__intro">ממצאים שבהם מופיע המספר. המקור ומצב הבדיקה זמינים בכל ממצא.</p>
    </header>
    {!state.opened ? <button type="button" className="sod29-action zvi-research__button" onClick={load}>הצגת ממצאי צבי למספר</button> : null}
    {state.loading ? <p className="zvi-research__status" role="status">טוען ממצאים…</p> : null}
    {state.error ? <p className="zvi-research__status" role="status">הממצאים אינם זמינים כרגע. אפשר לנסות שוב.</p> : null}
    {state.omittedUnavailable ? <p className="zvi-research__status">חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.</p> : null}
    {state.omittedForReview ? <p className="zvi-research__status">חלק מהחומר ממתין לעיון.</p> : null}
    {state.opened && !state.loading && !state.error && !state.rows.length && !state.hasMore && !state.omittedUnavailable && !state.omittedForReview
      ? <p className="zvi-research__status">לא נמצאו ממצאים ציבוריים למספר זה במקורות צבי.</p> : null}
    {state.rows.length ? <ZviFindingCards2029 rows={state.rows} returnTo={returnTo}
      claimedNumber={value} sourceHrefAllowed={validSourceHref} /> : null}
    {state.opened && !state.loading && (state.hasMore || state.error)
      ? <button type="button" className="sod29-action zvi-research__button" onClick={load}>{state.error ? "נסה שוב" : "עוד ממצאים"}</button> : null}
  </section>;
}
