import React from "react";
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

export default function ElsGuidedMatrixSnapshot2029({ snapshot, currentHitId, onOpen, onAddSupports }) {
  if (snapshot?.contract !== "els_guided_matrix_snapshot_v1" || !snapshot.items?.length) return null;
  return <section className="els29-smart-snapshot" data-els-smart-matrix-snapshot="v1" aria-label="תמונת המטריצה החכמה">
    <header>
      <div><small>תמונת המטריצה</small><h3>מה הכי חזק סביב הציר עכשיו</h3></div>
      <span>{snapshot.returnedCount} מתוך {snapshot.attentionLimit}</span>
    </header>
    <p className="els29-smart-snapshot-intro">רק מבנים ומופעים שעברו אימות קנוני. הדירוג משלב גיאומטריה, הקשר, חזרה ומקור — לעולם לא מספר דילוג לבדו.</p>
    <div className="els29-smart-snapshot-list">
      {snapshot.items.map(item => <article key={item.id} className={item.rank === 1 ? "is-primary" : ""} data-snapshot-kind={item.kind}>
        <div className="els29-smart-snapshot-rank" aria-label={`דירוג ${item.rank}`}>{item.rank}</div>
        <div className="els29-smart-snapshot-body">
          <div className="els29-smart-snapshot-title"><div><small>{statusLabel(item)}</small><h4>{item.title}</h4></div><span>{geometryLabel(item.geometry)}</span></div>
          <p><b>אותיות מדויקות:</b> <bdi>{item.exactTerms.join(" · ")}</bdi></p>
          {item.sourceRefs?.length ? <p><b>מקור:</b> {item.sourceRefs.join(" · ")}</p> : null}
          <ul aria-label="סיבות לדירוג">{item.reasons.map(reason => <li key={reason}>{reason}</li>)}</ul>
          <small className="els29-smart-snapshot-truth">האימות חל על האותיות והמיקום. הקשר ומשמעות נשארים פרשנות לבדיקה.</small>
          <div className="els29-smart-snapshot-actions">
            <button type="button" onClick={() => onOpen(item.occurrence)}>פתח את מופע הציר</button>
            {item.kind === "verified-pair" ? <button type="button" disabled={currentHitId !== item.occurrence.hitId}
              onClick={() => onAddSupports(item.supports)}>{currentHitId === item.occurrence.hitId ? "הוסף את שני הממצאים" : "פתחו את המופע כדי להוסיף"}</button> : null}
          </div>
        </div>
      </article>)}
    </div>
    {snapshot.candidateOnlyCount ? <small className="els29-smart-snapshot-advanced">עוד {snapshot.candidateOnlyCount} מועמדים לא מאומתים נשמרו תחת „מתקדם” ואינם נספרים כאן.</small> : null}
  </section>;
}
