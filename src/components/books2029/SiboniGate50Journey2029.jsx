import React from "react";
import { Link } from "react-router-dom";
import {
  SIBONI_GATE50_APPENDICES,
  SIBONI_GATE50_GATES,
  SIBONI_GATE50_SLUG,
} from "../../data/siboniGate50Journey2029.js";
import "./siboniGate50Journey2029.css";

// Scoped visual chapter navigation over the existing Public Book reader.
// The owner-approved source is the uploaded PDF; no surrogate cover artwork.
export default function SiboniGate50Journey2029({ slug, sourceReady = false }) {
  if (slug !== SIBONI_GATE50_SLUG || !sourceReady) return null;
  return <section className="siboni50" dir="rtl" aria-labelledby="siboni50-title" data-book-journey="siboni-gate50">
    <div className="siboni50-hero">
      <div className="siboni50-hero-copy">
        <span className="siboni50-eyebrow">ספריית SOD1820 · מסע בן שמונה שערים</span>
        <h2 id="siboni50-title">המסע לשער החמישים</h2>
        <p className="siboni50-subtitle">מהבינה המלאכותית לבינה המלכותית</p>
        <p className="siboni50-author">מחקר מאת ציון דוד סיבוני · 110 עמודי מקור</p>
        <p className="siboni50-description">שמונה שערים העוסקים בבינה, בתורת הרמז ובגימטריאות, מלווים בשני נספחים ובנספח מיוחד על המספר 97. בחרו שער כדי לפתוח את העמוד המדויק בספר המקורי.</p>
        <a className="siboni50-primary" href="#siboni50-gates">לבחירת שער <span aria-hidden="true">↓</span></a>
      </div>
      <div className="siboni50-emblem" aria-hidden="true"><span>שער</span><strong>50</strong><span>הבינה</span></div>
    </div>
    <div className="siboni50-values" aria-label="מספרים מרכזיים מתוך מחקר המחבר">
      <span><strong>974</strong> בינה מלאכותית</span>
      <span><strong>973</strong> בינה מלכותית</span>
      <span><strong>50</strong> שער הנון</span>
    </div>
    <div className="siboni50-head" id="siboni50-gates">
      <h3>מסע שמונת השערים</h3>
      <p>הניווט מוביל לדברי הספר. המספרים הם עוגני עיון המופיעים במחקר המחבר.</p>
    </div>
    <ol className="siboni50-gates" aria-label="שמונת שערי הספר">
      {SIBONI_GATE50_GATES.map(gate => <li key={gate.id}>
        <Link to={gate.href + "#book-reader29-source"} className="siboni50-gate">
          <span className="siboni50-gate-no">{String(gate.order).padStart(2, "0")}</span>
          <span className="siboni50-gate-copy">
            <strong>{gate.title}</strong>
            <small>עמודים {gate.from}–{gate.to} · {gate.motif}</small>
          </span>
          <span className="siboni50-gate-arrow" aria-hidden="true">←</span>
        </Link>
      </li>)}
    </ol>
    <div className="siboni50-head siboni50-head-secondary"><h3>הנספחים</h3><p>חומר ההמשך נשאר חלק מן המקור, עם מראה־מקום מדויק.</p></div>
    <nav className="siboni50-appendices" aria-label="נספחי הספר">
      {SIBONI_GATE50_APPENDICES.map(appendix => <Link key={appendix.id} to={appendix.href + "#book-reader29-source"}>
        <strong>{appendix.title}</strong><small>עמודים {appendix.from}–{appendix.to}</small>
      </Link>)}
    </nav>
    <p className="siboni50-attribution">דברי הספר ורמזי המחבר מובאים כמקור לעיון. בדיקת גימטריה במנוע האתר וממצאי מחקר מאומתים מוצגים בנפרד.</p>
  </section>;
}
