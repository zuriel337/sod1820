import React, { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchCanonicalTopicConvergenceFinding } from "../lib/research/topicConvergence.js";
import { buildTopic2029Projection } from "../lib/research/topic2029Projection.js";
import { applySeo, clearConvergenceJsonLd, setConvergenceJsonLd } from "../lib/seo.js";
import "./topic2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const textOf = (row) => clean(row?.text || row?.title || row?.phrase || row?.note);

function TopicPhrases({ rows = [] }) {
  if (!rows.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-phrases">
    <div className="sod29-section-head"><div><div className="sod29-kicker">EXPRESSIONS</div><h2>מה מתכנס כאן?</h2></div><span className="sod29-chip">{rows.length}</span></div>
    <div className="sod29-topic-phrase-grid">
      {rows.map((row, index) => {
        const text = textOf(row);
        if (!text) return null;
        return <Link className="sod29-topic-phrase" to={"/number/" + encodeURIComponent(text)} key={row.sourcePath || (text + "-" + index)}>
          <strong>{text}</strong><small>פתח בדף הביטוי ←</small>
        </Link>;
      })}
    </div>
  </section>;
}

function TopicFindings({ projection }) {
  const S = projection.sections || {};
  const headline = (S.headline || []).map(textOf).filter(Boolean);
  const hints = (S.hint || []).map(textOf).filter(Boolean);
  const bullets = (S.bullets || []).map(textOf).filter(Boolean);
  const concepts = (S.concepts || []).filter(Boolean);
  const rows = (S.rows || []).filter(Boolean);
  const numericClaims = (S.numericClaims || []).filter(Boolean);
  if (!headline.length && !hints.length && !bullets.length && !concepts.length && !rows.length && !numericClaims.length) return null;

  return <section className="sod29-section sod29-topic-section" id="topic-findings">
    <div className="sod29-section-head"><div><div className="sod29-kicker">FINDINGS</div><h2>למה הדברים האלה נמצאים יחד?</h2></div></div>
    {headline.map((text, i) => <h3 className="sod29-topic-headline" key={"h-" + i}>{text}</h3>)}
    {hints.map((text, i) => <div className="sod29-topic-hint" key={"hint-" + i}>{text}</div>)}
    {concepts.map((row, i) => <div className="sod29-topic-finding-card" key={row.sourcePath || i}>
      {row.title ? <strong>{row.title}</strong> : null}
      {row.text ? <p>{row.text}</p> : null}
      {row.hint ? <small>{row.hint}</small> : null}
    </div>)}
    {bullets.length ? <ul className="sod29-topic-bullets">{bullets.map((text, i) => <li key={"b-" + i}>{text}</li>)}</ul> : null}
    {rows.length || numericClaims.length ? <div className="sod29-topic-claims">
      {[...numericClaims, ...rows].map((row, i) => {
        const phrase = clean(row.phrase || row.text);
        const value = Number(row.value);
        return <div className="sod29-topic-claim" key={row.sourcePath || i}>
          <div><strong>{phrase || "ממצא מספרי"}</strong>{row.method ? <small>{row.method}</small> : null}{row.note ? <small>{row.note}</small> : null}</div>
          {Number.isFinite(value) ? <Link to={"/number/" + value}>{value}</Link> : null}
        </div>;
      })}
    </div> : null}
  </section>;
}

function TopicConnections({ projection }) {
  const connections = Array.isArray(projection.sections?.connections) ? projection.sections.connections : [];
  if (!connections.length) return null;
  return <section className="sod29-section sod29-topic-section">
    <div className="sod29-section-head"><div><div className="sod29-kicker">RELATIONS</div><h2>קשרים בתוך ההתכנסות</h2></div></div>
    <div className="sod29-list">
      {connections.map((row, index) => {
        const number = Number(row.number);
        const labels = Array.isArray(row.links) ? row.links.filter(Boolean) : [];
        return <div className="sod29-row" key={row.sourcePath || index}>
          <div><strong>{labels.join(" · ") || textOf(row) || "קשר"}</strong><small>קשר נקודתי בתוך ההתכנסות</small></div>
          {Number.isFinite(number) ? <Link className="sod29-action" to={"/number/" + number}>{number}</Link> : null}
        </div>;
      })}
    </div>
  </section>;
}

function TopicRelated({ projection }) {
  const related = projection.relatedConvergences || [];
  const posts = projection.relatedPosts || [];
  if (!related.length && !posts.length) return null;
  return <section className="sod29-section sod29-topic-section">
    <div className="sod29-section-head"><div><div className="sod29-kicker">RELATED</div><h2>לאן ממשיכים מכאן?</h2></div></div>
    <div className="sod29-topic-related-grid">
      {related.map((row, index) => {
        const slug = clean(row.slug);
        const label = clean(row.title || row.note) || "התכנסות קשורה";
        return slug ? <Link className="sod29-card sod29-card-button" to={"/topic/" + encodeURIComponent(slug)} key={row.sourcePath || (slug + "-" + index)}><div className="sod29-kicker">התכנסות</div><h3>{label}</h3><p>פתח את הזהות הקנונית של ההתכנסות.</p></Link> : null;
      })}
      {posts.map((row, index) => {
        const slug = clean(row.slug);
        const label = clean(row.title || row.text) || "פוסט קשור";
        return slug ? <Link className="sod29-card sod29-card-button" to={"/" + slug} key={row.sourcePath || (slug + "-" + index)}><div className="sod29-kicker">מקור / פוסט</div><h3>{label}</h3><p>פתח את המקור המקושר.</p></Link> : null;
      })}
    </div>
  </section>;
}

function TopicCaveats({ projection }) {
  const caveats = (projection.caveats || []).map(textOf).filter(Boolean);
  if (!caveats.length) return null;
  return <section className="sod29-section sod29-topic-caveats" aria-label="הסתייגויות וגבולות">
    <div className="sod29-kicker">TRUTH BOUNDARY</div>
    <h2>מה חשוב לא להסיק מכאן</h2>
    {caveats.map((text, i) => <p key={i}>{text}</p>)}
  </section>;
}

function TopicBody() {
  const { slug = "" } = useParams();
  const shell = use2029Shell();
  const research = useResearch();
  const [state, setState] = useState({ loading: true, finding: null, error: null });

  useEffect(() => {
    let alive = true;
    setState({ loading: true, finding: null, error: null });
    fetchCanonicalTopicConvergenceFinding(slug)
      .then((finding) => {
        if (!alive) return;
        setState({ loading: false, finding: finding || null, error: finding ? null : new Error("not_found") });
      })
      .catch((error) => { if (alive) setState({ loading: false, finding: null, error }); });
    return () => { alive = false; };
  }, [slug]);

  const projection = useMemo(() => buildTopic2029Projection(state.finding), [state.finding]);

  useEffect(() => {
    if (!projection) return undefined;
    const subject = { id: projection.slug, type: "topic", label: projection.title, href: projection.canonicalPath };
    const selection = { entityId: projection.slug, entityType: "topic" };
    if (!research.context?.subject) research.setResearchContext?.({ subject, selection, lens: "topic" });
    else research.updateResearchContext?.({ selection, lens: "topic" });
    return undefined;
  }, [projection?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!projection) return undefined;
    applySeo({
      title: projection.title + " · " + projection.publicLabel,
      description: projection.description,
      path: projection.canonicalPath,
    });
    setConvergenceJsonLd({
      title: projection.title,
      description: projection.description,
      path: projection.canonicalPath,
      numbers: projection.numbers,
    });
    return () => clearConvergenceJsonLd();
  }, [projection?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  if (state.loading) return <FrameState kind="loading" title="פותח את ההתכנסות">טוען את הזהות, הממצאים והמקורות מאותו Research Graph.</FrameState>;
  if (state.error || !projection) return <FrameState kind="error" title="ההתכנסות לא נמצאה">לא נייצר דף חלופי או תוכן משוער. אפשר לחזור לעולם ולבחור התכנסות קיימת.</FrameState>;

  const primaryNumbers = projection.highlightNumbers.length ? projection.highlightNumbers : projection.numbers.slice(0, 6);

  return <article className="sod29-topic2029" data-entity-type="convergence" data-canonical-slug={projection.slug}>
    <header className="sod29-topic-hero">
      <div className="sod29-topic-hero-copy">
        <div className="sod29-kicker">התכנסות · CANONICAL TOPIC</div>
        <h1>{projection.title}</h1>
        <p className="sod29-topic-summary">{projection.description}</p>
        <div className="sod29-topic-meta">
          {projection.createdBy ? <span>מקור / תרומה · {projection.createdBy}</span> : null}
          <span>{projection.authoredFactsCount} פריטי תוכן</span>
          {projection.imageIds.length ? <span>{projection.imageIds.length} פריטי מדיה מחוברים</span> : null}
        </div>
        <div className="sod29-actions">
          <Link className="sod29-action primary" to="/world">◌ חזרה לעולם</Link>
          <button className="sod29-action" type="button" onClick={() => shell.openRaziel({ topicSlug: projection.slug, topicTitle: projection.title })}>✦ שאל את רזיאל</button>
          <Link className="sod29-action" to="/heichal">◇ העמק בהיכל</Link>
          <ShareActions type="topic" url={"https://sod1820.co.il" + projection.canonicalPath} title={projection.title} channels={["native","copy"]} />
        </div>
      </div>
      <div className="sod29-topic-anchor-cluster" aria-label="המספרים המרכזיים בהתכנסות">
        {primaryNumbers.map((value) => <Link to={"/number/" + value} className="sod29-topic-anchor" key={value}><strong>{value}</strong><small>מספר</small></Link>)}
      </div>
    </header>

    <section className="sod29-section sod29-topic-intro">
      <div className="sod29-kicker">WHAT IS THIS?</div>
      <h2>מה ההתכנסות הזאת?</h2>
      <p>{projection.description}</p>
      <div className="sod29-topic-truth-strip">
        <span>התכנסות ≠ עובדה קנונית</span>
        <span>חישוב ≠ פרשנות</span>
        <span>מקור ≠ מסקנה</span>
      </div>
    </section>

    {projection.withheld ? <FrameState kind="unavailable" title="גוף ההתכנסות אינו מוצג לציבור">קיימת זהות ציבורית, אבל מקור התוכן סימן את הגוף כלא־מיועד לפרסום. לא נעקוף את הסימון.</FrameState> : <>
      <TopicPhrases rows={projection.phrases} />
      <TopicFindings projection={projection} />
      <TopicConnections projection={projection} />
      <TopicRelated projection={projection} />
      <TopicCaveats projection={projection} />
    </>}

    <section className="sod29-section sod29-topic-source">
      <div className="sod29-section-head"><div><div className="sod29-kicker">PROVENANCE</div><h2>מקור ושיוך</h2></div></div>
      <div className="sod29-list">
        {projection.attribution.length ? projection.attribution.map((value) => <div className="sod29-row" key={value}><div><strong>{value}</strong><small>שיוך שמור במקור</small></div></div>) : <div className="sod29-row"><div><strong>אין שיוך אנושי נוסף</strong><small>לא ננחש מחבר כשאין attribution מפורש.</small></div></div>}
      </div>
    </section>
  </article>;
}

export default function Topic2029Page() {
  return <Sod2029Shell
    surface="world"
    symbol="✦"
    eyebrow="SOD1820 · התכנסות"
    title="התכנסות"
    description="זהות מחקרית ציבורית אחת — מספרים, ביטויים, מקורות וממצאים סביב אותו מוקד."
    status="World · Convergence"
  >
    <TopicBody />
  </Sod2029Shell>;
}
