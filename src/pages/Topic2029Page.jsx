import React, { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import Sod2029Shell, { FrameState, use2029Shell } from "../components/experience2029/Sod2029Shell.jsx";
import ShareActions from "../components/ShareActions.jsx";
import SurfaceMapBar2029 from "../components/experience2029/SurfaceMapBar2029.jsx";
import { useResearch } from "../lib/research/ResearchProvider.jsx";
import { fetchCanonicalTopicConvergenceFinding } from "../lib/research/topicConvergence.js";
import { buildTopic2029Projection } from "../lib/research/topic2029Projection.js";
import { fetchEntityHubProjection } from "../lib/research/entityHubProjection.js";
import { fetchWorldProminenceInputs } from "../lib/research/worldProminenceInputs.js";
import { buildWorldContextualProminence } from "../lib/research/worldContextualProminence.js";
import { buildTopicGoldenProjection } from "../lib/research/topicGoldenProjection.js";
import { resolveExpressionFocus } from "../lib/research/numberExpressionFocus.js";
import { formatTanakhRef } from "../lib/presentation/canonicalPresentation.js";
import { DEFAULT_VERSE_GEMATRIA_LIMIT, fetchVersesByGematria } from "../lib/research/verseGematriaSources.js";
import { applySeo, clearConvergenceJsonLd, setConvergenceJsonLd } from "../lib/seo.js";
import "./topic2029.css";

const clean = (value) => value == null ? "" : String(value).trim();
const textOf = (row) => clean(row?.text || row?.title || row?.phrase || row?.note);
const topicSectionLabel = (id) => id === "topic-findings" ? "חיבורים"
  : id === "topic-posts" ? "פוסטים"
  : id === "topic-sources" ? "מקורות"
  : id === "topic-related" ? "המשך"
  : id === "topic-phrases" ? "גימטריות"
  : "עיקר";

function TopicPhrases({ rows = [], onOpenExpression, openingExpression = null }) {
  if (!rows.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-phrases">
    <div className="sod29-section-head"><div><div className="sod29-kicker">ביטויים בציר</div><h2>אותו מספר, מילים שונות</h2></div><span className="sod29-chip">{rows.length}</span></div>
    <div className="sod29-topic-phrase-grid">
      {rows.map((row, index) => {
        const text = textOf(row);
        if (!text) return null;
        const opening = openingExpression === text;
        return <button className="sod29-topic-phrase" type="button" disabled={opening} onClick={() => onOpenExpression?.(text)} key={row.sourcePath || (text + "-" + index)}>
          <strong>{text}</strong><small>{opening ? "פותח…" : "פתח את החיבור ←"}</small>
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
    <div className="sod29-section-head"><div><div className="sod29-kicker">הרמזים המרכזיים</div><h2>החיבורים שמחזיקים את הציר</h2></div></div>
    {headline.map((text, i) => <h3 className="sod29-topic-headline" key={"h-" + i}>{text}</h3>)}
    {hints.map((text, i) => <div className="sod29-topic-hint" key={"hint-" + i}>{text}</div>)}
    {concepts.map((row, i) => <div className="sod29-topic-finding-card" key={row.sourcePath || i}>
      {row.title ? <strong>{row.title}</strong> : null}
      {row.text ? <p>{row.text}</p> : null}
      {row.hint ? <small>{row.hint}</small> : null}
    </div>)}
    {bullets.length ? <ul className="sod29-topic-bullets">{bullets.map((text, i) => <li key={"b-" + i}>{text}</li>)}</ul> : null}
    {rows.length || numericClaims.length ? (() => {
      const allRows = [...numericClaims, ...rows];
      const primaryRows = allRows.filter((row) => Number(row.value) === projection.heroNumber).slice(0, 3);
      const primaryKeys = new Set(primaryRows.map((row) => row.sourcePath || clean(row.phrase || row.text)));
      const supportingRows = allRows.filter((row) => Number(row.value) !== projection.heroNumber);
      const depthRows = allRows.filter((row) => Number(row.value) === projection.heroNumber && !primaryKeys.has(row.sourcePath || clean(row.phrase || row.text)));
      const renderEquation = (row, i, kind) => {
        const phrase = clean(row.phrase || row.text);
        const value = Number(row.value);
        return <article className={`sod29-topic-equation is-${kind}`} key={row.sourcePath || phrase || i}>
          <div className="sod29-topic-equation-line">
            {phrase && onOpenExpression
              ? <button type="button" className="sod29-topic-equation-phrase" onClick={() => onOpenExpression(phrase)}>{phrase}</button>
              : <span className="sod29-topic-equation-phrase">{phrase || "חיבור מספרי"}</span>}
            {Number.isFinite(value) ? <span className="sod29-topic-equation-equals">=</span> : null}
            {Number.isFinite(value) ? <Link className="sod29-topic-equation-value" to={"/2029/number/" + value}>{value}</Link> : null}
          </div>
          {(row.method || row.note) ? <small className="sod29-topic-equation-note">{row.method || row.note}</small> : null}
        </article>;
      };
      return <div className="sod29-topic-claims">
        {primaryRows.map((row, i) => renderEquation(row, i, "primary"))}
        {supportingRows.length ? <div className="sod29-topic-supporting-equations">
          <div className="sod29-kicker">חיבורים תומכים</div>
          {supportingRows.map((row, i) => renderEquation(row, i, "supporting"))}
        </div> : null}
        {depthRows.length ? <details className="sod29-topic-depth-equations">
          <summary>עוד גימטריות של {projection.heroNumber} <span>{depthRows.length}</span></summary>
          <div>{depthRows.map((row, i) => renderEquation(row, i, "depth"))}</div>
        </details> : null}
      </div>;
    })() : null}
  </section>;
}

function TopicAuthoredConnections({ projection }) {
  const connections = Array.isArray(projection.sections?.connections) ? projection.sections.connections : [];
  if (!connections.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-authored-connections">
    <div className="sod29-section-head"><div><div className="sod29-kicker">עוד עומק</div><h2>הצירים שממשיכים מכאן</h2></div></div>
    <div className="sod29-topic-axis-grid">
      {connections.map((row, index) => {
        const number = Number(row.number);
        const labels = Array.isArray(row.links) ? row.links.filter(Boolean) : [];
        return <article className="sod29-topic-axis-card" key={row.sourcePath || index}>
          {Number.isFinite(number) ? <Link className="sod29-topic-axis-number" to={"/2029/number/" + number}>{number}</Link> : null}
          <strong>{labels.join(" · ") || textOf(row) || "קשר"}</strong>
          {row.note ? <p>{row.note}</p> : null}
        </article>;
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
      <div><div className="sod29-kicker">בולט עכשיו</div><h2>מה בולט סביב הציר?</h2></div>
      <span className="sod29-chip">{loading ? "…" : items.length}</span>
    </div>
    <p className="sod29-topic-section-note">הבולטות כאן עוזרת להתמצא בציר; היא אינה משנה את המקורות או את האימות.</p>
    {loading ? <div className="sod29-topic-loading">מחבר את שכבות העומק סביב הציר…</div> : <div className="sod29-topic-prominence-grid">
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
    <div className="sod29-section-head"><div><div className="sod29-kicker">קשרים חיים</div><h2>מה עוד מתחבר לציר?</h2></div><span className="sod29-chip">{rows.length}</span></div>
    <div className="sod29-topic-graph-grid">
      {rows.slice(0, 18).map((row) => row.href ? <Link key={row.id} to={row.href}>
        <span>{KIND_LABELS[row.targetType] || "קשר"}</span><strong>{row.label}</strong><small>{RELATION_LABELS[row.relationType] || "קשור"}</small>
      </Link> : <article key={row.id}><span>{KIND_LABELS[row.targetType] || "קשר"}</span><strong>{row.label}</strong><small>{RELATION_LABELS[row.relationType] || "קשור"}</small></article>)}
    </div>
  </section>;
}

function TopicSourcesMedia({ golden, verses = [], verseCount = 0, versesLoading = false, onFocusVerse, onLoadMoreVerses }) {
  const sources = golden?.sources || [];
  const media = golden?.media || [];
  const people = golden?.people || [];
  if (!sources.length && !media.length && !people.length && !verses.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-sources">
    <div className="sod29-section-head"><div><div className="sod29-kicker">מקורות</div><h2>מאיפה מגיעים החיבורים?</h2></div></div>
    {verses.length ? <div className="sod29-topic-verse-source">
      <div className="sod29-topic-source-subhead">
        <strong>פסוקים שלמים באותו מספר</strong>
        <span>{verseCount || verses.length}</span>
      </div>
      <div className="sod29-topic-verse-list">
        {verses.map((row) => {
          const reference = formatTanakhRef(row.ref || row);
          return <button
            type="button"
            className="sod29-topic-verse-card"
            key={row.ref}
            onClick={() => onFocusVerse?.(row)}
          >
            <span>{reference}</span>
            <blockquote>{row.text}</blockquote>
            <small>גימטריה רגילה = <b>{row.ragil}</b> · לחץ להקשר</small>
          </button>;
        })}
      </div>
      {verseCount > verses.length ? <button
        type="button"
        className="sod29-action sod29-topic-verse-more"
        disabled={versesLoading}
        onClick={onLoadMoreVerses}
      >{versesLoading ? "טוען…" : `הצג עוד פסוקים · ${verses.length} מתוך ${verseCount}`}</button> : null}
    </div> : null}
    {media.length ? <div className="sod29-topic-media-grid">
      {media.slice(0, 4).map((item, index) => <figure key={item.id}><CanonicalMediaImage2029 item={item} primary={index === 0} alt={item.label} /><figcaption><strong>{item.label}</strong>{item.description ? <small>{item.description}</small> : null}</figcaption></figure>)}
    </div> : null}
    {people.length ? <div className="sod29-topic-people">{people.map((name) => <span key={name}>{name}</span>)}</div> : null}
    {sources.length ? <div className="sod29-list">{sources.slice(0, 12).map((row) => <div className="sod29-row" key={row.id}><div><strong>{row.label}</strong><small>מקור</small></div></div>)}</div> : null}
  </section>;
}

function TopicPosts({ projection }) {
  const posts = projection.relatedPosts || [];
  if (!posts.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-posts">
    <div className="sod29-section-head"><div><div className="sod29-kicker">פוסטים בתוך הציר</div><h2>הסיפורים שבהם הרמז חוזר</h2></div><span className="sod29-chip">{posts.length}</span></div>
    <div className="sod29-topic-related-grid">
      {posts.map((row, index) => {
        const slug = clean(row.slug);
        const label = clean(row.title || row.text) || "פוסט קשור";
        return slug ? <Link className="sod29-card sod29-card-button sod29-topic-post-card" to={"/post/" + encodeURIComponent(slug)} key={row.sourcePath || (slug + "-" + index)}>
          <div className="sod29-kicker">פוסט</div><h3>{label}</h3><p>פתח את הסיפור המלא בתוך הציר.</p>
        </Link> : null;
      })}
    </div>
  </section>;
}

function TopicRelatedAxes({ projection }) {
  const related = projection.relatedConvergences || [];
  if (!related.length) return null;
  return <section className="sod29-section sod29-topic-section" id="topic-related">
    <div className="sod29-section-head"><div><div className="sod29-kicker">צירים קשורים</div><h2>לאן הציר ממשיך?</h2></div><span className="sod29-chip">{related.length}</span></div>
    <div className="sod29-topic-related-grid">
      {related.map((row, index) => {
        const slug = clean(row.slug);
        const label = clean(row.title || row.note) || "ציר קשור";
        return slug ? <Link className="sod29-card sod29-card-button" to={"/topic/" + encodeURIComponent(slug)} key={row.sourcePath || (slug + "-" + index)}>
          <div className="sod29-kicker">ציר</div><h3>{label}</h3><p>פתח את הציר המחובר.</p>
        </Link> : null;
      })}
    </div>
  </section>;
}

function TopicCaveats({ projection }) {
  const caveats = (projection.caveats || []).map(textOf).filter(Boolean);
  if (!caveats.length) return null;
  return <section className="sod29-section sod29-topic-caveats" id="topic-boundary" aria-label="הסתייגויות וגבולות">
    <div className="sod29-kicker">הערה חשובה</div>
    <h2>בין שוויון מספרי לבין הרמז</h2>
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
  const [activeSectionId, setActiveSectionId] = useState("topic-essential");
  const [verseState, setVerseState] = useState({ loading: false, rows: [], count: 0, limit: DEFAULT_VERSE_GEMATRIA_LIMIT, error: null });
  const [focusOverride, setFocusOverride] = useState(null);

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
    const heroNumber = Number(projection?.heroNumber);
    if (!Number.isSafeInteger(heroNumber)) {
      setVerseState({ loading: false, rows: [], count: 0, limit: DEFAULT_VERSE_GEMATRIA_LIMIT, error: null });
      return undefined;
    }
    let alive = true;
    const limit = verseState.limit || DEFAULT_VERSE_GEMATRIA_LIMIT;
    setVerseState((current) => ({ ...current, loading: true, error: null }));
    fetchVersesByGematria(heroNumber, { limit })
      .then((result) => {
        if (!alive) return;
        setVerseState({ loading: false, rows: result.verses, count: result.count, limit, error: null });
      })
      .catch((error) => {
        if (alive) setVerseState((current) => ({ ...current, loading: false, error }));
      });
    return () => { alive = false; };
  }, [projection?.heroNumber, verseState.limit]);

  useEffect(() => {
    setVerseState((current) => ({ ...current, limit: DEFAULT_VERSE_GEMATRIA_LIMIT }));
  }, [projection?.heroNumber]);

  const hasFindings = useMemo(
    () => Object.values(projection?.sections || {}).some((rows) => Array.isArray(rows) && rows.length),
    [projection?.sections],
  );
  const navItems = useMemo(() => projection ? [
    { id: "topic-essential", label: "עיקר" },
    ...((projection.phrases.length || projection.numericClaims.length || projection.authoredRows.length) ? [{ id: "topic-phrases", label: "גימטריות", targetId: projection.phrases.length ? "topic-phrases" : "topic-findings" }] : []),
    ...(hasFindings ? [{ id: "topic-findings", label: "חיבורים" }] : []),
    ...(projection.relatedPosts.length ? [{ id: "topic-posts", label: "פוסטים" }] : []),
    ...((verseState.rows.length || golden?.sources?.length || golden?.media?.length || golden?.people?.length) ? [{ id: "topic-sources", label: "מקורות" }] : []),
    ...(projection.relatedConvergences.length ? [{ id: "topic-related", label: "המשך" }] : []),
  ] : [], [projection, hasFindings, verseState.rows.length, golden?.sources?.length, golden?.media?.length, golden?.people?.length]);

  useEffect(() => {
    if (!projection) return undefined;
    const subject = { id: projection.slug, type: "topic", label: projection.title, href: projection.canonicalPath };
    const selection = { entityId: projection.slug, entityType: "topic" };
    const heroNumber = projection.heroNumber ?? projection.highlightNumbers?.[0] ?? projection.numbers?.[0] ?? null;
    const sectionLabel = topicSectionLabel(activeSectionId);
    const defaultFocus = {
      id: projection.slug,
      type: "topic",
      sectionLabel,
      label: projection.displayTitle || projection.title,
      primary: heroNumber != null ? String(heroNumber) : projection.title,
      number: heroNumber,
      signals: projection.phrases?.slice(0, 3).map((row) => textOf(row)).filter(Boolean) || [],
      sourceLabel: projection.createdBy || null,
      locator: "#" + activeSectionId,
    };
    const activeFocus = focusOverride || defaultFocus;
    const dimensions = {
      ...(research.context?.dimensions || {}),
      surfaceSections: navItems,
      activeSectionId,
      bottomTrail: [
        { id: "convergence", label: "התכנסות", targetId: "topic-essential" },
        { id: "section", label: sectionLabel, targetId: activeSectionId },
        ...(focusOverride
          ? [{ id: "focus", label: focusOverride.reference || focusOverride.label || "פסוק", targetId: "topic-sources", active: true }]
          : heroNumber != null
            ? [{ id: "number", label: String(heroNumber), number: Number(heroNumber), active: true }]
            : []),
      ],
      surfaceFocus: activeFocus,
    };
    if (!research.context?.subject) research.setResearchContext?.({ subject, selection, lens: "topic", dimensions });
    else research.updateResearchContext?.({ subject, selection, lens: "topic", dimensions });
    return undefined;
  }, [projection?.slug, activeSectionId, focusOverride?.id, navItems]); // eslint-disable-line react-hooks/exhaustive-deps

  const focusVerse = (row) => {
    if (!projection || !row) return;
    const reference = formatTanakhRef(row.ref || row);
    const id = `verse:${clean(row.ref) || reference}`;
    setActiveSectionId("topic-sources");
    setFocusOverride({
      id,
      type: "verse",
      kicker: "פסוק פעיל",
      label: reference,
      reference,
      primary: reference,
      text: clean(row.text),
      sectionLabel: "מקורות",
      number: Number(row.ragil),
      resultValue: Number(row.ragil),
      signals: [`פסוק שלם · רגיל = ${row.ragil}`, `מתוך התכנסות ${projection.heroNumber}`],
      sourceLabel: "תנ״ך",
      locator: "#topic-sources",
    });
    document.getElementById("topic-sources")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

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

  if (state.loading) return <FrameState kind="loading" title="פותח את ההתכנסות">טוען את המספרים, הפוסטים והמקורות שמתחברים אליה.</FrameState>;
  if (state.error || !projection) return <FrameState kind="error" title="ההתכנסות לא נמצאה">לא נציג תוכן משוער. אפשר לחזור לעולם ולבחור התכנסות קיימת.</FrameState>;

  const primaryNumbers = [...new Set([...projection.highlightNumbers, ...projection.numbers])].slice(0, 6);
  const secondaryNumbers = primaryNumbers.filter((value) => value !== projection.heroNumber);
  const sparse = golden?.density === "sparse";

  return <article className={`sod29-topic2029 is-${golden?.density || "medium"}`} data-entity-type="convergence" data-canonical-slug={projection.slug} data-topic-density={golden?.density || "medium"}>
    <header className="sod29-topic-hero">
      <div className="sod29-topic-hero-copy">
        <div className="sod29-kicker">ציר</div>
        {projection.heroNumber != null ? <Link className="sod29-topic-hero-number" to={"/2029/number/" + projection.heroNumber}>{projection.heroNumber}</Link> : null}
        <h1>{projection.displayTitle || projection.title}</h1>
        <p className="sod29-topic-summary">{projection.description}</p>
        <div className="sod29-topic-meta">
          {projection.authoredRows.length ? <span>{projection.authoredRows.length} שוויונות מרכזיים</span> : null}
          {projection.relatedPosts.length ? <span>{projection.relatedPosts.length} פוסטים בציר</span> : null}
          {projection.authoredConnections.length ? <span>{projection.authoredConnections.length} חיבורי המשך</span> : null}
          {golden?.people?.length ? <span>תרומה · {golden.people.join(" · ")}</span> : null}
        </div>
        <div className="sod29-actions">
          <button className="sod29-action primary" type="button" onClick={() => shell.openRaziel({ topicSlug: projection.slug, topicTitle: projection.title })}>✦ שאל את רזיאל על הציר</button>
          <ShareActions type="topic" url={"https://sod1820.co.il" + projection.canonicalPath} title={projection.title} channels={["native","copy"]} />
        </div>
      </div>
      {secondaryNumbers.length ? <div className="sod29-topic-anchor-cluster" aria-label="מספרים נוספים בציר">
        {secondaryNumbers.map((value) => <Link to={"/2029/number/" + value} className="sod29-topic-anchor" key={value}><strong>{value}</strong><small>חיבור נוסף</small></Link>)}
      </div> : null}
    </header>

    <SurfaceMapBar2029
      items={navItems}
      activeId={activeSectionId}
      onSelect={(item) => { setFocusOverride(null); setActiveSectionId(item.id); }}
      onActiveChange={(item) => {
        if (item.id !== "topic-sources") setFocusOverride(null);
        setActiveSectionId(item.id);
      }}
      ariaLabel="מפת ההתכנסות"
    />

    <div className="sod29-topic-stage">
      <div className="sod29-topic-stage-content">

    <section className="sod29-section sod29-topic-intro" id="topic-essential">
      <div className="sod29-kicker">העיקר</div>
      <h2>מה מחבר את הציר הזה?</h2>
      <p>{projection.description}</p>
      {sparse ? <div className="sod29-topic-sparse-callout"><strong>יש כאן כרגע מעט חומר ישיר.</strong><span>הציר נשאר ממוקד, והחיבורים יצטברו רק כשיש להם מקור ברור.</span></div> : null}
    </section>

    {projection.withheld ? <FrameState kind="unavailable" title="גוף ההתכנסות אינו מוצג לציבור">קיימת זהות ציבורית, אבל מקור התוכן סימן את הגוף כלא־מיועד לפרסום. לא נעקוף את הסימון.</FrameState> : <>
      <TopicPhrases rows={projection.phrases} onOpenExpression={openExpressionFocus} openingExpression={expressionOpenState.expression} />
      {expressionOpenState.error ? <div className="sod29-topic-focus-error" role="status">הביטוי נשאר שמור כאן, אבל מנוע השיטות לא החזיר כרגע מספר פתיחה בטוח.</div> : null}
      <TopicFindings projection={projection} onOpenExpression={openExpressionFocus} />
      <TopicPosts projection={projection} />
      <TopicAuthoredConnections projection={projection} />
      <TopicRelatedAxes projection={projection} />
      <TopicSourcesMedia
        golden={golden}
        verses={verseState.rows}
        verseCount={verseState.count}
        versesLoading={verseState.loading}
        onFocusVerse={focusVerse}
        onLoadMoreVerses={() => setVerseState((current) => ({
          ...current,
          limit: Math.min(Math.max(current.limit + 18, current.rows.length + 1), current.count || current.limit + 18),
        }))}
      />
      <TopicProminence golden={golden} loading={goldenState.loading && !goldenState.hub} />
      <TopicGraphConnections golden={golden} />
      <TopicCaveats projection={projection} />
    </>}

    <section className="sod29-section sod29-topic-journey" id="topic-journey">
      <div className="sod29-section-head"><div><div className="sod29-kicker">המשך</div><h2>רוצה להעמיק?</h2></div></div>
      <p>אפשר לפתוח את המספר המוביל, לראות את הציר בעולם או לשאול את רזיאל על חיבור מסוים.</p>
      <div className="sod29-actions">
        <Link className="sod29-action primary" to="/world">פתח בעולם</Link>
        {primaryNumbers[0] != null ? <Link className="sod29-action" to={"/2029/number/" + primaryNumbers[0]}>פתח מספר מוביל</Link> : null}
        <button className="sod29-action" type="button" onClick={() => shell.openRaziel({ topicSlug: projection.slug, topicTitle: projection.title, intent: "topic_next_step" })}>✦ מה כדאי לבדוק עכשיו?</button>
      </div>
    </section>
      </div>
    </div>
  </article>;
}

export default function Topic2029Page() {
  return <Sod2029Shell
    surface="world"
    symbol="✦"
    eyebrow="SOD1820 · התכנסות"
    title="התכנסות"
    description="מקום שבו מספרים, ביטויים, פוסטים ומקורות נפגשים סביב חיבור משותף."
    status="התכנסות"
  >
    <TopicBody />
  </Sod2029Shell>;
}
