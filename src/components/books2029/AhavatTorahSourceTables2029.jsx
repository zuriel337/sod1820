import React, { lazy, Suspense, useEffect, useMemo, useState } from "react";
import { AHAVAT_PEOPLE_BOOKS, ahavatPeopleRows, ahavatPeopleCsv } from "../../data/ahavatTorahPeople2029.js";
import { ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { AHAVAT_TORAH_SOURCE } from "../../data/ahavatTorahSystem2029.js";
import { AHAVAT_ROOT_SECTIONS, ahavatRootFragments } from "../../data/ahavatTorahRoots2029.js";
import { AHAVAT_MEGILLOT, AHAVAT_MEGILLAH_LETTER_ROWS, ahavatMegillahRows, ahavatMegillahBars, ahavatMegillahCsv, ahavatMegillahBalance } from "../../data/ahavatTorahMegillot2029.js";
import { AHAVAT_ATTRIBUTION_WINDOWS, AHAVAT_ATTRIBUTION_METHOD, AHAVAT_ERRATA_LINKS } from "../../data/ahavatTorahContentDepth2029.js";

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
  const [showDivisions, setShowDivisions] = useState(false);
  const [selectedBar, setSelectedBar] = useState("");
  const book = AHAVAT_PEOPLE_BOOKS.find(item => item.id === bookId);
  const rows = useMemo(() => ahavatPeopleRows(bookId, query), [bookId, query]);
  const unresolved = AHAVAT_PEOPLE_BOOKS.flatMap(item => item.rows).flatMap(row => [row.times, row.words]).filter(cell => cell.value === null).length;
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
    <details className="ahavat29-source-details" onToggle={event => setShowDivisions(event.currentTarget.open)}><summary>קראו את הייחוסים לפי פרשה</summary>
      {showDivisions ? <>
      <p><b>הסבר נלווה:</b> {AHAVAT_ATTRIBUTION_METHOD.explanation}</p>
      <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><caption>חלוקות {book.title} כפי שנדפסו בספר</caption><thead><tr><th>יחידה</th><th>הסבר נלווה</th><th>דברי הספר</th></tr></thead><tbody>{AHAVAT_ATTRIBUTION_WINDOWS.filter(item => item.book === book.title).map(item => <tr key={item.id}><td>{item.title}</td><td>{item.explanation}</td><td>{item.pdfPages.map(page => <button type="button" key={page} onClick={() => openSource(page)}>PDF {page}</button>)}</td></tr>)}</tbody></table></div>
      </> : null}
    </details>
    <div className="ahavat29-table-tools"><label><span>חיפוש באנשים ובייחוסים</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="דמות, קבוצה או מניין בדפוס" /></label><strong aria-live="polite">{rows.length} ייחוסים</strong></div>
    <nav className="ahavat29-letter-books" aria-label="מדד הייחוסים בתלת־ממד">{[["words", "תיבות מיוחסות"], ["times", "פעמים"]].map(([id, label]) => <button type="button" key={id} aria-pressed={id === metric} onClick={() => setMetric(id)}>{label}</button>)}</nav>
    <div className="ahavat29-ds01-controls"><button type="button" aria-expanded={showScene} disabled={!bars.length} onClick={() => setShowScene(value => !value)}>{showScene ? "סגור מבנה ייחוסים בתלת־ממד" : "פתח מבנה ייחוסים בתלת־ממד"}</button>{book.pages.map(page => <button key={page} type="button" onClick={() => openSource(page)}>סיכום {book.title} · PDF {page}</button>)}<button type="button" disabled={!rows.length} onClick={() => downloadCsv(ahavatPeopleCsv(bookId, query, AHAVAT_TORAH_SOURCE.pdfUrl), `ahavat-torah-people-${bookId}.csv`)}>הורד ייחוסים למחקר · {rows.length} שורות</button></div>
    {showScene ? <><div className="ahavat29-letter-scene"><Suspense fallback={<p role="status">טוען את מבנה הייחוסים…</p>}><SpatialScene mode="source-count" letterLabel={`${unit} · ${book.title}`} bars={bars} activeId={selectedBar} onSelect={selectBar} /></Suspense><p>ייצוג של מבנה הספר · גובה = {unit} בכל ייחוס · לחיצה פותחת את המקור</p></div><div className="ahavat29-letter-books" aria-label="נתוני מבנה הייחוסים">{bars.map(bar => <button type="button" key={bar.id} aria-pressed={selectedBar === bar.id} onClick={() => selectBar(bar.id)}>{bar.label} · {ahavatLetterNumber(bar.count)}</button>)}</div></> : null}
    {rows.length ? <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><caption>סיכום {book.title} · ייחוסים בדברי הספר</caption><thead><tr><th>ייחוס בדפוס</th><th>פעמים בדפוס</th><th>פעמים</th><th>תיבות בדפוס</th><th>תיבות</th><th>מקור</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.entity}</td><td>{row.times.printed === "?" ? "לא הוכרע" : row.times.printed}</td><td>{ahavatLetterNumber(row.times.value)}</td><td>{row.words.printed === "?" ? "לא הוכרע" : row.words.printed}</td><td>{ahavatLetterNumber(row.words.value)}</td><td><button type="button" onClick={() => openSource(row.page)}>PDF {row.page}</button></td></tr>)}</tbody></table></div> : <p role="status">לא נמצא ייחוס מתאים בחומש זה.</p>}
    <details className="ahavat29-source-details"><summary>פרטי המקור והכיסוי</summary><p>הקריאה המספרית כאן היא של סיכומי חמשת החומשים ב־PDF 26–30. טבלת כל פרשה וסיכום כלל התורה נשארים לקריאה במקור PDF 25–31 ואינם מוצגים כאילו תועתקו כולם. {unresolved} תאי מניין עמומים נשארו פתוחים, אינם אפס ואינם כלולים בגרף או כסכום מספרי ביצוא. מניין „פעמים” הוא יחידת הייחוס של המחבר, לא ספירת הופעות של שם ולא המניין הנפרד של „משה” ב־PDF 70. „תורה”, „דבר ה׳”, אנשים וקבוצות נשמרים כקטגוריות המקור; שורות משותפות אינן מפוצלות או מסוכמות יחד לסכום מומצא. הקריאה אינה אימות מנוע. הפרשנויות והתעתיק כאן אינם תחליף לצילום.</p><div className="ahavat29-ds01-controls">{[25, 26, 27, 28, 29, 30, 31].map(page => <button type="button" key={page} onClick={() => openSource(page)}>הסעיף המלא · PDF {page}</button>)}</div></details>
  </section>;
}

export function AhavatTorahPrintedNotes2029({ onPage }) {
  return <section className="ahavat29-letters" aria-labelledby="ahavat29-printed-notes-title">
    <header><div><span>הגהות מודפסות</span><h3 id="ahavat29-printed-notes-title">הערות לצד דברי הספר</h3></div><strong>9<small>הערות</small></strong></header>
    <p className="ahavat29-ds01-guide">ההערות נדפסו בסוף הספר. אפשר לקרוא כל הערה במקור ולפתוח את הקטע שהיא עוסקת בו כאשר הוא אותר.</p>
    <details className="ahavat29-source-details"><summary>פתחו את ההערות והקטעים</summary>
      {AHAVAT_ERRATA_LINKS.map(note => <article className="ahavat29-letter-reading" key={note.id}>
        <h4>{note.printedWork} · {note.printedOpening}</h4>
        <p><b>הגהות מודפסות:</b> {note.readableExcerpt}</p>
        <p><b>הסבר נלווה:</b> {note.explanation}</p>
        <div className="ahavat29-ds01-controls"><button type="button" onClick={() => onPage(note.sourcePdfPage, "DS-12")}>פתחו את ההערה · PDF {note.sourcePdfPage}</button>{note.targetPdfPage ? <button type="button" onClick={() => onPage(note.targetPdfPage, "DS-12")}>פתחו את הקטע · PDF {note.targetPdfPage}</button> : <span>עמוד הקטע טרם אותר</span>}{note.relatedPdfPages.filter(page => page !== note.targetPdfPage).map(page => <button type="button" key={page} onClick={() => onPage(page, "DS-12")}>תחילת הקטע · PDF {page}</button>)}</div>
      </article>)}
    </details>
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
      {fragments.map(fragment => <article key={fragment.id} className="ahavat29-letter-reading"><h4>{AHAVAT_ROOT_SECTIONS.find(section => section.page === fragment.pdf_page).title} · טור {fragment.column === "right" ? "ימני" : "שמאלי"}</h4><div className="ahavat29-ds01-controls"><button type="button" onClick={() => openSource(fragment.pdf_page)}>מקור הרשימה · PDF {fragment.pdf_page}</button></div><div className="ahavat29-machine-text"><p>תעתיק עזר לקריאה</p><pre>{fragment.text}</pre></div></article>)}
      {loadState === "ready" && !fragments.length ? <p role="status">לא נמצאה צורה מתאימה בתעתיק. אפשר לבדוק את עמודי המקור המלאים.</p> : null}
    </> : null}
    <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>הסעיף מתחיל באמצע PDF 31, לא ב־PDF 30, ומסתיים בחלקו העליון של PDF 35. עשרת הטורים חולצו בנפרד, בסדר הקריאה, בלי טבלת האנשים שקודמת להם ובלי טבלת האותיות שאחריהם. מילות שומר־דף הושמטו מגבולות החילוץ כדי לא להכפילן. התעתיק הוא כלי איתור בלבד ואינו ציטוט מאומת: זיהוי ד׳/ר׳, סימני דפוס ומילים רבות דורשים הגהה מול הצילום. המניין 1,820 נשמר כטענת מחבר מן המחקר הקודם, לא כמספר יחידות שתועתקו ואומתו כאן. לא הוחלו פיצול לשלשות, איחוד צורות או כללי שורש מודרניים; לא נוצרו משפחות דקדוקיות או ספירות תלת־ממדיות משוערות.</p></details>
  </section>;
}

export function AhavatTorahMegillotReader2029({ onPage, selectedDatasetId }) {
  const [kind, setKind] = useState(() => {
    const requested = new URLSearchParams(window.location.search).get("scrollKind");
    return selectedDatasetId === "DS-10" || requested === "words" ? "words" : "letters";
  });
  const [megillahId, setMegillahId] = useState(() => {
    const id = new URLSearchParams(window.location.search).get("scroll");
    return AHAVAT_MEGILLOT.some(item => item.id === id) ? id : "all";
  });
  const [query, setQuery] = useState("");
  const [showScene, setShowScene] = useState(false);
  const [selectedBar, setSelectedBar] = useState("");
  const datasetId = kind === "words" ? "DS-10" : "DS-09";
  const unit = kind === "words" ? "תיבות" : "אותיות";
  const rows = ahavatMegillahRows(kind, megillahId, query);
  const bars = ahavatMegillahBars(kind, megillahId, query);
  const selected = AHAVAT_MEGILLOT.find(item => item.id === megillahId);
  const unresolved = AHAVAT_MEGILLAH_LETTER_ROWS.filter(row => row.count === null);
  const openSource = page => onPage(page, datasetId);
  useEffect(() => {
    const nextKind = selectedDatasetId === "DS-09" ? "letters" : selectedDatasetId === "DS-10" ? "words" : null;
    if (!nextKind || nextKind === kind) return;
    setKind(nextKind); setQuery(""); setSelectedBar("");
    setReaderUrl("scrollKind", nextKind);
    onPage(nextKind === "words" ? 43 : 42, selectedDatasetId);
  }, [selectedDatasetId, kind, onPage]);
  const selectKind = next => {
    setKind(next); setQuery(""); setSelectedBar(""); setReaderUrl("scrollKind", next);
    onPage(next === "words" ? 43 : 42, next === "words" ? "DS-10" : "DS-09");
  };
  const selectMegillah = next => {
    setMegillahId(next); setQuery(""); setSelectedBar(""); setReaderUrl("scroll", next);
    openSource(43);
  };
  const selectBar = id => {
    if (AHAVAT_MEGILLOT.some(item => item.id === id)) selectMegillah(id);
    else {
      const row = rows.find(item => item.id === id);
      if (row) { setSelectedBar(id); openSource(row.page); }
    }
  };
  return <section id="ahavat29-scrolls" className="ahavat29-letters" aria-labelledby="ahavat29-scrolls-title">
    <header><div><span>אותיות ותיבות חמש מגילות · דברי הספר</span><h3 id="ahavat29-scrolls-title">נכנסים אל חמש המגילות</h3></div><strong>5<small>מגילות בדפוס</small></strong></header>
    <p className="ahavat29-ds01-guide"><b>הסבר נלווה:</b> כאן המחבר עובר מן התורה אל אסתר, שיר השירים, רות, איכה וקהלת. לכל מגילה מניין תיבות, מניין אותיות כולל ופירוט לפי צורות האותיות. בוחרים מגילה ומדד, ורואים את המניין לצד עמוד המקור שלו.</p>
    <nav className="ahavat29-letter-books" aria-label="בחירת מניין המגילות"><button type="button" aria-pressed={kind === "letters"} onClick={() => selectKind("letters")}>מניין האותיות</button><button type="button" aria-pressed={kind === "words"} onClick={() => selectKind("words")}>מניין התיבות</button></nav>
    <div className="ahavat29-letter-checkpoints" aria-label="סיכומי חמש המגילות בדפוס">{AHAVAT_MEGILLOT.map(item => <button type="button" key={item.id} aria-pressed={item.id === megillahId} onClick={() => selectMegillah(item.id)}><span>{item.title}</span><strong>{ahavatLetterNumber(item[kind][1])}</strong><small>{unit} · סיכום המחבר</small></button>)}</div>
    <nav className="ahavat29-letter-books" aria-label="בחירת מגילה"><button type="button" aria-pressed={megillahId === "all"} onClick={() => selectMegillah("all")}>כל חמש המגילות</button>{AHAVAT_MEGILLOT.map(item => <button type="button" key={item.id} aria-pressed={megillahId === item.id} onClick={() => selectMegillah(item.id)}>{item.title}</button>)}</nav>
    <div className="ahavat29-table-tools"><label><span>חיפוש בטבלת המגילות</span><input type="search" value={query} onChange={event => setQuery(event.target.value)} placeholder="מגילה, צורת אות או מספר בדפוס" /></label><strong aria-live="polite">{rows.length} שורות</strong></div>
    <div className="ahavat29-ds01-controls"><button type="button" aria-expanded={showScene} disabled={!bars.length} onClick={() => setShowScene(value => !value)}>{showScene ? "סגור מבנה מגילות בתלת־ממד" : "פתח מבנה מגילות בתלת־ממד"}</button>{(kind === "letters" ? [42, 43] : [43]).map(page => <button key={page} type="button" onClick={() => openSource(page)}>מקור המגילות · PDF {page}</button>)}<button type="button" disabled={!rows.length} onClick={() => downloadCsv(ahavatMegillahCsv(kind, megillahId, query, AHAVAT_TORAH_SOURCE.pdfUrl), `ahavat-torah-megillot-${kind}-${megillahId}.csv`)}>הורד מגילות למחקר · {rows.length} שורות</button></div>
    {showScene ? <><div className="ahavat29-letter-scene"><Suspense fallback={<p role="status">טוען את מבנה המגילות…</p>}><SpatialScene mode="source-count" letterLabel={`${unit} · ${selected?.title || "חמש המגילות"}`} bars={bars} activeId={selectedBar || megillahId} onSelect={selectBar} /></Suspense><p>ייצוג של מבנה הספר · גובה = {unit} {megillahId === "all" && !query ? "בסיכום כל מגילה" : "בשורת המקור"} · לחיצה פותחת את המקור</p></div><div className="ahavat29-letter-books" aria-label="נתוני מבנה המגילות">{bars.map(bar => <button type="button" key={bar.id} aria-pressed={selectedBar === bar.id} onClick={() => selectBar(bar.id)}>{bar.label} · {ahavatLetterNumber(bar.count)}</button>)}</div></> : null}
    {rows.length ? <div className="ahavat29-data-table-wrap"><table className="ahavat29-data-table"><caption>{unit} · {selected?.title || "חמש המגילות"} · קריאת דברי הספר</caption><thead><tr><th>מגילה</th><th>צורה</th><th>המניין בדפוס</th><th>מספר</th><th>מקור</th></tr></thead><tbody>{rows.map(row => <tr key={row.id}><td>{row.megillah}</td><td>{row.form}</td><td>{row.printed === "?" ? "לא הוכרע" : row.printed}</td><td><b>{ahavatLetterNumber(row.count)}</b></td><td><button type="button" onClick={() => openSource(row.page)}>PDF {row.page}</button></td></tr>)}</tbody></table></div> : <p role="status">לא נמצאה שורה מתאימה בחיפוש.</p>}
    <details className="ahavat29-source-details"><summary>פרטי המקור והקריאה</summary><p>מטריצת 28 צורות × חמש מגילות מתחילה ב־PDF 42 וממשיכה מ־ף׳ ב־PDF 43. שׁין ושׂין וחמש הצורות הסופיות נשמרות בנפרד. {unresolved.length} מתוך 140 תאים נשארו ללא הכרעה מספרית: הם אינם אפס, אינם נגזרים מסיכומי המגילות, אינם מוצגים כעמודות ומיוצאים כתא מספר ריק. הסיכומים הכוללים ומנייני התיבות מודפסים בנפרד ב־PDF 43; לחיצה על סיכום פותחת אותו ולא את העמוד שבו מתחילה המטריצה. הסדר הוא סדר הדפוס. זו קריאת דברי המחבר, לא ספירת קורפוס או אימות מנוע.</p><ul>{AHAVAT_MEGILLOT.map(item => {
      const balance = ahavatMegillahBalance(item.id);
      return <li key={item.id}>{item.title}: {item.letters[0]} אותיות; {item.words[0]} תיבות. {balance.rowTotal === null ? "סכום שורות האותיות פתוח עד להכרעת התאים." : `סכום קריאת השורות: ${ahavatLetterNumber(balance.rowTotal)}; פער מן הסיכום המודפס: ${balance.delta}.`}</li>;
    })}</ul><p>תאים להשלמת קריאה: {unresolved.map(row => `${row.megillah} / ${row.form}`).join("; ")}.</p></details>
  </section>;
}
