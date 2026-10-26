import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows, ahavatPeopleCsv } from "../../data/ahavatTorahPeople2029.js";
import { ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_SOURCE } from "../../data/ahavatTorahSystem2029.js";
import { AHAVAT_ROOT_SECTIONS, ahavatRootFragments } from "../../data/ahavatTorahRoots2029.js";

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

export function AhavatTorahRootsReader2029({ onPage }) {
  const [expanded, setExpanded] = useState(false);
  const [bundle, setBundle] = useState(null);
  const [loadState, setLoadState] = useState("idle");
  const [retry, setRetry] = useState(0);
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(() => {
    const requested = Number(new URLSearchParams(window.location.search).get("rootsPage"));
    return AHAVAT_ROOT_SECTIONS.some(section => section.page === requested) ? requested : 31;
  });
  useEffect(() => {
    if (!expanded || bundle) return;
    const controller = new AbortController();
    setLoadState("loading");
    fetch("/book-data/ahavat-torah.roots.json", { signal: controller.signal }).then(async response => {
      if (!response.ok) throw new Error("Root source unavailable");
      const data = await response.json();
      const fragments = ahavatRootFragments(data);
      if (fragments.length !== 10 || new Set(fragments.map(fragment => fragment.id)).size !== 10) throw new Error("Incomplete root source");
      if (!controller.signal.aborted) { setBundle(data); setLoadState("ready"); }
    }).catch(() => { if (!controller.signal.aborted) setLoadState("error"); });
    return () => controller.abort();
  }, [expanded, bundle, retry]);
  const openSource = next => {
    setPage(next); setReaderUrl("rootsPage", String(next)); onPage(next, "DS-11");
  };
  const fragments = ahavatRootFragments(bundle, query).filter(fragment => query || fragment.pdf_page === page);
  return <section id="ahavat29-roots" className="ahavat29-letters" aria-labelledby="ahavat29-roots-title">
    <header><div><span>שרשים בתורה · דברי הספר</span><h3 id="ahavat29-roots-title">קוראים את הרשימה ברצף</h3></div><strong>5<small>עמודי מקור</small></strong></header>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> המחבר אוסף צורות ומילים לאורך התורה. זו דרך להיכנס אל אוצר הלשון שלו: מעשה בראשית, האבות, יציאת מצרים, המשכן והמצוות, ועד חתימת התורה. בכל עמוד קוראים תחילה את הטור הימני ואחריו את השמאלי.</p>
    <nav className="ahavat29-letter-books" aria-label="עמודי רשימת השרשים">{AHAVAT_ROOT_SECTIONS.map(section => <button type="button" key={section.page} aria-pressed={section.page === page} onClick={() => openSource(section.page)}>{section.title} · PDF {section.page}</button>)}</nav>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> {AHAVAT_ROOT_SECTIONS.find(section => section.page === page).explanation}</p>
    <div className="ahavat29-ds01-controls"><button type="button" onClick={() => openSource(page)}>פתח רשימה מלאה · PDF {page}</button><button type="button" aria-expanded={expanded} onClick={() => setExpanded(value => !value)}>{expanded ? "סגור תעתיק וחיפוש בשרשים" : "פתח תעתיק וחיפוש בשרשים"}</button></div>
    {expanded ? <>
      <div className="ahavat29-table-tools"><label><span>חיפוש ברשימת השרשים</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="צורה כלשונה בספר או נושא העמוד" /></label><strong aria-live="polite">{fragments.length} טורים</strong></div>
      {loadState === "loading" ? <p role="status">טוען את תעתיק הרשימה…</p> : loadState === "error" ? <div role="status"><p>התעתיק לא נטען. הרשימה המלאה זמינה ב־PDF שלצדו.</p><button type="button" onClick={() => setRetry(value => value + 1)}>נסה לטעון שוב</button></div> : null}
      {fragments.map(fragment => <article key={fragment.id} className="ahavat29-letter-reading"><h4>{AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page).title} · טור {fragment.column === "right" ? "ימני" : "שמאלי"}</h4><p>תעתיק עזר לקריאה</p><div className="ahavat29-ds01-controls"><button type="button" onClick={() => openSource(fragment.pdf_page)}>מקור הרשימה · PDF {fragment.pdf_page}</button></div><pre className="ahavat29-machine-text">{fragment.text}</pre></article>)}
      {loadState === "ready" && !fragments.length ? <p role="status">לא נמצאה צורה מתאימה בתעתיק. אפשר לבדוק את עמודי המקור המלאים.</p> : null}
    </> : null}
    <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>הסעיף מתחיל באמצע PDF 31, לא ב־PDF 30, ומסתיים בחלקו העליון של PDF 35. עשרת הטורים חולצו בנפרד, בסדר הקריאה, בלי טבלת האנשים שקודמת להם ובלי טבלת האותיות שאחריהם. מילות שומר־דף הושמטו מגבולות החילוץ כדי לא להכפילן. התעתיק הוא כלי איתור בלבד ואינו ציטוט מאומת: זיהוי ד׳/ר׳, סימני דפוס ומילים רבות דורשים הגהה מול הצילום. המניין 1,820 נשמר כטענת מחבר מן המחקר הקודם, לא כמספר יחידות שתועתקו ואומתו כאן. לא הוחלו פיצול לשלשות, איחוד צורות או כללי שורש מודרניים; לא נוצרו משפחות דקדוקיות או ספירות תלת־ממדיות משוערות.</p></details>
  </section>;
}
