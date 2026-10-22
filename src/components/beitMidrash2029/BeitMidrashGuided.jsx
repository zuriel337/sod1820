import React from "react";
import { Link } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";
import { FrameState } from "../experience2029/Sod2029Shell.jsx";

const primitive = (value) => ["string", "number"].includes(typeof value);

function GuidedCard({ example }) {
  const values = example.values.filter(primitive);
  return <article
    id={`guided-${example.concept}-${example.sourceId}`}
    className="bm-example-card"
    data-finding-id={example.sourceId}
    data-guided-concept={example.concept}
  >
    <header>
      <span className="bm-tag">{example.eyebrow}</span>
      {example.createdAt ? <time dateTime={example.createdAt}>{new Date(example.createdAt).toLocaleDateString("he-IL")}</time> : null}
    </header>
    <h4 className="bm-example-title">{example.title}</h4>
    <p className="bm-statement">{example.statement}</p>
    {example.secondary && example.secondary !== example.statement ? <p className="bm-secondary">{example.secondary}</p> : null}
    {values.length ? <ul className="bm-values" aria-label="מספרים בדוגמה">
      {values.map((value, index) => <li key={`${value}:${index}`}>{value}</li>)}
    </ul> : null}

    <ol className="bm-prompts" aria-label="שאלות להתבוננות">
      {example.prompts.map((prompt) => <li key={prompt}>{prompt}</li>)}
    </ol>

    <dl className="bm-source">
      <div>
        <dt>מקור</dt>
        <dd>{example.sourceLabel ? <span>{example.sourceLabel} · </span> : null}<code dir="ltr">{example.sourceRef || "אין מזהה מקור"}</code></dd>
      </div>
      {example.contributor ? <div><dt>הובא על ידי</dt><dd>{example.contributor}</dd></div> : null}
    </dl>

    {example.occurrences.length > 1 ? <details className="bm-occurrences">
      <summary>כל ההופעות במקור · {example.occurrences.length}</summary>
      <ul>{example.occurrences.map((occurrence, index) => <li key={`${occurrence?.sourceId || "source"}:${index}`}>
        <code dir="ltr">{occurrence?.sourceRef || "אין מזהה מקור"}</code>
      </li>)}</ul>
    </details> : null}

    <footer>
      <a className="bm-button is-primary" href={example.canonicalFindingHref} target="_blank" rel="noreferrer">לפתיחת הגילוי המלא ↗</a>
      {example.sourceHref ? <a className="bm-button" href={example.sourceHref} target="_blank" rel="noreferrer">לפתיחת המקור ↗</a> : null}
      <Link className="bm-link" to={example.returnHref}>קישור קבוע לדוגמה</Link>
    </footer>
  </article>;
}

function Group({ id, copy, rows }) {
  if (!rows.length) return null;
  return <div className="bm-guided-group" id={id}>
    <h4 className="bm-group-title">{copy.title} <span className="bm-tag">{copy.eyebrow}</span></h4>
    <div className="bm-example-list">{rows.map((example) => <GuidedCard key={example.sourceId || example.id} example={example} />)}</div>
  </div>;
}

export default function BeitMidrashGuided({ section, focused, world, guided, language, mapCallout }) {
  const empty = !world.loading && !world.error && !guided.crossings.length && !guided.convergences.length;
  return <BeitMidrashSection id="guided" icon="world" title={section.title} description={section.description} focused={focused}>
    {world.loading ? <FrameState kind="loading" title="פותח דוגמאות מן העולם">
      הדוגמאות נטענות פעם אחת מן העולם ומוצגות כאן ללימוד.
    </FrameState> : null}
    {world.error ? <FrameState kind="error" title="הדוגמאות אינן זמינות כרגע" action={
      <button type="button" className="bm-button" onClick={world.retry}>נסו שוב</button>
    }>
      לא מוצג תוכן חלופי.
    </FrameState> : null}
    {empty ? <FrameState kind="empty" title="אין כרגע דוגמאות מודרכות">
      דוגמאות חדשות יופיעו כאן כשיהיו זמינות. לא נוסף תוכן חלופי.
    </FrameState> : null}

    <Group id="guided-crossing" copy={language.crossing} rows={guided.crossings} />
    <Group id="guided-convergence" copy={language.convergence} rows={guided.convergences} />

    <div className="bm-map-cta" id="guided-map">
      <p>{mapCallout.description}</p>
      <a className="bm-button is-primary" href={mapCallout.href}>{mapCallout.title}</a>
    </div>
  </BeitMidrashSection>;
}
