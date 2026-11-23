import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { fetchPublicLibraryItem2029 } from "../../lib/research/publicLibraryContinuity2029.js";
import { SIBONI_GATE50_SLUG } from "../../data/siboniGate50Journey2029.js";
import "./siboniGate50HomeCard2029.css";

// Mount only after the Home section approaches; source-identity+HEAD reader
// controls admission. No second publication or parallel feed and no placeholder
// card when the source is unavailable or the Book node is not yet public.
export default function SiboniGate50HomeCard2029() {
  const [book, setBook] = useState(null);
  useEffect(() => {
    let live = true;
    const controller = new AbortController();
    fetchPublicLibraryItem2029("books", SIBONI_GATE50_SLUG, { signal: controller.signal })
      .then(item => { if (live && item?.readerState === "ready") setBook(item); })
      .catch(() => { /* fail closed: no link to an unavailable reader */ });
    return () => { live = false; controller.abort(); };
  }, []);
  if (!book) return null;
  return <aside className="siboni50-home" aria-label="ספר חדש בספרייה" data-book-home-candidate="siboni-gate50">
    <div className="siboni50-home-icon" aria-hidden="true"><span>שער</span><strong>50</strong></div>
    <div className="siboni50-home-text">
      <span className="siboni50-home-kicker">חדש בספרייה · שמונה שערים</span>
      <h2>המסע לשער החמישים</h2>
      <p>מהבינה המלאכותית לבינה המלכותית · מחקר מאת ציון דוד סיבוני</p>
      <p className="siboni50-home-numbers" aria-label="מספרים מרכזיים בחיבור">974 <span>·</span> 973 <span>·</span> 50</p>
    </div>
    <Link to={book.href} className="siboni50-home-cta">למסע ולקריאת הספר ←</Link>
  </aside>;
}
