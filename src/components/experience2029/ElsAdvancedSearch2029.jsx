import React, { useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { verifyEls2029Selection } from "../../lib/research/els2029ReplayClient.js";
import { buildElsAdvancedLoadItem, buildElsAdvancedPageRequest, buildElsAdvancedSelection, projectElsAdvancedPage } from "../../lib/research/elsAdvancedPage.js";

const initialForm = { term: "", scope: "torah", skipMin: "2", skipMax: "80", pageSize: "20" };

export default function ElsAdvancedSearch2029({ onLoad }) {
  const [form, setForm] = useState(initialForm);
  const [query, setQuery] = useState(null);
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [selecting, setSelecting] = useState(null);
  const [notice, setNotice] = useState("");
  const revision = useRef(0);
  const edit = (field, value) => {
    revision.current += 1;
    setForm(current => ({ ...current, [field]: value }));
    setQuery(null); setPages([]); setCursor(null); setNotice(""); setBusy(false); setSelecting(null);
  };
  const search = async (more = false) => {
    const source = more ? query : form;
    const built = buildElsAdvancedPageRequest(source, more ? cursor : null);
    if (built.error) { setNotice(built.error); return; }
    const seq = ++revision.current;
    setBusy(true); setNotice("");
    if (!more) { setQuery({ ...form }); setPages([]); setCursor(null); }
    try {
      const response = await supabase.functions.invoke("els-search-bridge", { body: built.request });
      if (seq !== revision.current) return;
      const page = projectElsAdvancedPage(response);
      if (page.error) { setNotice(`החיפוש לא הושלם: ${page.error}`); return; }
      setPages(current => more ? [...current, page] : [page]);
      setCursor(page.cursor);
      if (!page.projection.occurrences.length && !more) setNotice("לא נמצאו מופעים בטווח המבוקש. אפשר להרחיב את טווח הדילוגים ולחפש שוב.");
    } catch (error) {
      if (seq === revision.current) setNotice(`החיפוש לא הושלם: ${error?.message || "שגיאת תקשורת"}`);
    } finally {
      if (seq === revision.current) setBusy(false);
    }
  };
  const select = async (occurrence, projection) => {
    const selection = buildElsAdvancedSelection(occurrence, projection, query?.scope);
    if (!selection) { setNotice("אי אפשר לבחור מופע בלי זהות מלאה."); return; }
    const seq = ++revision.current;
    setSelecting(occurrence.occurrenceId); setNotice("");
    try {
      const verified = await verifyEls2029Selection(selection, body => supabase.functions.invoke("els-search-bridge", { body }));
      if (seq !== revision.current) return;
      if (!verified.ok) { setNotice(`המופע לא אומת: ${verified.state}. בחרו מופע אחר.`); return; }
      const loadItem = buildElsAdvancedLoadItem(selection, projection);
      onLoad?.(loadItem);
      setNotice("המופע אומת ונשלח למטריצה. הממצאים והמקור יופיעו בכלי המשותף.");
    } finally {
      if (seq === revision.current) setSelecting(null);
    }
  };
  const count = pages.reduce((total, page) => total + page.projection.occurrences.length, 0);
  return <section className="sod29-section" aria-label="חיפוש דילוגים מתקדם" data-els-advanced-search="v1">
    <div className="sod29-section-head"><div><div className="sod29-kicker">חיפוש מתקדם לפי דרישה</div><h3>מופעים בטווח דילוגים מדויק</h3></div></div>
    <div className="sod29-actions" aria-label="רמות דילוגים" style={{ flexWrap: "wrap", gap: 8 }}>
      {[[2, 80, "קרוב"], [81, 200, "בינוני"], [201, 500, "רחוק"]].map(([min, max, label]) =>
        <button key={label} type="button" className="sod29-action" onClick={() => {
          revision.current += 1; setForm(current => ({ ...current, skipMin: String(min), skipMax: String(max) }));
          setQuery(null); setPages([]); setCursor(null); setNotice(""); setBusy(false);
        }}>{label} · {min}–{max}</button>)}
    </div>
    <form onSubmit={event => { event.preventDefault(); search(false); }} className="sod29-actions" style={{ flexWrap: "wrap", alignItems: "end", gap: 10 }}>
      <label>מונח <input aria-label="מונח לחיפוש מתקדם" value={form.term} onChange={event => edit("term", event.target.value)} /></label>
      <label>טקסט <select aria-label="טקסט לחיפוש מתקדם" value={form.scope} onChange={event => edit("scope", event.target.value)}><option value="torah">תורה</option><option value="tanakh">תנ״ך</option></select></label>
      <label>דילוג מ־ <input aria-label="דילוג מינימלי" type="number" min="2" max="500" value={form.skipMin} onChange={event => edit("skipMin", event.target.value)} /></label>
      <label>עד <input aria-label="דילוג מקסימלי" type="number" min="2" max="500" value={form.skipMax} onChange={event => edit("skipMax", event.target.value)} /></label>
      <label>תוצאות בדף <input aria-label="תוצאות בדף" type="number" min="1" max="100" value={form.pageSize} onChange={event => edit("pageSize", event.target.value)} /></label>
      <button className="sod29-action primary" type="submit" disabled={busy || !!selecting}>חפש בטווח</button>
    </form>
    <p className="sod29-muted">החיפוש רץ רק בלחיצה. תוצאות נוספות נטענות בדפים, וכל מופע נבדק שוב לפני פתיחתו במטריצה.</p>
    {notice ? <p role="status">{notice}</p> : null}
    {busy ? <p role="status">מחפש מופעים במנוע הקנוני…</p> : null}
    {pages.length ? <div aria-label="מופעי החיפוש המתקדם"><p>{count} מופעים נטענו{cursor ? " · יש תוצאות נוספות" : " · סוף התוצאות בטווח"}</p>
      <ol>{pages.flatMap(page => page.projection.occurrences.map(hit => <li key={hit.occurrenceId}>
        <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => select(hit, page.projection)}>
          <bdi>{page.projection.term}</bdi> · דילוג {hit.skip} · {hit.dir === 1 ? "קדימה" : "אחורה"} · מיקום {hit.start + 1}
        </button>
      </li>))}</ol>
      {cursor ? <button type="button" className="sod29-action" disabled={busy || !!selecting} onClick={() => search(true)}>טען תוצאות נוספות</button> : null}
    </div> : null}
  </section>;
}
