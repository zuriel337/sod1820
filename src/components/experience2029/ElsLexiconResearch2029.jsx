import React, { useEffect, useRef, useState } from "react";
import CanonicalProgress from "../CanonicalProgress.jsx";
import { elsLexiconWindowKey, prepareElsLexiconFindings } from "../../lib/research/elsLexiconResearch.js";
import { groupElsLexiconDiscoveries, ELS_DISCOVERY_GROUP_LABELS } from "../../lib/research/elsStructureInspection.js";
import ElsStructureResearch2029 from "./ElsStructureResearch2029.jsx";
import "./elsLexiconResearch2029.css";

const errors = {
  "window-too-large": "חלון המחקר גדול מתקציב הסריקה. הקטינו אותו ונסו שוב.",
  "lexicon-unavailable": "אוצר הלשון לא נטען או לא עבר בדיקת תקינות. לא בוצעה סריקה.",
  "results-changed": "המופע השתנה. הפעילו סריקה חדשה במפורש.",
  "scan-failed": "הסריקה לא הושלמה. אין להסיק מכך שאין מילים באזור.",
};
const sources = { canonical_tanakh_words: "מילות התנ״ך", maftech_core_snapshot: "מילון הליבה" };

export default function ElsLexiconResearch2029({ state, visible, busy, response, onRequest, onRestore, color, onFocus, onFindWords }) {
  const [run, setRun] = useState(null), [result, setResult] = useState(null), [notice, setNotice] = useState("");
  const [page, setPage] = useState(0), [kind, setKind] = useState("groups"), [groupType, setGroupType] = useState("all");
  const [inspectionVisited, setInspectionVisited] = useState(false);
  const scanButton = useRef(null);
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
    setResult({ key: runKey, data: { ...response, structures: groupElsLexiconDiscoveries(state, response) } }); setPage(0); setNotice("");
  }, [response, key]);
  const start = () => {
    if (!visible || busy || !key || active.current) return;
    const target = { scanId: crypto.randomUUID(), hitId: state.axis.hitId, scope: state.scope };
    const next = { key, target }; active.current = next; setRun(next); setResult(null); setNotice(""); onRequest(target);
  };
  const data = result?.data, current = result?.key === key && !!key;
  const groups = data?.structures?.groups || [];
  const rows = kind === "groups" ? groups.filter(group => groupType === "all" || group.types.includes(groupType))
    : (data?.items || []).filter(item => item.kind === kind);
  const slice = rows.slice(page * 20, page * 20 + 20);
  const isAdded = item => {
    const finding = state?.findings?.find(f => f.t === item.term);
    return [...(finding?.hits || []), ...(finding?.sourceHits || [])].some(hit => hit.hitId === item.hitId && hit.selected && (item.kind === "source" || hit.verified));
  };
  const add = items => {
    if (!current || busy || run) return;
    const load = prepareElsLexiconFindings(state, data, items, color);
    if (!load) { setNotice("לא ניתן להוסיף: בדקו את המופע ואת מגבלת 12 המילים במטריצה."); return; }
    onRestore?.(load); setNotice("המופעים נשלחו יחד לאימות ולסימון על אותה מטריצה. רק מופעים שיעברו את בדיקת המנוע יוצגו; עקבו אחר מצב האימות.");
  };
  return <section hidden={!visible} className="els29-lexicon-research" aria-label="גילוי וקשרים במטריצה">
    <h3>גילוי וקשרים במטריצה</h3>
    <p>גלו מילים וקשרים בחלון הנוכחי, ובחרו קבוצה לבדיקה ולסימון על אותה מטריצה. ללא AI.</p>
    <details><summary>היקף הסריקה והמגבלות</summary>
      <p>5–10 אותיות · עד 8,192 תאים, 256 שורות ו־129 עמודות · עד 100,000 בדיקות רצף ו־300 התאמות · עד 10 שניות חישוב לאחר הטעינה.</p>
      <p>המילון נטען רק בלחיצה. הסריקה אינה מקיפה את כל התורה, את כל הדילוגים או כל ביטוי עברי. שמות וכתיבים שאינם במילון עלולים להחמיץ; אפשר לחפש אותם ידנית.</p>
      <p>שורות, טורים ושני האלכסונים בשני הכיוונים. קבוצות נבנות רק מההתאמות שנשמרו: מקבילות עד 8 תאים עם תמיכה משותפת, המשכים עד 3 תאים, חיתוכים, חזרות, מסדרונות ואשכולות של 3 מופעים ומעלה עד 4 תאים בין כל זוג. עד 240 קבוצות, עד 8 מופעים בקבוצה.</p>
    </details>
    <div className="els29-discovery-actions">
      <button ref={scanButton} type="button" disabled={!key || busy || !!run} onClick={start}>גלה מילים ומבנים</button>
      {onFindWords ? <button type="button" disabled={!key || busy || !!run} onClick={onFindWords}>חפש מילה מסוימת</button> : null}
    </div>
    {run ? <CanonicalProgress compact title="סריקה מילונית" phase={run.progress?.phase === "scan" ? "בודק קווים בחלון" : "טוען ומאמת את אוצר הלשון"}
      current={run.progress?.coverage?.completedRays ?? null} total={run.progress?.coverage?.totalRays ?? null} onCancel={() => cancel()} /> : null}
    <p role="status">{notice || (!key ? "בחרו מופע מאומת לפני סריקה." : !data ? "הסריקה מתחילה רק בלחיצה. התוצאות זמניות בעמוד זה; מעבר מצב עוצר סריקה פעילה." : "")}</p>
    {data ? <div aria-label="תוצאות הסריקה המילונית">
      <p>המופע שנסרק: <bdi>{data.origin.term}</bdi> · {data.origin.corpus === "tanakh" ? "תנ״ך" : "תורה"} · דילוג <bdi>{data.origin.skip}</bdi>.</p>
      {!current ? <p role="note">התוצאה שייכת לחלון קודם. סרקו את החלון הנוכחי לפני הוספת ממצא.</p> : null}
      <p>{data.coverage.complete ? "הסריקה המוגדרת הושלמה" : "סריקה חלקית — הושגה תקרת החישוב או התוצאות"} · {data.items.length} מילים · {groups.length} קבוצות להצגה.</p>
      <p>הקבוצות הן מועמדות לבדיקה. הוספה למטריצה עוברת אימות במנוע.</p>
      {!data.structures?.ok ? <p role="status">{data.structures?.reason}</p> : null}
      {data.structures?.truncated ? <p>מוצג מדגם של עד 240 קבוצות מכל סוגי הקשרים שנמצאו. בחרו סוג קשר למיקוד; המספרים מציינים כמה מוצגות מתוך הקבוצות שנבנו.</p> : null}
      {data.structures?.excluded ? <p>{data.structures.excluded} התאמות עם זהות או מיקום לא שלמים לא צורפו לקבוצות.</p> : null}
      <details><summary>מקור, כיסוי וגבולות</summary>
        <p>התחלת הציר: <bdi>{data.origin.start}</bdi>. {data.coverage.completedRays}/{data.coverage.totalRays} קווים · {data.coverage.windows} רצפים נבדקו. התוצאות זמניות בעמוד זה ולא נשמרות ברענון.</p>
        <p>הסריקה מצאה התאמות לאותיות, לא דירוג של משמעות או נדירות. חלקי הציר ({data.coverage.axisFragments}) לא נספרו כממצאים חדשים.</p>
        <p>{groups.length} קבוצות מוצגות מתוך {data.structures?.totalGroups ?? 0} שנבנו מאותן מילים. קשרים מבניים מוצגים לפני אשכולות של קרבה בלבד; בתוך כל סוג — קרבה לציר ואז מספר המופעים. זה סדר תצוגה, לא ציון חוזק.</p>
        <p>אוצר: מילות התנ״ך ומילון הליבה, {data.lexicon.entryCount} ערכים. התאמה מדויקת לאחר נרמול אותיות סופיות; אין השלמת אותיות.</p>
        <p>רוחב מטריצה {data.box.S}; שורות {data.box.r0}–{data.box.r1}, עמודות {data.box.c0}–{data.box.c1} (ספירה מאפס). חלון המחקר עשוי להיות גדול מהחלק המוצג במסך.</p>
        <p>סדר ההצגה: קרבה לציר, אורך, מילה ומיקום. התקרה נשמרת לפי סדר הסריקה; זו אינה הבטחה שכל הממצאים נמצאו.</p>
      </details>
      <label>סוג התוצאות <select aria-label="סוג התוצאות" value={kind} onChange={event => { setKind(event.target.value); setPage(0); }}>
        <option value="groups">קבוצות ומבנים ({groups.length})</option>
        <option value="els">מילים בדילוג ({data.items.filter(item => item.kind === "els").length})</option>
        <option value="source">רצפי מקור ({data.items.filter(item => item.kind === "source").length})</option>
      </select></label>
      {kind === "groups" ? <label>סוג הקשר <select aria-label="סוג הקשר" value={groupType} onChange={event => { setGroupType(event.target.value); setPage(0); }}>
        <option value="all">כל הקשרים</option>
        {Object.entries(ELS_DISCOVERY_GROUP_LABELS).map(([value, label]) => {
          const shown = groups.filter(group => group.types.includes(value)).length, total = data.structures?.typeCounts?.[value] ?? shown;
          return <option key={value} value={value}>{label} ({shown === total ? shown : `${shown} מתוך ${total}`})</option>;
        })}
      </select></label> : null}
      {!rows.length ? <p>{kind === "groups" ? "לא נבנו קבוצות מסוג זה מתוך ההתאמות שנשמרו. אפשר לעבור לתצוגת המילים או לחפש מילה ידנית; זה אינו אומר שאין מבנים בטקסט." : "לא נמצאו התאמות מסוג זה במסגרת הסריקה שבוצעה."}</p> : null}
      <ol>{slice.map(item => {
        if (kind === "groups") return <li key={item.id}>
          <strong>{item.types.map(type => ELS_DISCOVERY_GROUP_LABELS[type]).join(" · ")}</strong>
          <p>{item.includesAxis ? <><bdi>{data.origin.term}</bdi> · </> : null}{item.items.map((word, index) => <React.Fragment key={`${word.term}:${word.hitId}`}>{index ? " · " : ""}<bdi>{word.label || word.term}</bdi></React.Fragment>)}</p>
          <details><summary>מה מחבר ביניהם?</summary>{item.reasons.map(reason => <p key={reason}>{reason}</p>)}
            {item.items.map(word => <p key={`${word.term}:${word.hitId}`}><bdi>{word.label || word.term}</bdi> · {word.kind === "source" ? "רצף מקור" : "ELS"} · דילוג <bdi>{word.skip}</bdi> · התחלה <bdi>{word.start}</bdi> · {word.dir < 0 ? "אחורה" : "קדימה"}</p>)}
          </details>
          {item.membersTruncated ? <p>מוצגים עד 8 מתוך {item.totalMembers} מופעים בקבוצה; ההוספה בודקת רק את המוצגים.</p> : null}
          <button type="button" disabled={!current || busy || !!run || item.items.every(isAdded) || !onRestore} onClick={() => add(item.items)}>{item.items.every(isAdded) ? "הקבוצה נבחרה במטריצה" : "אמת והצג קבוצה"}</button>
        </li>;
        const added = isAdded(item);
        return <li key={`${item.term}:${item.hitId}`}><strong>{item.label}</strong><p>דילוג <bdi>{item.skip}</bdi> · {item.dir < 0 ? "אחורה" : "קדימה"} · התחלה <bdi>{item.start}</bdi> · {item.lexiconSources.map(source => sources[source] || source).join(" + ")}</p>
          <button type="button" disabled={!current || busy || !!run || added || !onRestore} onClick={() => add([item])}>{added ? "נבחר במטריצה" : `בדוק והוסף ${item.label}`}</button>
        </li>;
      })}</ol>
      {rows.length > 20 ? <nav aria-label="עמודי תוצאות מילוניות"><button type="button" disabled={page === 0} onClick={() => setPage(page - 1)}>הקודם</button><span>עמוד {page + 1} מתוך {Math.ceil(rows.length / 20)}</span><button type="button" disabled={(page + 1) * 20 >= rows.length} onClick={() => setPage(page + 1)}>הבא</button></nav> : null}
    </div> : null}
    <details className="els29-discovery-inspection" onToggle={event => { if (event.currentTarget.open) setInspectionVisited(true); }}>
      <summary>בדיקת הסימונים והשוואת מופעים</summary>
      {inspectionVisited ? <ElsStructureResearch2029 state={state} visible={visible} busy={busy || !!run} onRestore={onRestore} onFocus={onFocus}
        onFindWords={onFindWords} onOpenLexicon={() => { scanButton.current?.scrollIntoView({ block: "center", behavior: "instant" }); scanButton.current?.focus({ preventScroll: true }); }} /> : null}
    </details>
  </section>;
}
