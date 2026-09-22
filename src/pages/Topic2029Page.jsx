import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchCanonicalTopicConvergenceFinding } from "../lib/research/topicConvergence.js";
import { buildTopic2029Projection } from "../lib/research/topic2029Projection.js";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchWorldProminenceInputs } from "../lib/research/worldProminenceInputs.js";
import { buildWorldContextualProminence } from "../lib/research/worldContextualProminence.js";
import { buildTopicGoldenProjection } from "../lib/research/topicGoldenProjection.js";
import { resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { applySeo, clearConvergenceJsonLd, setConvergenceJsonLd } from "../lib/seo.js";
import "./topic2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const textOf = (row) => clean(row?.text || row?.title || row?.phrase || row?.note);

function TopicMapNav({ items = [] }) {
  if (!items.length) return null;
  return <nav className="sod29-topic-mapnav" aria-label="מפת ההתכנסות">
    {items.map(([label, id]) => <a key={id} href={`#${id}`}>{label}</a>)}
  </nav>;
}

function TopicPhrases({ rows = [], onOpenExpression, openingExpression = null }) {
  if (!rows.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-phrases">
    <div className="sod29-section-head"><div><div className="sod29-kicker">ביטויים</div><h2>מה מתכנס כאן?</h2></div><span className="sod29-chip">{rows.length}</span></div>
    <div className="sod29-topic-phrase-grid">
      {rows.map((row, index) => {
        const text = textOf(row);
        if (!text) return null;
        const opening = openingExpression === text;
        return <button className="sod29-topic-phrase" type="button" disabled={opening} onClick={() => onOpenExpression?.(text)} key={row.sourcePath || (text + "-" + index)}>
          <strong>{text}</strong><small>{opening ? "בודק במנוע…" : "פתח במספר עם מיקוד ←"}</small>
        </button>;
      })}
    </div>
  </section>;
}

function TopicFindings({ projection, onOpenExpression }) {
  const S = projection.sections || {};
  const headline = (S.headline || []).map(textOf).filter(Boolean);
  const hints = (S.hint || []).map(textOf).filter(Boolean);
  const bullets = (S.bullets || []).map(textOf).filter(Boolean);
  const concepts = (S.concepts || []).filter(Boolean);
  const rows = (S.rows || []).filter(Boolean);
  const numericClaims = (S.numericClaims || []).filter(Boolean);
  if (!headline.length && !hints.length && !bullets.length && !concepts.length && !rows.length && !numericClaims.length) return null;

  return <section className="sod29-section sod29-topic-section" id="topic-findings">
    <div className="sod29-section-head"><div><div className="sod29-kicker">ממצאים</div><h2>למה הדברים האלה נמצאים יחד?</h2></div></div>
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
          {Number.isFinite(value)
            ? (phrase && onOpenExpression
              ? <button type="button" className="sod29-topic-claim-number" onClick={() => onOpenExpression(phrase)}>{value}</button>
              : <Link to={"/2029/number/" + value}>{value}</Link>)
            : null}
        </div>;
      })}
    </div> : null}
  </section>;
}

function TopicAuthoredConnections({ projection }) {
  const connections = Array.isArray(projection.sections?.connections) ? projection.sections.connections : [];
  if (!connections.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-authored-connections">
    <div className="sod29-section-head"><div><div className="sod29-kicker">קשרים מתוך המקור</div><h2>קשרים שנכתבו בתוך ההתכנסות</h2></div></div>
    <div className="sod29-list">
      {connections.map((row, index) => {
        const number = Number(row.number);
        const labels = Array.isArray(row.links) ? row.links.filter(Boolean) : [];
        return <div className="sod29-row" key={row.sourcePath || index}>
          <div><strong>{labels.join(" · ") || textOf(row) || "קשר"}</strong><small>קשר שמור בגוף ההתכנסות</small></div>
          {Number.isFinite(number) ? <Link className="sod29-action" to={"/2029/number/" + number}>{number}</Link> : null}
        </div>;
      })}
    </div>
  </section>;
}

const KIND_LABELS = Object.freeze({
  research: "מחקר",
  topic: "התכנסות",
  convergence: "התכנסות",
  "graph-relation": "קשר",
  source: "מקור",
  number: "מספר",
  entity: "ישות",
  post: "פוסט",
  event: "אירוע",
});

const RELATION_LABELS = Object.freeze({
  related: "קשור",
  contains: "מכיל",
  mentions: "מזכיר",
  converges_on: "מתכנס אל",
  evidence_for: "ראיה עבור",
});

const CURATION_LABELS = Object.freeze({
  gold: "זהב",
  silver: "כסף",
  bronze: "ארד",
});

const SIGNAL_LABELS = Object.freeze({
  engine_match: "אימות מנוע",
  provenance_present: "מקור מתועד",
  decision_changing_negative_or_control: "דורש תשומת לב מחקרית",
  dependency_grouped_before_rank: "נורמל תלות",
  canonical_person_owner_present: "בעל־זהות קנוני",
});

function TopicProminence({ golden, loading = false }) {
  const items = golden?.prominenceItems || [];
  if (!loading && !items.length) return null;
  return <section className="sod29-section sod29-topic-section sod29-topic-prominence" id="topic-prominence" data-rank-owner="research_gold_hints_law-v3">
    <div className="sod29-section-head">
      <div><div className="sod29-kicker">בולט עכשיו</div><h2>מה מוביל את המחקר סביב ההתכנסות?</h2></div>
      <span className="sod29-chip">{loading ? "…" : items.length}</span>
    </div>
    <p className="sod29-topic-section-note">סדר תצוגה הקשרי בלבד — לא ציון אמת, לא קנוניזציה ולא החלטת פרסום.</p>
    {loading ? <div className="sod29-topic-loading">מחבר את שכבת המחקר וה־Explain-Why…</div> : <div className="sod29-topic-prominence-grid">
      {items.map((item, index) => {
        const why = item.explainWhy || {};
        const signals = Array.isArray(why.researchStrengthSignals) ? why.researchStrengthSignals : [];
        const tier = clean(why?.humanCuration?.tier);
        return <article key={item.id || index}>
          <span>{KIND_LABELS[item.kind] || KIND_LABELS[item.type] || "מחקר"}</span>
          <strong>{item.label}</strong>
          {item.summary ? <p>{item.summary}</p> : null}
          <div className="sod29-topic-rank-signals">
            {signals.slice(0, 4).map((signal) => <small key={signal}>{SIGNAL_LABELS[signal] || signal}</small>)}
            {tier ? <small className="is-curated">אוצרות · {CURATION_LABELS[tier.toLowerCase()] || tier}</small> : null}
            {why.uncertainty ? <small className="is-uncertain">אי־ודאות גלויה</small> : null}
          </div>
        </article>;
      })}
    </div>}
  </section>;
}

function TopicGraphConnections({ golden }) {
  const rows = golden?.graphConnections || [];
  if (!rows.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-graph">
    <div className="sod29-section-head"><div><div className="sod29-kicker">גרף חי</div><h2>קשרים חיים סביב ההתכנסות</h2></div><span className="sod29-chip">{rows.length}</span></div>
    <div className="sod29-topic-graph-grid">
      {rows.slice(0, 18).map((row) => row.href ? <Link key={row.id} to={row.href}>
        <span>{KIND_LABELS[row.targetType] || "קשר"}</span><strong>{row.label}</strong><small>{RELATION_LABELS[row.relationType] || "קשור"}</small>
      </Link> : <article key={row.id}><span>{KIND_LABELS[row.targetType] || "קשר"}</span><strong>{row.label}</strong><small>{RELATION_LABELS[row.relationType] || "קשור"}</small></article>)}
    </div>
  </section>;
}

function TopicSourcesMedia({ golden }) {
  if (!golden) return null;
  const sources = golden.sources || [];
  const media = golden.media || [];
  const people = golden.people || [];
  if (!sources.length && !media.length && !people.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-sources">
    <div className="sod29-section-head"><div><div className="sod29-kicker">מקורות וזהות</div><h2>מאיפה החומר מגיע?</h2></div></div>
    {media.length ? <div className="sod29-topic-media-grid">
      {media.slice(0, 4).map((item) => <figure key={item.id}><img loading="lazy" src={item.imageUrl} alt={item.label} /><figcaption><strong>{item.label}</strong>{item.description ? <small>{item.description}</small> : null}</figcaption></figure>)}
    </div> : null}
    {people.length ? <div className="sod29-topic-people">{people.map((name) => <span key={name}>{name}</span>)}</div> : null}
    {sources.length ? <div className="sod29-list">{sources.slice(0, 12).map((row) => <div className="sod29-row" key={row.id}><div><strong>{row.label}</strong><small>מקור מחקר</small></div></div>)}</div> : null}
  </section>;
}

function TopicRelated({ projection }) {
  const related = projection.relatedConvergences || [];
  const posts = projection.relatedPosts || [];
  if (!related.length && !posts.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-related">
    <div className="sod29-section-head"><div><div className="sod29-kicker">המשך</div><h2>לאן ממשיכים מכאן?</h2></div></div>
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
  return <section className="sod29-section sod29-topic-caveats" id="topic-boundary" aria-label="הסתייגויות וגבולות">
    <div className="sod29-kicker">גבולות האמת</div>
    <h2>מה חשוב לא להסיק מכאן</h2>
    {caveats.map((text, i) => <p key={i}>{text}</p>)}
  </section>;
}

function TopicBody() {
  const { slug = "" } = useParams();
  const navigate = useNavigate();
  const shell = use2029Shell();
  const research = useResearch();
  const [state, setState] = useState({ loading: true, finding: null, error: null });
  const [goldenState, setGoldenState] = useState({ loading: false, hub: null, prominence: null, error: null });
  const [expressionOpenState, setExpressionOpenState] = useState({ expression: null, error: null });

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
    if (!projection?.canonicalPath || slug === projection.slug) return;
    navigate(projection.canonicalPath, { replace: true });
  }, [slug, projection?.slug, projection?.canonicalPath, navigate]);

  useEffect(() => {
    if (!projection?.entityRef) {
      setGoldenState({ loading: false, hub: null, prominence: null, error: null });
      return undefined;
    }
    const nodeId = clean(projection.entityRef).replace(/^node:/, "");
    if (!nodeId) return undefined;
    let alive = true;
    setGoldenState({ loading: true, hub: null, prominence: null, error: null });

    fetchEntityHubProjection({ nodeId, relationLimit: 90, researchLimit: 48, topicLimit: 16 })
      .then(async (hub) => {
        if (!alive) return;
        setGoldenState({ loading: false, hub: hub || null, prominence: null, error: null });
        if (!hub) return;
        try {
          const inputs = await fetchWorldProminenceInputs(hub);
          const prominence = buildWorldContextualProminence(hub, inputs, { limit: 7, timeAware: true, attentionFirst: false });
          if (alive) setGoldenState({ loading: false, hub, prominence, error: null });
        } catch (error) {
          if (alive) setGoldenState({ loading: false, hub, prominence: null, error });
        }
      })
      .catch((error) => { if (alive) setGoldenState({ loading: false, hub: null, prominence: null, error }); });
    return () => { alive = false; };
  }, [projection?.slug, projection?.entityRef]);

  const golden = useMemo(
    () => buildTopicGoldenProjection(projection, { hub: goldenState.hub, prominence: goldenState.prominence }),
    [projection, goldenState.hub, goldenState.prominence],
  );

  useEffect(() => {
    if (!projection) return undefined;
    const subject = { id: projection.slug, type: "topic", label: projection.title, href: projection.canonicalPath };
    const selection = { entityId: projection.slug, entityType: "topic" };
    if (!research.context?.subject) research.setResearchContext?.({ subject, selection, lens: "topic" });
    else research.updateResearchContext?.({ subject, selection, lens: "topic" });
    return undefined;
  }, [projection?.slug]); // eslint-disable-line react-hooks/exhaustive-deps

  const openExpressionFocus = async (expression) => {
    const expr = clean(expression);
    if (!expr || !projection) return;
    setExpressionOpenState({ expression: expr, error: null });
    try {
      const focus = await resolveExpressionFocus(expr);
      if (!focus?.href) throw new Error("expression_focus_unavailable");

      const topicSubject = {
        id: projection.slug,
        type: "topic",
        label: projection.title,
        href: projection.canonicalPath,
      };
      const topicSelection = { entityId: projection.slug, entityType: "topic" };
      const current = research.context || {};

      research.setResearchContext?.({
        subject: {
          id: String(focus.root),
          type: "number",
          label: String(focus.root),
          href: focus.href,
        },
        selection: {
          entityId: String(focus.root),
          entityType: "number",
          expression: focus.expression,
          method: focus.method,
          resultValue: focus.resultValue,
          focusKind: "expression",
        },
        lens: "number",
        locale: current.locale || "he",
        dimensions: {
          ...(current.dimensions || {}),
          expressionFocusExplicit: true,
          focusOrigin: "topic",
          topicSlug: projection.slug,
        },
        journey: current.journey || null,
        returnTo: {
          href: projection.canonicalPath,
          label: projection.title,
          subject: topicSubject,
          selection: topicSelection,
          lens: "topic",
          dimensions: current.dimensions || {},
          journey: current.journey || null,
        },
      });
      navigate(focus.href);
    } catch (error) {
      setExpressionOpenState({ expression: null, error });
    }
  };

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
  const sparse = golden?.density === "sparse";
  const hasFindings = Object.values(projection.sections || {}).some((rows) => Array.isArray(rows) && rows.length);
  const navItems = [
    ["עיקר", "topic-essential"],
    ...(projection.phrases.length ? [["ביטויים", "topic-phrases"]] : []),
    ...(hasFindings ? [["ממצאים", "topic-findings"]] : []),
    ...((goldenState.loading || golden?.prominenceItems?.length) ? [["בולט", "topic-prominence"]] : []),
    ...(golden?.graphConnections?.length ? [["קשרים", "topic-graph"]] : []),
    ...((golden?.sources?.length || golden?.media?.length || golden?.people?.length) ? [["מקורות", "topic-sources"]] : []),
    ...((projection.relatedConvergences.length || projection.relatedPosts.length) ? [["המשך", "topic-related"]] : []),
    ...(projection.caveats.length ? [["גבולות", "topic-boundary"]] : []),
    ["מסע", "topic-journey"],
  ];

  return <article className={`sod29-topic2029 is-${golden?.density || "medium"}`} data-entity-type="convergence" data-canonical-slug={projection.slug} data-topic-density={golden?.density || "medium"}>
    <header className="sod29-topic-hero">
      <div className="sod29-topic-hero-copy">
        <div className="sod29-kicker">התכנסות</div>
        <h1>{projection.title}</h1>
        <p className="sod29-topic-summary">{projection.description}</p>
        <div className="sod29-topic-meta">
          {golden?.people?.length ? <span>תרומה · {golden.people.join(" · ")}</span> : null}
          <span>{projection.authoredFactsCount} פריטי תוכן</span>
          {golden?.relationCount ? <span>{golden.relationCount} קשרי גרף</span> : null}
          {golden?.mediaCount ? <span>{golden.mediaCount} פריטי מדיה</span> : null}
          {sparse ? <span className="is-sparse">מצב ממוקד · חומר ישיר מצומצם</span> : null}
        </div>
        <div className="sod29-actions">
          <Link className="sod29-action primary" to="/world">◌ חזרה לעולם</Link>
          <button className="sod29-action" type="button" onClick={() => shell.openRaziel({ topicSlug: projection.slug, topicTitle: projection.title })}>✦ שאל את רזיאל</button>
          <Link className="sod29-action" to="/heichal">◇ העמק בהיכל</Link>
          <ShareActions type="topic" url={"https://sod1820.co.il" + projection.canonicalPath} title={projection.title} channels={["native","copy"]} />
        </div>
      </div>
      <div className="sod29-topic-anchor-cluster" aria-label="המספרים המרכזיים בהתכנסות">
        {primaryNumbers.map((value) => <Link to={"/2029/number/" + value} className="sod29-topic-anchor" key={value}><strong>{value}</strong><small>מספר</small></Link>)}
      </div>
    </header>

    <TopicMapNav items={navItems} />

    <section className="sod29-section sod29-topic-intro" id="topic-essential">
      <div className="sod29-kicker">העיקר</div>
      <h2>מה ההתכנסות הזאת?</h2>
      <p>{projection.description}</p>
      {sparse ? <div className="sod29-topic-sparse-callout"><strong>יש כאן מעט חומר ישיר — וזה נשאר גלוי.</strong><span>אנחנו לא ממלאים את החסר בתוכן מומצא; הקשרים, המספרים והמחקר הקיים מרחיבים את התמונה בהדרגה.</span></div> : null}
      <div className="sod29-topic-truth-strip">
        <span>התכנסות ≠ עובדה קנונית</span>
        <span>חישוב ≠ פרשנות</span>
        <span>מקור ≠ מסקנה</span>
      </div>
    </section>

    {projection.withheld ? <FrameState kind="unavailable" title="גוף ההתכנסות אינו מוצג לציבור">קיימת זהות ציבורית, אבל מקור התוכן סימן את הגוף כלא־מיועד לפרסום. לא נעקוף את הסימון.</FrameState> : <>
      <TopicPhrases rows={projection.phrases} onOpenExpression={openExpressionFocus} openingExpression={expressionOpenState.expression} />
      {expressionOpenState.error ? <div className="sod29-topic-focus-error" role="status">הביטוי נשאר שמור כאן, אבל מנוע השיטות לא החזיר כרגע מספר פתיחה בטוח.</div> : null}
      <TopicFindings projection={projection} onOpenExpression={openExpressionFocus} />
      <TopicProminence golden={golden} loading={goldenState.loading && !goldenState.hub} />
      <TopicAuthoredConnections projection={projection} />
      <TopicGraphConnections golden={golden} />
      <TopicSourcesMedia golden={golden} />
      <TopicRelated projection={projection} />
      <TopicCaveats projection={projection} />
    </>}

    <section className="sod29-section sod29-topic-journey" id="topic-journey">
      <div className="sod29-section-head"><div><div className="sod29-kicker">מסע</div><h2>לאן ממשיכים מכאן?</h2></div></div>
      <p>אותה זהות ממשיכה בין World, Number, Raziel והיכל. המעבר משנה את העדשה — לא את ההתכנסות.</p>
      <div className="sod29-actions">
        <Link className="sod29-action primary" to="/world">פתח בעולם</Link>
        {primaryNumbers[0] != null ? <Link className="sod29-action" to={"/2029/number/" + primaryNumbers[0]}>פתח מספר מוביל</Link> : null}
        <button className="sod29-action" type="button" onClick={() => shell.openRaziel({ topicSlug: projection.slug, topicTitle: projection.title, intent: "topic_next_step" })}>✦ מה כדאי לבדוק עכשיו?</button>
        <Link className="sod29-action" to="/heichal">◇ מחקר עמוק</Link>
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
