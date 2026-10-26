import React, { lazy, Suspense, useMemo, useState } from "react";
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows, ahavatPeopleCsv } from "../../data/ahavatTorahPeople2029.js";
import { ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_SOURCE } from "../../data/ahavatTorahSystem2029.js";

const SpatialScene = lazy(() => import("./AhavatTorahSpatialScene2029.jsx"));
function setReaderUrl(key, value) {
  const url = new URL(window.location.href);
  url.searchParams.set(key, value);
  window.history.replaceState({}, "", `${url.pathname}${url.search}${url.hash}`);
}
function downloadCsv(csv, filename) {
  const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function AhavatTorahPeopleReader2029({ onPage }) {
  const [bookId, setBookId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("peopleBook");
    return AHAVAT_PEOPLE_BOOKS.some(book => book.id === id) ? id : "bereshit";
  });
  const [query, setQuery] = useState("");
  const [metric, setMetric] = useState("words");
  const [showScene, setShowScene] = useState(false);
  const [selectedBar, setSelectedBar] = useState("");
  const book = AHAVAT_PEOPLE_BOOKS.find(item => item.id === bookId);
  const rows = useMemo(() => ahavatPeopleRows(bookId, query), [bookId, query]);
  const bars = rows.filter(row => Number.isSafeInteger(row[metric].value)).map(row => ({ id: row.id, label: row.entity, count: row[metric].value }));
  const unit = metric === "words" ? "תיבות מיוחסות" : "פעמים בדברי המחבר";
  const openSource = page => onPage(page, "DS-05");
  const selectBook = next => {
    setBookId(next); setQuery(""); setSelectedBar("");
    setReaderUrl("peopleBook", next);
    openSource(AHAVAT_PEOPLE_BOOKS.find(item => item.id === next).pages[0]);
  };
  const selectBar = id => {
    const row = rows.find(item => item.id === id);
    if (row) { setSelectedBar(id); openSource(row.page); }
  };
  return <section id="ahavat29-people" className="ahavat29-letters" aria-labelledby="ahavat29-people-title">
    <header><div><span>אוריין תליתאי · דברי הספר</span><h3 id="ahavat29-people-title">אנשים, קבוצות וייחוסים</h3></div><strong>5<small>סיכומי חומשים</small></strong></header>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> המחבר מבחין בין כמה פעמים מיוחס דבר לאדם או לקבוצה, לבין כמה תיבות הוא כולל. אלה שני מדדים שונים: בחרו חומש, חפשו דמות והשוו כל מדד בנפרד. השמות המשותפים נשמרים יחד כפי שנדפסו.</p>
    <nav className="ahavat29-letter-books" aria-label="בחירת חומש בייחוסים">{AHAVAT_PEOPLE_BOOKS.map(item => <button type="button" key={item.id} aria-pressed={item.id === bookId} onClick={() => selectBook(item.id)}>{item.title}</button>)}</nav>
    <div className="ahavat29-table-tools"><label><span>חיפוש באנשים ובייחוסים</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="דמות, קבוצה או מניין בדפוס" /></label><strong aria-live="polite">{rows.length} ייחוסים</strong></div>
    <nav className="ahavat29-letter-books" aria-label="מדד הייחוסים בתלת־ממד">{[["words", "תיבות מיוחסות"], ["times", "פעמים"]].map(([id, label]) => <button type="button" key={id} aria-pressed={id === metric} onClick={() => setMetric(id)}>{label}</button>)}</nav>
    <div className="ahavat29-ds01-controls"><button type="button" aria-expanded={showScene} disabled={!bars.length} onClick={() => setShowScene(value => !value)}>{showScene ? "סגור מבנה ייחוסים בתלת־ממד" : "פתח מבנה ייחוסים בתלת־ממד"}</button>{book.pages.map(page => <button key={page} type="button" onClick={() => openSource(page)}>סיכום {book.title} · PDF {page}</button>)}<button type="button" disabled={!rows.length} onClick={() => downloadCsv(ahavatPeopleCsv(bookId, query, AHAVAT_TORAH_SOURCE.pdfUrl), `ahavat-torah-people-${bookId}.csv`)}>הורד ייחוסים למחקר · {rows.length} שורות</button></div>
    {showScene ? <div className="ahavat29-letter-scene"><Suspense fallback={<p role="status">טוען את מבנה הייחוסים…</p>}><SpatialScene mode="source-count" letterLabel={`${unit} · ${book.title}`} bars={bars} activeId={selectedBar} onSelect={selectBar} /></Suspense><p>ייצוג של מבנה הספר · גובה = {unit} בכל ייחוס · לחיצה פותחת את המקור</p><div className="ahavat29-letter-books" aria-label="נתוני מבנה הייחוסים">{bars.map(bar => <button type="button" key={bar.id} aria-pressed={selectedBar === bar.id} onClick={() => selectBar(bar.id)}>{bar.label} · {ahavatLetterNumber(bar.count)}</button>)}</div></div> : null}
    {rows.length ? <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><caption>סיכום {book.title} · ייחוסים בדברי הספר</caption><thead><tr><th>ייחוס בדפוס</th><th>פעמים בדפוס</th><th>פעמים</th><th>תיבות בדפוס</th><th>תיבות</th><th>מקור</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.entity}</td><td>{row.times.printed}</td><td>{ahavatLetterNumber(row.times.value)}</td><td>{row.words.printed}</td><td>{ahavatLetterNumber(row.words.value)}</td><td><button type="button" onClick={() => openSource(row.page)}>PDF {row.page}</button></td></tr>)}</tbody></table></div> : <p role="status">לא נמצא ייחוס מתאים בחומש זה.</p>}
    <details className="ahavat29-source-details"><summary>פרטי המקור והכיסוי</summary><p>הקריאה המספרית כאן היא של סיכומי חמשת החומשים ב־PDF 26–30. טבלת כל פרשה וסיכום כלל התורה נשארים לקריאה במקור PDF 25–31 ואינם מוצגים כאילו תועתקו כולם. מניין „פעמים” הוא יחידת הייחוס של המחבר, לא ספירת הופעות של שם ולא המניין הנפרד של „משה” ב־PDF 70. „תורה”, „דבר ה׳”, אנשים וקבוצות נשמרים כקטגוריות המקור; שורות משותפות אינן מפוצלות או מסוכמות יחד לסכום מומצא. הקריאה אינה אימות מנוע. הפרשנויות והתעתיק כאן אינם תחליף לצילום.</p><div className="ahavat29-ds01-controls">{[25, 26, 27, 28, 29, 30, 31].map(page => <button type="button" key={page} onClick={() => openSource(page)}>הסעיף המלא · PDF {page}</button>)}</div></details>
  </section>;
}
