import React from "react";
import "./elsQualityMeter2029.css";

// 2029 surface for four engine outputs that Classic showed only in its own UI (register D03, E03, E04, E07).
// Display only: every number comes from state.qualityDetail / state.provenance.quality, which the engine computes
// (qualityCalc, notable, runMonteCarlo). Nothing is recomputed here, nothing is saved, and nothing is a verdict:
// the star score is the engine's heuristic estimate, and the only measured figure is the optional Monte-Carlo run.
// It is NOT the lattice geometry of ElsStructureResearch2029 (a different measure, kept beside it).
export const ANGLE_KINDS = Object.freeze([
  { kind: "vertical", label: "אנכי: אותה עמודה במטריצה", hint: "הדילוג מתחלק ברוחב המטריצה" },
  { kind: "diagonal", label: "אלכסון מקביל", hint: "הדילוג קרוב לכפולה של רוחב המטריצה (עד שני תאים)" },
  { kind: "row", label: "שורה חוצה", hint: "דילוג 1: קריאה ישרה של הטקסט" },
  { kind: "other", label: "ללא יחס למטריצה", hint: "אינו מקביל לציר ואינו שורה" },
]);

const stars = n => "★".repeat(Math.max(0, Math.min(5, n | 0))) + "☆".repeat(5 - Math.max(0, Math.min(5, n | 0)));
const direction = value => value === "back" ? "לאחור" : "קדימה";

export default function ElsQualityMeter2029({ state, onRunMc, busy = false }) {
  const detail = state?.qualityDetail;
  const quality = state?.provenance?.quality;
  const ready = state?.status === "ok" && state?.verification?.state === "MATCH";
  if (!ready || !detail?.estimate) {
    return <section className="els29-quality" aria-label="איכות הצופן, דילוגים מיוחדים וזוויות" data-els-quality="idle">
      <h3>איכות הצופן, דילוגים מיוחדים וזוויות</h3>
      <p className="els29-quality-muted">הנתונים מופיעים אחרי שנפתח ציר מאומת במטריצה.</p>
    </section>;
  }
  const { estimate: e, mc, notable, angles = [] } = detail;
  const measured = mc?.state === "done";
  const running = mc?.state === "running";
  const byKind = new Map(ANGLE_KINDS.map(item => [item.kind, angles.filter(angle => angle.kind === item.kind)]));
  const notableHits = angles.filter(angle => angle.notable);
  return <section className="els29-quality" aria-label="איכות הצופן, דילוגים מיוחדים וזוויות" data-els-quality="ready">
    <h3>איכות הצופן, דילוגים מיוחדים וזוויות</h3>
    <p className="els29-quality-caveat" role="note">זו הערכה של המנוע לפי נדירות הציר, אורכו וקרבת המילים סביבו. היא אינה הוכחה סטטיסטית ואינה קובעת שהצופן אמיתי או משמעותי. רק המדידה מול חלונות אקראיים (בהמשך) היא מדידה, וגם היא אינה הוכחה.</p>

    <div className="els29-quality-block" data-els-quality-part="stars">
      <h4>דירוג המנוע <small>(הערכה)</small></h4>
      <p className="els29-quality-stars"><span aria-label={`${quality?.stars ?? e.stars} כוכבים מתוך 5`} role="img">{stars(quality?.stars ?? e.stars)}</span>
        <bdi className="els29-quality-chip">ציון {measured ? quality?.score : e.score}</bdi>
        <bdi className="els29-quality-chip">{measured ? "הכוכבים נגזרו גם מהמדידה" : "הערכה מהירה, בלי מדידה"}</bdi></p>
      <ul className="els29-quality-list">
        <li>ציר: <bdi>{e.axisOccurrences === 1 ? "יחיד בקורפוס" : `${e.axisOccurrences} מופעים`}</bdi> · <bdi>{e.axisLength}</bdi> אותיות · <bdi>+{e.mainScore}</bdi></li>
        <li>אשכול: <bdi>{e.words}</bdi> מילים · <bdi>{e.parallels}</bdi> מקבילות{e.diagonals ? <> (<bdi>{e.diagonals}</bdi> אלכסון)</> : null} · <bdi>{e.tight}</bdi> צמודות</li>
        {e.family ? <li>בונוס משפחת מקבילות: <bdi>+{e.family}</bdi></li> : null}
        {e.special ? <li>בונוס דילוג מיוחד: <bdi>+{e.special}</bdi></li> : null}
      </ul>
    </div>

    <div className="els29-quality-block" data-els-quality-part="rarity">
      <h4>נדירות מדודה <small>(אופציונלי)</small></h4>
      {measured
        ? <p data-els-quality-rarity="done"><bdi className="els29-quality-chip">{mc.capped ? `נדיר מ־1 ל־${mc.trials}` : `בערך 1 ל־${mc.rarity}`}</bdi>
          <span>האשכול חזק מ־<bdi>{mc.percentile}%</bdi> מ־<bdi>{mc.trials}</bdi> מקומות אקראיים באותו טקסט (ציון <bdi>{mc.observed}</bdi> מול <bdi>{mc.mean}</bdi> בממוצע).</span></p>
        : running ? <p role="status" data-els-quality-rarity="running">מריץ 400 חלונות אקראיים…</p>
          : mc?.state === "error" ? <p role="status" data-els-quality-rarity="error">המדידה לא הושלמה: {mc.message}</p>
            : <p className="els29-quality-muted" data-els-quality-rarity="none">עדיין לא נמדד. המדידה משווה את האשכול ל־400 מקומות אקראיים באותו טקסט ובאותה גיאומטריה.</p>}
      <button type="button" className="r29-btn" disabled={busy || running || !onRunMc} onClick={onRunMc}>{measured ? "הרץ שוב" : "מדוד נדירות"}</button>
      <p className="els29-quality-muted">מדידה אחת מול חלונות אקראיים, ללא תיקון לריבוי השוואות. אינה בדיקת מובהקות מלאה.</p>
    </div>

    <div className="els29-quality-block" data-els-quality-part="notable">
      <h4>דילוגים מיוחדים</h4>
      {notable
        ? <p data-els-quality-notable="axis"><bdi className="els29-quality-chip">דילוג הציר {notable.skip}</bdi><span>{notable.tag}</span></p>
        : <p className="els29-quality-muted" data-els-quality-notable="none">דילוג הציר ({state.axis?.skip}) אינו מסומן כמיוחד.</p>}
      {notableHits.length ? <ul className="els29-quality-list">{notableHits.map((angle, index) => <li key={`${angle.term}-${angle.skip}-${index}`}>
        <bdi>{angle.term}</bdi> · דילוג <bdi>{angle.skip}</bdi> · {angle.notable.tag}</li>)}</ul> : null}
      <p className="els29-quality-muted">התיוג מסווג את המספר בלבד (מספר מוכר, עגול, פלינדרום). הוא אינו מעיד על משמעות הצופן.</p>
    </div>

    <div className="els29-quality-block" data-els-quality-part="angles">
      <h4>זוויות ומקבילות במטריצה</h4>
      <p className="els29-quality-muted">לפי רוחב המטריצה הנוכחי (<bdi>{e.matrixWidth}</bdi>). זה סיווג של דילוגי הממצאים ביחס לציר, ושונה מהבדיקה הגיאומטרית בסריג שב„בדיקת הסימונים והשוואת מופעים”: שני המידעים נשמרים.</p>
      {angles.length ? ANGLE_KINDS.map(({ kind, label, hint }) => {
        const items = byKind.get(kind) || [];
        return items.length ? <details key={kind} data-els-quality-angle={kind} open={kind !== "other"}>
          <summary>{label} · <bdi>{items.length}</bdi></summary>
          <p className="els29-quality-muted">{hint}</p>
          <ul className="els29-quality-list">{items.map((angle, index) => <li key={`${angle.term}-${angle.skip}-${index}`}>
            <bdi>{angle.term}</bdi> · דילוג <bdi>{angle.skip}</bdi> · {direction(angle.direction)}</li>)}</ul>
        </details> : null;
      }) : <p className="els29-quality-muted" data-els-quality-angle="none">אין עדיין ממצאים מוצגים לסיווג. הוסיפו מילה למטריצה.</p>}
    </div>
  </section>;
}
