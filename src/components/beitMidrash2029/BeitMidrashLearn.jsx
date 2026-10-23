import React from "react";
import { Link } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";
import { FibonacciSpiral, PathTrail, SourceReadingStrip } from "./BeitMidrashIllustrations.jsx";

const sectionOf = (manifest, id) => manifest.sections.find((section) => section.id === id);

export default function BeitMidrashLearn({ manifest, focusedSection, focusedPath, focusedConcept, focusedSourceStep, children }) {
  const start = sectionOf(manifest, "start");
  const ciphers = sectionOf(manifest, "ciphers");
  const sources = sectionOf(manifest, "sources");
  const numbers = sectionOf(manifest, "numbers");
  const paths = sectionOf(manifest, "paths");
  const isFocused = (id) => focusedSection === id;
  const sourceLesson = manifest.sourceReadingLesson;
  const sourceSteps = sourceLesson.steps;
  const sourceIndex = Math.max(0, sourceSteps.findIndex((step) => step.id === focusedSourceStep));
  const sourceStep = sourceSteps[sourceIndex];
  const nextSourceStep = sourceSteps[sourceIndex + 1] || null;
  const selectedNumberConcept = manifest.numberGuideConcepts.find((concept) => concept.id === focusedConcept)
    || manifest.numberGuideConcepts[0];

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
      <div className="bm-source-lesson" id={sourceLesson.anchor} data-source-lesson={sourceLesson.id}>
        <ul className="bm-source-goals" aria-label="מה לומדים בשיעור">
          {sourceLesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}
        </ul>
        <SourceReadingStrip steps={sourceSteps} focusedId={sourceStep.id} />
        <article
          className="bm-source-step"
          id={`source-step-${sourceStep.id}`}
          data-source-step={sourceStep.id}
          aria-labelledby={`source-step-title-${sourceStep.id}`}
        >
          <header>
            <span>שלב {sourceIndex + 1} מתוך {sourceSteps.length}</span>
            <h4 id={`source-step-title-${sourceStep.id}`}>{sourceStep.title}</h4>
          </header>
          <section>
            <h5>מה עושים?</h5>
            <p>{sourceStep.body}</p>
          </section>
          <section>
            <h5>איך בודקים?</h5>
            <p>{sourceStep.check}</p>
          </section>
          <aside>
            <strong>הגבול שחשוב לזכור</strong>
            <p>{sourceStep.boundary}</p>
          </aside>
          {nextSourceStep ? <footer><Link className="bm-link" to={nextSourceStep.href}>לשלב הבא · {nextSourceStep.title}</Link></footer> : null}
        </article>

        <form className="bm-source-exercise" data-source-exercise={sourceLesson.exercise.id} onSubmit={(event) => event.preventDefault()}>
          <fieldset>
            <legend>{sourceLesson.exercise.title}</legend>
            <p>{sourceLesson.exercise.prompt}</p>
            {sourceLesson.exercise.options.map((option) => <label key={option.id}>
              <input type="radio" name={`exercise-${sourceLesson.exercise.id}`} value={option.id} />
              <span>{option.label}</span>
            </label>)}
          </fieldset>
          <details>
            <summary>להסבר</summary>
            <p>{sourceLesson.exercise.explanation}</p>
          </details>
        </form>
        <Link className="bm-link bm-source-next" to={sourceLesson.continuation.href}>{sourceLesson.continuation.title}</Link>
      </div>
    </BeitMidrashSection>

    <BeitMidrashSection id="numbers" icon="number" title={numbers.title} description={numbers.description} focused={isFocused("numbers")}>
      <div className="bm-number-learning">
        <nav className="bm-number-topics" aria-label="נושאים לקריאת דף מספר">
          {manifest.numberGuideConcepts.map((concept, index) => {
            const selected = concept.id === selectedNumberConcept.id;
            return <Link
              key={concept.id}
              to={`/beit-midrash?section=numbers&concept=${encodeURIComponent(concept.id)}#number-concept-${encodeURIComponent(concept.id)}`}
              className={selected ? "is-selected" : ""}
              aria-current={selected ? "true" : undefined}
              data-number-concept-option={concept.id}
            >
              <span aria-hidden="true">{index + 1}</span>
              <strong>{concept.title}</strong>
            </Link>;
          })}
        </nav>
        <article
          className="bm-number-lesson"
          id={`number-concept-${selectedNumberConcept.id}`}
          data-number-concept={selectedNumberConcept.id}
        >
          <header>
            <span>הנושא שבחרתם</span>
            <h4>{selectedNumberConcept.title}</h4>
            {selectedNumberConcept.id === "fibonacci" ? <FibonacciSpiral /> : null}
          </header>
          <section>
            <h5>מה לומדים?</h5>
            <p>{selectedNumberConcept.body}</p>
          </section>
          <section>
            <h5>איך בודקים?</h5>
            <p>{selectedNumberConcept.check}</p>
          </section>
          <aside>
            <strong>הגבול שחשוב לזכור</strong>
            <p>{selectedNumberConcept.boundary}</p>
          </aside>
        </article>
      </div>
    </BeitMidrashSection>

    <BeitMidrashSection id="paths" icon="journey" title={paths.title} description={paths.description} focused={isFocused("paths")}>
      <ul className="bm-paths">
        {manifest.learningPaths.map((path) => <li
          key={path.id}
          id={`path-${path.id}`}
          className={path.id === focusedPath ? "is-focused" : ""}
          data-path-id={path.id}
        >
          <PathTrail steps={path.steps?.length} />
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
