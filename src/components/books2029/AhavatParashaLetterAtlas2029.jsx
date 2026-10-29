import React, { useMemo, useRef, useState } from "react";
import { AHAVAT_LETTER_FORMS, AHAVAT_LETTER_READINGS, ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_SOURCE } from "../../data/ahavatTorahSystem2029.js";
import { ahavatFilterParashaLetters, ahavatParashaLetterRows, ahavatParashaLettersCsv } from "./ahavatLetterJourney2029.js";

// An explicitly opened projection inside the existing reader, not a second
// source store/identity/renderer. Each action selects the original letter unit.
export default function AhavatParashaLetterAtlas2029({ parasha, selectedForm, onChoose }) {
  const [open, setOpen] = useState(() => new URLSearchParams(window.location.search).get("letterAtlas") === "parasha");
  const [query, setQuery] = useState(() => (new URLSearchParams(window.location.search).get("letterAtlasQuery") || "").slice(0, 80));
  const summary = useRef(null);
  const rows = useMemo(() => ahavatParashaLetterRows(AHAVAT_LETTER_READINGS, AHAVAT_LETTER_FORMS, parasha), [parasha]);
  const visible = useMemo(() => ahavatFilterParashaLetters(rows, query), [rows, query]);
  const updateUrl = (key, value) => {
    const url = new URL(window.location.href);
    if (value) url.searchParams.set(key, value); else url.searchParams.delete(key);
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`);
  };
  const changeOpen = next => { setOpen(next); updateUrl("letterAtlas", next ? "parasha" : ""); };
  const changeQuery = value => { const next = value.slice(0, 80); setQuery(next); updateUrl("letterAtlasQuery", next); };
  const download = () => {
    const url = URL.createObjectURL(new Blob([ahavatParashaLettersCsv(rows, AHAVAT_TORAH_SOURCE.pdfUrl)], { type: "text/csv;charset=utf-8" }));
    const anchor = document.createElement("a");
    anchor.href = url; anchor.download = `ahavat-torah-parasha-${parasha}.csv`;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  };
  return <details className="ahavat29-parasha-letter-atlas" open={open} onToggle={event => { if (event.currentTarget.open !== open) changeOpen(event.currentTarget.open); }}>
    <summary ref={summary}>כל האותיות בפרשת {parasha}</summary>
    {open ? <>
      <header><span>דברי הספר · פרשה אחת דרך צורות האותיות</span><h5>פרשת {parasha} באותיות הספר</h5></header>
      <p><b>הסבר נלווה:</b> כל כרטיס מציג את שורת הפרשה בסעיף של אותה אות. בחירת אות מחליפה את יחידת הקריאה ושומרת את הפרשה; כפתור המקור פותח את העמוד המדויק שלה. הצורות הסופיות ושׁין ושׂין נשארות נפרדות, לפי הדפוס. אין כאן חיבור של המניינים לסכום חדש.</p>
      <div className="ahavat29-parasha-atlas-tools"><label>סינון אותיות בפרשה<input type="search" maxLength={80} value={query} onChange={event => changeQuery(event.target.value)} placeholder="למשל: כף או סופית" /></label><span aria-live="polite"><bdi>{visible.length}</bdi> מתוך <bdi>{rows.length}</bdi> צורות</span>{query ? <button type="button" onClick={() => changeQuery("")}>נקה סינון אותיות</button> : null}</div>
      <div className="ahavat29-parasha-atlas-grid">
        {visible.map(({ source, row }) => <article key={source.form} data-letter-form={source.form}>
          <button type="button" className="ahavat29-parasha-atlas-choice" aria-label={`בחר ${source.name} בפרשת ${parasha}`} aria-pressed={selectedForm === source.form} onClick={() => onChoose(source.form, false)}><b aria-hidden="true">{source.form}</b><span>{source.name}</span></button>
          <dl><div><dt>בדפוס</dt><dd><bdi>{row.printed === "?" ? "לא נקרא" : row.printed}</bdi></dd></div><div><dt>קריאת המספר</dt><dd>{row.count === null ? <span>לא נקרא</span> : <bdi className="ahavat29-letter-row-number">{ahavatLetterNumber(row.count)}</bdi>}</dd></div></dl>
          <button type="button" aria-label={`מקור ${source.name} בפרשת ${parasha} · PDF ${row.page}`} onClick={() => onChoose(source.form, true)}>פתח מקור · PDF <bdi>{row.page}</bdi></button>
        </article>)}
      </div>
      {!visible.length ? <p role="status">לא נמצאה צורת אות מתאימה. אפשר לנקות את הסינון; הפרשה וה־PDF נשארים פתוחים.</p> : null}
      <footer><button type="button" onClick={download}>הורד את טבלת הפרשה</button><p>הקובץ כולל את כל <bdi>{rows.length}</bdi> צורות האותיות, גם בזמן סינון, עם המניין המודפס ומראה־המקום. קריאה חסרה נשארת חסרה.</p><button type="button" onClick={() => { changeOpen(false); summary.current?.focus({ preventScroll: true }); summary.current?.scrollIntoView({ block: "center", behavior: "instant" }); }}>סגור את מפת הפרשה</button></footer>
    </> : null}
  </details>;
}
