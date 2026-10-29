import React from "react";
import { ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import { ahavatReaderUnitDomId } from "../../data/ahavatTorahReaderUnits2029.js";

// Selected-source explanation over existing rows; no new reading or numeric result.
export default function AhavatLetterParasha2029({ source, rows, selectedParasha, unitId, ownsSourceAnchor, onSelect, onSource, journeyScope = "book", onJourney, hasBook }) {
  const position = rows.findIndex(row => row.parasha === selectedParasha);
  const selected = rows[position];
  return <section className="ahavat29-letter-parasha" id={selected && ownsSourceAnchor ? ahavatReaderUnitDomId(unitId) : "ahavat29-letter-parasha"} data-reader-unit={selected && ownsSourceAnchor ? unitId : undefined} aria-labelledby="ahavat29-letter-parasha-title">
    <header><span>מהחומש אל הפרשה</span><h4 id="ahavat29-letter-parasha-title">פרשה אחר פרשה</h4></header>
    {ownsSourceAnchor ? <nav className="ahavat29-letter-journey" aria-label="מסלול לימוד הפרשות"><button type="button" aria-pressed={journeyScope === "book"} disabled={!hasBook} onClick={() => onJourney("book")}>החומש הנבחר</button><button type="button" aria-pressed={journeyScope === "torah"} onClick={() => onJourney("torah")}>כל פרשות התורה</button></nav> : null}
    {ownsSourceAnchor && journeyScope === "torah" ? <p className="ahavat29-letter-journey-guide">מסלול רציף לפי סדר הפרשות בספר, גם מחומש לחומש. המודל והמקור עוקבים אחר הפרשה הנבחרת.</p> : null}
    <label>בחר פרשה ללימוד<select value={selected?.parasha || ""} onChange={event => { const row = rows.find(item => item.parasha === event.target.value); if (row) onSelect(row); }}><option value="">בחירת פרשה…</option>{rows.map(row => <option key={row.parasha} value={row.parasha}>{row.book} · {row.parasha}</option>)}</select></label>
    {selected ? <article aria-live="polite">
      <header><div><span>דברי הספר · מניין האות {source.form}</span><h5>{selected.parasha} · {selected.book}</h5></div><button type="button" onClick={() => onSource(selected)}>פתח מקור הפרשה · PDF {selected.page}</button></header>
      <dl><div><dt>המניין בדפוס</dt><dd><bdi>{selected.printed === "?" ? "לא נקרא" : selected.printed}</bdi></dd></div><div><dt>המספר לקריאה</dt><dd>{selected.count === null ? <span>לא נקרא</span> : <bdi className="ahavat29-letter-row-number">{ahavatLetterNumber(selected.count)}</bdi>}</dd></div></dl>
      <p><b>הסבר נלווה:</b> זו שורת פרשת {selected.parasha} במניין האות {source.name}. המחבר מונה לפי פרשות, ואחריהן ממשיך בסיכום המצטבר של החומש. {selected.count === null ? "הקריאה המספרית של השורה עדיין חסרה; אפשר לקרוא את הדפוס עצמו בעמוד המקור." : "המספר כאן הוא קריאת המניין המודפס, והמקור נשאר זמין להשוואה."} {/[ךםןףץ]/.test(source.form) ? "זוהי צורה סופית עם סעיף נפרד בספר; אין לצרף אותה אוטומטית לצורה הרגילה." : source.form === "שׁ" || source.form === "שׂ" ? "בספר יש מניינים נפרדים לשׁין ולשׂין." : ""}</p>
      <nav aria-label={journeyScope === "torah" ? "מעבר בין פרשות התורה" : "מעבר בין פרשות החומש"}><button type="button" disabled={position <= 0} onClick={() => onSelect(rows[position - 1])}>הפרשה הקודמת</button><span><bdi>{position + 1}</bdi> מתוך <bdi>{rows.length}</bdi></span><button type="button" disabled={position >= rows.length - 1} onClick={() => onSelect(rows[position + 1])}>הפרשה הבאה</button></nav>
    </article> : <p>בחר פרשה כדי לקרוא את המניין שלה ולהמשיך בין השורות לפי סדר הספר. אפשר לפתוח את המקור גם בלי להפעיל תלת־ממד.</p>}
  </section>;
}
