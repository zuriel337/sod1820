import React from "react";
import BeitMidrashSection from "./BeitMidrashSection.jsx";

const sectionOf = (manifest, id) => manifest.sections.find((section) => section.id === id);

export default function BeitMidrashLearn({ manifest, focusedSection, focusedPath, children }) {
  const start = sectionOf(manifest, "start");
  const ciphers = sectionOf(manifest, "ciphers");
  const sources = sectionOf(manifest, "sources");
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
        </li>)}
      </ul>
    </BeitMidrashSection>
  </div>;
}
