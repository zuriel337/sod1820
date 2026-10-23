import React from "react";
import { Link } from "react-router-dom";
import BeitMidrashSection from "./BeitMidrashSection.jsx";
import BeitMidrashSod1820Presentation from "./BeitMidrashSod1820Presentation.jsx";
import { FibonacciSpiral, PathTrail, ReadingStrip, SkipIllustration } from "./BeitMidrashIllustrations.jsx";

const sectionOf = (manifest, id) => manifest.sections.find((section) => section.id === id);


const STRIP_LABELS = Object.freeze({
  source: "שבעת שלבי קריאת המקור",
  cipher: "שבעת שלבי קריאת הדילוג",
});

/**
 * One lesson shape for every manifest reading lesson: objectives, a horizontal step strip, one centred
 * step with how-to-check and its boundary, next-step navigation and an explanation-only exercise.
 * The chosen step lives in the URL only; nothing is scored, saved or requested here.
 */
function ReadingLesson({ lesson, kind, focusedId, illustration = null }) {
  const steps = lesson.steps;
  const index = Math.max(0, steps.findIndex((step) => step.id === focusedId));
  const step = steps[index];
  const next = steps[index + 1] || null;
  const attr = (name, value) => ({ [`data-${kind}-${name}`]: value });
  const internal = lesson.continuation.href.startsWith("/beit-midrash");
  return <div className="bm-reading-lesson" id={lesson.anchor} {...attr("lesson", lesson.id)}>
    <ul className="bm-reading-goals" aria-label="מה לומדים בשיעור">
      {lesson.objectives.map((objective) => <li key={objective}>{objective}</li>)}
    </ul>
    {illustration}
    <ReadingStrip steps={steps} focusedId={step.id} kind={kind} label={STRIP_LABELS[kind]} />
    <article
      className="bm-reading-step"
      id={`${kind}-step-${step.id}`}
      {...attr("step", step.id)}
      aria-labelledby={`${kind}-step-title-${step.id}`}
    >
      <header>
        <span>שלב {index + 1} מתוך {steps.length}</span>
        <h4 id={`${kind}-step-title-${step.id}`}>{step.title}</h4>
      </header>
      <section>
        <h5>מה עושים?</h5>
        <p>{step.body}</p>
      </section>
      <section>
        <h5>איך בודקים?</h5>
        <p>{step.check}</p>
      </section>
      <aside>
        <strong>הגבול שחשוב לזכור</strong>
        <p>{step.boundary}</p>
      </aside>
      {next ? <footer><Link className="bm-link" to={next.href}>לשלב הבא · {next.title}</Link></footer> : null}
    </article>

    <form className="bm-reading-exercise" {...attr("exercise", lesson.exercise.id)} onSubmit={(event) => event.preventDefault()}>
      <fieldset>
        <legend>{lesson.exercise.title}</legend>
        <p>{lesson.exercise.prompt}</p>
        {lesson.exercise.options.map((option) => <label key={option.id}>
          <input type="radio" name={`exercise-${lesson.exercise.id}`} value={option.id} />
          <span>{option.label}</span>
        </label>)}
      </fieldset>
      <details>
        <summary>להסבר</summary>
        <p>{lesson.exercise.explanation}</p>
      </details>
    </form>
    {internal
      ? <Link className="bm-link bm-reading-next" to={lesson.continuation.href}>{lesson.continuation.title}</Link>
      : <a className="bm-link bm-reading-next" href={lesson.continuation.href}>{lesson.continuation.title}</a>}
  </div>;
}

export default function BeitMidrashLearn({ manifest, focusedSection, focusedPath, focusedConcept, focusedSourceStep, focusedCipherStep, presentation = null, presentationOpen = false, catalogState = null, children }) {
  const start = sectionOf(manifest, "start");
  const ciphers = sectionOf(manifest, "ciphers");
  const sources = sectionOf(manifest, "sources");
  const numbers = sectionOf(manifest, "numbers");
  const paths = sectionOf(manifest, "paths");
  const isFocused = (id) => focusedSection === id;
  const selectedNumberConcept = manifest.numberGuideConcepts.find((concept) => concept.id === focusedConcept)
    || manifest.numberGuideConcepts[0];

  return <div className="bm-pillar" id="bm-learn">
    <h2 className="bm-pillar-title"><span aria-hidden="true">א</span>{manifest.pillars[0].title}</h2>

    <BeitMidrashSection id="start" icon="door" title={start.title} description={start.description} focused={isFocused("start")}>
      <ol className="bm-concepts">
        {manifest.beginnerConcepts.map((concept, index) => <li key={concept.id}>
          <span className="bm-concept-no" aria-hidden="true">{index + 1}</span>
          <h4>{concept.title}</h4>
          <p>{concept.body}</p>
        </li>)}
      </ol>
    </BeitMidrashSection>

    {children}

    <BeitMidrashSection id="ciphers" icon="cipher" title={ciphers.title} description={ciphers.description} focused={isFocused("ciphers")}>
      <ReadingLesson lesson={manifest.cipherReadingLesson} kind="cipher" focusedId={focusedCipherStep} illustration={<SkipIllustration />} />
    </BeitMidrashSection>

    <BeitMidrashSection id="sources" icon="books" title={sources.title} description={sources.description} focused={isFocused("sources")}>
      <ReadingLesson lesson={manifest.sourceReadingLesson} kind="source" focusedId={focusedSourceStep} />
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
      {presentation && focusedPath === "sod1820" ? (presentationOpen
        ? <BeitMidrashSod1820Presentation
          presentation={presentation}
          catalogState={catalogState}
          backHref={manifest.learningPaths.find((path) => path.id === "sod1820")?.href || "/beit-midrash?section=paths&path=sod1820"}
        />
        : <div className="bm-presentation-entry">
          <p>{presentation.description}</p>
          <Link className="bm-button is-primary" to={presentation.href} data-presentation-open="true">לפתיחת {presentation.title}</Link>
        </div>) : null}
    </BeitMidrashSection>
  </div>;
}
