import React, { useMemo, useRef, useState } from "react";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_SOURCE } from "../../data/ahavatTorahSystem2029.js";
import { ahavatLetterUnitId } from "../../data/ahavatTorahReaderUnits2029.js";
import { AHAVAT_LETTER_COMPARISON_ANCHOR, ahavatLetterParashaEntries, ahavatLetterComparisonRows, ahavatParashaLettersCsv } from "./ahavatLetterJourney2029.js";

// Explicit reading depth over unchanged source rows, not a second reader/model.
export default function AhavatLetterComparison2029({ source, parasha, onSource }) {
  const entries = useMemo(() => ahavatLetterParashaEntries(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, source.form), [source.form]);
  const initial = new URLSearchParams(window.location.search);
  const [open, setOpen] = useState(() => initial.get("letterComparison") === "open");
  const [from, setFrom] = useState(() => entries.some(entry => entry.row.parasha === initial.get("letterComparisonFrom")) ? initial.get("letterComparisonFrom") : parasha);
  const [to, setTo] = useState(() => entries.some(entry => entry.row.parasha === initial.get("letterComparisonTo")) ? initial.get("letterComparisonTo") : "");
  const summary = useRef(null);
  const pair = useMemo(() => ahavatLetterComparisonRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, source.form, from, to), [source.form, from, to]);
  const update = (nextOpen, first = from, second = to, focus = "") => {
    const url = new URL(window.location.href);
    for (const [key, value] of Object.entries({ letterComparison: nextOpen ? "open" : "", letterComparisonFrom: first, letterComparisonTo: second, letterComparisonFocus: focus })) {
      if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    }
    if (nextOpen) url.hash = AHAVAT_LETTER_COMPARISON_ANCHOR;
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const changeOpen = next => { setOpen(next); update(next); };
  const choose = (first, second) => { setFrom(first); setTo(second); update(true, first, second); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([ahavatParashaLettersCsv(pair, AHAVAT_TORAH_SOURCE.pdfUrl)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a"); anchor.href = url; anchor.download = `ahavat-torah-comparison-${source.form}.csv`;
    document.body.append(anchor); anchor.click(); anchor.remove(); window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details id={AHAVAT_LETTER_COMPARISON_ANCHOR} className="ahavat29-letter-comparison" open={open} onToggle={event => { if (event.currentTarget.open !== open) changeOpen(event.currentTarget.open); }}>
    <summary ref={summary}>אות אחת בשתי פרשות</summary>
    {open ? <>
      <header><span>דברי הספר · שתי קריאות מקור</span><h5>{source.name} מפרשה לפרשה</h5></header>
      <p><b>הסבר נלווה:</b> בחר שתי פרשות כדי לקרוא זו לצד זו את מניין אותה צורת אות. פתיחת מקור שומרת את ההשוואה; שינוי האות בקורא מעדכן את שתי הקריאות.</p>
      <div className="ahavat29-letter-comparison-choices">
        <label>פרשת הבסיס להשוואה<select value={from} onChange={event => choose(event.target.value, to)}>{entries.map(entry => <option key={entry.row.parasha} value={entry.row.parasha}>{entry.book} · {entry.row.parasha}</option>)}</select></label>
        <label>פרשה נוספת להשוואה<select value={to} onChange={event => choose(from, event.target.value)}><option value="">בחר פרשה נוספת…</option>{entries.map(entry => <option key={entry.row.parasha} value={entry.row.parasha}>{entry.book} · {entry.row.parasha}</option>)}</select></label>
      </div>
      {pair.length ? <>
        <div className="ahavat29-letter-comparison-grid">{pair.map(entry => {
          const id = ahavatLetterUnitId(source.form, entry.bookId, entry.row.parasha);
          return <article key={id} data-ahavat-comparison-card={id}>
            <h6>{entry.row.parasha} · {entry.book}</h6>
            <dl><div><dt>המניין בדפוס</dt><dd><bdi>{entry.row.printed === "?" ? "לא נקרא" : entry.row.printed}</bdi></dd></div><div><dt>קריאת המספר</dt><dd>{entry.row.count === null ? <span>לא נקרא</span> : <bdi className="ahavat29-letter-row-number">{ahavatLetterNumber(entry.row.count)}</bdi>}</dd></div></dl>
            <button type="button" data-ahavat-comparison-unit={id} aria-pressed={parasha === entry.row.parasha} aria-label={`מקור השוואת ${source.name} בפרשת ${entry.row.parasha} · PDF ${entry.row.page}`} onClick={() => { onSource(entry.row); update(true, from, to, id); }}>פתח מקור · PDF <bdi>{entry.row.page}</bdi></button>
          </article>;
        })}</div>
        <div className="ahavat29-letter-comparison-actions"><button type="button" onClick={() => choose(to, from)}>החלף בין הפרשות</button><button type="button" onClick={download}>הורד את שתי קריאות המקור</button></div>
      </> : <p role="status">{from === to ? "בחר שתי פרשות שונות להשוואה." : "בחר פרשה נוספת; המקור והפרשה הנוכחית נשארים זמינים."}</p>}
      <footer><button type="button" onClick={() => { changeOpen(false); summary.current?.focus({ preventScroll: true }); summary.current?.scrollIntoView({ block: "center", behavior: "instant" }); }}>סגור את ההשוואה</button></footer>
    </> : null}
  </details>;
}
