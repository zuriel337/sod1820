import React, { useState } from "react";
import { inspectElsStructures, structureInspectionKey, restoreElsStructureInspection } from "../../lib/research/elsStructureInspection.js";
import "./elsStructureResearch2029.css";

export default function ElsStructureResearch2029({ state, busy, visible, onRestore, onFocus }) {
  const [result, setResult] = useState(null);
  const [comparisons, setComparisons] = useState([]);
  const [notice, setNotice] = useState("");
  // Readiness checks only; pairwise geometry runs exclusively on explicit click.
  const ready = state?.status === "ok" && state?.verification?.state === "MATCH";
  const current = result?.ok && ready && state.axis?.hitId === result.snapshot.axis.hitId
    && state.verification.corpus_id === result.origin.corpusId && state.term === result.origin.term;
  const inspect = () => { setNotice(""); setResult(inspectElsStructures(state)); };
  const pin = () => {
    const next = inspectElsStructures(state);
    if (!next.ok) { setNotice(next.reason); return; }
    const key = structureInspectionKey(next);
    if (comparisons.some(item => structureInspectionKey(item) === key)) { setNotice("תמונת המצב הזאת כבר בהשוואה."); return; }
    if (comparisons.length >= 3) { setNotice("אפשר להשוות עד שלוש תמונות מצב. הסירו אחת כדי להוסיף אחרת."); return; }
    setComparisons(items => [...items, next]); setResult(next); setNotice("נוספה תמונת מצב להשוואה זמנית.");
  };
  const restore = item => { const load = restoreElsStructureInspection(item); if (load) onRestore?.(load); };
  const names = item => new Map(item.lines.map(line => [line.occurrenceId, line]));
  const pairLabel = (relation, item) => {
    const byId = names(item); return `${byId.get(relation.a)?.term || ""} ↔ ${byId.get(relation.b)?.term || ""}`;
  };
  const summary = item => ({ parallel: item.geometry.relations.filter(r => r.latticeOffset > 0).length,
    same: item.geometry.relations.filter(r => r.latticeOffset === 0).length, intersections: item.geometry.intersections.length });
  return <section className="els29-structure-research" hidden={!visible} aria-label="מבנים והשוואת מופעים">
    <h3>מבנים והשוואת מופעים</h3>
    <p>בדיקת הקשרים בין הציר לממצאים שבחרתם, ובין הממצאים עצמם. ללא AI וללא טעינת מילון. אינה מחפשת מילים חדשות.</p>
    <div className="els29-structure-actions">
      <button type="button" disabled={busy || !ready} onClick={inspect}>בדוק מבנים בממצאים שנבחרו</button>
      <button type="button" disabled={busy || !ready} onClick={pin}>הוסף את המופע להשוואה</button>
    </div>
    {notice ? <p role="status">{notice}</p> : null}
    {result?.ok === false ? <p role="alert">{result.reason}</p> : null}
    {result?.ok ? <div aria-label="תוצאת בדיקת המבנים">
      <h4><bdi>{result.snapshot.term}</bdi> · דילוג <bdi>{result.origin.skip}</bdi></h4>
      <p>{result.lines.length} מופעים נבחרים נבדקו, כולל הציר · {result.lines.filter(l => l.kind === "source").length} רצפי מקור. טקסט רגיל מובחן מ־ELS.</p>
      <p>המופעים נבדקים במלואם, גם אם חלק מאותיותיהם מחוץ לחלון או מוסתרות במסנן המרחק.</p>
      <p>{summary(result).parallel} זוגות מקבילים · {summary(result).same} זוגות על אותו קו · {summary(result).intersections} זוגות בעלי אות משותפת.</p>
      <p>זו תמונת מצב מזמן הלחיצה, לא דירוג חוזק ולא כיסוי של כל המילים במטריצה. שינויים בסימונים דורשים בדיקה חדשה.</p>
      {!current ? <p role="status">המטריצה הפעילה שונה מתוצאת הבדיקה הזאת.</p> : null}
      {result.excluded ? <p>{result.excluded} מופעים עם זהות לא תקינה לא נבדקו.</p> : null}
      {result.lines.length === 1 ? <p>בחרו ממצאים במטריצה כדי לבדוק את היחסים ביניהם.</p> : null}
      <details><summary>קווים מקבילים וקווים משותפים ({result.geometry.relations.length})</summary>
        <p>מוצגים עד 60 זוגות; הסיכום כולל את כל הזוגות שנבדקו.</p>
        {result.geometry.relations.slice(0,60).map(r => <article key={`${r.a}:${r.b}`}>
          <strong><bdi>{pairLabel(r,result)}</bdi></strong>
          <p>{r.latticeOffset === 0 ? "על אותו קו — לא שתי מקבילות נפרדות" : "מקבילות מדויקת"} · היסט סריג <bdi>{r.latticeOffset}</bdi> · {r.support.count} נקודות תמיכה משותפות.</p>
          {!r.support.count ? <p>אין תמיכה חופפת במדגם האותיות; אין להסיק שהמילים ניצבות זו לצד זו.</p> : null}
        </article>)}
      </details>
      <details><summary>אותיות משותפות ({result.geometry.intersections.length})</summary>
        <p>מוצגים עד 60 זוגות; הסיכום כולל את כל הזוגות שנבדקו.</p>
        {result.geometry.intersections.slice(0,60).map(r => <article key={`${r.a}:${r.b}`}><strong><bdi>{pairLabel(r,result)}</bdi></strong>
          <p>{r.positions.length} אותיות משותפות · כולל חפיפות וקטעי אותו ציר; אינם אישורים עצמאיים.</p></article>)}
      </details>
      <details><summary>המופעים שנבדקו והסימון במטריצה</summary>
        {result.lines.map(line => <button key={line.occurrenceId} type="button" disabled={busy || !current || line.kind === "axis"
          || !state.findings?.some(f => f.t === line.term && [...(f.hits || []),...(f.sourceHits || [])].some(h => h.hitId === line.hitId && h.shown && h.withinRadius !== false))}
          onClick={() => onFocus?.({term:line.term,hitId:line.hitId,scope:result.origin.corpus,axisHitId:result.snapshot.axis.hitId})}><bdi>{line.term}</bdi> · {line.kind === "source" ? "טקסט מקור" : line.kind === "axis" ? "הציר" : "ELS"}</button>)}
      </details>
    </div> : null}
    <h4>השוואה זמנית · {comparisons.length}/3</h4>
    <p>פתחו מופע אחר והוסיפו גם אותו. ההשוואה אינה מפעילה חיפוש אוטומטי. נשמרת במעבר בין קלאסי למחקר, אך לא ביציאה מהדף או ברענון.</p>
    <div className="els29-structure-comparisons">{comparisons.map((item, index) => <article key={structureInspectionKey(item)}>
      <h4><bdi>{item.snapshot.term}</bdi></h4>
      <p>{item.origin.corpus === "torah" ? "תורה" : "תנ״ך"} · דילוג <bdi>{item.origin.skip}</bdi> · {item.origin.dir < 0 ? "לאחור" : "קדימה"} · מיקום (מ־0) <bdi>{item.origin.start}</bdi></p>
      <p>חלון: {item.window.r1-item.window.r0+1} שורות × {item.window.cw} עמודות · {item.lines.length} מופעים נבחרים.</p>
      <p>{summary(item).parallel} זוגות מקבילים · {summary(item).same} על אותו קו · {summary(item).intersections} בעלי אות משותפת.</p>
      <button type="button" disabled={busy || !onRestore} onClick={() => restore(item)}>פתח תמונת מצב {index+1}</button>
      <button type="button" onClick={() => setComparisons(items => items.filter(x => x !== item))}>הסר תמונת מצב {index+1}</button>
    </article>)}</div>
    {comparisons.length > 1 ? <p>מספרים גדולים יותר אינם בהכרח טובים יותר: החלון, הטקסט והבחירה עשויים להיות שונים. לא חושבה מובהקות או עצמאות בין המופעים.</p> : null}
  </section>;
}
