import React, { useId } from "react";
import "./life-journey-picture-2029.css";

const LAYER_STATE = { ready: "זמין", empty: "נבדק · ללא תוצאה", auxiliary: "עדשת עזר פנימית", internal: "בדיקה פנימית", waiting: "ממתין", not_connected: "ממתין לחיבור · טרם נבדק", references: "רמזים שמורים · טרם נבדקו", no_references: "אין רמזים שמורים", loading: "טוען הפניות", error: "קריאת הרמזים לא הושלמה" };

export default function LifeJourneyPicture2029({ data, summary, onSelect, focusedMemberRef, onPersonFocus, children }) {
  const id = useId();
  const person = data.people.find(row => row.memberRef === focusedMemberRef) || data.people[0];
  if (!person) return null;
  const openBirth = lens => onSelect("creation", { memberRef: person.memberRef, lens });
  return <section className="life-picture" data-experience-capability="life-journey-personal-picture" aria-labelledby={`${id}-title`}>
    <header><div><small>המסע שלך, במקום אחד</small><h4 id={`${id}-title`}>התמונה שלי</h4><p>השם והתאריך, החיבורים למשפחה והמפות שכבר פתחת — מכאן אפשר להמשיך לכל פרט.</p></div></header>
    {data.people.length > 1 ? <label className="life-picture__person" htmlFor={`${id}-person`}>של מי להציג את התמונה?<select id={`${id}-person`} value={person.memberRef} onChange={event => onPersonFocus(event.target.value)}>{data.people.map(row => <option key={row.memberRef} value={row.memberRef}>{row.name}</option>)}</select></label> : <p className="life-picture__identity">{person.name}</p>}
    <div className="life-picture__grid">
      <article><small>השם והתאריך</small><h5>{person.researchState === "ready" && person.nameValue != null ? <>ערך השם <bdi>{person.nameValue}</bdi></> : "נקודת ההתחלה שלך"}</h5>
        <p>{person.hebrewDate || "תאריך הלידה עדיין חסר"}{person.dateDisplay ? <> · <bdi>{person.dateDisplay}</bdi></> : null}</p>
        <span>{person.researchState === "ready" ? `${person.methodCount} שיטות מוצגות במטריצה` : person.researchState === "error" ? "בדיקת השם לא הושלמה" : "בדיקת השם תתחיל רק כשתבקשו אותה"}</span>
        <div><button type="button" onClick={() => onSelect("matrix")}>לשמות ולמספרים</button><button type="button" onClick={() => onSelect("time")}>לתאריך ולמילים</button></div>
      </article>
      <article><small>החיבורים במשפחה</small><h5>{data.researchReady ? data.connectionCount === 1 ? "חיבור אחד נמצא" : <><bdi>{data.connectionCount}</bdi> חיבורים נמצאו</> : "המשפחה שבחרת"}</h5>
        <p>{data.researchReady ? `${data.convergenceCount} ערכים משותפים במפה של ${data.people.length} אנשים.` : `${data.people.length} אנשים נבחרו. בניית מפת החיבורים מתחילה בכפתור שמתחת למפות.`}</p>
        <span>{data.researchReady && !data.connectionCount ? "הבדיקה הסתיימה ללא חיבור להצגה כרגע" : "החיבורים מתייחסים לאנשים שנכללו בבדיקה"}</span>
        <div><button type="button" onClick={() => onSelect("convergences")}>לנקודות המפגש</button><button type="button" onClick={() => onSelect("generations")}>למפת המשפחה</button></div>
      </article>
      <article data-layer="human"><small>המפה האישית · Human Design</small><h5>{person.human?.type || "המפה עוד מחכה לך"}</h5>
        <p>{person.human ? <>פרופיל <bdi>{person.human.profile}</bdi></> : "בחרו עיר, תאריך ושעת לידה ופתחו את מפת המרכזים."}</p>
        <span>{person.human ? `דרך ההכרעה: ${person.human.authority}` : "החישוב מתחיל בלחיצה שלך"}</span>
        <div><button type="button" onClick={() => openBirth("human")}>{person.human ? "פתח את המפה האישית" : "הכן את המפה האישית"}</button></div>
      </article>
      <article data-layer="sky"><small>מפת השמיים</small><h5>{person.sky?.ascendant ? `אופק ב${person.sky.ascendant}` : "השמיים ברגע הלידה"}</h5>
        <p>{person.sky ? `${person.sky.sun ? `שמש ב${person.sky.sun} · ` : ""}${person.sky.bodyCount} גרמי שמיים חושבו` : "המיקומים, האופק וההיבטים מחכים לנתוני הלידה שלך."}</p>
        <span>{person.sky ? "התוצאה מהחישוב האחרון במסך הזה" : "אפשר לפתוח ולהשלים פרטים בלי להתחיל חיפוש"}</span>
        <div><button type="button" onClick={() => openBirth("sky")}>{person.sky ? "פתח את מפת השמיים" : "הכן את מפת השמיים"}</button></div>
      </article>
    </div>
    <section className="life-picture__summary" data-experience-capability="life-journey-combined-summary" aria-label="הסיכום של האנשים שנבחרו">
      <small>{data.people.length === 1 ? "הסיכום של האדם שנבחר" : `הסיכום של ${data.people.length} האנשים שנבחרו`}</small><h5>התמונה המשפחתית</h5>
      {summary.state === "loading" ? <p role="status">מרכיב סיכום מהממצאים שכבר נמצאו…</p> : <p>{summary.message || "הסיכום יופיע אחרי בניית מפת החיבורים. בינתיים אפשר להכיר את התאריך, המשפחה והמפות האישיות."}</p>}
      <div><span>{person.sourceReady ? person.verseCount === 1 ? "פסוק אחד נמצא עבור האדם שנבחר" : `${person.verseCount} פסוקים נמצאו עבור האדם שנבחר` : "בדיקת המקורות טרם הושלמה עבור האדם שנבחר"}</span><button type="button" onClick={() => onSelect("sources")}>לפסוקים ולמקורות</button></div>
      {summary.error ? <p role="alert">{summary.error}</p> : null}
    </section>
    <p className="life-picture__note">המפה האישית ומפת השמיים הן דרכי התבוננות נוספות. הסיכום המשפחתי נשען על ממצאי השמות, התאריכים והמקורות שנבדקו.</p>
    <details className="life-picture__details"><summary>איך הורכבה התמונה?</summary>
      <h5>חבילת המחקר המאוחדת</h5>
      <ul>{summary.synthesisPack?.coverage?.layers?.map(layer => <li key={layer.id}>{layer.label} · {LAYER_STATE[layer.state] || layer.state}</li>)}</ul>
      {summary.synthesisPack?.observations?.hints?.referenceCount ? <p>{summary.synthesisPack.observations.hints.referenceCount} רמזים שמורים; {summary.synthesisPack.observations.hints.datedCount} עם תאריך יום מפורש. הם עדיין לא שויכו לאנשים ולא נכללו בסיכום המשפחתי.</p> : null}
      <p>Human Design, מפת שמיים והקלפים נשארים בדיקות השתקפות פנימיות במשקל ראיה אפס ואינם משנים אותו.</p>
      {summary.claims.length ? <><h5>על מה הסיכום נשען?</h5><ul>{summary.claims.map((claim, index) => <li key={index}>{claim}</li>)}</ul></> : null}
      <p>המפות שחושבו כאן זמינות בזיכרון המסך עד רענון. אין הפעלה מחדש במעבר בין התצוגות.</p>
    </details>
    {children}
  </section>;
}
