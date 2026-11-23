import React, { useEffect, useRef, useState } from "react";
import { supabase } from "../../lib/supabase.js";
import { buildElsAdvancedLoadItem, buildElsAdvancedPageRequest, buildElsAdvancedSelection, projectElsAdvancedPage } from "../../lib/research/elsAdvancedPage.js";
import { verifyEls2029Selection } from "../../lib/research/els2029ReplayClient.js";

// Registered-user bounded search, using the EXISTING canonical ELS server and matrix.
// Guided, variant generation, AI and background research are intentionally not included.
export default function ElsRegisteredAdvanced2029({ active = true, searchDraft = null, onLoad, onSummaryChange }) {
  const [term, setTerm] = useState("");
  const [scope, setScope] = useState("torah");
  const [min, setMin] = useState("2");
  const [max, setMax] = useState("80");
  const [pages, setPages] = useState([]);
  const [cursor, setCursor] = useState(null);
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState("");
  const [opening, setOpening] = useState("");
  const cancelRef = useRef(null);
  const seqRef = useRef(0);
  useEffect(() => () => { seqRef.current++; cancelRef.current?.abort(); }, []);
  useEffect(() => {
    if (!active) { seqRef.current++; cancelRef.current?.abort(); cancelRef.current = null; setBusy(false); setOpening(""); }
  }, [active]);
  useEffect(() => { onSummaryChange?.(`חיפוש רשומים · ${term || "הזינו מונח"} · דילוגים ${min}–${max}`); }, [onSummaryChange, term, min, max]);
  const change = (setter, value) => {
    seqRef.current++; cancelRef.current?.abort(); setBusy(false); setPages([]); setCursor(null); setNotice(""); setter(value);
  };
  const search = async (more = false) => {
    if (busy) return;
    const minNum = Number(min), maxNum = Number(max);
    if (!Number.isInteger(minNum) || !Number.isInteger(maxNum) || minNum < 2 || maxNum < minNum || maxNum > 500) {
      setNotice("בחרו טווח דילוגים בין 2 ל־500."); return;
    }
    const built = buildElsAdvancedPageRequest({ term, scope, skipMin: minNum, skipMax: maxNum, pageSize: 20 }, more ? cursor : null);
    if (built.error) { setNotice(built.error); return; }
    const sequence = ++seqRef.current;
    const controller = new AbortController(); cancelRef.current = controller;
    setBusy(true); setNotice("");
    if (!more) { setPages([]); setCursor(null); }
    try {
      const response = await supabase.functions.invoke("els-search-bridge", {
        body: { ...built.request, access_mode: "registered_range_v1" }, signal: controller.signal,
      });
      if (sequence !== seqRef.current) return;
      const page = projectElsAdvancedPage(response);
      if (page.error) { setNotice(page.error); return; }
      if (more && cursor && page.cursor && Object.keys(cursor).every(key => cursor[key] === page.cursor[key])) {
        setNotice("סריקת ההמשך לא התקדמה; אין להציג תוצאות חוזרות."); return;
      }
      const previous = pages.flatMap(p => p.projection.occurrences);
      if (more && page.projection.occurrences.some(hit => previous.some(old => old.occurrenceId === hit.occurrenceId))) {
        setNotice("נמצאו מופעים כפולים בתשובה; ההמשך לא צורף."); return;
      }
      setPages(current => more ? [...current, page] : [page]);
      setCursor(page.cursor);
      if (!page.projection.occurrences.length && !more) setNotice(page.cursor
        ? "לא נמצאו מופעים בדף הראשון; חלק מהטווח טרם נבדק."
        : "לא נמצאו מופעים בטווח שנבדק. אפשר לשנות את המונח או את הדילוגים.");
    } catch (error) {
      if (sequence === seqRef.current && !controller.signal.aborted) setNotice("החיפוש לא הושלם. אפשר לנסות שוב בטווח קטן יותר.");
    } finally {
      if (sequence === seqRef.current) setBusy(false);
      if (cancelRef.current === controller) cancelRef.current = null;
    }
  };
  const open = async (occurrence, projection) => {
    if (busy || opening) return;
    const selection = buildElsAdvancedSelection(occurrence, projection, scope);
    if (!selection) { setNotice("זהות המופע אינה מלאה."); return; }
    const sequence = ++seqRef.current;
    setOpening(occurrence.occurrenceId); setNotice("");
    try {
      const result = await verifyEls2029Selection(selection, body => supabase.functions.invoke("els-search-bridge", { body }));
      if (sequence !== seqRef.current) return;
      if (!result.ok) { setNotice("המופע לא אומת במנוע. בחרו מופע אחר."); return; }
      onLoad?.(buildElsAdvancedLoadItem(selection, projection));
      setNotice("המופע אומת ונשלח למטריצה הקיימת.");
    } catch { if (sequence === seqRef.current) setNotice("לא ניתן לאמת את המופע כרגע."); }
    finally { if (sequence === seqRef.current) setOpening(""); }
  };
  return <section className="sod29-section" data-els-registered-advanced="v1" aria-label="חיפוש מתקדם לחשבון רשום">
    <h3>חיפוש מתקדם לחשבון רשום</h3>
    <p>בחרו מילה, ספרים וטווח דילוגים. כל בדיקה מוגבלת ל־500; אין כאן סריקת AI או מחקר ברקע.</p>
    <form className="els29-advanced-form" onSubmit={event => { event.preventDefault(); search(false); }}>
      <label>המילה לחיפוש <input value={term} onChange={e=>change(setTerm,e.target.value)} maxLength={80} placeholder="למשל: דוד" required /></label>
      {searchDraft?.term ? <button type="button" className="sod29-action" onClick={()=>{change(setTerm,searchDraft.term);change(setScope,searchDraft.scope === "tanakh" ? "tanakh" : "torah");}}>השתמשו במונח מהחיפוש הרגיל</button> : null}
      <label>היקף חיפוש <select value={scope} onChange={e=>change(setScope,e.target.value)}>
        <option value="torah">תורה</option><option value="tanakh">כל התנ״ך</option>
      </select></label>
      <div className="els29-advanced-fields els29-advanced-range">
        <label>מדילוג <input type="number" min="2" max="500" step="1" value={min} onChange={e=>change(setMin,e.target.value)} /></label>
        <label>עד דילוג <input type="number" min="2" max="500" step="1" value={max} onChange={e=>change(setMax,e.target.value)} /></label>
      </div>
      <button className="sod29-action primary" type="submit" disabled={busy || Boolean(opening)}>{busy ? "מחפש…" : "חפש בטווח"}</button>
      {busy ? <button type="button" className="sod29-action" onClick={()=>{seqRef.current++;cancelRef.current?.abort();setBusy(false);setNotice("הבדיקה הופסקה; התוצאות שכבר התקבלו נשמרו.");}}>עצור</button> : null}
    </form>
    {notice ? <p role="status">{notice}</p> : null}
    {pages.length ? <div aria-label="מופעים מאומתים">
      <strong>{pages.reduce((sum,p)=>sum+p.projection.occurrences.length,0)} מופעים שהוחזרו</strong>
      <ol>{pages.flatMap((page,index)=>page.projection.occurrences.map(hit=><li key={hit.occurrenceId || index}>
        <button className="sod29-action" type="button" disabled={busy || Boolean(opening)}
          onClick={()=>open(hit,page.projection)}>
          {opening===hit.occurrenceId ? "מאמת…" : `דילוג ${hit.dir === -1 ? "−" : ""}${hit.skip} · מיקום ${hit.start} · פתח במטריצה`}
        </button>
      </li>))}</ol>
      {cursor ? <button className="sod29-action" type="button" disabled={busy || Boolean(opening)} onClick={()=>search(true)}>בדוק את הדף הבא</button> : null}
      {cursor ? <small>הסריקה חלקית; תוצאות נוספות עשויות להימצא בהמשך הטווח.</small> : null}
    </div> : null}
  </section>;
}
