import React, { useRef } from "react";
import "./elsGuidedMatrixSnapshot2029.css";

const geometryLabel = value => ({
  EXACT_INTERSECTION: "חצייה מדויקת",
  PARALLEL_CLUSTER: "אשכול מקבילים",
  EXACT_PARALLEL_FAMILY: "משפחה מקבילה",
  PARALLEL_AXIS_RAY: "קרן מקבילה לציר",
  AXIS_INTERSECTING_RAY: "קרן חוצה את הציר",
  LOCAL_SAME_RAY: "אותה קרן מקומית",
  A: "מבנה מקומי צפוף",
  B: "מבנה מקומי",
})[value] || "גיאומטריה מקומית מאומתת";

const statusLabel = item => item.kind === "verified-language-relation"
  ? "המבנה אומת · המשמעות לא"
  : item.kind === "verified-pair" ? "שני ממצאים מאומתים" : "מופע מאומת";

function GuidedSourceContext({ source, pending, onHighlightVerse, verseHighlight, onReturn }) {
  if (pending) return <section className="els29-smart-source is-pending" data-els-guided-source-context="pending" aria-live="polite">
    <strong>טוען מקור ופסוקים מהמנוע הקנוני…</strong><small>אין חיפוש חדש ואין קריאת AI.</small>
  </section>;
  if (!source) return null;
  if (source.status !== "OK") return <section className="els29-smart-source is-unavailable" data-els-guided-source-context="unavailable" aria-live="polite">
    <strong>המקור לא זמין כרגע למופע המדויק הזה.</strong><small>לא הושלם טקסט חסר ולא נוצר פסוק משוער.</small>
    <button type="button" onClick={onReturn}>חזור לממצא המדורג</button>
  </section>;
  const spanLabel = source.span.fromRef === source.span.toRef ? source.span.fromRef : `${source.span.fromRef} → ${source.span.toRef}`;
  return <section className="els29-smart-source" data-els-guided-source-context="ready" data-source-hit-id={source.hitId} aria-live="polite">
    <header><div><small>מקור קנוני של מופע הציר</small><strong>{spanLabel}</strong></div><span>{source.span.count} פסוקים בטווח</span></header>
    <div className="els29-smart-source-verses">
      {source.verses.map(verse => <article key={verse.verseIndex}>
        <b>{verse.ref}</b><p>{verse.text}</p>
        <button type="button" aria-pressed={verseHighlight?.from === verse.from} onClick={() => onHighlightVerse(verse)}>הדגש פסוק במטריצה</button>
      </article>)}
    </div>
    {source.hasMore ? <small>מוצגים עד {source.visibleLimit} פסוקים מתחילת הטווח כדי לשמור על מסך שקט. הטווח המלא נשמר במקור הקנוני.</small> : null}
    <small className="els29-smart-snapshot-truth">מראה־המקום וטקסט הפסוק הגיעו מעדשת המקור הקנונית. הקשר שלהם לצופן ומשמעותם נשארים פרשנות לבדיקה.</small>
    <button type="button" onClick={onReturn}>חזור לממצא המדורג</button>
  </section>;
}

export default function ElsGuidedMatrixSnapshot2029({ snapshot, currentHitId, onOpen, onAddSupports,
  onOpenSource, onCloseSource, sourceContext, sourcePendingItemId, onHighlightVerse, verseHighlight }) {
  const itemRefs = useRef(new Map());
  if (snapshot?.contract !== "els_guided_matrix_snapshot_v1" || !snapshot.items?.length) return null;
  const returnToItem = itemId => {
    const element = itemRefs.current.get(itemId);
    if (!element) return;
    element.focus({ preventScroll: true });
    element.scrollIntoView({ block: "nearest", behavior: "smooth" });
  };
  return <section className="els29-smart-snapshot" data-els-smart-matrix-snapshot="v1" aria-label="תמונת המטריצה החכמה">
    <header>
      <div><small>תמונת המטריצה</small><h3>מה הכי חזק סביב הציר עכשיו</h3></div>
      <span>{snapshot.returnedCount} מתוך {snapshot.attentionLimit}</span>
    </header>
    <p className="els29-smart-snapshot-intro">רק מבנים ומופעים שעברו אימות קנוני. הדירוג משלב גיאומטריה, הקשר, חזרה ומקור — לעולם לא מספר דילוג לבדו.</p>
    <div className="els29-smart-snapshot-list">
      {snapshot.items.map(item => <article key={item.id} ref={element => element ? itemRefs.current.set(item.id, element) : itemRefs.current.delete(item.id)}
        className={item.rank === 1 ? "is-primary" : ""} data-snapshot-kind={item.kind} data-snapshot-item-id={item.id} tabIndex={-1}>
        <div className="els29-smart-snapshot-rank" aria-label={`דירוג ${item.rank}`}>{item.rank}</div>
        <div className="els29-smart-snapshot-body">
          <div className="els29-smart-snapshot-title"><div><small>{statusLabel(item)}</small><h4>{item.title}</h4></div><span>{geometryLabel(item.geometry)}</span></div>
          <p><b>אותיות מדויקות:</b> <bdi>{item.exactTerms.join(" · ")}</bdi></p>
          {item.sourceRefs?.length ? <p><b>מקור:</b> {item.sourceRefs.join(" · ")}</p> : null}
          <ul aria-label="סיבות לדירוג">{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          <small className="els29-smart-snapshot-truth">האימות חל על האותיות והמיקום. הקשר ומשמעות נשארים פרשנות לבדיקה.</small>
          <div className="els29-smart-snapshot-actions">
            <button type="button" onClick={() => onOpen(item.occurrence)}>פתח את מופע הציר</button>
            <button type="button" aria-expanded={sourceContext?.itemId === item.id || sourcePendingItemId === item.id}
              disabled={sourcePendingItemId === item.id} onClick={() => onOpenSource?.(item)}>מקור ופסוקים</button>
            {item.kind === "verified-pair" ? <button type="button" disabled={currentHitId !== item.occurrence.hitId}
              onClick={() => onAddSupports(item.supports)}>{currentHitId === item.occurrence.hitId ? "הוסף את שני הממצאים" : "פתחו את המופע כדי להוסיף"}</button> : null}
          </div>
          <GuidedSourceContext source={sourceContext?.itemId === item.id ? sourceContext : null} pending={sourcePendingItemId === item.id}
            onHighlightVerse={onHighlightVerse} verseHighlight={verseHighlight} onReturn={() => { onCloseSource?.();returnToItem(item.id); }} />
        </div>
      </article>)}
    </div>
    {snapshot.candidateOnlyCount ? <small className="els29-smart-snapshot-advanced">עוד {snapshot.candidateOnlyCount} מועמדים לא מאומתים נשמרו תחת „מתקדם” ואינם נספרים כאן.</small> : null}
  </section>;
}
