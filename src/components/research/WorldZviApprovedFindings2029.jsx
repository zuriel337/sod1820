import React, { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { getPublicResearchClient } from "../../lib/research/researchViewMode.js";
import { fetchZviApprovedFindingsPage } from "../../lib/research/worldZviApprovedFindings2029.js";

// A visitor explicitly opens the public, bounded list. The full corpus is never
// fetched on entering the source library, and no graph relation is invented.
export default function WorldZviApprovedFindings2029() {
  const location = useLocation();
  const [state, setState] = useState({ opened: false, loading: false, rows: [], cursor: null, hasMore: false, error: false, omittedUnavailable: false });
  const pending = useRef(false);
  const mounted = useRef(true);
  useEffect(() => { mounted.current = true; return () => { mounted.current = false; }; }, []);

  async function load() {
    if (pending.current) return;
    pending.current = true;
    const cursor = state.cursor;
    setState((previous) => ({ ...previous, opened: true, loading: true, error: false }));
    try {
      const page = await fetchZviApprovedFindingsPage({ client: getPublicResearchClient(), cursor });
      if (!mounted.current) return;
      setState((previous) => {
        const known = new Set(previous.rows.map((row) => row.id));
        return { ...previous, loading: false, rows: [...previous.rows, ...page.rows.filter((row) => !known.has(row.id))],
          cursor: page.nextCursor, hasMore: page.hasMore, error: false,
          omittedUnavailable: previous.omittedUnavailable || page.omittedUnavailable };
      });
    } catch {
      if (mounted.current) setState((previous) => ({ ...previous, loading: false, error: true }));
    } finally {
      pending.current = false;
    }
  }

  const returnTo = `${location.pathname}${location.search}${location.hash}`;
  return <section aria-label="ממצאים הקשורים למקורות צבי" dir="rtl">
    <h3>ממצאים הקשורים למקורות צבי</h3>
    <p>רשימה חלקית של חומר ציבורי מאושר שעבר סינון; יתר החומר ממתין לעיון. ייחוס המקור אינו קובע מי כתב כל ממצא; מצב הבדיקה מוצג בממצא עצמו.</p>
    {!state.opened ? <button className="sod29-action" type="button" onClick={load}>הצגת הממצאים המאושרים</button> : null}
    {state.loading ? <p role="status">טוען ממצאים…</p> : null}
    {state.error ? <p role="status">הממצאים אינם זמינים כרגע. אפשר לנסות שוב.</p> : null}
    {state.omittedUnavailable ? <p>חלק מהמקורות אינם זמינים בתצוגה הציבורית והממצאים התלויים בהם לא הוצגו.</p> : null}
    {state.opened && !state.loading && !state.error && !state.rows.length && !state.hasMore && !state.omittedUnavailable
      ? <p>לא נמצאו ממצאים ציבוריים מאושרים במקורות אלו.</p> : null}
    {state.rows.length ? <ul>{state.rows.map((row) => <li key={row.id}>
      <Link to={row.findingHref} state={{ returnTo }}>{row.title}</Link>
      {row.contributor ? <small> · ייחוס ברשומה: {row.contributor}</small> : null}
      {row.ocrNeedsReview ? <small> · סריקת OCR — נדרשת בדיקה מול המקור; אינו ציטוט מאומת.</small> : null}
      {row.sourceHref ? <> · <Link to={row.sourceHref}>פתיחת המקור</Link></> : null}
    </li>)}</ul> : null}
    {state.opened && !state.loading && (state.hasMore || state.error)
      ? <button className="sod29-action" type="button" onClick={load}>{state.error ? "נסה שוב" : "עוד ממצאים"}</button> : null}
  </section>;
}
