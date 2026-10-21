import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import ContextDepthMeter2029 from "./ContextDepthMeter2029.jsx";
import { ELECTIONS_SOURCE_SLUG } from "../../lib/research/contextualAxisPriority2029.js";
import "./elections631ContextPreview2029.css";

// The Post owner passes a single already-authorized model to the in-flow
// after-reading menu. This is PRESENTATION ONLY: no second source fetch,
// graph read, scoring or Raziel request from inside the panel.
export default function Elections631ContextPreview2029({ model, view = "meeting" }) {
  const navigate = useNavigate();
  const [selectedValue, setSelectedValue] = useState(631);
  if (!model?.available || !model.depth) return <p role="status" className="sod29-631-status">הקשר זה עדיין לא זמין להצגה.</p>;
  const safeOpen = (item) => {
    if (typeof item?.href !== "string" || !item.href.startsWith("/post/" + ELECTIONS_SOURCE_SLUG + "#source-region-")) return;
    navigate(item.href);
  };

  if (view === "sources") return <section className="sod29-elections-context-review"
    aria-label="המקורות המדויקים של ציר הבחירות" data-contextual-priority="source_provenance">
    <p className="sod29-elections-source-status">מקטעי המקור המוצגים כאן שייכים לפוסט 5107. אימות חישוב, פרסום במאגר ופרשנות אינם אותו מעמד.</p>
    <ul className="sod29-elections-priority-results" aria-label="ביטויים מאומתים ומפורסמים במאגר">
      {model.publicMatches.map((claim) => <li key={claim.phrase}>
        <span>{claim.phrase}<small>רגיל = 631 · רשומה מאומתת ומפורסמת</small></span>
        <Link to={claim.source.href} aria-label={"פתח את המקטע המקורי של " + claim.phrase}>למקור</Link>
      </li>)}
    </ul>
    {model.authoredClaim ? <div className="sod29-elections-source-claim">
      <span>״עופר וינטר = 631״ מופיע בגוף הפוסט.</span>
      <small>תוכן מקור · רשומת הביטוי במאגר אינה מפורסמת</small>
      <Link to={model.authoredClaim.source.href}>פתח במקור</Link>
    </div> : null}
    {model.crossMethodAnchor ? <div className="sod29-elections-source-claim">
      <span>״עופר וינטר · מילוי = 1820״</span>
      <small>מקטע 1820 בגוף הפוסט · מקור אחד, שיטה אחרת</small>
      <Link to={model.crossMethodAnchor.href}>פתח במקור</Link>
    </div> : null}
    <p className="sod29-elections-source-status">ריבוי הופעות או שיטות מתוך אותו פוסט אינו יוצר מקורות עצמאיים נוספים.</p>
  </section>;

  return <section className="sod29-elections-context-review" aria-label="התכנסות מספרית בהקשר הבחירות" data-contextual-priority="context_first">
    <div className="sod29-elections-priority-head">
      <small>מוקד ההתכנסות · רמזי הבחירות</small>
      <strong dir="ltr">631</strong>
      <p>״הבחירות״ ו״מלך ישראל״ חולקים ערך בגימטריה רגילה. זו התאמה חישובית בהקשר הסיפור, לא דירוג או הערכה של אדם.</p>
    </div>
    {model.crossMethodAnchor ? <div className="sod29-elections-1820">
      <div><small>עוגן נוסף · אותו מקור, שיטה אחרת</small><strong dir="ltr">1820</strong></div>
      <p>בפוסט מתואר אותו שם גם בשיטת המילוי. החיבור מוסיף עומק מספרי, אך אינו מקור עצמאי נוסף.</p>
      <Link to={model.crossMethodAnchor.href}>למקטע המקור של 1820</Link>
    </div> : null}
    <div className="sod29-elections-priority-why">
      <b>למה ציר 631 מופיע ראשון במפגש הזה?</b>
      <p>״הבחירות״ עצמו מופיע בפוסט עם הערך 631, ו־{model.publicMatches.length} ביטויים במאגר נושאים אותו בחישוב מאומת ומפורסם. לצד זאת נפתח קשר בשיטה אחרת לעוגן 1820 — במסגרת אותו סיפור.</p>
      <small>זו קדימות תצוגה של קשרי מקור בלבד. אין ניקוד כולל חדש ואין דירוג של מועמדים.</small>
    </div>
    <ContextDepthMeter2029
      depth={model.depth} variant="full" selectedValue={selectedValue}
      onSelectValue={setSelectedValue} onOpenLocator={safeOpen}
    />
    <p className="sod29-elections-source-status">אישור קשרים ועצמאות מקורות שטרם הוכחו יישארו ״טרם מופה״; הצעות לא ייחשבו כראיות.</p>
  </section>;
}
