import React, { useEffect, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { elsLexiconWindowKey, prepareElsLexiconFinding } from "../../lib/research/elsLexiconResearch.js";
import "./elsLexiconResearch2029.css";

const errors = {
  "window-too-large": "חלון המחקר גדול מתקציב הסריקה. הקטינו אותו ונסו שוב.",
  "lexicon-unavailable": "אוצר הלשון לא נטען או לא עבר בדיקת תקינות. לא בוצעה סריקה.",
  "results-changed": "המופע השתנה. הפעילו סריקה חדשה במפורש.",
  "scan-failed": "הסריקה לא הושלמה. אין להסיק מכך שאין מילים באזור.",
};
const sources = { canonical_tanakh_words: "מילות התנ״ך", maftech_core_snapshot: "מילון הליבה" };

export default function ElsLexiconResearch2029({ state, visible, busy, response, onRequest, onRestore, color }) {
  const [run, setRun] = useState(null), [result, setResult] = useState(null), [notice, setNotice] = useState("");
  const [page, setPage] = useState(0), [kind, setKind] = useState("els");
  const active = useRef(null), request = useRef(onRequest); request.current = onRequest;
  const key = elsLexiconWindowKey(state);
  const cancel = (message = "הסריקה נעצרה. אפשר להתחיל שוב בלחיצה.") => {
    if (!active.current) return;
    request.current({ ...active.current.target, cancel: true }); active.current = null; setRun(null); setNotice(message);
  };
  useEffect(() => {
    if (active.current && (!visible || busy || key !== active.current.key)) cancel("הסריקה נעצרה בעקבות שינוי המסך או המופע; לא הוחלפו תוצאות.");
  }, [visible, busy, key]);
  useEffect(() => () => {
    if (active.current) request.current({ ...active.current.target, cancel: true });
    active.current = null;
  }, []);
  useEffect(() => {
    if (!run) return;
    const timer = setTimeout(() => cancel("הטעינה או הסריקה לא הסתיימו בזמן. הפעולה בוטלה; אפשר לנסות שוב במפורש."), 45000);
    return () => clearTimeout(timer);
  }, [run?.target.scanId]);
  useEffect(() => {
    if (!active.current || response?.target?.scanId !== active.current.target.scanId || active.current.key !== key) return;
    if (response.pending) { setRun(current => ({ ...current, progress: response })); return; }
    const runKey = active.current.key; active.current = null; setRun(null);
    if (!response.ok) { setNotice(errors[response.reason] || errors["scan-failed"]); return; }
    setResult({ key: runKey, data: response }); setPage(0); setNotice("");
  }, [response, key]);
  const start = () => {
    if (!visible || busy || !key || active.current) return;
    const target = { scanId: crypto.randomUUID(), hitId: state.axis.hitId, scope: state.scope };
    const next = { key, target }; active.current = next; setRun(next); setResult(null); setNotice(""); onRequest(target);
  };
  const data = result?.data, current = result?.key === key && !!key;
  const rows = (data?.items || []).filter(item => item.kind === kind), slice = rows.slice(page * 20, page * 20 + 20);
  const add = item => {
    if (!current || busy || run) return;
    const load = prepareElsLexiconFinding(state, data, item, color);
    if (!load) { setNotice("לא ניתן להוסיף: בדקו את המופע ואת מגבלת 12 המילים במטריצה."); return; }
    onRestore?.(load); setNotice("המילה נשלחה לאימות ולבחירת המופע המדויק. עקבו אחר מצב האימות והממצאים במטריצה.");
  };
  return <section hidden={!visible} className="els29-lexicon-research" aria-label="מילים במטריצה">
    <h3>מילים במטריצה</h3>
    <p>התאמות מדויקות לאוצר הלשון בחלון המחקר הפעיל. שורות, טורים ושני האלכסונים, קדימה ואחורה, באותיות צמודות על הקו. ללא AI.</p>
    <details><summary>היקף הסריקה והמגבלות</summary>
      <p>5–10 אותיות · עד 8,192 תאים, 256 שורות ו־129 עמודות · עד 100,000 בדיקות רצף ו־300 התאמות · עד 10 שניות חישוב לאחר הטעינה.</p>
      <p>המילון נטען רק בלחיצה. הסריקה אינה מקיפה את כל התורה, את כל הדילוגים או כל ביטוי עברי. שמות וכתיבים שאינם במילון עלולים להחמיץ; אפשר לחפש אותם ידנית.</p>
    </details>
    <button type="button" disabled={!key || busy || !!run} onClick={start}>סרוק מילים בחלון המחקר</button>
    {run ? <CanonicalProgress compact title="סריקה מילונית" phase={run.progress?.phase === "scan" ? "בודק קווים בחלון" : "טוען ומאמת את אוצר הלשון"}
      current={run.progress?.coverage?.completedRays ?? null} total={run.progress?.coverage?.totalRays ?? null} onCancel={() => cancel()} /> : null}
    <p role="status">{notice || (!key ? "בחרו מופע מאומת לפני סריקה." : "התוצאות זמניות בעמוד זה. מעבר למצב אחר עוצר סריקה פעילה; אין כאן משימת רקע מתמשכת.")}</p>
    {data ? <div aria-label="תוצאות הסריקה המילונית">
      <p>המופע שנסרק: <bdi>{data.origin.term}</bdi> · {data.origin.corpus === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{data.origin.skip}</bdi> · התחלה <bdi>{data.origin.start}</bdi>.</p>
      {!current ? <p role="note">התוצאה שייכת לחלון קודם. סרקו את החלון הנוכחי לפני הוספת ממצא.</p> : null}
      <p>{data.coverage.complete ? "הסריקה המוגדרת הושלמה" : "סריקה חלקית — הושגה תקרת החישוב או התוצאות"}: {data.coverage.completedRays}/{data.coverage.totalRays} קווים · {data.coverage.windows} רצפים נבדקו · {data.items.length} התאמות נשמרו.</p>
      <p>הסריקה מצאה התאמות לאותיות, לא דירוג של משמעות או נדירות. חלקי הציר ({data.coverage.axisFragments}) לא נספרו כממצאים חדשים. ממצא מתווסף רק אחרי בדיקת המנוע.</p>
      <details><summary>מקור וגבולות</summary><p>אוצר: מילות התנ״ך ומילון הליבה, {data.lexicon.entryCount} ערכים. התאמה מדויקת לאחר נרמול אותיות סופיות; אין השלמת אותיות.</p>
        <p>רוחב מטריצה {data.box.S}; שורות {data.box.r0}–{data.box.r1}, עמודות {data.box.c0}–{data.box.c1} (ספירה מאפס). חלון המחקר עשוי להיות גדול מהחלק המוצג במסך.</p>
        <p>סדר ההצגה: קרבה לציר, אורך, מילה ומיקום. התקרה נשמרת לפי סדר הסריקה; זו אינה הבטחה שכל הממצאים נמצאו.</p>
      </details>
      <label>סוג התוצאות <select value={kind} onChange={event => { setKind(event.target.value); setPage(0); }}>
        <option value="els">מילים בדילוג ({data.items.filter(item => item.kind === "els").length})</option>
        <option value="source">רצפי מקור ({data.items.filter(item => item.kind === "source").length})</option>
      </select></label>
      {!rows.length ? <p>לא נמצאו התאמות מסוג זה במסגרת הסריקה שבוצעה.</p> : null}
      <ol>{slice.map(item => {
        const finding = state?.findings?.find(f => f.t === item.term);
        const added = [...(finding?.hits || []), ...(finding?.sourceHits || [])].some(hit => hit.hitId === item.hitId && hit.selected);
        return <li key={`${item.term}:${item.hitId}`}><strong>{item.label}</strong><p>דילוג <bdi>{item.skip}</bdi> · {item.dir < 0 ? "אחורה" : "קדימה"} · התחלה <bdi>{item.start}</bdi> · {item.lexiconSources.map(source => sources[source] || source).join(" + ")}</p>
          <button type="button" disabled={!current || busy || !!run || added || !onRestore} onClick={() => add(item)}>{added ? "נבחר במטריצה" : `בדוק והוסף ${item.label}`}</button>
        </li>;
      })}</ol>
      {rows.length > 20 ? <nav aria-label="עמודי תוצאות מילוניות"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>הקודם</button><span>עמוד {page + 1} מתוך {Math.ceil(rows.length / 20)}</span><button type="button" disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(page + 1)}>הבא</button></nav> : null}
    </div> : null}
  </section>;
}
