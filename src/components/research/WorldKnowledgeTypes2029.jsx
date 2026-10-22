import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CanonicalMediaFigure2029 from "../experience2029/CanonicalMediaFigure2029.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
import { fetchCurationCatalog2029 } from "../../lib/research/curationProjection2029.js";
import { fetchPublicWorldMediaPage } from "../../lib/research/entityHubProjection.js";
import { fetchExplorerFacetPage } from "../../lib/research/explorerFacets.js";
import { WORLD_KNOWLEDGE_KIND } from "../../lib/research/worldLandingNavigation.js";

export const WORLD_KNOWLEDGE_OPTIONS = Object.freeze([
  { key: WORLD_KNOWLEDGE_KIND.NUMBERS, label: "מספרים ומילים", description: "מספרים, מילים וביטויים" },
  { key: WORLD_KNOWLEDGE_KIND.LANGUAGES, label: "שפות וגשרים", description: "עברית, מילים לועזיות וקשרים מאושרים" },
  { key: WORLD_KNOWLEDGE_KIND.CIPHERS, label: "צפנים", description: "צפני ELS שפורסמו" },
  { key: WORLD_KNOWLEDGE_KIND.MEDIA, label: "תמונות ומדיה", description: "חומר חזותי ציבורי ומקורו" },
  { key: WORLD_KNOWLEDGE_KIND.TIME, label: "אירועים וזמן", description: "אירועים ושנים כצמתי ידע" },
  { key: WORLD_KNOWLEDGE_KIND.BOOKS, label: "ספרים ומקורות", description: "זהויות ספר ומקורות פעילים" },
  { key: WORLD_KNOWLEDGE_KIND.SPATIAL, label: "מבנים מרחביים", description: "גימטריה, מבנה וצורה — בשכבות נפרדות" },
]);

const FACETS = Object.freeze({
  [WORLD_KNOWLEDGE_KIND.NUMBERS]: [
    {
      key: "number",
      label: "נוספו לאחרונה",
      description: "המספרים הפעילים החדשים ביותר בעולם, לפי מועד הוספתם.",
    },
    { key: "word", label: "מילים" },
    { key: "phrase", label: "ביטויים" },
  ],
  [WORLD_KNOWLEDGE_KIND.LANGUAGES]: [
    { key: "language_bridge", label: "גשרי שפה" },
    { key: "foreign_word", label: "מילים לועזיות" },
  ],
  [WORLD_KNOWLEDGE_KIND.TIME]: [
    { key: "event", label: "אירועים" },
    { key: "year", label: "שנים" },
  ],
  [WORLD_KNOWLEDGE_KIND.BOOKS]: [{ key: "book", label: "ספרים" }],
});
const KIND_REQUEST_CACHE = new Map();

function publicationStateLabel(value) {
  if (value === "approved") return "מאושר";
  if (value === "candidate") return "מועמד";
  if (value === "published") return "פורסם";
  return value || "אין נתון";
}

function cardHref(card) {
  return card.facet === "number" ? `/2029/number/${encodeURIComponent(card.refId)}` : card.href;
}

function selectedNumberCard(item) {
  return {
    id: item.id,
    facet: "number",
    label: item.label,
    sub: item.reason,
    refId: item.value ?? item.label,
    kicker: item.kind === "crown_anchor" ? "עוגן כתר" : "עוגן זהב",
  };
}

async function fetchKind(kind) {
  if (kind === WORLD_KNOWLEDGE_KIND.SPATIAL) {
    const { fetchZviSpatialWorldProjection } = await import("../../lib/research/zviSpatialWorldProjection.js");
    const spatial = await fetchZviSpatialWorldProjection();
    return { sections: [], ciphers: [], media: [], spatial, hasMore: false };
  }
  if (kind === WORLD_KNOWLEDGE_KIND.CIPHERS) {
    const page = await getMatrixLibraryPage({ view: "public", pageSize: 12 });
    return { sections: [], ciphers: page.rows || [], media: [], hasMore: Boolean(page.more) };
  }
  if (kind === WORLD_KNOWLEDGE_KIND.MEDIA) {
    const page = await fetchPublicWorldMediaPage({ limit: 12 });
    return { sections: [], ciphers: [], media: page.items || [], hasMore: Boolean(page.hasMore), access: page.access };
  }
  const specs = FACETS[kind] || FACETS[WORLD_KNOWLEDGE_KIND.NUMBERS];
  const [pages, curationCatalog, multiValue] = await Promise.all([
    Promise.all(specs.map(async (spec) => ({
      ...spec,
      page: await fetchExplorerFacetPage(spec.key, { limit: 8 }),
    }))),
    kind === WORLD_KNOWLEDGE_KIND.NUMBERS ? fetchCurationCatalog2029() : Promise.resolve(null),
    kind === WORLD_KNOWLEDGE_KIND.NUMBERS
      ? import("../../lib/research/zviMultiValueWorldProjection.js").then(({ fetchZviMultiValueWorldProjection }) => fetchZviMultiValueWorldProjection())
      : Promise.resolve(null),
  ]);
  const sections = pages.map(({ key, label, description, page }) => ({
    key,
    label,
    description: description || null,
    cards: page?.cards || [],
    hasMore: Boolean(page?.hasMore),
  }));
  if (kind === WORLD_KNOWLEDGE_KIND.NUMBERS) {
    sections.unshift({
      key: "selected-numbers",
      label: "מספרים נבחרים",
      description: "עוגני כתר וזהב פעילים שנבחרו בשער האנושי. הבחירה היא אוצרות, לא ציון אמת.",
      cards: (curationCatalog?.anchors || []).slice(0, 8).map(selectedNumberCard),
      hasMore: (curationCatalog?.anchors || []).length > 8,
    });
  }
  return {
    sections,
    ciphers: [],
    media: [],
    multiValue,
    hasMore: pages.some(({ page }) => page?.hasMore),
  };
}

function ZviMultiValueShelf({ projection }) {
  if (projection?.access?.available === false) {
    return <section className="sod29-world-kind-section" aria-label="ממצאי צבי רב ערכיים">
      <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div></header>
      <p role="status">האשכולות הציבוריים אינם זמינים כרגע. זה אינו אומר שאין כאלה.</p>
    </section>;
  }
  return <section className="sod29-world-kind-section sod29-world-multi-value-shelf" aria-label="ממצאי צבי רב ערכיים">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div>
      <span>{projection.counts.findings} ממצאים · {projection.counts.exactSourceOccurrences} הופעות מקור</span></header>
    <p className="sod29-world-spatial-rule">הופעה היא מיקום מדויק בקורפוס, לא מקור עצמאי נוסף. הרשומות נשארות חזקות, אך מסומנות לבדיקה עד לפיצול או ליצירת יעד מבוסס.</p>
    <div className="sod29-world-kind-card-grid">{projection.cards.map((card) => <article key={card.id} className="sod29-world-kind-card sod29-world-multi-value-card">
      <small>מיקום בדוח #{card.rank} · חוזק: {card.review.connectionStrength} · {card.review.recommendation}</small>
      <strong>{card.title}</strong>
      <p>{card.statement}</p>
      <div className="sod29-world-spatial-status" aria-label="מצב הממצא">
        <span>ראיות: {card.review.evidenceQuality}</span>
        <span>סטטוס רשומה: {publicationStateLabel(card.review.publicationState)}</span>
        <span>גישה: ציבורי</span>
        <span>מקורות עצמאיים: אין נתון</span>
      </div>
      <p><b>למה עדיין לא חובר:</b> {card.review.reason}</p>
      <div className="sod29-actions">
        {card.targets.map((target) => <Link key={target.value} className="sod29-action" to={target.href}>לערך {target.value}</Link>)}
        {card.values.filter((value) => !card.targets.some((target) => target.value === value)).map((value) => <span key={value} className="sod29-action" aria-disabled="true">{value} · יעד חסר</span>)}
        <Link className="sod29-action primary" to={card.source.href}>להופעת המקור בספריית צבי</Link>
      </div>
      <details><summary>מזהה ומיקום מדויק</summary><p><code dir="ltr">{card.id}</code></p><p><code dir="ltr">{card.source.ref}</code></p></details>
    </article>)}</div>
  </section>;
}

function SpatialShelf({ projection }) {
  return <section className="sod29-world-kind-section sod29-world-spatial-shelf" aria-label="הגימטריה המרחבית של צבי">
    <header><div><h3>{projection.title}</h3><p>{projection.description}</p></div><span>{projection.counts.models} מבנים · {projection.counts.sourceOccurrences} הופעות מקור · לא מקורות עצמאיים</span></header>
    <p className="sod29-world-spatial-rule">כל קישור פותח את ההופעה המדויקת בתוך ספריית צבי הציבורית בעולם — לא דף פרטי. כמה הופעות של אותו חומר אינן נספרות כמקורות עצמאיים. חוזק החיבור, איכות הראיות ומצב הפרסום מוצגים בנפרד.</p>
    <div className="sod29-world-spatial-grid">{projection.cards.map((card) => <article key={card.id} id={`spatial-${card.slug}`} className="sod29-world-spatial-card">
      {card.image ? <img src={card.image} width="640" height="360" loading="lazy"
        alt={card.imageProvenance === "public_source_occurrence" ? `תמונת הופעת המקור: ${card.title}` : `תרשים: ${card.title}`} /> : <div className="sod29-world-spatial-placeholder" aria-hidden="true"><span>{card.value}</span><small>{card.form}</small></div>}
      <div className="sod29-world-spatial-body">
        <header><small>{card.form} · {card.pathCount} {card.pathCount === 1 ? "מסלול חישוב" : "מסלולי חישוב"}</small><h4>{card.title}</h4>{card.subtitle ? <p>{card.subtitle}</p> : null}</header>
        <div className="sod29-world-spatial-status" aria-label="מצב המודל">
          <span>חוזק: {card.review.connectionStrength || projection.rules.missingStrengthLabel}</span>
          <span>ראיות: {card.review.evidenceQuality}</span>
          <span>פרסום: {card.review.publicationState}</span>
          <span>עצמאות מקורות: אין נתון</span>
        </div>
        <ol className="sod29-world-spatial-layers">
          <li><strong>מקור</strong><span>{card.text?.ref || "ממצא צבי"}</span></li>
          <li><strong>גימטריה</strong><span>{card.gematria.map(([label, value]) => `${label} = ${value}`).join(" · ")}</span></li>
          <li><strong>מבנה</strong><span>{card.operations.map((operation) => operation.expression).join(" · ")}</span></li>
          <li><strong>צורה</strong><span>{card.form}{card.dimension ? ` · ${card.dimension}` : ""}</span></li>
        </ol>
        {card.interpretation ? <details><summary>הפרשנות של המקור</summary><p>{card.interpretation}</p></details> : null}
        <details><summary>הופעות מקור מדויקות · {card.source.occurrenceCount}</summary><ul>{card.source.locators.map((item) => <li key={item.ref}><Link to={item.href}>{item.exact ? "פתח את ההופעה בספריית צבי" : "פתח את ספריית צבי"}</Link> · <code dir="ltr">{item.ref}</code></li>)}</ul></details>
        <div className="sod29-actions"><Link className="sod29-action primary" to={`/2029/number/${card.value}`}>לערך {card.value}</Link><Link className="sod29-action" to={card.source.href}>לספריית צבי בעולם</Link></div>
      </div>
    </article>)}</div>
    {projection.access?.sourceMedia === "unavailable" ? <p role="status" className="sod29-muted">תמונות המקור אינן זמינות כרגע; המבנים וקישורי ההופעות נשארים פתוחים.</p> : null}
    <p className="sod29-muted">התצוגה הראשונית קלה ואינה טוענת מנוע תלת־ממד. פתיחה מרחבית אינטראקטיבית תתווסף כפעולה מפורשת בלבד.</p>
  </section>;
}

function loadKind(kind) {
  if (KIND_REQUEST_CACHE.has(kind)) return KIND_REQUEST_CACHE.get(kind);
  const request = fetchKind(kind).catch((error) => {
    KIND_REQUEST_CACHE.delete(kind);
    throw error;
  });
  KIND_REQUEST_CACHE.set(kind, request);
  return request;
}

function EntitySection({ section }) {
  return <section className="sod29-world-kind-section" aria-label={section.label}>
    <header><div><h3>{section.label}</h3>{section.description ? <p>{section.description}</p> : null}</div><span>{section.cards.length} מוצגים{section.hasMore ? " · יש עוד" : ""}</span></header>
    {section.cards.length ? <div className="sod29-world-kind-card-grid">{section.cards.map((card) => <Link
      key={`${section.key}:${card.id}`} className="sod29-world-kind-card" to={cardHref(card)}>
      <small>{card.kicker || section.label}</small><strong>{card.label}</strong>{card.sub ? <p>{card.sub}</p> : null}<span>לפתוח בעולם ←</span>
    </Link>)}</div> : <p className="sod29-muted">אין כרגע פריטים ציבוריים בסוג הזה.</p>}
  </section>;
}

function CipherShelf({ rows, hasMore }) {
  return <section className="sod29-world-kind-section" aria-label="צפנים שפורסמו">
    <header><div><h3>צפנים שפורסמו</h3><p>העולם מציג את הצופן כפריט ידע. החיפוש והבדיקה עצמם נשארים בכלי הצופן.</p></div><span>{rows.length} מוצגים{hasMore ? " · יש עוד" : ""}</span></header>
    <div className="sod29-world-kind-card-grid">{rows.map((row) => <Link key={row.id}
      className="sod29-world-kind-card" to={`/codes/${encodeURIComponent(row.slug || row.id)}`}>
      <small>צופן שפורסם</small><strong>{row.title || row.search_term || "צופן ללא כותרת"}</strong>
      <p>{row.skip_distance ? `דילוג ${row.skip_distance}` : "דילוג לא צוין"}{row.scope ? ` · ${row.scope === "tanakh" ? "תנ״ך" : "תורה"}` : ""}</p>
      <span>איכות: אין נתון בתצוגה · לפתוח צופן ←</span>
    </Link>)}</div>
    <div className="sod29-actions"><Link className="sod29-action" to="/codes">לספריית הצפנים</Link><Link className="sod29-action primary" to="/code">לכלי הצופן</Link></div>
  </section>;
}

function MediaShelf({ items, hasMore, access }) {
  if (access?.available === false) return <p role="status">המדיה הציבורית אינה זמינה כרגע.</p>;
  return <section className="sod29-world-kind-section" aria-label="תמונות ומדיה ציבורית">
    <header><div><h3>תמונות ומדיה ציבורית</h3><p>כל תמונה נשארת מחוברת לזהות המקור שלה. הופעה כאן אינה הופכת OCR או כיתוב לממצא מאומת.</p></div><span>{items.length} מוצגים{hasMore ? " · יש עוד" : ""}</span></header>
    {items.length ? <div className="sod29-world-media-shelf">{items.map((item) => <article key={item.mediaId}>
      <CanonicalMediaFigure2029 item={item} thumbnail alt={item.presentation?.label || "פתח תמונת מקור"} contextNote="פריט ציבורי במאגר המדיה" />
      <div><strong>{item.presentation?.label || "פריט מדיה"}</strong><small>{item.sourceRef}</small></div>
    </article>)}</div> : <p className="sod29-muted">לא נמצאו כרגע פריטי מדיה ציבוריים.</p>}
    <div className="sod29-actions"><Link className="sod29-action" to="/gallery">למאגר המדיה הציבורי</Link></div>
  </section>;
}

export default function WorldKnowledgeTypes2029({ kind = WORLD_KNOWLEDGE_KIND.NUMBERS, onKindChange }) {
  const [state, setState] = useState({ kind: null, loading: true, data: null, error: null });
  useEffect(() => {
    let alive = true;
    setState({ kind, loading: true, data: null, error: null });
    loadKind(kind)
      .then((data) => { if (alive) setState({ kind, loading: false, data, error: null }); })
      .catch((error) => { if (alive) setState({ kind, loading: false, data: null, error }); });
    return () => { alive = false; };
  }, [kind]);

  const option = WORLD_KNOWLEDGE_OPTIONS.find((item) => item.key === kind) || WORLD_KNOWLEDGE_OPTIONS[0];
  const data = state.kind === kind ? state.data : null;
  const sections = data?.sections || [];
  const openingSections = kind === WORLD_KNOWLEDGE_KIND.NUMBERS
    ? sections.filter((section) => section.key === "selected-numbers")
    : [];
  const remainingSections = kind === WORLD_KNOWLEDGE_KIND.NUMBERS
    ? sections.filter((section) => section.key !== "selected-numbers")
    : sections;
  return <section className="sod29-section sod29-world-knowledge-types" aria-label="עיון בעולם לפי סוג ידע">
    <div className="sod29-section-head"><div><div className="sod29-kicker">אותו עולם · כניסות שונות</div><h2>לגלות לפי סוג הידע.</h2>
      <p className="sod29-muted">כאן לא נוצרים מאגרים חדשים: כל כרטיס מגיע מהקורא או מההקרנה הקנונית של המספר, השפה, הצופן, המדיה, הזמן, המקור או המבנה המרחבי.</p></div></div>
    <nav className="sod29-world-kind-tabs" aria-label="סוגי הידע בעולם">{WORLD_KNOWLEDGE_OPTIONS.map((item) => <button
      type="button" key={item.key} className={item.key === kind ? "is-active" : ""} aria-pressed={item.key === kind}
      onClick={() => onKindChange?.(item.key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</nav>
    <div className="sod29-world-kind-heading"><h3>{option.label}</h3><p>{option.description}</p></div>
    {state.loading || state.kind !== kind ? <p role="status">פותח את {option.label}…</p> : null}
    {state.error ? <p role="status">הפריטים אינם זמינים כרגע. שום חומר חלופי לא הומצא.</p> : null}
    {openingSections.map((section) => <EntitySection key={section.key} section={section} />)}
    {kind === WORLD_KNOWLEDGE_KIND.NUMBERS && data?.multiValue ? <ZviMultiValueShelf projection={data.multiValue} /> : null}
    {remainingSections.map((section) => <EntitySection key={section.key} section={section} />)}
    {kind === WORLD_KNOWLEDGE_KIND.CIPHERS && data ? <CipherShelf rows={data.ciphers} hasMore={data.hasMore} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.MEDIA && data ? <MediaShelf items={data.media} hasMore={data.hasMore} access={data.access} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.SPATIAL && data?.spatial ? <SpatialShelf projection={data.spatial} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.TIME && data ? <div className="sod29-actions"><Link className="sod29-action" to="/timeline">לציר הזמן המלא</Link></div> : null}
    {kind === WORLD_KNOWLEDGE_KIND.BOOKS && data ? <div className="sod29-actions"><Link className="sod29-action" to="/books">למרחב הספרים והמקורות</Link></div> : null}
  </section>;
}
