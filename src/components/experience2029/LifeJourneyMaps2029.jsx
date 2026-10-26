import React, { useId, useMemo, useState } from "react";
import { formatTanakhRef } from "../../lib/presentation/canonicalPresentation.js";
import { buildLifeJourneyMaps } from "../../lib/research/lifeJourneyMaps.js";
import "./life-journey-maps-2029.css";

const MAP_TABS = Object.freeze([
  { id: "overview", label: "מפת־על" },
  { id: "matrix", label: "מטריצה" },
  { id: "generations", label: "דורות" },
  { id: "relationships", label: "קשרים" },
  { id: "convergences", label: "התכנסויות" },
  { id: "evidence", label: "עוצמות/פערים" },
  { id: "timeline", label: "ציר זמן" },
  { id: "sources", label: "מקורות" },
  { id: "coverage", label: "כיסוי" },
  { id: "summary", label: "סיכום" },
  { id: "path", label: "מסלול" },
]);

const PATH_STATE_LABEL = Object.freeze({
  ready: "מוכן",
  empty: "נבדק · אין תוצאה",
  waiting: "ממתין למחקר מפורש",
  available: "זמין לפתיחה",
});

const EVIDENCE_BAND_LABEL = Object.freeze({
  three_plus_groups: "3+ קבוצות שיטה עצמאיות",
  two_groups: "2 קבוצות שיטה עצמאיות",
  one_group: "קבוצת שיטה עצמאית אחת",
  engine_connection: "חיבור מנוע ללא ספירת קבוצות",
  not_found: "טרם נמצא חיבור מנורמל",
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

function RelationshipsMap({ rows, ready }) {
  if (!rows.length) return <EmptyMap>נדרשים לפחות שני אנשים נבחרים כדי להציג קשרים ביניהם.</EmptyMap>;
  return <div className="person-journey-relationship-map">
    {rows.map(row => <article key={row.id} data-research={row.hasResearchConnection ? "found" : "not-found"}>
      <header><strong>{row.leftName}</strong><i aria-hidden="true">↔</i><strong>{row.rightName}</strong></header>
      {row.generation ? <p>{row.generation.parentName} · הורה של · {row.generation.childName}</p> : <p>לא הוגדר קשר דורי ישיר ב־Ledger.</p>}
      {row.hasResearchConnection ? <div>
        <span>{row.leftExpressionLabel || "ביטוי"}</span><i aria-hidden="true">↔</i><span>{row.rightExpressionLabel || "ביטוי"}</span>
      </div> : null}
      <small>{row.hasResearchConnection
        ? `${EVIDENCE_BAND_LABEL[row.evidenceBand]} · ${row.expressionConnectionCount} חיבורי ביטויים`
        : ready ? "הזוג נבדק, אך לא נמצא כרגע חיבור מנורמל להצגה." : "הקשר המחקרי יתמלא רק לאחר מחקר מפורש."}</small>
    </article>)}
    <p>המפה מחברת בין הקשר המשפחתי שהוזן לבין תוצאות המנוע. היא אינה קובעת מה טיב היחסים בין האנשים.</p>
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

function EvidenceMap({ data, ready }) {
  if (!data.signals.length && !data.gaps.length) return <EmptyMap>נדרשים לפחות שני אנשים כדי למפות עוצמת ראיה ופערי מחקר.</EmptyMap>;
  return <div className="person-journey-evidence-map">
    <p>“עוצמה” כאן היא מספר קבוצות השיטה העצמאיות לאחר נרמול — לא עוצמת קשר אישי. “פער” הוא רק תוצאה שטרם נמצאה.</p>
    {data.signals.length ? <section aria-label="חיבורים עם ראיה חישובית">
      <h4>ראיה חישובית שנמצאה</h4>
      <div>{data.signals.map(row => <article key={row.id} data-band={row.evidenceBand}>
        <strong>{row.leftName} ↔ {row.rightName}</strong>
        <span>{EVIDENCE_BAND_LABEL[row.evidenceBand]}</span>
        <small>{row.expressionConnectionCount} חיבורי ביטויים שנקבצו לזוג אחד</small>
      </article>)}</div>
    </section> : null}
    {data.gaps.length ? <section aria-label="פערי מחקר">
      <h4>פערי מחקר</h4>
      <div>{data.gaps.map(row => <article key={row.id} data-band="not_found">
        <strong>{row.leftName} ↔ {row.rightName}</strong>
        <span>{ready ? "טרם נמצא חיבור מנורמל" : "טרם בוצע מחקר מפורש"}</span>
        <small>אין להסיק מכך שאין קשר.</small>
      </article>)}</div>
    </section> : null}
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

function CoverageMap({ rows, ready }) {
  if (!rows.length) return <EmptyMap>אין אנשים נבחרים למפת הכיסוי.</EmptyMap>;
  return <div className="person-journey-coverage-map">
    {rows.map(row => <article key={row.memberRef}>
      <header><strong>{row.name}</strong><span>{row.researchReady ? "נבדק" : ready ? "חלקי" : "ממתין"}</span></header>
      <dl>
        <div><dt>תאריך</dt><dd>{row.hasBirthdate ? "קיים" : "חסר"}</dd></div>
        <div><dt>שיטות</dt><dd>{row.methodCount}</dd></div>
        <div><dt>התכנסויות</dt><dd>{row.convergenceCount}</dd></div>
        <div><dt>פסוקים</dt><dd>{row.verseCount}</dd></div>
        <div><dt>מסלולי מקור</dt><dd>{row.sourceTrackCount}</dd></div>
        <div><dt>זוגות עם חיבור</dt><dd>{row.researchedRelationshipCount}/{row.relationshipCount}</dd></div>
      </dl>
    </article>)}
    <p>כיסוי מציין מה נבדק ומה חסר. הוא אינו ציון איכות לאדם ואינו משלים נתונים שלא נשמרו.</p>
  </div>;
}

function SummaryMap({ data }) {
  if (data.state === "loading") return <div className="person-journey-map-summary" role="status"><strong>מנסח מסר מהממצאים המנורמלים…</strong><p>המפות נשארות זמינות בזמן שהסיכום נבנה.</p></div>;
  if (!data.message) return <EmptyMap>הסיכום יופיע לאחר הפעלת המחקר המשפחתי המפורש.</EmptyMap>;
  return <article className="person-journey-map-summary" data-experience-capability="life-journey-combined-summary">
    <header><div><small>{data.normalized ? "מסר מנורמל שכבר נוצר" : "סיכום חישובי לפני ניסוח"}</small><h4>הסיכום המשפחתי</h4></div><span>{data.connectionCount} חיבורים · {data.searchedPairCount} זוגות נבדקו</span></header>
    <p>{data.message}</p>
    <div><span>{data.verseCount} פסוקים</span><span>{data.normalized ? "ניסוח מאומת פנימית" : "ממתין לניסוח המלא"}</span></div>
    {data.claims.length ? <details><summary>על מה הסיכום נשען?</summary><ul>{data.claims.map((claim, index) => <li key={`${index}:${claim}`}>{claim}</li>)}</ul></details> : null}
    {data.error ? <small role="alert">{data.error}</small> : null}
    <footer>הסיכום משתמש רק במחקר השמור. הוא אינו מפעיל ELS ואינו יוצר אמת על המשפחה.</footer>
  </article>;
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
  if (active === "relationships") return <RelationshipsMap rows={projection.relationships} ready={projection.overview.researchReady} />;
  if (active === "convergences") return <ConvergencesMap rows={projection.convergences} ready={projection.overview.researchReady} />;
  if (active === "evidence") return <EvidenceMap data={projection.evidence} ready={projection.overview.researchReady} />;
  if (active === "timeline") return <TimelineMap rows={projection.timeline} missing={projection.timelineMissing} />;
  if (active === "sources") return <SourcesMap data={projection.sources} ready={projection.overview.researchReady} />;
  if (active === "coverage") return <CoverageMap rows={projection.coverage} ready={projection.overview.researchReady} />;
  if (active === "summary") return <SummaryMap data={projection.summary} />;
  if (active === "path") return <PathMap data={projection.path} />;
  return <OverviewMap data={projection.overview} />;
}

export default function LifeJourneyMaps2029({ members, relations, selectedRefs, research, analysis, context, birthTimeline }) {
  const [active, setActive] = useState("overview");
  const id = useId();
  const projection = useMemo(() => buildLifeJourneyMaps({ members, relations, selectedRefs, research, analysis, context, birthTimeline }), [members, relations, selectedRefs, research, analysis, context, birthTimeline]);
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
