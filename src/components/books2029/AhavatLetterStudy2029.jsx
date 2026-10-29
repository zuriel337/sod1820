import React from "react";
import { ahavatLetterNumber } from "../../data/ahavatTorahLetters2029.js";
import "./ahavatLetterStudy2029.css";

// Presentation of the existing printed checkpoints, not another count/identity owner.
export default function AhavatLetterStudy2029({ source, books, bookId, onBook, onSource }) {
  const maximum = Math.max(1, ...books.filter(book => book.count !== null).map(book => book.count));
  const selected = books.find(book => book.id === bookId);
  return <div className="ahavat29-letter-study" aria-label={`מבט על האות ${source.name}`}>
    <div className="ahavat29-letter-identity">
      <span>אות אחת · חמשת החומשים</span>
      <b className="ahavat29-letter-glyph" aria-hidden="true">{source.form}</b>
      <h4>{source.name}</h4>
      <p>המניין המסכם בדברי הספר</p>
      <strong><bdi data-value-missing={books.at(-1).cumulative === null}>{ahavatLetterNumber(books.at(-1).cumulative)}</bdi></strong>
      <button type="button" onClick={() => onSource(source.pages[0])}>קרא בספר · PDF {source.pages[0]}</button>
      <a href="#ahavat29-letter-alphabet">בחר אות אחרת</a>
    </div>
    <div className="ahavat29-letter-landscape">
      <div className="ahavat29-letter-landscape-heading"><span>מהאות אל החומש</span><p>בחר חומש כדי להיכנס לפרשות שלו.</p></div>
      <div className="ahavat29-letter-pillars" aria-label={`חמשת החומשים באות ${source.name}`}>
        {books.map((book, index) => <button type="button" key={book.id} aria-pressed={book.id === bookId} onClick={() => onBook(book.id)} style={{ "--pillar-height": book.count === null ? "0%" : `${book.count / maximum * 100}%` }}>
          <span className="ahavat29-letter-pillar-number"><bdi data-value-missing={book.count === null}>{book.count === null ? "לא נקרא" : ahavatLetterNumber(book.count)}</bdi></span>
          <span className="ahavat29-letter-pillar-track" aria-hidden="true"><i data-missing={book.count === null} /></span>
          <span className="ahavat29-letter-pillar-label"><small aria-hidden="true">{String(index + 1).padStart(2, "0")}</small>{book.title}</span>
        </button>)}
      </div>
      <p className="ahavat29-letter-scale">ייצוג של מבנה הספר · הגובה יחסי למניין בחומש; מיקום החומשים לפי סדר הספר. הצבע והעומק הם בחירות המחשה בלבד. ערך חסר נשאר חסר.</p>
      <div className="ahavat29-letter-path" aria-live="polite"><span>אות {source.form}</span><span aria-hidden="true">←</span><strong>{selected?.title || "כל התורה"}</strong><span aria-hidden="true">←</span><span>{selected ? `${selected.rows.length} פרשות` : "54 פרשות"}</span></div>
    </div>
  </div>;
}
