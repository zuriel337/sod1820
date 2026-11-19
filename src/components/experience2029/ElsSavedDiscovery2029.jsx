import React, { useMemo, useState } from "react";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { buildSavedElsDiscovery, readSavedElsDiscovery, elsSavedDiscoveryMatches, elsSavedDiscoveryReturn } from "../../lib/research/elsSavedDiscovery.js";

// Uses the existing principal-scoped library. Opening a snapshot has no transport.
export default function ElsSavedDiscovery2029({ runs, state, busy, discoveryId, onRestore, onOpen }) {
  const research = useResearch();
  const [chosen, setChosen] = useState(null), [notice, setNotice] = useState("");
  const [page, setPage] = useState(0);
  const saved = useMemo(() => (research.saved || []).map(readSavedElsDiscovery).filter(Boolean), [research.saved]);
  const selected = saved.find(item => item.id === (chosen || discoveryId));
  const scan = selected?.scan;
  const matching = !!scan && elsSavedDiscoveryMatches(scan, state);
  const save = run => {
    const built = buildSavedElsDiscovery(run);
    if (!built.ok) { setNotice(built.reason === "too-large"
      ? "הסריקה גדולה מתקציב השמירה הקיים. היא לא נשמרה ולא קוצרה; התוצאות עדיין זמינות בעמוד."
      : "לא ניתן לשמור: חסר הקשר מקור תקין לסריקה. התוצאות בעמוד לא נמחקו."); return; }
    const ok = research.saveItem?.(built.entity);
    setNotice(ok ? "סריקת הגילוי נשמרה מקומית בספריית המחקר." : "השמירה לא הצליחה. התוצאות עדיין זמינות בעמוד.");
    if (ok) { setChosen(built.entity.id); setPage(0); }
  };
  const sync = research.syncStatus;
  return <details className="els29-discovery-saved" open={!!selected || !!discoveryId || undefined}>
    <summary>שמירת סריקות · בבנייה · {saved.length} שמורות</summary>
    <p role="note">אזור השמירות בבנייה. שמירת סריקה שונה משמירת המטריצה ומהוספת ממצא למחקר. אין להסתמך על שמירה שלא התקבל עליה אישור מפורש.</p>
    <p>שמירה מפורשת שומרת את המועמדים, התכנית והכיסוי של כל מסלול בנפרד. פתיחת תוצאה אינה מתחילה גילוי או AI.</p>
    {Object.values(runs).filter(run => run?.source && !run.data.savedSnapshot).map(run => <div key={run.id}>
      <button type="button" disabled={busy || !research.saveItem} onClick={() => save(run)}>
        שמור {run.data.plan.mode === "language" ? "ביטויים" : "מילים"} · {run.source.origin.term}
      </button>
      <small> {run.data.items.length} מועמדים · {run.data.coverage.complete ? "הסריקה המוגדרת הושלמה" : "כיסוי חלקי"}</small>
    </div>)}
    {notice ? <p role="status">{notice}</p> : null}
    <p>{sync === "synced" && !research.syncPending && !research.syncAwaitingAction ? "הספרייה מסונכרנת לחשבון."
      : sync === "local_only" || !sync ? "שמירה מקומית בדפדפן הזה בלבד."
      : ["error", "conflict", "local_error", "local_recovery_required"].includes(sync) ? "לא התקבל אישור סנכרון מהשרת. בדקו את מצב הספרייה באזור האישי."
      : "הסנכרון לחשבון עדיין לא אושר."}</p>
    {saved.length ? <ul>{saved.map(item => <li key={item.id}>
      <button type="button" aria-pressed={selected?.id === item.id} onClick={() => { setChosen(item.id); setNotice(""); setPage(0); }}>{item.title}</button>
    </li>)}</ul> : <p>אין סריקות שמורות זמינות בחשבון הנוכחי.</p>}
    {discoveryId && !selected ? <p role="status">התוצאה המבוקשת אינה זמינה בספרייה הנוכחית, או שהטעינה טרם הסתיימה. לא הופעלה סריקה.</p> : null}
    {scan ? <section aria-label="סריקת גילוי שמורה">
      <h4>{selected.title}</h4>
      <p>תוצאה היסטורית · {scan.data.coverage.complete ? "הסריקה המוגדרת הושלמה" : "כיסוי חלקי — לא כל החלון נבדק"} · {scan.data.items.length} מועמדים.</p>
      <p>התחלה: <time>{scan.startedAt}</time> · סיום: <time>{scan.endedAt}</time></p>
      <p>{scan.source.origin.corpus === "tanakh" ? "תנ״ך" : "תורה"} · גרסת קורפוס <bdi>{scan.source.origin.corpusId}</bdi> · דילוג {scan.source.origin.skip} · כיוון {scan.source.origin.dir === 1 ? "קדימה" : "אחורה"} · התחלה {scan.source.origin.start}.</p>
      <p>רוחב שורה {scan.source.box.S} · רווח שורות {scan.source.rowGap} · שורות {scan.source.box.r0}–{scan.source.box.r1}, עמודות {scan.source.box.c0}–{scan.source.box.c1} (מאפס).</p>
      <p>{scan.data.coverage.completedRays}/{scan.data.coverage.totalRays} קווים נבדקו · סיבת סיום: <bdi>{scan.data.coverage.stop}</bdi>.</p>
      <p>נשמרו מועמדים והצעות חלוקה, לא אישור משמעות או ציון איכות. קווים גולמיים וכלי השערות החלוקה אינם נשמרים בגרסה זו. נקודת המשך של המנוע אינה נשמרת.</p>
      <button type="button" disabled={busy || !onRestore} onClick={() => onRestore(elsSavedDiscoveryReturn(scan))}>חזור למטריצה של הסריקה · אימות במנוע</button>
      <p>{!scan.source.returnSnapshot ? "נשמר המופע בלבד; תצוגת המקור אינה זמינה לשחזור."
        : scan.source.returnSnapshot.matrixProjection ? "החזרה כוללת את רווח השורות, גבולות החלון, הזום והסימונים הנתמכים."
        : "החזרה כוללת מופע, גודל חלון, זום וסימונים. מיקום הגלילה המדויק בחלון הרגיל אינו מובטח; גבולות הסריקה מוצגים למעלה."}</p>
      <button type="button" disabled={busy || !matching} onClick={() => onOpen(scan)}>צרף לכלי הגילוי ללא סריקה</button>
      {!matching ? <p>הוספה לכלי הגילוי זמינה רק במופע, בגרסת הקורפוס ובגבולות החלון המקוריים.</p> : null}
      <details><summary>המועמדים שנשמרו · {scan.data.items.length}</summary>
        <ul>{scan.data.items.slice(page * 20, (page + 1) * 20).map((item, i) => <li key={`${item.hitId}:${item.term}:${i}`}><bdi>{item.label || item.term}</bdi> · דילוג {item.skip} · התחלה {item.start} · מועמד לאימות</li>)}</ul>
        {scan.data.items.length > 20 ? <nav aria-label="עמודי מועמדים שמורים">
          <button type="button" disabled={page === 0} onClick={() => setPage(value => value - 1)}>הקודם</button>
          <span>עמוד {page + 1} מתוך {Math.ceil(scan.data.items.length / 20)}</span>
          <button type="button" disabled={(page + 1) * 20 >= scan.data.items.length} onClick={() => setPage(value => value + 1)}>הבא</button>
        </nav> : null}
      </details>
    </section> : null}
  </details>;
}
