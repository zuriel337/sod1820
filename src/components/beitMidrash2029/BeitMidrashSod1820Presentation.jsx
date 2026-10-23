import React, { useEffect, useRef } from "react";
import { Link, useNavigate } from "react-router-dom";
import { FrameState } from "../experience2029/Sod2029Shell.jsx";

/*
 * Visual lesson for the "מסע 1820" presentation. Every word, number, link and status below comes from
 * the presentation contract (learning.sod1820Presentation) or from the diamonds the canonical curation
 * catalog already supplied; this component fetches, calculates, ranks and de-duplicates nothing.
 */

const SOURCE_LABELS = Object.freeze({
  exact_source_locator: "מראה מקום מדויק",
  source_located_partial_extraction: "מראה המקום אותר · החילוץ חלקי",
  public_gematria_word_ids: "מזהי מילים ציבוריים באתר",
  canonical_curation_catalog: "הקטלוג הקנוני",
});
const CALCULATION_LABELS = Object.freeze({
  reproducible_arithmetic: "חשבון שאפשר לחזור עליו",
  canonical_engine_verified: "חושב במנוע הקנוני",
  canonical_components_verified_and_arithmetic_reproducible: "הרכיבים נבדקו במנוע והסכום חוזר",
  historic_method_mapping_open: "פער שיטה פתוח",
  pending_exact_reconstruction: "שחזור הסכום בבנייה",
  not_all_independently_recomputed: "לא כל הדוגמאות חושבו מחדש",
  carried_from_canonical_identity: "הערך מגיע מהזהות הקנונית",
});
const INTERPRETATION_LABELS = Object.freeze({
  teaching_frame: "מסגרת הוראה",
  separate: "הפירוש נפרד מן המקור ומן החישוב",
  explicitly_separate: "הפירוש נפרד מן המקור ומן החישוב",
  invitation_to_discovery: "הזמנה לגילוי",
  not_promoted: "לא מוצג כממצא",
  human_gate_curation: "אצירה באישור צוריאל",
});
const ZURIEL_APPROVED = "zuriel_approved_pending_exact_locator";

const hasValue = (value) => value != null && value !== "";

function Facts({ truth, approvalLabel }) {
  const source = truth.source === ZURIEL_APPROVED ? approvalLabel : SOURCE_LABELS[truth.source] || null;
  const calculation = CALCULATION_LABELS[truth.calculation] || null;
  const interpretation = INTERPRETATION_LABELS[truth.interpretation] || null;
  const rows = [["מקור", source], ["חישוב", calculation], ["פירוש", interpretation]];
  if (!source && !calculation && !interpretation) return null;
  return <dl className="bm-facts" aria-label="מה ידוע כאן">
    {rows.map(([name, text]) => (text ? <div key={name}><dt>{name}</dt><dd>{text}</dd></div> : null))}
  </dl>;
}

function SourceLink({ source }) {
  const external = /^https?:/i.test(source.sourceHref || "");
  const label = <span>{source.label}</span>;
  return <li>
    {source.sourceHref
      ? <a className="bm-link" href={source.sourceHref} {...(external ? { target: "_blank", rel: "noreferrer" } : {})}>
        {label}{external ? " ↗" : ""}
      </a>
      : label}
    <code dir="ltr">{source.sourceRef}</code>
    <small>{SOURCE_LABELS[source.status] || (source.status === ZURIEL_APPROVED ? "אושר על־ידי צוריאל" : null)}</small>
  </li>;
}

function CalcLink({ href }) {
  return href ? <Link className="bm-link" to={href}>לבדיקה במחשבון</Link> : null;
}

function Equations({ items }) {
  return <ul className="bm-slide-equations">
    {items.map((item) => <li key={item.label || item.expression}>
      {item.label ? <strong>{item.label}</strong> : null}
      <span className="bm-eq">{item.expression}</span>
      {hasValue(item.value) ? <b>{item.value}</b> : null}
    </li>)}
  </ul>;
}

function SlideBody({ slide, presentation, catalogState }) {
  const approvalLabel = presentation.approvalPolicy.label;
  return <>
    {slide.media ? <figure className="bm-slide-media">
      <img src={slide.media.src} alt={slide.media.alt} loading="lazy" decoding="async" />
    </figure> : null}

    {slide.figures ? <ol className="bm-slide-figures" aria-label="המניין בחמשת החומשים">
      {slide.figures.map((figure) => <li key={figure.label}><span>{figure.label}</span><b>{figure.value}</b></li>)}
    </ol> : null}
    {slide.equation ? <p className="bm-slide-equation" dir="ltr">{slide.equation}</p> : null}
    {slide.parts ? <ul className="bm-slide-parts">
      {slide.parts.map((part) => <li key={part.expression}><span>{part.expression}</span><b>{part.value}</b></li>)}
    </ul> : null}

    {slide.layers ? <ol className="bm-slide-layers">
      {slide.layers.map((layer) => <li key={layer.id}><strong>{layer.title}</strong><span>{layer.body}</span></li>)}
    </ol> : null}

    {slide.equations && !slide.examples ? <Equations items={slide.equations} /> : null}

    {slide.comparison ? <div className="bm-gap" role="group" aria-label={`${slide.comparison.expression}: פער שיטה פתוח`}>
      <p className="bm-gap-word">{slide.comparison.expression}</p>
      <div className="bm-gap-values">
        <div><small>בסרטון · מילוי היסטורי</small><b>{slide.comparison.historicVideoValue}</b></div>
        <span aria-hidden="true">≠</span>
        <div><small>הרישום הקנוני כיום · מילוי</small><b>{slide.comparison.currentCanonicalMiluyValue}</b></div>
      </div>
      <p className="bm-gap-note">פער שיטה פתוח — מיפוי צורת המילוי טרם נסגר, ולכן הערך ההיסטורי נשמר כמות שהוא ואינו מסומן כחישוב שאומת במנוע.</p>
    </div> : null}

    {slide.id === "book-catalog" ? <>
      <ul className="bm-slide-list">
        {slide.examples.map((example) => <li key={example.source.sourceRef}>
          <strong>{example.title}</strong>
          <a className="bm-link" href={example.source.sourceHref}>לפתיחה בספר</a>
          <small>{SOURCE_LABELS[example.source.status]}</small>
        </li>)}
      </ul>
      {presentation.book.constructionStatus === "in_progress"
        ? <p className="bm-note">דף הספר עדיין בבנייה. הקישורים פותחים את הבחירה המדויקת בספר ככל שהוא פתוח לקריאה; הם אינם עוקפים את נעילתו.</p>
        : null}
    </> : null}

    {slide.id === "strong-1820" ? <ul className="bm-slide-list">
      {slide.examples.map((example) => <li key={example.id}>
        <strong>{example.expression}</strong>
        <span className="bm-tag">{example.method}</span>
        <b>{example.value}</b>
        <CalcLink href={example.calculatorHref} />
        <small>{example.credit ? `הובא על ידי ${example.credit} · ` : ""}<code dir="ltr">{example.sourceRef}</code></small>
      </li>)}
    </ul> : null}

    {slide.id === "bibi-examples" ? <>
      <p className="bm-outside"><span className="bm-tag">מחוץ לציר חישובי 1820</span></p>
      {slide.examples.map((example) => <div key={example.id} className="bm-bibi">
        <h6>{example.title}</h6>
        <ul className="bm-slide-list">
          {example.equations.map((equation) => <li key={equation.sourceRef}>
            <strong>{equation.expression}</strong>
            <span className="bm-tag">{equation.method}</span>
            <b>{equation.value}</b>
            <CalcLink href={equation.calculatorHref} />
            <small><code dir="ltr">{equation.sourceRef}</code></small>
          </li>)}
        </ul>
        <p className="bm-note">{example.note}</p>
      </div>)}
    </> : null}

    {slide.diamonds ? <>
      {catalogState.loading ? <FrameState kind="loading" title="פותח את חתימות היהלום">החתימות נטענות מן הקטלוג הקנוני.</FrameState> : null}
      {catalogState.error ? <FrameState kind="error" title="חתימות היהלום אינן זמינות כרגע" action={
        <button type="button" className="bm-button" onClick={catalogState.retry}>נסו שוב</button>
      }>לא מוצגת רשימה חלופית.</FrameState> : null}
      {!catalogState.loading && !catalogState.error && !slide.diamonds.length ? <FrameState kind="empty" title="אין כרגע חתימות להצגה">הקטלוג הקנוני לא החזיר חתימות פעילות.</FrameState> : null}
      {slide.diamonds.length ? <>
        <p className="bm-count">{slide.diamonds.length} חתימות</p>
        <ul className="bm-diamonds" data-diamond-count={slide.diamonds.length}>
          {slide.diamonds.map((diamond) => <li key={diamond.id} data-diamond-id={diamond.id}>
            <strong>{diamond.label}</strong>
            {hasValue(diamond.value) ? <b>{diamond.value}</b> : null}
            {diamond.description ? <span>{diamond.description}</span> : null}
            <CalcLink href={diamond.calculatorHref} />
          </li>)}
        </ul>
      </> : null}
    </> : null}

    {slide.sources.length ? <section className="bm-slide-sources" aria-label="מקורות התחנה">
      <h6>מקורות</h6>
      <ul>{slide.sources.map((source) => <SourceLink key={source.id} source={source} />)}</ul>
    </section> : null}
    <Facts truth={slide.truth} approvalLabel={approvalLabel} />
  </>;
}

export default function BeitMidrashSod1820Presentation({ presentation, catalogState, backHref }) {
  const navigate = useNavigate();
  const strip = useRef(null);
  const { slides, selectedSlide: slide, selectedIndex, previousSlide, nextSlide } = presentation;

  useEffect(() => {
    strip.current?.querySelector('[aria-current="step"]')?.scrollIntoView?.({ inline: "center", block: "nearest", behavior: "auto" });
  }, [slide.id]);

  // In a right-to-left page "next" is to the left.
  const onKeyDown = (event) => {
    if (event.defaultPrevented || event.altKey || event.ctrlKey || event.metaKey || event.shiftKey) return;
    if (/^(input|textarea|select)$/i.test(event.target?.tagName || "") || event.target?.isContentEditable) return;
    const target = {
      ArrowLeft: nextSlide, ArrowRight: previousSlide, Home: slides[0], End: slides[slides.length - 1],
    }[event.key];
    if (!target || target.id === slide.id) return;
    event.preventDefault();
    navigate(target.href);
  };

  return <section
    className="bm-presentation"
    id="sod1820-presentation"
    aria-roledescription="מצגת"
    aria-label={presentation.title}
    tabIndex={-1}
    onKeyDown={onKeyDown}
    data-presentation={presentation.id}
  >
    <header className="bm-presentation-head">
      <span className="bm-eyebrow">מצגת לימודית</span>
      <h4>{presentation.title}</h4>
      <p>{presentation.description}</p>
    </header>

    <nav className="bm-presentation-strip bm-reading-strip" aria-label="תחנות המצגת">
      <ol ref={strip} className="bm-reading-trail">
        {slides.map((item, index) => <li key={item.id}>
          <Link
            to={item.href}
            aria-current={item.id === slide.id ? "step" : undefined}
            data-slide-link={item.id}
            aria-label={`תחנה ${index + 1} מתוך ${slides.length}: ${item.chapter}`}
          >
            <span className="bm-trail-node" aria-hidden="true">{index + 1}</span>
            <strong>{item.chapter}</strong>
          </Link>
        </li>)}
      </ol>
      <div className="bm-presentation-progress" aria-hidden="true"><i style={{ width: `${((selectedIndex + 1) / slides.length) * 100}%` }} /></div>
    </nav>

    <article
      className="bm-slide"
      id={`sod1820-slide-${slide.id}`}
      data-slide={slide.id}
      aria-labelledby={`sod1820-slide-title-${slide.id}`}
    >
      <header>
        <span>{slide.chapter} · תחנה {slide.position} מתוך {slide.total}</span>
        <h5 id={`sod1820-slide-title-${slide.id}`}>{slide.title}</h5>
        <p>{slide.statement}</p>
      </header>
      <SlideBody slide={slide} presentation={presentation} catalogState={catalogState} />
    </article>

    <div className="bm-presentation-nav">
      {previousSlide ? <Link className="bm-button" to={previousSlide.href} rel="prev">→ {previousSlide.chapter}</Link> : <span />}
      {nextSlide ? <Link className="bm-button is-primary" to={nextSlide.href} rel="next">{nextSlide.chapter} ←</Link> : <Link className="bm-button" to={backHref}>חזרה למסלול 1820</Link>}
    </div>
    <p className="bm-presentation-hint">אפשר לנווט גם בחצים ובמקשי Home ו־End. התחנה הנוכחית נשמרת בכתובת בלבד.</p>
  </section>;
}
