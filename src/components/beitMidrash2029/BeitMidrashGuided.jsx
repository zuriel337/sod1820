import React from "react";
import { Link, useLocation } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";
import { MeetingIllustration } from "./BeitMidrashIllustrations.jsx";
import { FrameState, use2029Shell } from "../experience2029/Sod2029Shell.jsx";
import { useResearch } from "../../lib/research/ResearchProvider.jsx";
import { publicContributorHref, publicWorldSourceHref } from "../../lib/research/publicContributorIdentity.js";

const primitive = (value) => ["string", "number"].includes(typeof value);

function GuidedCard({ example }) {
  const research = useResearch();
  const shell = use2029Shell();
  const location = useLocation();
  const values = example.values.filter(primitive);
  const contributorHref = publicContributorHref(example.contributor);
  const worldHref = publicWorldSourceHref(example.contributor);
  const findingHref = example.canonicalFindingHref;
  const rememberWorldContext = () => {
    const selection = {
      entityId: example.sourceId,
      entityType: "finding",
      findingId: example.sourceId,
      sourceRef: example.sourceRef,
      locator: example.sourceRef,
    };
    research.updateResearchContext?.({
      subject: null,
      selection,
      lens: "world",
      returnTo: {
        href: example.returnHref || `${location.pathname}${location.search}${location.hash}`,
        label: "בית המדרש · נקודת המפגש",
        subject: null,
        selection,
        lens: "beit-midrash",
      },
    });
  };
  const rememberAndOpenWorld = (event, href = worldHref) => {
    rememberWorldContext();
    if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    shell.go(href, { preserve: false });
  };
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
      {example.contributor ? <div><dt>הובא על ידי</dt><dd>{contributorHref
        ? <Link className="bm-contributor-link" to={contributorHref} onClick={rememberWorldContext}>{example.contributor}</Link>
        : example.contributor}</dd></div> : null}
    </dl>

    {example.occurrences.length > 1 ? <details className="bm-occurrences">
      <summary>כל ההופעות במקור · {example.occurrences.length}</summary>
      <ul>{example.occurrences.map((occurrence, index) => <li key={`${occurrence?.sourceId || "source"}:${index}`}>
        <code dir="ltr">{occurrence?.sourceRef || "אין מזהה מקור"}</code>
      </li>)}</ul>
    </details> : null}

    <footer>
      {findingHref ? <a className="bm-button is-primary" href={findingHref} data-world-finding-link="true" onClick={(event) => rememberAndOpenWorld(event, findingHref)}>לפתיחת הגילוי המלא בעולם</a> : null}
      <a className={`bm-button${findingHref ? "" : " is-primary"}`} href={worldHref} data-world-source-link="true" onClick={(event) => rememberAndOpenWorld(event, worldHref)}>לעמוד המקור בעולם</a>
      {example.sourceHref ? <a className="bm-button" href={example.sourceHref} target="_blank" rel="noreferrer">לפתיחת המקור ↗</a> : null}
      <Link className="bm-link" to={example.returnHref}>קישור קבוע לדוגמה</Link>
    </footer>
  </article>;
}

function Group({ id, kind, copy, rows }) {
  if (!rows.length) return null;
  return <div className="bm-guided-group" id={id}>
    <div className="bm-group-head">
      <h4 className="bm-group-title">{copy.title} <span className="bm-tag">{copy.eyebrow}</span></h4>
      <MeetingIllustration kind={kind} />
    </div>
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

    <Group id="guided-crossing" kind="crossing" copy={language.crossing} rows={guided.crossings} />
    <Group id="guided-convergence" kind="convergence" copy={language.convergence} rows={guided.convergences} />

    <div className="bm-map-cta" id="guided-map">
      <p>{mapCallout.description}</p>
      <a className="bm-button is-primary" href={mapCallout.href}>{mapCallout.title}</a>
    </div>
  </BeitMidrashSection>;
}
