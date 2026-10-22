import React from "react";
import { Link } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";

const sectionOf = (manifest, id) => manifest.sections.find((section) => section.id === id);

export default function BeitMidrashLearn({ manifest, focusedSection, focusedPath, focusedConcept, children }) {
  const start = sectionOf(manifest, "start");
  const ciphers = sectionOf(manifest, "ciphers");
  const sources = sectionOf(manifest, "sources");
  const numbers = sectionOf(manifest, "numbers");
  const paths = sectionOf(manifest, "paths");
  const isFocused = (id) => focusedSection === id;

  return <div className="bm-pillar" id="bm-learn">
    <h2 className="bm-pillar-title"><span aria-hidden="true">א</span>{manifest.pillars[0].title}</h2>

    <BeitMidrashSection id="start" icon="discovery" title={start.title} description={start.description} focused={isFocused("start")}>
      <ol className="bm-concepts">
        {manifest.beginnerConcepts.map((concept, index) => <li key={concept.id}>
          <span className="bm-concept-no" aria-hidden="true">{index + 1}</span>
          <h4>{concept.title}</h4>
          <p>{concept.body}</p>
        </li>)}
      </ol>
    </BeitMidrashSection>

    {children}

    <BeitMidrashSection id="ciphers" icon="letters" title={ciphers.title} description={ciphers.description} focused={isFocused("ciphers")}>
      <a className="bm-link" href={manifest.destinations.ciphers.href}>{manifest.destinations.ciphers.title}</a>
    </BeitMidrashSection>

    <BeitMidrashSection id="sources" icon="posts" title={sources.title} description={sources.description} focused={isFocused("sources")}>
      <p className="bm-note">{manifest.beginnerConcepts.find((concept) => concept.id === "source").body}</p>
    </BeitMidrashSection>

    <BeitMidrashSection id="numbers" icon="number" title={numbers.title} description={numbers.description} focused={isFocused("numbers")}>
      <ol className="bm-number-guide">
        {manifest.numberGuideConcepts.map((concept, index) => <li
          key={concept.id}
          id={`number-concept-${concept.id}`}
          className={concept.id === focusedConcept ? "is-focused" : ""}
          data-number-concept={concept.id}
        >
          <span className="bm-concept-no" aria-hidden="true">{index + 1}</span>
          <div>
            <h4>{concept.title}</h4>
            <p>{concept.body}</p>
            <Link className="bm-link" to={concept.href}>לראות בדף 1820</Link>
          </div>
        </li>)}
      </ol>
    </BeitMidrashSection>

    <BeitMidrashSection id="paths" icon="journey" title={paths.title} description={paths.description} focused={isFocused("paths")}>
      <ul className="bm-paths">
        {manifest.learningPaths.map((path) => <li
          key={path.id}
          id={`path-${path.id}`}
          className={path.id === focusedPath ? "is-focused" : ""}
          data-path-id={path.id}
        >
          <strong>{path.title}</strong>
          <span>{path.description}</span>
          <Link className="bm-path-open" to={path.href}>{path.id === focusedPath ? "המסלול פתוח" : "פתח מסלול"}</Link>
          {path.id === focusedPath ? <ol className="bm-path-steps">
            {path.steps.map((step) => <li key={`${path.id}:${step.title}`}>
              <Link to={step.href}>{step.title}</Link>
            </li>)}
          </ol> : null}
        </li>)}
      </ul>
    </BeitMidrashSection>
  </div>;
}
