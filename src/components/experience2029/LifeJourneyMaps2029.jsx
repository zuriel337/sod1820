import React, { useId, useMemo, useState } from "react";
import { formatTanakhRef } from "../../lib/presentation/canonicalPresentation.js";
import { buildLifeJourneyMaps } from "../../lib/research/lifeJourneyMaps.js";
import "./life-journey-maps-2029.css";

const MAP_TABS = Object.freeze([
  { id: "overview", label: "מפת־על" },
  { id: "matrix", label: "מטריצה" },
  { id: "generations", label: "דורות" },
  { id: "convergences", label: "התכנסויות" },
  { id: "timeline", label: "ציר זמן" },
  { id: "sources", label: "מקורות" },
  { id: "path", label: "מסלול" },
]);

const PATH_STATE_LABEL = Object.freeze({
  ready: "מוכן",
  empty: "נבדק · אין תוצאה",
  waiting: "ממתין למחקר מפורש",
  available: "זמין לפתיחה",
});

function EmptyMap({ children }) {
  return <div className="person-journey-map-empty">{children}</div>;
}

function OverviewMap({ data }) {
  const cards = [
    ["אנשים שנבחרו", data.selectedPeople],
    ["תאריכים על הציר", data.datedPeople],
    ["אנשים במטריצה", data.matrixPeople],
    ["התכנסויות", data.convergenceCount],
    ["חיבורים", data.connectionCount],
    ["קבוצות מקור", data.sourceCount],
  ];
  return <div className="person-journey-map-overview">
    {cards.map(([label, value]) => <article key={label}><strong>{value}</strong><span>{label}</span></article>)}
    <p>{data.researchReady
      ? "המפות נגזרות מאותו מחקר משפחתי שמור. מעבר בין מפות אינו מפעיל מנוע מחדש."
      : "מפת הדורות וציר הזמן כבר זמינים. המטריצה, ההתכנסויות והמקורות יתמלאו רק בלחיצה על יצירת המחקר."}</p>
  </div>;
}

function MatrixMap({ rows }) {
  if (!rows.length) return <EmptyMap>המטריצה תופיע לאחר הפעלת המחקר המפורש לאנשים שנבחרו.</EmptyMap>;
  return <div className="person-journey-map-table-wrap">
    <table className="person-journey-map-table">
      <thead><tr><th>אדם</th><th>ערך השם</th><th>תאריך עברי</th><th>שיטות וערכים</th><th>נקודות מפגש</th></tr></thead>
      <tbody>{rows.map(row => <tr key={row.memberRef}>
        <th scope="row">{row.name}</th>
        <td>{row.nameValue ?? "—"}</td>
        <td>{row.hebrewDate || "—"}</td>
        <td><div className="person-journey-map-chips">{row.methods.length
          ? row.methods.map(item => <span key={`${item.label}:${item.value}`}>{item.label} <b>{item.value}</b></span>)
          : <span>אין תוצאה</span>}</div></td>
        <td><div className="person-journey-map-chips">{row.crossValues.length
          ? row.crossValues.map(value => <strong key={value}>{value}</strong>)
          : <span>לא נמצאו</span>}</div></td>
      </tr>)}</tbody>
    </table>
  </div>;
}

function GenerationsMap({ data }) {
  if (!data.links.length && !data.unlinkedPeople.length) return <EmptyMap>אין כרגע אנשים שנבחרו למפת הדורות.</EmptyMap>;
  return <div className="person-journey-generation-map">
    {data.links.map(link => <article key={link.id}>
      <span>{link.parentName}</span><i aria-hidden="true">←</i><small>הורה של</small><i aria-hidden="true">←</i><span>{link.childName}</span>
    </article>)}
    {data.unlinkedPeople.length ? <div className="person-journey-map-unlinked">
      <small>ללא קשר דורי מוגדר במפה</small>
      <div>{data.unlinkedPeople.map(person => <span key={person.memberRef}>{person.name}</span>)}</div>
    </div> : null}
  </div>;
}

function ConvergencesMap({ rows, ready }) {
  if (!rows.length) return <EmptyMap>{ready
    ? "לא נמצאה כרגע התכנסות בין ביטויים שונים. זו אינה קביעה שאין קשר."
    : "ההתכנסויות יופיעו לאחר מחקר מפורש; בחירת בני משפחה לבדה אינה מחפשת אותם."}</EmptyMap>;
  return <div className="person-journey-convergence-map">
    {rows.map(row => <article key={row.value}>
      <strong>{row.value}</strong>
      <div>{row.participantNames.map(name => <span key={name}>{name}</span>)}</div>
      <small>{row.personCount} אנשים · {row.expressionCount} ביטויים · {row.methodGroupCount} קבוצות שיטה</small>
    </article>)}
  </div>;
}

function TimelineMap({ rows, missing }) {
  if (!rows.length) return <EmptyMap>לאנשים שנבחרו עדיין אין תאריכי לידה שמורים.</EmptyMap>;
  return <section className="person-journey-map-timeline" data-experience-capability="life-journey-birth-timeline">
    <h4>ציר אירועי היסוד</h4>
    <p>תצוגה כרונולוגית מה־Ledger הפרטי הקיים; לא נוצר Event store חדש.</p>
    <ol>{rows.map(event => <li key={event.id}>
      <time dateTime={event.dateIso} dir="ltr">{event.dateDisplay}</time>
      <i aria-hidden="true" />
      <div><strong>{event.name}</strong><span>לידה</span>{event.hebrewDate ? <small>{event.hebrewDate}</small> : null}{event.birthPlace ? <small>מקום לידה · {event.birthPlace}</small> : null}</div>
    </li>)}</ol>
    {missing.length ? <small className="person-journey-map-timeline-missing">ללא תאריך שמור: {missing.join(" · ")}</small> : null}
  </section>;
}

function SourcesMap({ data, ready }) {
  if (!data.members.length && !data.numbers.length) return <EmptyMap>{ready
    ? "שכבת המקורות לא החזירה כרגע פסוק או ביטוי להצגה."
    : "מפת המקורות תיבנה רק לאחר מחקר מפורש, ללא ELS וללא חיפוש אוטומטי."}</EmptyMap>;
  return <div className="person-journey-source-map">
    {data.members.map(member => <article key={member.memberRef}>
      <strong>{member.name}</strong>
      <div>{member.verses.map(verse => <span key={verse.id || verse.ref}>{formatTanakhRef(verse.ref)}</span>)}</div>
      <small>{member.trackCount} מסלולי מקור עם תוצאה</small>
    </article>)}
    {data.numbers.map(source => <article key={source.value}>
      <strong>{source.value}</strong>
      <div>{source.phrases.map(phrase => <span key={phrase}>{phrase}</span>)}</div>
      <small>התאמות־ערך מהמאגר הקנוני</small>
    </article>)}
  </div>;
}

function PathMap({ data }) {
  return <div className="person-journey-path-map">
    <ol>{data.steps.map((step, index) => <li key={step.id} data-state={step.state}>
      <i>{index + 1}</i><div><strong>{step.label}</strong><small>{PATH_STATE_LABEL[step.state]}</small></div>
    </li>)}</ol>
    <p>{data.saved
      ? `מסלול המחקר הקיים מזוהה ונשמר${data.position != null ? ` · מיקום ${data.position}` : ""}.`
      : "המעברים משתמשים ב־Research Context ובחזרה המדויקת הקיימים; לא נוצר Journey store נוסף."}</p>
  </div>;
}

function MapPanel({ active, projection }) {
  if (active === "matrix") return <MatrixMap rows={projection.matrix} />;
  if (active === "generations") return <GenerationsMap data={projection.generations} />;
  if (active === "convergences") return <ConvergencesMap rows={projection.convergences} ready={projection.overview.researchReady} />;
  if (active === "timeline") return <TimelineMap rows={projection.timeline} missing={projection.timelineMissing} />;
  if (active === "sources") return <SourcesMap data={projection.sources} ready={projection.overview.researchReady} />;
  if (active === "path") return <PathMap data={projection.path} />;
  return <OverviewMap data={projection.overview} />;
}

export default function LifeJourneyMaps2029({ members, relations, selectedRefs, research, context, birthTimeline }) {
  const [active, setActive] = useState("overview");
  const id = useId();
  const projection = useMemo(() => buildLifeJourneyMaps({ members, relations, selectedRefs, research, context, birthTimeline }), [members, relations, selectedRefs, research, context, birthTimeline]);
  if (!projection.overview.selectedPeople) return null;

  return <section className="person-journey-maps" data-experience-capability="life-journey-maps" aria-labelledby={`${id}-title`}>
    <header>
      <div><small>אותו מחקר · כמה תצוגות</small><h3 id={`${id}-title`}>מפות החיים</h3></div>
      <span>{projection.overview.selectedPeople} אנשים נבחרו</span>
    </header>
    <p>כל מפה היא תצוגה של ה־Ledger וה־Research Context הקיימים. מעבר בין מפות אינו מחפש שמות ואינו משנה את הממצאים.</p>
    <div className="person-journey-map-tabs" role="tablist" aria-label="סוג מפת חיים">
      {MAP_TABS.map(tab => <button
        type="button"
        role="tab"
        key={tab.id}
        id={`${id}-${tab.id}-tab`}
        aria-selected={active === tab.id}
        aria-controls={`${id}-panel`}
        tabIndex={active === tab.id ? 0 : -1}
        onClick={() => setActive(tab.id)}
      >{tab.label}</button>)}
    </div>
    <div className="person-journey-map-panel" id={`${id}-panel`} role="tabpanel" aria-labelledby={`${id}-${active}-tab`}>
      <MapPanel active={active} projection={projection} />
    </div>
    <footer>תצוגה פרטית בלבד · ללא ELS · ללא Graph או store חדש</footer>
  </section>;
}
