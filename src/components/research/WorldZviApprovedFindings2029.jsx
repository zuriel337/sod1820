import React, { useEffect, useRef, useState } from "react";
import { useLocation } from "react-router-dom";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { fetchZviApprovedFindingsPage, fetchZviReviewedFindingsPage } from "../../lib/research/worldZviApprovedFindings2029.js";
import ZviFindingCards2029 from "./ZviFindingCards2029.jsx";
import "./WorldZviApprovedFindings2029.css";

// Each list has its own cursor, retry state and explicit visitor action.
function useFindingPages(fetchPage) {
  const [state, setState] = useState({ opened: false, loading: false, rows: [], cursor: null, hasMore: false, error: false, omittedUnavailable: false, omittedForReview: false });
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function load() {
    if (pending.current) return;
    pending.current = true;
    const cursor = state.cursor;
    setState((previous) => ({ ...previous, opened: true, loading: true, error: false }));
    try {
      const page = await fetchPage({ client: getPublicResearchClient(), cursor });
      if (!mounted.current) return;
      setState((previous) => {
        const known = new Set(previous.rows.map((row) => row.id));
        return { ...previous, loading: false, rows: [...previous.rows, ...page.rows.filter((row) => !known.has(row.id))],
          cursor: page.nextCursor, hasMore: page.hasMore, error: false,
          omittedUnavailable: previous.omittedUnavailable || page.omittedUnavailable,
          omittedForReview: previous.omittedForReview || page.omittedForReview };
      });
    } catch {
      if (mounted.current) setState((previous) => ({ ...previous, loading: false, error: true }));
    } finally {
      pending.current = false;
    }
  }

  return { state, load };
}

function FindingList({ state, load, returnTo, initialLabel, moreLabel, loadingLabel }) {
  return <>
    {!state.opened ? <button className="sod29-action zvi-research__button" type="button" onClick={load}>{initialLabel}</button> : null}
    {state.loading ? <p className="zvi-research__status" role="status">{loadingLabel}</p> : null}
    {state.error ? <p className="zvi-research__status" role="status">הממצאים אינם זמינים כרגע. אפשר לנסות שוב.</p> : null}
    {state.omittedUnavailable ? <p className="zvi-research__status">חלק מהחומר או מקורותיו אינם זמינים בתצוגה הציבורית.</p> : null}
    {state.omittedForReview ? <p className="zvi-research__status">חלק מהחומר ממתין לעיון.</p> : null}
    {state.opened && !state.loading && !state.error && !state.rows.length && !state.hasMore && !state.omittedUnavailable && !state.omittedForReview
      ? <p className="zvi-research__status">לא נמצאו ממצאים ציבוריים מאושרים במקורות אלו.</p> : null}
    {state.rows.length ? <ZviFindingCards2029 rows={state.rows} returnTo={returnTo} /> : null}
    {state.opened && !state.loading && (state.hasMore || state.error)
      ? <button className="sod29-action zvi-research__button" type="button" onClick={load}>{state.error ? "נסה שוב" : moreLabel}</button> : null}
  </>;
}

// Opening one list does not trigger the other or create a graph relation.
export default function WorldZviApprovedFindings2029() {
  const location = useLocation();
  const main = useFindingPages(fetchZviApprovedFindingsPage);
  const reviewed = useFindingPages(fetchZviReviewedFindingsPage);
  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return <section className="zvi-research" aria-label="ממצאים הקשורים למקורות צבי" dir="rtl">
    <header className="zvi-research__header">
      <span className="zvi-research__eyebrow">ספריית המחקר</span>
      <h3 className="zvi-research__title">ממצאים הקשורים למקורות צבי</h3>
      <p className="zvi-research__intro">ממצאים, שאלות ורעיונות מתוך המקורות הציבוריים. אפשר לפתוח כל ממצא ולהגיע למקור המדויק שלו.</p>
      <p className="zvi-research__coverage">רשימה חלקית של חומר ציבורי מאושר שעבר סינון; יתר החומר ממתין לעיון. ייחוס המקור אינו קובע מי כתב כל ממצא; מצב הבדיקה מוצג בממצא עצמו.</p>
      <a className="zvi-research__action" href="#zvi-reviewed-research">לחומר נוסף שנבדק ↓</a>
    </header>
    <FindingList {...main} returnTo={returnTo} initialLabel="הצגת הממצאים המאושרים" moreLabel="עוד ממצאים" loadingLabel="טוען ממצאים…" />
    <section id="zvi-reviewed-research" className="zvi-research" aria-label="חומר נוסף שנבדק">
      <header className="zvi-research__header">
        <h3 className="zvi-research__title">חומר נוסף שנבדק</h3>
        <p className="zvi-research__coverage">הפריטים נבדקו לצורך סיווג כתוכן מחקרי. בדיקה זו אינה אימות במנוע; סקירת חומר נוסף עדיין נמשכת.</p>
      </header>
      <FindingList {...reviewed} returnTo={returnTo} initialLabel="חומר נוסף שנבדק" moreLabel="עוד חומר שנבדק" loadingLabel="טוען חומר נוסף…" />
    </section>
  </section>;
}
