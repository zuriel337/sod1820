import React, { useEffect, useState } from "react";
import { Link } from "react-router-dom";

import CanonicalMediaFigure2029 from "../experience2029/CanonicalMediaFigure2029.jsx";
import { getMatrixLibraryPage } from "../../lib/elsMatrices.js";
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
]);

const FACETS = Object.freeze({
  [WORLD_KNOWLEDGE_KIND.NUMBERS]: [
    { key: "number", label: "מספרים" },
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

function cardHref(card) {
  return card.facet === "number" ? `/2029/number/${encodeURIComponent(card.refId)}` : card.href;
}

async function fetchKind(kind) {
  if (kind === WORLD_KNOWLEDGE_KIND.CIPHERS) {
    const page = await getMatrixLibraryPage({ view: "public", pageSize: 12 });
    return { sections: [], ciphers: page.rows || [], media: [], hasMore: Boolean(page.more) };
  }
  if (kind === WORLD_KNOWLEDGE_KIND.MEDIA) {
    const page = await fetchPublicWorldMediaPage({ limit: 12 });
    return { sections: [], ciphers: [], media: page.items || [], hasMore: Boolean(page.hasMore), access: page.access };
  }
  const specs = FACETS[kind] || FACETS[WORLD_KNOWLEDGE_KIND.NUMBERS];
  const pages = await Promise.all(specs.map(async (spec) => ({
    ...spec,
    page: await fetchExplorerFacetPage(spec.key, { limit: 8 }),
  })));
  return {
    sections: pages.map(({ key, label, page }) => ({ key, label, cards: page?.cards || [], hasMore: Boolean(page?.hasMore) })),
    ciphers: [],
    media: [],
    hasMore: pages.some(({ page }) => page?.hasMore),
  };
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
    <header><h3>{section.label}</h3><span>{section.cards.length} מוצגים{section.hasMore ? " · יש עוד" : ""}</span></header>
    {section.cards.length ? <div className="sod29-world-kind-card-grid">{section.cards.map((card) => <Link
      key={`${section.key}:${card.id}`} className="sod29-world-kind-card" to={cardHref(card)}>
      <small>{section.label}</small><strong>{card.label}</strong>{card.sub ? <p>{card.sub}</p> : null}<span>לפתוח בעולם ←</span>
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
  return <section className="sod29-section sod29-world-knowledge-types" aria-label="עיון בעולם לפי סוג ידע">
    <div className="sod29-section-head"><div><div className="sod29-kicker">אותו עולם · כניסות שונות</div><h2>לגלות לפי סוג הידע.</h2>
      <p className="sod29-muted">כאן לא נוצרים מאגרים חדשים: כל כרטיס מגיע מהקורא הקנוני של המספר, השפה, הצופן, המדיה, הזמן או המקור.</p></div></div>
    <nav className="sod29-world-kind-tabs" aria-label="סוגי הידע בעולם">{WORLD_KNOWLEDGE_OPTIONS.map((item) => <button
      type="button" key={item.key} className={item.key === kind ? "is-active" : ""} aria-pressed={item.key === kind}
      onClick={() => onKindChange?.(item.key)}><strong>{item.label}</strong><small>{item.description}</small></button>)}</nav>
    <div className="sod29-world-kind-heading"><h3>{option.label}</h3><p>{option.description}</p></div>
    {state.loading || state.kind !== kind ? <p role="status">פותח את {option.label}…</p> : null}
    {state.error ? <p role="status">הפריטים אינם זמינים כרגע. שום חומר חלופי לא הומצא.</p> : null}
    {data?.sections?.map((section) => <EntitySection key={section.key} section={section} />)}
    {kind === WORLD_KNOWLEDGE_KIND.CIPHERS && data ? <CipherShelf rows={data.ciphers} hasMore={data.hasMore} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.MEDIA && data ? <MediaShelf items={data.media} hasMore={data.hasMore} access={data.access} /> : null}
    {kind === WORLD_KNOWLEDGE_KIND.TIME && data ? <div className="sod29-actions"><Link className="sod29-action" to="/timeline">לציר הזמן המלא</Link></div> : null}
    {kind === WORLD_KNOWLEDGE_KIND.BOOKS && data ? <div className="sod29-actions"><Link className="sod29-action" to="/books">למרחב הספרים והמקורות</Link></div> : null}
  </section>;
}
